import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/daily-challenges/today
 * Get today's daily challenges for the authenticated user
 */
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // Get or create today's challenges
    let challenges = await query(
      `SELECT * FROM daily_challenges
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    // If no challenges exist for today, create them
    if (challenges.rows.length === 0) {
      // Get user level to adjust targets
      const userResult = await query('SELECT level FROM users WHERE id = $1', [userId]);
      const userLevel = userResult.rows[0]?.level || 1;

      // Adjust targets based on level (higher level = higher targets)
      const cardsTarget = Math.min(30 + Math.floor(userLevel / 2) * 5, 50);
      const timeTarget = Math.min(20 + Math.floor(userLevel / 3) * 5, 45);

      const newChallenges = await query(
        `INSERT INTO daily_challenges
         (user_id, date, cards_target, time_target)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, today, cardsTarget, timeTarget]
      );

      challenges = newChallenges;
    }

    const challenge = challenges.rows[0];

    // Get today's actual progress from study_sessions table (aggregate all sessions from today)
    const sessionsResult = await query(
      `SELECT correct_count, duration_seconds
       FROM study_sessions
       WHERE user_id = $1
         AND DATE(started_at) = $2`,
      [userId, today]
    );

    // Aggregate correct answers and time from all sessions today
    let totalCorrectAnswers = 0;
    let totalTimeMinutes = 0;

    for (const session of sessionsResult.rows) {
      totalCorrectAnswers += session.correct_count || 0;
      totalTimeMinutes += Math.floor((session.duration_seconds || 0) / 60);
    }

    const todayProgress = {
      correct_answers: totalCorrectAnswers,
      time_spent_minutes: totalTimeMinutes,
    };

    // Get user's current streak
    const userResult = await query('SELECT streak FROM users WHERE id = $1', [userId]);
    const currentStreak = userResult.rows[0]?.streak || 0;

    // Build response - using i18n keys instead of hardcoded strings
    const response = {
      success: true,
      data: {
        challenges: [
          {
            id: 'cards',
            titleKey: 'challenges.cards.title',
            titleParams: { count: challenge.cards_target },
            progress: todayProgress.correct_answers,
            target: challenge.cards_target,
            completed: todayProgress.correct_answers >= challenge.cards_target,
            rewardClaimed: challenge.cards_reward_claimed,
            reward: 50,
            icon: 'BookOpen',
            color: 'from-blue-500 to-blue-600',
          },
          {
            id: 'time',
            titleKey: 'challenges.time.title',
            titleParams: { count: challenge.time_target },
            progress: todayProgress.time_spent_minutes,
            target: challenge.time_target,
            completed: todayProgress.time_spent_minutes >= challenge.time_target,
            rewardClaimed: challenge.time_reward_claimed,
            reward: 30,
            icon: 'Clock',
            color: 'from-purple-500 to-purple-600',
          },
          {
            id: 'streak',
            titleKey: 'challenges.streak.title',
            titleParams: {},
            descriptionKey: 'challenges.streak.description',
            progress: currentStreak >= 1 ? 1 : 0,
            target: 1,
            completed: currentStreak >= 1,
            rewardClaimed: challenge.streak_reward_claimed,
            reward: 100,
            icon: 'Flame',
            color: 'from-orange-500 to-red-600',
          },
        ],
        date: today,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily challenges',
    });
  }
});

/**
 * POST /api/daily-challenges/claim-reward
 * Claim reward for a completed challenge
 */
