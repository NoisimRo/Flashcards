import React from 'react';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useDecksStore } from '../store/decksStore';
import { useAuth } from '../store/AuthContext';
import { useDecksManagement } from '../hooks/useDecksManagement';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { adaptUserFromAPI } from '../adapters/userAdapter';
import { adaptDeckFromAPI } from '../adapters/deckAdapter';
import { GUEST_USER } from '../utils/guestMode';
import { MOCK_ACHIEVEMENTS, VISITOR_ACHIEVEMENTS } from '../../constants';

// Component imports
import Dashboard from '../../components/Dashboard';
import DeckList from '../../components/DeckList';
import StudySession from '../../components/StudySession';
import GlobalDecks from '../../components/GlobalDecks';
import Achievements from '../../components/Achievements';
import Leaderboard from '../../components/Leaderboard';
import Settings from '../../components/Settings';
import ActiveSessionsList from '../components/sessions/ActiveSessionsList';
import { StudySessionContainer } from '../components/study-session/StudySessionContainer';
import { ModerationDashboard } from '../components/moderation/ModerationDashboard';

/**
 * View Router Component
 * Handles routing between different views based on currentView state
 * Replaces the large switch statement from App.tsx
 */
export const ViewRouter: React.FC = () => {
  const { currentView, activeSessionId, activeDeckId, setCurrentView } = useUIStore();
  const { decks: apiDecks, isLoading: isLoadingDecks } = useDecksStore();
  const { user: authUser, isAuthenticated } = useAuth();
  const decksManagement = useDecksManagement();
  const sessionManagement = useSessionManagement();
  const { leaderboardEntries } = useLeaderboard();

  const user = isAuthenticated && authUser ? adaptUserFromAPI(authUser) : GUEST_USER;
  const isGuest = !isAuthenticated;

  // Adapt decks from API format to component format
  const decks = React.useMemo(() => apiDecks.map(adaptDeckFromAPI), [apiDecks]);

  // Find active deck if specified
  const activeDeck = activeDeckId ? decks.find(d => d.id === activeDeckId) : null;

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
          isGuest={isGuest}
          onLoginPrompt={(title, message) => {
            /* Already handled in hooks */
          }}
        />
      );

    case 'study':
      return activeDeck ? (
        <StudySession
          deck={activeDeck}
          user={user}
          onFinish={(score, totalCards, clearSession) => {
            // Handle finish logic
            setCurrentView('decks');
          }}
          onSaveProgress={(deckId, data) => {
            // Save progress logic
          }}
          onUpdateUserXP={deltaXP => {
            // Update XP logic
          }}
          onBack={() => setCurrentView('decks')}
          onEditCard={card => decksManagement.handleEditCard(activeDeck.id, card)}
          onDeleteCard={cardId => decksManagement.handleDeleteCard(activeDeck.id, cardId)}
        />
      ) : (
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
        />
      );

    case 'achievements':
      return (
        <Achievements
          achievements={isGuest ? VISITOR_ACHIEVEMENTS : MOCK_ACHIEVEMENTS}
          user={user}
        />
      );

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
