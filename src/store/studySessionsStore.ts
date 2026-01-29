import { create } from 'zustand';
import type { StudySession, StudySessionWithData } from '../types/models';
import type {
  CreateStudySessionRequest,
  GetStudySessionsParams,
  UpdateStudySessionRequest,
  CompleteStudySessionRequest,
} from '../types/api';
import * as sessionsApi from '../api/studySessions';

type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface StudySessionsStore {
  // State
  activeSessions: StudySession[];
  currentSession: StudySessionWithData | null;
  isLoading: boolean;
  error: string | null;

  // NEW - Session UI State
  currentCardIndex: number;
  answers: Record<string, 'correct' | 'incorrect' | 'skipped'>;
  streak: number;
  sessionXP: number;
  isCardFlipped: boolean;
  hintRevealed: boolean;
  selectedQuizOption: number | null;
  selectedMultipleOptions: number[]; // For multiple-answer cards
  frontAction: 'know' | 'show' | null; // Track what user clicked on Standard card front
  isDirty: boolean;
  sessionStartTime: number;
  baselineDuration: number;
  currentCardStartTime: number; // Track when current card was shown
  perCardTimes: Record<string, number>; // Track accumulated time per card ID
  totalActiveSeconds: number; // Sum of all per-card times
  revealedHintCardIds: Record<string, boolean>; // Track which cards have had hints revealed (to avoid double XP charge)

  // Guest mode state
  guestToken: string | null;
  isGuestMode: boolean;

  // Actions
  fetchActiveSessions: (params?: GetStudySessionsParams) => Promise<void>;
  createSession: (request: CreateStudySessionRequest) => Promise<StudySessionWithData | null>;
  loadSession: (id: string) => Promise<void>;
  updateSessionProgress: (id: string, progress: UpdateStudySessionRequest) => Promise<void>;
  completeSession: (id: string, results: CompleteStudySessionRequest) => Promise<any>;
  abandonSession: (id: string) => Promise<void>;
  clearCurrentSession: () => void;
  clearError: () => void;

  // Guest mode actions
  createGuestSession: (deckId: string) => Promise<void>;
  loadGuestSession: (sessionId: string) => Promise<void>;

  // NEW - Session Actions
  flipCard: () => void;
  answerCard: (cardId: string, isCorrect: boolean) => void;
  skipCard: (cardId: string) => void;
  nextCard: () => void;
  undoLastAnswer: () => void;
  shuffleCards: () => void;
  restartSession: () => void;
  setFrontAction: (action: 'know' | 'show' | null) => void;
  enableAutoSave: (intervalMs?: number) => void;
  disableAutoSave: () => void;
  syncProgress: () => Promise<void>;
  getCurrentCard: () => any | null;
  setQuizOption: (option: number | null) => void;
  toggleMultipleOption: (index: number) => void;
  clearMultipleOptions: () => void;
  revealHint: () => void;
  resetSessionState: () => void;
}

// XP Calculation Helper
const calculateXP = (isCorrect: boolean, streak: number, difficulty: Difficulty): number => {
  const baseXP: Record<Difficulty, number> = { A1: 5, A2: 8, B1: 12, B2: 15, C1: 20, C2: 25 };
  if (!isCorrect) return 0;
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.5); // Max 2.5x
  return Math.floor((baseXP[difficulty] || 10) * streakMultiplier);
};

// Auto-save timer reference
let autoSaveTimer: NodeJS.Timeout | null = null;

// Module-level callback for user data updates from PUT responses.
// Components (e.g., StudySessionContainer) set this to wire backend user updates
// to the auth context's updateUser function.
type UserUpdateData = {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
};
let onUserUpdateCallback: ((data: UserUpdateData) => void) | null = null;

export function setOnUserUpdateCallback(cb: ((data: UserUpdateData) => void) | null) {
  onUserUpdateCallback = cb;
}

// Helper to get or create guest token
const getOrCreateGuestToken = (): string => {
  let token = localStorage.getItem('guest_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('guest_token', token);
  }
  return token;
};

