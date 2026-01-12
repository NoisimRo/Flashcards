import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { ChevronLeft, ChevronRight, SkipForward, Check } from 'lucide-react';

interface NavigationControlsProps {
  onComplete: () => void;
}

/**
 * NavigationControls - Navigation buttons for study session
 * Handles next, skip, undo, and complete actions
 */
export const NavigationControls: React.FC<NavigationControlsProps> = ({ onComplete }) => {
  const {
    currentCardIndex,
    currentSession,
    answers,
    nextCard,
    undoLastAnswer,
    skipCard,
    getCurrentCard,
  } = useStudySessionsStore();

  const totalCards = currentSession?.cards?.length || 0;
  const isFirstCard = currentCardIndex === 0;
  const isLastCard = currentCardIndex === totalCards - 1;
  const currentCard = getCurrentCard();
  const hasAnswered = currentCard && answers[currentCard.id] !== undefined;
  const allCardsAnswered = Object.keys(answers).length === totalCards;

  const handleSkip = () => {
    if (currentCard && !hasAnswered) {
      skipCard(currentCard.id);
      if (!isLastCard) {
        nextCard();
      }
    }
  };

  const handleNext = () => {
    if (!isLastCard) {
      nextCard();
    }
  };

  const handleUndo = () => {
    if (!isFirstCard) {
      undoLastAnswer();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={isFirstCard}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isFirstCard
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        <ChevronLeft size={20} />
        Înapoi
      </button>

      {/* Skip Button (only if not answered) */}
      {!hasAnswered && (
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
        >
          <SkipForward size={20} />
          Sari peste
        </button>
      )}

      {/* Next Button (if answered and not last card) */}
      {hasAnswered && !isLastCard && (
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Următorul
          <ChevronRight size={20} />
        </button>
      )}

      {/* Complete Button (if last card or all cards answered) */}
      {(isLastCard && hasAnswered) || allCardsAnswered ? (
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <Check size={20} />
          Finalizează
        </button>
      ) : null}
    </div>
  );
};
