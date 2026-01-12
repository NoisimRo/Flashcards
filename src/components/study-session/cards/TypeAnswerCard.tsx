import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X, Send, Eye } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';

interface TypeAnswerCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
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
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { answers, hintRevealed, revealHint, sessionXP } = useStudySessionsStore();
  const [userAnswer, setUserAnswer] = React.useState('');
  const [hasAnswered, setHasAnswered] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);

  const cardAnswer = answers[card.id];
  const showResult = hasAnswered || cardAnswer !== undefined;

  const normalizeAnswer = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || hasAnswered) return;

    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(card.back);

    // Check if answer is correct (with some flexibility)
    const correct =
      normalizedUser === normalizedCorrect || normalizedUser.includes(normalizedCorrect);

    setIsCorrect(correct);
    setHasAnswered(true);
    onAnswer(correct);
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
            Completează Răspunsul
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

        {/* Answer Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Răspunsul tău:
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                disabled={hasAnswered}
                placeholder="Scrie răspunsul aici..."
                className={`flex-1 px-5 py-4 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all text-base ${
                  showResult
                    ? isCorrect || cardAnswer === 'correct'
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-200'
                } ${hasAnswered ? 'cursor-not-allowed' : ''}`}
                autoFocus
              />
              <button
                type="submit"
                disabled={hasAnswered || !userAnswer.trim()}
                className={`px-6 py-4 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  hasAnswered || !userAnswer.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
              >
                <Send size={20} />
                <span className="hidden sm:inline">Trimite</span>
              </button>
            </div>
          </div>
        </form>

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
            <div className="space-y-2">
              {/* Feedback Header */}
              <div className="flex items-center gap-2 font-semibold">
                {(isCorrect || cardAnswer === 'correct') && (
                  <>
                    <Check size={20} className="text-green-600" />
                    <span className="text-green-900">Corect! 🎉</span>
                  </>
                )}
                {cardAnswer === 'incorrect' && (
                  <>
                    <X size={20} className="text-red-600" />
                    <span className="text-red-900">Încercă din nou data viitoare</span>
                  </>
                )}
                {cardAnswer === 'skipped' && (
                  <span className="text-gray-700">Întrebare sărită</span>
                )}
              </div>

              {/* Show correct answer if wrong */}
              {cardAnswer === 'incorrect' && (
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Răspuns corect:</span> {card.back}
                </div>
              )}

              {/* Show user's answer if wrong */}
              {cardAnswer === 'incorrect' && userAnswer && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Răspunsul tău:</span> {userAnswer}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
