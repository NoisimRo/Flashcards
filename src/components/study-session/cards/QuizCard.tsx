import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X } from 'lucide-react';

interface QuizCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
}

/**
 * QuizCard - Multiple choice quiz component
 * Displays question with selectable options
 */
export const QuizCard: React.FC<QuizCardProps> = ({ card, onAnswer }) => {
  const { selectedQuizOption, setQuizOption, answers } = useStudySessionsStore();
  const [hasAnswered, setHasAnswered] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);

  const cardAnswer = answers[card.id];
  const showResult = hasAnswered || cardAnswer !== undefined;

  const handleOptionClick = (index: number) => {
    if (hasAnswered) return;
    setQuizOption(index);
  };

  const handleSubmit = () => {
    if (selectedQuizOption === null) return;

    const correct = selectedQuizOption === card.correctOptionIndex;
    setIsCorrect(correct);
    setHasAnswered(true);
    onAnswer(correct);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
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

        {/* Submit Button */}
        {!hasAnswered && (
          <button
            onClick={handleSubmit}
            disabled={selectedQuizOption === null}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              selectedQuizOption !== null
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Trimite Răspuns
          </button>
        )}

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
