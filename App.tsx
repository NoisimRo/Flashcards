import React, { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { ToastProvider } from './src/components/ui/Toast';
import { AppLayout } from './src/layouts/AppLayout';
import { ViewRouter } from './src/routes/ViewRouter';
import { useUIStore } from './src/store/uiStore';
import { useDecksStore } from './src/store/decksStore';
import AuthPage from './src/components/auth/AuthPage';
import LoginPromptModal from './src/components/auth/LoginPromptModal';
import CreateSessionModal from './src/components/sessions/CreateSessionModal';
import { useAuthActions } from './src/hooks/useAuthActions';
import { useSessionManagement } from './src/hooks/useSessionManagement';
import { clearGuestToken } from './src/utils/guestMode';

/**
 * Main App Content Component
 * Handles authentication, data fetching, and modal management
 * Delegates routing to ViewRouter and layout to AppLayout
 */
function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchDecks } = useDecksStore();
  const {
    showAuthPage,
    showLoginPrompt,
    showCreateSessionModal,
    selectedDeckForSession,
    loginPromptContext,
    authMode,
    setShowAuthPage,
    setShowLoginPrompt,
    setShowCreateSessionModal,
  } = useUIStore();
  const { handleLoginClick, handleRegisterClick } = useAuthActions();
  const { handleSessionCreated } = useSessionManagement();

  // Fetch decks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDecks({ ownedOnly: true });
      setShowAuthPage(false);
      // Clear guest token after successful login
      clearGuestToken();
    }
  }, [isAuthenticated, fetchDecks, setShowAuthPage]);

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      setShowAuthPage(true);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [setShowAuthPage]);

  // Loading state
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

  // Show auth page
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

  // Main app
  return (
    <AppLayout>
      <ViewRouter />

      {/* Modals */}
      {showCreateSessionModal && selectedDeckForSession && (
        <CreateSessionModal
          deck={{ id: selectedDeckForSession } as any}
          onClose={() => setShowCreateSessionModal(false)}
          onSessionCreated={handleSessionCreated}
        />
      )}

      {showLoginPrompt && (
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          onLogin={handleLoginClick}
          onRegister={handleRegisterClick}
          title={loginPromptContext.title}
          message={loginPromptContext.message}
        />
      )}
    </AppLayout>
  );
}

/**
 * Main App Component
 * Wraps everything in providers
 */
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
