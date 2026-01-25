import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// ============================================
// POST /api/import/deck - Import deck from file
// ============================================
router.post('/deck', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { format, data, title, subject, difficulty = 'A2', deckId } = req.body;

    if (!format || !data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Format și date sunt obligatorii',
        },
      });
    }

    let cards: {
      front: string;
      back: string;
      context?: string;
      type?: 'standard' | 'quiz' | 'type-answer';
      options?: string[];
      correctOptionIndex?: number;
    }[] = [];

    switch (format.toLowerCase()) {
      case 'json':
        cards = parseJSON(data);
        break;
      case 'csv':
        cards = parseCSV(data);
        break;
      case 'txt':
        cards = parseTXT(data);
        break;
      case 'anki':
        cards = parseAnki(data);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format nesuportat. Formate acceptate: json, csv, txt, anki',
          },
        });
    }

    if (cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CARDS',
          message: 'Nu s-au găsit carduri valide în fișier',
        },
      });
    }

    // Create deck with cards OR add cards to existing deck
    const result = await withTransaction(async client => {
      let deck: any;

      if (deckId) {
        // Add cards to existing deck
        const existingDeck = await client.query(
          'SELECT * FROM decks WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
          [deckId, req.user!.id]
        );

        if (existingDeck.rows.length === 0) {
          throw new Error('Deck-ul nu a fost găsit sau nu ai permisiunea de a-l modifica');
        }

        deck = existingDeck.rows[0];

        // Get the current max position
        const posResult = await client.query(
          'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM cards WHERE deck_id = $1 AND deleted_at IS NULL',
          [deckId]
        );
        const startPosition = posResult.rows[0].next_pos;

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          await client.query(
            `INSERT INTO cards (deck_id, front, back, context, type, options, correct_option_index, created_by, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              deckId,
              card.front,
              card.back,
              card.context,
              card.type || 'standard',
              card.options || [],
              card.correctOptionIndex,
              req.user!.id,
              startPosition + i,
            ]
          );
        }
      } else {
        // Create new deck with cards
        // Validate subject if provided - check if it exists in subjects table
        let validSubjectId = null;
        if (subject) {
          const subjectCheck = await client.query('SELECT id FROM subjects WHERE id = $1', [
            subject,
          ]);
          if (subjectCheck.rows.length > 0) {
            validSubjectId = subject;
          }
        }

        const deckResult = await client.query(
          `INSERT INTO decks (title, subject_id, topic, difficulty, is_public, owner_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            title || `Import ${new Date().toLocaleDateString('ro-RO')}`,
            validSubjectId,
            title,
            difficulty,
            true,
            req.user!.id,
          ]
        );

        deck = deckResult.rows[0];

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          await client.query(
            `INSERT INTO cards (deck_id, front, back, context, type, options, correct_option_index, created_by, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              deck.id,
              card.front,
              card.back,
              card.context,
              card.type || 'standard',
              card.options || [],
              card.correctOptionIndex,
              req.user!.id,
              i,
            ]
          );
        }
      }

      return deck;
    });

    res.status(201).json({
      success: true,
      data: {
        deckId: result.id,
        cardsImported: cards.length,
        message: `${cards.length} carduri importate cu succes`,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută la import';
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: `Eroare la import: ${errorMessage}`,
        details: error instanceof Error ? error.stack : undefined,
      },
    });
  }
});

// ============================================
// GET /api/export/deck/:id - Export deck
// ============================================
router.get('/deck/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json', includeProgress = 'false' } = req.query;

    // Get deck
    const deckResult = await query(
      `SELECT d.*, s.name as subject_name
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [id]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Deck-ul nu a fost găsit',
        },
      });
    }

    const deck = deckResult.rows[0];

    // Check access
    if (deck.owner_id !== req.user!.id && !deck.is_public && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai acces la acest deck',
        },
      });
    }

    // Get cards
    const cardsResult = await query(
      `SELECT * FROM cards WHERE deck_id = $1 AND deleted_at IS NULL ORDER BY position ASC`,
      [id]
    );

    const cards = cardsResult.rows;
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'csv':
        content = exportToCSV(cards, includeProgress === 'true');
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'txt':
        content = exportToTXT(cards);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'anki':
        content = exportToAnki(cards);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'json':
      default:
        content = exportToJSON(deck, cards, includeProgress === 'true');
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    const fileName = `${deck.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${extension}`;

    res.json({
      success: true,
      data: {
        format,
        fileName,
        content: Buffer.from(content).toString('base64'),
        mimeType,
        cardsCount: cards.length,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la export',
      },
    });
  }
});

// ============================================
// PARSING FUNCTIONS
// ============================================

function parseJSON(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}[] {
  try {
    const parsed = JSON.parse(data);
    const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];
    return cards
      .filter((c: any) => c.front && c.back)
      .map((c: any) => ({
        front: String(c.front).trim(),
        back: String(c.back).trim(),
        context: c.context ? String(c.context).trim() : undefined,
        type: ['standard', 'quiz', 'type-answer'].includes(c.type) ? c.type : 'standard',
        options: c.type === 'quiz' && Array.isArray(c.options) ? c.options : undefined,
        correctOptionIndex: c.type === 'quiz' ? c.correctOptionIndex : undefined,
      }));
  } catch {
    return [];
  }
}

