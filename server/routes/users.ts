import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET /api/users - List users (admin/teacher only)
// ============================================
router.get(
  '/',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { page = '1', limit = '20', role, search } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      let whereClause = 'deleted_at IS NULL';
      const params: any[] = [];
      let paramIndex = 1;

      // Teachers can only see students
      if (req.user!.role === 'teacher') {
        whereClause += ` AND role = 'student'`;
      } else if (role) {
        whereClause += ` AND role = $${paramIndex++}`;
        params.push(role);
      }

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex++} OR email ILIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
      }

      const countResult = await query(`SELECT COUNT(*) FROM users WHERE ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].count);

      const usersResult = await query(
        `SELECT id, email, name, avatar, role, level, total_xp, streak, created_at
       FROM users WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limitNum, offset]
      );

      res.json({
        success: true,
        data: usersResult.rows.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          avatar: u.avatar,
          role: u.role,
          level: u.level,
          totalXP: u.total_xp,
          streak: u.streak,
          createdAt: u.created_at,
        })),
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea utilizatorilor',
        },
      });
    }
  }
);

// ============================================
// GET /api/users/:id - Get user profile
// ============================================
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin/teacher
    if (id !== req.user!.id && req.user!.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să vezi acest profil',
        },
      });
    }

    const result = await query(
      `SELECT id, email, name, avatar, role, level, current_xp, next_level_xp, total_xp,
              streak, longest_streak, total_time_spent, total_cards_learned,
              total_decks_completed, total_correct_answers, total_answers,
              preferences, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilizatorul nu a fost găsit',
        },
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        currentXP: user.current_xp,
        nextLevelXP: user.next_level_xp,
        totalXP: user.total_xp,
        streak: user.streak,
        longestStreak: user.longest_streak,
        totalTimeSpent: user.total_time_spent,
        totalCardsLearned: user.total_cards_learned,
        totalDecksCompleted: user.total_decks_completed,
        totalCorrectAnswers: user.total_correct_answers || 0,
        totalAnswers: user.total_answers || 0,
        preferences: user.preferences,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea utilizatorului',
      },
    });
  }
});

// ============================================
// PUT /api/users/:id - Update user profile
// ============================================
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, avatar, preferences } = req.body;

    // Users can only update their own profile unless admin
    if (id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să editezi acest profil',
        },
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${paramIndex++}`);
      values.push(avatar);
    }
    if (preferences !== undefined) {
      updates.push(`preferences = preferences || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nicio modificare furnizată',
        },
      });
    }

    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING id, email, name, avatar, role, level, current_xp, next_level_xp, total_xp,
                 streak, longest_streak, total_time_spent, total_cards_learned,
                 total_decks_completed, total_correct_answers, total_answers,
                 preferences, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilizatorul nu a fost găsit',
        },
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        currentXP: user.current_xp,
        nextLevelXP: user.next_level_xp,
        totalXP: user.total_xp,
        streak: user.streak,
        longestStreak: user.longest_streak,
        totalTimeSpent: user.total_time_spent,
        totalCardsLearned: user.total_cards_learned,
        totalDecksCompleted: user.total_decks_completed,
        totalCorrectAnswers: user.total_correct_answers || 0,
        totalAnswers: user.total_answers || 0,
        preferences: user.preferences,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea utilizatorului',
      },
    });
  }
});

// ============================================
// PUT /api/users/:id/role - Change user role (admin only)
// ============================================
router.put(
  '/:id/role',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'teacher', 'student'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rol invalid',
          },
        });
      }

      // Prevent admin from changing their own role
      if (id === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Nu îți poți schimba propriul rol',
          },
        });
      }

      const result = await query(
        `UPDATE users SET role = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, role`,
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Utilizatorul nu a fost găsit',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: result.rows[0].id,
          role: result.rows[0].role,
        },
      });
    } catch (error) {
      console.error('Change role error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la schimbarea rolului',
        },
      });
    }
  }
);

// ============================================
// DELETE /api/users/:id - Delete user (admin only)
// ============================================
router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Nu te poți șterge pe tine însuți',
          },
        });
      }

      const result = await query(
        `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Utilizatorul nu a fost găsit',
          },
        });
      }

      res.json({
        success: true,
        data: { message: 'Utilizatorul a fost șters' },
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la ștergerea utilizatorului',
        },
      });
    }
  }
);

