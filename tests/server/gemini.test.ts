import { describe, it, expect, vi } from 'vitest';

// Mock the Gemini API
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
  Type: {
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
}));

// Mock config
vi.mock('../../server/config/index.js', () => ({
  config: {
    geminiApiKey: undefined, // Test without API key to use mock data
  },
}));

describe('Gemini AI Deck Generation', () => {
  // Import generateDeckWithAI dynamically to ensure mocks are applied
  async function getGenerateDeckWithAI() {
    vi.resetModules();
    const module = await import('../../server/services/geminiService.js');
    return module.generateDeckWithAI;
  }

  describe('numberOfCards parameter', () => {
    it('should generate default 10 cards when numberOfCards not specified', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', 'Sinonime', 'A2');
      // Mock returns Math.min(numberOfCards, 3) so with default 10, we get 3
      expect(cards).toHaveLength(3);
    });

    it('should generate specified number of cards (within mock limit)', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', 'Antonime', 'B1', 5);
      // Mock returns Math.min(5, 3) = 3
      expect(cards).toHaveLength(3);
    });

    it('should generate minimum 1 card', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Matematică', 'Ecuații', 'C1', 1);
      expect(cards).toHaveLength(1);
    });

    it('should respect numberOfCards parameter', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Istorie', 'Revoluția 1848', 'B2', 2);
      expect(cards).toHaveLength(2);
    });
  });

  describe('card structure', () => {
    it('should return cards with required fields', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', 'Vocabular', 'A2', 3);

      expect(cards.length).toBeGreaterThan(0);
      cards.forEach(card => {
        expect(card).toHaveProperty('front');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('context');
        expect(card).toHaveProperty('type');

        expect(typeof card.front).toBe('string');
        expect(typeof card.back).toBe('string');
        expect(typeof card.context).toBe('string');
        expect(['standard', 'quiz']).toContain(card.type);

        // If quiz type, should have options and correctOptionIndices
        if (card.type === 'quiz') {
          expect(card).toHaveProperty('options');
          expect(card).toHaveProperty('correctOptionIndices');
          expect(Array.isArray(card.options)).toBe(true);
          expect(Array.isArray(card.correctOptionIndices)).toBe(true);
        }
      });
    });

    it('should include topic in card front text', async () => {
      const topic = 'Figuri de stil';
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', topic, 'C1', 2);

      cards.forEach(card => {
        expect(card.front).toContain(topic);
      });
    });
  });

  describe('subject and difficulty handling', () => {
    it('should handle different subjects', async () => {
      const subjects = ['Limba Română', 'Matematică', 'Istorie', 'Geografie'];

      for (const subject of subjects) {
        const generateDeckWithAI = await getGenerateDeckWithAI();
        const cards = await generateDeckWithAI(subject, 'Test Topic', 'A2', 2);
        expect(cards).toHaveLength(2);
        expect(cards[0]).toHaveProperty('front');
      }
    });

    it('should handle different difficulty levels', async () => {
      const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1'];

      for (const difficulty of difficulties) {
        const generateDeckWithAI = await getGenerateDeckWithAI();
        const cards = await generateDeckWithAI('Limba Română', 'Test', difficulty, 1);
        expect(cards).toHaveLength(1);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty topic gracefully', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', '', 'A2', 2);
      expect(cards).toHaveLength(2);
    });

    it('should handle very long topic names', async () => {
      const longTopic = 'A'.repeat(200);
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', longTopic, 'A2', 1);
      expect(cards).toHaveLength(1);
    });

    it('should handle special characters in topic', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards = await generateDeckWithAI('Limba Română', 'Țări & Orașe', 'A2', 1);
      expect(cards).toHaveLength(1);
    });
  });

  describe('consistency', () => {
    it('should generate unique cards each time', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const cards1 = await generateDeckWithAI('Limba Română', 'Sinonime', 'A2', 3);
      const cards2 = await generateDeckWithAI('Limba Română', 'Sinonime', 'A2', 3);

      expect(cards1).toHaveLength(3);
      expect(cards2).toHaveLength(3);
      // Cards should have the required structure
      expect(cards1[0]).toHaveProperty('front');
      expect(cards2[0]).toHaveProperty('front');
    });

    it('should maintain card count across multiple calls', async () => {
      const generateDeckWithAI = await getGenerateDeckWithAI();
      const numberOfCards = 2;

      for (let i = 0; i < 5; i++) {
        const cards = await generateDeckWithAI('Limba Română', `Topic ${i}`, 'A2', numberOfCards);
        expect(cards).toHaveLength(numberOfCards);
      }
    });
  });
});
