import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';

interface StudentDataSnapshot {
  name: string;
  level: number;
  totalXP: number;
  streak: number;
  longestStreak: number;
  totalCardsLearned: number;
  totalTimeSpent: number;
  totalCorrectAnswers: number;
  totalAnswers: number;
  subjectBreakdown: Array<{
    subject: string;
    sessionsCompleted: number;
    correctRate: number;
  }>;
  frequentlyIncorrectCards: Array<{
    front: string;
    back: string;
    deckTitle: string;
    subject: string;
    timesIncorrect: number;
    timesSeen: number;
  }>;
  weeklyProgress: Array<{
    date: string;
    cardsStudied: number;
    timeSpentMinutes: number;
  }>;
  cardStatusCounts: {
    new: number;
    learning: number;
    reviewing: number;
    mastered: number;
  };
}

export interface ProgressReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  subjectBreakdown: Array<{
    subject: string;
    performance: string;
    notes: string;
  }>;
  overallGrade: string;
  studyHabits: string;
  motivationalNote: string;
}

function buildFallbackReport(studentData: StudentDataSnapshot): ProgressReport {
  const accuracy = studentData.totalCorrectAnswers / Math.max(studentData.totalAnswers, 1);
  return {
    summary: `${studentData.name} este un elev activ care a acumulat ${studentData.totalXP} XP și a învățat ${studentData.totalCardsLearned} carduri. Nivelul actual este ${studentData.level}.`,
    strengths: [
      'Perseverență în studiu - menține un streak constant',
      'Bun la sesiuni de practică regulată',
      'Progres consistent în numărul de carduri masterizate',
    ],
    weaknesses: [
      'Unele materii necesită mai multă atenție',
      'Cardurile greșite frecvent indică lacune în anumite concepte',
    ],
    recommendations: [
      'Concentrează-te pe cardurile greșite frecvent folosind modul Smart',
      'Mărește timpul de studiu zilnic cu 5-10 minute',
      'Revizuiește conceptele dificile înainte de a trece la materie nouă',
    ],
    subjectBreakdown: studentData.subjectBreakdown.map(s => ({
      subject: s.subject,
      performance:
        s.correctRate >= 80
          ? 'Foarte bun'
          : s.correctRate >= 60
            ? 'Satisfăcător'
            : 'Necesită îmbunătățire',
      notes: `Rata de corectitudine: ${Math.round(s.correctRate)}%`,
    })),
    overallGrade:
      accuracy >= 0.8 ? 'bun' : accuracy >= 0.6 ? 'satisfăcător' : 'necesită îmbunătățire',
    studyHabits: `Elevul studiază în medie ${Math.round(studentData.totalTimeSpent / Math.max(studentData.weeklyProgress.length, 1))} minute pe zi.`,
    motivationalNote: 'Continuă să exersezi zilnic și vei vedea progrese semnificative!',
  };
}

export async function generateProgressReport(
  studentData: StudentDataSnapshot
): Promise<ProgressReport> {
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured, returning fallback report');
    return buildFallbackReport(studentData);
  }

  const ai = new GoogleGenAI({ apiKey });

  const successRate =
    studentData.totalAnswers > 0
      ? Math.round((studentData.totalCorrectAnswers / studentData.totalAnswers) * 100)
      : 0;

  const prompt = `
    Ești un profesor digital care analizează progresul unui elev de clasa a 8-a pe o platformă de flashcarduri educaționale.

    === DATELE ELEVULUI ===
    Nume: ${studentData.name}
    Nivel: ${studentData.level}
    XP Total: ${studentData.totalXP}
    Streak curent: ${studentData.streak} zile
    Cel mai lung streak: ${studentData.longestStreak} zile
    Carduri învățate total: ${studentData.totalCardsLearned}
    Timp total de studiu: ${studentData.totalTimeSpent} minute
    Răspunsuri corecte: ${studentData.totalCorrectAnswers} din ${studentData.totalAnswers} (${successRate}%)

    Status carduri:
    - Noi: ${studentData.cardStatusCounts.new}
    - În curs de învățare: ${studentData.cardStatusCounts.learning}
    - În revizuire: ${studentData.cardStatusCounts.reviewing}
    - Masterizate: ${studentData.cardStatusCounts.mastered}

    Breakdown pe materii:
    ${studentData.subjectBreakdown.map(s => `- ${s.subject}: ${s.sessionsCompleted} sesiuni, rată corectă: ${Math.round(s.correctRate)}%`).join('\n    ')}

    Carduri greșite frecvent (top probleme):
    ${studentData.frequentlyIncorrectCards
      .slice(0, 10)
      .map(
        c =>
          `- "${c.front}" (Deck: ${c.deckTitle}, Materie: ${c.subject}) - greșit de ${c.timesIncorrect}/${c.timesSeen} ori`
      )
      .join('\n    ')}

    Progresul din ultima săptămână:
    ${studentData.weeklyProgress.map(d => `- ${d.date}: ${d.cardsStudied} carduri studiate, ${d.timeSpentMinutes} min`).join('\n    ')}
    === SFÂRȘIT DATE ===

    Generează un raport detaliat de progres al elevului în limba ROMÂNĂ. Raportul trebuie să fie:
    - Constructiv și încurajator
    - Specific (referă-te la materii și concepte concrete)
    - Acționabil (recomandări practice)
    - Potrivit pentru un elev de clasa a 8-a care se pregătește pentru Evaluarea Națională

    Returnează JSON cu aceste câmpuri exact:
    - summary: Un paragraf rezumativ de 2-3 propoziții
    - strengths: Array de 2-4 puncte tari specifice
    - weaknesses: Array de 2-4 puncte slabe (formulate constructiv)
    - recommendations: Array de 3-5 recomandări concrete
    - subjectBreakdown: Array de obiecte {subject, performance, notes} pentru fiecare materie
    - overallGrade: Unul din: "excelent", "bun", "satisfăcător", "necesită îmbunătățire"
    - studyHabits: O propoziție despre obiceiurile de studiu
    - motivationalNote: Un mesaj motivațional personalizat
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            subjectBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  performance: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
              },
            },
            overallGrade: { type: Type.STRING },
            studyHabits: { type: Type.STRING },
            motivationalNote: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from AI');
    }

    return JSON.parse(text) as ProgressReport;
  } catch (error) {
    console.error('Error generating progress report with AI, falling back to local report:', error);
    return buildFallbackReport(studentData);
  }
}

export type { StudentDataSnapshot };
