import { api } from './client';
import type {
  CreateStudySessionRequest,
  CreateStudySessionResponse,
  GetStudySessionsParams,
  UpdateStudySessionRequest,
  CompleteStudySessionRequest,
  CompleteStudySessionResponse,
} from '../types/api';
import type { StudySession, StudySessionWithData } from '../types/models';

/**
 * Get available card count for session creation (accounts for filters)
 */
export async function getAvailableCardCount(
  deckId: string,
  excludeMastered: boolean,
  excludeActiveSessionCards: boolean
) {
  const params = new URLSearchParams({
    deckId,
    excludeMastered: String(excludeMastered),
    excludeActiveSessionCards: String(excludeActiveSessionCards),
  });
  return api.get<{
    totalCards: number;
    masteredCount: number;
    activeSessionCardCount: number;
    availableCount: number;
  }>(`/study-sessions/available-count?${params.toString()}`);
}

/**
 * Create a new study session
 */
export async function createStudySession(request: CreateStudySessionRequest) {
  return api.post<CreateStudySessionResponse>('/study-sessions', request);
}

/**
 * List study sessions
 */
export async function getStudySessions(params?: GetStudySessionsParams) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const query = searchParams.toString();
  return api.get<StudySession[]>(`/study-sessions${query ? `?${query}` : ''}`);
}

/**
 * Get a specific study session with cards and progress
 */
export async function getStudySession(id: string) {
  return api.get<StudySessionWithData>(`/study-sessions/${id}`);
}

/**
 * Update session progress
 */
export async function updateStudySession(id: string, request: UpdateStudySessionRequest) {
  return api.put<StudySession>(`/study-sessions/${id}`, request);
}

/**
 * Complete a study session
 */
export async function completeStudySession(id: string, request: CompleteStudySessionRequest) {
  return api.post<CompleteStudySessionResponse>(`/study-sessions/${id}/complete`, request);
}

/**
 * Abandon a study session
 */
export async function abandonStudySession(id: string) {
  return api.delete<StudySession>(`/study-sessions/${id}`);
}

/**
 * Get cards for a deck with optional progress
 */
export async function getDeckCards(deckId: string, includeProgress: boolean = false) {
  return api.get<{
    cards: any[];
    cardProgress?: Record<string, any>;
  }>(`/decks/${deckId}/cards?includeProgress=${includeProgress}`);
}
