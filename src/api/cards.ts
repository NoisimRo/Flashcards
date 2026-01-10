import { api } from './client';
import type { Card as LocalCard } from '../../types';

export interface CreateCardRequest {
  deckId: string;
  front: string;
  back: string;
  context?: string;
  type: 'standard' | 'type-answer' | 'quiz';
  options?: string[];
  correctOptionIndex?: number;
}

export interface UpdateCardRequest {
  front?: string;
  back?: string;
  context?: string;
  type?: 'standard' | 'type-answer' | 'quiz';
  options?: string[];
  correctOptionIndex?: number;
}

export interface CardResponse {
  id: string;
  deckId: string;
  front: string;
  back: string;
  context?: string;
  type: 'standard' | 'type-answer' | 'quiz';
  options?: string[];
  correctOptionIndex?: number;
  flagCount?: number;
}

export async function createCard(data: CreateCardRequest) {
  const { deckId, ...cardData } = data;
  return api.post<CardResponse>(`/decks/${deckId}/cards`, cardData);
}

export async function updateCard(deckId: string, cardId: string, data: UpdateCardRequest) {
  return api.put<CardResponse>(`/decks/${deckId}/cards/${cardId}`, data);
}

export async function deleteCard(deckId: string, cardId: string) {
  return api.delete<void>(`/decks/${deckId}/cards/${cardId}`);
}

export async function getCard(deckId: string, cardId: string) {
  return api.get<CardResponse>(`/decks/${deckId}/cards/${cardId}`);
}
