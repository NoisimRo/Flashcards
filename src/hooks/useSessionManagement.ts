import { useCallback } from 'react';
import { useStudySessionsStore } from '../store/studySessionsStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../store/AuthContext';
import { shouldPromptLogin } from '../utils/guestMode';
import type { Deck } from '../types';

/**
 * Custom hook for session management operations
 * Handles session creation, resumption, and completion
 */
export function useSessionManagement() {
  const { isAuthenticated, refreshSession } = useAuth();
  const { createGuestSession, fetchActiveSessions } = useStudySessionsStore();
  const { setShowCreateSessionModal, setActiveSessionId, setCurrentView, setShowLoginPrompt } =
    useUIStore();

  const isGuest = !isAuthenticated;

  const handleStartSession = useCallback(
    (deck: Deck) => {
      // For guests: open create session modal directly (allow studying any public deck)
      // The modal and backend will handle guest session creation
      setShowCreateSessionModal(true, {
        id: deck.id,
        title: deck.title,
        totalCards: deck.totalCards,
      });
    },
    [setShowCreateSessionModal]
  );

  const handleCreateSession = useCallback(
    (deck: Deck) => {
      setShowCreateSessionModal(true, {
        id: deck.id,
        title: deck.title,
        totalCards: deck.totalCards,
      });
    },
    [setShowCreateSessionModal]
  );

  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setShowCreateSessionModal(false);
      setActiveSessionId(sessionId);
      setCurrentView('session-player');
    },
    [setShowCreateSessionModal, setActiveSessionId, setCurrentView]
  );

  const handleResumeSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setCurrentView('session-player');
    },
    [setActiveSessionId, setCurrentView]
  );

  const handleCloseSession = useCallback(async () => {
    setActiveSessionId(null);

    // For guests, navigate to dashboard instead of sessions list
    // (sessions list would be empty/confusing for guests)
    if (isGuest) {
      setCurrentView('dashboard');
      return;
    }

    setCurrentView('sessions');

    // Refresh user data and decks after session completes
    if (isAuthenticated) {
      await refreshSession();
      await fetchActiveSessions({ status: 'active' });
    }
  }, [
    setActiveSessionId,
    setCurrentView,
    isAuthenticated,
    isGuest,
    refreshSession,
    fetchActiveSessions,
  ]);

  return {
    handleStartSession,
    handleCreateSession,
    handleSessionCreated,
    handleResumeSession,
    handleCloseSession,
  };
}
