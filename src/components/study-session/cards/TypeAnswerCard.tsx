import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Check, X, Send, Lightbulb, ChevronLeft, SkipForward, CheckCircle } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import { HintOverlay } from '../shared/HintOverlay';

interface TypeAnswerCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onAutoAdvance?: () => void;
  onUndo?: () => void;
  onSkip?: () => void;
  onFinish?: () => void;
  isFirstCard?: boolean;
  isLastCard?: boolean;
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
  onFinish,
  isFirstCard = false,
  isLastCard = false,
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
  // Anti-cheating: disable if already answered in store OR local state
  const isAnswered = hasAnswered || cardAnswer !== undefined;
  const showResult = isAnswered;

  const normalizeAnswer = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Anti-cheating: prevent answer changes if already answered
    if (!userAnswer.trim() || isAnswered) return;

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
            className="absolute inset-0 bg-white rounded-2xl p-8 flex flex-col justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
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
              <div className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide text-center">
                Completează Răspunsul
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">{card.front}</h2>
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
                    disabled={isAnswered}
                    placeholder="Scrie răspunsul aici..."
                    className={`w-full px-5 py-4 pr-14 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all text-base ${
                      showResult
                        ? isCorrect || cardAnswer === 'correct'
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-200'
                    } ${isAnswered ? 'cursor-not-allowed' : ''}`}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isAnswered || !userAnswer.trim()}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      isAnswered || !userAnswer.trim()
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-indigo-600 hover:bg-indigo-50 active:scale-95'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </form>

            {/* Navigation Buttons (front) */}
            {!isAnswered && (
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

                  {/* Right: Finish or Skip button */}
                  {isLastCard && onFinish ? (
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
            )}
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 flex flex-col justify-center items-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
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

              {/* User's Answer (if wrong) - PERSISTENT with red styling */}
              {!isCorrect && userAnswer && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                    <X size={20} />
                    <span className="text-sm font-bold uppercase">Răspunsul tău</span>
                  </div>
                  <div className="text-xl font-bold text-red-700 text-center">{userAnswer}</div>
                </div>
              )}

              {/* Correct Answer */}
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                  <Check size={20} />
                  <span className="text-sm font-bold uppercase">Răspuns Corect</span>
                </div>
                <div className="text-xl font-bold text-green-700 text-center">{card.back}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
