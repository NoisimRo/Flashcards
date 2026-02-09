import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { generateDeckWithAI } from '../services/geminiService.js';

const router = Router();

// ============================================
// GET /api/decks - List decks
// ============================================
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      subject,
      difficulty,
      search,
      ownedOnly = 'false',
      publicOnly = 'false',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let whereClause = 'd.deleted_at IS NULL';
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by ownership
    if (ownedOnly === 'true') {
      // Owned decks require authentication
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autentificare necesară pentru a vedea deck-urile proprii',
          },
        });
      }
      whereClause += ` AND d.owner_id = $${paramIndex++}`;
      params.push(req.user.id);
    } else if (publicOnly === 'true') {
      // Public decks are accessible to everyone (including visitors)
      whereClause += ' AND d.is_public = true';
    } else {
      // Show owned + shared + public (requires authentication)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autentificare necesară',
          },
        });
      }
      whereClause += ` AND (d.owner_id = $${paramIndex++} OR d.is_public = true OR EXISTS (
        SELECT 1 FROM deck_shares ds WHERE ds.deck_id = d.id AND ds.user_id = $${paramIndex++}
      ))`;
      params.push(req.user.id, req.user.id);
    }

    if (subject) {
      whereClause += ` AND d.subject_id = $${paramIndex++}`;
      params.push(subject);
    }

    if (difficulty) {
      whereClause += ` AND d.difficulty = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (search) {
      whereClause += ` AND (d.title ILIKE $${paramIndex++} OR d.topic ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort mapping
    const sortMap: Record<string, string> = {
      title: 'd.title',
      createdAt: 'd.created_at',
      lastStudied: 'd.last_studied',
      totalCards: 'd.total_cards',
    };
    const sortColumn = sortMap[sortBy as string] || 'd.created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM decks d WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Get decks - simplified query that works for both auth and visitor
    // For visitor: mastered_cards will be 0, is_owner will be false
    const userId = req.user?.id;

    const decksResult = await query(
      `SELECT
        d.id, d.title, d.description, d.subject_id, d.topic, d.difficulty,
        d.cover_image, d.is_public, d.tags, d.total_cards,
        d.owner_id, d.created_at, d.updated_at, d.last_studied,
        d.sync_status, d.version,
        d.average_rating, d.review_count,
        s.name as subject_name,
        s.color as subject_color,
        u.name as owner_name,
        ${userId ? `(d.owner_id = $${paramIndex}) as is_owner` : 'false as is_owner'},
        ${
          userId
            ? `
          COALESCE((
            SELECT COUNT(*)
            FROM cards c
            LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id AND ucp.user_id = $${paramIndex + 1}
            WHERE c.deck_id = d.id AND c.deleted_at IS NULL AND ucp.status = 'mastered'
          ), 0)
        `
            : '0'
        } as mastered_cards
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       LEFT JOIN users u ON d.owner_id = u.id
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order} NULLS LAST
       LIMIT $${userId ? paramIndex + 2 : paramIndex} OFFSET $${userId ? paramIndex + 3 : paramIndex + 1}`,
      userId ? [...params, userId, userId, limitNum, offset] : [...params, limitNum, offset]
    );

    const decks = decksResult.rows.map(formatDeck);

    res.json({
      success: true,
      data: decks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List decks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea deck-urilor',
      },
    });
  }
});

// ============================================
// GET /api/decks/:id - Get single deck with cards
// ============================================
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get deck
    const deckResult = await query(
      `SELECT d.*, s.name as subject_name, s.color as subject_color,
              u.name as owner_name,
              (d.owner_id = $1) as is_owner
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       LEFT JOIN users u ON d.owner_id = u.id
       WHERE d.id = $2 AND d.deleted_at IS NULL`,
      [req.user!.id, id]
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
    const hasAccess =
      deck.owner_id === req.user!.id || deck.is_public || req.user!.role === 'admin';

    if (!hasAccess) {
      // Check if shared
      const shareResult = await query(
        'SELECT 1 FROM deck_shares WHERE deck_id = $1 AND user_id = $2',
        [id, req.user!.id]
      );
      if (shareResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Nu ai acces la acest deck',
          },
        });
      }
    }

    // Get cards
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE deck_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...formatDeck(deck),
        cards: cardsResult.rows.map(formatCard),
      },
    });
  } catch (error) {
    console.error('Get deck error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea deck-ului',
      },
    });
  }
});

