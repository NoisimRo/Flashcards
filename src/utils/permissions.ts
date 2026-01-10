import { ROLE_PERMISSIONS, type Permission } from '../types/auth';
import type { User } from '../types/models';

/**
 * Check if a user has a specific permission based on their role
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user || !user.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user || !user.role) {
    return false;
  }

  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user || !user.role) {
    return false;
  }

  return permissions.every(permission => hasPermission(user, permission));
}
