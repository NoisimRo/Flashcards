import React, { useEffect, useRef, useState } from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useAuth } from '../../store/AuthContext';
import { StandardCard } from './cards/StandardCard';
import { QuizCard } from './cards/QuizCard';
import { TypeAnswerCard } from './cards/TypeAnswerCard';
import { MultipleAnswerCard } from './cards/MultipleAnswerCard';
import { ProgressBar } from './progress/ProgressBar';
import { SessionStatsPieChart } from './progress/SessionStatsPieChart';
import { StreakIndicator } from './feedback/StreakIndicator';
import { XPIndicator } from './feedback/XPIndicator';
import { XPFloatingAnimation } from './animations/XPFloatingAnimation';
import { StreakCelebration } from './animations/StreakCelebration';
import { LevelUpOverlay } from './animations/LevelUpOverlay';
import { AchievementCelebration } from './animations/AchievementCelebration';
import { SessionCompletionModal } from './modals/SessionCompletionModal';
import { getAchievements } from '../../api/achievements';
import type { Achievement as ApiAchievement } from '../../api/achievements';
import {
  useAchievementChecker,
  type TriggeredAchievement,
} from '../../hooks/useAchievementChecker';
import { ArrowLeft, Shuffle, RotateCcw, CheckCircle } from 'lucide-react';

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
  const { user, updateUser } = useAuth();
  const {
    currentSession,
    loadSession,
    enableAutoSave,
    disableAutoSave,
    getCurrentCard,
    answerCard,
    nextCard,
    undoLastAnswer,
    skipCard,
    shuffleCards,
    restartSession,
    currentCardIndex,
    isLoading,
    resetSessionState,
    setQuizOption,
    streak,
    sessionXP,
    answers,
    sessionStartTime,
    totalActiveSeconds,
    perCardTimes,
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

  // Achievement celebration state
  const [achievementCelebration, setAchievementCelebration] = useState<TriggeredAchievement | null>(
    null
  );
  const [allAchievements, setAllAchievements] = useState<ApiAchievement[]>([]);
  const { checkAchievements } = useAchievementChecker(allAchievements);

  // Refs for synchronous level-up XP tracking (React state via updateUser is async)
  // userXPStateRef: holds the post-level-up user state so checkLevelUp reads fresh values
  const userXPStateRef = useRef<{
    currentXP: number;
    nextLevelXP: number;
    level: number;
  } | null>(null);
  // sessionXPAtLastLevelUp: the sessionXP value when level-up last occurred,
  // so we only count XP earned *since* the last level-up toward the next threshold
  const sessionXPAtLastLevelUp = useRef(0);

  // Load session and enable auto-save on mount
  useEffect(() => {
    // CRITICAL: Reset state BEFORE loading to prevent answers from previous session
    resetSessionState();
    userXPStateRef.current = null;
    sessionXPAtLastLevelUp.current = 0;
    loadSession(sessionId);
    enableAutoSave();

    return () => {
      disableAutoSave();
      resetSessionState();
    };
  }, [sessionId, loadSession, enableAutoSave, disableAutoSave, resetSessionState]);

  // Fetch achievements for client-side badge checking
  useEffect(() => {
    if (user) {
      getAchievements()
        .then(res => {
          if (res?.success && res?.data?.achievements) {
            setAllAchievements(res.data.achievements);
          }
        })
        .catch(() => {
          // Silent fail - achievements check is cosmetic only
        });
    }
  }, [user]);

  // Check if session is complete (all cards answered)
  useEffect(() => {
    if (!currentSession?.cards) return;

    const totalCards = currentSession.cards.length;
    const answeredCards = Object.keys(answers).length;

    // Show completion modal when all cards are answered
    // SINGLE SOURCE OF TRUTH - prevents double completion calls
    if (answeredCards === totalCards && totalCards > 0 && !showCompletionModal) {
      setTimeout(() => {
        setShowCompletionModal(true);
      }, 6000); // 6 seconds delay to let user read feedback and explanation on last card
    }
  }, [answers, currentSession, showCompletionModal]);

  // Handle completion modal actions
  const handleSaveAndExit = async () => {
    setShowCompletionModal(false);
    onBack();
  };

  const handleReviewMistakes = () => {
    if (!currentSession) return;

    // Filter cards to only include incorrect and skipped ones
    const reviewCards = currentSession.cards?.filter(card => {
      const answer = answers[card.id];
      return answer === 'incorrect' || answer === 'skipped';
    });

    if (!reviewCards || reviewCards.length === 0) {
      alert('Nu există carduri de revizuit.');
      return;
    }

    // Close modal first
    setShowCompletionModal(false);

    // Update the store with filtered cards - KEEP XP and streak
    useStudySessionsStore.setState({
      currentSession: currentSession ? { ...currentSession, cards: reviewCards } : null,
      currentCardIndex: 0,
      answers: {}, // CRITICAL: Clear all answers to prevent infinite loop
      // KEEP streak and sessionXP - user continues the session with a subset of cards
      isCardFlipped: false,
      hintRevealed: false,
      selectedQuizOption: null,
      selectedMultipleOptions: [],
      isDirty: true,
    });
  };

  const handleFinishAndExit = async () => {
    if (!currentSession) return;

    // Prevent double-click / already completed
    if (currentSession.status === 'completed') {
      console.warn('Session already completed');
      setShowCompletionModal(false);
      onFinish();
      return;
    }

    const totalCards = currentSession.cards?.length || 0;
    const correctCount = Object.values(answers).filter(a => a === 'correct').length;
    const incorrectCount = Object.values(answers).filter(a => a === 'incorrect').length;
    const skippedCount = Object.values(answers).filter(a => a === 'skipped').length;

    // CRITICAL FIX: Count unanswered cards as skipped for backend validation
    const answeredCount = correctCount + incorrectCount + skippedCount;
    const unansweredCount = totalCards - answeredCount;
    const actualSkippedCount = skippedCount + unansweredCount;

    const score = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

    // CRITICAL FIX: Calculate accurate active study time using per-card tracking
    // Record time for the current card being viewed
    const currentCard = getCurrentCard();
    let finalTotalActiveSeconds = totalActiveSeconds;

    if (currentCard) {
      const now = Date.now();
      const { currentCardStartTime } = useStudySessionsStore.getState();
      const timeOnCurrentCard = (now - currentCardStartTime) / 1000;
      const cappedTime = Math.min(timeOnCurrentCard, 300); // Cap at 5 minutes
      finalTotalActiveSeconds += cappedTime;
    }

    // CRITICAL BUG FIX: Include baselineDuration (time from previous session loads)
    // Without this, completing a session would RESET duration instead of adding to it
    const { baselineDuration } = useStudySessionsStore.getState();
    const durationSeconds = Math.floor(baselineDuration + finalTotalActiveSeconds);

    // Build card progress updates - INCLUDE PER-CARD TIME
    const cardProgressUpdates =
      currentSession.cards?.map(card => {
        const answer = answers[card.id];
        const cardTime = perCardTimes[card.id] || 0;
        return {
          cardId: card.id,
          wasCorrect: answer === 'correct',
          timeSpentSeconds: Math.floor(cardTime), // Actual time spent on this card
        };
      }) || [];

    console.log('📊 Session completion data:', {
      totalCards,
      correctCount,
      incorrectCount,
      skippedCount: actualSkippedCount,
      durationSeconds,
      cardProgressUpdates: cardProgressUpdates.length,
      perCardTimesTracked: Object.keys(perCardTimes).length,
    });

    try {
      const { completeSession } = useStudySessionsStore.getState();
      const result = await completeSession(currentSession.id, {
        score,
        correctCount,
        incorrectCount,
        skippedCount: actualSkippedCount, // Include unanswered cards as skipped
        durationSeconds, // Accurate active time from per-card tracking
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
    } catch (error: any) {
      console.error('❌ Error completing session:', error);
      console.error('Error details:', error?.response?.data);

      // If session was already completed, just proceed
      if (error?.response?.data?.error?.code === 'ALREADY_COMPLETED') {
        console.warn('Session already completed, proceeding...');
        setShowCompletionModal(false);
        onFinish();
      } else {
        // Show error to user but allow them to exit
        alert('Eroare la finalizarea sesiunii. Te rugăm să încerci din nou.');
        setShowCompletionModal(false);
        onBack();
      }
    }
  };

  // Handle shuffle cards
  const handleShuffle = () => {
    if (
      window.confirm(
        'Sigur vrei să amesteci cardurile? Progresul (răspunsuri) va fi șters, dar XP-ul și streak-ul vor fi păstrate.'
      )
    ) {
      shuffleCards();
    }
  };

  // Handle restart session
  const handleRestart = () => {
    if (
      window.confirm(
        'Sigur vrei să restartezi sesiunea? Progresul (răspunsuri) va fi șters, dar XP-ul și streak-ul vor fi păstrate.'
      )
    ) {
      restartSession();
      userXPStateRef.current = null;
      sessionXPAtLastLevelUp.current = 0;
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

    // ANTI-CHEATING: Check if card was already answered
    const previousStatus = answers[currentCard.id];

    // Get current values before answering
    const currentStreak = streak;
    const previousXP = sessionXP;

    // Scenario A: First time or previously skipped → Update stats
    if (previousStatus === undefined || previousStatus === 'skipped') {
      answerCard(currentCard.id, isCorrect);

      // Trigger XP animation only if XP actually changed
      setTimeout(() => {
        const xpChange = useStudySessionsStore.getState().sessionXP - previousXP;
        if (xpChange !== 0) {
          setEarnedXP(xpChange);
          setShowXPAnimation(true);
        }

        // Check for level up during session
        checkLevelUp();
      }, 10);

      // Check for streak celebration (5, 10, 15, 20, etc.) - only if correct
      if (isCorrect) {
        const newStreak = useStudySessionsStore.getState().streak; // Get updated streak from store
        if (newStreak % 5 === 0 && newStreak >= 5 && newStreak > currentStreak) {
          setCelebrationStreak(newStreak);
          setShowStreakCelebration(true);
        }
      }

      // Check for achievement unlocks (client-side approximation for animation)
      if (allAchievements.length > 0 && !achievementCelebration) {
        const state = useStudySessionsStore.getState();
        const correctCount = Object.values(state.answers).filter(a => a === 'correct').length;
        const totalCards = currentSession?.cards?.length || 0;
        const durationSeconds = state.totalActiveSeconds;
        const triggered = checkAchievements({
          correctCount,
          totalCards,
          sessionXP: state.sessionXP,
          durationSeconds,
          answers: state.answers as Record<string, string>,
        });
        if (triggered) {
          setAchievementCelebration(triggered);
        }
      }
    }
    // Scenario B: Already answered (correct/incorrect) → Skip answerCard
    // Local UI feedback in QuizCard will still show, but no XP/streak update

    // Auto-advance to next card after a short delay
    setTimeout(() => {
      // Reset quiz option selection for next card
      setQuizOption(null);
    }, 300);
  };

  // Check for level up during session
  const checkLevelUp = () => {
    if (!user) return;

    const currentSessionXP = useStudySessionsStore.getState().sessionXP;

    // Use synchronous ref if a level-up already occurred this session
    // (React state via updateUser is async, so `user` may still hold stale values)
    const effectiveCurrentXP = userXPStateRef.current?.currentXP ?? user.currentXP;
    const effectiveNextLevelXP = userXPStateRef.current?.nextLevelXP ?? user.nextLevelXP;
    const effectiveLevel = userXPStateRef.current?.level ?? user.level;

    // Only count XP earned since the last level-up to avoid double-counting
    const newXPSinceLastLevelUp = currentSessionXP - sessionXPAtLastLevelUp.current;
    const totalXP = effectiveCurrentXP + newXPSinceLastLevelUp;

    // Check if user has reached or exceeded next level threshold
    if (totalXP >= effectiveNextLevelXP && !showLevelUp) {
      const oldLevel = effectiveLevel;
      let newLevel = oldLevel;
      let remainingXP = totalXP;
      let nextLevelXP = effectiveNextLevelXP;

      // Calculate new level(s) - user might level up multiple times
      while (remainingXP >= nextLevelXP) {
        remainingXP -= nextLevelXP;
        newLevel++;
        // Each level requires 20% more XP (exponential growth)
        nextLevelXP = Math.floor(nextLevelXP * 1.2);
      }

      // Synchronously update ref to prevent re-triggering on next answer
      userXPStateRef.current = { currentXP: remainingXP, nextLevelXP, level: newLevel };
      sessionXPAtLastLevelUp.current = currentSessionXP;

      // Also update React state for display (async, corrected on next render)
      updateUser({
        level: newLevel,
        currentXP: remainingXP,
        nextLevelXP: nextLevelXP,
        totalXP: user.totalXP + currentSessionXP,
      });

      setLevelUpData({ oldLevel, newLevel });
      setShowLevelUp(true);

      // Auto-hide after 3 seconds
      setTimeout(() => setShowLevelUp(false), 3000);
    }
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

            {/* Shuffle, Restart & Finalizare Buttons */}
            <div className="flex items-center gap-2 mr-12 sm:mr-0">
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

              <button
                onClick={() => setShowCompletionModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg font-medium transition-all active:scale-95"
                title="Finalizează sesiunea"
              >
                <CheckCircle size={18} />
                <span className="hidden sm:inline">Finalizare</span>
              </button>
            </div>
          </div>

          {/* Session Title */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {currentSession.deck?.title || currentSession.title || 'Sesiune de studiu'}
              {currentSession.deck?.difficulty && (
                <span className="ml-2 text-lg font-semibold text-indigo-600">
                  • {currentSession.deck.difficulty}
                </span>
              )}
            </h1>

            {/* Progress and Stats Row */}
            <div className="space-y-4">
              {/* Main Layout: [Pie Chart] <--- [Progress Bar] ---> [Streak & XP] */}
              <div className="flex items-center justify-between gap-6">
                {/* Left: Interactive Pie Chart */}
                <div className="flex-shrink-0">
                  <SessionStatsPieChart
                    correctCount={Object.values(answers).filter(a => a === 'correct').length}
                    incorrectCount={Object.values(answers).filter(a => a === 'incorrect').length}
                    skippedCount={Object.values(answers).filter(a => a === 'skipped').length}
                    totalCards={currentSession?.cards?.length || 0}
                    size="small"
                    showLegend={false}
                  />
                </div>

                {/* Center: Progress Bar */}
                <div className="flex-1 min-w-0">
                  <ProgressBar />
                </div>

                {/* Right: Streak & XP */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <StreakIndicator />
                  <XPIndicator />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Display Area */}
        <div className="mb-6 relative">
          {currentCard.type === 'standard' && (
            <StandardCard
              card={currentCard}
              onAnswer={handleAnswer}
              onNext={() => {
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onSkip={() => {
                skipCard(currentCard.id);
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
              }}
              onUndo={undoLastAnswer}
              onFinish={() => setShowCompletionModal(true)}
              isFirstCard={currentCardIndex === 0}
              isLastCard={currentCardIndex === (currentSession?.cards?.length || 0) - 1}
              hasAnswered={answers[currentCard.id] !== undefined}
            />
          )}
          {currentCard.type === 'quiz' && (
            <QuizCard
              card={currentCard}
              onAnswer={handleAnswer}
              onAutoAdvance={() => {
                // Auto-advance to next card if not on last card
                const totalCards = currentSession?.cards?.length || 0;
                if (currentCardIndex < totalCards - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onNext={() => {
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onSkip={() => {
                skipCard(currentCard.id);
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
              }}
              onUndo={undoLastAnswer}
              onFinish={() => setShowCompletionModal(true)}
              isFirstCard={currentCardIndex === 0}
              isLastCard={currentCardIndex === (currentSession?.cards?.length || 0) - 1}
              hasAnswered={answers[currentCard.id] !== undefined}
            />
          )}
          {currentCard.type === 'type-answer' && (
            <TypeAnswerCard
              card={currentCard}
              onAnswer={handleAnswer}
              onAutoAdvance={() => {
                // Auto-advance to next card if not on last card
                const totalCards = currentSession?.cards?.length || 0;
                if (currentCardIndex < totalCards - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onNext={nextCard}
              onSkip={() => {
                skipCard(currentCard.id);
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
              }}
              onUndo={undoLastAnswer}
              onFinish={() => setShowCompletionModal(true)}
              isFirstCard={currentCardIndex === 0}
              isLastCard={currentCardIndex === (currentSession?.cards?.length || 0) - 1}
              hasAnswered={answers[currentCard.id] !== undefined}
            />
          )}
          {currentCard.type === 'multiple-answer' && (
            <MultipleAnswerCard
              card={currentCard}
              onAnswer={handleAnswer}
              onAutoAdvance={() => {
                // Auto-advance to next card if not on last card
                const totalCards = currentSession?.cards?.length || 0;
                if (currentCardIndex < totalCards - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onNext={() => {
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
                // Don't manually trigger modal - useEffect handles it
              }}
              onSkip={() => {
                skipCard(currentCard.id);
                if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                  nextCard();
                }
              }}
              onUndo={undoLastAnswer}
              onFinish={() => setShowCompletionModal(true)}
              isFirstCard={currentCardIndex === 0}
              isLastCard={currentCardIndex === (currentSession?.cards?.length || 0) - 1}
              hasAnswered={answers[currentCard.id] !== undefined}
            />
          )}

          {/* Streak Celebration - rendered inside card area for proper centering */}
          {showStreakCelebration && (
            <StreakCelebration
              streak={celebrationStreak}
              onComplete={() => setShowStreakCelebration(false)}
            />
          )}
        </div>

        {/* Animations */}
        {showXPAnimation && (
          <XPFloatingAnimation xp={earnedXP} onAnimationEnd={() => setShowXPAnimation(false)} />
        )}

        {showLevelUp && levelUpData && (
          <LevelUpOverlay
            oldLevel={levelUpData.oldLevel}
            newLevel={levelUpData.newLevel}
            onComplete={() => setShowLevelUp(false)}
          />
        )}

        {achievementCelebration && (
          <AchievementCelebration
            icon={achievementCelebration.icon}
            title={achievementCelebration.title}
            color={achievementCelebration.color}
            onComplete={() => setAchievementCelebration(null)}
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
            totalCards={currentSession.cards?.length || 0}
            xpEarned={sessionXP}
            onSaveAndExit={handleSaveAndExit}
            onFinishAndExit={handleFinishAndExit}
            onReviewMistakes={handleReviewMistakes}
          />
        )}
      </div>
    </div>
  );
};
