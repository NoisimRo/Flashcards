import type { User } from '../types';

/**
 * Adapter to convert API User format to local User format
 * Ensures all required fields have valid defaults and types are correctly mapped
 */
export function adaptUserFromAPI(apiUser: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  level?: number;
  currentXP?: number;
  nextLevelXP?: number;
  totalXP?: number;
  streak?: number;
  longestStreak?: number;
  totalTimeSpent?: number;
  totalCardsLearned?: number;
  totalDecksCompleted?: number;
  totalCorrectAnswers?: number;
  totalAnswers?: number;
  preferences?: {
    dailyGoal?: number;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
}): User {
  // Ensure role is a valid type
  const validRole =
    apiUser.role === 'admin' || apiUser.role === 'teacher' || apiUser.role === 'student'
      ? apiUser.role
      : ('student' as const);

  // Ensure theme is a valid type
  const validTheme =
    apiUser.preferences?.theme === 'light' || apiUser.preferences?.theme === 'dark'
      ? apiUser.preferences.theme
      : undefined;

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: validRole,
    avatar: apiUser.avatar,
    // Gamification
    level: apiUser.level ?? 1,
    currentXP: apiUser.currentXP ?? 0,
    nextLevelXP: apiUser.nextLevelXP ?? 100,
    totalXP: apiUser.totalXP ?? 0,
    // Stats
    streak: apiUser.streak ?? 0,
    longestStreak: apiUser.longestStreak ?? 0,
    totalTimeSpent: apiUser.totalTimeSpent ?? 0,
    totalCardsLearned: apiUser.totalCardsLearned ?? 0,
    totalDecksCompleted: apiUser.totalDecksCompleted ?? 0,
    totalCorrectAnswers: apiUser.totalCorrectAnswers ?? 0,
    totalAnswers: apiUser.totalAnswers ?? 0,
    // Preferences
    preferences: apiUser.preferences
      ? {
          dailyGoal: apiUser.preferences.dailyGoal,
          soundEnabled: apiUser.preferences.soundEnabled,
          animationsEnabled: apiUser.preferences.animationsEnabled,
          theme: validTheme,
          language: apiUser.preferences.language,
        }
      : undefined,
  };
}
