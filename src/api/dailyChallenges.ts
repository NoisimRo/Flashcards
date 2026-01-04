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

export interface DailyChallenge {
  id: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardClaimed: boolean;
  reward: number;
  icon: string;
  color: string;
}

export interface DailyChallengesResponse {
  success: boolean;
  data: {
    challenges: DailyChallenge[];
    date: string;
  };
}

export interface ClaimRewardResponse {
  success: boolean;
  data: {
    xpEarned: number;
    leveledUp: boolean;
    newLevel?: number;
    oldLevel?: number;
  };
}

/**
 * Get today's daily challenges
 */
export async function getTodaysChallenges(): Promise<DailyChallengesResponse> {
  const response = await api.get('/api/daily-challenges/today');
  return response.data;
}

/**
 * Claim reward for a completed challenge
 */
export async function claimChallengeReward(
  challengeId: string
): Promise<ClaimRewardResponse> {
  const response = await api.post('/api/daily-challenges/claim-reward', {
    challengeId,
  });
  return response.data;
}

export interface ActivityDay {
  date: string;
  studied: boolean;
  intensity: number;
  cardsLearned: number;
  timeSpent: number;
}

export interface ActivityCalendarResponse {
  success: boolean;
  data: {
    calendar: ActivityDay[];
  };
}

/**
 * Get activity calendar for last 28 days
 */
export async function getActivityCalendar(): Promise<ActivityCalendarResponse> {
  const response = await api.get('/api/daily-challenges/activity-calendar');
  return response.data;
}
