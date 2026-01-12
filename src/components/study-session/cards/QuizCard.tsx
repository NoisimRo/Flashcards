import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X, Eye } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';

interface QuizCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
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
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { selectedQuizOption, setQuizOption, answers, hintRevealed, revealHint, sessionXP } =
    useStudySessionsStore();
  const [hasAnswered, setHasAnswered] = React.useState(false);
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
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="relative bg-white rounded-2xl shadow-xl p-8">
        {/* Card Actions Menu (top-right) */}
        <div className="absolute top-4 right-4">
          <CardActionsMenu
            card={card}
            canEditDelete={canEditDelete}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Întrebare cu Variante
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{card.front}</h2>

          {/* Context */}
          {card.context && (
            <div className="mt-4 text-sm text-gray-600 italic bg-gray-50 rounded-lg p-4">
              <span className="font-semibold">Context:</span> {card.context}
            </div>
          )}

          {/* Hint (if available and revealed) */}
          {card.hint && hintRevealed && (
            <div className="mt-4 text-sm text-indigo-600 bg-indigo-50 rounded-lg p-4 flex items-start gap-2">
              <Eye size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-semibold">Indiciu (-20 XP):</span> {card.hint}
              </span>
            </div>
          )}

          {/* Hint Button (if hint available and not revealed and not answered) */}
          {card.hint && !hintRevealed && !hasAnswered && (
            <button
              onClick={e => {
                e.stopPropagation();
                revealHint();
              }}
              className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              title={sessionXP >= 20 ? 'Costă 20 XP' : 'XP insuficient'}
            >
              <Eye size={18} />
              Arată indiciu (-20 XP)
            </button>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
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
                } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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

        {/* Result Feedback */}
        {showResult && (
          <div
            className={`mt-6 p-4 rounded-xl ${
              isCorrect || cardAnswer === 'correct'
                ? 'bg-green-50 border-2 border-green-200'
                : cardAnswer === 'incorrect'
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-gray-50 border-2 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {(isCorrect || cardAnswer === 'correct') && (
                <>
                  <Check size={20} className="text-green-600" />
                  <span className="text-green-900">Răspuns corect! 🎉</span>
                </>
              )}
              {cardAnswer === 'incorrect' && (
                <>
                  <X size={20} className="text-red-600" />
                  <span className="text-red-900">
                    Răspuns greșit. Răspunsul corect: {card.options?.[card.correctOptionIndex!]}
                  </span>
                </>
              )}
              {cardAnswer === 'skipped' && <span className="text-gray-700">Întrebare sărită</span>}
            </div>

            {/* Show back content if available */}
            {card.back && (
              <div className="mt-3 text-sm text-gray-700">
                <span className="font-semibold">Explicație:</span> {card.back}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
