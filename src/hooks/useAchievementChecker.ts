import { useRef, useCallback } from 'react';
import type { Achievement as ApiAchievement } from '../api/achievements';

export interface TriggeredAchievement {
  id: string;
  icon: string;
  title: string;
  color: string;
}

interface SessionStats {
  correctCount: number;
  totalCards: number;
  sessionXP: number;
  durationSeconds: number;
  answers: Record<string, string>;
}

/**
 * Client-side achievement checker for real-time badge animations during sessions.
 * Checks conditions that can be evaluated from local session state.
 * The server remains the source of truth — this is purely for animation timing.
 */
export function useAchievementChecker(unlockedAchievements: ApiAchievement[]) {
  const triggeredIds = useRef<Set<string>>(new Set());
  const alreadyUnlockedIds = useRef<Set<string>>(new Set());

  // Initialize already-unlocked set from fetched data
  if (unlockedAchievements.length > 0 && alreadyUnlockedIds.current.size === 0) {
    unlockedAchievements.forEach(a => {
      if (a.unlocked) {
        alreadyUnlockedIds.current.add(a.id);
      }
    });
  }

  const checkAchievements = useCallback(
    (stats: SessionStats): TriggeredAchievement | null => {
      const hour = new Date().getHours();

      for (const achievement of unlockedAchievements) {
        // Skip already-unlocked or already-triggered-this-session
        if (achievement.unlocked) continue;
        if (triggeredIds.current.has(achievement.id)) continue;
        if (alreadyUnlockedIds.current.has(achievement.id)) continue;

        let conditionMet = false;

        switch (achievement.conditionType) {
          case 'cards_per_minute': {
            const durationMinutes = stats.durationSeconds / 60;
            if (durationMinutes > 0) {
              conditionMet = stats.correctCount / durationMinutes >= achievement.conditionValue;
            }
            break;
          }

          case 'session_time_of_day': {
            const startHour = Math.floor(achievement.conditionValue / 100);
            if (startHour >= 20) {
              conditionMet = hour >= startHour || hour < (startHour + 5) % 24;
            } else {
              conditionMet = hour >= startHour && hour < startHour + 4;
            }
            // Only trigger after at least 1 card answered
            conditionMet = conditionMet && stats.correctCount > 0;
            break;
          }

          case 'perfect_score_min_cards': {
            const totalAnswered = Object.keys(stats.answers).length;
            if (
              totalAnswered >= stats.totalCards &&
              stats.totalCards >= achievement.conditionValue
            ) {
              const allCorrect = Object.values(stats.answers).every(a => a === 'correct');
              conditionMet = allCorrect;
            }
            break;
          }

          case 'single_session_xp': {
            conditionMet = stats.sessionXP >= achievement.conditionValue;
            break;
          }

          // Skip conditions that require DB queries (handled server-side only)
          default:
            break;
        }

        if (conditionMet) {
          triggeredIds.current.add(achievement.id);
          return {
            id: achievement.id,
            icon: achievement.icon,
            title: achievement.title,
            color: achievement.color,
          };
        }
      }

      return null;
    },
    [unlockedAchievements]
  );

  const resetTriggered = useCallback(() => {
    triggeredIds.current.clear();
  }, []);

  return { checkAchievements, resetTriggered };
}
