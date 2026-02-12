import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../db/index.js';
import {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { getLocalToday } from '../utils/timezone.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * Calculate user's current streak from daily_progress table
 * Single source of truth for streak calculation
 * Streak is maintained if user met ONE of these conditions:
 * 1. Studied for at least 10 minutes
 * 2. Learned at least 20 cards (cards_learned, not just correct answers)
 */
export async function calculateStreakFromDailyProgress(
  userId: string,
  streakShieldActive: boolean = false
): Promise<{
  currentStreak: number;
  longestStreak: number;
  shieldUsed: boolean;
}> {
  const today = getLocalToday();

  // Get last 60 days of activity for longest streak calculation
  const progressResult = await query(
    `SELECT date, time_spent_minutes, cards_learned
     FROM daily_progress
     WHERE user_id = $1
       AND date >= $2::date - INTERVAL '60 days'
     ORDER BY date DESC`,
    [userId, today]
  );

  if (progressResult.rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, shieldUsed: false };
  }

  // Helper to format DB date rows to YYYY-MM-DD strings using local interpretation
  const formatDbDate = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  let currentStreak = 0;
  let longestStreak = 0;
  let shieldUsed = false;

  // Calculate current streak (from today/yesterday going backwards)
  // Use noon to avoid DST edge cases when adding/subtracting days
  const checkDate = new Date(today + 'T12:00:00');

  // Start from today, or yesterday if no activity today
  const todayActivity = progressResult.rows.find(
    (row: any) => formatDbDate(new Date(row.date)) === today
  );

  if (!todayActivity) {
    // No activity today, check from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count backwards from most recent activity
  let shieldAvailable = streakShieldActive;
  for (let i = 0; i < 60; i++) {
    const checkDateStr = formatDbDate(checkDate);
    const dayActivity = progressResult.rows.find(
      (row: any) => formatDbDate(new Date(row.date)) === checkDateStr
    );

    if (dayActivity) {
      const timeCondition = dayActivity.time_spent_minutes >= 10;
      const cardsCondition = dayActivity.cards_learned >= 20;

      if (timeCondition || cardsCondition) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
    }

    // No activity or conditions not met - try to use shield to bridge 1-day gap
    if (shieldAvailable && currentStreak > 0) {
      // Shield bridges this missed day - continue counting
      shieldAvailable = false;
      shieldUsed = true;
      currentStreak++; // Count the shielded day
      longestStreak = Math.max(longestStreak, currentStreak);
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    // Streak broken
    break;
  }

  // Calculate longest streak from all historical data
  let tempStreak = 0;
  const sortedByDate = [...progressResult.rows].reverse(); // Oldest to newest

  for (let i = 0; i < sortedByDate.length; i++) {
    const row = sortedByDate[i];
    const timeCondition = row.time_spent_minutes >= 10;
    const cardsCondition = row.cards_learned >= 20;

    if (timeCondition || cardsCondition) {
      // Check if this day is consecutive with previous
      if (i === 0) {
        tempStreak = 1;
      } else {
        // Use noon dates to avoid DST issues in daysDiff calculation
        const prevDateStr = formatDbDate(new Date(sortedByDate[i - 1].date));
        const currDateStr = formatDbDate(new Date(row.date));
        const prevMs = new Date(prevDateStr + 'T12:00:00').getTime();
        const currMs = new Date(currDateStr + 'T12:00:00').getTime();
        const daysDiff = Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak, shieldUsed };
}

// ============================================
// POST /api/auth/register
// ============================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'student', guestToken } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, parolă și nume sunt obligatorii',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parola trebuie să aibă minim 6 caractere',
        },
      });
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Acest email este deja înregistrat',
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Use transaction for atomic user creation + guest session migration
    const result = await withTransaction(async client => {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name, role, next_level_xp)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, role, level, current_xp, next_level_xp, total_xp,
                   streak, longest_streak, total_time_spent, total_cards_learned,
                   total_decks_completed, total_correct_answers, total_answers,
                   preferences, created_at`,
        [
          email.toLowerCase(),
          passwordHash,
          name,
          role === 'teacher' ? 'teacher' : 'student',
          config.xp.baseXpForLevel,
        ]
      );

      const user = userResult.rows[0];

      // Migrate guest sessions if token provided
      let migratedSessionsCount = 0;
      let migratedDecksCount = 0;
      if (guestToken) {
        const migrateResult = await client.query(
          `UPDATE study_sessions
           SET user_id = $1, is_guest = false
           WHERE guest_token = $2 AND user_id IS NULL AND is_guest = true
           RETURNING id`,
          [user.id, guestToken]
        );
        migratedSessionsCount = migrateResult.rows.length;

        // Migrate guest decks
        const migrateDeckResult = await client.query(
          `UPDATE decks
           SET owner_id = $1, is_guest = false
           WHERE guest_token = $2 AND owner_id IS NULL AND is_guest = true
           RETURNING id`,
          [user.id, guestToken]
        );
        migratedDecksCount = migrateDeckResult.rows.length;

        // Update cards' created_by for migrated decks
        if (migratedDecksCount > 0) {
          const migratedDeckIds = migrateDeckResult.rows.map((r: any) => r.id);
          await client.query(
            `UPDATE cards SET created_by = $1
             WHERE deck_id = ANY($2) AND created_by IS NULL`,
            [user.id, migratedDeckIds]
          );
        }

        // If sessions were migrated, recalculate user stats
        if (migratedSessionsCount > 0) {
          const sessionsData = await client.query(
            `SELECT
               COALESCE(SUM(session_xp), 0) as total_xp,
               COALESCE(SUM(duration_seconds), 0) as total_seconds,
               COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions
             FROM study_sessions
             WHERE user_id = $1`,
            [user.id]
          );

          const stats = sessionsData.rows[0];
          const totalMinutes = Math.floor(stats.total_seconds / 60);

          // Update user with migrated stats
          await client.query(
            `UPDATE users
             SET total_xp = total_xp + $1,
                 current_xp = current_xp + $1,
                 total_time_spent = total_time_spent + $2,
                 total_decks_completed = total_decks_completed + $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [stats.total_xp, totalMinutes, stats.completed_sessions, user.id]
          );

          // Re-fetch user with updated stats
          const updatedUserResult = await client.query(
            `SELECT id, email, name, avatar, birth_date, role, level, current_xp, next_level_xp, total_xp,
                    streak, longest_streak, last_active_date, total_time_spent,
                    total_cards_learned, total_decks_completed, total_correct_answers,
                    total_answers, streak_shield_active, preferences, created_at
             FROM users WHERE id = $1`,
            [user.id]
          );

          return { user: updatedUserResult.rows[0], migratedSessionsCount };
        }
      }

      return { user, migratedSessionsCount };
    });

    const user = result.user;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, expiresAt]
    );

    res.status(201).json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
        migratedSessions: result.migratedSessionsCount,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la înregistrare',
      },
    });
  }
});

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, guestToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email și parolă sunt obligatorii',
        },
      });
    }

    // Find user
    const result = await query(
      `SELECT id, email, password_hash, name, avatar, birth_date, role, level, current_xp, next_level_xp,
              total_xp, streak, longest_streak, last_active_date, total_time_spent,
              total_cards_learned, total_decks_completed, total_correct_answers,
              total_answers, streak_shield_active, preferences, created_at
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email sau parolă incorectă',
        },
      });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email sau parolă incorectă',
        },
      });
    }

    // CRITICAL FIX: Calculate streak from daily_progress (single source of truth)
    const { currentStreak, longestStreak, shieldUsed } = await calculateStreakFromDailyProgress(
      user.id,
      user.streak_shield_active || false
    );

    const today = getLocalToday();

    if (shieldUsed) {
      // Shield was used to bridge a gap - deactivate it and record usage date
      await query(
        `UPDATE users SET
          last_login_at = NOW(),
          last_active_date = $1,
          streak = $2,
          longest_streak = $3,
          streak_shield_active = false,
          streak_shield_used_date = $4::date
         WHERE id = $5`,
        [today, currentStreak, longestStreak, today, user.id]
      );
      user.streak_shield_active = false;
    } else {
      await query(
        `UPDATE users SET
          last_login_at = NOW(),
          last_active_date = $1,
          streak = $2,
          longest_streak = $3
         WHERE id = $4`,
        [today, currentStreak, longestStreak, user.id]
      );
    }

    user.streak = currentStreak;
    user.longest_streak = longestStreak;

    // Migrate guest data if token provided
    if (guestToken) {
      // Migrate guest sessions
      await query(
        `UPDATE study_sessions
         SET user_id = $1, is_guest = false
         WHERE guest_token = $2 AND user_id IS NULL AND is_guest = true`,
        [user.id, guestToken]
      );

      // Migrate guest decks
      const migrateDeckResult = await query(
        `UPDATE decks
         SET owner_id = $1, is_guest = false
         WHERE guest_token = $2 AND owner_id IS NULL AND is_guest = true
         RETURNING id`,
        [user.id, guestToken]
      );

      if (migrateDeckResult.rows.length > 0) {
        const migratedDeckIds = migrateDeckResult.rows.map((r: any) => r.id);
        await query(
          `UPDATE cards SET created_by = $1
           WHERE deck_id = ANY($2) AND created_by IS NULL`,
          [user.id, migratedDeckIds]
        );
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, expiresAt]
    );

    res.json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken,
        refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la autentificare',
      },
    });
  }
});

// ============================================
// POST /api/auth/refresh
// ============================================
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token lipsă',
        },
      });
    }

    // Verify token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Refresh token invalid sau expirat',
        },
      });
    }

    // Check if token exists in DB and not revoked
    const tokens = await query(
      `SELECT id, token_hash FROM refresh_tokens
       WHERE user_id = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
      [payload.sub]
    );

    let validToken = false;
    let tokenId = '';
    for (const t of tokens.rows) {
      if (await bcrypt.compare(refreshToken, t.token_hash)) {
        validToken = true;
        tokenId = t.id;
        break;
      }
    }

    if (!validToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Refresh token invalid sau revocat',
        },
      });
    }

    // Get user
    const userResult = await query(
      `SELECT id, email, name, avatar, birth_date, role, level, current_xp, next_level_xp, total_xp,
              streak, longest_streak, last_active_date, total_time_spent,
              total_cards_learned, total_decks_completed, total_correct_answers,
              total_answers, streak_shield_active, preferences, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [payload.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilizator negăsit',
        },
      });
    }

    const user = userResult.rows[0];

    // Revoke old token and create new one
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [tokenId]);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshTokenHash, expiresAt]
    );

    res.json({
      success: true,
      data: {
        user: formatUser(user),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la reîmprospătare token',
      },
    });
  }
});

// ============================================
// POST /api/auth/logout
// ============================================
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Revoke all refresh tokens for user
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: { message: 'Deconectat cu succes' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la deconectare',
      },
    });
  }
});

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, name, avatar, birth_date, role, level, current_xp, next_level_xp, total_xp,
              streak, longest_streak, last_active_date, total_time_spent,
              total_cards_learned, total_decks_completed, total_correct_answers,
              total_answers, streak_shield_active, preferences, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilizator negăsit',
        },
      });
    }

    res.json({
      success: true,
      data: formatUser(result.rows[0]),
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea profilului',
      },
    });
  }
});

// ============================================
// POST /api/auth/change-password
// ============================================
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parola curentă și noua parolă sunt obligatorii',
        },
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Noua parolă trebuie să aibă minim 8 caractere',
        },
      });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Noua parolă trebuie să conțină cel puțin o cifră',
        },
      });
    }

    // Get current password hash
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilizator negăsit',
        },
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Parola curentă este incorectă',
        },
      });
    }

    // Update password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      newPasswordHash,
      req.user!.id,
    ]);

    // Revoke all refresh tokens
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: { message: 'Parola a fost schimbată cu succes' },
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la schimbarea parolei',
      },
    });
  }
});

// Helper to format user response
function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    birthDate: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : null,
    role: user.role,
    level: user.level,
    currentXP: user.current_xp,
    nextLevelXP: user.next_level_xp,
    totalXP: user.total_xp,
    streak: user.streak,
    longestStreak: user.longest_streak,
    lastActiveDate: user.last_active_date,
    totalTimeSpent: user.total_time_spent,
    totalCardsLearned: user.total_cards_learned,
    totalDecksCompleted: user.total_decks_completed,
    totalCorrectAnswers: user.total_correct_answers || 0,
    totalAnswers: user.total_answers || 0,
    streakShieldActive: user.streak_shield_active,
    preferences: user.preferences,
    createdAt: user.created_at,
  };
}

export default router;
