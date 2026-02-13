import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

const DEFAULT_BADGE_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#9B59B6',
};

// GET /api/settings/badge-colors - Public endpoint
// Reads badge tier colors from the first admin user's preferences
router.get('/badge-colors', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT preferences->'badgeTierColors' as colors FROM users WHERE role = 'admin' AND preferences->'badgeTierColors' IS NOT NULL LIMIT 1`
    );

    const colors =
      result.rows.length > 0 && result.rows[0].colors
        ? result.rows[0].colors
        : DEFAULT_BADGE_COLORS;

    res.json({ success: true, data: colors });
  } catch {
    res.json({ success: true, data: DEFAULT_BADGE_COLORS });
  }
});

// PUT /api/settings/badge-colors - Admin only
// Updates the calling admin's preferences with badge tier colors
router.put(
  '/badge-colors',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { bronze, silver, gold, platinum } = req.body;
      const userId = req.user!.id;

      // Build the colors object from provided values
      const colorsToSave: Record<string, string> = {};
      if (bronze) colorsToSave.bronze = bronze;
      if (silver) colorsToSave.silver = silver;
      if (gold) colorsToSave.gold = gold;
      if (platinum) colorsToSave.platinum = platinum;

      // Merge with existing badgeTierColors in preferences
      await query(
        `UPDATE users SET preferences = jsonb_set(
          COALESCE(preferences, '{}'::jsonb),
          '{badgeTierColors}',
          COALESCE(preferences->'badgeTierColors', $1::jsonb) || $1::jsonb
        ), updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(colorsToSave), userId]
      );

      // Fetch the updated colors
      const result = await query(
        `SELECT preferences->'badgeTierColors' as colors FROM users WHERE id = $1`,
        [userId]
      );

      const colors = result.rows[0]?.colors || DEFAULT_BADGE_COLORS;
      res.json({ success: true, data: colors });
    } catch (error) {
      console.error('Error updating badge colors:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to update badge colors' },
      });
    }
  }
);

export default router;