// ============================================
// GET /api/decks/:id/cards - Get cards for a deck
// ============================================
router.get('/:id/cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includeProgress = 'false' } = req.query;

    // Verify deck access
    const deckResult = await query(
      `SELECT d.*, (d.owner_id = $1) as is_owner
       FROM decks d
       WHERE d.id = $2 AND d.deleted_at IS NULL`,
      [req.user!.id, id]
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
    const hasAccess =
      deck.owner_id === req.user!.id || deck.is_public || req.user!.role === 'admin';

    if (!hasAccess) {
      const shareResult = await query(
        'SELECT 1 FROM deck_shares WHERE deck_id = $1 AND user_id = $2',
        [id, req.user!.id]
      );
      if (shareResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Nu ai acces la acest deck',
          },
        });
      }
    }

    // Get cards
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE deck_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [id]
    );

    const responseData: any = {
      cards: cardsResult.rows.map(formatCard),
    };

    // Include user progress if requested
    if (includeProgress === 'true') {
      const progressResult = await query(
        `SELECT * FROM user_card_progress
         WHERE user_id = $1 AND card_id = ANY($2::uuid[])`,
        [req.user!.id, cardsResult.rows.map((c: any) => c.id)]
      );

      const progressMap: Record<string, any> = {};
      progressResult.rows.forEach((p: any) => {
        progressMap[p.card_id] = {
          id: p.id,
          status: p.status,
          easeFactor: parseFloat(p.ease_factor),
          interval: p.interval,
          repetitions: p.repetitions,
          nextReviewDate: p.next_review_date,
          timesSeen: p.times_seen,
          timesCorrect: p.times_correct,
          timesIncorrect: p.times_incorrect,
          lastReviewedAt: p.last_reviewed_at,
        };
      });

      responseData.cardProgress = progressMap;
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get deck cards error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea cardurilor',
      },
    });
  }
});

// ============================================
// POST /api/decks - Create deck
// ============================================
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      subject,
      topic,
      difficulty = 'A2',
      isPublic = true,
      tags = [],
      cards = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Titlul este obligatoriu',
        },
      });
    }

    const result = await withTransaction(async client => {
      // Create deck
      const deckResult = await client.query(
        `INSERT INTO decks (title, description, subject_id, topic, difficulty, is_public, tags, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [title, description, subject, topic, difficulty, isPublic, tags, req.user!.id]
      );

      const deck = deckResult.rows[0];

      // Create cards if provided
      if (cards.length > 0) {
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          await client.query(
            `INSERT INTO cards (deck_id, front, back, context, hint, type, options, correct_option_indices, created_by, position, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              deck.id,
              card.front,
              card.back,
              card.context,
              card.hint,
              card.type || 'standard',
              card.options || [],
              card.correctOptionIndices || null,
              req.user!.id,
              i,
              card.tags || (card.tag ? [card.tag] : []),
            ]
          );
        }
      }

      return deck;
    });

    // Fetch complete deck with cards
    const completeResult = await query(
      `SELECT d.*, s.name as subject_name, s.color as subject_color
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE d.id = $1`,
      [result.id]
    );

    const cardsResult = await query(
      'SELECT * FROM cards WHERE deck_id = $1 ORDER BY position ASC',
      [result.id]
    );

    res.status(201).json({
      success: true,
      data: {
        ...formatDeck({ ...completeResult.rows[0], is_owner: true }),
        cards: cardsResult.rows.map(formatCard),
      },
    });
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la crearea deck-ului',
      },
    });
  }
});

