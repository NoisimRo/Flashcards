import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';

interface GeneratedCard {
  front: string;
  back: string;
  context: string;
  type: 'standard' | 'quiz' | 'type-answer';
  options?: string[];
  correctOptionIndex?: number;
}

export const generateDeckWithAI = async (
  subject: string,
  topic: string,
  difficulty: string,
  numberOfCards: number = 10,
  cardTypes: Array<'standard' | 'quiz' | 'type-answer'> = ['standard', 'quiz'],
  language: string = 'ro',
  extraContext?: string
): Promise<GeneratedCard[]> => {
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured, returning mock data');
    // Fallback for demo purposes if no key is present
    const mockCards: GeneratedCard[] = [];
    for (let i = 1; i <= Math.min(numberOfCards, 3); i++) {
      // Distribute evenly among selected card types
      const typeIndex = i % cardTypes.length;
      const cardType = cardTypes[typeIndex];

      if (cardType === 'quiz') {
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
      } else if (cardType === 'type-answer') {
        mockCards.push({
          front: `Care este ${topic} ${i}?`,
          back: `Răspuns${i}`,
          context: `Context pentru ${topic} ${i}.`,
          type: 'type-answer',
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

  // Build card type instructions dynamically
  const cardTypeDescriptions = [];
  if (cardTypes.includes('standard')) {
    cardTypeDescriptions.push(
      `- "standard": Traditional flashcard with question and detailed answer`
    );
  }
  if (cardTypes.includes('quiz')) {
    cardTypeDescriptions.push(
      `- "quiz": Multiple choice question with 4 options and correctOptionIndex (0-3)`
    );
  }
  if (cardTypes.includes('type-answer')) {
    cardTypeDescriptions.push(
      `- "type-answer": Short answer question (suitable for 1-2 word answers like names, dates, or simple terms)`
    );
  }

  // Calculate distribution percentage
  const percentagePerType = Math.floor(100 / cardTypes.length);
  const typeDistribution = cardTypes.map(type => `${percentagePerType}% "${type}"`).join(', ');

  // Get language name for prompt
  const getLanguageName = (code: string): string => {
    const languageMap: Record<string, string> = {
      ro: 'Romanian',
      en: 'English',
      it: 'Italian',
    };
    return languageMap[code] || 'Romanian';
  };

  const languageName = getLanguageName(language);

  // Build extra context section if provided
  const extraContextSection = extraContext?.trim()
    ? `
    === USER-PROVIDED CONTEXT ===
    The user has provided additional context, examples, or guidelines to help shape the cards:

    ${extraContext.trim()}

    Please carefully consider this input when generating the cards. If examples are provided, mirror their style, complexity, and format.
    === END CONTEXT ===
    `
    : '';

  const prompt = `
    Create ${numberOfCards} flashcards for 8th grade students preparing for the National Evaluation.
    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}
    Language: ${languageName}
    ${extraContextSection}
    Generate an even mix of these card types (${typeDistribution}):
    ${cardTypeDescriptions.join('\n    ')}

    For each card, return a JSON object with:
    - front: The question or word
    - back: The definition, answer, or correct answer
    - context: A clear, eloquent sentence using the concept from "front" to demonstrate its meaning.
    - type: One of: ${cardTypes.map(t => `"${t}"`).join(', ')}

    STRICT CONSTRAINT FOR QUESTIONS:
    - The "front" field (question) must NEVER exceed 100 characters with spaces
    - Keep questions concise and direct
    - This is a HARD LIMIT - questions longer than 100 characters are invalid

    Type-specific requirements:
    - For "quiz" cards:
      * Include "options" (array of 4 answers) and "correctOptionIndex" (0-3)
      * When contextually relevant, generate these quiz sub-types:
        - Cloze Deletion (Fill-in-the-blanks): Sentences with hidden key terms using context to help recall
        - True/False: Rapid-fire statements for quick conceptual validation
      * Use standard multiple choice format when above sub-types don't fit
    - For "type-answer" cards: Keep "back" short (1-2 words), no options needed
    - For "standard" cards: No options needed

    LANGUAGE REQUIREMENT:
    All content (questions, answers, options, and context sentences) must be written in ${languageName}.
    Ensure all content is appropriate for 8th grade students.
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
      // Validate card type
      let cardType: 'standard' | 'quiz' | 'type-answer' = 'standard';
      if (c.type === 'quiz') cardType = 'quiz';
      else if (c.type === 'type-answer') cardType = 'type-answer';

      const baseCard = {
        front: c.front,
        back: c.back,
        context: c.context,
        type: cardType,
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
