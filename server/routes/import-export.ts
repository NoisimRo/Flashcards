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
      type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
      options?: string[];
      correctOptionIndices?: number[];
      tags?: string[];
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
            `INSERT INTO cards (deck_id, front, back, context, type, options, correct_option_indices, created_by, position, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              deckId,
              card.front,
              card.back,
              card.context,
              card.type || 'standard',
              card.options || [],
              card.correctOptionIndices || null,
              req.user!.id,
              startPosition + i,
              card.tags || [],
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
            `INSERT INTO cards (deck_id, front, back, context, type, options, correct_option_indices, created_by, position, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              deck.id,
              card.front,
              card.back,
              card.context,
              card.type || 'standard',
              card.options || [],
              card.correctOptionIndices || null,
              req.user!.id,
              i,
              card.tags || [],
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
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[];
  tags?: string[];
}[] {
  try {
    const parsed = JSON.parse(data);
    const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];
    return cards
      .filter((c: any) => c.front && c.back)
      .map((c: any) => {
        const validTypes = ['standard', 'quiz', 'type-answer', 'multiple-answer'];
        const cardType = validTypes.includes(c.type) ? c.type : 'standard';

        // Handle correctOptionIndices - support both old (correctOptionIndex) and new format
        let correctOptionIndices: number[] | undefined;
        if (
          (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
          Array.isArray(c.options)
        ) {
          if (Array.isArray(c.correctOptionIndices)) {
            correctOptionIndices = c.correctOptionIndices;
          } else if (typeof c.correctOptionIndex === 'number') {
            // Convert old format to new
            correctOptionIndices = [c.correctOptionIndex];
          }
        }

        // Handle tags - support array or single string
        let tags: string[] | undefined;
        if (Array.isArray(c.tags)) {
          tags = c.tags.map((t: any) => String(t).trim()).filter((t: string) => t);
        } else if (c.tag && typeof c.tag === 'string') {
          tags = [String(c.tag).trim()];
        }

        return {
          front: String(c.front).trim(),
          back: String(c.back).trim(),
          context: c.context ? String(c.context).trim() : undefined,
          type: cardType,
          options:
            (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
            Array.isArray(c.options)
              ? c.options
              : undefined,
          correctOptionIndices,
          tags,
        };
      });
  } catch {
    return [];
  }
}

function parseCSV(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[];
  tags?: string[];
}[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: {
    front: string;
    back: string;
    context?: string;
    type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
    options?: string[];
    correctOptionIndices?: number[];
    tags?: string[];
  }[] = [];

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('front') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const cardType = parts[3]?.trim() as 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
      const validType = ['standard', 'quiz', 'type-answer', 'multiple-answer'].includes(cardType)
        ? cardType
        : 'standard';

      // Parse options (pipe-separated) and correct indices for quiz/multiple-answer cards
      let options: string[] | undefined;
      let correctOptionIndices: number[] | undefined;

      if (
        (validType === 'quiz' || validType === 'multiple-answer' || validType === 'type-answer') &&
        parts[4]
      ) {
        options = parts[4]
          .split('|')
          .map(o => o.trim())
          .filter(o => o);
        if (parts[5]) {
          // Support both single index and comma-separated indices
          const indicesStr = parts[5].trim();
          if (indicesStr.includes(',')) {
            correctOptionIndices = indicesStr
              .split(',')
              .map(s => parseInt(s.trim(), 10))
              .filter(n => !isNaN(n));
          } else {
            const idx = parseInt(indicesStr, 10);
            if (!isNaN(idx)) {
              correctOptionIndices = [idx];
            }
          }
        }
      }

      // Parse tags from column 6 (pipe-separated)
      let tags: string[] | undefined;
      if (parts[6]) {
        tags = parts[6]
          .split('|')
          .map(t => t.trim())
          .filter(t => t);
      }

      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim() || undefined,
        type: validType,
        options,
        correctOptionIndices,
        tags: tags && tags.length > 0 ? tags : undefined,
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
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[];
  tags?: string[];
}[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: {
    front: string;
    back: string;
    context?: string;
    type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
    options?: string[];
    correctOptionIndices?: number[];
    tags?: string[];
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
      const cardType = parts[3]?.trim() as 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
      const validType = ['standard', 'quiz', 'type-answer', 'multiple-answer'].includes(cardType)
        ? cardType
        : 'standard';

      // Parse options (pipe-separated) and correct indices for quiz/multiple-answer cards
      let options: string[] | undefined;
      let correctOptionIndices: number[] | undefined;

      if (
        (validType === 'quiz' || validType === 'multiple-answer' || validType === 'type-answer') &&
        parts[4]
      ) {
        options = parts[4]
          .split('|')
          .map(o => o.trim())
          .filter(o => o);
        if (parts[5]) {
          // Support both single index and comma-separated indices
          const indicesStr = parts[5].trim();
          if (indicesStr.includes(',')) {
            correctOptionIndices = indicesStr
              .split(',')
              .map(s => parseInt(s.trim(), 10))
              .filter(n => !isNaN(n));
          } else {
            const idx = parseInt(indicesStr, 10);
            if (!isNaN(idx)) {
              correctOptionIndices = [idx];
            }
          }
        }
      }

      // Parse tags from column 6 (pipe-separated) - only when using tab delimiter
      let tags: string[] | undefined;
      if (parts[6] && line.includes('\t')) {
        tags = parts[6]
          .split('|')
          .map(t => t.trim())
          .filter(t => t);
      }

      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim() || undefined,
        type: validType,
        options,
        correctOptionIndices,
        tags: tags && tags.length > 0 ? tags : undefined,
      });
    }
  }

  return cards;
}

