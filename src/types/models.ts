// ============================================
// ENUMS & CONSTANTS
// ============================================

export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type UserRole = 'admin' | 'teacher' | 'student';

export type CardType = 'standard' | 'quiz' | 'type-answer';

export type CardStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export type AnswerStatus = 'correct' | 'incorrect' | 'skipped' | null;

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export type SessionSelectionMethod = 'random' | 'smart' | 'manual' | 'all';

export type SessionStatus = 'active' | 'completed' | 'abandoned';

// ============================================
// CORE MODELS - REFACTORED
// ============================================

/**
 * Card - Represents a flashcard (content only, no user-specific data)
 * User-specific progress is stored in UserCardProgress
 */
export interface Card {
  id: string;
  deckId: string;
  // Content
  front: string;
  back: string;
  context?: string;
  hint?: string;
  // Type
  type: CardType;
  options?: string[];
  correctOptionIndex?: number;
  // Flags
  flagCount?: number;
  // Metadata
  position: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID
}

/**
 * UserCardProgress - Per-user progress for a specific card
 * Replaces the old card.status and SM-2 fields
 */
export interface UserCardProgress {
  id: string;
  userId: string;
  cardId: string;
  // Status
  status: CardStatus;
  // Spaced repetition (SM-2 algorithm)
  easeFactor: number; // Default 2.5
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  nextReviewDate?: string; // ISO date
  // Statistics
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewedAt?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Deck - Library of flashcards
 * NO cards array (loaded separately for performance)
 * NO sessionData (moved to StudySession)
 */
export interface Deck {
  id: string;
  ownerId: string;
  // Metadata
  title: string;
  description?: string;
  subject: string; // Subject ID
  subjectName?: string; // Display name (populated from join)
  subjectColor?: string; // Color (populated from join)
  topic: string;
  difficulty: Difficulty;
  coverImage?: string;
  isPublic: boolean;
  tags: string[];
  // Stats (denormalized for performance)
  totalCards: number;
  // Reviews & Flags
  averageRating?: number;
  reviewCount?: number;
  flagCount?: number;
  // Ownership
  ownerName?: string; // Populated from join
  isOwner?: boolean; // Populated from join
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastStudied?: string;
  // Sync
  syncStatus?: SyncStatus;
  version?: number;
}

/**
 * DeckWithCards - Deck with cards loaded
 * Used when you need the full deck data
 */
export interface DeckWithCards extends Deck {
  cards: Card[];
}

/**
 * DeckWithProgress - Deck with user's card progress
 * Used in study sessions
 */
export interface DeckWithProgress extends Deck {
  cards: Card[];
  cardProgress: Record<string, UserCardProgress>; // Keyed by card ID
}

/**
 * StudySession - A study session instance
 * Represents a specific study session for selected cards from a deck
 */
export interface StudySession {
  id: string;
  userId: string;
  deckId: string | null; // Nullable in case deck is deleted
  // Configuration
  title: string;
  selectionMethod: SessionSelectionMethod;
  totalCards: number;
  selectedCardIds: string[];
  // Progress
  currentCardIndex: number;
  answers: Record<string, AnswerStatus>; // { cardId: status }
  streak: number;
  sessionXP: number;
  // Status
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  lastActivityAt: string;
  durationSeconds?: number;
  // Results (populated when completed)
  score?: number; // Percentage 0-100
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  // Deck info (populated in list endpoints)
  deck?: Partial<Deck>;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * StudySessionWithData - Session with loaded deck and cards
 * Used when playing a session
 */
export interface StudySessionWithData extends StudySession {
  // deck inherited from StudySession (Partial<Deck>)
  cards?: Card[]; // The selected cards for this session
  cardProgress?: Record<string, UserCardProgress>; // Progress for cards in session
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
  totalTimeSpent: number; // Minutes
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
  dailyGoal: number; // Cards per day
  reminderTime?: string; // HH:mm format
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'ro' | 'en';
}

// ============================================
// PROGRESS & STATS
// ============================================

export interface DailyProgress {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
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

// ============================================
// REVIEWS & FLAGS
// ============================================

export interface DeckReview {
  id: string;
  deckId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export type FlagStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type FlagReason = 'inappropriate' | 'incorrect_information' | 'duplicate' | 'spam' | 'other';

export interface CardFlag {
  id: string;
  cardId: string;
  deckId: string;
  flaggedByUserId: string;
  flaggedByName?: string;
  flaggedByEmail?: string;
  comment?: string;
  status: FlagStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  cardFront?: string;
  cardBack?: string;
  cardContext?: string;
  cardType?: string;
  deckTitle?: string;
  deckTopic?: string;
}

export interface DeckFlag {
  id: string;
  deckId: string;
  flaggedByUserId: string;
  flaggedByName?: string;
  flaggedByEmail?: string;
  reason?: FlagReason;
  comment?: string;
  status: FlagStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  deckTitle?: string;
  deckTopic?: string;
  totalCards?: number;
}
