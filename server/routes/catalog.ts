import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  generateProgressReport,
  type StudentDataSnapshot,
} from '../services/progressReportService.js';
import { getLocalToday } from '../utils/timezone.js';

const router = Router();

// ============================================
// Helper: Check if teacher has access to student
// Admin sees everyone; teacher sees only assigned students
// ============================================
async function canAccessStudent(
  requesterId: string,
  requesterRole: string,
  studentId: string
): Promise<boolean> {
  if (requesterRole === 'admin') return true;

  const result = await query(
    `SELECT id FROM teacher_student_assignments
     WHERE teacher_id = $1 AND student_id = $2`,
    [requesterId, studentId]
  );
  return result.rows.length > 0;
}

// ============================================
// GET /api/catalog/students - List students with metrics
// ============================================
router.get(
  '/students',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { page = '1', limit = '20', search, sortBy = 'name', sortOrder = 'asc' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;

      const params: any[] = [];
      let paramIndex = 1;

      // Teachers see only assigned students; admins see all
      let assignmentJoin = '';
      let assignmentWhere = '';
      if (req.user!.role === 'teacher') {
        assignmentJoin = `INNER JOIN teacher_student_assignments tsa ON tsa.student_id = u.id AND tsa.teacher_id = $${paramIndex++}`;
        params.push(req.user!.id);
      }

      let searchWhere = '';
      if (search) {
        searchWhere = ` AND (u.name ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
      }

      // Count
      const countResult = await query(
        `SELECT COUNT(*)
         FROM users u
         ${assignmentJoin}
         WHERE u.role = 'student' AND u.deleted_at IS NULL${searchWhere}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Allowed sort columns
      const sortColumns: Record<string, string> = {
        name: 'u.name',
        level: 'u.level',
        totalXP: 'u.total_xp',
        streak: 'u.streak',
        createdAt: 'u.created_at',
      };
      const orderCol = sortColumns[sortBy as string] || 'u.name';
      const orderDir = (sortOrder as string)?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const studentsResult = await query(
        `SELECT
           u.id, u.name, u.avatar, u.email, u.level, u.total_xp, u.streak,
           u.total_cards_learned, u.total_time_spent, u.total_answers, u.total_correct_answers,
           u.created_at,
           (SELECT COUNT(DISTINCT ss.deck_id) FROM study_sessions ss WHERE ss.user_id = u.id AND ss.status = 'completed') as decks_studied,
           (SELECT COUNT(*) FROM user_card_progress ucp WHERE ucp.user_id = u.id AND ucp.times_incorrect > 2) as frequently_incorrect_count
         FROM users u
         ${assignmentJoin}
         WHERE u.role = 'student' AND u.deleted_at IS NULL${searchWhere}
         ORDER BY ${orderCol} ${orderDir}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limitNum, offset]
      );

      res.json({
        success: true,
        data: studentsResult.rows.map(s => ({
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          email: s.email,
          level: s.level,
          totalXP: s.total_xp,
          streak: s.streak,
          totalCardsLearned: s.total_cards_learned,
          totalTimeSpent: s.total_time_spent,
          totalAnswers: s.total_answers,
          totalCorrectAnswers: s.total_correct_answers,
          decksStudied: parseInt(s.decks_studied),
          frequentlyIncorrectCount: parseInt(s.frequently_incorrect_count),
          createdAt: s.created_at,
        })),
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List catalog students error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea listei de elevi',
        },
      });
    }
  }
);

// ============================================
// GET /api/catalog/students/:id/details - Full student detail
// ============================================
router.get(
  '/students/:id/details',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Access check
      if (!(await canAccessStudent(req.user!.id, req.user!.role, id))) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Nu ai acces la acest elev',
          },
        });
      }

      // User profile
      const userResult = await query(
        `SELECT id, email, name, avatar, role, level, current_xp, next_level_xp, total_xp,
                streak, longest_streak, total_time_spent, total_cards_learned,
                total_decks_completed, total_correct_answers, total_answers,
                created_at
         FROM users WHERE id = $1 AND deleted_at IS NULL AND role = 'student'`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Elevul nu a fost găsit' },
        });
      }

      const user = userResult.rows[0];

      // Card status counts
      const cardStatusResult = await query(
        `SELECT status, COUNT(*) as count
         FROM user_card_progress WHERE user_id = $1
         GROUP BY status`,
        [id]
      );
      const statusCounts = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
      cardStatusResult.rows.forEach((row: any) => {
        if (row.status in statusCounts) {
          statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
        }
      });

      // Weekly progress
      const todayStr = getLocalToday();
      const weeklyResult = await query(
        `SELECT date, cards_studied, cards_learned, time_spent_minutes, xp_earned
         FROM daily_progress
         WHERE user_id = $1 AND date >= $2::date - INTERVAL '7 days'
         ORDER BY date ASC`,
        [id, todayStr]
      );

      // Frequently incorrect cards (top 20)
      const incorrectResult = await query(
        `SELECT c.id, c.front, c.back, d.title as deck_title,
                COALESCE(s.name, d.topic) as subject,
                ucp.times_incorrect, ucp.times_correct, ucp.times_seen, ucp.status
         FROM user_card_progress ucp
         JOIN cards c ON c.id = ucp.card_id
         JOIN decks d ON d.id = c.deck_id
         LEFT JOIN subjects s ON s.id = d.subject_id
         WHERE ucp.user_id = $1 AND ucp.times_incorrect > 0
         ORDER BY ucp.times_incorrect DESC,
                  (ucp.times_incorrect::float / NULLIF(ucp.times_seen, 0)) DESC
         LIMIT 20`,
        [id]
      );

      // Decks studied
      const decksResult = await query(
        `SELECT DISTINCT d.id, d.title, d.subject_id, COALESCE(s.name, d.topic) as subject_name
         FROM study_sessions ss
         JOIN decks d ON d.id = ss.deck_id
         LEFT JOIN subjects s ON s.id = d.subject_id
         WHERE ss.user_id = $1 AND ss.status = 'completed'
         ORDER BY d.title`,
        [id]
      );

      // Subject breakdown
      const subjectResult = await query(
        `SELECT COALESCE(s.name, d.topic, 'Necunoscut') as subject,
                COUNT(DISTINCT ss.id) as sessions_completed,
                COALESCE(SUM(ss.correct_count), 0) as total_correct,
                COALESCE(SUM(ss.correct_count + ss.incorrect_count), 0) as total_answered
         FROM study_sessions ss
         JOIN decks d ON d.id = ss.deck_id
         LEFT JOIN subjects s ON s.id = d.subject_id
         WHERE ss.user_id = $1 AND ss.status = 'completed'
         GROUP BY COALESCE(s.name, d.topic, 'Necunoscut')
         ORDER BY sessions_completed DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          user: {
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
            createdAt: user.created_at,
          },
          cardStats: {
            statusCounts,
            inStudy: statusCounts.learning + statusCounts.reviewing,
            mastered: statusCounts.mastered,
          },
          weeklyProgress: weeklyResult.rows.map(p => ({
            date: p.date,
            cardsStudied: p.cards_studied,
            cardsLearned: p.cards_learned,
            timeSpentMinutes: p.time_spent_minutes,
            xpEarned: p.xp_earned,
          })),
          frequentlyIncorrectCards: incorrectResult.rows.map(c => ({
            id: c.id,
            front: c.front,
            back: c.back,
            deckTitle: c.deck_title,
            subject: c.subject,
            timesIncorrect: c.times_incorrect,
            timesCorrect: c.times_correct,
            timesSeen: c.times_seen,
            status: c.status,
          })),
          decksStudied: decksResult.rows.map(d => ({
            id: d.id,
            title: d.title,
            subjectId: d.subject_id,
            subjectName: d.subject_name,
          })),
          subjectBreakdown: subjectResult.rows.map(s => ({
            subject: s.subject,
            sessionsCompleted: parseInt(s.sessions_completed),
            correctRate:
              parseInt(s.total_answered) > 0
                ? (parseInt(s.total_correct) / parseInt(s.total_answered)) * 100
                : 0,
          })),
        },
      });
    } catch (error) {
      console.error('Get student detail error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea detaliilor elevului',
        },
      });
    }
  }
);

