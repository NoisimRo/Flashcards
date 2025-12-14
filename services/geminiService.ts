import { GoogleGenAI, Type } from '@google/genai';
import { Card } from '../types';

export const generateDeckWithAI = async (
  subject: string,
  topic: string,
  difficulty: string
): Promise<Card[]> => {
  if (!process.env.API_KEY) {
    console.warn('API Key missing, returning mock data');
    // Fallback for demo purposes if no key is present
    return [
      {
        id: 'ai1',
        front: `Exemplu Card 1 (${topic})`,
        back: 'Definiție 1',
        context: `Acesta este un context pentru Exemplu Card 1.`,
        type: 'standard',
        status: 'new',
      },
      {
        id: 'ai2',
        front: `Exemplu Card 2 (${topic})`,
        back: 'Definiție 2',
        context: `Acesta este un context pentru Exemplu Card 2.`,
        type: 'standard',
        status: 'new',
      },
    ];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    return rawCards.map((c: any, index: number) => ({
      ...c,
      id: `ai-${Date.now()}-${index}`,
      status: 'new',
      options: [],
      correctOptionIndex: 0,
    }));
  } catch (error) {
    console.error('Error generating deck:', error);
    throw error;
  }
};
