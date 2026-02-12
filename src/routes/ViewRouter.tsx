import React from 'react';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useDecksStore } from '../store/decksStore';
import { useAuth } from '../store/AuthContext';
import { useDecksManagement } from '../hooks/useDecksManagement';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { GUEST_USER } from '../utils/guestMode';
import type { User } from '../types';

// Component imports
import ActiveSessionsList from '../components/sessions/ActiveSessionsList';
import { StudySessionContainer } from '../components/study-session/StudySessionContainer';
import { ModerationDashboard } from '../components/moderation/ModerationDashboard';
// Refactored components
import { Achievements } from '../components/pages/Achievements/Achievements';
import { Dashboard } from '../components/pages/Dashboard/Dashboard';
import { DeckList } from '../components/pages/DeckList/DeckList';
import { GlobalDecks } from '../components/pages/GlobalDecks/GlobalDecks';
import { Leaderboard } from '../components/pages/Leaderboard/Leaderboard';
import { Settings } from '../components/pages/Settings/Settings';

/**
 * View Router Component
 * Handles routing between different views based on currentView state
 * Replaces the large switch statement from App.tsx
 */
export const ViewRouter: React.FC = () => {
  const { currentView, activeSessionId, setCurrentView } = useUIStore();
  const { decks: apiDecks, isLoading: isLoadingDecks, fetchDecks } = useDecksStore();
  const { user: authUser, isAuthenticated } = useAuth();
  const decksManagement = useDecksManagement();
  const sessionManagement = useSessionManagement();
  const { leaderboardEntries } = useLeaderboard();

  const user: User = isAuthenticated && authUser ? authUser : GUEST_USER;
  const isGuest = !isAuthenticated;
  const decks = apiDecks;

  // Loading state
  if (isLoadingDecks && decks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Se încarcă deck-urile...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate view
  switch (currentView) {
    case 'dashboard':
      return (
        <Dashboard
          user={user}
          decks={decks}
          onStartSession={sessionManagement.handleStartSession}
          onChangeView={setCurrentView}
          onResumeSession={sessionManagement.handleResumeSession}
        />
      );

    case 'decks':
      return (
        <DeckList
          decks={decks}
          onAddDeck={decksManagement.handleAddDeck}
          onEditDeck={decksManagement.handleEditDeck}
          onDeleteDeck={decksManagement.handleDeleteDeck}
          onStartSession={sessionManagement.handleStartSession}
          onResetDeck={decksManagement.handleResetDeck}
          onRefreshDecks={() => fetchDecks({ ownedOnly: true })}
          isGuest={isGuest}
          onLoginPrompt={(title, message) => {
            useUIStore.getState().setShowLoginPrompt(true, { title, message });
          }}
        />
      );

    case 'study':
      return (
        <GlobalDecks
          onStartSession={sessionManagement.handleStartSession}
          onImportDeck={decksManagement.handleAddDeck}
        />
      );

    case 'sessions':
      return (
        <ActiveSessionsList
          onResumeSession={sessionManagement.handleResumeSession}
          decks={decks}
          onChangeView={setCurrentView}
          onCreateDeck={() => setCurrentView('decks')}
          isGuest={isGuest}
        />
      );

    case 'session-player':
      return activeSessionId ? (
        <StudySessionContainer
          sessionId={activeSessionId}
          onFinish={sessionManagement.handleCloseSession}
          onBack={sessionManagement.handleCloseSession}
        />
      ) : (
        <ActiveSessionsList
          onResumeSession={sessionManagement.handleResumeSession}
          decks={decks}
          onChangeView={setCurrentView}
          onCreateDeck={() => setCurrentView('decks')}
          isGuest={isGuest}
        />
      );

    case 'achievements':
      return <Achievements user={user} />;

    case 'leaderboard':
      return (
        <Leaderboard
          entries={leaderboardEntries}
          currentUser={user}
          onRegisterClick={() => {
            /* Already handled via useAuthActions */
          }}
        />
      );

    case 'settings':
      return (
        <Settings
          user={user}
          onSave={() => {
            /* Save settings logic */
          }}
          onLogout={
            isGuest
              ? undefined
              : async () => {
                  /* Logout handled via useAuthActions */
                }
          }
          isGuest={isGuest}
          onLogin={() => {
            /* Login handled via useAuthActions */
          }}
        />
      );

    case 'moderation':
      // Only admin and teacher can access moderation
      if (user.role === 'admin' || user.role === 'teacher') {
        return <ModerationDashboard />;
      }
      // Redirect to dashboard if user doesn't have permission
      return (
        <Dashboard
          user={user}
          decks={decks}
          onStartSession={sessionManagement.handleStartSession}
          onChangeView={setCurrentView}
        />
      );

    default:
      return (
        <Dashboard
          user={user}
          decks={decks}
          onStartSession={sessionManagement.handleStartSession}
          onChangeView={setCurrentView}
        />
      );
  }
};
