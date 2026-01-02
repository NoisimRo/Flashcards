import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';

interface GeneratedCard {
  front: string;
  back: string;
  context: string;
  type: 'standard' | 'quiz';
  options?: string[];
  correctOptionIndex?: number;
}

export const generateDeckWithAI = async (
  subject: string,
  topic: string,
  difficulty: string,
  numberOfCards: number = 10
): Promise<GeneratedCard[]> => {
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured, returning mock data');
    // Fallback for demo purposes if no key is present
    const mockCards: GeneratedCard[] = [];
    for (let i = 1; i <= Math.min(numberOfCards, 3); i++) {
      // Generate mix: 60% standard, 40% quiz
      const isQuiz = i % 5 >= 3; // Makes roughly 40% quiz cards
      if (isQuiz) {
        mockCards.push({
          front: `Întrebare Quiz ${i} (${topic})`,
          back: `Răspuns Corect ${i}`,
          context: `Context pentru Quiz ${i}.`,
          type: 'quiz',
          options: [
            `Răspuns Corect ${i}`,
            `Răspuns Greșit ${i}A`,
            `Răspuns Greșit ${i}B`,
            `Răspuns Greșit ${i}C`,
          ],
          correctOptionIndex: 0,
        });
      } else {
        mockCards.push({
          front: `Exemplu Card ${i} (${topic})`,
          back: `Definiție ${i}`,
          context: `Acesta este un context pentru Exemplu Card ${i}.`,
          type: 'standard',
        });
      }
    }
    return mockCards;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Create ${numberOfCards} flashcards for 8th grade students preparing for the National Evaluation.
    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Generate a mix of card types:
    - 60% should be "standard" flashcards (type: "standard")
    - 40% should be "quiz" flashcards (type: "quiz")

    For each card, return a JSON object with:
    - front: The question or word
    - back: The definition, answer, or correct answer
    - context: A clear, eloquent sentence using the concept from "front" to demonstrate its meaning. The sentence should be in Romanian.
    - type: Either "standard" or "quiz"

    For "quiz" type cards, also include:
    - options: An array of 4 possible answers in Romanian (including the correct one from "back")
    - correctOptionIndex: The index (0-3) of the correct answer in the options array

    For "standard" type cards:
    - options should be null or undefined
    - correctOptionIndex should be null or undefined

    Make sure all content is appropriate for Romanian 8th grade students and uses proper Romanian language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              context: { type: Type.STRING },
              type: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                nullable: true,
              },
              correctOptionIndex: { type: Type.NUMBER, nullable: true },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawCards = JSON.parse(text);
    return rawCards.map((c: any) => {
      const cardType = c.type === 'quiz' ? 'quiz' : 'standard';
      const baseCard = {
        front: c.front,
        back: c.back,
        context: c.context,
        type: cardType as 'standard' | 'quiz',
      };

      // Add quiz-specific fields if it's a quiz card
      if (cardType === 'quiz' && c.options && Array.isArray(c.options)) {
        return {
          ...baseCard,
          options: c.options,
          correctOptionIndex: c.correctOptionIndex ?? 0,
        };
      }

      return baseCard;
    });
  } catch (error) {
    console.error('Error generating deck with AI:', error);
    throw error;
  }
};
