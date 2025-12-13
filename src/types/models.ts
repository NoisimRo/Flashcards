// ============================================
// ENUMS & CONSTANTS
// ============================================

export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type UserRole = 'admin' | 'teacher' | 'student';

export type CardType = 'standard' | 'quiz' | 'type-answer';

export type CardStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export type AnswerStatus = 'correct' | 'incorrect' | 'skipped' | null;

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

// ============================================
// CORE MODELS
// ============================================

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  context?: string;
  hint?: string;
  type: CardType;
  options?: string[];
  correctOptionIndex?: number;
  status: CardStatus;
  // Spaced repetition data
  easeFactor: number;      // Default 2.5
  interval: number;        // Days until next review
  repetitions: number;     // Number of successful reviews
  nextReviewDate?: string; // ISO date
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;       // User ID
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  coverImage?: string;
  isPublic: boolean;
  tags: string[];
  // Stats (computed)
  totalCards: number;
  masteredCards: number;
  // Ownership
  ownerId: string;
  sharedWith: string[];    // User IDs
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastStudied?: string;
  // Sync
  syncStatus: SyncStatus;
  localVersion: number;
  serverVersion?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  // Gamification
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
  // Stats
  streak: number;
  longestStreak: number;
  lastActiveDate?: string;
  totalTimeSpent: number;     // Minutes
  totalCardsLearned: number;
  totalDecksCompleted: number;
  // Preferences
  preferences: UserPreferences;
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  dailyGoal: number;          // Cards per day
  reminderTime?: string;      // HH:mm format
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'ro' | 'en';
}

// ============================================
// SESSION & PROGRESS
// ============================================

export interface StudySession {
  id: string;
  deckId: string;
  userId: string;
  // Progress
  currentIndex: number;
  shuffledOrder: string[];    // Card IDs
  answers: Record<string, AnswerStatus>;
  // Stats
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  streak: number;
  maxStreak: number;
  xpEarned: number;
  // Time tracking
  startedAt: string;
  finishedAt?: string;
  totalTimeSeconds: number;
  // State
  isCompleted: boolean;
  isPaused: boolean;
}

export interface DailyProgress {
  id: string;
  userId: string;
  date: string;              // YYYY-MM-DD
  cardsStudied: number;
  cardsLearned: number;
  timeSpentMinutes: number;
  xpEarned: number;
  sessionsCompleted: number;
}

// ============================================
// ACHIEVEMENTS
// ============================================

export type AchievementConditionType =
  | 'decks_completed'
  | 'cards_mastered'
  | 'streak_days'
  | 'level_reached'
  | 'decks_created'
  | 'cards_per_minute'
  | 'total_xp'
  | 'time_spent_hours';

export interface AchievementCondition {
  type: AchievementConditionType;
  value: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  condition: AchievementCondition;
  // For display
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  xpAwarded: number;
}

// ============================================
// LEADERBOARD
// ============================================

export interface LeaderboardEntry {
  userId: string;
  position: number;
  name: string;
  avatar?: string;
  level: number;
  totalXP: number;
  streak: number;
  isCurrentUser: boolean;
}

// ============================================
// SUBJECTS
// ============================================

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// ============================================
// SYNC & OFFLINE
// ============================================

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'deck' | 'card' | 'session' | 'progress';
  entityId: string;
  data: any;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

export interface SyncState {
  lastSyncAt?: string;
  isSyncing: boolean;
  pendingChanges: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
  detectedAt: string;
}
