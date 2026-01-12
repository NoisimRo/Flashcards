import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X, Send, Lightbulb, ChevronLeft, SkipForward } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';

interface TypeAnswerCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onAutoAdvance?: () => void;
  onUndo?: () => void;
  onSkip?: () => void;
  isFirstCard?: boolean;
  hasAnswered?: boolean;
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
  isFirstCard = false,
  hasAnswered: hasAnsweredProp = false,
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { answers, hintRevealed, revealHint, sessionXP } = useStudySessionsStore();
  const [userAnswer, setUserAnswer] = React.useState('');
  const [hasAnswered, setHasAnswered] = React.useState(hasAnsweredProp);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [showBack, setShowBack] = React.useState(false);

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

    // Flip to back after brief feedback display (500ms)
    setTimeout(() => {
      setShowBack(true);
    }, 500);

    // Auto-advance after 3 seconds (from back view)
    if (onAutoAdvance) {
      setTimeout(() => {
        onAutoAdvance();
      }, 3500); // 500ms feedback + 3000ms on back = 3500ms total
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col justify-center ${
          showBack ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : ''
        }`}
        style={{
          transition: 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          transform: showBack ? 'rotateY(180deg) scale(1.05)' : 'rotateY(0deg) scale(1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Lightbulb Hint Button (top-left) - only show on front */}
        {!showBack && card.context && !hintRevealed && !hasAnswered && (
          <div className="absolute top-4 left-4">
            <button
              onClick={e => {
                e.stopPropagation();
                revealHint();
              }}
              className="p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition-all active:scale-95"
              title="Arată context (-20 XP)"
            >
              <Lightbulb size={20} />
            </button>
          </div>
        )}

        {/* Card Actions Menu (top-right) */}
        <div className="absolute top-4 right-4">
          <CardActionsMenu
            card={card}
            canEditDelete={canEditDelete}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        </div>

        {/* Front Side - Question and Input */}
        {!showBack && (
          <>
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Completează Răspunsul
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{card.front}</h2>

              {/* Context (if available and revealed) */}
              {card.context && hintRevealed && (
                <div className="mt-4 text-sm text-gray-600 italic bg-gray-50 rounded-lg p-4">
                  <span className="font-semibold">Context:</span> {card.context}
                </div>
              )}
            </div>

            {/* Answer Input Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Răspunsul tău:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    disabled={hasAnswered}
                    placeholder="Scrie răspunsul aici..."
                    className={`w-full px-5 py-4 pr-14 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all text-base ${
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
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      hasAnswered || !userAnswer.trim()
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-indigo-600 hover:bg-indigo-50 active:scale-95'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* Back Side - Show Answer */}
        {showBack && (
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              Răspuns
            </div>

            {/* Result Status */}
            <div className="mb-6">
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Check size={32} />
                  <span className="text-3xl font-bold">Corect! 🎉</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <X size={32} />
                  <span className="text-3xl font-bold">Greșit</span>
                </div>
              )}
            </div>

            {/* Correct Answer */}
            <div className="text-2xl font-bold text-gray-900 mb-6">{card.back}</div>

            {/* User's Answer (if wrong) */}
            {!isCorrect && userAnswer && (
              <div className="text-lg text-gray-600 bg-gray-100 rounded-lg p-4">
                <span className="font-semibold">Răspunsul tău:</span> {userAnswer}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons (inside card at bottom) - only on front */}
        {!showBack && !hasAnswered && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/80 backdrop-blur rounded-b-2xl">
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

              <button
                onClick={onSkip}
                className="flex items-center gap-2 px-4 py-2 text-yellow-700 hover:bg-yellow-50 rounded-lg transition-all active:scale-95"
              >
                <SkipForward size={18} />
                <span className="hidden sm:inline">Sari</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