// ============================================
// POST /api/users/:id/xp - Update user XP
// ============================================
router.post('/:id/xp', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deltaXP } = req.body;

    // Users can only update their own XP
    if (id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să modifici XP-ul altui utilizator',
        },
      });
    }

    if (typeof deltaXP !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'deltaXP trebuie să fie un număr',
        },
      });
    }

    // Get current user data
    const userResult = await query(
      'SELECT level, current_xp, next_level_xp, total_xp FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Utilizatorul nu a fost găsit',
        },
      });
    }

    const user = userResult.rows[0];
    let newCurrentXP = Math.max(0, user.current_xp + deltaXP);
    const newTotalXP = deltaXP > 0 ? user.total_xp + deltaXP : user.total_xp;
    let newLevel = user.level;
    let newNextLevelXP = user.next_level_xp;

    // Check for level up
    while (newCurrentXP >= newNextLevelXP) {
      newCurrentXP -= newNextLevelXP;
      newLevel += 1;
      // XP needed for next level increases by 20% each level
      newNextLevelXP = Math.floor(newNextLevelXP * 1.2);
    }

    // Update user
    const updateResult = await query(
      `UPDATE users
       SET level = $1, current_xp = $2, next_level_xp = $3, total_xp = $4, updated_at = NOW()
       WHERE id = $5 AND deleted_at IS NULL
       RETURNING id, email, name, avatar, role, level, current_xp, next_level_xp, total_xp,
                 streak, longest_streak, total_time_spent, total_cards_learned,
                 total_decks_completed, total_correct_answers, total_answers,
                 preferences, created_at`,
      [newLevel, newCurrentXP, newNextLevelXP, newTotalXP, id]
    );

    const updatedUser = updateResult.rows[0];

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        level: updatedUser.level,
        currentXP: updatedUser.current_xp,
        nextLevelXP: updatedUser.next_level_xp,
        totalXP: updatedUser.total_xp,
        streak: updatedUser.streak,
        longestStreak: updatedUser.longest_streak,
        totalTimeSpent: updatedUser.total_time_spent,
        totalCardsLearned: updatedUser.total_cards_learned,
        totalDecksCompleted: updatedUser.total_decks_completed,
        totalCorrectAnswers: updatedUser.total_correct_answers || 0,
        totalAnswers: updatedUser.total_answers || 0,
        preferences: updatedUser.preferences,
        createdAt: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error('Update XP error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea XP-ului',
      },
    });
  }
});