// ============================================
// POST /api/decks/generate - Generate deck with AI
// ============================================
router.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      subject,
      topic,
      difficulty = 'A2',
      numberOfCards = 10,
      cardTypes,
      language = 'ro',
      extraContext,
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Topicul este obligatoriu',
        },
      });
    }

    // Validate and default card types
    const validCardTypes: Array<'standard' | 'quiz' | 'type-answer' | 'multiple-answer'> =
      Array.isArray(cardTypes) && cardTypes.length > 0
        ? cardTypes.filter((t: string) =>
            ['standard', 'quiz', 'type-answer', 'multiple-answer'].includes(t)
          )
        : ['standard', 'quiz'];

    // Validate language (only allow supported languages)
    const validLanguages = ['ro', 'en', 'it'];
    const validLanguage = validLanguages.includes(language) ? language : 'ro';

    // Sanitize extra context (limit length to prevent abuse)
    const sanitizedExtraContext = extraContext?.slice(0, 2000);

    // Generate cards with AI
    const generatedCards = await generateDeckWithAI(
      subject || 'Limba Română',
      topic,
      difficulty,
      numberOfCards,
      validCardTypes,
      validLanguage,
      sanitizedExtraContext
    );

    res.json({
      success: true,
      data: generatedCards,
    });
  } catch (error) {
    console.error('Generate deck error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la generarea deck-ului cu AI',
      },
    });
  }
});

// ============================================
// PUT /api/decks/:id - Update deck
// ============================================
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, subject, topic, difficulty, isPublic, tags } = req.body;

    // Check ownership
    const deckResult = await query(
      'SELECT owner_id FROM decks WHERE id = $1 AND deleted_at IS NULL',
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

    if (deckResult.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să editezi acest deck',
        },
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (subject !== undefined) {
      updates.push(`subject_id = $${paramIndex++}`);
      values.push(subject);
    }
    if (topic !== undefined) {
      updates.push(`topic = $${paramIndex++}`);
      values.push(topic);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex++}`);
      values.push(difficulty);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(isPublic);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(tags);
    }

    updates.push(`version = version + 1`);

    if (updates.length === 1) {
      // Only version update, nothing to change
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nicio modificare furnizată',
        },
      });
    }

    values.push(id);

    const updateResult = await query(
      `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Get complete deck
    const completeResult = await query(
      `SELECT d.*, s.name as subject_name, s.color as subject_color
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE d.id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: formatDeck({ ...completeResult.rows[0], is_owner: true }),
    });
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea deck-ului',
      },
    });
  }
});

// ============================================
// DELETE /api/decks/:id - Delete deck
// ============================================
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check ownership
    const deckResult = await query(
      'SELECT owner_id FROM decks WHERE id = $1 AND deleted_at IS NULL',
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

    if (deckResult.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să ștergi acest deck',
        },
      });
    }

    // Soft delete
    await query('UPDATE decks SET deleted_at = NOW() WHERE id = $1', [id]);
    await query('UPDATE cards SET deleted_at = NOW() WHERE deck_id = $1', [id]);

    res.json({
      success: true,
      data: { message: 'Deck-ul a fost șters' },
    });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la ștergerea deck-ului',
      },
    });
  }
});

// ============================================
// POST /api/decks/:id/cards - Add card to deck
// ============================================
router.post('/:id/cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      front,
      back,
      context,
      hint,
      type = 'standard',
      options,
      correctOptionIndices,
      tags,
    } = req.body;

    if (!front || !back) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Front și back sunt obligatorii',
        },
      });
    }

    // Check deck ownership
    const deckResult = await query(
      'SELECT owner_id FROM decks WHERE id = $1 AND deleted_at IS NULL',
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

    if (deckResult.rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să adaugi carduri în acest deck',
        },
      });
    }

    // Get max position
    const posResult = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM cards WHERE deck_id = $1',
      [id]
    );

    const cardResult = await query(
      `INSERT INTO cards (deck_id, front, back, context, hint, type, options, correct_option_indices, created_by, position, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        front,
        back,
        context,
        hint,
        type,
        options || [],
        correctOptionIndices || null,
        req.user!.id,
        posResult.rows[0].next_pos,
        tags || [],
      ]
    );

    res.status(201).json({
      success: true,
      data: formatCard(cardResult.rows[0]),
    });
  } catch (error) {
    console.error('Add card error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la adăugarea cardului',
      },
    });
  }
});

