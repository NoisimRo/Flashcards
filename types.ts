export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Card {
  id: string;
  front: string;
  back: string;
  context?: string; // Example usage sentence
  type: 'standard' | 'quiz';
  options?: string[]; // For quiz mode
  correctOptionIndex?: number;
  status: 'new' | 'learning' | 'mastered';
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
}

export interface User {
  id: string;
  name: string;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  totalTimeSpent: number; // in minutes
  cardsLearnedThisWeek: number;
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