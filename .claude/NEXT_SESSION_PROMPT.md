# 🚀 Quick Start Prompt - Next Session

## TASK: Implementează Etapa 1 - Heart Transplant

### Context Rapid

Aplicația Flashcards are 2 probleme critice:

1. **State duplicat**: StudySession.tsx (local) vs studySessionsStore (Zustand)
2. **Data inconsistency**: Dashboard arată stats diferite de session player

**Soluție**: Mută TOATĂ logica de business în Zustand store.

---

## 📝 Task List (Day 1-2)

### ✅ Task 1: Extinde studySessionsStore.ts

**Fișier**: `src/store/studySessionsStore.ts`

**Adaugă state**:

```typescript
interface StudySessionsStore {
  // Existing
  currentSession: Session | null;

  // NEW - Add these
  currentCardIndex: number;
  answers: Record<string, 'correct' | 'incorrect' | 'skipped'>;
  streak: number;
  sessionXP: number;
  isCardFlipped: boolean;
  hintRevealed: boolean;
  selectedQuizOption: number | null;
  isDirty: boolean; // for auto-save

  // NEW - Add these actions
  flipCard: () => void;
  answerCard: (cardId: string, isCorrect: boolean) => void;
  skipCard: (cardId: string) => void;
  nextCard: () => void;
  undoLastAnswer: () => void;
  enableAutoSave: (intervalMs?: number) => void;
  disableAutoSave: () => void;
  syncProgress: () => Promise<void>;
}
```

**Implementează XP calculation**:

```typescript
const calculateXP = (isCorrect: boolean, streak: number, difficulty: Difficulty): number => {
  const baseXP = { A1: 5, A2: 8, B1: 12, B2: 15, C1: 20, C2: 25 }[difficulty];
  if (!isCorrect) return 0;
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.5); // Max 2.5x
  return Math.floor(baseXP * streakMultiplier);
};

// In store
answerCard: (cardId, isCorrect) => {
  const currentCard = get().getCurrentCard();
  const xpEarned = calculateXP(isCorrect, get().streak, currentCard.difficulty);

  set(state => ({
    answers: { ...state.answers, [cardId]: isCorrect ? 'correct' : 'incorrect' },
    streak: isCorrect ? state.streak + 1 : 0,
    sessionXP: state.sessionXP + xpEarned,
    isDirty: true,
  }));

  get().syncProgress(); // Auto-sync
};
```

**Implementează auto-save**:

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

---

### ✅ Task 2: Refactorizează StudySession.tsx

**Fișier**: `components/StudySession.tsx`

**ȘTERGE local state** (linii ~93-102):

```typescript
// ❌ DELETE THESE
const [answers, setAnswers] = useState<Record<string, AnswerStatus>>({});
const [streak, setStreak] = useState(0);
const [sessionXP, setSessionXP] = useState(0);
const [currentIndex, setCurrentIndex] = useState(0);
const [isFlipped, setIsFlipped] = useState(false);
const [hintRevealed, setHintRevealed] = useState(false);
```

**ÎNLOCUIEȘTE cu Zustand**:

```typescript
// ✅ ADD THIS
import { useStudySessionsStore } from '../src/store/studySessionsStore';

const StudySession = ({ deck, user, onFinish, onBack }) => {
  const {
    answers,
    streak,
    sessionXP,
    currentCardIndex,
    isCardFlipped,
    hintRevealed,
    flipCard,
    answerCard,
    skipCard,
    nextCard,
    undoLastAnswer,
    enableAutoSave,
    disableAutoSave,
  } = useStudySessionsStore();

  // Initialize auto-save on mount
  useEffect(() => {
    enableAutoSave();
    return () => disableAutoSave();
  }, []);

  // Rest of component uses store values
};
```

**UPDATE event handlers**:

```typescript
// Flip card
// ❌ OLD: onClick={() => setIsFlipped(!isFlipped)}
// ✅ NEW: onClick={flipCard}

// Answer card
// ❌ OLD: onClick={() => handleAnswer('correct')}
// ✅ NEW: onClick={() => { answerCard(currentCard.id, true); nextCard(); }}

// Skip card
// ❌ OLD: onClick={() => handleSkip()}
// ✅ NEW: onClick={() => { skipCard(currentCard.id); nextCard(); }}

// Undo
// ❌ OLD: onClick={() => handleUndo()}
// ✅ NEW: onClick={undoLastAnswer}
```

