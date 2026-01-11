import { useCallback } from 'react';
import { useStudySessionsStore } from '../store/studySessionsStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../store/AuthContext';
import { shouldPromptLogin } from '../utils/guestMode';
import type { Deck } from '../../types';

/**
 * Custom hook for session management operations
 * Handles session creation, resumption, and completion
 */
export function useSessionManagement() {
  const { isAuthenticated, refreshSession } = useAuth();
  const { createGuestSession, fetchActiveSessions } = useStudySessionsStore();
  const {
    setShowCreateSessionModal,
    setActiveSessionId,
    setCurrentView,
    setShowLoginPrompt,
  } = useUIStore();

  const isGuest = !isAuthenticated;

  const handleStartSession = useCallback(
    (deck: Deck) => {
      // Visitor mode: use demo session (deck id 'd1')
      if (isGuest && deck.id === 'd1') {
        // Create guest session via store
        createGuestSession(deck.id);
        setActiveSessionId(deck.id);
        setCurrentView('session-player');
        return;
      }

      // Guest trying to create session for non-demo deck
      if (isGuest) {
        const prompt = shouldPromptLogin('create-session', true);
        if (prompt) {
          setShowLoginPrompt(true, prompt);
        }
        return;
      }

      // Authenticated: open create session modal
      setShowCreateSessionModal(true, deck.id);
    },
    [isGuest, createGuestSession, setActiveSessionId, setCurrentView, setShowCreateSessionModal, setShowLoginPrompt]
  );

  const handleCreateSession = useCallback(
    (deck: Deck) => {
      if (isGuest) {
        const prompt = shouldPromptLogin('create-session', true);
        if (prompt) {
          setShowLoginPrompt(true, prompt);
        }
        return;
      }

      setShowCreateSessionModal(true, deck.id);
    },
    [isGuest, setShowCreateSessionModal, setShowLoginPrompt]
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
    setCurrentView('sessions');

    // Refresh user data and decks after session completes
    if (isAuthenticated) {
      await refreshSession();
      await fetchActiveSessions({ status: 'active' });
    }
  }, [setActiveSessionId, setCurrentView, isAuthenticated, refreshSession, fetchActiveSessions]);

  return {
    handleStartSession,
    handleCreateSession,
    handleSessionCreated,
    handleResumeSession,
    handleCloseSession,
  };
}
