import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';

interface GeneratedCard {
  front: string;
  back: string;
  context: string;
  type: string;
}

export const generateDeckWithAI = async (
  subject: string,
  topic: string,
  difficulty: string
): Promise<GeneratedCard[]> => {
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured, returning mock data');
    // Fallback for demo purposes if no key is present
    return [
      {
        front: `Exemplu Card 1 (${topic})`,
        back: 'Definiție 1',
        context: `Acesta este un context pentru Exemplu Card 1.`,
        type: 'standard',
      },
      {
        front: `Exemplu Card 2 (${topic})`,
        back: 'Definiție 2',
        context: `Acesta este un context pentru Exemplu Card 2.`,
        type: 'standard',
      },
    ];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Create 5 flashcards for 8th grade students preparing for the National Evaluation.
    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Return a JSON array where each object has:
    - front: The question or word
    - back: The definition, answer, or synonym
    - context: A clear, eloquent sentence using the word (from "front") to demonstrate its meaning. The sentence should be in Romanian.
    - type: "standard"
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
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawCards = JSON.parse(text);
    return rawCards.map((c: any) => ({
      front: c.front,
      back: c.back,
      context: c.context,
      type: c.type || 'standard',
    }));
  } catch (error) {
    console.error('Error generating deck with AI:', error);
    throw error;
  }
};
