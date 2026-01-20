import { describe, it, expect } from 'vitest';
import type { Card, Deck, DeckWithCards, User, Achievement } from '../../src/types';

// Test-specific types with minimal required fields
type TestCard = Pick<Card, 'id' | 'front' | 'back' | 'type'>;

// Helper function to validate card structure (updated for new architecture)
function isValidCard(card: TestCard): boolean {
  return (
    typeof card.id === 'string' &&
    typeof card.front === 'string' &&
    typeof card.back === 'string' &&
    ['standard', 'quiz', 'type-answer'].includes(card.type)
  );
}

// Helper function to calculate deck progress
function calculateDeckProgress(deck: Deck): number {
  if (deck.totalCards === 0) return 0;
  return Math.round((deck.masteredCards / deck.totalCards) * 100);
}

// Helper function to calculate XP for level
function calculateXPForLevel(level: number): number {
  return level * 500 + (level - 1) * 100;
}

describe('Card Validation', () => {
  it('should validate a correct standard card', () => {
    const card: TestCard = {
      id: 'test-1',
      front: 'Question',
      back: 'Answer',
      type: 'standard',
    };
    expect(isValidCard(card)).toBe(true);
  });

  it('should validate a quiz card', () => {
    const card: TestCard = {
      id: 'quiz-1',
      front: 'What is 2+2?',
      back: '4',
      type: 'quiz',
    };
    expect(isValidCard(card)).toBe(true);
  });

  it('should validate a type-answer card', () => {
    const card: TestCard = {
      id: 'type-1',
      front: 'Type the answer',
      back: 'Answer',
      type: 'type-answer',
    };
    expect(isValidCard(card)).toBe(true);
  });
});

describe('Deck Progress Calculation', () => {
  it('should calculate progress correctly', () => {
    const deck: Deck = {
      id: 'deck-1',
      ownerId: 'user-1',
      title: 'Test Deck',
      subject: 'math',
      topic: 'Algebra',
      difficulty: 'B1',
      isPublic: false,
      tags: [],
      totalCards: 10,
      masteredCards: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(calculateDeckProgress(deck)).toBe(50);
  });

  it('should handle empty deck', () => {
    const deck: Deck = {
      id: 'deck-2',
      ownerId: 'user-1',
      title: 'Empty Deck',
      subject: 'test',
      topic: 'Test',
      difficulty: 'A1',
      isPublic: false,
      tags: [],
      totalCards: 0,
      masteredCards: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(calculateDeckProgress(deck)).toBe(0);
  });
});

describe('XP Calculations', () => {
  it('should calculate XP for level 1', () => {
    expect(calculateXPForLevel(1)).toBe(500);
  });

  it('should calculate XP for level 5', () => {
    expect(calculateXPForLevel(5)).toBe(2900);
  });
});

describe('User Stats', () => {
  it('should validate complete user object', () => {
    const user: User = {
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'student',
      level: 5,
      currentXP: 1200,
      nextLevelXP: 2900,
      totalXP: 15000,
      streak: 7,
      longestStreak: 30,
      totalTimeSpent: 500,
      totalCardsLearned: 150,
      totalDecksCompleted: 5,
      totalCorrectAnswers: 300,
      totalAnswers: 400,
      preferences: {
        dailyGoal: 20,
        soundEnabled: true,
        animationsEnabled: true,
        theme: 'light',
        language: 'ro',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(user.id).toBe('user-1');
    expect(user.level).toBe(5);
    expect(user.totalAnswers).toBeGreaterThanOrEqual(user.totalCorrectAnswers);
  });
});

// NOTE: Achievement unlock tests removed - Achievement.unlocked was removed in refactoring
// Achievement unlock status is now determined server-side based on user progress
// TODO: Rewrite achievement tests to use server-side unlock logic
