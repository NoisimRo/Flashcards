import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

type FlagStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

// ============================================
// POST /api/flags/cards - Flag a card
// ============================================
router.post('/cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { cardId, comment } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!cardId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Card ID este obligatoriu',
        },
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Comentariul nu poate depăși 1000 de caractere',
        },
      });
    }

    // Check if card exists and get deck_id
    const cardResult = await query('SELECT id, deck_id, deleted_at FROM cards WHERE id = $1', [
      cardId,
    ]);

    if (cardResult.rows.length === 0 || cardResult.rows[0].deleted_at) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cardul nu a fost găsit',
        },
      });
    }

    const card = cardResult.rows[0];

    // Create flag
    const flagResult = await query(
      `INSERT INTO card_flags (card_id, deck_id, flagged_by_user_id, comment, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [cardId, card.deck_id, userId, comment || null]
    );

    const flag = flagResult.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        id: flag.id,
        cardId: flag.card_id,
        deckId: flag.deck_id,
        flaggedByUserId: flag.flagged_by_user_id,
        comment: flag.comment,
        status: flag.status,
        createdAt: flag.created_at,
        updatedAt: flag.updated_at,
      },
    });
  } catch (error) {
    console.error('Error flagging card:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la raportarea cardului',
      },
    });
  }
});

// ============================================
// POST /api/flags/decks - Flag a deck
// ============================================
router.post('/decks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, reason, comment } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!deckId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Deck ID este obligatoriu',
        },
      });
    }

    const validReasons = ['inappropriate', 'incorrect_information', 'duplicate', 'spam', 'other'];
    if (reason && !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Motivul specificat nu este valid',
        },
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Comentariul nu poate depăși 1000 de caractere',
        },
      });
    }

    // Check if deck exists
    const deckResult = await query('SELECT id, deleted_at FROM decks WHERE id = $1', [deckId]);

    if (deckResult.rows.length === 0 || deckResult.rows[0].deleted_at) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Deck-ul nu a fost găsit',
        },
      });
    }

    // Create flag
    const flagResult = await query(
      `INSERT INTO deck_flags (deck_id, flagged_by_user_id, reason, comment, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [deckId, userId, reason || null, comment || null]
    );

    const flag = flagResult.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        id: flag.id,
        deckId: flag.deck_id,
        flaggedByUserId: flag.flagged_by_user_id,
        reason: flag.reason,
        comment: flag.comment,
        status: flag.status,
        createdAt: flag.created_at,
        updatedAt: flag.updated_at,
      },
    });
  } catch (error) {
    console.error('Error flagging deck:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la raportarea deck-ului',
      },
    });
  }
});

