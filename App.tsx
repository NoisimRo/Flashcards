import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { ToastProvider } from './src/components/ui/Toast';
import AuthPage from './src/components/auth/AuthPage';
import LoginPromptModal from './src/components/auth/LoginPromptModal';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DeckList from './components/DeckList';
import StudySession from './components/StudySession';
import Achievements from './components/Achievements';
import Leaderboard from './components/Leaderboard';
import Settings from './components/Settings';
import { MOCK_DECKS, MOCK_ACHIEVEMENTS, LEADERBOARD_DATA } from './constants';
import { Deck, Card, SessionData, User } from './types';
import { Menu, X, Loader2 } from 'lucide-react';
import * as decksApi from './src/api/decks';
import * as usersApi from './src/api/users';
import { getSubjectId, getSubjectDisplayName } from './src/constants/subjects';

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
}): Deck {
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
  const [decks, setDecks] = useState<Deck[]>(MOCK_DECKS); // Start with mock decks for guests
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth modal states
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptContext, setLoginPromptContext] = useState({ title: '', message: '' });

  // Use authenticated user or guest user
  const user = isAuthenticated && authUser ? adaptUserFromAPI(authUser) : GUEST_USER;
  const isGuest = !isAuthenticated;

  // Fetch decks when authenticated
  useEffect(() => {
    if (isAuthenticated && authUser) {
      fetchDecks();
      setShowAuthPage(false);
    } else {
      // Reset to mock decks for guests
      setDecks(MOCK_DECKS);
    }
  }, [isAuthenticated, authUser]);

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const response = await decksApi.getDecks({ ownedOnly: true });
      if (response.success && response.data) {
        const adaptedDecks = response.data.map(adaptDeckFromAPI);
        // Merge with mock decks if user has no decks
        if (adaptedDecks.length === 0) {
          setDecks(MOCK_DECKS);
        } else {
          setDecks(adaptedDecks);
        }
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
      setDecks(MOCK_DECKS);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  // Show login prompt with custom message
  const promptLogin = (title: string, message: string) => {
    setLoginPromptContext({ title, message });
    setShowLoginPrompt(true);
  };

  // --- ACTIONS ---

  const handleStartSession = (deck: Deck) => {
    setActiveDeck(deck);
    setCurrentView('study');
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
    setCurrentView('dashboard');

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
      setDecks(prev => [...prev, newDeck]);
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
        setDecks(prev => [...prev, adaptedDeck]);
      }
    } catch (error) {
      console.error('Error creating deck:', error);
      setDecks(prev => [...prev, newDeck]);
    }
  };

  const handleEditDeck = async (updatedDeck: Deck) => {
    if (isGuest) {
      setDecks(decks.map(d => (d.id === updatedDeck.id ? updatedDeck : d)));
      return;
    }

    try {
      await decksApi.updateDeck(updatedDeck.id, {
        title: updatedDeck.title,
        subject: getSubjectId(updatedDeck.subject), // Convert display name to ID
        topic: updatedDeck.topic,
        difficulty: updatedDeck.difficulty,
      });
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
    setShowAuthPage(true);
    setShowLoginPrompt(false);
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
        <AuthPage />
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
            onBack={() => setCurrentView('decks')}
            onEditCard={card => handleEditCard(activeDeck.id, card)}
            onDeleteCard={cardId => handleDeleteCard(activeDeck.id, cardId)}
          />
        ) : (
          <Dashboard
            user={user}
            decks={decks}
            onStartSession={handleStartSession}
            onChangeView={setCurrentView}
          />
        );
      case 'achievements':
        return <Achievements achievements={MOCK_ACHIEVEMENTS} user={user} />;
      case 'leaderboard':
        return <Leaderboard entries={LEADERBOARD_DATA} currentUser={user} />;
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
      />

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative">
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
              onClick={handleLoginClick}
              className="ml-2 font-bold underline hover:no-underline"
            >
              Creează cont gratuit
            </button>
          </div>
        )}

        {renderContent()}
      </main>

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
