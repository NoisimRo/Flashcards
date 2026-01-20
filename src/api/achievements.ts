import { api } from './client';

export interface Achievement {
  id: string;
  title: string; // Deprecated: kept for backward compatibility
  description: string; // Deprecated: kept for backward compatibility
  titleKey?: string; // i18n translation key
  descriptionKey?: string; // i18n translation key
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
export async function getAchievements() {
  return api.get<AchievementsResponse['data']>('/achievements');
}