// ============================================
// GET /api/flags - Get all flags (moderators only)
// ============================================
router.get(
  '/',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { type = 'all', status, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      // Validate status if provided
      const validStatuses: FlagStatus[] = ['pending', 'under_review', 'resolved', 'dismissed'];
      if (status && !validStatuses.includes(status as FlagStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status-ul specificat nu este valid',
          },
        });
      }

      let countQuery = '';
      let dataQuery = '';
      const params: any[] = [];
      let paramIndex = 1;

      // Build query based on type
      if (type === 'card' || type === 'all') {
        const cardCondition = status ? `WHERE cf.status = $${paramIndex}::flag_status` : '';
        if (status) {
          params.push(status);
          paramIndex++;
        }

        countQuery += `
          SELECT COUNT(*) as count FROM card_flags cf ${cardCondition}
        `;

        dataQuery += `
          SELECT
            'card' as type,
            cf.id,
            cf.card_id,
            cf.deck_id,
            cf.flagged_by_user_id,
            cf.comment,
            cf.status,
            cf.reviewed_by_user_id,
            cf.reviewed_at,
            cf.review_notes,
            cf.created_at,
            cf.updated_at,
            c.front as card_front,
            c.back as card_back,
            d.title as deck_title,
            u.name as flagged_by_name,
            ur.name as reviewed_by_name,
            NULL as reason
          FROM card_flags cf
          JOIN cards c ON cf.card_id = c.id
          JOIN decks d ON cf.deck_id = d.id
          JOIN users u ON cf.flagged_by_user_id = u.id
          LEFT JOIN users ur ON cf.reviewed_by_user_id = ur.id
          ${cardCondition}
        `;
      }

      if (type === 'deck' || type === 'all') {
        const deckCondition = status
          ? `WHERE df.status = $${type === 'all' && status ? '1' : paramIndex}::flag_status`
          : '';
        if (status && type !== 'all') {
          params.push(status);
          paramIndex++;
        }

        if (type === 'all') {
          countQuery += ' UNION ALL ';
          dataQuery += ' UNION ALL ';
        }

        countQuery += `
          SELECT COUNT(*) as count FROM deck_flags df ${deckCondition}
        `;

        dataQuery += `
          SELECT
            'deck' as type,
            df.id,
            NULL as card_id,
            df.deck_id,
            df.flagged_by_user_id,
            df.comment,
            df.status,
            df.reviewed_by_user_id,
            df.reviewed_at,
            df.review_notes,
            df.created_at,
            df.updated_at,
            NULL as card_front,
            NULL as card_back,
            d.title as deck_title,
            u.name as flagged_by_name,
            ur.name as reviewed_by_name,
            df.reason
          FROM deck_flags df
          JOIN decks d ON df.deck_id = d.id
          JOIN users u ON df.flagged_by_user_id = u.id
          LEFT JOIN users ur ON df.reviewed_by_user_id = ur.id
          ${deckCondition}
        `;
      }

      // Get total count
      const countResult = await query(
        type === 'all'
          ? `SELECT SUM(count)::integer as total FROM (${countQuery}) as counts`
          : countQuery,
        status ? [status] : []
      );
      const total = parseInt(countResult.rows[0].total || countResult.rows[0].count || 0);

      // Get flags with pagination
      dataQuery += `
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limitNum, offset);

      const flagsResult = await query(dataQuery, params);

      const flags = flagsResult.rows.map(row => ({
        type: row.type,
        id: row.id,
        cardId: row.card_id,
        deckId: row.deck_id,
        flaggedByUserId: row.flagged_by_user_id,
        flaggedByName: row.flagged_by_name,
        reason: row.reason,
        comment: row.comment,
        status: row.status,
        reviewedByUserId: row.reviewed_by_user_id,
        reviewedByName: row.reviewed_by_name,
        reviewedAt: row.reviewed_at,
        reviewNotes: row.review_notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        cardFront: row.card_front,
        cardBack: row.card_back,
        deckTitle: row.deck_title,
      }));

      return res.json({
        success: true,
        data: flags,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching flags:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Eroare la încărcarea rapoartelor',
        },
      });
    }
  }
);

// ============================================
// GET /api/flags/:id - Get single flag details
// ============================================
router.get(
  '/:id',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Try to find in card_flags first
      const cardFlagResult = await query(
        `SELECT
          'card' as type,
          cf.id,
          cf.card_id,
          cf.deck_id,
          cf.flagged_by_user_id,
          cf.comment,
          cf.status,
          cf.reviewed_by_user_id,
          cf.reviewed_at,
          cf.review_notes,
          cf.created_at,
          cf.updated_at,
          c.front as card_front,
          c.back as card_back,
          c.context as card_context,
          c.type as card_type,
          d.title as deck_title,
          d.topic as deck_topic,
          u.name as flagged_by_name,
          u.email as flagged_by_email,
          ur.name as reviewed_by_name
        FROM card_flags cf
        JOIN cards c ON cf.card_id = c.id
        JOIN decks d ON cf.deck_id = d.id
        JOIN users u ON cf.flagged_by_user_id = u.id
        LEFT JOIN users ur ON cf.reviewed_by_user_id = ur.id
        WHERE cf.id = $1`,
        [id]
      );

      if (cardFlagResult.rows.length > 0) {
        const row = cardFlagResult.rows[0];
        return res.json({
          success: true,
          data: {
            type: row.type,
            id: row.id,
            cardId: row.card_id,
            deckId: row.deck_id,
            flaggedByUserId: row.flagged_by_user_id,
            flaggedByName: row.flagged_by_name,
            flaggedByEmail: row.flagged_by_email,
            comment: row.comment,
            status: row.status,
            reviewedByUserId: row.reviewed_by_user_id,
            reviewedByName: row.reviewed_by_name,
            reviewedAt: row.reviewed_at,
            reviewNotes: row.review_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            cardFront: row.card_front,
            cardBack: row.card_back,
            cardContext: row.card_context,
            cardType: row.card_type,
            deckTitle: row.deck_title,
            deckTopic: row.deck_topic,
          },
        });
      }

      // Try deck_flags
      const deckFlagResult = await query(
        `SELECT
          'deck' as type,
          df.id,
          df.deck_id,
          df.flagged_by_user_id,
          df.reason,
          df.comment,
          df.status,
          df.reviewed_by_user_id,
          df.reviewed_at,
          df.review_notes,
          df.created_at,
          df.updated_at,
          d.title as deck_title,
          d.topic as deck_topic,
          d.total_cards,
          u.name as flagged_by_name,
          u.email as flagged_by_email,
          ur.name as reviewed_by_name
        FROM deck_flags df
        JOIN decks d ON df.deck_id = d.id
        JOIN users u ON df.flagged_by_user_id = u.id
        LEFT JOIN users ur ON df.reviewed_by_user_id = ur.id
        WHERE df.id = $1`,
        [id]
      );

      if (deckFlagResult.rows.length > 0) {
        const row = deckFlagResult.rows[0];
        return res.json({
          success: true,
          data: {
            type: row.type,
            id: row.id,
            deckId: row.deck_id,
            flaggedByUserId: row.flagged_by_user_id,
            flaggedByName: row.flagged_by_name,
            flaggedByEmail: row.flagged_by_email,
            reason: row.reason,
            comment: row.comment,
            status: row.status,
            reviewedByUserId: row.reviewed_by_user_id,
            reviewedByName: row.reviewed_by_name,
            reviewedAt: row.reviewed_at,
            reviewNotes: row.review_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deckTitle: row.deck_title,
            deckTopic: row.deck_topic,
            totalCards: row.total_cards,
          },
        });
      }

      // Not found
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Raportul nu a fost găsit',
        },
      });
    } catch (error) {
      console.error('Error fetching flag details:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Eroare la încărcarea detaliilor raportului',
        },
      });
    }
  }
);

// ============================================
// PUT /api/flags/:id - Update flag status
// ============================================
router.put(
  '/:id',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
      const reviewerId = req.user!.id;

      // Validation
      const validStatuses: FlagStatus[] = ['under_review', 'resolved', 'dismissed'];
      if (!status || !validStatuses.includes(status as FlagStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status-ul trebuie să fie unul dintre: under_review, resolved, dismissed',
          },
        });
      }

      if (reviewNotes && reviewNotes.length > 2000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Notele de revizuire nu pot depăși 2000 de caractere',
          },
        });
      }

      // Try to update card flag
      const cardFlagResult = await query(
        `UPDATE card_flags
         SET status = $1::flag_status,
             reviewed_by_user_id = $2,
             reviewed_at = NOW(),
             review_notes = $3
         WHERE id = $4
         RETURNING *`,
        [status, reviewerId, reviewNotes || null, id]
      );

      if (cardFlagResult.rows.length > 0) {
        const flag = cardFlagResult.rows[0];
        return res.json({
          success: true,
          data: {
            type: 'card',
            id: flag.id,
            cardId: flag.card_id,
            deckId: flag.deck_id,
            flaggedByUserId: flag.flagged_by_user_id,
            comment: flag.comment,
            status: flag.status,
            reviewedByUserId: flag.reviewed_by_user_id,
            reviewedAt: flag.reviewed_at,
            reviewNotes: flag.review_notes,
            createdAt: flag.created_at,
            updatedAt: flag.updated_at,
          },
        });
      }

      // Try to update deck flag
      const deckFlagResult = await query(
        `UPDATE deck_flags
         SET status = $1::flag_status,
             reviewed_by_user_id = $2,
             reviewed_at = NOW(),
             review_notes = $3
         WHERE id = $4
         RETURNING *`,
        [status, reviewerId, reviewNotes || null, id]
      );

      if (deckFlagResult.rows.length > 0) {
        const flag = deckFlagResult.rows[0];
        return res.json({
          success: true,
          data: {
            type: 'deck',
            id: flag.id,
            deckId: flag.deck_id,
            flaggedByUserId: flag.flagged_by_user_id,
            reason: flag.reason,
            comment: flag.comment,
            status: flag.status,
            reviewedByUserId: flag.reviewed_by_user_id,
            reviewedAt: flag.reviewed_at,
            reviewNotes: flag.review_notes,
            createdAt: flag.created_at,
            updatedAt: flag.updated_at,
          },
        });
      }

      // Not found
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Raportul nu a fost găsit',
        },
      });
    } catch (error) {
      console.error('Error updating flag status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Eroare la actualizarea statusului raportului',
        },
      });
    }
  }
);

export default router;
