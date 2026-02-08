import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { updateUserProfile } from '../api/users';

/* ============================================
   Theme System Hook
   Manages dual-layer theming: base mode + accent theme
   Persists to: localStorage (immediate) + database (async)
   ============================================ */

export type ThemeMode = 'light' | 'night';
export type AccentTheme = 'violet' | 'gold' | 'silver' | 'emerald' | 'rose';

const THEME_MODE_KEY = 'flashcards-theme-mode';
const ACCENT_THEME_KEY = 'flashcards-accent-theme';

const DEFAULT_MODE: ThemeMode = 'light';
const DEFAULT_ACCENT: AccentTheme = 'violet';

/**
 * Read theme from localStorage (fast, no flicker)
 */
function getStoredThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (stored === 'light' || stored === 'night') return stored;
  } catch {}
  return DEFAULT_MODE;
}

function getStoredAccentTheme(): AccentTheme {
  try {
    const stored = localStorage.getItem(ACCENT_THEME_KEY);
    if (['violet', 'gold', 'silver', 'emerald', 'rose'].includes(stored || ''))
      return stored as AccentTheme;
  } catch {}
  return DEFAULT_ACCENT;
}

/**
 * Apply theme classes to <html> element
 * This is called both from the hook and from the inline script in index.html
 */
export function applyThemeToDOM(mode: ThemeMode, accent: AccentTheme) {
  const html = document.documentElement;

  // Remove old theme classes
  html.classList.remove('theme-light', 'theme-night');
  html.classList.remove('accent-violet', 'accent-gold', 'accent-silver', 'accent-emerald', 'accent-rose');

  // Apply new classes
  html.classList.add(`theme-${mode}`);
  html.classList.add(`accent-${accent}`);

  // Set color-scheme for native elements (scrollbars, inputs)
  html.style.colorScheme = mode === 'night' ? 'dark' : 'light';
}

/**
 * useTheme - Main hook for theme management
 *
 * Usage:
 *   const { mode, accent, toggleMode, setMode, setAccent } = useTheme();
 */
export function useTheme() {
  const { user, isAuthenticated, updateUser } = useAuth();

  // Initialize from localStorage (fast) then reconcile with user preferences
  const [mode, setModeState] = useState<ThemeMode>(getStoredThemeMode);
  const [accent, setAccentState] = useState<AccentTheme>(getStoredAccentTheme);

  // On mount + user change: sync with user preferences from backend
  useEffect(() => {
    if (isAuthenticated && user?.preferences) {
      const userTheme = user.preferences.theme;
      const userAccent = (user.preferences as any).accentTheme;

      // Map 'dark' from old schema to 'night'
      const resolvedMode: ThemeMode =
        userTheme === 'dark' || userTheme === 'night' ? 'night' : 'light';
      const resolvedAccent: AccentTheme =
        userAccent && ['violet', 'gold', 'silver', 'emerald', 'rose'].includes(userAccent)
          ? userAccent
          : DEFAULT_ACCENT;

      setModeState(resolvedMode);
      setAccentState(resolvedAccent);

      // Persist to localStorage for flash prevention
      localStorage.setItem(THEME_MODE_KEY, resolvedMode);
      localStorage.setItem(ACCENT_THEME_KEY, resolvedAccent);
    }
  }, [isAuthenticated, user?.preferences]);

  // Apply to DOM whenever mode or accent changes
  useEffect(() => {
    applyThemeToDOM(mode, accent);
  }, [mode, accent]);

  // Set mode
  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      localStorage.setItem(THEME_MODE_KEY, newMode);
      applyThemeToDOM(newMode, accent);

      // Persist to backend
      if (isAuthenticated && user) {
        const dbTheme = newMode === 'night' ? 'dark' : 'light';
        updateUser({ preferences: { ...user.preferences, theme: dbTheme as any } });
        updateUserProfile(user.id, {
          preferences: { theme: dbTheme },
        }).catch(() => {});
      }
    },
    [accent, isAuthenticated, user, updateUser]
  );

  // Toggle mode
  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'night' : 'light');
  }, [mode, setMode]);

  // Set accent
  const setAccent = useCallback(
    (newAccent: AccentTheme) => {
      setAccentState(newAccent);
      localStorage.setItem(ACCENT_THEME_KEY, newAccent);
      applyThemeToDOM(mode, newAccent);

      // Persist to backend
      if (isAuthenticated && user) {
        updateUser({
          preferences: { ...user.preferences, accentTheme: newAccent } as any,
        });
        updateUserProfile(user.id, {
          preferences: { accentTheme: newAccent },
        }).catch(() => {});
      }
    },
    [mode, isAuthenticated, user, updateUser]
  );

  return {
    mode,
    accent,
    setMode,
    setAccent,
    toggleMode,
    isNight: mode === 'night',
  };
}
