import { create } from 'zustand';

/**
 * UI State Store
 * Centralizes all UI-related state (views, modals, mobile menu)
 * Replaces scattered useState hooks from App.tsx
 */

export type ViewType =
  | 'dashboard'
  | 'decks'
  | 'study'
  | 'sessions'
  | 'session-player'
  | 'achievements'
  | 'leaderboard'
  | 'settings'
  | 'moderation';

export type AuthMode = 'login' | 'register';

export interface LoginPromptContext {
  title: string;
  message: string;
}

interface UIStore {
  // View state
  currentView: ViewType;
  isMobileMenuOpen: boolean;

  // Auth modals
  showAuthPage: boolean;
  authMode: AuthMode;
  showLoginPrompt: boolean;
  loginPromptContext: LoginPromptContext;

  // Session modals
  showCreateSessionModal: boolean;
  selectedDeckForSession: string | null; // deck ID
  activeSessionId: string | null;
  activeDeckId: string | null;

  // Actions - View management
  setCurrentView: (view: ViewType) => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Actions - Auth modals
  setShowAuthPage: (show: boolean) => void;
  setAuthMode: (mode: AuthMode) => void;
  setShowLoginPrompt: (show: boolean, context?: LoginPromptContext) => void;

  // Actions - Session modals
  setShowCreateSessionModal: (show: boolean, deckId?: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveDeckId: (id: string | null) => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  // View state
  currentView: 'dashboard' as ViewType,
  isMobileMenuOpen: false,

  // Auth modals
  showAuthPage: false,
  authMode: 'login' as AuthMode,
  showLoginPrompt: false,
  loginPromptContext: { title: '', message: '' },

  // Session modals
  showCreateSessionModal: false,
  selectedDeckForSession: null,
  activeSessionId: null,
  activeDeckId: null,
};

export const useUIStore = create<UIStore>(set => ({
  ...initialState,

  // View management
  setCurrentView: view => set({ currentView: view }),
  setMobileMenuOpen: open => set({ isMobileMenuOpen: open }),

  // Auth modals
  setShowAuthPage: show => set({ showAuthPage: show }),
  setAuthMode: mode => set({ authMode: mode }),
  setShowLoginPrompt: (show, context) =>
    set({
      showLoginPrompt: show,
      loginPromptContext: context || { title: '', message: '' },
    }),

  // Session modals
  setShowCreateSessionModal: (show, deckId) =>
    set({
      showCreateSessionModal: show,
      selectedDeckForSession: deckId || null,
    }),
  setActiveSessionId: id => set({ activeSessionId: id }),
  setActiveDeckId: id => set({ activeDeckId: id }),

  // Reset to initial state
  reset: () => set(initialState),
}));
