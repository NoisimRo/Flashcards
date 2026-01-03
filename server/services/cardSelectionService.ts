/**
 * Card Selection Service
 * Handles logic for selecting cards for study sessions
 */

interface Card {
  id: string;
  position: number;
  // Add other card fields as needed
}

interface UserCardProgress {
  cardId: string;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
  nextReviewDate: string | null;
}

export type SelectionMethod = 'random' | 'smart' | 'manual' | 'all';

/**
 * Select cards for a study session
 */
export function selectCardsForSession(
  allCards: Card[],
  cardProgress: UserCardProgress[],
  method: SelectionMethod,
  options: {
    cardCount?: number;
    selectedCardIds?: string[];
    excludeMastered?: boolean;
  }
): {
  selectedCards: Card[];
  availableCount: number;
  masteredCount: number;
} {
  const { cardCount, selectedCardIds, excludeMastered = true } = options;

  // Build a map of card progress for quick lookup
  const progressMap = new Map<string, UserCardProgress>();
  cardProgress.forEach(p => progressMap.set(p.cardId, p));

  // Filter out mastered cards if requested
  let availableCards = allCards;
  let masteredCount = 0;

  if (excludeMastered) {
    availableCards = allCards.filter(card => {
      const progress = progressMap.get(card.id);
      const isMastered = progress?.status === 'mastered';
      if (isMastered) masteredCount++;
      return !isMastered;
    });
  }

  const availableCount = availableCards.length;

  // Select cards based on method
  let selectedCards: Card[];

  switch (method) {
    case 'all':
      selectedCards = [...availableCards];
      break;

    case 'random':
      selectedCards = selectRandom(availableCards, cardCount || availableCards.length);
      break;

    case 'smart':
      selectedCards = selectSmart(availableCards, progressMap, cardCount || availableCards.length);
      break;

    case 'manual':
      if (!selectedCardIds || selectedCardIds.length === 0) {
        throw new Error('Manual selection requires selectedCardIds');
      }
      selectedCards = selectManual(availableCards, selectedCardIds);
      break;

    default:
      throw new Error(`Unknown selection method: ${method}`);
  }

  return {
    selectedCards,
    availableCount,
    masteredCount,
  };
}

/**
 * Random selection - shuffle and take N cards
 */
function selectRandom(cards: Card[], count: number): Card[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, cards.length));
}

/**
 * Smart selection - prioritize cards due for review
 * 1. Cards with nextReviewDate <= today (due for review)
 * 2. New cards (no progress)
 * 3. Other cards (random)
 */
function selectSmart(
  cards: Card[],
  progressMap: Map<string, UserCardProgress>,
  count: number
): Card[] {
  const today = new Date().toISOString().split('T')[0];

  // Categorize cards
  const dueCards: Card[] = [];
  const newCards: Card[] = [];
  const otherCards: Card[] = [];

  cards.forEach(card => {
    const progress = progressMap.get(card.id);

    if (!progress) {
      // No progress = new card
      newCards.push(card);
    } else if (progress.nextReviewDate && progress.nextReviewDate <= today) {
      // Due for review
      dueCards.push(card);
    } else {
      // Other cards
      otherCards.push(card);
    }
  });

  // Priority: due > new > other
  const selected: Card[] = [];

  // Add due cards first
  selected.push(...dueCards);

  // Add new cards if we need more
  if (selected.length < count) {
    const remaining = count - selected.length;
    selected.push(...newCards.slice(0, remaining));
  }

  // Add other cards if we still need more
  if (selected.length < count) {
    const remaining = count - selected.length;
    const shuffledOther = [...otherCards].sort(() => Math.random() - 0.5);
    selected.push(...shuffledOther.slice(0, remaining));
  }

  return selected.slice(0, count);
}

/**
 * Manual selection - select specific cards by ID
 */
function selectManual(cards: Card[], selectedIds: string[]): Card[] {
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const selected: Card[] = [];

  selectedIds.forEach(id => {
    const card = cardMap.get(id);
    if (card) {
      selected.push(card);
    }
  });

  return selected;
}

/**
 * Calculate SM-2 values for card progress update
 * Based on answer quality (0 = complete blackout, 5 = perfect response)
 */
export function calculateSM2Update(
  currentProgress: {
    easeFactor: number;
    interval: number;
    repetitions: number;
  },
  quality: number // 0-5
): {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
} {
  // Ensure quality is 0-5
  const q = Math.max(0, Math.min(5, quality));

  let { easeFactor, interval, repetitions } = currentProgress;

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Ease factor minimum is 1.3
  easeFactor = Math.max(1.3, easeFactor);

  // If quality < 3, reset repetitions and interval
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    // Quality >= 3, successful review
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  }

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  // Determine status
  let status: 'new' | 'learning' | 'reviewing' | 'mastered';
  if (repetitions === 0) {
    status = 'new';
  } else if (repetitions <= 2) {
    status = 'learning';
  } else if (repetitions <= 5 || interval < 21) {
    status = 'reviewing';
  } else {
    status = 'mastered';
  }

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    status,
  };
}
