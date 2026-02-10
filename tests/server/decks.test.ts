import { describe, it, expect } from 'vitest';
import type { Card } from '../../src/types';

// Test-specific Card type with minimal required fields
type TestCard = Pick<Card, 'id' | 'front' | 'back' | 'type'>;

// Spaced repetition algorithm tests
describe('Spaced Repetition Algorithm', () => {
  interface ReviewResult {
    quality: number; // 0-5 scale
    easeFactor: number;
    interval: number;
    repetitions: number;
  }

  // SM-2 Algorithm implementation
  const calculateNextReview = (
    quality: number,
    easeFactor: number = 2.5,
    interval: number = 1,
    repetitions: number = 0
  ): ReviewResult => {
    let newEaseFactor = easeFactor;
    let newInterval = interval;
    let newRepetitions = repetitions;

    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * easeFactor);
      }
      newRepetitions = repetitions + 1;
    } else {
      // Incorrect response - reset
      newRepetitions = 0;
      newInterval = 1;
    }

    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    return {
      quality,
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
    };
  };

  it('should set interval to 1 for first correct response', () => {
    const result = calculateNextReview(4, 2.5, 1, 0);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('should set interval to 6 for second correct response', () => {
    const result = calculateNextReview(4, 2.5, 1, 1);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('should multiply interval by ease factor after repetition 2', () => {
    const result = calculateNextReview(4, 2.5, 6, 2);
    expect(result.interval).toBe(15); // 6 * 2.5 = 15
    expect(result.repetitions).toBe(3);
  });

  it('should reset on incorrect response', () => {
    const result = calculateNextReview(2, 2.5, 15, 5);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('should not let ease factor go below 1.3', () => {
    const result = calculateNextReview(0, 1.3, 1, 0);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('should increase ease factor for perfect responses', () => {
    const result = calculateNextReview(5, 2.5, 1, 0);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });
});

describe('Deck Operations', () => {
  const shuffleCards = (cards: TestCard[]): TestCard[] => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const testCards: TestCard[] = [
    { id: '1', front: 'Q1', back: 'A1', type: 'standard' },
    { id: '2', front: 'Q2', back: 'A2', type: 'standard' },
    { id: '3', front: 'Q3', back: 'A3', type: 'standard' },
    { id: '4', front: 'Q4', back: 'A4', type: 'standard' },
    { id: '5', front: 'Q5', back: 'A5', type: 'standard' },
  ];

  it('should shuffle cards without losing any', () => {
    const shuffled = shuffleCards(testCards);
    expect(shuffled).toHaveLength(testCards.length);
    testCards.forEach(card => {
      expect(shuffled.find(c => c.id === card.id)).toBeDefined();
    });
  });
});