/**
 * PUT /api/decks/:deckId/cards/:cardId
 * Update a card
 */
router.put('/:deckId/cards/:cardId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, cardId } = req.params;
    const { front, back, context, hint, type, options, correctOptionIndices, tags } = req.body;

    if (!front || !back) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Front și back sunt obligatorii',
        },
      });
    }

    // Check deck ownership
    const deckResult = await query(
      'SELECT owner_id FROM decks WHERE id = $1 AND deleted_at IS NULL',
      [deckId]
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

    if (
      deckResult.rows[0].owner_id !== req.user!.id &&
      req.user!.role !== 'admin' &&
      req.user!.role !== 'teacher'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să modifici carduri în acest deck',
        },
      });
    }

    // Update card
    const cardResult = await query(
      `UPDATE cards
       SET front = $1, back = $2, context = $3, hint = $4, type = $5, options = $6, correct_option_indices = $7, tags = $8, updated_at = NOW()
       WHERE id = $9 AND deck_id = $10 AND deleted_at IS NULL
       RETURNING *`,
      [
        front,
        back,
        context,
        hint,
        type,
        options || [],
        correctOptionIndices || null,
        tags || [],
        cardId,
        deckId,
      ]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cardul nu a fost găsit',
        },
      });
    }

    res.json({
      success: true,
      data: formatCard(cardResult.rows[0]),
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea cardului',
      },
    });
  }
});

/**
 * DELETE /api/decks/:deckId/cards/:cardId
 * Delete a card (soft delete)
 */
router.delete('/:deckId/cards/:cardId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, cardId } = req.params;

    // Check deck ownership
    const deckResult = await query(
      'SELECT owner_id FROM decks WHERE id = $1 AND deleted_at IS NULL',
      [deckId]
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

    if (
      deckResult.rows[0].owner_id !== req.user!.id &&
      req.user!.role !== 'admin' &&
      req.user!.role !== 'teacher'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să ștergi carduri din acest deck',
        },
      });
    }

    // Soft delete card
    const cardResult = await query(
      `UPDATE cards
       SET deleted_at = NOW()
       WHERE id = $1 AND deck_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [cardId, deckId]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cardul nu a fost găsit',
        },
      });
    }

    res.json({
      success: true,
      data: { id: cardId },
    });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la ștergerea cardului',
      },
    });
  }
});

// Helper functions
function formatDeck(deck: any) {
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    subject: deck.subject_id,
    subjectName: deck.subject_name,
    subjectColor: deck.subject_color,
    topic: deck.topic,
    difficulty: deck.difficulty,
    coverImage: deck.cover_image,
    isPublic: deck.is_public,
    tags: deck.tags || [],
    totalCards: deck.total_cards,
    masteredCards: deck.mastered_cards || 0,
    averageRating: deck.average_rating ? parseFloat(deck.average_rating) : 0,
    reviewCount: deck.review_count || 0,
    ownerId: deck.owner_id,
    ownerName: deck.owner_name,
    isOwner: deck.is_owner,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    lastStudied: deck.last_studied,
    syncStatus: deck.sync_status,
    version: deck.version,
  };
}

function formatCard(card: any) {
  return {
    id: card.id,
    deckId: card.deck_id,
    front: card.front,
    back: card.back,
    context: card.context,
    hint: card.hint,
    type: card.type,
    options: card.options,
    correctOptionIndices: card.correct_option_indices,
    tags: card.tags || [],
    status: card.status,
    easeFactor: parseFloat(card.ease_factor),
    interval: card.interval,
    repetitions: card.repetitions,
    nextReviewDate: card.next_review_date,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    position: card.position,
  };
}

export default router;
