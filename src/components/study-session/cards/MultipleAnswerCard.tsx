import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import {
  Check,
  X,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  Square,
  CheckSquare,
  MessageCircle,
} from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import { HintOverlay } from '../shared/HintOverlay';
import { shuffleIndices } from '../../../utils/shuffle';

interface MultipleAnswerCardProps {
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
  canEditDelete?: boolean;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
}

/**
 * MultipleAnswerCard - Multiple choice with multiple correct answers
 * Displays question with selectable options (checkboxes)
 * User must select all correct answers and click "Răspunde" button
 */
export const MultipleAnswerCard: React.FC<MultipleAnswerCardProps> = ({
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
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const {
    selectedMultipleOptions,
    toggleMultipleOption,
    clearMultipleOptions,
    answers,
    hintRevealed,
    revealHint,
  } = useStudySessionsStore();

  const [hasAnswered, setHasAnswered] = React.useState(hasAnsweredProp);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState<NodeJS.Timeout | null>(null);

  const shuffledIndices = React.useMemo(() => shuffleIndices(card.options?.length ?? 0), [card.id]);

  // Reset local state when card changes
  React.useEffect(() => {
    setHasAnswered(false);
    setIsCorrect(null);
    clearMultipleOptions();

    return () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    };
  }, [card.id, clearMultipleOptions]);

  const cardAnswer = answers[card.id];
  const isAnswered = hasAnswered;
  const showResult = isAnswered;

  // Parse correctOptionIndices - handle both array and potential string formats
  const correctIndices = React.useMemo(() => {
    if (Array.isArray(card.correctOptionIndices)) {
      return card.correctOptionIndices;
    }
    // Fallback: if it's a string like "[0,2]", try to parse it
    if (typeof card.correctOptionIndices === 'string') {
      try {
        const parsed = JSON.parse(card.correctOptionIndices);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore parse errors
      }
    }
    return [];
  }, [card.correctOptionIndices]);

  // Check if user's selection is correct (all-or-nothing)
  const checkAnswer = (): boolean => {
    // If no correct indices defined, consider any selection as incorrect
    if (correctIndices.length === 0) {
      console.warn('MultipleAnswerCard: No correctOptionIndices defined for card', card.id);
      return false;
    }

    const sortedSelected = [...selectedMultipleOptions].sort((a, b) => a - b);
    const sortedCorrect = [...correctIndices].sort((a, b) => a - b);

    if (sortedSelected.length !== sortedCorrect.length) return false;
    return sortedSelected.every((val, idx) => val === sortedCorrect[idx]);
  };

  const handleOptionToggle = (index: number) => {
    if (isAnswered) return;
    toggleMultipleOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedMultipleOptions.length === 0 || isAnswered) return;

    const correct = checkAnswer();
    setIsCorrect(correct);
    setHasAnswered(true);

    // Call onAnswer after a tiny delay to show the feedback
    setTimeout(() => {
      onAnswer(correct);
    }, 100);

    // Auto-advance: 10s normally, 30s on last card so user can read feedback
    if (onAutoAdvance) {
      const delay = isLastCard ? 30000 : 10000;
      const timer = setTimeout(() => {
        onAutoAdvance();
      }, delay);
      setAutoAdvanceTimer(timer);
    }
  };

  const handleManualNext = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    onNext?.();
  };

  const handleManualFinish = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    onFinish?.();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container - with glow effect on answer */}
      <div
        className={`relative rounded-2xl shadow-xl min-h-[500px] flex flex-col transition-all duration-500 border-2 ${
          showResult && isCorrect === true
            ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.5)]'
            : showResult && isCorrect === false
              ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
              : 'border-transparent'
        }`}
        style={{ backgroundColor: 'var(--study-card-front-bg)' }}
      >
        {/* Lightbulb Hint Button (top-left) */}
        {card.context && !hintRevealed && !isAnswered && (
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

        {/* Status Label (top-center) */}
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

        {/* Content Area */}
        <div className="p-4 sm:p-8 pb-24 flex-1 overflow-y-auto">
          {/* Question */}
          <div className="mt-4 mb-6 sm:mb-8">
            <h2
              className="text-lg sm:text-xl md:text-2xl font-bold text-center"
              style={{ color: 'var(--text-primary)' }}
            >
              {card.front}
            </h2>
          </div>

          {/* Options with Checkboxes */}
          <div className="flex flex-col gap-3">
            {shuffledIndices.map(dataIndex => {
              const option = card.options?.[dataIndex];
              const isSelected = selectedMultipleOptions.includes(dataIndex);
              const isCorrectOption = correctIndices.includes(dataIndex);
              const showCorrectHighlight = showResult && isCorrectOption;
              const showIncorrect = showResult && isSelected && !isCorrectOption;
              const showMissed = showResult && isCorrectOption && !isSelected;

              return (
                <button
                  key={dataIndex}
                  onClick={() => handleOptionToggle(dataIndex)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                    showCorrectHighlight
                      ? 'border-green-500 text-[var(--option-correct-text)]'
                      : showIncorrect
                        ? 'border-red-500 text-[var(--option-incorrect-text)]'
                        : isSelected
                          ? 'border-[var(--color-accent)] text-[var(--option-selected-text)]'
                          : 'border-[var(--option-default-border)] text-[var(--text-primary)]'
                  } ${isAnswered ? 'cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare
                          size={20}
                          className={
                            showCorrectHighlight
                              ? 'text-green-600'
                              : showIncorrect
                                ? 'text-red-600'
                                : 'text-[var(--color-accent-text)]'
                          }
                        />
                      ) : (
                        <Square
                          size={20}
                          className={showMissed ? 'text-green-600' : ''}
                          style={!showMissed ? { color: 'var(--text-muted)' } : undefined}
                        />
                      )}
                      <span>{option}</span>
                    </div>
                    {showCorrectHighlight && <Check size={20} className="text-green-600" />}
                    {showIncorrect && <X size={20} className="text-red-600" />}
                    {showMissed && (
                      <span className="text-xs text-green-600 font-semibold">Corect</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Back Explanation - shown immediately after answering */}
          {showResult && card.back && (
            <div
              className="mt-3 px-3 py-2.5 rounded-xl border-2 flex gap-2.5"
              style={{
                backgroundColor: 'var(--explanation-bg)',
                borderColor: 'var(--explanation-border)',
              }}
            >
              <MessageCircle
                size={18}
                className="flex-shrink-0 mt-0.5"
                style={{ color: 'var(--explanation-text)' }}
              />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {card.back}
              </p>
            </div>
          )}
        </div>

        {/* Sticky Navigation Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur rounded-b-2xl"
          style={{
            borderColor: 'var(--border-secondary)',
            backgroundColor: 'var(--study-card-footer-bg)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back Button */}
            <button
              onClick={onUndo}
              disabled={isFirstCard}
              className={`p-2 rounded-lg transition-all ${
                isFirstCard ? 'cursor-not-allowed' : 'active:scale-95'
              }`}
              title="Înapoi"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Center: Răspunde button (when not answered and options selected) */}
            {!isAnswered && selectedMultipleOptions.length > 0 && (
              <button
                onClick={handleSubmitAnswer}
                className="px-6 py-2 text-white rounded-lg font-bold transition-all active:scale-95 shadow-lg"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Răspunde
              </button>
            )}

            {/* Spacer when no center button */}
            {(isAnswered || selectedMultipleOptions.length === 0) && <div className="flex-1"></div>}

            {/* Right: Next, Finish, or Skip Button */}
            {isAnswered ? (
              isLastCard && onFinish ? (
                <button
                  onClick={handleManualFinish}
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
              )
            ) : isLastCard && onFinish ? (
              <button
                onClick={handleManualFinish}
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
    </div>
  );
};
