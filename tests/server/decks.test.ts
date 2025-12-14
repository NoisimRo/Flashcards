import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Card, Deck } from '../../types';

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
  const shuffleCards = (cards: Card[]): Card[] => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const filterCardsByStatus = (cards: Card[], status: Card['status']): Card[] => {
    return cards.filter(card => card.status === status);
  };

  const getStudyQueue = (cards: Card[], maxCards: number = 20): Card[] => {
    // Prioritize: new cards first, then learning, then mastered for review
    const newCards = filterCardsByStatus(cards, 'new');
    const learningCards = filterCardsByStatus(cards, 'learning');
    const masteredCards = filterCardsByStatus(cards, 'mastered');

    return [...newCards, ...learningCards, ...masteredCards].slice(0, maxCards);
  };

  const testCards: Card[] = [
    { id: '1', front: 'Q1', back: 'A1', type: 'standard', status: 'new' },
    { id: '2', front: 'Q2', back: 'A2', type: 'standard', status: 'learning' },
    { id: '3', front: 'Q3', back: 'A3', type: 'standard', status: 'mastered' },
    { id: '4', front: 'Q4', back: 'A4', type: 'standard', status: 'new' },
    { id: '5', front: 'Q5', back: 'A5', type: 'standard', status: 'learning' },
  ];

  it('should shuffle cards without losing any', () => {
    const shuffled = shuffleCards(testCards);
    expect(shuffled).toHaveLength(testCards.length);
    testCards.forEach(card => {
      expect(shuffled.find(c => c.id === card.id)).toBeDefined();
    });
  });

  it('should filter cards by status correctly', () => {
    const newCards = filterCardsByStatus(testCards, 'new');
    expect(newCards).toHaveLength(2);
    expect(newCards.every(c => c.status === 'new')).toBe(true);

    const learningCards = filterCardsByStatus(testCards, 'learning');
    expect(learningCards).toHaveLength(2);

    const masteredCards = filterCardsByStatus(testCards, 'mastered');
    expect(masteredCards).toHaveLength(1);
  });

  it('should prioritize cards correctly in study queue', () => {
    const queue = getStudyQueue(testCards);
    // New cards should come first
    expect(queue[0].status).toBe('new');
    expect(queue[1].status).toBe('new');
    // Then learning
    expect(queue[2].status).toBe('learning');
    expect(queue[3].status).toBe('learning');
    // Then mastered
    expect(queue[4].status).toBe('mastered');
  });

  it('should limit study queue to maxCards', () => {
    const queue = getStudyQueue(testCards, 3);
    expect(queue).toHaveLength(3);
  });
});

describe('Deck Statistics', () => {
  interface DeckStats {
    totalCards: number;
    masteredPercentage: number;
    learningPercentage: number;
    newPercentage: number;
    estimatedTimeMinutes: number;
  }

  const calculateDeckStats = (deck: Deck): DeckStats => {
    const total = deck.cards.length;
    if (total === 0) {
      return {
        totalCards: 0,
        masteredPercentage: 0,
        learningPercentage: 0,
        newPercentage: 0,
        estimatedTimeMinutes: 0,
      };
    }

    const mastered = deck.cards.filter(c => c.status === 'mastered').length;
    const learning = deck.cards.filter(c => c.status === 'learning').length;
    const newCards = deck.cards.filter(c => c.status === 'new').length;

    // Estimate: 30 seconds for mastered, 1 minute for learning, 2 minutes for new
    const estimatedTime = (mastered * 0.5 + learning * 1 + newCards * 2) / 60;

    return {
      totalCards: total,
      masteredPercentage: Math.round((mastered / total) * 100),
      learningPercentage: Math.round((learning / total) * 100),
      newPercentage: Math.round((newCards / total) * 100),
      estimatedTimeMinutes: Math.ceil(estimatedTime),
    };
  };

  it('should calculate correct statistics for deck', () => {
    const deck: Deck = {
      id: 'd1',
      title: 'Test Deck',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'B1',
      totalCards: 10,
      masteredCards: 5,
      cards: [
        { id: '1', front: 'Q1', back: 'A1', type: 'standard', status: 'mastered' },
        { id: '2', front: 'Q2', back: 'A2', type: 'standard', status: 'mastered' },
        { id: '3', front: 'Q3', back: 'A3', type: 'standard', status: 'learning' },
        { id: '4', front: 'Q4', back: 'A4', type: 'standard', status: 'learning' },
        { id: '5', front: 'Q5', back: 'A5', type: 'standard', status: 'new' },
      ],
    };

    const stats = calculateDeckStats(deck);
    expect(stats.totalCards).toBe(5);
    expect(stats.masteredPercentage).toBe(40);
    expect(stats.learningPercentage).toBe(40);
    expect(stats.newPercentage).toBe(20);
  });

  it('should handle empty deck', () => {
    const deck: Deck = {
      id: 'd2',
      title: 'Empty Deck',
      subject: 'Test',
      topic: 'Test',
      difficulty: 'A1',
      totalCards: 0,
      masteredCards: 0,
      cards: [],
    };

    const stats = calculateDeckStats(deck);
    expect(stats.totalCards).toBe(0);
    expect(stats.masteredPercentage).toBe(0);
    expect(stats.estimatedTimeMinutes).toBe(0);
  });
});
