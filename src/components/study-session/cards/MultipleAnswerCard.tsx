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
} from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import { HintOverlay } from '../shared/HintOverlay';

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

  // Reset local state when card changes
  React.useEffect(() => {
    setHasAnswered(false);
    setIsCorrect(null);
    clearMultipleOptions();
  }, [card.id, clearMultipleOptions]);

  const cardAnswer = answers[card.id];
  const isAnswered = hasAnswered;
  const showResult = isAnswered;
  const correctIndices = card.correctOptionIndices || [];

  // Check if user's selection is correct (all-or-nothing)
  const checkAnswer = (): boolean => {
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

    // Auto-advance after 3 seconds
    if (onAutoAdvance) {
      setTimeout(() => {
        onAutoAdvance();
      }, 3000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="relative bg-white rounded-2xl shadow-xl min-h-[500px] flex flex-col">
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
        <div className="p-8 pb-32 flex-1 overflow-y-auto">
          {/* Question Header */}
          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide text-center">
              Selectează Toate Răspunsurile Corecte
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">{card.front}</h2>
          </div>

          {/* Options with Checkboxes */}
          <div className="flex flex-col gap-3">
            {card.options?.map((option, index) => {
              const isSelected = selectedMultipleOptions.includes(index);
              const isCorrectOption = correctIndices.includes(index);
              const showCorrect = showResult && isCorrectOption && isSelected;
              const showIncorrect = showResult && isSelected && !isCorrectOption;
              const showMissed = showResult && isCorrectOption && !isSelected;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionToggle(index)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : showIncorrect
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : showMissed
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-900'
                  } ${isAnswered ? 'cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare
                          size={20}
                          className={
                            showCorrect
                              ? 'text-green-600'
                              : showIncorrect
                                ? 'text-red-600'
                                : 'text-indigo-600'
                          }
                        />
                      ) : (
                        <Square
                          size={20}
                          className={showMissed ? 'text-orange-600' : 'text-gray-400'}
                        />
                      )}
                      <span>{option}</span>
                    </div>
                    {showCorrect && <Check size={20} className="text-green-600" />}
                    {showIncorrect && <X size={20} className="text-red-600" />}
                    {showMissed && (
                      <span className="text-xs text-orange-600 font-semibold">Ratat</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Answer Button - appears when at least one option is selected */}
          {!isAnswered && selectedMultipleOptions.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSubmitAnswer}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg"
              >
                Răspunde
              </button>
            </div>
          )}

          {/* Result Feedback */}
          {showResult && (
            <div
              className={`mt-6 p-4 rounded-xl text-center font-bold ${
                isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {isCorrect
                ? 'Excelent! Ai selectat toate răspunsurile corecte!'
                : 'Incorect. Verifică răspunsurile corecte marcate cu verde.'}
            </div>
          )}
        </div>

        {/* Sticky Navigation Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/90 backdrop-blur rounded-b-2xl">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back Button */}
            <button
              onClick={onUndo}
              disabled={isFirstCard}
              className={`p-2 rounded-lg transition-all ${
                isFirstCard
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 active:scale-95'
              }`}
              title="Înapoi"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Right: Next, Finish, or Skip Button */}
            {isAnswered ? (
              isLastCard && onFinish ? (
                <button
                  onClick={onFinish}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-95"
                >
                  <CheckCircle size={18} />
                  Finalizare
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all active:scale-95"
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
                className="flex items-center gap-2 px-4 py-2 text-yellow-700 hover:bg-yellow-50 rounded-lg transition-all active:scale-95"
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
