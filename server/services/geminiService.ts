import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';

interface GeneratedCard {
  front: string;
  back: string;
  context: string;
  tag: string;
  type: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer';
  options?: string[];
  correctOptionIndices?: number[]; // For quiz (single), multiple-answer (multiple), and type-answer (correct options)
}

export const generateDeckWithAI = async (
  subject: string,
  topic: string,
  difficulty: string,
  numberOfCards: number = 10,
  cardTypes: Array<'standard' | 'quiz' | 'type-answer' | 'multiple-answer'> = ['standard', 'quiz'],
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
          tag: `${topic}`,
          type: 'quiz',
          options: [
            `Răspuns Corect ${i}`,
            `Răspuns Greșit ${i}A`,
            `Răspuns Greșit ${i}B`,
            `Răspuns Greșit ${i}C`,
          ],
          correctOptionIndices: [0],
        });
      } else if (cardType === 'multiple-answer') {
        mockCards.push({
          front: `Care sunt caracteristicile ${topic} ${i}?`,
          back: `Răspunsuri corecte: A și C`,
          context: `Context pentru Răspuns Multiplu ${i}.`,
          tag: `${topic}`,
          type: 'multiple-answer',
          options: [
            `Răspuns Corect ${i}A`,
            `Răspuns Greșit ${i}B`,
            `Răspuns Corect ${i}C`,
            `Răspuns Greșit ${i}D`,
          ],
          correctOptionIndices: [0, 2],
        });
      } else if (cardType === 'type-answer') {
        mockCards.push({
          front: `Care este ${topic} ${i}?`,
          back: `Explicație: Răspunsul corect este Răspuns${i} deoarece...`,
          context: `Context pentru ${topic} ${i}.`,
          tag: `${topic}`,
          type: 'type-answer',
          options: [
            `Răspuns${i}`,
            `Sinonim${i}`,
            `Greșeală Frecventă ${i}A`,
            `Greșeală Frecventă ${i}B`,
          ],
          correctOptionIndices: [0, 1],
        });
      } else {
        mockCards.push({
          front: `Exemplu Card ${i} (${topic})`,
          back: `Definiție ${i}`,
          context: `Acesta este un context pentru Exemplu Card ${i}.`,
          tag: `${topic}`,
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
      `- "quiz": Multiple choice question with 4 options and correctOptionIndices array with single element (e.g., [2] if option 3 is correct)`
    );
  }
  if (cardTypes.includes('type-answer')) {
    cardTypeDescriptions.push(
      `- "type-answer": Short answer question where user types the answer. Include "options" with correct answers AND common pitfalls/mistakes, and "correctOptionIndices" marking which are correct. "back" is feedback/explanation text.`
    );
  }
  if (cardTypes.includes('multiple-answer')) {
    cardTypeDescriptions.push(
      `- "multiple-answer": Multiple choice question with 4 options where 1-4 can be correct, uses correctOptionIndices array (e.g., [0, 2] if options 1 and 3 are correct)`
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
    Create ${numberOfCards} flashcards for students studying the given subject.
    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}
    Language: ${languageName}
    ${extraContextSection}
    Generate an even mix of these card types (${typeDistribution}):
    ${cardTypeDescriptions.join('\n    ')}

    For each card, return a JSON object with:
    - front: The question or word
    - back: The definition, correct answer, explanation for correct answer
    - context: A hint that helps the user to discover the correct answer. Use the concept from "front" but do not revele it directly.
    - tag: A short topic/subtopic label (1-3 words) that categorizes this specific card within the broader "${subject} > ${topic}" scope. For example: "Accente", "Verbe Auxiliare", "Ecuații liniare", "Revoluția de la 1848". The tag must be in ${languageName}.
    - type: One of: ${cardTypes.map(t => `"${t}"`).join(', ')}

    CONTEXT RULES
    The context is a HINT, not a spoiler.
     ✅ **DO:**
     - Provide clues that guide thinking
     - Reference related concepts
     - Use indirect descriptions

    ❌ **DON'T:**
    - Reveal the answer directly
    - Use the exact term from the answer
    - Make the hint too obvious

    **Good example:**
    - Front: "Câte sunete are cuvântul ""ochean""?"
    - Back: "4"
    - Context: "Grupul ""che"" + vocala ""e"" ascund cheia numărătorii." ✅

    **Bad example:**
    - Context: "Răspunsul este 4 sunete." ❌

    STRICT CONSTRAINT FOR QUESTIONS/OPTIONS:
    - HARD LIMIT - The "front" field (question) must NEVER exceed 100 characters with spaces
    - HARD LIMIT - The "back" field (standard/multiple answer) must NEVER exceed 150 characters with spaces
    - HARD LIMIT - The "option" field (quiz/multiple answer) must NEVER exceed 50 characters with spaces

    Type-specific requirements:
    - For "quiz" cards:
      * Include "options" (array of 4 answers) and "correctOptionIndices" (array with single index, e.g., [2] for option 3)
      * When contextually relevant, generate these quiz sub-types:
        - True/False: Rapid-fire statements for quick conceptual validation
    - For "multiple-answer" cards:
      * Include "options" (array of 4 answers) and "correctOptionIndices" (array of indices, e.g., [0, 2])
      * At least 1 option must be correct, but 2, 3, or all 4 can also be correct
      * Use for questions where multiple facts/answers are valid (e.g., "Care sunt caracteristicile X?")
    - For "type-answer" cards:
      * Include "options" (array of 4 answers: correct answer(s) AND common pitfalls/mistakes students often make)
      * Include "correctOptionIndices" (array of indices for the correct options, e.g., [0, 1] if first two are correct)
      * At least 1 option must be correct (can be 1-3 correct), remaining options should be common mistakes/pitfalls
      * "back" should be feedback/explanation text (NOT the canonical answer) that helps the student understand why the answer is correct
      * Example: Question: "Scrie un sinonim pentru „frumos"" → options: ["plăcut", "atrăgător", "urât", "greu"], correctOptionIndices: [0, 1], back: "Sinonimele sunt cuvinte cu sens asemănător..."
      * When contextually relevant, generate Cloze Deletion (Fill-in-the-blanks): Sentences with hidden key terms using ____ placeholder
    - For "standard" cards: No options needed

    LANGUAGE REQUIREMENT:
    All content (questions, answers, options, and context sentences) must be written in ${languageName}.
    Ensure all content is appropriate for students at the specified difficulty level.
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
              tag: { type: Type.STRING },
              type: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                nullable: true,
              },
              correctOptionIndices: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                nullable: true,
              },
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
      let cardType: 'standard' | 'quiz' | 'type-answer' | 'multiple-answer' = 'standard';
      if (c.type === 'quiz') cardType = 'quiz';
      else if (c.type === 'type-answer') cardType = 'type-answer';
      else if (c.type === 'multiple-answer') cardType = 'multiple-answer';

      const baseCard = {
        front: c.front,
        back: c.back,
        context: c.context,
        tag: c.tag || '',
        type: cardType,
      };

      // Add options fields for quiz, multiple-answer, and type-answer cards
      if (
        (cardType === 'quiz' || cardType === 'multiple-answer' || cardType === 'type-answer') &&
        c.options &&
        Array.isArray(c.options)
      ) {
        return {
          ...baseCard,
          options: c.options,
          correctOptionIndices: c.correctOptionIndices ?? [0],
        };
      }

      return baseCard;
    });
  } catch (error) {
    console.error('Error generating deck with AI:', error);
    throw error;
  }
};
