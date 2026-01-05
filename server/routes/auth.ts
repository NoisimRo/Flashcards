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
import { config } from '../config/index.js';

const router = Router();

// ============================================
// POST /api/auth/register
// ============================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'student' } = req.body;

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

    // Create user
    const result = await query(
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

    const user = result.rows[0];

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
    const { email, password } = req.body;

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
      `SELECT id, email, password_hash, name, role, level, current_xp, next_level_xp,
              total_xp, streak, longest_streak, last_active_date, total_time_spent,
              total_cards_learned, total_decks_completed, total_correct_answers,
              total_answers, preferences, created_at
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

    // Update last login and check streak
    const today = new Date().toISOString().split('T')[0];
    const lastActive = user.last_active_date?.toISOString().split('T')[0];

    let newStreak = user.streak;
    if (lastActive) {
      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 1) {
        newStreak = 1; // Reset streak if more than 1 day gap
      } else if (daysDiff === 1) {
        newStreak = user.streak + 1; // Increment streak
      }
      // daysDiff === 0 means same day, keep streak
    } else {
      newStreak = 1; // First login
    }

    const longestStreak = Math.max(user.longest_streak, newStreak);

    await query(
      `UPDATE users SET
        last_login_at = NOW(),
        last_active_date = $1,
        streak = $2,
        longest_streak = $3
       WHERE id = $4`,
      [today, newStreak, longestStreak, user.id]
    );

    user.streak = newStreak;
    user.longest_streak = longestStreak;

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
      `SELECT id, email, name, role, level, current_xp, next_level_xp, total_xp,
              streak, longest_streak, total_time_spent, total_cards_learned,
              total_decks_completed, total_correct_answers, total_answers,
              preferences, created_at
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
      `SELECT id, email, name, avatar, role, level, current_xp, next_level_xp, total_xp,
              streak, longest_streak, last_active_date, total_time_spent,
              total_cards_learned, total_decks_completed, total_correct_answers,
              total_answers, preferences, created_at
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Noua parolă trebuie să aibă minim 6 caractere',
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
    preferences: user.preferences,
    createdAt: user.created_at,
  };
}

export default router;
