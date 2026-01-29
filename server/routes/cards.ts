import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET /api/cards/tags - Get distinct tags across user's cards
// ============================================
router.get('/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deckId, search } = req.query;

    const params: any[] = [];
    let paramIndex = 1;

    // Base query: unnest all tags from user's cards
    let innerWhere = 'c.deleted_at IS NULL AND d.deleted_at IS NULL';

    if (deckId) {
      innerWhere += ` AND c.deck_id = $${paramIndex++}`;
      params.push(deckId);
      innerWhere += ` AND (d.owner_id = $${paramIndex++} OR d.is_public = true)`;
      params.push(req.user!.id);
    } else {
      innerWhere += ` AND d.owner_id = $${paramIndex++}`;
      params.push(req.user!.id);
    }

    let sql = `
      SELECT DISTINCT tag FROM (
        SELECT UNNEST(c.tags) as tag
        FROM cards c
        JOIN decks d ON c.deck_id = d.id
        WHERE ${innerWhere}
      ) sub
    `;

    if (search) {
      sql += ` WHERE tag ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY tag';

    const result = await query(sql, params);
    const tags = result.rows.map((r: any) => r.tag);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea tag-urilor',
      },
    });
  }
});

export default router;
