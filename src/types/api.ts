import {
  User,
  Deck,
  DeckWithCards,
  Card,
  StudySession,
  StudySessionWithData,
  UserCardProgress,
  LeaderboardEntry,
  Achievement,
  UserAchievement,
  DailyProgress,
  SessionSelectionMethod,
} from './models';

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
  role?: 'teacher' | 'student'; // Admin created manually
  guestToken?: string;
  teacherCode?: string; // Required when role = 'teacher'
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
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
  birthDate?: string;
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
  language?: string;
}

export interface UpdateDeckRequest {
  title?: string;
  description?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
}

export interface DeckListParams {
  page?: number;
  limit?: number;
  subject?: string;
  difficulty?: string;
  search?: string;
  ownedOnly?: boolean;
  publicOnly?: boolean;
  sortBy?: 'title' | 'createdAt' | 'lastStudied' | 'totalCards' | 'rating';
  sortOrder?: 'asc' | 'desc';
  minRating?: number;
}

// ============================================
// CARDS
// ============================================

export interface CreateCardRequest {
  front: string;
  back: string;
  context?: string;
  hint?: string;
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[]; // For quiz (single) and multiple-answer (multiple)
  tags?: string[];
}

export interface UpdateCardRequest {
  front?: string;
  back?: string;
  context?: string;
  hint?: string;
  type?: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[]; // For quiz (single) and multiple-answer (multiple)
  tags?: string[];
}

export interface CardReviewRequest {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality rating
  timeSpentSeconds: number;
}

export interface GetCardsParams {
  deckId?: string;
  includeProgress?: boolean; // Include user's progress for each card
}

// ============================================
// USER CARD PROGRESS
// ============================================

export interface UpdateCardProgressRequest {
  cardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality rating
  timeSpentSeconds: number;
}

export interface CardProgressBatchUpdate {
  cardId: string;
  wasCorrect: boolean;
  timeSpentSeconds: number;
}

// ============================================
// STUDY SESSIONS - REFACTORED
// ============================================

/**
 * Create a new study session
 */
export interface CreateStudySessionRequest {
  deckId: string;
  selectionMethod: SessionSelectionMethod;
  cardCount?: number; // For 'random' and 'smart' methods
  selectedCardIds?: string[]; // For 'manual' method
  excludeMasteredCards?: boolean; // Default: true
  excludeActiveSessionCards?: boolean; // Default: false - exclude cards already in active sessions
  title?: string; // Optional custom title
}

/**
 * Response when creating a session - includes selected cards
 */
export interface CreateStudySessionResponse {
  session: StudySessionWithData; // Session with cards and progress
  availableCards: number; // How many cards were available for selection
  masteredCards: number; // How many cards were excluded (mastered)
}

/**
 * Get list of study sessions
 */
export interface GetStudySessionsParams {
  status?: 'active' | 'completed' | 'abandoned' | 'all';
  deckId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Update session progress (during study)
 */
export interface UpdateStudySessionRequest {
  currentCardIndex?: number;
  answers?: Record<string, 'correct' | 'incorrect' | 'skipped'>;
  streak?: number;
  sessionXP?: number;
  durationSeconds?: number; // Incremental time tracking
  clientTimezoneOffset?: number; // new Date().getTimezoneOffset() — for time-of-day achievements
}

/**
 * Complete a study session
 */
export interface CompleteStudySessionRequest {
  score: number; // Percentage 0-100
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  durationSeconds: number;
  // Array of card progress updates to apply
  cardProgressUpdates: CardProgressBatchUpdate[];
  clientTimezoneOffset?: number; // new Date().getTimezoneOffset() — for time-of-day achievements
}

/**
 * Response when completing a session
 */
export interface CompleteStudySessionResponse {
  session: StudySession;
  xpEarned: number;
  newLevel?: number;
  leveledUp: boolean;
  newAchievements: Achievement[];
  streakUpdated: boolean;
  newStreak: number;
  cardsLearned: number; // Cards that changed status to 'mastered'
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
  data: string; // Base64 or raw content
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
  content: string; // Base64 encoded
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

// ============================================
// TEACHER CODES
// ============================================

export interface TeacherCode {
  id: string;
  code: string;
  isUsed: boolean;
  label?: string;
  createdByName?: string;
  usedByName?: string;
  usedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateTeacherCodeRequest {
  label?: string;
  expiresAt?: string;
}

// ============================================
// CATALOG
// ============================================

export interface CatalogStudent {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  level: number;
  totalXP: number;
  streak: number;
  totalCardsLearned: number;
  totalTimeSpent: number;
  totalAnswers: number;
  totalCorrectAnswers: number;
  decksStudied: number;
  frequentlyIncorrectCount: number;
  createdAt: string;
}

export interface FrequentlyIncorrectCard {
  id: string;
  front: string;
  back: string;
  deckTitle: string;
  subject: string;
  timesIncorrect: number;
  timesCorrect: number;
  timesSeen: number;
  status: string;
}

export interface StudentDetail {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    level: number;
    currentXP: number;
    nextLevelXP: number;
    totalXP: number;
    streak: number;
    longestStreak: number;
    totalTimeSpent: number;
    totalCardsLearned: number;
    totalDecksCompleted: number;
    totalCorrectAnswers: number;
    totalAnswers: number;
    createdAt: string;
  };
  cardStats: {
    statusCounts: { new: number; learning: number; reviewing: number; mastered: number };
    inStudy: number;
    mastered: number;
  };
  weeklyProgress: Array<{
    date: string;
    cardsStudied: number;
    cardsLearned: number;
    timeSpentMinutes: number;
    xpEarned: number;
  }>;
  frequentlyIncorrectCards: FrequentlyIncorrectCard[];
  decksStudied: Array<{ id: string; title: string; subjectId: string; subjectName: string }>;
  subjectBreakdown: Array<{ subject: string; sessionsCompleted: number; correctRate: number }>;
}

export interface ProgressReport {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  subjectBreakdown: Array<{ subject: string; performance: string; notes: string }>;
  overallGrade: string;
  studyHabits: string;
  motivationalNote: string;
  generatedAt: string;
  cached: boolean;
  requestedByName?: string;
}

export interface TeacherForAssignment {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  studentCount: number;
}

export interface StudentAssignment {
  id: string;
  teacherId: string;
  studentId: string;
  teacherName: string;
  studentName: string;
  studentEmail: string;
  studentLevel: number;
  studentAvatar?: string;
  createdAt: string;
}
