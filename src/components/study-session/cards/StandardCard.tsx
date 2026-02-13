import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Card } from '../../../types/models';
import {
  Lightbulb,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  X,
} from 'lucide-react';
import { CardActionsMenu } from '../menus/CardActionsMenu';
import { HintOverlay } from '../shared/HintOverlay';
import '../animations/animations.css';

interface StandardCardProps {
  card: Card;
  onAnswer: (isCorrect: boolean) => void;
  onNext?: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
  onFinish?: () => void;
  isFirstCard?: boolean;
  isLastCard?: boolean;
  hasAnswered?: boolean;
  isSkipped?: boolean;
  canEditDelete?: boolean;
  onEditCard?: () => void;
  onDeleteCard?: () => void;
}

/**
 * StandardCard - Flip card component for standard flashcards
 * Displays front/back content with flip animation
 * Implements anti-cheating flow with frontAction tracking
 */
export const StandardCard: React.FC<StandardCardProps> = ({
  card,
  onAnswer,
  onNext,
  onSkip,
  onUndo,
  onFinish,
  isFirstCard = false,
  isLastCard = false,
  hasAnswered = false,
  isSkipped = false,
  canEditDelete = false,
  onEditCard,
  onDeleteCard,
}) => {
  const {
    isCardFlipped,
    flipCard,
    hintRevealed,
    revealHint,
    frontAction,
    setFrontAction,
    answers,
  } = useStudySessionsStore();

  const cardAnswer = answers[card.id];

  // Handle "Știu" button - mark as correct, flip
  const handleKnow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrontAction('know');
    onAnswer(true);
    flipCard();
  };

  // Handle "Arată" button - mark as incorrect, flip
  const handleShow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrontAction('show');
    if (!hasAnswered) {
      onAnswer(false);
    }
    flipCard();
  };

  // Handle "Nu știu" button on back (change from correct to incorrect)
  const handleDontKnow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrontAction('show'); // Hide "Nu știu" button after clicking (answer is now incorrect)
    onAnswer(false);
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
          className="relative w-full h-full min-h-[500px] rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
          style={{
            transformStyle: 'preserve-3d',
            transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
          onClick={flipCard}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              backgroundColor: 'var(--study-card-front-bg)',
            }}
          >
            {/* Lightbulb Hint Button (top-left) */}
            {card.context && !hintRevealed && (
              <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
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
            <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
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

            {/* Front Content - scrollable area with footer clearance */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pt-14 pb-20 flex flex-col justify-center items-center">
              <div className="text-center px-2 sm:px-4">
                <div
                  className="text-sm font-semibold mb-4 uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Întrebare
                </div>
                <div
                  className="text-lg sm:text-xl md:text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.front}
                </div>
              </div>
            </div>

            {/* Sticky Navigation Footer (front) - Always visible */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur rounded-b-2xl"
              style={{
                borderColor: 'var(--border-secondary)',
                backgroundColor: 'var(--study-card-footer-bg)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Back button */}
                <button
                  onClick={onUndo}
                  disabled={isFirstCard}
                  className="p-2 rounded-lg transition-all active:scale-95"
                  style={{
                    color: isFirstCard ? 'var(--text-muted)' : 'var(--text-secondary)',
                    cursor: isFirstCard ? 'not-allowed' : 'pointer',
                  }}
                  title="Înapoi"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Action buttons */}
                {!hasAnswered || isSkipped ? (
                  /* New card or skipped: show both "Știu" and "Arată" */
                  <div className="flex gap-2 flex-1 justify-center">
                    <button
                      onClick={handleKnow}
                      className="flex items-center gap-2 px-6 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-all active:scale-95"
                    >
                      <Check size={18} />
                      Știu
                    </button>
                    <button
                      onClick={handleShow}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all active:scale-95"
                      style={{
                        backgroundColor: 'var(--color-accent-light)',
                        color: 'var(--color-accent-text)',
                      }}
                    >
                      <Eye size={18} />
                      Arată
                    </button>
                  </div>
                ) : (
                  /* Already answered (correct/incorrect): show only "Arată" for review */
                  <div className="flex gap-2 flex-1 justify-center">
                    <button
                      onClick={handleShow}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all active:scale-95"
                      style={{
                        backgroundColor: 'var(--color-accent-light)',
                        color: 'var(--color-accent-text)',
                      }}
                    >
                      <Eye size={18} />
                      Arată
                    </button>
                  </div>
                )}

                {/* Right side: Skip or Finish button */}
                {isLastCard && onFinish ? (
                  <button
                    onClick={onFinish}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all active:scale-95"
                    title="Finalizează sesiunea"
                  >
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">Finalizare</span>
                  </button>
                ) : !hasAnswered || isSkipped ? (
                  <button
                    onClick={onSkip}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all active:scale-95"
                    title="Sari peste"
                  >
                    <SkipForward size={20} />
                  </button>
                ) : (
                  <div className="w-9" /> /* Spacer to maintain layout */
                )}
              </div>
            </div>
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'var(--study-card-back-bg)',
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

            {/* Card Actions Menu (top-right) - mirrored compensation */}
            <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
              <CardActionsMenu
                card={card}
                canEditDelete={canEditDelete}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            </div>

            {/* Back Content - scrollable area with footer clearance */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pt-14 pb-20 flex flex-col justify-center items-center">
              <div className="text-center px-2 sm:px-4">
                <div
                  className="text-sm font-semibold mb-4 uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Răspuns
                </div>
                <div
                  className="text-lg sm:text-xl md:text-2xl font-bold animate-fade-in"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.back}
                </div>
              </div>
            </div>

            {/* Sticky Navigation Footer (back) */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur rounded-b-2xl"
              style={{
                borderColor: 'var(--study-card-back-footer-border)',
                backgroundColor: 'var(--study-card-back-footer-bg)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Back button */}
                <button
                  onClick={onUndo}
                  disabled={isFirstCard}
                  className="p-2 rounded-lg transition-all active:scale-95"
                  style={{
                    color: isFirstCard ? 'var(--text-muted)' : 'var(--text-secondary)',
                    cursor: isFirstCard ? 'not-allowed' : 'pointer',
                  }}
                  title="Înapoi"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex gap-2 flex-1 justify-end">
                  {/* Show "Nu știu" when answer is currently correct (allows downgrade) */}
                  {(frontAction === 'know' || cardAnswer === 'correct') && (
                    <button
                      onClick={handleDontKnow}
                      className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all active:scale-95"
                    >
                      <X size={18} />
                      Nu știu
                    </button>
                  )}

                  {/* Next or Finish button */}
                  {isLastCard && onFinish ? (
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
                      className="flex items-center gap-2 px-6 py-2 text-white rounded-lg font-semibold transition-all active:scale-95"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      Următorul
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
