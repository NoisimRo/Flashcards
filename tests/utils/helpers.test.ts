import { describe, it, expect } from 'vitest';
import type { Card, Deck, User, Achievement } from '../../types';

// Helper function to validate card structure
function isValidCard(card: Card): boolean {
  return (
    typeof card.id === 'string' &&
    typeof card.front === 'string' &&
    typeof card.back === 'string' &&
    ['standard', 'quiz'].includes(card.type) &&
    ['new', 'learning', 'mastered'].includes(card.status)
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

// Helper function to check if achievement is unlocked
function isAchievementUnlocked(achievement: Achievement): boolean {
  return achievement.unlocked === true;
}

describe('Card Validation', () => {
  it('should validate a correct standard card', () => {
    const card: Card = {
      id: 'test-1',
      front: 'Question',
      back: 'Answer',
      type: 'standard',
      status: 'new',
    };
    expect(isValidCard(card)).toBe(true);
  });

  it('should validate a quiz card with options', () => {
    const card: Card = {
      id: 'quiz-1',
      front: 'What is 2+2?',
      back: '4',
      type: 'quiz',
      status: 'learning',
      options: ['3', '4', '5', '6'],
      correctOptionIndex: 1,
    };
    expect(isValidCard(card)).toBe(true);
  });

  it('should validate card with context', () => {
    const card: Card = {
      id: 'ctx-1',
      front: 'Abilitate',
      back: 'Pricepere',
      context: 'Ionel a demonstrat o abilitate rară.',
      type: 'standard',
      status: 'mastered',
    };
    expect(isValidCard(card)).toBe(true);
    expect(card.context).toBeDefined();
  });
});

describe('Deck Progress Calculation', () => {
  it('should calculate 0% for empty deck', () => {
    const deck: Deck = {
      id: 'd1',
      title: 'Empty Deck',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'A1',
      cards: [],
      totalCards: 0,
      masteredCards: 0,
    };
    expect(calculateDeckProgress(deck)).toBe(0);
  });

  it('should calculate correct progress percentage', () => {
    const deck: Deck = {
      id: 'd2',
      title: 'Half Done',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'B1',
      cards: [],
      totalCards: 100,
      masteredCards: 50,
    };
    expect(calculateDeckProgress(deck)).toBe(50);
  });

  it('should calculate 100% for completed deck', () => {
    const deck: Deck = {
      id: 'd3',
      title: 'Complete',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'C1',
      cards: [],
      totalCards: 25,
      masteredCards: 25,
    };
    expect(calculateDeckProgress(deck)).toBe(100);
  });

  it('should round progress to nearest integer', () => {
    const deck: Deck = {
      id: 'd4',
      title: 'Partial',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'B2',
      cards: [],
      totalCards: 3,
      masteredCards: 1,
    };
    expect(calculateDeckProgress(deck)).toBe(33);
  });
});

describe('XP Calculation', () => {
  it('should calculate XP correctly for level 1', () => {
    expect(calculateXPForLevel(1)).toBe(500);
  });

  it('should calculate XP correctly for level 5', () => {
    expect(calculateXPForLevel(5)).toBe(2900);
  });

  it('should increase XP needed as level increases', () => {
    const xpLevel5 = calculateXPForLevel(5);
    const xpLevel10 = calculateXPForLevel(10);
    expect(xpLevel10).toBeGreaterThan(xpLevel5);
  });
});

describe('Achievement Validation', () => {
  it('should correctly identify unlocked achievement', () => {
    const achievement: Achievement = {
      id: 'a1',
      title: 'First Step',
      description: 'Complete first deck',
      icon: 'target',
      xpReward: 50,
      unlocked: true,
      color: 'bg-yellow-100',
    };
    expect(isAchievementUnlocked(achievement)).toBe(true);
  });

  it('should correctly identify locked achievement', () => {
    const achievement: Achievement = {
      id: 'a2',
      title: 'Master',
      description: 'Complete all decks',
      icon: 'crown',
      xpReward: 500,
      unlocked: false,
      color: 'bg-gold-100',
    };
    expect(isAchievementUnlocked(achievement)).toBe(false);
  });
});

describe('User Type Validation', () => {
  it('should validate user structure', () => {
    const user: User = {
      id: 'u1',
      name: 'Test User',
      level: 1,
      currentXP: 0,
      nextLevelXP: 500,
      totalXP: 0,
      streak: 0,
      longestStreak: 0,
      totalTimeSpent: 0,
      totalCardsLearned: 0,
      totalDecksCompleted: 0,
      totalCorrectAnswers: 0,
      totalAnswers: 0,
    };

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Test User');
    expect(user.level).toBeGreaterThanOrEqual(1);
    expect(user.currentXP).toBeLessThanOrEqual(user.nextLevelXP);
  });
});