function parseAnki(data: string): {
  front: string;
  back: string;
  context?: string;
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[];
  tags?: string[];
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
      tags: c.tags || [],
      type: c.type || 'standard',
      ...((c.type === 'quiz' || c.type === 'multiple-answer' || c.type === 'type-answer') &&
        c.options && {
          options: c.options || [],
          correctOptionIndices: c.correct_option_indices,
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
        'CorrectOptionIndices',
        'Tags',
        'Status',
        'Ease Factor',
        'Interval',
      ]
    : ['Front', 'Back', 'Context', 'Type', 'Options', 'CorrectOptionIndices', 'Tags'];

  const rows = cards.map(c => {
    const cardType = c.type || 'standard';
    // For quiz and multiple-answer cards, join options with pipe separator
    const options =
      (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
      c.options
        ? c.options.join('|')
        : '';
    // Format correct indices as comma-separated (e.g., "0" for quiz, "0,2" for multiple-answer)
    const correctIndices =
      (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
      Array.isArray(c.correct_option_indices)
        ? c.correct_option_indices.join(',')
        : '';

    const tagsStr = Array.isArray(c.tags) ? c.tags.join('|') : '';

    const row = [
      escapeCSV(c.front),
      escapeCSV(c.back),
      escapeCSV(c.context || ''),
      cardType,
      escapeCSV(options),
      escapeCSV(correctIndices),
      escapeCSV(tagsStr),
    ];
    if (includeProgress) {
      row.push(c.status || '', c.ease_factor || '', c.interval || '');
    }
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes(';') || value.includes('"') || value.includes('\n')) {
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

      // For quiz, multiple-answer, and type-answer cards, add options and correct indices
      if (
        (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
        c.options &&
        c.options.length > 0
      ) {
        const correctIndices = Array.isArray(c.correct_option_indices)
          ? c.correct_option_indices.join(',')
          : '';
        line += `\t${c.options.join('|')}\t${correctIndices}`;
      } else {
        line += '\t\t'; // Empty options and indices columns
      }

      // Tags column (pipe-separated)
      line += `\t${Array.isArray(c.tags) && c.tags.length > 0 ? c.tags.join('|') : ''}`;

      return line;
    })
    .join('\n');
}

function exportToAnki(cards: any[]): string {
  // Anki uses tab-separated format
  return exportToTXT(cards);
}

export default router;
