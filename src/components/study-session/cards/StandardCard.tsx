import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Lightbulb, Check, Eye, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import '../animations/animations.css';

interface StandardCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onNext?: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
  isFirstCard?: boolean;
  isLastCard?: boolean;
  hasAnswered?: boolean;
  canEditDelete?: boolean;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
}

/**
 * StandardCard - Flip card component for standard flashcards
 * Displays front/back content with flip animation
 */
export const StandardCard: React.FC<StandardCardProps> = ({
  card,
  onAnswer,
  onNext,
  onSkip,
  onUndo,
  isFirstCard = false,
  isLastCard = false,
  hasAnswered = false,
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { isCardFlipped, flipCard, hintRevealed, revealHint, sessionXP } = useStudySessionsStore();

  const handleKnow = () => {
    flipCard();
    onAnswer(true);
  };

  const handleShow = () => {
    flipCard();
  };

  const handleDontKnow = () => {
    onAnswer(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col justify-center items-center cursor-pointer hover:shadow-2xl ${
          isCardFlipped ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : ''
        }`}
        style={{
          transition: 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          transform: isCardFlipped ? 'rotateY(180deg) scale(1.05)' : 'rotateY(0deg) scale(1)',
          transformStyle: 'preserve-3d',
        }}
        onClick={flipCard}
      >
        {/* Lightbulb Hint Button (top-left) */}
        {!isCardFlipped && card.context && !hintRevealed && (
          <div className="absolute top-4 left-4" onClick={e => e.stopPropagation()}>
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
        <div className="absolute top-4 right-4" onClick={e => e.stopPropagation()}>
          <CardActionsMenu
            card={card}
            canEditDelete={canEditDelete}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        </div>

        {/* Front/Back Content */}
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
            {isCardFlipped ? 'Răspuns' : 'Întrebare'}
          </div>

          <div className="text-2xl font-bold text-gray-900 mb-6">
            {isCardFlipped ? card.back : card.front}
          </div>

          {/* Context (if available and revealed) */}
          {!isCardFlipped && card.context && hintRevealed && (
            <div className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-4 mb-4">
              <span className="font-semibold">Context:</span> {card.context}
            </div>
          )}
        </div>

        {/* Navigation Buttons (inside card at bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/80 backdrop-blur rounded-b-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Front Side Buttons */}
          {!isCardFlipped && !hasAnswered && (
            <div className="flex items-center justify-between gap-2">
              {/* Back/Skip button */}
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

              <div className="flex gap-2 flex-1 justify-center">
                {/* Știu Button */}
                <button
                  onClick={handleKnow}
                  className="flex items-center gap-2 px-6 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-all active:scale-95"
                >
                  <Check size={18} />
                  Știu
                </button>

                {/* Arată Button */}
                <button
                  onClick={handleShow}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-all active:scale-95"
                >
                  <Eye size={18} />
                  Arată
                </button>
              </div>

              {/* Skip button */}
              <button
                onClick={onSkip}
                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all active:scale-95"
                title="Sari peste"
              >
                <SkipForward size={20} />
              </button>
            </div>
          )}

          {/* Back Side Buttons */}
          {isCardFlipped && !hasAnswered && (
            <div className="flex items-center justify-between gap-2">
              {/* Back button */}
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

              <div className="flex gap-2 flex-1 justify-center">
                {/* Nu Știu Button */}
                <button
                  onClick={handleDontKnow}
                  className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all active:scale-95"
                >
                  ❌ Nu Știu
                </button>

                {/* Următorul Button */}
                <button
                  onClick={onNext}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Următorul
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Skip button */}
              <button
                onClick={onSkip}
                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all active:scale-95"
                title="Sari peste"
              >
                <SkipForward size={20} />
              </button>
            </div>
          )}

          {/* After Answered */}
          {hasAnswered && (
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
              <div className="w-10"></div> {/* Spacer for symmetry */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