// ============================================
// POST /api/catalog/students/:id/ai-report - Generate AI progress report
// ============================================
router.post(
  '/students/:id/ai-report',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Access check
      if (!(await canAccessStudent(req.user!.id, req.user!.role, id))) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Nu ai acces la acest elev',
          },
        });
      }

      // Check for recent cached report (< 24h)
      const cachedResult = await query(
        `SELECT id, report, created_at FROM student_progress_reports
         WHERE student_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC LIMIT 1`,
        [id]
      );

      if (cachedResult.rows.length > 0) {
        const cached = cachedResult.rows[0];
        return res.json({
          success: true,
          data: {
            id: cached.id,
            ...cached.report,
            generatedAt: cached.created_at,
            cached: true,
          },
        });
      }

      // Gather student data
      const userResult = await query(
        `SELECT name, level, total_xp, streak, longest_streak,
                total_cards_learned, total_time_spent,
                total_correct_answers, total_answers
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Elevul nu a fost găsit' },
        });
      }

      const user = userResult.rows[0];

      // Card status counts
      const cardStatusResult = await query(
        `SELECT status, COUNT(*) as count
         FROM user_card_progress WHERE user_id = $1
         GROUP BY status`,
        [id]
      );
      const statusCounts = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
      cardStatusResult.rows.forEach((row: any) => {
        if (row.status in statusCounts) {
          statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
        }
      });

      // Subject breakdown
      const subjectResult = await query(
        `SELECT COALESCE(s.name, d.topic, 'Necunoscut') as subject,
                COUNT(DISTINCT ss.id) as sessions_completed,
                COALESCE(SUM(ss.correct_count), 0) as total_correct,
                COALESCE(SUM(ss.correct_count + ss.incorrect_count), 0) as total_answered
         FROM study_sessions ss
         JOIN decks d ON d.id = ss.deck_id
         LEFT JOIN subjects s ON s.id = d.subject_id
         WHERE ss.user_id = $1 AND ss.status = 'completed'
         GROUP BY COALESCE(s.name, d.topic, 'Necunoscut')`,
        [id]
      );

      // Frequently incorrect cards
      const incorrectResult = await query(
        `SELECT c.front, c.back, d.title as deck_title,
                COALESCE(s.name, d.topic) as subject,
                ucp.times_incorrect, ucp.times_seen
         FROM user_card_progress ucp
         JOIN cards c ON c.id = ucp.card_id
         JOIN decks d ON d.id = c.deck_id
         LEFT JOIN subjects s ON s.id = d.subject_id
         WHERE ucp.user_id = $1 AND ucp.times_incorrect > 0
         ORDER BY ucp.times_incorrect DESC
         LIMIT 10`,
        [id]
      );

      // Weekly progress
      const todayStr = getLocalToday();
      const weeklyResult = await query(
        `SELECT date, cards_studied, time_spent_minutes
         FROM daily_progress
         WHERE user_id = $1 AND date >= $2::date - INTERVAL '7 days'
         ORDER BY date ASC`,
        [id, todayStr]
      );

      const snapshot: StudentDataSnapshot = {
        name: user.name,
        level: user.level,
        totalXP: user.total_xp,
        streak: user.streak,
        longestStreak: user.longest_streak,
        totalCardsLearned: user.total_cards_learned,
        totalTimeSpent: user.total_time_spent,
        totalCorrectAnswers: user.total_correct_answers || 0,
        totalAnswers: user.total_answers || 0,
        cardStatusCounts: statusCounts,
        subjectBreakdown: subjectResult.rows.map(s => ({
          subject: s.subject,
          sessionsCompleted: parseInt(s.sessions_completed),
          correctRate:
            parseInt(s.total_answered) > 0
              ? (parseInt(s.total_correct) / parseInt(s.total_answered)) * 100
              : 0,
        })),
        frequentlyIncorrectCards: incorrectResult.rows.map(c => ({
          front: c.front,
          back: c.back,
          deckTitle: c.deck_title,
          subject: c.subject || 'Necunoscut',
          timesIncorrect: c.times_incorrect,
          timesSeen: c.times_seen,
        })),
        weeklyProgress: weeklyResult.rows.map(d => ({
          date: d.date,
          cardsStudied: d.cards_studied,
          timeSpentMinutes: d.time_spent_minutes,
        })),
      };

      // Generate report via AI
      const report = await generateProgressReport(snapshot);

      // Cache report
      const insertResult = await query(
        `INSERT INTO student_progress_reports (student_id, requested_by, report, input_snapshot)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [id, req.user!.id, JSON.stringify(report), JSON.stringify(snapshot)]
      );

      const saved = insertResult.rows[0];

      res.json({
        success: true,
        data: {
          id: saved.id,
          ...report,
          generatedAt: saved.created_at,
          cached: false,
        },
      });
    } catch (error) {
      console.error('Generate AI report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la generarea raportului AI',
        },
      });
    }
  }
);

