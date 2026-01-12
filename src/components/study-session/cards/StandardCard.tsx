import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import { Lightbulb } from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import '../animations/animations.css';

interface StandardCardProps {
  card: Card;
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
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const { isCardFlipped, flipCard, hintRevealed, revealHint, sessionXP } = useStudySessionsStore();

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col justify-center items-center cursor-pointer hover:shadow-2xl ${
          isCardFlipped ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : ''
        }`}
        style={{
          transition: 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          transform: isCardFlipped
            ? 'rotateY(180deg) scale(1.05)'
            : 'rotateY(0deg) scale(1)',
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

        {/* Flip Indicator */}
        <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
          {isCardFlipped ? '↩️ Click pentru față' : '🔄 Click pentru răspuns'}
        </div>
      </div>

    </div>
  );
};
