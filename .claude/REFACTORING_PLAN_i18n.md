# 🏗️ Plan de Rearhitecturare: Store-Driven Modular + i18n

**Scop**: Transformarea aplicației Flashcards într-o arhitectură modulară, scalabilă și multi-limbă

**Limbi țintă**: Română (RO), Engleză (EN), Italiană (IT) + scalabilitate la alte limbi

**Data creării**: 2026-01-11
**Versiune**: Draft v1.0

---

## 📋 Cuprins

1. [Analiza Arhitecturii Actuale](#1-analiza-arhitecturii-actuale)
2. [Viziunea Arhitecturii Țintă](#2-viziunea-arhitecturii-țintă)
3. [Plan de Rearhitecturare (3 Etape)](#3-plan-de-rearhitecturare-3-etape)
4. [Integrare i18n (Internationalizare)](#4-integrare-i18n-internationalizare)
5. [Plan de Testare](#5-plan-de-testare)
6. [Estimări și Dependențe](#6-estimări-și-dependențe)
7. [Draft Prompt pentru Next Session](#7-draft-prompt-pentru-next-session)

---

## 1. Analiza Arhitecturii Actuale

### 🔴 Probleme Critice Identificate

#### A. Monolitul StudySession.tsx (1600 linii)
**Simptome**:
- God Component: gestionează UI + state + business logic + animations
- Greu de testat, debug și extins
- Props pollution: 10 props, unele neutilizate (onEditCard, onDeleteCard)

**Impact**:
- ⏱️ Development time crescut pentru noi features
- 🐛 Buguri greu de reprodus și fixat
- 👥 Onboarding dificil pentru dezvoltatori noi

#### B. Redundanță de State Management
**Simptome**:
- State duplicat între StudySession.tsx (local) și studySessionsStore (Zustand)
- Data transformation overhead în StudySessionPlayer.tsx (Session → Deck)
- Risk de inconsistență: dashboard arată date diferite de session player

**Exemplu concret**:
```typescript
// StudySessionPlayer.tsx - transformare costisitoare
const deck: Deck = {
  cards: currentSession.cards.map(card => {
    const progress = currentSession.cardProgress?.[card.id];
    let status: 'new' | 'learning' | 'mastered' = 'new';
    // ... 15 linii de mapping logic
  })
}
```

**Impact**:
- 🔄 Auto-save inconsistent (local state ≠ backend state)
- 📊 Dashboard stats out-of-sync cu session progress
- 💾 Overhead de transformări repetate la fiecare render

#### C. Lipsa de i18n Infrastructure
**Simptome**:
- Text hardcodat în componente: "Creează sesiune", "Deck-uri Globale"
- Mixaj de limbaje în cod (ro/en): variabile în engleză, UI în română
- Nu există strategie de traduceri pentru conținut dinamic (card content)

**Impact**:
- 🌍 Imposibil de lansat pe piețe internaționale
- 🔧 Maintenance overhead (schimbare text = modificare cod)
- 🧪 Testing dificil (nu poți testa UI în diferite limbi)

---

## 2. Viziunea Arhitecturii Țintă

### 🎯 Principii Arhitecturale

#### Principiul 1: Single Source of Truth (Zustand Store)
```
❌ ÎNAINTE: UI Component → Local State → Save to API → Store Update
✅ DUPĂ:   UI Component → Store Action → Store State + API Sync
```

**Beneficii**:
- Dashboard și Session Player citesc din același store → consistent data
- Auto-save devine trivial (store subscription)
- Undo/redo devine posibil (time-travel debugging)

#### Principiul 2: Atomic Design Hierarchy
```
Atoms (cele mai simple)
  ├─ Button
  ├─ Input
  └─ Icon

Molecules (combină atoms)
  ├─ CardHeader (icon + title)
  ├─ StreakBadge (icon + number)
  └─ XPIndicator (icon + progress bar)

Organisms (combină molecules)
  ├─ StandardCard (header + content + footer)
  ├─ QuizCard (header + options + footer)
  └─ TypeAnswerCard (header + input + footer)

Templates (layout)
  └─ StudySessionLayout (header + card display + controls)

Pages (integrate everything)
  └─ StudySessionPage (folosește template + data din store)
```

**Beneficii**:
- Fiecare component <200 linii
- Testare izolată (QuizCard nu depinde de StudySession)
- Reusability maximă (StreakBadge poate fi folosit în Dashboard)

#### Principiul 3: i18n First
```
❌ ÎNAINTE: <button>Creează sesiune</button>
✅ DUPĂ:   <button>{t('session.create')}</button>
```

**Strategia de traduceri**:
- **UI static** → JSON translation files (react-i18next)
- **Conținut dinamic** (carduri) → Database-driven (table: `card_translations`)
- **Fallback logic** → ro → en → key

---

## 3. Plan de Rearhitecturare (3 Etape)

### 📦 Etapa 1: "Heart Transplant" (Centralizare în Store)

**Obiectiv**: Mută business logic din StudySession.tsx în studySessionsStore.ts

**Durată estimată**: 1 săptămână (5 zile lucrătoare)

#### Week 1, Day 1-2: Migrate State to Store

**Acțiuni**:
1. **Extinde studySessionsStore.ts** cu state management complet:
   ```typescript
   // Înainte (parțial)
   interface StudySessionsStore {
     currentSession: Session | null;
     loadSession: (id: string) => Promise<void>;
   }

   // După (complet)
   interface StudySessionsStore {
     // Core state
     currentSession: Session | null;
     currentCardIndex: number;
     answers: Record<string, 'correct' | 'incorrect' | 'skipped'>;
     streak: number;
     sessionXP: number;

     // UI state
     isCardFlipped: boolean;
     hintRevealed: boolean;
     selectedQuizOption: number | null;

     // Actions
     loadSession: (id: string) => Promise<void>;
     flipCard: () => void;
     answerCard: (cardId: string, isCorrect: boolean) => void;
     skipCard: (cardId: string) => void;
     nextCard: () => void;
     undoLastAnswer: () => void;
     completeSession: () => Promise<SessionCompletionResult>;

     // Auto-save
     enableAutoSave: (interval?: number) => void;
     disableAutoSave: () => void;
   }
   ```

2. **Implementează XP Calculation în store**:
   ```typescript
   // store/studySessionsStore.ts
   const calculateXP = (isCorrect: boolean, streak: number, difficulty: Difficulty): number => {
     const baseXP = {
       A1: 5, A2: 8, B1: 12, B2: 15, C1: 20, C2: 25
     }[difficulty];

     if (!isCorrect) return 0;

     const streakMultiplier = Math.min(1 + (streak * 0.1), 2.5); // Max 2.5x
     return Math.floor(baseXP * streakMultiplier);
   };

   answerCard: (cardId, isCorrect) => {
     const currentCard = get().getCurrentCard();
     const xpEarned = calculateXP(isCorrect, get().streak, currentCard.difficulty);

     set(state => ({
       answers: { ...state.answers, [cardId]: isCorrect ? 'correct' : 'incorrect' },
       streak: isCorrect ? state.streak + 1 : 0,
       sessionXP: state.sessionXP + xpEarned
     }));

     // Auto-sync to backend
     get().syncProgress();
   }
   ```

3. **Remove local state din StudySession.tsx**:
   ```typescript
   // ❌ Șterge acestea din StudySession.tsx:
   const [answers, setAnswers] = useState<Record<string, AnswerStatus>>({});
   const [streak, setStreak] = useState(0);
   const [sessionXP, setSessionXP] = useState(0);
   const [currentIndex, setCurrentIndex] = useState(0);

   // ✅ Înlocuiește cu:
   import { useStudySessionsStore } from '../store/studySessionsStore';

   const StudySession = ({ sessionId }) => {
     const {
       answers,
       streak,
       sessionXP,
       currentCardIndex,
       answerCard,
       flipCard,
       nextCard
     } = useStudySessionsStore();

     // Nu mai gestionăm state local!
   }
   ```

**Success Criteria (Week 1, Day 2)**:
- ✅ All business logic moved to store
- ✅ StudySession.tsx consumă doar din store (no local state)
- ✅ Dashboard și Session Player arată aceleași date
- ✅ Auto-save funcționează consistent (fără data transformation)

#### Week 1, Day 3-4: Implement Auto-Save in Store

**Acțiuni**:
1. **Subscription-based auto-save**:
   ```typescript
   // store/studySessionsStore.ts
   let autoSaveTimer: NodeJS.Timeout | null = null;

   enableAutoSave: (intervalMs = 30000) => {
     if (autoSaveTimer) clearInterval(autoSaveTimer);

     autoSaveTimer = setInterval(() => {
       const state = get();
       if (!state.currentSession) return;

       // Sync doar dacă există modificări
       if (state.isDirty) {
         state.syncProgress();
       }
     }, intervalMs);
   },

   syncProgress: async () => {
     const state = get();
     const elapsedSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);

     await updateSessionProgress(state.currentSession.id, {
       currentCardIndex: state.currentCardIndex,
       answers: state.answers,
       streak: state.streak,
       sessionXP: state.sessionXP,
       durationSeconds: state.baselineDuration + elapsedSeconds
     });

     set({ isDirty: false });
   }
   ```

2. **Remove StudySessionPlayer.tsx auto-save logic** (devine redundant)

**Success Criteria (Week 1, Day 4)**:
- ✅ Auto-save activat automat când se încarcă session
- ✅ Progress salvat la fiecare 30s
- ✅ No duplicate saves (dirty flag check)
- ✅ Dashboard stats update în timp real

#### Week 1, Day 5: Testing & Bug Fixes

**Acțiuni**:
1. Test visitor flow (demo deck) - nu trimite API calls
2. Test authenticated flow (persistent sessions) - sync-uiește corect
3. Verifică consistența între dashboard și session player
4. Fix edge cases (browser refresh, network failures)

**Success Criteria (Week 1, Day 5)**:
- ✅ No regressions în visitor mode
- ✅ Dashboard stats sync-ed cu session progress
- ✅ Network failures handled gracefully (retry logic)

---

### 🧩 Etapa 2: "The Great Splitting" (Atomic Design)

**Obiectiv**: Sparge StudySession.tsx în componente mici, reutilizabile

**Durată estimată**: 2 săptămâni (10 zile lucrătoare)

#### Week 2, Day 1-3: Extract Card Type Components

**Structură țintă**:
```
src/components/study-session/
├── cards/
│   ├── StandardCard.tsx        (flip card logic)
│   ├── QuizCard.tsx            (multiple choice)
│   ├── TypeAnswerCard.tsx      (input validation)
│   └── CardContainer.tsx       (wrapper comun)
├── controls/
│   ├── NavigationControls.tsx  (prev/next/skip)
│   ├── ActionButtons.tsx       (flip/submit/undo)
│   └── HintButton.tsx          (reveal hint)
├── feedback/
│   ├── XPFloatingAnimation.tsx (floating +XP)
│   ├── StreakIndicator.tsx     (🔥 streak counter)
│   └── CelebrationOverlay.tsx  (confetti on level up)
├── progress/
│   ├── ProgressBar.tsx         (cards completed)
│   ├── SessionStats.tsx        (correct/incorrect/skipped)
│   └── TimerDisplay.tsx        (elapsed time)
├── summary/
│   ├── SessionSummary.tsx      (pie chart, stats)
│   └── LevelUpModal.tsx        (level up celebration)
└── StudySessionContainer.tsx   (orchestrator)
```

**Implementare StandardCard.tsx** (exemplu):
```typescript
// src/components/study-session/cards/StandardCard.tsx
import { useStudySessionsStore } from '@/store/studySessionsStore';
import { Card } from '@/types';

interface StandardCardProps {
  card: Card;
}

export const StandardCard: React.FC<StandardCardProps> = ({ card }) => {
  const { isCardFlipped, flipCard } = useStudySessionsStore();

  return (
    <div
      className={`card-flip-container ${isCardFlipped ? 'flipped' : ''}`}
      onClick={flipCard}
    >
      <div className="card-front">
        <h2>{card.front}</h2>
        {card.context && <p className="context">{card.context}</p>}
      </div>
      <div className="card-back">
        <h2>{card.back}</h2>
      </div>
    </div>
  );
};
```

**Implementare QuizCard.tsx** (exemplu):
```typescript
// src/components/study-session/cards/QuizCard.tsx
import { useStudySessionsStore } from '@/store/studySessionsStore';
import { Card } from '@/types';

interface QuizCardProps {
  card: Card;
}

export const QuizCard: React.FC<QuizCardProps> = ({ card }) => {
  const { selectedQuizOption, selectQuizOption, submitQuizAnswer } = useStudySessionsStore();

  return (
    <div className="quiz-card">
      <h2>{card.front}</h2>
      <div className="quiz-options">
        {card.options?.map((option, index) => (
          <button
            key={index}
            className={selectedQuizOption === index ? 'selected' : ''}
            onClick={() => selectQuizOption(index)}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        onClick={() => submitQuizAnswer(card.id, selectedQuizOption === card.correctOptionIndex)}
        disabled={selectedQuizOption === null}
      >
        Submit Answer
      </button>
    </div>
  );
};
```

**Success Criteria (Week 2, Day 3)**:
- ✅ 3 card types extrași în componente separate
- ✅ Fiecare component <150 linii
- ✅ Unit tests pentru fiecare card type
- ✅ No duplicate logic între card types

#### Week 2, Day 4-6: Extract UI Components

**Acțiuni**:
1. **ProgressBar.tsx**:
   ```typescript
   export const ProgressBar: React.FC = () => {
     const { currentCardIndex, totalCards } = useStudySessionsStore();
     const percentage = (currentCardIndex / totalCards) * 100;

     return (
       <div className="progress-bar-container">
         <div className="progress-fill" style={{ width: `${percentage}%` }} />
         <span>{currentCardIndex} / {totalCards}</span>
       </div>
     );
   };
   ```

2. **StreakIndicator.tsx**:
   ```typescript
   export const StreakIndicator: React.FC = () => {
     const { streak } = useStudySessionsStore();

     return (
       <div className={`streak-badge ${streak >= 5 ? 'hot' : ''}`}>
         🔥 {streak}
       </div>
     );
   };
   ```

3. **SessionStats.tsx**:
   ```typescript
   export const SessionStats: React.FC = () => {
     const { answers } = useStudySessionsStore();
     const correct = Object.values(answers).filter(a => a === 'correct').length;
     const incorrect = Object.values(answers).filter(a => a === 'incorrect').length;
     const skipped = Object.values(answers).filter(a => a === 'skipped').length;

     return (
       <div className="session-stats">
         <div className="stat correct">✓ {correct}</div>
         <div className="stat incorrect">✗ {incorrect}</div>
         <div className="stat skipped">⊘ {skipped}</div>
       </div>
     );
   };
   ```

**Success Criteria (Week 2, Day 6)**:
- ✅ UI components extracted (progress, streak, stats, timer)
- ✅ Reusable în alte contexte (dashboard, summary)
- ✅ Visual consistency (shared design system)

#### Week 2, Day 7-10: Create StudySessionContainer

**Acțiuni**:
1. **Orchestrator component**:
   ```typescript
   // src/components/study-session/StudySessionContainer.tsx
   import { useEffect } from 'react';
   import { useStudySessionsStore } from '@/store/studySessionsStore';
   import { StandardCard } from './cards/StandardCard';
   import { QuizCard } from './cards/QuizCard';
   import { TypeAnswerCard } from './cards/TypeAnswerCard';
   import { ProgressBar } from './progress/ProgressBar';
   import { StreakIndicator } from './feedback/StreakIndicator';
   import { SessionStats } from './progress/SessionStats';
   import { NavigationControls } from './controls/NavigationControls';

   export const StudySessionContainer: React.FC<{ sessionId: string }> = ({ sessionId }) => {
     const {
       loadSession,
       currentSession,
       getCurrentCard,
       enableAutoSave,
       disableAutoSave
     } = useStudySessionsStore();

     useEffect(() => {
       loadSession(sessionId);
       enableAutoSave();
       return () => disableAutoSave();
     }, [sessionId]);

     if (!currentSession) return <LoadingSpinner />;

     const currentCard = getCurrentCard();

     return (
       <div className="study-session-layout">
         <header>
           <ProgressBar />
           <StreakIndicator />
           <SessionStats />
         </header>

         <main>
           {currentCard.type === 'standard' && <StandardCard card={currentCard} />}
           {currentCard.type === 'quiz' && <QuizCard card={currentCard} />}
           {currentCard.type === 'type-answer' && <TypeAnswerCard card={currentCard} />}
         </main>

         <footer>
           <NavigationControls />
         </footer>
       </div>
     );
   };
   ```

2. **Update App.tsx routing**:
   ```typescript
   // App.tsx
   case 'session-player':
     return (
       <StudySessionContainer
         sessionId={activeSessionId}
         onFinish={() => setCurrentView('dashboard')}
       />
     );
   ```

3. **Delete obsolete files**:
   - ❌ `components/StudySession.tsx` (1600 linii → deleted)
   - ❌ `src/components/sessions/StudySessionPlayer.tsx` (adapter → deleted)

**Success Criteria (Week 2, Day 10)**:
- ✅ Monolitul eliminat complet
- ✅ Componente sub 200 linii fiecare
- ✅ No adapter layer (direct store consumption)
- ✅ All features funcționează (quiz, type-answer, undo, etc.)

---

### 🌍 Etapa 3: "Internationalization" (i18n)

**Obiectiv**: Adăugare suport multi-limbă (RO, EN, IT + scalabilitate)

**Durată estimată**: 1 săptămână (5 zile lucrătoare)

#### Week 3, Day 1: Setup i18n Infrastructure

**Acțiuni**:
1. **Install dependencies**:
   ```bash
   npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
   ```

2. **Create i18n config**:
   ```typescript
   // src/i18n/config.ts
   import i18n from 'i18next';
   import { initReactI18next } from 'react-i18next';
   import LanguageDetector from 'i18next-browser-languagedetector';
   import HttpBackend from 'i18next-http-backend';

   i18n
     .use(HttpBackend) // Load translations from /public/locales
     .use(LanguageDetector) // Detect user language
     .use(initReactI18next)
     .init({
       fallbackLng: 'ro', // Default to Romanian
       supportedLngs: ['ro', 'en', 'it'],
       debug: process.env.NODE_ENV === 'development',

       backend: {
         loadPath: '/locales/{{lng}}/{{ns}}.json'
       },

       interpolation: {
         escapeValue: false // React already escapes
       },

       react: {
         useSuspense: true
       }
     });

   export default i18n;
   ```

3. **Initialize in App.tsx**:
   ```typescript
   // App.tsx
   import './i18n/config';
   ```

**Success Criteria (Week 3, Day 1)**:
- ✅ i18next configured
- ✅ Language detector active
- ✅ Fallback to Romanian works

#### Week 3, Day 2-3: Create Translation Files

**Structură**:
```
public/locales/
├── ro/
│   ├── common.json         (buttons, labels generale)
│   ├── auth.json           (login, register)
│   ├── session.json        (study session UI)
│   ├── decks.json          (deck management)
│   └── achievements.json   (badges, gamification)
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── session.json
│   ├── decks.json
│   └── achievements.json
└── it/
    ├── common.json
    ├── auth.json
    ├── session.json
    ├── decks.json
    └── achievements.json
```

**Exemplu ro/session.json**:
```json
{
  "create": "Creează sesiune",
  "continue": "Continuă",
  "finish": "Finalizează",
  "skip": "Sari peste",
  "undo": "Anulează",
  "flip": "Întoarce",
  "submit": "Trimite",

  "progress": {
    "cards": "{{current}} / {{total}} carduri",
    "streak": "Serie: {{count}}",
    "xp": "+{{amount}} XP"
  },

  "summary": {
    "title": "Sesiune finalizată!",
    "score": "Scor: {{percentage}}%",
    "correct": "Corecte: {{count}}",
    "incorrect": "Greșite: {{count}}",
    "skipped": "Sărite: {{count}}",
    "levelUp": "🎉 Ai urcat la Nivel {{level}}!"
  },

  "card": {
    "hint": "Indiciu",
    "context": "Context",
    "typeAnswer": "Scrie răspunsul aici...",
    "selectOption": "Selectează răspunsul corect"
  }
}
```

**Exemplu en/session.json**:
```json
{
  "create": "Create Session",
  "continue": "Continue",
  "finish": "Finish",
  "skip": "Skip",
  "undo": "Undo",
  "flip": "Flip",
  "submit": "Submit",

  "progress": {
    "cards": "{{current}} / {{total}} cards",
    "streak": "Streak: {{count}}",
    "xp": "+{{amount}} XP"
  },

  "summary": {
    "title": "Session Complete!",
    "score": "Score: {{percentage}}%",
    "correct": "Correct: {{count}}",
    "incorrect": "Incorrect: {{count}}",
    "skipped": "Skipped: {{count}}",
    "levelUp": "🎉 Level Up to {{level}}!"
  },

  "card": {
    "hint": "Hint",
    "context": "Context",
    "typeAnswer": "Type your answer here...",
    "selectOption": "Select the correct answer"
  }
}
```

**Success Criteria (Week 3, Day 3)**:
- ✅ Translation files pentru RO, EN, IT
- ✅ Coverage 100% pentru UI static
- ✅ Namespacing corect (common, auth, session, etc.)

#### Week 3, Day 4: Replace Hardcoded Strings

**Acțiuni**:
1. **Update components cu useTranslation hook**:
   ```typescript
   // Înainte
   <button>Creează sesiune</button>

   // După
   import { useTranslation } from 'react-i18next';

   const MyComponent = () => {
     const { t } = useTranslation('session');
     return <button>{t('create')}</button>;
   };
   ```

2. **Replace în toate componentele**:
   - Sidebar.tsx
   - StudySessionContainer.tsx
   - StandardCard.tsx, QuizCard.tsx, TypeAnswerCard.tsx
   - DeckList.tsx
   - GlobalDecks.tsx
   - Achievements.tsx
   - Leaderboard.tsx
   - Settings.tsx

**Success Criteria (Week 3, Day 4)**:
- ✅ 0 hardcoded strings în components
- ✅ Toate textele folosesc t('key')
- ✅ Switch language funcționează live

#### Week 3, Day 5: Language Switcher + Database Translations

**Acțiuni**:
1. **Add Language Switcher în Sidebar**:
   ```typescript
   // components/Sidebar.tsx
   import { useTranslation } from 'react-i18next';

   const LanguageSwitcher = () => {
     const { i18n } = useTranslation();

     return (
       <select
         value={i18n.language}
         onChange={(e) => i18n.changeLanguage(e.target.value)}
       >
         <option value="ro">🇷🇴 Română</option>
         <option value="en">🇬🇧 English</option>
         <option value="it">🇮🇹 Italiano</option>
       </select>
     );
   };
   ```

2. **Database schema pentru card translations** (long-term):
   ```sql
   -- Migration: Add card_translations table
   CREATE TABLE card_translations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
     language_code VARCHAR(5) NOT NULL, -- 'ro', 'en', 'it'
     front TEXT NOT NULL,
     back TEXT NOT NULL,
     context TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(card_id, language_code)
   );

   CREATE INDEX idx_card_translations_card_lang ON card_translations(card_id, language_code);
   ```

3. **Update API pentru a returna traduceri**:
   ```typescript
   // server/routes/decks.ts
   router.get('/:id', optionalAuth, async (req, res) => {
     const { lang = 'ro' } = req.query; // Default to Romanian

     // Fetch cards with translations
     const cardsResult = await query(`
       SELECT
         c.id,
         c.type,
         c.position,
         COALESCE(ct.front, c.front) as front,
         COALESCE(ct.back, c.back) as back,
         COALESCE(ct.context, c.context) as context
       FROM cards c
       LEFT JOIN card_translations ct ON ct.card_id = c.id AND ct.language_code = $1
       WHERE c.deck_id = $2 AND c.deleted_at IS NULL
       ORDER BY c.position ASC
     `, [lang, deckId]);

     // ...
   });
   ```

**Success Criteria (Week 3, Day 5)**:
- ✅ Language switcher funcțional în UI
- ✅ Database schema pentru card translations
- ✅ API returnează traduceri în funcție de `lang` query param
- ✅ Fallback la română dacă traducerea lipsește

---

## 4. Integrare i18n (Internationalizare)

### 🎨 Design Patterns pentru i18n

#### Pattern 1: Namespace-based Organization
```typescript
// ❌ BAD: All translations in one file
{
  "createSession": "Creează sesiune",
  "loginButton": "Autentificare",
  "deckTitle": "Titlu deck"
}

// ✅ GOOD: Namespaced by feature
// session.json
{
  "create": "Creează sesiune"
}

// auth.json
{
  "loginButton": "Autentificare"
}

// decks.json
{
  "title": "Titlu deck"
}
```

#### Pattern 2: Pluralization Support
```typescript
// ro/session.json
{
  "cardsCount": "{{count}} card",
  "cardsCount_plural": "{{count}} carduri"
}

// Usage
const { t } = useTranslation('session');
t('cardsCount', { count: 1 }); // "1 card"
t('cardsCount', { count: 5 }); // "5 carduri"
```

#### Pattern 3: Context-Aware Translations
```typescript
// ro/session.json
{
  "answer": "Răspuns",
  "answer_verb": "Răspunde",
  "answer_correct": "Răspuns corect",
  "answer_incorrect": "Răspuns greșit"
}
```

#### Pattern 4: Fallback Chain
```
User Language Preference → Browser Language → App Default (ro) → Translation Key
```

### 🔧 Tools & Infrastructure

#### Translation Management Platform
**Opțiuni**:
1. **Crowdin** (alternativă open-source-friendly)
   - ✅ Gratis pentru proiecte open-source
   - ✅ Community translations
   - ❌ Setup mai complicat

2. **Manual JSON Files** (pentru MVP)
   - ✅ Gratis
   - ✅ Control total
   - ❌ Hard to scale (traducătorii editează direct JSON)

**Recomandare**: Start cu manual JSON, migrează la Crowdin când ai >5 limbi.
---

## 5. Plan de Testare

### 🧪 Test Strategy

#### Unit Tests (Jest/Vitest)

**Store Tests**:
```typescript
// store/studySessionsStore.test.ts
describe('studySessionsStore', () => {
  it('should calculate XP correctly for correct answer with streak', () => {
    const store = useStudySessionsStore.getState();
    store.answerCard('card-1', true);

    expect(store.sessionXP).toBeGreaterThan(0);
    expect(store.streak).toBe(1);
  });

  it('should reset streak on incorrect answer', () => {
    const store = useStudySessionsStore.getState();
    store.answerCard('card-1', true); // streak = 1
    store.answerCard('card-2', false); // streak = 0

    expect(store.streak).toBe(0);
  });

  it('should auto-save progress every 30 seconds', async () => {
    const store = useStudySessionsStore.getState();
    const spy = vi.spyOn(store, 'syncProgress');

    store.enableAutoSave(1000); // 1 second for test
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(spy).toHaveBeenCalled();
  });
});
```

**Component Tests** (React Testing Library):
```typescript
// components/study-session/cards/StandardCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StandardCard } from './StandardCard';

describe('StandardCard', () => {
  it('should flip when clicked', () => {
    const card = { id: '1', front: 'Test Front', back: 'Test Back', type: 'standard' };
    render(<StandardCard card={card} />);

    expect(screen.getByText('Test Front')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Test Front'));

    expect(screen.getByText('Test Back')).toBeInTheDocument();
  });
});
```

**i18n Tests**:
```typescript
// i18n/translations.test.ts
import i18n from './config';

describe('i18n', () => {
  it('should load Romanian translations', async () => {
    await i18n.changeLanguage('ro');
    expect(i18n.t('session:create')).toBe('Creează sesiune');
  });

  it('should load English translations', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('session:create')).toBe('Create Session');
  });

  it('should fallback to Romanian if translation missing', async () => {
    await i18n.changeLanguage('fr'); // French not supported
    expect(i18n.language).toBe('ro');
  });
});
```

#### Integration Tests

**Session Flow Test**:
```typescript
// e2e/session-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete study session flow', async ({ page }) => {
  await page.goto('/');

  // Login
  await page.click('text=Autentificare');
  await page.fill('input[type=email]', 'test@example.com');
  await page.fill('input[type=password]', 'password123');
  await page.click('button:has-text("Login")');

  // Create session
  await page.click('text=Creează sesiune');
  await page.click('text=Începe');

  // Answer 5 cards
  for (let i = 0; i < 5; i++) {
    await page.click('button:has-text("Flip")');
    await page.click('button:has-text("Corect")');
  }

  // Verify session completed
  await expect(page.locator('text=Sesiune finalizată')).toBeVisible();
  await expect(page.locator('text=Scor:')).toBeVisible();
});
```

**i18n E2E Test**:
```typescript
test('language switcher changes UI language', async ({ page }) => {
  await page.goto('/');

  // Default is Romanian
  await expect(page.locator('text=Creează sesiune')).toBeVisible();

  // Switch to English
  await page.selectOption('select[aria-label="Language"]', 'en');
  await expect(page.locator('text=Create Session')).toBeVisible();

  // Switch to Italian
  await page.selectOption('select[aria-label="Language"]', 'it');
  await expect(page.locator('text=Crea Sessione')).toBeVisible();
});
```

### 📊 Coverage Targets

| Category | Target Coverage |
|----------|----------------|
| Store Logic | 90%+ |
| UI Components | 80%+ |
| API Routes | 85%+ |
| i18n Translations | 100% (all keys present) |

---

## 6. Estimări și Dependențe

### ⏱️ Timeline Total: 4 Săptămâni

| Etapă | Durată | Dependențe | Risk Level |
|-------|--------|------------|------------|
| **Etapa 1: Heart Transplant** | 1 săptămână | None | 🟡 Mediu |
| **Etapa 2: Great Splitting** | 2 săptămâni | Etapa 1 completă | 🟡 Mediu |
| **Etapa 3: i18n** | 1 săptămână | Etapa 2 completă | 🟢 Scăzut |

### 🚧 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Regressions în visitor flow | 🔴 High | 🟡 Medium | Extensive testing, feature flags |
| Store performance issues | 🟡 Medium | 🟢 Low | Profiling, memoization |
| Translation quality poor (machine) | 🟡 Medium | 🟡 Medium | Human review, native speakers |
| Breaking changes în API | 🔴 High | 🟢 Low | Versioned API, backward compatibility |

---

## 7. Draft Prompt pentru Next Session

### 📝 Session Start Prompt

```markdown
# Sesiune de Lucru: Rearhitecturare Store-Driven + i18n

## Context
Am identificat probleme critice în arhitectura aplicației Flashcards:
1. **Monolit**: StudySession.tsx (1600 linii) - God Component
2. **State duplicat**: între StudySession.tsx (local) și studySessionsStore (Zustand)
3. **Lipsa i18n**: text hardcodat, imposibil de scalat internațional

## Obiectiv Sesiune
Implementează **Etapa 1: Heart Transplant** din planul de rearhitecturare.

## Task-uri Concrete

### Task 1: Extinde studySessionsStore.ts
**Fișier**: `src/store/studySessionsStore.ts`

**Acțiuni**:
1. Adaugă state management complet:
   - `currentCardIndex: number`
   - `answers: Record<string, 'correct' | 'incorrect' | 'skipped'>`
   - `streak: number`
   - `sessionXP: number`
   - `isCardFlipped: boolean`
   - `hintRevealed: boolean`
   - `selectedQuizOption: number | null`

2. Implementează actions:
   - `flipCard()`: toggle isCardFlipped
   - `answerCard(cardId, isCorrect)`: update answers, calculate XP, manage streak
   - `skipCard(cardId)`: mark as skipped
   - `nextCard()`: increment currentCardIndex, reset flip/hint state
   - `undoLastAnswer()`: remove last answer, revert streak/XP
   - `completeSession()`: finalize and sync to backend

3. Implementează XP calculation logic:
   ```typescript
   const calculateXP = (isCorrect: boolean, streak: number, difficulty: Difficulty): number => {
     const baseXP = { A1: 5, A2: 8, B1: 12, B2: 15, C1: 20, C2: 25 }[difficulty];
     if (!isCorrect) return 0;
     const streakMultiplier = Math.min(1 + (streak * 0.1), 2.5);
     return Math.floor(baseXP * streakMultiplier);
   };
   ```

### Task 2: Implementează Auto-Save în Store
**Fișier**: `src/store/studySessionsStore.ts`

**Acțiuni**:
1. Adaugă auto-save subscription:
   ```typescript
   let autoSaveTimer: NodeJS.Timeout | null = null;

   enableAutoSave: (intervalMs = 30000) => {
     if (autoSaveTimer) clearInterval(autoSaveTimer);
     autoSaveTimer = setInterval(() => {
       const state = get();
       if (state.isDirty && state.currentSession) {
         state.syncProgress();
       }
     }, intervalMs);
   }
   ```

2. Implementează `syncProgress()`:
   - Calculează `durationSeconds` = baseline + elapsed
   - Apelează `updateSessionProgress` API
   - Set `isDirty = false` după save reușit

3. Cleanup la unmount:
   ```typescript
   disableAutoSave: () => {
     if (autoSaveTimer) {
       clearInterval(autoSaveTimer);
       autoSaveTimer = null;
     }
   }
   ```

### Task 3: Refactorizează StudySession.tsx
**Fișier**: `components/StudySession.tsx`

**Acțiuni**:
1. **ȘTERGE** local state:
   - `const [answers, setAnswers] = useState(...)`
   - `const [streak, setStreak] = useState(...)`
   - `const [sessionXP, setSessionXP] = useState(...)`
   - `const [currentIndex, setCurrentIndex] = useState(...)`
   - `const [isFlipped, setIsFlipped] = useState(...)`

2. **ÎNLOCUIEȘTE** cu Zustand store:
   ```typescript
   import { useStudySessionsStore } from '../src/store/studySessionsStore';

   const StudySession = ({ sessionId }) => {
     const {
       answers,
       streak,
       sessionXP,
       currentCardIndex,
       isCardFlipped,
       answerCard,
       flipCard,
       nextCard,
       undoLastAnswer
     } = useStudySessionsStore();

     // Use store values instead of local state
   }
   ```

3. **UPDATE** event handlers:
   - Click pe card → `flipCard()` (nu mai `setIsFlipped(!isFlipped)`)
   - Click pe "Corect" → `answerCard(cardId, true)` (nu mai `setAnswers(...)`)
   - Click pe "Sari peste" → `skipCard(cardId)`
   - Click pe "Înapoi" → `undoLastAnswer()`

### Task 4: Testing
**Fișiere**: `src/store/studySessionsStore.test.ts`, `components/StudySession.test.tsx`

**Acțiuni**:
1. Test store logic:
   - XP calculation corectă pentru răspunsuri corecte cu streak
   - Streak reset la răspuns greșit
   - Auto-save triggered la 30s
   - `isDirty` flag corect gestionat

2. Test component integration:
   - StudySession.tsx consumă corect din store
   - No local state leaks (verifică că nu mai există `useState` pentru session data)
   - Dashboard stats sync-ed cu session progress

### Success Criteria
✅ All business logic moved to store
✅ StudySession.tsx consumă doar din store (no local state)
✅ Dashboard și Session Player arată aceleași date
✅ Auto-save funcționează consistent (fără data transformation)
✅ Tests pass (unit + integration)
✅ No regressions în visitor mode

## Files to Focus On
1. `src/store/studySessionsStore.ts` - Store implementation
2. `components/StudySession.tsx` - Refactoring
3. `src/components/sessions/StudySessionPlayer.tsx` - Simplify adapter
4. `src/store/studySessionsStore.test.ts` - Tests

## Notes
- Păstrează visitor mode funcțional (demo deck fără API calls)
- Nu șterge încă StudySession.tsx (doar refactorizează)
- Focus pe consistență de date între dashboard și session player
- Auto-save trebuie să fie opt-in (enableAutoSave() explicit)

## Next Session (după Etapa 1)
- Etapa 2: Sparge StudySession.tsx în componente Atomic Design
- Extract StandardCard, QuizCard, TypeAnswerCard
- Create ProgressBar, StreakIndicator, SessionStats

---

Confirmă că ai înțeles task-urile și începe cu Task 1 (extinde studySessionsStore.ts).
```

---

## 📚 Resurse Suplimentare

### Documentation Links
- **i18next**: https://www.i18next.com/
- **react-i18next**: https://react.i18next.com/
- **Zustand Best Practices**: https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions
- **Atomic Design**: https://bradfrost.com/blog/post/atomic-web-design/

### Code Examples
- **Zustand with TypeScript**: https://github.com/pmndrs/zustand/blob/main/docs/guides/typescript.md
- **i18n Dynamic Content**: https://www.i18next.com/translation-function/interpolation
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/

---

**Autor**: Claude (Anthropic AI)
**Review**: Pending
**Status**: Draft pentru discuție

---

## 🎯 Next Actions

1. **Review acest plan** cu echipa
2. **Approve/reject** fiecare etapă
3. **Ajustează estimările** dacă e necesar
4. **Start Etapa 1** când ești ready
5. **Iterate** based on feedback

Baftă! 🚀