// ============================================
// GET /api/catalog/students/:id/reports - Get report history
// ============================================
router.get(
  '/students/:id/reports',
  authenticateToken,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!(await canAccessStudent(req.user!.id, req.user!.role, id))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Nu ai acces la acest elev' },
        });
      }

      const result = await query(
        `SELECT spr.id, spr.report, spr.created_at, u.name as requested_by_name
         FROM student_progress_reports spr
         LEFT JOIN users u ON u.id = spr.requested_by
         WHERE spr.student_id = $1
         ORDER BY spr.created_at DESC
         LIMIT 10`,
        [id]
      );

      res.json({
        success: true,
        data: result.rows.map(r => ({
          id: r.id,
          ...r.report,
          generatedAt: r.created_at,
          requestedByName: r.requested_by_name,
        })),
      });
    } catch (error) {
      console.error('Get student reports error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea rapoartelor',
        },
      });
    }
  }
);

// ============================================
// GET /api/catalog/assignments - Get all assignments (admin only)
// ============================================
router.get(
  '/assignments',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { teacherId } = req.query;

      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (teacherId) {
        whereClause += ` AND tsa.teacher_id = $${paramIndex++}`;
        params.push(teacherId);
      }

      const result = await query(
        `SELECT tsa.id, tsa.teacher_id, tsa.student_id, tsa.created_at,
                t.name as teacher_name, s.name as student_name, s.email as student_email,
                s.level as student_level, s.avatar as student_avatar
         FROM teacher_student_assignments tsa
         JOIN users t ON t.id = tsa.teacher_id
         JOIN users s ON s.id = tsa.student_id
         WHERE ${whereClause}
         ORDER BY t.name, s.name`,
        params
      );

      res.json({
        success: true,
        data: result.rows.map(r => ({
          id: r.id,
          teacherId: r.teacher_id,
          studentId: r.student_id,
          teacherName: r.teacher_name,
          studentName: r.student_name,
          studentEmail: r.student_email,
          studentLevel: r.student_level,
          studentAvatar: r.student_avatar,
          createdAt: r.created_at,
        })),
      });
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea alocărilor',
        },
      });
    }
  }
);

