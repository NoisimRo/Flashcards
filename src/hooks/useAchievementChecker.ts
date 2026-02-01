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

const SESSION_STORAGE_KEY = 'achievement_triggered_ids';

function loadTriggeredFromStorage(): Set<string> {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveTriggeredToStorage(ids: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Silent fail — sessionStorage may be unavailable
  }
}

/**
 * Client-side achievement checker for real-time badge animations during sessions.
 * Checks conditions that can be evaluated from local session state.
 * The server remains the source of truth — this is purely for animation timing.
 * Uses sessionStorage to prevent re-triggering on page refresh.
 */
export function useAchievementChecker(unlockedAchievements: ApiAchievement[]) {
  // Load previously triggered IDs from sessionStorage to survive page refreshes
  const triggeredIds = useRef<Set<string>>(loadTriggeredFromStorage());
  // Sliding window of timestamps for correct answers (for cards_per_minute)
  const correctTimestamps = useRef<number[]>([]);

  const checkAchievements = useCallback(
    (stats: SessionStats): TriggeredAchievement | null => {
      const hour = new Date().getHours();

      for (const achievement of unlockedAchievements) {
        // Skip already-unlocked (server) or already-triggered (client, persisted in sessionStorage)
        if (achievement.unlocked) continue;
        if (triggeredIds.current.has(achievement.id)) continue;

        let conditionMet = false;

        switch (achievement.conditionType) {
          case 'cards_per_minute': {
            // Sliding window: check if the last N correct answers fit within 1 minute
            const requiredCards = achievement.conditionValue;
            const timestamps = correctTimestamps.current;
            if (timestamps.length >= requiredCards) {
              const windowStart = timestamps[timestamps.length - requiredCards];
              const windowEnd = timestamps[timestamps.length - 1];
              const windowSeconds = (windowEnd - windowStart) / 1000;
              // N cards answered within 60 seconds (window from first to last of N)
              conditionMet = windowSeconds <= 60 && windowSeconds >= 0;
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
          saveTriggeredToStorage(triggeredIds.current);
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

  const recordCorrectAnswer = useCallback(() => {
    correctTimestamps.current.push(Date.now());
  }, []);

  const resetTriggered = useCallback(() => {
    triggeredIds.current.clear();
    correctTimestamps.current = [];
    saveTriggeredToStorage(triggeredIds.current);
  }, []);

  return { checkAchievements, recordCorrectAnswer, resetTriggered };
}
