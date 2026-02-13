import { api } from './client';

export interface BadgeTierColors {
  bronze: string;
  silver: string;
  gold: string;
  platinum: string;
}

export async function getBadgeTierColors() {
  return api.get<BadgeTierColors>('/settings/badge-colors');
}

export async function updateBadgeTierColors(colors: Partial<BadgeTierColors>) {
  return api.put<BadgeTierColors>('/settings/badge-colors', colors);
}