// ============================================
// POST /api/catalog/assignments - Assign students to teacher (admin only, supports bulk)
// ============================================
router.post(
  '/assignments',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { teacherId, studentIds } = req.body;

      if (!teacherId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'teacherId și studentIds (array) sunt obligatorii',
          },
        });
      }

      // Verify teacher exists and has teacher role
      const teacherResult = await query(
        `SELECT id FROM users WHERE id = $1 AND role = 'teacher' AND deleted_at IS NULL`,
        [teacherId]
      );
      if (teacherResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profesorul nu a fost găsit' },
        });
      }

      // Verify all students exist
      const studentResult = await query(
        `SELECT id FROM users WHERE id = ANY($1) AND role = 'student' AND deleted_at IS NULL`,
        [studentIds]
      );
      const validStudentIds = studentResult.rows.map((r: any) => r.id);

      if (validStudentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Niciun elev valid găsit' },
        });
      }

      // Bulk insert with ON CONFLICT DO NOTHING for idempotency
      const values = validStudentIds
        .map((_: string, i: number) => `($1, $${i + 2}, $${validStudentIds.length + 2})`)
        .join(', ');

      const insertResult = await query(
        `INSERT INTO teacher_student_assignments (teacher_id, student_id, assigned_by)
         VALUES ${values}
         ON CONFLICT (teacher_id, student_id) DO NOTHING
         RETURNING id, student_id`,
        [teacherId, ...validStudentIds, req.user!.id]
      );

      res.status(201).json({
        success: true,
        data: {
          assigned: insertResult.rows.length,
          alreadyAssigned: validStudentIds.length - insertResult.rows.length,
          invalidIds: studentIds.length - validStudentIds.length,
        },
      });
    } catch (error) {
      console.error('Assign students error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la alocarea elevilor',
        },
      });
    }
  }
);

