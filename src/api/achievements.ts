import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  conditionType: string;
  conditionValue: number;
  tier: string;
}

export interface AchievementsResponse {
  success: boolean;
  data: {
    achievements: Achievement[];
    totalCount: number;
    unlockedCount: number;
  };
}

/**
 * Get all achievements with user's unlock status
 */
export async function getAchievements(): Promise<AchievementsResponse> {
  const response = await api.get('/api/achievements');
  return response.data;
}
