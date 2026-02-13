import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ============================================
// POST /api/teacher-codes - Generate new code (admin only)
// ============================================
router.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { label, expiresAt } = req.body;

    // Generate cryptographically secure code (12 chars, uppercase alphanumeric)
    const code = crypto.randomBytes(9).toString('base64url').substring(0, 12).toUpperCase();

    const result = await query(
      `INSERT INTO teacher_codes (code, created_by, label, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, code, label, expires_at, created_at`,
      [code, req.user!.id, label || null, expiresAt || null]
    );

    const row = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        code: row.code,
        label: row.label,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('Generate teacher code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la generarea codului',
      },
    });
  }
});

// ============================================
// GET /api/teacher-codes - List codes (admin only)
// ============================================
router.get('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { status = 'all', page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status === 'available') {
      whereClause += ` AND tc.is_used = false AND tc.revoked_at IS NULL AND (tc.expires_at IS NULL OR tc.expires_at > NOW())`;
    } else if (status === 'used') {
      whereClause += ` AND tc.is_used = true`;
    } else if (status === 'revoked') {
      whereClause += ` AND tc.revoked_at IS NOT NULL`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM teacher_codes tc WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const codesResult = await query(
      `SELECT tc.id, tc.code, tc.is_used, tc.label,
                tc.expires_at, tc.revoked_at, tc.used_at, tc.created_at,
                creator.name as created_by_name,
                used_user.name as used_by_name
         FROM teacher_codes tc
         LEFT JOIN users creator ON creator.id = tc.created_by
         LEFT JOIN users used_user ON used_user.id = tc.used_by
         WHERE ${whereClause}
         ORDER BY tc.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: codesResult.rows.map(c => ({
        id: c.id,
        code: c.code,
        isUsed: c.is_used,
        label: c.label,
        expiresAt: c.expires_at,
        revokedAt: c.revoked_at,
        usedAt: c.used_at,
        createdAt: c.created_at,
        createdByName: c.created_by_name,
        usedByName: c.used_by_name,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List teacher codes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea codurilor',
      },
    });
  }
});

// ============================================
// DELETE /api/teacher-codes/:id - Revoke code (admin only)
// ============================================
router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Only revoke unused, non-revoked codes
      const result = await query(
        `UPDATE teacher_codes
         SET revoked_at = NOW(), revoked_by = $1
         WHERE id = $2 AND is_used = false AND revoked_at IS NULL
         RETURNING id`,
        [req.user!.id, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Codul nu a fost găsit sau a fost deja folosit/revocat',
          },
        });
      }

      res.json({
        success: true,
        data: { message: 'Codul a fost revocat' },
      });
    } catch (error) {
      console.error('Revoke teacher code error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la revocarea codului',
        },
      });
    }
  }
);

// ============================================
// GET /api/teacher-codes/validate/:code - Check if code is valid (no auth)
// ============================================
router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT id FROM teacher_codes
       WHERE code = $1 AND is_used = false AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [code.trim().toUpperCase()]
    );

    res.json({
      success: true,
      data: { valid: result.rows.length > 0 },
    });
  } catch (error) {
    console.error('Validate teacher code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la validarea codului',
      },
    });
  }
});

export default router;
