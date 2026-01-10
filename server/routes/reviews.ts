import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

// ============================================
// POST /api/reviews - Create or update review
// ============================================
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, rating, comment } = req.body;
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

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rating-ul trebuie să fie un număr întreg între 1 și 5',
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
    const deckResult = await query(
      'SELECT id, owner_id, is_public, deleted_at FROM decks WHERE id = $1',
      [deckId]
    );

    if (deckResult.rows.length === 0 || deckResult.rows[0].deleted_at) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Deck-ul nu a fost găsit',
        },
      });
    }

    const deck = deckResult.rows[0];

    // Check if deck is public
    if (!deck.is_public) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Poți lăsa recenzii doar pentru deck-uri publice',
        },
      });
    }

    // Prevent self-review
    if (deck.owner_id === userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu poți lăsa o recenzie pentru propriul deck',
        },
      });
    }

    // Upsert review (INSERT or UPDATE if exists)
    const reviewResult = await query(
      `INSERT INTO deck_reviews (deck_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (deck_id, user_id)
       DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
       RETURNING *`,
      [deckId, userId, rating, comment || null]
    );

    const review = reviewResult.rows[0];

    // Get updated deck stats (triggers handle this, but we fetch for response)
    const statsResult = await query(
      'SELECT average_rating, review_count FROM decks WHERE id = $1',
      [deckId]
    );

    return res.status(review.created_at === review.updated_at ? 201 : 200).json({
      success: true,
      data: {
        id: review.id,
        deckId: review.deck_id,
        userId: review.user_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      },
      meta: {
        deckAverageRating: parseFloat(statsResult.rows[0].average_rating),
        deckReviewCount: statsResult.rows[0].review_count,
      },
    });
  } catch (error) {
    console.error('Error creating/updating review:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la crearea recenziei',
      },
    });
  }
});

// ============================================
// GET /api/reviews - Get reviews for a deck
// ============================================
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, page = '1', limit = '20' } = req.query;

    if (!deckId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Deck ID este obligatoriu',
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

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

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM deck_reviews WHERE deck_id = $1', [
      deckId,
    ]);
    const total = parseInt(countResult.rows[0].count);

    // Get reviews with user info
    const reviewsResult = await query(
      `SELECT dr.*, u.name as user_name, u.avatar as user_avatar
       FROM deck_reviews dr
       JOIN users u ON dr.user_id = u.id
       WHERE dr.deck_id = $1
       ORDER BY dr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [deckId, limitNum, offset]
    );

    const reviews = reviewsResult.rows.map(row => ({
      id: row.id,
      deckId: row.deck_id,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      success: true,
      data: reviews,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la încărcarea recenziilor',
      },
    });
  }
});

// ============================================
// GET /api/reviews/my - Get current user's reviews
// ============================================
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const userId = req.user!.id;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(config.pagination.maxLimit, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM deck_reviews WHERE user_id = $1', [
      userId,
    ]);
    const total = parseInt(countResult.rows[0].count);

    // Get reviews with deck info
    const reviewsResult = await query(
      `SELECT dr.*, d.title as deck_title, d.topic as deck_topic,
              s.name as subject_name, s.color as subject_color
       FROM deck_reviews dr
       JOIN decks d ON dr.deck_id = d.id
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE dr.user_id = $1 AND d.deleted_at IS NULL
       ORDER BY dr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    const reviews = reviewsResult.rows.map(row => ({
      id: row.id,
      deckId: row.deck_id,
      deckTitle: row.deck_title,
      deckTopic: row.deck_topic,
      subjectName: row.subject_name,
      subjectColor: row.subject_color,
      userId: row.user_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      success: true,
      data: reviews,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la încărcarea recenziilor tale',
      },
    });
  }
});

// ============================================
// PUT /api/reviews/:id - Update review
// ============================================
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rating-ul trebuie să fie un număr întreg între 1 și 5',
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

    // Check if review exists
    const existingResult = await query(
      'SELECT id, user_id, deck_id FROM deck_reviews WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recenzia nu a fost găsită',
        },
      });
    }

    const existingReview = existingResult.rows[0];

    // Check ownership (user owns review OR is admin)
    if (existingReview.user_id !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să modifici această recenzie',
        },
      });
    }

    // Update review
    const updateResult = await query(
      `UPDATE deck_reviews
       SET rating = $1, comment = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rating, comment || null, id]
    );

    const review = updateResult.rows[0];

    return res.json({
      success: true,
      data: {
        id: review.id,
        deckId: review.deck_id,
        userId: review.user_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la actualizarea recenziei',
      },
    });
  }
});

// ============================================
// DELETE /api/reviews/:id - Delete review
// ============================================
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if review exists
    const existingResult = await query(
      'SELECT id, user_id, deck_id FROM deck_reviews WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Recenzia nu a fost găsită',
        },
      });
    }

    const existingReview = existingResult.rows[0];

    // Check ownership (user owns review OR is admin)
    if (existingReview.user_id !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să ștergi această recenzie',
        },
      });
    }

    // Delete review (triggers will auto-update deck stats)
    await query('DELETE FROM deck_reviews WHERE id = $1', [id]);

    return res.json({
      success: true,
      data: {
        message: 'Recenzia a fost ștearsă cu succes',
      },
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Eroare la ștergerea recenziei',
      },
    });
  }
});

export default router;
