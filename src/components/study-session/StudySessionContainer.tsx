import React, { useEffect, useState } from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { StandardCard } from './cards/StandardCard';
import { QuizCard } from './cards/QuizCard';
import { TypeAnswerCard } from './cards/TypeAnswerCard';
import { NavigationControls } from './controls/NavigationControls';
import { ProgressBar } from './progress/ProgressBar';
import { SessionStats } from './progress/SessionStats';
import { StreakIndicator } from './feedback/StreakIndicator';
import { XPIndicator } from './feedback/XPIndicator';
import { XPFloatingAnimation } from './animations/XPFloatingAnimation';
import { StreakCelebration } from './animations/StreakCelebration';
import { LevelUpOverlay } from './animations/LevelUpOverlay';
import { SessionCompletionModal } from './modals/SessionCompletionModal';
import { ArrowLeft, Shuffle, RotateCcw } from 'lucide-react';

interface StudySessionContainerProps {
  sessionId: string;
  onFinish: () => void;
  onBack: () => void;
}

/**
 * StudySessionContainer - Main orchestrator for study session UI
 * Coordinates all atomic components and manages session flow
 */
export const StudySessionContainer: React.FC<StudySessionContainerProps> = ({
  sessionId,
  onFinish,
  onBack,
}) => {
  const {
    currentSession,
    loadSession,
    enableAutoSave,
    disableAutoSave,
    getCurrentCard,
    answerCard,
    nextCard,
    isLoading,
    resetSessionState,
    setQuizOption,
    streak,
    sessionXP,
    answers,
    sessionStartTime,
  } = useStudySessionsStore();

  // Animation state
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number } | null>(
    null
  );
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(0);

  // Load session and enable auto-save on mount
  useEffect(() => {
    loadSession(sessionId);
    enableAutoSave();

    return () => {
      disableAutoSave();
      resetSessionState();
    };
  }, [sessionId, loadSession, enableAutoSave, disableAutoSave, resetSessionState]);

  // Check if session is complete (all cards answered)
  useEffect(() => {
    if (!currentSession?.cards) return;

    const totalCards = currentSession.cards.length;
    const answeredCards = Object.keys(answers).length;

    // Show completion modal when all cards are answered
    if (answeredCards === totalCards && totalCards > 0 && !showCompletionModal) {
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 500); // Small delay to show the last card feedback
    }
  }, [answers, currentSession, showCompletionModal]);

  // Handle completion modal actions
  const handleSaveAndExit = async () => {
    setShowCompletionModal(false);
    onBack();
  };

  const handleFinishAndExit = async () => {
    if (!currentSession) return;

    const totalCards = currentSession.cards?.length || 0;
    const correctCount = Object.values(answers).filter(a => a === 'correct').length;
    const incorrectCount = Object.values(answers).filter(a => a === 'incorrect').length;
    const skippedCount = Object.values(answers).filter(a => a === 'skipped').length;
    const score = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

    // Calculate session duration
    const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);

    // Build card progress updates
    const cardProgressUpdates =
      currentSession.cards
        ?.map(card => ({
          cardId: card.id,
          wasCorrect: answers[card.id] === 'correct',
          timeSpentSeconds: 0, // We don't track per-card time in this simplified version
        }))
        .filter(update => answers[update.cardId] !== undefined) || [];

    try {
      const { completeSession } = useStudySessionsStore.getState();
      const result = await completeSession(currentSession.id, {
        score,
        correctCount,
        incorrectCount,
        skippedCount,
        durationSeconds: elapsedSeconds,
        cardProgressUpdates,
      });

      // Check if user leveled up
      if (result?.leveledUp && result?.newLevel) {
        const oldLevel = result.newLevel - 1; // Calculate old level (simplistic approach)
        setLevelUpData({ oldLevel, newLevel: result.newLevel });
        setShowLevelUp(true);
        // Wait for level up animation before going back
        setTimeout(() => {
          setShowCompletionModal(false);
          onFinish();
        }, 3500);
      } else {
        setShowCompletionModal(false);
        onFinish();
      }
    } catch (error) {
      console.error('Error completing session:', error);
      setShowCompletionModal(false);
      onBack();
    }
  };

  // Handle shuffle cards
  const handleShuffle = () => {
    if (window.confirm('Sigur vrei să amesteci cardurile? Progresul actual nu va fi pierdut.')) {
      // Shuffle logic would need to be implemented in the store
      // For now, just show a toast or alert
      alert('Funcția de amestecare va fi implementată în viitoarea versiune.');
    }
  };

  // Handle restart session
  const handleRestart = () => {
    if (
      window.confirm(
        'Sigur vrei să restartezi sesiunea? Vei pierde tot progresul actual și XP-ul câștigat.'
      )
    ) {
      resetSessionState();
      setShowCompletionModal(false);
      setShowXPAnimation(false);
      setShowStreakCelebration(false);
      setShowLevelUp(false);
    }
  };

  // Handle answer submission
  const handleAnswer = (isCorrect: boolean) => {
    const currentCard = getCurrentCard();
    if (!currentCard) return;

    // Get current values before answering
    const currentStreak = streak;
    const previousXP = sessionXP;

    answerCard(currentCard.id, isCorrect);

    // Trigger XP animation if correct (calculate XP earned)
    if (isCorrect) {
      // XP is calculated in the store, so we need to wait a tick to get the updated value
      setTimeout(() => {
        const xpEarned = sessionXP - previousXP;
        if (xpEarned > 0) {
          setEarnedXP(xpEarned);
          setShowXPAnimation(true);
        }
      }, 10);

      // Check for streak celebration (5, 10, 15, 20, etc.)
      const newStreak = currentStreak + 1;
      if (newStreak % 5 === 0 && newStreak >= 5) {
        setCelebrationStreak(newStreak);
        setShowStreakCelebration(true);
      }
    }

    // Auto-advance to next card after a short delay
    setTimeout(() => {
      // Reset quiz option selection for next card
      setQuizOption(null);
    }, 300);
  };

  // Loading state
  if (isLoading || !currentSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă sesiunea...</p>
        </div>
      </div>
    );
  }

  const currentCard = getCurrentCard();

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Nu există carduri în această sesiune.</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
              Înapoi
            </button>

            {/* Shuffle & Restart Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-all active:scale-95"
                title="Amestecă cardurile"
              >
                <Shuffle size={18} />
                <span className="hidden sm:inline">Amestecă</span>
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-all active:scale-95"
                title="Restartează sesiunea"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Restart</span>
              </button>
            </div>
          </div>

          {/* Session Title */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {currentSession.deck?.title || currentSession.title || 'Sesiune de studiu'}
            </h1>

            {/* Progress and Stats Row */}
            <div className="space-y-4">
              <ProgressBar />

              <div className="flex items-center justify-between flex-wrap gap-4">
                <SessionStats />
                <div className="flex items-center gap-3">
                  <StreakIndicator />
                  <XPIndicator />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Display Area */}
        <div className="mb-6">
          {currentCard.type === 'standard' && <StandardCard card={currentCard} />}
          {currentCard.type === 'quiz' && <QuizCard card={currentCard} onAnswer={handleAnswer} />}
          {currentCard.type === 'type-answer' && (
            <TypeAnswerCard card={currentCard} onAnswer={handleAnswer} />
          )}
        </div>

        {/* Action Buttons for Standard Cards */}
        {currentCard.type === 'standard' && (
          <div className="max-w-2xl mx-auto">
            <StandardCardActions onAnswer={handleAnswer} />
          </div>
        )}

        {/* Navigation Controls */}
        <div className="max-w-2xl mx-auto">
          <NavigationControls onComplete={onFinish} />
        </div>

        {/* Animations */}
        {showXPAnimation && (
          <XPFloatingAnimation xp={earnedXP} onAnimationEnd={() => setShowXPAnimation(false)} />
        )}

        {showStreakCelebration && (
          <StreakCelebration
            streak={celebrationStreak}
            onComplete={() => setShowStreakCelebration(false)}
          />
        )}

        {showLevelUp && levelUpData && (
          <LevelUpOverlay
            oldLevel={levelUpData.oldLevel}
            newLevel={levelUpData.newLevel}
            onComplete={() => setShowLevelUp(false)}
          />
        )}

        {/* Session Completion Modal */}
        {showCompletionModal && currentSession && (
          <SessionCompletionModal
            score={
              currentSession.cards?.length
                ? Math.round(
                    (Object.values(answers).filter(a => a === 'correct').length /
                      currentSession.cards.length) *
                      100
                  )
                : 0
            }
            correctCount={Object.values(answers).filter(a => a === 'correct').length}
            incorrectCount={Object.values(answers).filter(a => a === 'incorrect').length}
            skippedCount={Object.values(answers).filter(a => a === 'skipped').length}
            xpEarned={sessionXP}
            onSaveAndExit={handleSaveAndExit}
            onFinishAndExit={handleFinishAndExit}
          />
        )}
      </div>
    </div>
  );
};

/**
 * StandardCardActions - Action buttons for standard flip cards
 * Allows user to mark card as correct or incorrect
 */
const StandardCardActions: React.FC<{ onAnswer: (isCorrect: boolean) => void }> = ({
  onAnswer,
}) => {
  const { isCardFlipped, answers, getCurrentCard } = useStudySessionsStore();
  const currentCard = getCurrentCard();
  const hasAnswered = currentCard && answers[currentCard.id] !== undefined;

  if (!isCardFlipped || hasAnswered) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <p className="text-center text-gray-700 font-medium mb-4">Ai știut răspunsul?</p>
      <div className="flex gap-4">
        <button
          onClick={() => onAnswer(false)}
          className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
        >
          ❌ Nu
        </button>
        <button
          onClick={() => onAnswer(true)}
          className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 transition-colors"
        >
          ✅ Da
        </button>
      </div>
    </div>
  );
};
