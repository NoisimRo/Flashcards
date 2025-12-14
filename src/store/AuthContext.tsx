import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
} from '../api/auth';
import { getAccessToken, clearTokens } from '../api/client';
import {
  saveUser,
  getUser as getOfflineUser,
  clearUser as clearOfflineUser,
} from '../services/offlineStorage';
import type { User, UserRole, AuthContextType, Permission } from '../types';
import {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    async function initAuth() {
      const token = getAccessToken();

      if (token) {
        try {
          // Try to get user from server
          const response = await getMe();
          if (response.success && response.data) {
            setUser(response.data as User);
            await saveUser(response.data as User);
          } else {
            // Try offline user
            const offlineUser = await getOfflineUser();
            if (offlineUser) {
              setUser(offlineUser);
            } else {
              clearTokens();
            }
          }
        } catch {
          // Try offline user
          const offlineUser = await getOfflineUser();
          if (offlineUser) {
            setUser(offlineUser);
          }
        }
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiLogin(email, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        await saveUser(response.data.user);
      } else {
        setError(response.error?.message || 'Eroare la autentificare');
        throw new Error(response.error?.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Eroare la autentificare';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string, role?: 'teacher' | 'student') => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRegister({ email, password, name, role });

        if (response.success && response.data) {
          setUser(response.data.user);
          await saveUser(response.data.user);
        } else {
          setError(response.error?.message || 'Eroare la înregistrare');
          throw new Error(response.error?.message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Eroare la înregistrare';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors, clear local state anyway
    }

    setUser(null);
    await clearOfflineUser();
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await getMe();
      if (response.success && response.data) {
        setUser(response.data as User);
        await saveUser(response.data as User);
      }
    } catch {
      // Ignore
    }
  }, []);

  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      return hasPermission(user.role, permission);
    },
    [user]
  );

  const checkAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAnyPermission(user.role, permissions);
    },
    [user]
  );

  const checkAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      if (!user) return false;
      return hasAllPermissions(user.role, permissions);
    },
    [user]
  );

  const isRole = useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  const isAnyRole = useCallback(
    (roles: UserRole[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value: AuthContextType = {
    isAuthenticated: !!user,
    isLoading,
    user,
    accessToken: getAccessToken(),
    refreshToken: null, // Not exposed
    expiresAt: null,
    error,
    login,
    register,
    logout,
    refreshSession,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    isRole,
    isAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// GUARD COMPONENTS
// ============================================

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Se încarcă...</div>;
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface RequireRoleProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export function RequireRole({ children, roles, fallback }: RequireRoleProps) {
  const { isAnyRole, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Se încarcă...</div>;
  }

  if (!isAnyRole(roles)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface RequirePermissionProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function RequirePermission({ children, permission, fallback }: RequirePermissionProps) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Se încarcă...</div>;
  }

  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export default AuthContext;
