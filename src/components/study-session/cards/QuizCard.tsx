import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X, Lightbulb, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';

interface QuizCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onAutoAdvance?: () => void;
  onUndo?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  isFirstCard?: boolean;
  isLastCard?: boolean;
  hasAnswered?: boolean;
  canEditDelete?: boolean;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
}

/**
 * QuizCard - Multiple choice quiz component
 * Displays question with selectable options
 */
export const QuizCard: React.FC<QuizCardProps> = ({
  card,
  onAnswer,
  onAutoAdvance,
  onUndo,
  onSkip,
  onNext,
  isFirstCard = false,
  isLastCard = false,
  hasAnswered: hasAnsweredProp = false,
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { selectedQuizOption, setQuizOption, answers, hintRevealed, revealHint } =
    useStudySessionsStore();
  const [hasAnswered, setHasAnswered] = React.useState(hasAnsweredProp);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);

  const cardAnswer = answers[card.id];
  const showResult = hasAnswered || cardAnswer !== undefined;

  const handleOptionClick = (index: number) => {
    if (hasAnswered) return;
    setQuizOption(index);

    // Instant feedback - check if answer is correct immediately
    const correct = index === card.correctOptionIndex;
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
      {/* Card Container - use min-height for dynamic content */}
      <div className="relative bg-white rounded-2xl shadow-xl min-h-[500px] flex flex-col">
        {/* Lightbulb Hint Button (top-left) */}
        {card.context && !hintRevealed && !hasAnswered && (
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
          <div
            className="absolute top-16 left-4 right-4 backdrop-blur-md bg-yellow-50/95 border border-yellow-300/50 shadow-xl rounded-xl p-4 z-20 animate-fade-in"
            style={{
              animation: 'fadeIn 0.3s ease-in-out',
            }}
          >
            <div className="text-sm text-yellow-900">
              <span className="font-bold">💡 Context:</span> {card.context}
            </div>
          </div>
        )}

        {/* Content Area with padding for sticky footer */}
        <div className="p-8 pb-24 flex-1 overflow-y-auto">
          {/* Question Header */}
          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide text-center">
              Întrebare cu Variante
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center">{card.front}</h2>
          </div>

          {/* Options - flex column with proper gap */}
          <div className="flex flex-col gap-3">
            {card.options?.map((option, index) => {
              const isSelected = selectedQuizOption === index;
              const isCorrectOption = index === card.correctOptionIndex;
              const showCorrect = showResult && isCorrectOption;
              const showIncorrect = showResult && isSelected && !isCorrectOption;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={hasAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : showIncorrect
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-900'
                  } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showCorrect && <Check size={20} className="text-green-600" />}
                    {showIncorrect && <X size={20} className="text-red-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Navigation Footer - Always visible */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/90 backdrop-blur rounded-b-2xl">
          <div className="flex items-center justify-between gap-2">
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

            {hasAnswered ? (
              <button
                onClick={onNext}
                disabled={isLastCard}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                  isLastCard
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
              >
                Următorul
                <ChevronRight size={18} />
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

            <div className="w-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
