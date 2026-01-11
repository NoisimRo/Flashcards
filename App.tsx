import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { ToastProvider } from './src/components/ui/Toast';
import AuthPage from './src/components/auth/AuthPage';
import LoginPromptModal from './src/components/auth/LoginPromptModal';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DeckList from './components/DeckList';
import StudySession from './components/StudySession';
import GlobalDecks from './components/GlobalDecks';
import Achievements from './components/Achievements';
import Leaderboard from './components/Leaderboard';
import Settings from './components/Settings';
import { ModerationDashboard } from './src/components/moderation/ModerationDashboard';
// New session components
import CreateSessionModal from './src/components/sessions/CreateSessionModal';
import ActiveSessionsList from './src/components/sessions/ActiveSessionsList';
import StudySessionPlayer from './src/components/sessions/StudySessionPlayer';
import {
  MOCK_DECKS,
  VISITOR_DECKS,
  MOCK_ACHIEVEMENTS,
  VISITOR_ACHIEVEMENTS,
  LEADERBOARD_DATA,
} from './constants';
import { Deck, Card, SessionData, User } from './types';
import { Menu, X, Loader2 } from 'lucide-react';
import * as decksApi from './src/api/decks';
import * as usersApi from './src/api/users';
import { getSubjectId, getSubjectDisplayName } from './src/constants/subjects';
import type { LeaderboardEntry } from './src/api/users';

// Guest user for freemium mode
const GUEST_USER = {
  id: 'guest',
  name: 'Vizitator',
  level: 1,
  currentXP: 0,
  nextLevelXP: 100,
  totalXP: 0,
  streak: 0,
  longestStreak: 0,
  totalTimeSpent: 0,
  totalCardsLearned: 0,
  totalDecksCompleted: 0,
  totalCorrectAnswers: 0,
  totalAnswers: 0,
  email: undefined,
  role: 'student' as const,
  avatar: undefined,
  preferences: undefined,
};

// Adapter to convert API User to local User format
function adaptUserFromAPI(apiUser: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  level?: number;
  currentXP?: number;
  nextLevelXP?: number;
  totalXP?: number;
  streak?: number;
  longestStreak?: number;
  totalTimeSpent?: number;
  totalCardsLearned?: number;
  totalDecksCompleted?: number;
  totalCorrectAnswers?: number;
  totalAnswers?: number;
  preferences?: {
    dailyGoal?: number;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
}): User {
  // Ensure role is a valid type
  const validRole =
    apiUser.role === 'admin' || apiUser.role === 'teacher' || apiUser.role === 'student'
      ? apiUser.role
      : ('student' as const);

  // Ensure theme is a valid type
  const validTheme =
    apiUser.preferences?.theme === 'light' || apiUser.preferences?.theme === 'dark'
      ? apiUser.preferences.theme
      : undefined;

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: validRole,
    avatar: apiUser.avatar,
    // Gamification
    level: apiUser.level ?? 1,
    currentXP: apiUser.currentXP ?? 0,
    nextLevelXP: apiUser.nextLevelXP ?? 100,
    totalXP: apiUser.totalXP ?? 0,
    // Stats
    streak: apiUser.streak ?? 0,
    longestStreak: apiUser.longestStreak ?? 0,
    totalTimeSpent: apiUser.totalTimeSpent ?? 0,
    totalCardsLearned: apiUser.totalCardsLearned ?? 0,
    totalDecksCompleted: apiUser.totalDecksCompleted ?? 0,
    totalCorrectAnswers: apiUser.totalCorrectAnswers ?? 0,
    totalAnswers: apiUser.totalAnswers ?? 0,
    // Preferences
    preferences: apiUser.preferences
      ? {
          ...apiUser.preferences,
          theme: validTheme,
        }
      : undefined,
  };
}

