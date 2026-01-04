import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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
       ORDER BY a.created_at ASC`,
      [userId]
    );

    const achievements = achievementsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      color: row.color,
      xpReward: row.xp_reward,
      unlocked: row.unlocked,
      unlockedAt: row.unlocked_at,
      conditionType: row.condition_type,
      conditionValue: row.condition_value,
      tier: row.tier,
    }));

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
  userId: string
): Promise<any[]> {
  try {
    // Get user stats
    const userResult = await client.query(
      `SELECT
         level,
         streak,
         total_cards_learned,
         total_decks_completed
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

        case 'cards_per_minute':
          // This would need to be checked during session - skip for now
          break;

        default:
          console.warn(`Unknown achievement condition type: ${achievement.condition_type}`);
      }

      if (unlockConditionMet) {
        // Unlock achievement
        await client.query(
          `INSERT INTO user_achievements
             (user_id, achievement_id, xp_awarded)
           VALUES ($1, $2, $3)`,
          [userId, achievement.id, achievement.xp_reward]
        );

        newlyUnlocked.push({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xp_reward,
        });

        // Award XP for achievement
        await client.query(
          `UPDATE users
           SET total_xp = total_xp + $1
           WHERE id = $2`,
          [achievement.xp_reward, userId]
        );
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

export default router;
