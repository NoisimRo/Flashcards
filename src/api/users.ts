import { api } from './client';
import type { User } from '../types';

export interface UpdateXPRequest {
  deltaXP: number;
}

export async function updateUserXP(userId: string, deltaXP: number) {
  return api.post<User>(`/users/${userId}/xp`, { deltaXP });
}

export async function getUserProfile(userId: string) {
  return api.get<User>(`/users/${userId}`);
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatar?: string; preferences?: any }
) {
  return api.put<User>(`/users/${userId}`, data);
}
