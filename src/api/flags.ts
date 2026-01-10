import { api } from './client';

export type FlagStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type FlagType = 'card' | 'deck';
export type FlagReason =
  | 'inappropriate'
  | 'incorrect_information'
  | 'duplicate'
  | 'spam'
  | 'other';

export interface CardFlag {
  id: string;
  cardId: string;
  deckId: string;
  flaggedByUserId: string;
  flaggedByName?: string;
  flaggedByEmail?: string;
  comment?: string;
  status: FlagStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  cardFront?: string;
  cardBack?: string;
  cardContext?: string;
  cardType?: string;
  deckTitle?: string;
  deckTopic?: string;
}

export interface DeckFlag {
  id: string;
  deckId: string;
  flaggedByUserId: string;
  flaggedByName?: string;
  flaggedByEmail?: string;
  reason?: FlagReason;
  comment?: string;
  status: FlagStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  deckTitle?: string;
  deckTopic?: string;
  totalCards?: number;
}

export type Flag = (CardFlag | DeckFlag) & { type: FlagType };

export interface CreateCardFlagRequest {
  cardId: string;
  comment?: string;
}

export interface CreateDeckFlagRequest {
  deckId: string;
  reason?: FlagReason;
  comment?: string;
}

export interface UpdateFlagRequest {
  status: 'under_review' | 'resolved' | 'dismissed';
  reviewNotes?: string;
}

export interface GetFlagsParams {
  type?: 'card' | 'deck' | 'all';
  status?: FlagStatus;
  page?: number;
  limit?: number;
}

// POST /api/flags/cards - Flag a card
export async function flagCard(cardId: string, comment?: string) {
  return api.post<CardFlag>('/flags/cards', { cardId, comment });
}

// POST /api/flags/decks - Flag a deck
export async function flagDeck(deckId: string, reason?: FlagReason, comment?: string) {
  return api.post<DeckFlag>('/flags/decks', { deckId, reason, comment });
}

// GET /api/flags - Get all flags (moderators only)
export async function getFlags(params?: GetFlagsParams) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append('type', params.type);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  return api.get<Flag[]>(`/flags${query ? `?${query}` : ''}`);
}

// GET /api/flags/:id - Get single flag details (moderators only)
export async function getFlag(id: string) {
  return api.get<Flag>(`/flags/${id}`);
}

// PUT /api/flags/:id - Update flag status (moderators only)
export async function updateFlagStatus(id: string, data: UpdateFlagRequest) {
  return api.put<Flag>(`/flags/${id}`, data);
}