router.post('/claim-reward', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Validate challengeId
    if (!['cards', 'time', 'streak'].includes(challengeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid challenge ID',
      });
    }

    // Get today's challenges
    const challengesResult = await query(
      `SELECT * FROM daily_challenges
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    if (challengesResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No challenges found for today',
      });
    }

    const challenge = challengesResult.rows[0];

    // Check if already claimed
    const rewardClaimedField = `${challengeId}_reward_claimed`;
    if (challenge[rewardClaimedField]) {
      return res.status(400).json({
        success: false,
        error: 'Reward already claimed',
      });
    }

    // Verify challenge is completed
    let isCompleted = false;
    let rewardXP = 0;

    if (challengeId === 'cards') {
      // Count correct answers from all sessions today
      const sessionsResult = await query(
        'SELECT correct_count FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
        [userId, today]
      );
      let totalCorrectAnswers = 0;
      for (const session of sessionsResult.rows) {
        totalCorrectAnswers += session.correct_count || 0;
      }
      isCompleted = totalCorrectAnswers >= challenge.cards_target;
      rewardXP = 50;
    } else if (challengeId === 'time') {
      // Aggregate time from all sessions today
      const sessionsResult = await query(
        'SELECT duration_seconds FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
        [userId, today]
      );
      let totalTimeMinutes = 0;
      for (const session of sessionsResult.rows) {
        totalTimeMinutes += Math.floor((session.duration_seconds || 0) / 60);
      }
      isCompleted = totalTimeMinutes >= challenge.time_target;
      rewardXP = 30;
    } else if (challengeId === 'streak') {
      const userResult = await query('SELECT streak FROM users WHERE id = $1', [userId]);
      const currentStreak = userResult.rows[0]?.streak || 0;
      isCompleted = currentStreak >= 1;
      rewardXP = 100;
    }

    if (!isCompleted) {
      return res.status(400).json({
        success: false,
        error: 'Challenge not completed yet',
      });
    }

    // Claim reward: Update challenge and award XP
    await query(
      `UPDATE daily_challenges
       SET ${rewardClaimedField} = true,
           updated_at = NOW()
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    // Award XP to user (same level-up logic as session completion)
    const userResult = await query(
      'SELECT level, current_xp, next_level_xp FROM users WHERE id = $1',
      [userId]
    );
    const currentUser = userResult.rows[0];

    let newCurrentXP = (currentUser.current_xp || 0) + rewardXP;
    let newLevel = currentUser.level || 1;
    let newNextLevelXP = currentUser.next_level_xp || 100;
    let leveledUp = false;

    while (newCurrentXP >= newNextLevelXP) {
      newCurrentXP -= newNextLevelXP;
      newLevel += 1;
      leveledUp = true;
      newNextLevelXP = Math.floor(newNextLevelXP * 1.2);
    }

    await query(
      `UPDATE users
       SET total_xp = total_xp + $1,
           current_xp = $2,
           level = $3,
           next_level_xp = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [rewardXP, newCurrentXP, newLevel, newNextLevelXP, userId]
    );

    res.json({
      success: true,
      data: {
        xpEarned: rewardXP,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        oldLevel: leveledUp ? currentUser.level : undefined,
      },
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim reward',
    });
  }
});

/**
 * GET /api/daily-challenges/activity-calendar
 * Get last 28 days of activity for streak calendar
 */
router.get('/activity-calendar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get last 28 days of daily_progress
    const activityResult = await query(
      `SELECT date, cards_learned, time_spent_minutes, sessions_completed
       FROM daily_progress
       WHERE user_id = $1
         AND date >= CURRENT_DATE - INTERVAL '27 days'
         AND date <= CURRENT_DATE
       ORDER BY date ASC`,
      [userId]
    );

    // Create calendar for last 28 days
    const calendar = [];
    const today = new Date();
    const activityMap = new Map<string, any>(
      activityResult.rows.map((row: any) => [row.date.toISOString().split('T')[0], row])
    );

    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const activity: any = activityMap.get(dateStr);
      const studied = !!activity && (activity.cards_learned > 0 || activity.sessions_completed > 0);

      // Calculate intensity based on cards learned and time spent
      let intensity = 0;
      if (studied && activity) {
        const cardsScore = Math.min(activity.cards_learned / 10, 1); // 10+ cards = max
        const timeScore = Math.min(activity.time_spent_minutes / 15, 1); // 15+ min = max
        const combinedScore = (cardsScore + timeScore) / 2;

        if (combinedScore > 0.66) intensity = 3;
        else if (combinedScore > 0.33) intensity = 2;
        else if (combinedScore > 0) intensity = 1;
      }

      calendar.push({
        date: dateStr,
        studied,
        intensity,
        cardsLearned: activity?.cards_learned || 0,
        timeSpent: activity?.time_spent_minutes || 0,
      });
    }

    res.json({
      success: true,
      data: {
        calendar,
      },
    });
  } catch (error) {
    console.error('Error fetching activity calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity calendar',
    });
  }
});

export default router;