// Helper function to record time spent on current card (Option B - count every viewing)
const recordCardTime = (state: StudySessionsStore) => {
  const currentCard = state.getCurrentCard();
  if (!currentCard)
    return { perCardTimes: state.perCardTimes, totalActiveSeconds: state.totalActiveSeconds };

  const now = Date.now();
  const timeOnCard = (now - state.currentCardStartTime) / 1000; // seconds

  // Cap at 5 minutes (300 seconds) per viewing to prevent idle inflation
  const cappedTime = Math.min(timeOnCard, 300);

  // Option B: Count every time card is shown (even re-visits)
  const previousTime = state.perCardTimes[currentCard.id] || 0;
  const newPerCardTimes = {
    ...state.perCardTimes,
    [currentCard.id]: previousTime + cappedTime,
  };

  const newTotalActiveSeconds = state.totalActiveSeconds + cappedTime;

  return { perCardTimes: newPerCardTimes, totalActiveSeconds: newTotalActiveSeconds };
};

export const useStudySessionsStore = create<StudySessionsStore>((set, get) => ({
  // Initial state
  activeSessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  // NEW - Session UI State (initial values)
  currentCardIndex: 0,
  answers: {},
  streak: 0,
  sessionXP: 0,
  isCardFlipped: false,
  hintRevealed: false,
  selectedQuizOption: null,
  selectedMultipleOptions: [],
  frontAction: null,
  isDirty: false,
  sessionStartTime: Date.now(),
  baselineDuration: 0,
  currentCardStartTime: Date.now(),
  perCardTimes: {},
  totalActiveSeconds: 0,
  revealedHintCardIds: {},

  // Guest mode state
  guestToken: null,
  isGuestMode: false,

  // Fetch active sessions
  fetchActiveSessions: async (params?: GetStudySessionsParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.getStudySessions(params);
      if (response.success && response.data) {
        set({ activeSessions: response.data, isLoading: false });
      } else {
        set({
          error: response.error?.message || 'Failed to fetch sessions',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Create session
  createSession: async (request: CreateStudySessionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.createStudySession(request);
      if (response.success && response.data) {
        const session = response.data.session;
        set(state => ({
          activeSessions: [...state.activeSessions, session],
          currentSession: session,
          isLoading: false,
        }));
        return session;
      } else {
        set({
          error: response.error?.message || 'Failed to create session',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  // Load session
  loadSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.getStudySession(id);
      if (response.success && response.data) {
        const session = response.data;
        const savedAnswers = session.answers || {};
        const cards = session.cards || [];

        // Compute smart card index:
        // 1. First unanswered card
        // 2. First skipped card (if all cards have some answer)
        // 3. Full reset if all cards are answered (correct/incorrect)
        let startCardIndex = 0;
        let resetAnswers = savedAnswers;

        const firstUnanswered = cards.findIndex((card: any) => savedAnswers[card.id] === undefined);

        if (firstUnanswered !== -1) {
          // Found an unanswered card - start there
          startCardIndex = firstUnanswered;
        } else {
          // All cards have some answer - check for skipped
          const firstSkipped = cards.findIndex((card: any) => savedAnswers[card.id] === 'skipped');

          if (firstSkipped !== -1) {
            // Found a skipped card - start there
            startCardIndex = firstSkipped;
          } else {
            // All cards answered (correct/incorrect) - full reset
            startCardIndex = 0;
            resetAnswers = {};
          }
        }

        // Always reset sessionXP and streak to 0 on session load/resume
        set({
          currentSession: session,
          currentCardIndex: startCardIndex,
          answers: resetAnswers,
          streak: 0,
          sessionXP: 0,
          isCardFlipped: false,
          hintRevealed: false,
          selectedQuizOption: null,
          selectedMultipleOptions: [],
          revealedHintCardIds: {},
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
          currentCardStartTime: Date.now(),
          perCardTimes: {},
          totalActiveSeconds: 0,
          isLoading: false,
        });

        // Sync the reset state to backend (sessionXP=0, streak=0, updated card index)
        const state = get();
        if (state.currentSession) {
          await state.updateSessionProgress(id, {
            currentCardIndex: startCardIndex,
            answers: resetAnswers,
            streak: 0,
            sessionXP: 0,
            durationSeconds: session.durationSeconds || 0,
          });
        }
      } else {
        set({
          error: response.error?.message || 'Failed to load session',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Update session progress
  updateSessionProgress: async (id: string, progress: UpdateStudySessionRequest) => {
    try {
      const response = await sessionsApi.updateStudySession(id, progress);
      if (response.success && response.data) {
        set(state => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, ...response.data }
            : null,
          activeSessions: state.activeSessions.map(s =>
            s.id === id ? { ...s, ...response.data } : s
          ),
        }));

        // If the backend returned updated user data (level, XP), notify via callback
        // so the auth context stays in sync with the database
        const userData = (response as any).user;
        if (userData && onUserUpdateCallback) {
          onUserUpdateCallback(userData);
        }
      }
    } catch (error) {
      console.error('Error updating session progress:', error);
    }
  },

  // Complete session
  completeSession: async (id: string, results: CompleteStudySessionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.completeStudySession(id, results);
      if (response.success && response.data) {
        set(state => ({
          activeSessions: state.activeSessions.filter(s => s.id !== id),
          currentSession: null,
          isLoading: false,
        }));
        // Return the complete response data (includes leveledUp, xpEarned, etc.)
        return response.data;
      } else {
        set({
          error: response.error?.message || 'Failed to complete session',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  // Abandon session
  abandonSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.abandonStudySession(id);
      if (response.success) {
        set(state => ({
          activeSessions: state.activeSessions.filter(s => s.id !== id),
          currentSession: state.currentSession?.id === id ? null : state.currentSession,
          isLoading: false,
        }));
      } else {
        set({
          error: response.error?.message || 'Failed to abandon session',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Clear current session
  clearCurrentSession: () => set({ currentSession: null }),

  // Clear error
  clearError: () => set({ error: null }),

  // Create guest session
  createGuestSession: async (deckId: string) => {
    set({ isLoading: true, error: null });
    try {
      const guestToken = getOrCreateGuestToken();

      const response = await fetch('/api/study-sessions/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          guestToken,
          selectionMethod: 'all',
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const session = data.data.session;

        set({
          currentSession: session,
          guestToken,
          isGuestMode: true,
          currentCardIndex: session.currentCardIndex || 0,
          answers: session.answers || {},
          streak: session.streak || 0,
          sessionXP: session.sessionXP || 0,
          isCardFlipped: false,
          hintRevealed: false,
          selectedQuizOption: null,
          selectedMultipleOptions: [],
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
          currentCardStartTime: Date.now(),
          perCardTimes: {},
          totalActiveSeconds: 0,
          isLoading: false,
        });

        // Enable auto-save for guest session
        get().enableAutoSave();
      } else {
        set({
          error: data.error?.message || 'Failed to create guest session',
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Create guest session error:', error);
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Load guest session
  loadGuestSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const guestToken = getOrCreateGuestToken();

      const response = await fetch(
        `/api/study-sessions/guest/${sessionId}?guestToken=${guestToken}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        const session = data.data;

        set({
          currentSession: session,
          guestToken,
          isGuestMode: true,
          currentCardIndex: session.currentCardIndex || 0,
          answers: session.answers || {},
          streak: session.streak || 0,
          sessionXP: session.sessionXP || 0,
          isCardFlipped: false,
          hintRevealed: false,
          selectedQuizOption: null,
          selectedMultipleOptions: [],
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
          currentCardStartTime: Date.now(),
          perCardTimes: {},
          totalActiveSeconds: 0,
          isLoading: false,
        });

        // Enable auto-save for guest session
        get().enableAutoSave();
      } else {
        set({
          error: data.error?.message || 'Failed to load guest session',
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Load guest session error:', error);
      set({ error: 'Network error', isLoading: false });
    }
  },

  // NEW - Session Actions

  // Get current card
  getCurrentCard: () => {
    const { currentSession, currentCardIndex } = get();
    if (!currentSession || !currentSession.cards) return null;
    return currentSession.cards[currentCardIndex] || null;
  },

  // Flip card
  flipCard: () => {
    set(state => ({ isCardFlipped: !state.isCardFlipped }));
  },

  // Answer card
  answerCard: (cardId: string, isCorrect: boolean) => {
    const state = get();
    const currentCard = state.getCurrentCard();
    if (!currentCard) return;

    // Record time spent on this card before answering
    const { perCardTimes, totalActiveSeconds } = recordCardTime(state);

    // Check if card was already answered
    const existingAnswer = state.answers[cardId];
    const wasAlreadyAnswered = existingAnswer === 'correct' || existingAnswer === 'incorrect';

    // CRITICAL FIX: Prevent XP double-counting
    // Only award XP and update streak if:
    // 1. Card was not answered before (existingAnswer is undefined)
    // 2. Card was only skipped (existingAnswer === 'skipped')
    const shouldAwardXP = !wasAlreadyAnswered;

    const difficulty = (state.currentSession?.deck?.difficulty || 'A2') as Difficulty;
    const xpEarned = shouldAwardXP ? calculateXP(isCorrect, state.streak, difficulty) : 0;

    set({
      answers: { ...state.answers, [cardId]: isCorrect ? 'correct' : 'incorrect' },
      streak: shouldAwardXP ? (isCorrect ? state.streak + 1 : 0) : state.streak,
      sessionXP: state.sessionXP + xpEarned,
      perCardTimes,
      totalActiveSeconds,
      isDirty: true,
    });

    // Auto-sync after answering
    state.syncProgress();
  },

  // Skip card
  skipCard: (cardId: string) => {
    const state = get();

    // Record time spent on this card before skipping
    const { perCardTimes, totalActiveSeconds } = recordCardTime(state);

    set({
      answers: { ...state.answers, [cardId]: 'skipped' },
      perCardTimes,
      totalActiveSeconds,
      isDirty: true,
    });
    state.syncProgress();
  },

  // Move to next card
  nextCard: () => {
    const state = get();
    const totalCards = state.currentSession?.cards?.length || 0;

    // Record time on current card before moving to next
    const { perCardTimes, totalActiveSeconds } = recordCardTime(state);

    // Check if the next card already had its hint revealed
    const nextIndex = Math.min(state.currentCardIndex + 1, totalCards - 1);
    const nextCardId = state.currentSession?.cards?.[nextIndex]?.id;
    const nextHintRevealed = nextCardId ? !!state.revealedHintCardIds[nextCardId] : false;

    set({
      currentCardIndex: nextIndex,
      isCardFlipped: false,
      hintRevealed: nextHintRevealed,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      frontAction: null, // Reset front action for next card
      currentCardStartTime: Date.now(), // Start timing the next card
      perCardTimes,
      totalActiveSeconds,
    });
  },

  // Undo last answer
  undoLastAnswer: () => {
    const state = get();
    if (state.currentCardIndex === 0) return;

    const previousCard = state.currentSession?.cards?.[state.currentCardIndex - 1];
    if (!previousCard) return;

    // Record time on current card before going back
    const { perCardTimes, totalActiveSeconds } = recordCardTime(state);

    // Check if the previous card already had its hint revealed
    const prevHintRevealed = !!state.revealedHintCardIds[previousCard.id];

    // CRITICAL FIX: Do NOT delete the answer - just go back
    // This preserves the pie chart progress while allowing navigation back
    // If the card was skipped, user can re-answer it
    // If it was correct/incorrect, the answer remains visible
    set({
      currentCardIndex: state.currentCardIndex - 1,
      isCardFlipped: false,
      hintRevealed: prevHintRevealed,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      frontAction: null,
      currentCardStartTime: Date.now(), // Start timing the previous card
      perCardTimes,
      totalActiveSeconds,
      isDirty: true,
    });
  },

  // Shuffle cards (Fisher-Yates algorithm) - resets XP and streak
  shuffleCards: () => {
    const state = get();
    if (!state.currentSession?.cards) return;

    // Record time on current card before shuffling
    const { totalActiveSeconds } = recordCardTime(state);

    const shuffledCards = [...state.currentSession.cards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }

    set({
      currentSession: state.currentSession
        ? { ...state.currentSession, cards: shuffledCards }
        : null,
      currentCardIndex: 0,
      answers: {}, // Clear all answers when shuffling
      streak: 0,
      sessionXP: 0,
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      frontAction: null,
      revealedHintCardIds: {},
      currentCardStartTime: Date.now(), // Start timing first card after shuffle
      perCardTimes: {}, // Reset per-card times for shuffled deck
      totalActiveSeconds, // KEEP accumulated time
      isDirty: true,
    });
  },

  // Restart session - resets XP and streak
  restartSession: () => {
    const state = get();
    if (!state.currentSession?.cards) return;

    // Record time on current card before restarting
    const { totalActiveSeconds } = recordCardTime(state);

    set({
      currentCardIndex: 0,
      answers: {}, // Clear all answers
      streak: 0,
      sessionXP: 0,
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      frontAction: null,
      revealedHintCardIds: {},
      currentCardStartTime: Date.now(), // Start timing first card
      perCardTimes: {}, // Reset per-card times for restart
      totalActiveSeconds, // KEEP accumulated time
      isDirty: true,
    });

    // Sync the reset to backend
    state.syncProgress();
  },

  // Set quiz option
  setQuizOption: (option: number | null) => {
    set({ selectedQuizOption: option });
  },

  // Toggle multiple option selection (for multiple-answer cards)
  toggleMultipleOption: (index: number) => {
    set(state => {
      const current = state.selectedMultipleOptions;
      if (current.includes(index)) {
        return { selectedMultipleOptions: current.filter(i => i !== index) };
      } else {
        return { selectedMultipleOptions: [...current, index] };
      }
    });
  },

  // Clear all multiple options
  clearMultipleOptions: () => {
    set({ selectedMultipleOptions: [] });
  },

  // Set front action for Standard cards
  setFrontAction: (action: 'know' | 'show' | null) => {
    set({ frontAction: action });
  },

  // Enable auto-save
  enableAutoSave: (intervalMs = 30000) => {
    if (autoSaveTimer) clearInterval(autoSaveTimer);

    autoSaveTimer = setInterval(() => {
      const state = get();
      if (state.isDirty && state.currentSession) {
        state.syncProgress();
      }
    }, intervalMs);
  },

  // Disable auto-save
  disableAutoSave: () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  },

  // Sync progress to backend
  syncProgress: async () => {
    const state = get();
    if (!state.currentSession) return;

    // CRITICAL FIX: Use totalActiveSeconds (accumulated per-card time) instead of elapsed wall-clock time
    // This prevents the 834-minute bug caused by idle browser tabs
    const totalDurationSeconds = Math.floor(state.baselineDuration + state.totalActiveSeconds);

    try {
      // Guest mode: use guest endpoint
      if (state.isGuestMode && state.guestToken) {
        const response = await fetch(`/api/study-sessions/guest/${state.currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestToken: state.guestToken,
            currentCardIndex: state.currentCardIndex,
            answers: state.answers,
            streak: state.streak,
            sessionXP: state.sessionXP,
            durationSeconds: totalDurationSeconds,
          }),
        });

        if (response.ok) {
          set({ isDirty: false });
        }
      } else {
        // Authenticated mode: use standard endpoint
        await state.updateSessionProgress(state.currentSession.id, {
          currentCardIndex: state.currentCardIndex,
          answers: state.answers,
          streak: state.streak,
          sessionXP: state.sessionXP,
          durationSeconds: totalDurationSeconds,
        });

        set({ isDirty: false });
      }
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  },

  // Reveal hint (costs 20 XP, only once per card)
  revealHint: () => {
    const state = get();
    const currentCard = state.getCurrentCard();
    if (!currentCard) return;

    const alreadyRevealed = state.revealedHintCardIds[currentCard.id];

    set({
      hintRevealed: true,
      // Only deduct XP on first reveal for this card
      sessionXP: alreadyRevealed ? state.sessionXP : Math.max(0, state.sessionXP - 20),
      revealedHintCardIds: { ...state.revealedHintCardIds, [currentCard.id]: true },
      isDirty: true,
    });
  },

  // Reset session state (for new session or restart)
  resetSessionState: () => {
    set({
      currentCardIndex: 0,
      answers: {},
      streak: 0,
      sessionXP: 0,
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      frontAction: null,
      revealedHintCardIds: {},
      isDirty: false,
      sessionStartTime: Date.now(),
      baselineDuration: 0,
      currentCardStartTime: Date.now(),
      perCardTimes: {},
      totalActiveSeconds: 0,
    });
  },
}));
