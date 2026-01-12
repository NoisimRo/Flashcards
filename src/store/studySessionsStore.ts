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
  isDirty: boolean;
  sessionStartTime: number;
  baselineDuration: number;

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
  enableAutoSave: (intervalMs?: number) => void;
  disableAutoSave: () => void;
  syncProgress: () => Promise<void>;
  getCurrentCard: () => any | null;
  setQuizOption: (option: number | null) => void;
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

// Helper to get or create guest token
const getOrCreateGuestToken = (): string => {
  let token = localStorage.getItem('guest_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('guest_token', token);
  }
  return token;
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
  isDirty: false,
  sessionStartTime: Date.now(),
  baselineDuration: 0,

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

        // Restore session state from backend
        set({
          currentSession: session,
          currentCardIndex: session.currentCardIndex || 0,
          answers: session.answers || {},
          streak: session.streak || 0,
          sessionXP: session.sessionXP || 0,
          isCardFlipped: false,
          hintRevealed: false,
          selectedQuizOption: null,
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
          isLoading: false,
        });
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
    console.log('🔄 [Store] updateSessionProgress called', { id, progress });
    try {
      console.log('📡 [Store] Sending PUT request to API...');
      const response = await sessionsApi.updateStudySession(id, progress);
      console.log('✅ [Store] API response received:', response);
      if (response.success && response.data) {
        set(state => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, ...response.data }
            : null,
          activeSessions: state.activeSessions.map(s =>
            s.id === id ? { ...s, ...response.data } : s
          ),
        }));
      } else {
        console.error('❌ [Store] API response not successful:', response.error);
      }
    } catch (error) {
      console.error('❌ [Store] Error updating session progress:', error);
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
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
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
          isDirty: false,
          sessionStartTime: Date.now(),
          baselineDuration: session.durationSeconds || 0,
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

    const difficulty = (state.currentSession?.deck?.difficulty || 'A2') as Difficulty;
    const xpEarned = calculateXP(isCorrect, state.streak, difficulty);

    set({
      answers: { ...state.answers, [cardId]: isCorrect ? 'correct' : 'incorrect' },
      streak: isCorrect ? state.streak + 1 : 0,
      sessionXP: state.sessionXP + xpEarned,
      isDirty: true,
    });

    // Auto-sync after answering
    state.syncProgress();
  },

  // Skip card
  skipCard: (cardId: string) => {
    const state = get();
    set({
      answers: { ...state.answers, [cardId]: 'skipped' },
      isDirty: true,
    });
    state.syncProgress();
  },

  // Move to next card
  nextCard: () => {
    const state = get();
    const totalCards = state.currentSession?.cards?.length || 0;

    set({
      currentCardIndex: Math.min(state.currentCardIndex + 1, totalCards - 1),
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
    });
  },

  // Undo last answer
  undoLastAnswer: () => {
    const state = get();
    if (state.currentCardIndex === 0) return;

    const previousCard = state.currentSession?.cards?.[state.currentCardIndex - 1];
    if (!previousCard) return;

    const updatedAnswers = { ...state.answers };
    delete updatedAnswers[previousCard.id];

    set({
      currentCardIndex: state.currentCardIndex - 1,
      answers: updatedAnswers,
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      isDirty: true,
    });
  },

  // Shuffle cards (Fisher-Yates algorithm)
  shuffleCards: () => {
    const state = get();
    if (!state.currentSession?.cards) return;

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
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      streak: 0,
      sessionXP: 0,
      isDirty: true,
    });
  },

  // Set quiz option
  setQuizOption: (option: number | null) => {
    set({ selectedQuizOption: option });
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

    const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);

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
            durationSeconds: state.baselineDuration + elapsedSeconds,
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
          durationSeconds: state.baselineDuration + elapsedSeconds,
        });

        set({ isDirty: false });
      }
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  },

  // Reveal hint (costs 20 XP)
  revealHint: () => {
    const state = get();
    set({
      hintRevealed: true,
      sessionXP: Math.max(0, state.sessionXP - 20), // Deduct 20 XP, minimum 0
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
      isDirty: false,
      sessionStartTime: Date.now(),
      baselineDuration: 0,
    });
  },
}));
