import type { User } from '../types';

/**
 * Guest User Constants and Utilities
 * Centralized logic for handling guest/visitor mode
 */

export const GUEST_USER: User = {
  id: 'guest',
  email: 'guest@flashcards.app',
  name: 'Vizitator',
  role: 'student',
  avatar: undefined,
  // Gamification
  level: 1,
  currentXP: 0,
  nextLevelXP: 100,
  totalXP: 0,
  // Stats
  streak: 0,
  longestStreak: 0,
  lastActiveDate: undefined,
  totalTimeSpent: 0,
  totalCardsLearned: 0,
  totalDecksCompleted: 0,
  // Preferences
  preferences: {
    dailyGoal: 20,
    soundEnabled: true,
    animationsEnabled: true,
    theme: 'light',
    language: 'ro',
  },
  // Metadata
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: undefined,
};

export interface LoginPromptContext {
  title: string;
  message: string;
}

export const GUEST_PROMPTS = {
  SAVE_PROGRESS: (score: number): LoginPromptContext => ({
    title: 'Bravo! Vrei să salvezi progresul?',
    message: `Ai răspuns corect la ${score} carduri! Creează un cont pentru a nu pierde acest progres.`,
  }),
  RESET_DECK: {
    title: 'Salvează progresul',
    message: 'Creează un cont pentru a putea reseta și salva progresul deck-urilor tale.',
  },
  CREATE_DECK: {
    title: 'Salvează deck-ul creat',
    message:
      'Creează un cont pentru a salva permanent deck-urile tale și a le accesa de pe orice dispozitiv.',
  },
  CREATE_SESSION: {
    title: 'Sesiuni de Studiu',
    message: 'Creează un cont pentru a salva progresul sesiunilor tale.',
  },
  SAVE_SETTINGS: {
    title: 'Salvează setările',
    message: 'Creează un cont pentru a-ți salva preferințele.',
  },
} as const;

/**
 * Check if a user is a guest (not authenticated)
 */
export function isGuestUser(user: User | null | undefined): boolean {
  return !user || user.id === 'guest';
}

/**
 * Get the appropriate prompt for a guest action
 */
export function shouldPromptLogin(action: string, isGuest: boolean): LoginPromptContext | null {
  if (!isGuest) return null;

  const promptMap: Record<string, LoginPromptContext> = {
    'reset-deck': GUEST_PROMPTS.RESET_DECK,
    'create-deck': GUEST_PROMPTS.CREATE_DECK,
    'create-session': GUEST_PROMPTS.CREATE_SESSION,
    'save-settings': GUEST_PROMPTS.SAVE_SETTINGS,
  };

  return promptMap[action] || null;
}

/**
 * Get guest token from localStorage or create a new one
 */
export function getOrCreateGuestToken(): string {
  let token = localStorage.getItem('guest_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('guest_token', token);
  }
  return token;
}

/**
 * Clear guest token from localStorage (used after signup)
 */
export function clearGuestToken(): void {
  localStorage.removeItem('guest_token');
}