// ============================================
// GET /api/users/:id/card-stats - Get user card statistics by status
// ============================================
router.get('/:id/card-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own stats unless admin/teacher
    if (id !== req.user!.id && req.user!.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să vezi aceste statistici',
        },
      });
    }

    // Build status map with defaults
    const statusCounts = {
      new: 0,
      learning: 0,
      reviewing: 0,
      mastered: 0,
    };

    try {
      // Get card counts by status from user_card_progress
      const cardStatusResult = await query(
        `SELECT
           status,
           COUNT(*) as count
         FROM user_card_progress
         WHERE user_id = $1
         GROUP BY status`,
        [id]
      );

      cardStatusResult.rows.forEach((row: any) => {
        if (statusCounts.hasOwnProperty(row.status)) {
          statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
        }
      });
    } catch (cardStatsError) {
      console.warn('Could not fetch card progress stats:', cardStatsError);
      // Continue with default values (all zeros)
    }

    // Calculate derived stats
    const inStudy = statusCounts.learning + statusCounts.reviewing;
    const mastered = statusCounts.mastered;

    // Get total decks count
    let totalDecks = 0;
    try {
      const decksResult = await query(
        `SELECT COUNT(*) as total_decks
         FROM decks
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [id]
      );
      totalDecks = parseInt(decksResult.rows[0]?.total_decks || '0');
    } catch (decksError) {
      console.warn('Could not fetch decks count:', decksError);
    }

    // Get active sessions count
    let activeSessions = 0;
    try {
      const sessionsResult = await query(
        `SELECT COUNT(*) as active_sessions
         FROM study_sessions
         WHERE user_id = $1 AND status = 'active'`,
        [id]
      );
      activeSessions = parseInt(sessionsResult.rows[0]?.active_sessions || '0');
    } catch (sessionsError) {
      console.warn('Could not fetch active sessions count:', sessionsError);
    }

    res.json({
      success: true,
      data: {
        statusCounts,
        inStudy,
        mastered,
        totalDecks,
        activeSessions,
      },
    });
  } catch (error) {
    console.error('Get card stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea statisticilor',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

// ============================================
// GET /api/users/:id/stats - Get user statistics
// ============================================
router.get('/:id/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own stats unless admin/teacher
    if (id !== req.user!.id && req.user!.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să vezi aceste statistici',
        },
      });
    }

    // Get weekly progress
    const weeklyResult = await query(
      `SELECT date, cards_studied, cards_learned, time_spent_minutes, xp_earned
       FROM daily_progress
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date ASC`,
      [id]
    );

    // Get achievements
    const achievementsResult = await query(
      `SELECT ua.*, a.title, a.description, a.icon, a.color
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [id]
    );

    // Get recent sessions
    const sessionsResult = await query(
      `SELECT ss.*, d.title as deck_title
       FROM study_sessions ss
       JOIN decks d ON ss.deck_id = d.id
       WHERE ss.user_id = $1 AND ss.is_completed = true
       ORDER BY ss.finished_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        weeklyProgress: weeklyResult.rows.map(p => ({
          date: p.date,
          cardsStudied: p.cards_studied,
          cardsLearned: p.cards_learned,
          timeSpentMinutes: p.time_spent_minutes,
          xpEarned: p.xp_earned,
        })),
        achievements: achievementsResult.rows.map(a => ({
          id: a.id,
          achievementId: a.achievement_id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          color: a.color,
          unlockedAt: a.unlocked_at,
          xpAwarded: a.xp_awarded,
        })),
        recentSessions: sessionsResult.rows.map(s => ({
          id: s.id,
          deckId: s.deck_id,
          deckTitle: s.deck_title,
          correctCount: s.correct_count,
          incorrectCount: s.incorrect_count,
          xpEarned: s.xp_earned,
          totalTimeSeconds: s.total_time_seconds,
          finishedAt: s.finished_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea statisticilor',
      },
    });
  }
});

// ============================================
// GET /api/users/leaderboard - Get global leaderboard
// ============================================
router.get('/leaderboard/global', async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    // Get current user ID if authenticated
    const currentUserId = req.user?.id;

    // Get top users by total XP
    const topUsersResult = await query(
      `SELECT id, name, avatar, level, total_xp, streak
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY total_xp DESC
       LIMIT $1`,
      [limitNum]
    );

    // Build leaderboard with positions
    const leaderboard = topUsersResult.rows.map((user, index) => ({
      id: user.id,
      position: index + 1,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      xpTotal: user.total_xp,
      streak: user.streak,
      isCurrentUser: user.id === currentUserId,
    }));

    // If authenticated user is not in top results, get their position
    let currentUserEntry = null;
    if (currentUserId && !leaderboard.some(u => u.isCurrentUser)) {
      const userPositionResult = await query(
        `SELECT u.id, u.name, u.avatar, u.level, u.total_xp, u.streak,
                (SELECT COUNT(*) + 1 FROM users WHERE total_xp > u.total_xp AND deleted_at IS NULL) as position
         FROM users u
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [currentUserId]
      );

      if (userPositionResult.rows.length > 0) {
        const user = userPositionResult.rows[0];
        currentUserEntry = {
          id: user.id,
          position: parseInt(user.position),
          name: user.name,
          avatar: user.avatar,
          level: user.level,
          xpTotal: user.total_xp,
          streak: user.streak,
          isCurrentUser: true,
        };
      }
    }

    // Get total user count
    const countResult = await query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL');
    const totalUsers = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        leaderboard,
        currentUser: currentUserEntry,
        totalUsers,
      },
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea clasamentului',
      },
    });
  }
});

export default router;
