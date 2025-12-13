import { User, Deck, Card, StudySession, LeaderboardEntry, Achievement, UserAchievement, DailyProgress } from './models';

// ============================================
// GENERIC API RESPONSE
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

// ============================================
// AUTH
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'teacher' | 'student';  // Admin created manually
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;  // Unix timestamp
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

// ============================================
// USERS
// ============================================

export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  preferences?: Partial<User['preferences']>;
}

export interface UserStatsResponse {
  user: User;
  weeklyProgress: DailyProgress[];
  achievements: UserAchievement[];
  recentSessions: StudySession[];
}

// ============================================
// DECKS
// ============================================

export interface CreateDeckRequest {
  title: string;
  description?: string;
  subject: string;
  topic: string;
  difficulty: string;
  isPublic?: boolean;
  tags?: string[];
  cards?: CreateCardRequest[];
}

export interface UpdateDeckRequest {
  title?: string;
  description?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface DeckListParams {
  page?: number;
  limit?: number;
  subject?: string;
  difficulty?: string;
  search?: string;
  ownedOnly?: boolean;
  publicOnly?: boolean;
  sortBy?: 'title' | 'createdAt' | 'lastStudied' | 'totalCards';
  sortOrder?: 'asc' | 'desc';
}

export interface DeckWithCards extends Deck {
  cards: Card[];
}

// ============================================
// CARDS
// ============================================

export interface CreateCardRequest {
  front: string;
  back: string;
  context?: string;
  hint?: string;
  type?: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}

export interface UpdateCardRequest {
  front?: string;
  back?: string;
  context?: string;
  hint?: string;
  type?: string;
  options?: string[];
  correctOptionIndex?: number;
}

export interface CardReviewRequest {
  quality: 0 | 1 | 2 | 3 | 4 | 5;  // SM-2 quality rating
  timeSpentSeconds: number;
}

// ============================================
// STUDY SESSIONS
// ============================================

export interface StartSessionRequest {
  deckId: string;
  mode?: 'learn' | 'review' | 'cram';
  cardLimit?: number;
}

export interface UpdateSessionRequest {
  currentIndex?: number;
  answers?: Record<string, 'correct' | 'incorrect' | 'skipped'>;
  isPaused?: boolean;
}

export interface FinishSessionRequest {
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalTimeSeconds: number;
}

export interface SessionResultResponse {
  session: StudySession;
  xpEarned: number;
  newLevel?: number;
  newAchievements: Achievement[];
  streakUpdated: boolean;
  newStreak: number;
}

// ============================================
// LEADERBOARD
// ============================================

export interface LeaderboardParams {
  type?: 'global' | 'weekly' | 'monthly';
  limit?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserPosition: number;
  totalUsers: number;
}

// ============================================
// ACHIEVEMENTS
// ============================================

export interface AchievementsResponse {
  all: Achievement[];
  unlocked: UserAchievement[];
  progress: AchievementProgress[];
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
}

// ============================================
// IMPORT/EXPORT
// ============================================

export interface ImportDeckRequest {
  format: 'json' | 'csv' | 'anki' | 'quizlet';
  data: string;  // Base64 or raw content
  fileName?: string;
}

export interface ExportDeckRequest {
  deckId: string;
  format: 'json' | 'csv' | 'anki' | 'pdf';
  includeProgress?: boolean;
}

export interface ExportDeckResponse {
  format: string;
  fileName: string;
  content: string;  // Base64 encoded
  mimeType: string;
}

// ============================================
// AI GENERATION
// ============================================

export interface GenerateCardsRequest {
  subject: string;
  topic: string;
  difficulty: string;
  count?: number;
  language?: string;
}

export interface GenerateCardsResponse {
  cards: CreateCardRequest[];
  tokensUsed: number;
}

// ============================================
// SYNC
// ============================================

export interface SyncPushRequest {
  changes: SyncChange[];
  lastSyncTimestamp: string;
}

export interface SyncChange {
  operation: 'create' | 'update' | 'delete';
  entityType: 'deck' | 'card' | 'session';
  entityId: string;
  data?: any;
  timestamp: string;
  localVersion: number;
}

export interface SyncPullResponse {
  changes: SyncChange[];
  serverTimestamp: string;
  conflicts: SyncConflictResponse[];
}

export interface SyncConflictResponse {
  entityType: string;
  entityId: string;
  localVersion: number;
  serverVersion: number;
  serverData: any;
  resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
}
