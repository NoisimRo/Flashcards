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
  return api.post<CardResponse>('/cards', data);
}

export async function updateCard(cardId: string, data: UpdateCardRequest) {
  return api.put<CardResponse>(`/cards/${cardId}`, data);
}

export async function deleteCard(cardId: string) {
  return api.delete<void>(`/cards/${cardId}`);
}

export async function getCard(cardId: string) {
  return api.get<CardResponse>(`/cards/${cardId}`);
}
