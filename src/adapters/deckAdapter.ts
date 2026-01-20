import type { Deck, Card } from '../types';
import { getSubjectDisplayName } from '../constants/subjects';

/**
 * Adapter to convert API Deck format to local Deck format
 * Handles subject name resolution and ensures all required fields are present
 */
export function adaptDeckFromAPI(apiDeck: {
  id: string;
  title: string;
  subject?: string;
  subjectName?: string;
  topic?: string;
  difficulty?: string;
  totalCards?: number;
  masteredCards?: number;
  lastStudied?: string;
  ownerId?: string;
  isPublic?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  cards?: Array<{
    id: string;
    front: string;
    back: string;
    context?: string;
    type?: string;
    options?: string[];
    correctOptionIndex?: number;
    status?: string;
    flagCount?: number;
  }>;
}): Deck {
  return {
    id: apiDeck.id,
    title: apiDeck.title,
    subject: apiDeck.subjectName || getSubjectDisplayName(apiDeck.subject || '') || 'Limba Română',
    topic: apiDeck.topic || '',
    difficulty: (apiDeck.difficulty as Deck['difficulty']) || 'A2',
    cards: (apiDeck.cards || []).map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      context: card.context,
      type: (card.type as Card['type']) || 'standard',
      options: card.options,
      correctOptionIndex: card.correctOptionIndex,
      status: (card.status as Card['status']) || 'new',
      flagCount: card.flagCount,
    })),
    totalCards: apiDeck.totalCards || apiDeck.cards?.length || 0,
    masteredCards: apiDeck.masteredCards || 0,
    lastStudied: apiDeck.lastStudied,
    sessionData: undefined,
    // Extra fields from API
    isPublic: apiDeck.isPublic,
    isOwner: apiDeck.ownerId !== undefined,
  };
}
