import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// ============================================
// POST /api/import/deck - Import deck from file
// ============================================
router.post('/deck', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { format, data, title, subject, difficulty = 'A2' } = req.body;

    if (!format || !data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Format și date sunt obligatorii',
        },
      });
    }

    let cards: { front: string; back: string; context?: string }[] = [];

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

    // Create deck with cards
    const result = await withTransaction(async (client) => {
      const deckResult = await client.query(
        `INSERT INTO decks (title, subject_id, topic, difficulty, owner_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title || `Import ${new Date().toLocaleDateString('ro-RO')}`, subject || 'romana', title, difficulty, req.user!.id]
      );

      const deck = deckResult.rows[0];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        await client.query(
          `INSERT INTO cards (deck_id, front, back, context, created_by, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [deck.id, card.front, card.back, card.context, req.user!.id, i]
        );
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
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la import',
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

function parseJSON(data: string): { front: string; back: string; context?: string }[] {
  try {
    const parsed = JSON.parse(data);
    const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];
    return cards
      .filter((c: any) => c.front && c.back)
      .map((c: any) => ({
        front: String(c.front).trim(),
        back: String(c.back).trim(),
        context: c.context ? String(c.context).trim() : undefined,
      }));
  } catch {
    return [];
  }
}

function parseCSV(data: string): { front: string; back: string; context?: string }[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: { front: string; back: string; context?: string }[] = [];

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('front') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim(),
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
      inQuotes = !inQuotes;
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

function parseTXT(data: string): { front: string; back: string; context?: string }[] {
  const lines = data.split('\n').filter(line => line.trim());
  const cards: { front: string; back: string; context?: string }[] = [];

  for (const line of lines) {
    // Support various delimiters: tab, semicolon, pipe
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ');
    }

    if (parts.length >= 2 && parts[0] && parts[1]) {
      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        context: parts[2]?.trim(),
      });
    }
  }

  return cards;
}

function parseAnki(data: string): { front: string; back: string; context?: string }[] {
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
    ? ['Front', 'Back', 'Context', 'Status', 'Ease Factor', 'Interval']
    : ['Front', 'Back', 'Context'];

  const rows = cards.map(c => {
    const row = [
      escapeCSV(c.front),
      escapeCSV(c.back),
      escapeCSV(c.context || ''),
    ];
    if (includeProgress) {
      row.push(c.status, c.ease_factor, c.interval);
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
  return cards.map(c => `${c.front}\t${c.back}${c.context ? '\t' + c.context : ''}`).join('\n');
}

function exportToAnki(cards: any[]): string {
  // Anki uses tab-separated format
  return exportToTXT(cards);
}

export default router;