function parseCSV(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: {
    front: string;
    back: string;
    context?: string;
    type?: 'standard' | 'quiz' | 'type-answer';
    options?: string[];
    correctOptionIndex?: number;
  }[] = [];

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('front') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const cardType = parts[3]?.trim() as 'standard' | 'quiz' | 'type-answer';
      const validType = ['standard', 'quiz', 'type-answer'].includes(cardType)
        ? cardType
        : 'standard';

      // Parse options (pipe-separated) and correct index for quiz cards
      let options: string[] | undefined;
      let correctOptionIndex: number | undefined;

      if (validType === 'quiz' && parts[4]) {
        options = parts[4]
          .split('|')
          .map(o => o.trim())
          .filter(o => o);
        if (parts[5]) {
          const idx = parseInt(parts[5].trim(), 10);
          if (!isNaN(idx)) {
            correctOptionIndex = idx;
          }
        }
      }

      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim() || undefined,
        type: validType,
        options,
        correctOptionIndex,
      });
    }
  }

  return cards;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Check for escaped quote ("" inside quoted string)
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // Add literal quote
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function parseTXT(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: {
    front: string;
    back: string;
    context?: string;
    type?: 'standard' | 'quiz' | 'type-answer';
    options?: string[];
    correctOptionIndex?: number;
  }[] = [];

  for (const line of lines) {
    // Support various delimiters: tab, semicolon, pipe (but not pipe for main split if used in options)
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ');
    } else if (line.includes('|')) {
      // Only use pipe as delimiter if no tabs - this is for simple front|back format
      parts = line.split('|');
    }

    if (parts.length >= 2 && parts[0] && parts[1]) {
      const cardType = parts[3]?.trim() as 'standard' | 'quiz' | 'type-answer';
      const validType = ['standard', 'quiz', 'type-answer'].includes(cardType)
        ? cardType
        : 'standard';

      // Parse options (pipe-separated) and correct index for quiz cards
      let options: string[] | undefined;
      let correctOptionIndex: number | undefined;

      if (validType === 'quiz' && parts[4]) {
        options = parts[4]
          .split('|')
          .map(o => o.trim())
          .filter(o => o);
        if (parts[5]) {
          const idx = parseInt(parts[5].trim(), 10);
          if (!isNaN(idx)) {
            correctOptionIndex = idx;
          }
        }
      }

      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim() || undefined,
        type: validType,
        options,
        correctOptionIndex,
      });
    }
  }

  return cards;
}

function parseAnki(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}[] {
  // Anki export format is typically tab-separated
  return parseTXT(data);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToJSON(deck: any, cards: any[], includeProgress: boolean): string {
  const exportData = {
    title: deck.title,
    subject: deck.subject_name,
    difficulty: deck.difficulty,
    exportedAt: new Date().toISOString(),
    cards: cards.map(c => ({
      front: c.front,
      back: c.back,
      context: c.context,
      type: c.type || 'standard',
      ...(c.type === 'quiz' && {
        options: c.options || [],
        correctOptionIndex: c.correct_option_index,
      }),
      ...(includeProgress && {
        status: c.status,
        easeFactor: c.ease_factor,
        interval: c.interval,
        repetitions: c.repetitions,
      }),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

function exportToCSV(cards: any[], includeProgress: boolean): string {
  const headers = includeProgress
    ? [
        'Front',
        'Back',
        'Context',
        'Type',
        'Options',
        'CorrectOptionIndex',
        'Status',
        'Ease Factor',
        'Interval',
      ]
    : ['Front', 'Back', 'Context', 'Type', 'Options', 'CorrectOptionIndex'];

  const rows = cards.map(c => {
    const cardType = c.type || 'standard';
    // For quiz cards, join options with pipe separator
    const options = cardType === 'quiz' && c.options ? c.options.join('|') : '';
    const correctIndex = cardType === 'quiz' ? (c.correct_option_index ?? '') : '';

    const row = [
      escapeCSV(c.front),
      escapeCSV(c.back),
      escapeCSV(c.context || ''),
      cardType,
      escapeCSV(options),
      correctIndex,
    ];
    if (includeProgress) {
      row.push(c.status || '', c.ease_factor || '', c.interval || '');
    }
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportToTXT(cards: any[]): string {
  return cards
    .map(c => {
      const cardType = c.type || 'standard';
      let line = `${c.front}\t${c.back}`;

      if (c.context) {
        line += `\t${c.context}`;
      } else {
        line += '\t';
      }

      line += `\t${cardType}`;

      // For quiz cards, add options and correct index
      if (cardType === 'quiz' && c.options && c.options.length > 0) {
        line += `\t${c.options.join('|')}\t${c.correct_option_index ?? ''}`;
      }

      return line;
    })
    .join('\n');
}

function exportToAnki(cards: any[]): string {
  // Anki uses tab-separated format
  return exportToTXT(cards);
}

export default router;
