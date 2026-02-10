import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { getLocalToday } from '../utils/timezone.js';

const router = express.Router();

/**
 * Session context passed from the session completion endpoint
 * to enable session-specific achievement condition checks.
 */
export interface SessionContext {
  correctCount: number;
  durationSeconds: number;
  totalCards: number;
  completedAtHour: number; // 0-23
  score: number; // 0-100 percentage
  sessionXP: number;
}

/**
 * GET /api/achievements
 * Get all achievements with user's unlock status
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all achievements with user unlock status
    const achievementsResult = await query(
      `SELECT
         a.*,
         ua.unlocked_at,
         ua.xp_awarded,
         CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.xp_reward ASC, a.created_at ASC`,
      [userId]
    );

    // Map achievement IDs to i18n keys
    const getAchievementKeys = (achievementId: string) => {
      // Use achievement ID to create consistent translation keys
      return {
        titleKey: `items.${achievementId}.title`,
        descriptionKey: `items.${achievementId}.description`,
      };
    };

    const achievements = achievementsResult.rows.map((row: any) => {
      const { titleKey, descriptionKey } = getAchievementKeys(row.id);
      return {
        id: row.id,
        title: row.title, // Keep for backward compatibility
        description: row.description, // Keep for backward compatibility
        titleKey,
        descriptionKey,
        icon: row.icon,
        color: row.color,
        xpReward: row.xp_reward,
        unlocked: row.unlocked,
        unlockedAt: row.unlocked_at,
        conditionType: row.condition_type,
        conditionValue: row.condition_value,
        tier: row.tier,
      };
    });

    res.json({
      success: true,
      data: {
        achievements,
        totalCount: achievements.length,
        unlockedCount: achievements.filter(a => a.unlocked).length,
      },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements',
    });
  }
});

/**
 * Check and unlock achievements for a user
 * Called internally after session completion
 */
