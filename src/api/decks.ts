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
  deckId?: string; // If provided, adds cards to existing deck
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
    cardsCount: number;
  }>(`/export/deck/${id}?format=${format}&includeProgress=${includeProgress}`);
}

// AI Generation
export async function generateDeckWithAI(
  subject: string,
  topic: string,
  difficulty: string,
  numberOfCards: number = 10,
  cardTypes?: Array<'standard' | 'quiz' | 'type-answer' | 'multiple-answer'>,
  language?: string,
  extraContext?: string
) {
  return api.post<
    Array<{
      front: string;
      back: string;
      context: string;
      type: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
      options?: string[];
      correctOptionIndex?: number;
      correctOptionIndices?: number[];
    }>
  >('/decks/generate', {
    subject,
    topic,
    difficulty,
    numberOfCards,
    cardTypes,
    language,
    extraContext,
  });
}

// Helper to download exported file
export function downloadExportedDeck(fileName: string, content: string, mimeType: string) {
  // Decode base64 to binary, then convert to UTF-8 properly
  const binaryString = atob(content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8');
  const decodedContent = decoder.decode(bytes);

  // Add BOM for UTF-8 to ensure Excel and other apps recognize encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + decodedContent], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
