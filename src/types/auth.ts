import { UserRole } from './models';

// ============================================
// PERMISSIONS
// ============================================

export type Permission =
  // User management
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  // Deck management
  | 'decks:read'
  | 'decks:read_all'
  | 'decks:create'
  | 'decks:update'
  | 'decks:update_all'
  | 'decks:delete'
  | 'decks:delete_all'
  | 'decks:publish'
  // Card management
  | 'cards:create'
  | 'cards:update'
  | 'cards:delete'
  // Study
  | 'study:access'
  | 'study:view_all_progress'
  // Admin
  | 'admin:access'
  | 'admin:view_stats'
  | 'admin:manage_content';

// ============================================
// ROLE PERMISSIONS MAPPING
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // All permissions
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:manage_roles',
    'decks:read',
    'decks:read_all',
    'decks:create',
    'decks:update',
    'decks:update_all',
    'decks:delete',
    'decks:delete_all',
    'decks:publish',
    'cards:create',
    'cards:update',
    'cards:delete',
    'study:access',
    'study:view_all_progress',
    'admin:access',
    'admin:view_stats',
    'admin:manage_content',
  ],
  teacher: [
    'users:read',
    'decks:read',
    'decks:read_all',
    'decks:create',
    'decks:update',
    'decks:delete',
    'decks:publish',
    'cards:create',
    'cards:update',
    'cards:delete',
    'study:access',
    'study:view_all_progress',
  ],
  student: [
    'decks:read',
    'decks:create',
    'decks:update',
    'decks:delete',
    'cards:create',
    'cards:update',
    'cards:delete',
    'study:access',
  ],
};

// ============================================
// AUTH STATE
// ============================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: import('./models').User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: 'teacher' | 'student'
  ) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRole: (role: UserRole) => boolean;
  isAnyRole: (roles: UserRole[]) => boolean;
}

// ============================================
// JWT PAYLOAD
// ============================================

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: UserRole;
  iat: number; // Issued at
  exp: number; // Expires at
  type: 'access' | 'refresh';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    '/admin': ['admin:access'],
    '/admin/users': ['users:read', 'users:manage_roles'],
    '/admin/content': ['admin:manage_content'],
    '/teacher/students': ['study:view_all_progress'],
    '/decks/public': ['decks:read_all'],
  };

  const required = routePermissions[route];
  if (!required) return true; // No restrictions

  return hasAnyPermission(role, required);
}
