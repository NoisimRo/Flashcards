import { api } from './client';
import type {
  DeckWithCards,
  CreateDeckRequest,
  UpdateDeckRequest,
  DeckListParams,
  CreateCardRequest,
  UpdateCardRequest,
} from '../types';

// Decks
export async function getDecks(params?: DeckListParams) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
  }
  const query = searchParams.toString();
  return api.get<DeckWithCards[]>(`/decks${query ? `?${query}` : ''}`);
}

export async function getDeck(id: string) {
  return api.get<DeckWithCards>(`/decks/${id}`);
}

export async function createDeck(data: CreateDeckRequest) {
  return api.post<DeckWithCards>('/decks', data);
}

export async function updateDeck(id: string, data: UpdateDeckRequest) {
  return api.put<DeckWithCards>(`/decks/${id}`, data);
}

export async function deleteDeck(id: string) {
  return api.delete(`/decks/${id}`);
}

// Cards
export async function addCard(deckId: string, data: CreateCardRequest) {
  return api.post(`/decks/${deckId}/cards`, data);
}

export async function updateCard(deckId: string, cardId: string, data: UpdateCardRequest) {
  return api.put(`/decks/${deckId}/cards/${cardId}`, data);
}

export async function deleteCard(deckId: string, cardId: string) {
  return api.delete(`/decks/${deckId}/cards/${cardId}`);
}

// Import/Export
export async function importDeck(data: {
  format: string;
  data: string;
  title?: string;
  subject?: string;
  difficulty?: string;
}) {
  return api.post<{ deckId: string; cardsImported: number }>('/import/deck', data);
}

export async function exportDeck(
  id: string,
  format: string = 'json',
  includeProgress: boolean = false
) {
  return api.get<{
    format: string;
    fileName: string;
    content: string;
    mimeType: string;
  }>(`/export/deck/${id}?format=${format}&includeProgress=${includeProgress}`);
}

// AI Generation
export async function generateDeckWithAI(
  subject: string,
  topic: string,
  difficulty: string,
  numberOfCards: number = 10
) {
  return api.post<
    Array<{
      front: string;
      back: string;
      context: string;
      type: string;
    }>
  >('/decks/generate', { subject, topic, difficulty, numberOfCards });
}

// Helper to download exported file
export function downloadExportedDeck(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([atob(content)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