export async function checkAndUnlockAchievements(
  client: any,
  userId: string,
  sessionContext?: SessionContext
): Promise<any[]> {
  try {
    // Get user stats
    const userResult = await client.query(
      `SELECT
         level,
         streak,
         total_cards_learned,
         total_decks_completed,
         total_xp,
         current_xp,
         next_level_xp
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];

    // Get all achievements not yet unlocked by this user
    const achievementsResult = await client.query(
      `SELECT a.*
       FROM achievements a
       WHERE NOT EXISTS (
         SELECT 1 FROM user_achievements ua
         WHERE ua.user_id = $1 AND ua.achievement_id = a.id
       )`,
      [userId]
    );

    const newlyUnlocked = [];

    // Check each achievement's condition
    for (const achievement of achievementsResult.rows) {
      let unlockConditionMet = false;

      switch (achievement.condition_type) {
        case 'decks_completed':
          unlockConditionMet = user.total_decks_completed >= achievement.condition_value;
          break;

        case 'streak_days':
          unlockConditionMet = user.streak >= achievement.condition_value;
          break;

        case 'cards_mastered':
          unlockConditionMet = user.total_cards_learned >= achievement.condition_value;
          break;

        case 'level_reached':
          unlockConditionMet = user.level >= achievement.condition_value;
          break;

        case 'decks_created': {
          const decksCreatedResult = await client.query(
            'SELECT COUNT(*) as count FROM decks WHERE owner_id = $1 AND deleted_at IS NULL',
            [userId]
          );
          unlockConditionMet =
            parseInt(decksCreatedResult.rows[0].count) >= achievement.condition_value;
          break;
        }

        case 'cards_per_minute': {
          if (!sessionContext) break;
          const durationMinutes = sessionContext.durationSeconds / 60;
          if (durationMinutes <= 0) break;
          // Require at least 10 correct answers AND the rate to exceed the threshold
          // This prevents triggering after just 1 fast card
          const minCorrectRequired = Math.max(10, achievement.condition_value);
          if (sessionContext.correctCount < minCorrectRequired) break;
          const cardsPerMinute = sessionContext.correctCount / durationMinutes;
          unlockConditionMet = cardsPerMinute >= achievement.condition_value;
          break;
        }

        case 'total_xp':
          unlockConditionMet = user.total_xp >= achievement.condition_value;
          break;

        case 'session_time_of_day': {
          if (!sessionContext) break;
          const hour = sessionContext.completedAtHour;
          const startHour = Math.floor(achievement.condition_value / 100);
          if (startHour >= 20) {
            // Night range: wraps around midnight (e.g., 23:00-03:59)
            unlockConditionMet = hour >= startHour || hour < (startHour + 5) % 24;
          } else {
            // Morning range (e.g., 05:00-08:59)
            unlockConditionMet = hour >= startHour && hour < startHour + 4;
          }
          break;
        }

        case 'perfect_score_min_cards': {
          if (!sessionContext) break;
          unlockConditionMet =
            sessionContext.score === 100 &&
            sessionContext.totalCards >= achievement.condition_value;
          break;
        }

        case 'total_sessions_completed': {
          const sessionsResult = await client.query(
            `SELECT COUNT(*) as count FROM study_sessions
             WHERE user_id = $1 AND status = 'completed'`,
            [userId]
          );
          unlockConditionMet =
            parseInt(sessionsResult.rows[0].count) >= achievement.condition_value;
          break;
        }

        case 'single_session_xp': {
          if (!sessionContext) break;
          unlockConditionMet = sessionContext.sessionXP >= achievement.condition_value;
          break;
        }

        case 'cards_mastered_single_deck': {
          // Check if user has mastered ALL cards in any single deck
          const deckMasteryResult = await client.query(
            `SELECT d.id
             FROM decks d
             JOIN cards c ON c.deck_id = d.id AND c.deleted_at IS NULL
             LEFT JOIN user_card_progress ucp ON ucp.card_id = c.id AND ucp.user_id = $1
             WHERE d.deleted_at IS NULL
             GROUP BY d.id
             HAVING COUNT(c.id) > 0
               AND COUNT(c.id) = COUNT(CASE WHEN ucp.status = 'mastered' THEN 1 END)`,
            [userId]
          );
          unlockConditionMet = deckMasteryResult.rows.length >= achievement.condition_value;
          break;
        }

        default:
          console.warn(`Unknown achievement condition type: ${achievement.condition_type}`);
      }

      if (unlockConditionMet) {
        // Unlock achievement (ON CONFLICT DO NOTHING prevents race condition crashes
        // when PUT auto-save and POST /complete both try to unlock the same achievement)
        const insertResult = await client.query(
          `INSERT INTO user_achievements
             (user_id, achievement_id, xp_awarded)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, achievement_id) DO NOTHING
           RETURNING id`,
          [userId, achievement.id, achievement.xp_reward]
        );

        // Only award XP if the achievement was actually newly inserted (not a duplicate)
        if (insertResult.rows.length === 0) continue;

        // Award XP with level-up calculation
        const newTotalXP = user.total_xp + achievement.xp_reward;
        let newCurrentXP = user.current_xp + achievement.xp_reward;
        let newLevel = user.level;
        let newNextLevelXP = user.next_level_xp;

        while (newCurrentXP >= newNextLevelXP) {
          newCurrentXP -= newNextLevelXP;
          newLevel++;
          newNextLevelXP = Math.floor(newNextLevelXP * 1.2);
        }

        await client.query(
          `UPDATE users
           SET total_xp = $1,
               current_xp = $2,
               level = $3,
               next_level_xp = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [newTotalXP, newCurrentXP, newLevel, newNextLevelXP, userId]
        );

        // Update in-memory user for subsequent achievement checks in the same loop
        user.total_xp = newTotalXP;
        user.current_xp = newCurrentXP;
        user.level = newLevel;
        user.next_level_xp = newNextLevelXP;

        // Record achievement XP in daily_progress
        const today = getLocalToday();
        await client.query(
          `INSERT INTO daily_progress (user_id, date, xp_earned)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, date)
           DO UPDATE SET xp_earned = daily_progress.xp_earned + $3`,
          [userId, today, achievement.xp_reward]
        );

        newlyUnlocked.push({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          color: achievement.color,
          xpReward: achievement.xp_reward,
          tier: achievement.tier,
        });
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

export default router;
