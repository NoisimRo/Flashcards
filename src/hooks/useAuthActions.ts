import { useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../store/AuthContext';

/**
 * Custom hook for authentication actions
 * Handles login, register, and logout UI flows
 */
export function useAuthActions() {
  const { logout } = useAuth();
  const { setShowAuthPage, setAuthMode, setShowLoginPrompt } = useUIStore();

  const handleLoginClick = useCallback(() => {
    setAuthMode('login');
    setShowAuthPage(true);
    setShowLoginPrompt(false);
  }, [setAuthMode, setShowAuthPage, setShowLoginPrompt]);

  const handleRegisterClick = useCallback(() => {
    setAuthMode('register');
    setShowAuthPage(true);
    setShowLoginPrompt(false);
  }, [setAuthMode, setShowAuthPage, setShowLoginPrompt]);

  const handleLogout = useCallback(async () => {
    await logout();
    // UI store will be reset in App.tsx after logout
  }, [logout]);

  const promptLogin = useCallback(
    (title: string, message: string) => {
      setShowLoginPrompt(true, { title, message });
    },
    [setShowLoginPrompt]
  );

  return {
    handleLoginClick,
    handleRegisterClick,
    handleLogout,
    promptLogin,
  };
}
