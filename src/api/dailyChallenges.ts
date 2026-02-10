import { api } from './client';

export interface DailyChallenge {
  id: string;
  title: string; // Deprecated: kept for backward compatibility
  titleKey?: string; // i18n translation key
  titleParams?: Record<string, any>; // i18n translation parameters
  descriptionKey?: string; // i18n translation key for description/tooltip
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
export async function getTodaysChallenges() {
  return api.get<DailyChallengesResponse['data']>('/daily-challenges/today');
}

/**
 * Claim reward for a completed challenge
 */
export async function claimChallengeReward(challengeId: string) {
  return api.post<ClaimRewardResponse['data']>('/daily-challenges/claim-reward', {
    challengeId,
  });
}

export interface ActivityDay {
  date: string;
  studied: boolean;
  intensity: number;
  cardsLearned: number;
  timeSpent: number;
  successRate: number;
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
export async function getActivityCalendar() {
  return api.get<ActivityCalendarResponse['data']>('/daily-challenges/activity-calendar');
}