// Adapter to convert API Deck to local Deck format
function adaptDeckFromAPI(apiDeck: {
  id: string;
  title: string;
  subject?: string;
  subjectName?: string;
  topic?: string;
  difficulty?: string;
  totalCards?: number;
  masteredCards?: number;
  lastStudied?: string;
  ownerId?: string;
  isPublic?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  cards?: Array<{
    id: string;
    front: string;
    back: string;
    context?: string;
    type?: string;
    options?: string[];
    correctOptionIndex?: number;
    status?: string;
  }>;
}): Deck & {
  ownerId: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: apiDeck.id,
    title: apiDeck.title,
    subject: apiDeck.subjectName || getSubjectDisplayName(apiDeck.subject || '') || 'Limba Română',
    topic: apiDeck.topic || '',
    difficulty: (apiDeck.difficulty as Deck['difficulty']) || 'A2',
    cards: (apiDeck.cards || []).map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      context: card.context,
      type: (card.type as Card['type']) || 'standard',
      options: card.options,
      correctOptionIndex: card.correctOptionIndex,
      status: (card.status as Card['status']) || 'new',
    })),
    totalCards: apiDeck.totalCards || apiDeck.cards?.length || 0,
    masteredCards: apiDeck.masteredCards || 0,
    lastStudied: apiDeck.lastStudied,
    sessionData: undefined,
    // New required fields for session components
    ownerId: apiDeck.ownerId || 'unknown',
    isPublic: apiDeck.isPublic ?? false,
    tags: apiDeck.tags || [],
    createdAt: apiDeck.createdAt || new Date().toISOString(),
    updatedAt: apiDeck.updatedAt || new Date().toISOString(),
  };
}

