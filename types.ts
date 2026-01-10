export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Card Type Definitions:
 * - standard: Flip card with front/back, no input required
 * - type-answer: User must type the answer (includes cloze deletion)
 * - quiz: Multiple choice question with options
 */
export type CardType = 'standard' | 'type-answer' | 'quiz';

export interface Card {
  id: string;
  front: string;
  back: string;
  context?: string; // Example usage sentence
  type: CardType;
  options?: string[]; // For quiz mode only
  correctOptionIndex?: number; // For quiz mode only
  status: 'new' | 'learning' | 'mastered';
  flagCount?: number; // Number of flags reported on this card
}

export interface SessionData {
  answers: Record<string, 'correct' | 'incorrect' | 'skipped' | null>;
  streak: number;
  sessionXP: number;
  awardedCards: string[]; // IDs
  currentIndex: number;
  shuffledOrder?: string[]; // IDs in order
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  topic: string; // e.g., "Sinonime"
  difficulty: Difficulty;
  cards: Card[];
  totalCards: number;
  masteredCards: number;
  lastStudied?: string;
  sessionData?: SessionData; // Persisted progress
  // Reviews & Flags
  averageRating?: number;
  reviewCount?: number;
  flagCount?: number;
  isPublic?: boolean;
  isOwner?: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role?: 'admin' | 'teacher' | 'student';
  avatar?: string;
  // Gamification
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
  // Stats
  streak: number;
  longestStreak: number;
  totalTimeSpent: number; // in minutes
  totalCardsLearned: number;
  totalDecksCompleted: number;
  totalCorrectAnswers: number;
  totalAnswers: number;
  // Preferences
  preferences?: {
    dailyGoal?: number;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
    theme?: 'light' | 'dark';
    language?: string;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  color: string;
}

export interface LeaderboardEntry {
  id: string;
  position: number;
  name: string;
  level: number;
  xpTotal: number;
  streak: number;
  isCurrentUser: boolean;
}
