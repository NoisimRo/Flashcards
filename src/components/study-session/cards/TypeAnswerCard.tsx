import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import {
  Check,
  X,
  Send,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
} from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import { HintOverlay } from '../shared/HintOverlay';

interface TypeAnswerCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onAutoAdvance?: () => void;
  onUndo?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  isFirstCard?: boolean;
  isLastCard?: boolean;
  hasAnswered?: boolean;
  isSkipped?: boolean;
  canEditDelete?: boolean;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
}

/**
 * TypeAnswerCard - Type-in answer component
 * User types their answer and it's compared with the correct answer
 */
export const TypeAnswerCard: React.FC<TypeAnswerCardProps> = ({
  card,
  onAnswer,
  onAutoAdvance,
  onUndo,
  onSkip,
  onNext,
  onFinish,
  isFirstCard = false,
  isLastCard = false,
  hasAnswered: hasAnsweredProp = false,
  isSkipped = false,
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { answers, hintRevealed, revealHint, sessionXP } = useStudySessionsStore();
  const [userAnswer, setUserAnswer] = React.useState('');
  const [hasAnswered, setHasAnswered] = React.useState(hasAnsweredProp);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [showBack, setShowBack] = React.useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState<NodeJS.Timeout | null>(null);

  const [matchedPitfall, setMatchedPitfall] = React.useState<string | null>(null);

  const cardAnswer = answers[card.id];
  // Show result if card was definitively answered (correct/incorrect) in store, or just answered locally
  // Skipped cards should NOT show result — they need to be re-answered
  const isPracticeMode = cardAnswer === 'correct' || cardAnswer === 'incorrect';
  const showResult = isPracticeMode || hasAnswered;

  // Get correct options for display on back face
  const correctOptions = React.useMemo(() => {
    if (card.options && card.correctOptionIndices && card.correctOptionIndices.length > 0) {
      return card.correctOptionIndices.map(i => card.options![i]).filter(Boolean);
    }
    return [];
  }, [card.options, card.correctOptionIndices]);

  const normalizeAnswer = (text: string): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/^a\s+/, '') // Remove infinitive particle "a"
      .replace(/^(un|o|unul|una|niste)\s+/, '') // Remove indefinite articles
      .replace(/[.,!?;:]+$/, '') // Remove trailing punctuation
      .trim();
  };

  const checkFlexibility = (u: string, c: string): boolean => {
    const suffixes = ['ul', 'le', 'lor', 'ua', 'a'];
    for (const s of suffixes) {
      if (u + s === c || c + s === u) return true;
    }
    return false;
  };

  const isMatch = (userNorm: string, candidateNorm: string): boolean => {
    if (!userNorm || !candidateNorm) return false;
    if (userNorm === candidateNorm) return true;
    // Partial match (one contains the other) with minimum length check
    const minLen = Math.min(userNorm.length, candidateNorm.length);
    if (minLen >= 3 && (userNorm.includes(candidateNorm) || candidateNorm.includes(userNorm)))
      return true;
    // Suffix flexibility
    if (checkFlexibility(userNorm, candidateNorm)) return true;
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const normalizedUser = normalizeAnswer(userAnswer);
    let correct = false;
    let pitfall: string | null = null;

    // If card has options with correctOptionIndices, validate against them
    if (
      card.options &&
      card.options.length > 0 &&
      card.correctOptionIndices &&
      card.correctOptionIndices.length > 0
    ) {
      // Pre-normalize all options once
      const normalizedOptions = card.options.map(o => normalizeAnswer(o));

      // Pass 1: Exact match — if the user typed exactly one of the options, decide immediately
      let matched = false;
      for (let i = 0; i < normalizedOptions.length; i++) {
        if (normalizedUser === normalizedOptions[i]) {
          matched = true;
          if (card.correctOptionIndices.includes(i)) {
            correct = true;
          } else {
            pitfall = card.options[i];
            correct = false;
          }
          break;
        }
      }

      // Pass 2: Best fuzzy match — no exact match found, pick the closest fuzzy hit
      if (!matched) {
        let bestIndex = -1;
        let bestLenDiff = Infinity;

        for (let i = 0; i < normalizedOptions.length; i++) {
          if (isMatch(normalizedUser, normalizedOptions[i])) {
            // Prefer the option whose length is closest to the user's input
            const lenDiff = Math.abs(normalizedUser.length - normalizedOptions[i].length);
            if (lenDiff < bestLenDiff) {
              bestLenDiff = lenDiff;
              bestIndex = i;
            }
          }
        }

        if (bestIndex !== -1) {
          if (card.correctOptionIndices.includes(bestIndex)) {
            correct = true;
          } else {
            pitfall = card.options[bestIndex];
            correct = false;
          }
        }
      }
    } else {
      // Legacy fallback: compare against card.back
      const normalizedCorrect = normalizeAnswer(card.back);
      correct = isMatch(normalizedUser, normalizedCorrect);
    }

    setMatchedPitfall(pitfall);
    setIsCorrect(correct);
    setHasAnswered(true);

    // CRITICAL: Only call onAnswer if NOT in practice mode (prevents XP double-counting)
    if (!isPracticeMode) {
      onAnswer(correct);
    }

    // Flip to back after brief feedback display (500ms)
    setTimeout(() => {
      setShowBack(true);
    }, 500);

    // Auto-advance: 3.5s normally, 10.5s on last card so user can read feedback
    if (onAutoAdvance) {
      const delay = isLastCard ? 10500 : 3500; // 500ms feedback + viewing time
      const timer = setTimeout(() => {
        onAutoAdvance();
      }, delay);
      setAutoAdvanceTimer(timer);
    }
  };

  // Clear auto-advance timer on manual navigation
  const handleManualNext = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    onNext?.();
  };

  const handleManualUndo = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    onUndo?.();
  };

  // Reset state when card changes (fixes navigation bug)
  // Skipped cards reset to fresh state so the user can properly re-answer them
  React.useEffect(() => {
    setShowBack(false);
    setUserAnswer('');
    setHasAnswered(isSkipped ? false : hasAnsweredProp);
    setIsCorrect(null);
    setMatchedPitfall(null);

    // Clear any pending auto-advance timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [card.id]); // Reset when card ID changes

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container with 3D perspective */}
      <div
        className="relative min-h-[500px]"
        style={{
          perspective: '1000px',
        }}
      >
        <div
          className="relative w-full h-full min-h-[500px] rounded-2xl shadow-xl transition-transform"
          style={{
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 rounded-2xl p-8 flex flex-col justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              backgroundColor: 'var(--study-card-front-bg)',
            }}
          >
            {/* Lightbulb Hint Button (top-left) */}
            {card.context && !hintRevealed && !showResult && (
              <div className="absolute top-4 left-4 z-10">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    revealHint();
                  }}
                  className="p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition-all active:scale-95 shadow-md"
                  title="Arată context (-20 XP)"
                >
                  <Lightbulb size={20} />
                </button>
              </div>
            )}

            {/* Status Label (top-center) - Sticky */}
            {cardAnswer && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-md ${
                    cardAnswer === 'correct'
                      ? 'bg-green-100 text-green-700'
                      : cardAnswer === 'incorrect'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {cardAnswer === 'correct'
                    ? 'Corect'
                    : cardAnswer === 'incorrect'
                      ? 'Greșit'
                      : 'Sărit'}
                </span>
              </div>
            )}

            {/* Card Actions Menu (top-right) */}
            <div className="absolute top-4 right-4 z-10">
              <CardActionsMenu
                card={card}
                canEditDelete={canEditDelete}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            </div>

            {/* Glassmorphism Hint Overlay */}
            {card.context && hintRevealed && (
              <HintOverlay
                hint={card.context}
                onDismiss={() => {
                  useStudySessionsStore.setState({ hintRevealed: false });
                }}
              />
            )}

            {/* Front Content */}
            <div className="mb-8">
              <div
                className="text-sm font-semibold mb-3 uppercase tracking-wide text-center"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Completează Răspunsul
              </div>
              <h2
                className="text-2xl font-bold text-center"
                style={{ color: 'var(--text-primary)' }}
              >
                {card.front}
              </h2>
            </div>

            {/* Answer Input Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Răspunsul tău:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Scrie răspunsul aici..."
                    className={`w-full px-5 py-4 pr-14 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all text-base ${
                      showResult
                        ? isCorrect || cardAnswer === 'correct'
                          ? 'border-[var(--input-correct-border)]'
                          : 'border-[var(--input-incorrect-border)]'
                        : 'focus:ring-[var(--color-accent-ring)]'
                    }`}
                    style={{
                      backgroundColor: showResult
                        ? isCorrect || cardAnswer === 'correct'
                          ? 'var(--input-correct-bg)'
                          : 'var(--input-incorrect-bg)'
                        : 'var(--input-bg)',
                      borderColor: showResult ? undefined : 'var(--input-default-border)',
                      color: 'var(--text-primary)',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!userAnswer.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all active:scale-95"
                    style={{
                      color: !userAnswer.trim()
                        ? 'var(--text-muted)'
                        : isPracticeMode
                          ? '#22c55e'
                          : 'var(--color-accent)',
                      cursor: !userAnswer.trim() ? 'not-allowed' : 'pointer',
                    }}
                    title={isPracticeMode ? 'Practică (fără XP)' : 'Trimite răspunsul'}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </form>

            {/* Navigation Buttons (front) - Always visible */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur rounded-b-2xl"
              style={{
                borderColor: 'var(--border-secondary)',
                backgroundColor: 'var(--study-card-footer-bg)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleManualUndo}
                  disabled={isFirstCard}
                  className="p-2 rounded-lg transition-all active:scale-95"
                  style={{
                    color: isFirstCard ? 'var(--text-muted)' : 'var(--text-secondary)',
                    cursor: isFirstCard ? 'not-allowed' : 'pointer',
                  }}
                  title="Înapoi"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Right: Next, Finish or Skip button */}
                {showResult ? (
                  isLastCard && onFinish ? (
                    <button
                      onClick={onFinish}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-95"
                    >
                      <CheckCircle size={18} />
                      <span className="hidden sm:inline">Finalizare</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleManualNext}
                      className="flex items-center gap-2 px-6 py-2 text-white rounded-lg font-semibold transition-all active:scale-95"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      Următorul
                      <ChevronRight size={18} />
                    </button>
                  )
                ) : isLastCard && onFinish ? (
                  <button
                    onClick={onFinish}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-95"
                  >
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">Finalizare</span>
                  </button>
                ) : (
                  <button
                    onClick={onSkip}
                    className="flex items-center gap-2 px-4 py-2 text-yellow-600 rounded-lg transition-all active:scale-95"
                  >
                    <SkipForward size={18} />
                    <span className="hidden sm:inline">Sari</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 rounded-2xl p-8 flex flex-col justify-center items-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'var(--study-card-back-bg)',
            }}
          >
            {/* Status Label (top-center) - Sticky */}
            {cardAnswer && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-md ${
                    cardAnswer === 'correct'
                      ? 'bg-green-100 text-green-700'
                      : cardAnswer === 'incorrect'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {cardAnswer === 'correct'
                    ? 'Corect'
                    : cardAnswer === 'incorrect'
                      ? 'Greșit'
                      : 'Sărit'}
                </span>
              </div>
            )}

            {/* Card Actions Menu (top-right) */}
            <div className="absolute top-4 right-4 z-10">
              <CardActionsMenu
                card={card}
                canEditDelete={canEditDelete}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            </div>

            {/* Back Content */}
            <div className="text-center w-full px-4">
              <div
                className="text-sm font-semibold mb-4 uppercase tracking-wide"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Răspuns
              </div>

              {/* Result Status - Modificat pentru a evita afișarea la reset (isCorrect === null) */}
              <div className="mb-4">
                {isCorrect === true && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check size={32} />
                    <span className="text-3xl font-bold">Corect!</span>
                  </div>
                )}
                {isCorrect === false && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <X size={32} />
                    <span className="text-3xl font-bold">Greșit</span>
                  </div>
                )}
              </div>

              {/* User's Answer (if wrong) - PERSISTENT with red styling */}
              {!isCorrect && userAnswer && (
                <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-red-700 mb-1">
                    <X size={18} />
                    <span className="text-xs font-bold uppercase">Răspunsul tău</span>
                  </div>
                  <div className="text-lg font-bold text-red-700 text-center">{userAnswer}</div>
                  {matchedPitfall && (
                    <div className="text-xs text-red-600 mt-1 italic">Greșeală frecventă</div>
                  )}
                </div>
              )}

              {/* Correct Options (if card has options) */}
              {correctOptions.length > 0 && (
                <div className="mb-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
                    <Check size={18} />
                    <span className="text-xs font-bold uppercase">
                      {correctOptions.length === 1 ? 'Răspuns Corect' : 'Răspunsuri Corecte'}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 text-center">
                    {correctOptions.join(', ')}
                  </div>
                </div>
              )}

              {/* Feedback / Explanation (card.back) */}
              <div
                className="p-3 border-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--explanation-bg)',
                  borderColor: 'var(--explanation-border)',
                }}
              >
                <div
                  className="flex items-center justify-center gap-2 mb-1"
                  style={{ color: 'var(--explanation-text)' }}
                >
                  <Lightbulb size={18} />
                  <span className="text-xs font-bold uppercase">Explicație</span>
                </div>
                <div
                  className="text-base font-medium text-center"
                  style={{ color: 'var(--explanation-text)' }}
                >
                  {card.back}
                </div>
              </div>
            </div>

            {/* Navigation Buttons (back) - Always visible */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur rounded-b-2xl"
              style={{
                borderColor: 'var(--study-card-back-footer-border)',
                backgroundColor: 'var(--study-card-back-footer-bg)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleManualUndo}
                  disabled={isFirstCard}
                  className="p-2 rounded-lg transition-all active:scale-95"
                  style={{
                    color: isFirstCard ? 'var(--text-muted)' : 'var(--text-secondary)',
                    cursor: isFirstCard ? 'not-allowed' : 'pointer',
                  }}
                  title="Înapoi"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Right: Next or Finish button */}
                {isLastCard && onFinish ? (
                  <button
                    onClick={onFinish}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-95"
                  >
                    <CheckCircle size={18} />
                    Finalizare
                  </button>
                ) : (
                  <button
                    onClick={handleManualNext}
                    className="flex items-center gap-2 px-6 py-2 text-white rounded-lg font-semibold transition-all active:scale-95"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    Următorul
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