// Main app content
function AppContent() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user: authUser,
    logout,
    refreshSession,
  } = useAuth();

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [decks, setDecks] = useState<Deck[]>(VISITOR_DECKS); // Start with visitor decks (demo only)
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] =
    useState<LeaderboardEntry[]>(LEADERBOARD_DATA);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Session management states
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [selectedDeckForSession, setSelectedDeckForSession] = useState<Deck | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auth modal states
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptContext, setLoginPromptContext] = useState({ title: '', message: '' });

  // Use authenticated user or guest user
  const user = isAuthenticated && authUser ? adaptUserFromAPI(authUser) : GUEST_USER;
  const isGuest = !isAuthenticated;

  // Fetch decks and leaderboard
  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchDecks();
      setShowAuthPage(false);
    } else {
      // Reset to visitor demo deck only for guests
      setDecks(VISITOR_DECKS);
    }
    // Fetch leaderboard for everyone (visitors and authenticated users)
    fetchLeaderboard();
  }, [isAuthenticated, authUser]);

  // Listen for token expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      setShowAuthPage(true);
      setCurrentView('dashboard');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const response = await decksApi.getDecks({ ownedOnly: true });
      if (response.success && response.data) {
        const adaptedDecks = response.data.map(adaptDeckFromAPI);
        // Only show user's own decks (no mock decks fallback)
        setDecks(adaptedDecks);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
      // On error, show empty array instead of mock decks
      setDecks([]);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const response = await usersApi.getGlobalLeaderboard(100);
      if (response.success && response.data) {
        setLeaderboardEntries(response.data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Keep using mock data on error
      setLeaderboardEntries(LEADERBOARD_DATA);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Show login prompt with custom message
  const promptLogin = (title: string, message: string) => {
    setLoginPromptContext({ title, message });
    setShowLoginPrompt(true);
  };

  // --- ACTIONS ---

  const handleStartSession = (deck: Deck) => {
    // Use new session architecture
    handleCreateSession(deck);
  };

  const handleResetDeck = (deckId: string) => {
    if (isGuest) {
      promptLogin(
        'Salvează progresul',
        'Creează un cont pentru a putea reseta și salva progresul deck-urilor tale.'
      );
      return;
    }

    if (confirm('Ești sigur că vrei să resetezi progresul pentru acest deck?')) {
      setDecks(prevDecks =>
        prevDecks.map(d => {
          if (d.id === deckId) {
            return { ...d, masteredCards: 0, sessionData: undefined };
          }
          return d;
        })
      );
    }
  };

  const handleSaveProgress = useCallback((deckId: string, data: SessionData) => {
    // For guests, we still update local state but it won't persist
    setDecks(prevDecks =>
      prevDecks.map(d => {
        if (d.id === deckId) {
          return { ...d, sessionData: data };
        }
        return d;
      })
    );
    setActiveDeck(prev => (prev && prev.id === deckId ? { ...prev, sessionData: data } : prev));
  }, []);

  const handleFinishSession = (score: number, totalCards: number, clearSession: boolean = true) => {
    if (activeDeck) {
      const updatedDecks = decks.map(d => {
        if (d.id === activeDeck.id) {
          return {
            ...d,
            masteredCards: score,
            lastStudied: new Date().toISOString(),
            sessionData: clearSession ? undefined : d.sessionData,
          };
        }
        return d;
      });
      setDecks(updatedDecks);
    }

    setActiveDeck(null);
    setCurrentView('decks'); // Return to decks list instead of dashboard

    // Prompt guest to save progress after finishing a session
    if (isGuest && score > 0) {
      setTimeout(() => {
        promptLogin(
          'Bravo! Vrei să salvezi progresul?',
          `Ai răspuns corect la ${score} carduri! Creează un cont pentru a nu pierde acest progres.`
        );
      }, 500);
    }
  };

  const handleUpdateUserXP = async (deltaXP: number) => {
    if (isGuest) return; // Don't update XP for guests
    if (!authUser) return;

    try {
      const response = await usersApi.updateUserXP(authUser.id, deltaXP);
      if (response.success && response.data) {
        // Refresh the user session to get updated XP
        await refreshSession();
      }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };

  const handleAddDeck = async (newDeck: Deck) => {
    if (isGuest) {
      // Allow adding deck locally but prompt to save
      // Prepend new deck to show it first
      setDecks(prev => [newDeck, ...prev]);
      promptLogin(
        'Salvează deck-ul creat',
        'Creează un cont pentru a salva permanent deck-urile tale și a le accesa de pe orice dispozitiv.'
      );
      return;
    }

    try {
      const response = await decksApi.createDeck({
        title: newDeck.title,
        subject: getSubjectId(newDeck.subject), // Convert display name to ID
        topic: newDeck.topic,
        difficulty: newDeck.difficulty,
        cards: newDeck.cards.map(c => ({
          front: c.front,
          back: c.back,
          context: c.context,
          type: c.type,
          options: c.options,
          correctOptionIndex: c.correctOptionIndex,
        })),
      });

      if (response.success && response.data) {
        const adaptedDeck = adaptDeckFromAPI(response.data);
        // Prepend new deck to show it first
        setDecks(prev => [adaptedDeck, ...prev]);
      }
    } catch (error) {
      console.error('Error creating deck:', error);
      // Prepend new deck to show it first
      setDecks(prev => [newDeck, ...prev]);
    }
  };

  const handleEditDeck = async (updatedDeck: Deck) => {
    if (isGuest) {
      setDecks(decks.map(d => (d.id === updatedDeck.id ? updatedDeck : d)));
      return;
    }

    try {
      // Update deck metadata
      await decksApi.updateDeck(updatedDeck.id, {
        title: updatedDeck.title,
        subject: getSubjectId(updatedDeck.subject), // Convert display name to ID
        topic: updatedDeck.topic,
        difficulty: updatedDeck.difficulty,
      });

      // Check if there are cards with temporary IDs (AI-generated or local)
      const cardsToSave = updatedDeck.cards.filter(
        card => card.id.startsWith('ai-') || card.id.startsWith('temp-')
      );

      if (cardsToSave.length > 0) {
        console.log(`Saving ${cardsToSave.length} cards to backend...`);

        // Add each new card to backend
        for (const card of cardsToSave) {
          try {
            await decksApi.addCard(updatedDeck.id, {
              front: card.front,
              back: card.back,
              context: card.context,
              type: card.type,
              options: card.options,
              correctOptionIndex: card.correctOptionIndex,
            });
          } catch (cardError) {
            console.error('Error adding card:', cardError);
          }
        }

        // Refresh deck from backend to get correct IDs
        console.log('Refreshing deck from backend...');
        const response = await decksApi.getDeck(updatedDeck.id);
        if (response.success && response.data) {
          const refreshedDeck = adaptDeckFromAPI(response.data);
          console.log(`Deck refreshed with ${refreshedDeck.cards.length} cards`);
          setDecks(decks.map(d => (d.id === updatedDeck.id ? refreshedDeck : d)));
          return;
        }
      }
    } catch (error) {
      console.error('Error updating deck:', error);
    }
    setDecks(decks.map(d => (d.id === updatedDeck.id ? updatedDeck : d)));
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (confirm('Ești sigur că vrei să ștergi acest deck?')) {
      if (!isGuest) {
        try {
          await decksApi.deleteDeck(deckId);
        } catch (error) {
          console.error('Error deleting deck:', error);
        }
      }
      setDecks(decks.filter(d => d.id !== deckId));
    }
  };

  const handleEditCard = (deckId: string, updatedCard: Card) => {
    setDecks(prevDecks =>
      prevDecks.map(deck => {
        if (deck.id === deckId) {
          return {
            ...deck,
            cards: deck.cards.map(c => (c.id === updatedCard.id ? updatedCard : c)),
          };
        }
        return deck;
      })
    );

    if (activeDeck && activeDeck.id === deckId) {
      setActiveDeck(prev =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map(c => (c.id === updatedCard.id ? updatedCard : c)),
            }
          : null
      );
    }
  };

  const handleDeleteCard = (deckId: string, cardId: string) => {
    if (!confirm('Vrei să elimini acest card din deck definitiv?')) return;

    setDecks(prevDecks =>
      prevDecks.map(deck => {
        if (deck.id === deckId) {
          return {
            ...deck,
            cards: deck.cards.filter(c => c.id !== cardId),
            totalCards: deck.totalCards - 1,
          };
        }
        return deck;
      })
    );

    if (activeDeck && activeDeck.id === deckId) {
      setActiveDeck(prev =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter(c => c.id !== cardId),
              totalCards: prev.totalCards - 1,
            }
          : null
      );
    }
  };

  const handleUpdateUser = () => {
    if (isGuest) {
      promptLogin('Salvează setările', 'Creează un cont pentru a-ți salva preferințele.');
      return;
    }
    alert('Setările au fost salvate cu succes!');
  };

  const handleLogout = async () => {
    await logout();
    setDecks(MOCK_DECKS);
    setActiveDeck(null);
    setCurrentView('dashboard');
  };

  const handleLoginClick = () => {
    setAuthMode('login');
    setShowAuthPage(true);
    setShowLoginPrompt(false);
  };

  const handleRegisterClick = () => {
    setAuthMode('register');
    setShowAuthPage(true);
    setShowLoginPrompt(false);
  };

  // --- SESSION MANAGEMENT ---
  const handleCreateSession = (deck: Deck) => {
    if (isGuest) {
      promptLogin('Sesiuni de Studiu', 'Creează un cont pentru a salva progresul sesiunilor tale.');
      return;
    }
    setSelectedDeckForSession(deck);
    setShowCreateSessionModal(true);
  };

  const handleSessionCreated = (sessionId: string) => {
    setShowCreateSessionModal(false);
    setSelectedDeckForSession(null);
    setActiveSessionId(sessionId);
    setCurrentView('session-player');
  };

  const handleResumeSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentView('session-player');
  };

  const handleCloseSession = async () => {
    setActiveSessionId(null);
    setCurrentView('sessions');
    // Refresh user data to update Dashboard stats (XP, time spent, cards learned, etc.)
    if (isAuthenticated) {
      await refreshSession();
      // Also refresh decks to get updated progress
      await fetchDecks();
    }
  };

  // --- LOADING STATE ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // --- SHOW AUTH PAGE ---
  if (showAuthPage) {
    return (
      <div className="relative">
        <AuthPage initialMode={authMode} />
        <button
          onClick={() => setShowAuthPage(false)}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl font-medium text-gray-700 hover:bg-white transition-colors shadow-lg flex items-center gap-2"
        >
          <X size={18} />
          Înapoi la aplicație
        </button>
      </div>
    );
  }

  // --- RENDERER ---
  const renderContent = () => {
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

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            decks={decks}
            onStartSession={handleStartSession}
            onChangeView={setCurrentView}
            onResumeSession={handleResumeSession}
          />
        );
      case 'decks':
        return (
          <DeckList
            decks={decks}
            onAddDeck={handleAddDeck}
            onEditDeck={handleEditDeck}
            onDeleteDeck={handleDeleteDeck}
            onStartSession={handleStartSession}
            onResetDeck={handleResetDeck}
            isGuest={isGuest}
            onLoginPrompt={promptLogin}
          />
        );
      case 'study':
        return activeDeck ? (
          <StudySession
            deck={activeDeck}
            user={user}
            onFinish={handleFinishSession}
            onSaveProgress={handleSaveProgress}
            onUpdateUserXP={handleUpdateUserXP}
            onBack={() => setCurrentView('study')}
            onEditCard={card => handleEditCard(activeDeck.id, card)}
            onDeleteCard={cardId => handleDeleteCard(activeDeck.id, cardId)}
          />
        ) : (
          <GlobalDecks onStartSession={handleStartSession} onImportDeck={handleAddDeck} />
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
            onRegisterClick={handleRegisterClick}
          />
        );
      case 'settings':
        return (
          <Settings
            user={user}
            onSave={handleUpdateUser}
            onLogout={isGuest ? undefined : handleLogout}
            isGuest={isGuest}
            onLogin={handleLoginClick}
          />
        );
      case 'sessions':
        return (
          <ActiveSessionsList
            onResumeSession={handleResumeSession}
            decks={decks}
            onChangeView={setCurrentView}
            onCreateDeck={() => setCurrentView('decks')}
          />
        );
      case 'session-player':
        return activeSessionId ? (
          <StudySessionPlayer
            sessionId={activeSessionId}
            user={user}
            onFinish={handleCloseSession}
            onBack={handleCloseSession}
          />
        ) : (
          <ActiveSessionsList
            onResumeSession={handleResumeSession}
            decks={decks}
            onChangeView={setCurrentView}
            onCreateDeck={() => setCurrentView('decks')}
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
            onStartSession={handleStartSession}
            onChangeView={setCurrentView}
          />
        );
      default:
        return (
          <Dashboard
            user={user}
            decks={decks}
            onStartSession={handleStartSession}
            onChangeView={setCurrentView}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFBF7] text-gray-800 font-sans">
      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden fixed top-4 right-4 z-[60] bg-white p-2 rounded-lg shadow-md border border-gray-100"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <Sidebar
        user={user}
        currentView={currentView}
        onChangeView={setCurrentView}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isGuest={isGuest}
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Guest Banner */}
        {isGuest && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2 text-center text-sm">
            <span className="opacity-90">Mod vizitator - progresul nu va fi salvat.</span>
            <button
              onClick={handleRegisterClick}
              className="ml-2 font-bold underline hover:no-underline"
            >
              Creează cont gratuit
            </button>
          </div>
        )}

        {renderContent()}
      </main>

      {/* Create Session Modal */}
      {showCreateSessionModal && selectedDeckForSession && (
        <CreateSessionModal
          deck={selectedDeckForSession}
          onClose={() => {
            setShowCreateSessionModal(false);
            setSelectedDeckForSession(null);
          }}
          onSessionCreated={handleSessionCreated}
        />
      )}

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginClick}
        onRegister={handleLoginClick}
        title={loginPromptContext.title}
        message={loginPromptContext.message}
      />
    </div>
  );
}

// Main App with AuthProvider and ToastProvider
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
