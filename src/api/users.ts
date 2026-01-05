import { api } from './client';
import type { User } from '../types';

export interface UpdateXPRequest {
  deltaXP: number;
}

export interface LeaderboardEntry {
  id: string;
  position: number;
  name: string;
  level: number;
  xpTotal: number;
  streak: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  currentUserEntry?: LeaderboardEntry;
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

export async function getGlobalLeaderboard(limit = 100) {
  return api.get<LeaderboardResponse>(`/users/leaderboard/global?limit=${limit}`);
}

export interface CardStats {
  statusCounts: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
  inStudy: number;
  mastered: number;
  totalDecks: number;
  activeSessions: number;
}

export async function getUserCardStats(userId: string) {
  return api.get<CardStats>(`/users/${userId}/card-stats`);
}