// ============================================
// DELETE /api/catalog/assignments/:id - Remove assignment (admin only)
// ============================================
router.delete(
  '/assignments/:id',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await query(
        `DELETE FROM teacher_student_assignments WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alocarea nu a fost găsită' },
        });
      }

      res.json({
        success: true,
        data: { message: 'Alocarea a fost eliminată' },
      });
    } catch (error) {
      console.error('Remove assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la eliminarea alocării',
        },
      });
    }
  }
);

// ============================================
// GET /api/catalog/teachers - List teachers for assignment UI (admin only)
// ============================================
router.get(
  '/teachers',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT u.id, u.name, u.email, u.avatar,
                (SELECT COUNT(*) FROM teacher_student_assignments tsa WHERE tsa.teacher_id = u.id) as student_count
         FROM users u
         WHERE u.role = 'teacher' AND u.deleted_at IS NULL
         ORDER BY u.name`,
        []
      );

      res.json({
        success: true,
        data: result.rows.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          avatar: t.avatar,
          studentCount: parseInt(t.student_count),
        })),
      });
    } catch (error) {
      console.error('List teachers error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea profesorilor',
        },
      });
    }
  }
);

// ============================================
// GET /api/catalog/unassigned-students - Students not assigned to a teacher (admin only)
// ============================================
router.get(
  '/unassigned-students',
  authenticateToken,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { teacherId, search } = req.query;

      if (!teacherId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'teacherId este obligatoriu' },
        });
      }

      let searchWhere = '';
      const params: any[] = [teacherId];
      let paramIndex = 2;

      if (search) {
        searchWhere = ` AND (u.name ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++})`;
        params.push(`%${search}%`, `%${search}%`);
      }

      const result = await query(
        `SELECT u.id, u.name, u.email, u.avatar, u.level
         FROM users u
         WHERE u.role = 'student' AND u.deleted_at IS NULL
         AND u.id NOT IN (
           SELECT student_id FROM teacher_student_assignments WHERE teacher_id = $1
         )${searchWhere}
         ORDER BY u.name
         LIMIT 50`,
        params
      );

      res.json({
        success: true,
        data: result.rows.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
          level: s.level,
        })),
      });
    } catch (error) {
      console.error('Get unassigned students error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Eroare la obținerea elevilor nealocați',
        },
      });
    }
  }
);

export default router;