---

### ✅ Task 3: Simplify StudySessionPlayer.tsx

**Fișier**: `src/components/sessions/StudySessionPlayer.tsx`

**ȘTERGE data transformation** (linii ~54-96):

```typescript
// ❌ DELETE: Deck format conversion
const deck: Deck = {
  cards: currentSession.cards.map(...)
}
```

**ÎNLOCUIEȘTE cu direct render**:

```typescript
// ✅ NEW: Just load session, store handles everything
const StudySessionPlayer = ({ sessionId, onFinish }) => {
  const { loadSession, currentSession, enableAutoSave, disableAutoSave } = useStudySessionsStore();

  useEffect(() => {
    loadSession(sessionId);
    enableAutoSave();
    return () => disableAutoSave();
  }, [sessionId]);

  if (!currentSession) return <LoadingSpinner />;

  // Render StudySession directly (no transformation needed)
  return <StudySession sessionId={sessionId} onFinish={onFinish} />;
};
```

---

## 🧪 Testing Checklist

### Unit Tests

```bash
npm run test src/store/studySessionsStore.test.ts
```

**Test cases**:

- ✅ XP calculation corectă (base XP × streak multiplier)
- ✅ Streak reset la răspuns greșit
- ✅ Auto-save triggered la 30s
- ✅ `isDirty` flag corect

### Integration Tests

1. **Dashboard sync**: Start session → answer cards → check dashboard stats update
2. **Visitor mode**: Demo deck (d1) → no API calls → local only
3. **Auto-save**: Answer card → wait 30s → verify backend saved

---

## 📊 Success Criteria

✅ **No local state** în StudySession.tsx (verifică că nu mai există `useState` pentru session data)
✅ **Dashboard stats sync** cu session progress (real-time update)
✅ **Auto-save funcționează** (check Network tab: `PUT /api/study-sessions/:id` la 30s)
✅ **No data transformation** în StudySessionPlayer (simplified to <100 linii)
✅ **Tests pass** (run `npm run test`)
✅ **No regressions** în visitor mode (demo deck funcționează)

---

## 🔥 Quick Start Commands

```bash
# 1. Start with store extension
code src/store/studySessionsStore.ts

# 2. Refactor StudySession
code components/StudySession.tsx

# 3. Simplify adapter
code src/components/sessions/StudySessionPlayer.tsx

# 4. Run tests
npm run test

# 5. Manual test
npm run dev
# → Login → Create session → Answer cards → Check dashboard stats
```

---

## 📁 Files to Modify

| File                                             | Action    | Lines Affected    |
| ------------------------------------------------ | --------- | ----------------- |
| `src/store/studySessionsStore.ts`                | Extend    | +150 linii        |
| `components/StudySession.tsx`                    | Refactor  | ~50 linii changed |
| `src/components/sessions/StudySessionPlayer.tsx` | Simplify  | -100 linii        |
| `src/store/studySessionsStore.test.ts`           | Add tests | +80 linii         |

**Total LOC change**: +80 linii (net positive pentru tests, net negative pentru complexity)

---

## 🚨 Red Flags to Avoid

❌ **NU șterge StudySession.tsx** (doar refactorizează, nu elimina)
❌ **NU modifica API contracts** (backend routes rămân la fel)
❌ **NU sparge visitor mode** (demo deck trebuie să funcționeze fără API)
❌ **NU face over-engineering** (YAGNI - You Ain't Gonna Need It)

---

## 🎯 End Goal (Day 2)

**Dashboard arată stats LIVE din session**:

```
[Dashboard]         [Study Session]
XP: 145 ←──────────→ Session XP: 145
Streak: 7 ←─────────→ Current Streak: 7
Correct: 12 ←───────→ Answers: { card1: 'correct', ... }
```

**No more adapter overhead**:

```
❌ ÎNAINTE: Session API → Transform to Deck → Local State → Save → Transform back
✅ DUPĂ:   Session API → Store State → UI reads from Store → Auto-save
```

---

Ready? Start cu Task 1! 🚀
