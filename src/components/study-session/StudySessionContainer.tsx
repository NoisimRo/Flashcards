import React, { useEffect, useRef, useState } from 'react';
import { useStudySessionsStore, setOnUserUpdateCallback } from '../../store/studySessionsStore';
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
import { EditCardModal } from './modals/EditCardModal';
import { deleteCard } from '../../api/cards';
import { getAchievements } from '../../api/achievements';
import type { Achievement as ApiAchievement } from '../../api/achievements';
import { getTodaysChallenges } from '../../api/dailyChallenges';
import {
  useAchievementChecker,
  type TriggeredAchievement,
} from '../../hooks/useAchievementChecker';
import type { Card } from '../../types/models';
import { ArrowLeft, Shuffle, RotateCcw, CheckCircle } from 'lucide-react';
import { soundEngine } from '../../services/soundEngine';
import { SparkleExplosion, ScreenShake } from './animations/ParticleEffects';

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
    syncProgress,
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
  const { checkAchievements, recordCorrectAnswer } = useAchievementChecker(allAchievements);

  // Visual effects state
  const [showSparkle, setShowSparkle] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const [answerFlash, setAnswerFlash] = useState<'correct' | 'incorrect' | null>(null);

  // Daily XP Goal celebration state
  const [dailyXPGoalCelebration, setDailyXPGoalCelebration] = useState(false);
  const dailyStartXPRef = useRef<number>(0);
  const dailyXPGoalRef = useRef<number>(100);
  const dailyXPGoalTriggeredRef = useRef(false);

  // Card editing state (teachers & admins)
  const canEditDelete = user?.role === 'teacher' || user?.role === 'admin';
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Ref for synchronous level-up tracking (React state via updateUser is async)
  // Holds the post-level-up user state so checkLevelUp reads fresh values
  const userXPStateRef = useRef<{
    currentXP: number;
    nextLevelXP: number;
    level: number;
    sessionXPAtCheck: number;
  } | null>(null);

  // Track how much sessionXP is already baked into user.currentXP from server syncs
  const lastSyncedSessionXPRef = useRef(0);

  // Wire user update callback so PUT responses can sync auth context
  useEffect(() => {
    setOnUserUpdateCallback(data => {
      updateUser({
        level: data.level,
        currentXP: data.currentXP,
        nextLevelXP: data.nextLevelXP,
        totalXP: data.totalXP,
      });
      // After server sync, user.currentXP includes XP up to this point
      lastSyncedSessionXPRef.current = useStudySessionsStore.getState().sessionXP;
    });
    return () => {
      setOnUserUpdateCallback(null);
    };
  }, [updateUser]);

  // Load session and enable auto-save on mount
  useEffect(() => {
    // CRITICAL: Reset state BEFORE loading to prevent answers from previous session
    resetSessionState();
    userXPStateRef.current = null;
    lastSyncedSessionXPRef.current = 0;
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

  // Fetch daily XP progress for goal celebration
  useEffect(() => {
    if (user) {
      dailyXPGoalRef.current = user.preferences?.dailyXPGoal || 100;
      // Check if already triggered today (persistent via sessionStorage)
      const todayKey = `daily_xp_goal_${new Date().toISOString().split('T')[0]}`;
      if (sessionStorage.getItem(todayKey)) {
        dailyXPGoalTriggeredRef.current = true;
      }
      getTodaysChallenges()
        .then(res => {
          if (res?.success && res?.data?.challenges) {
            const xpChallenge = res.data.challenges.find(c => c.id === 'daily_xp');
            dailyStartXPRef.current = xpChallenge?.progress || 0;
            // If already completed before session started, mark as triggered
            if (xpChallenge?.completed) {
              dailyXPGoalTriggeredRef.current = true;
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Play session complete sound when completion modal opens
  useEffect(() => {
    if (showCompletionModal) {
      soundEngine.playSessionComplete();
    }
  }, [showCompletionModal]);

  // Handle back navigation with progress sync
  const handleBack = async () => {
    await syncProgress();
    onBack();
  };

  // Handle completion modal actions
  const handleSaveAndExit = async () => {
    setShowCompletionModal(false);
    await syncProgress();
    onBack();
  };

  // Handle card edit (teachers/admins)
  const handleEditCard = () => {
    const card = getCurrentCard();
    if (card) setEditingCard(card);
  };

  const handleCardSaved = (updatedCard: Card) => {
    // Update the card in the current session's card list in-place
    if (currentSession?.cards) {
      const idx = currentSession.cards.findIndex(c => c.id === updatedCard.id);
      if (idx !== -1) {
        currentSession.cards[idx] = updatedCard;
      }
    }
    setEditingCard(null);
  };

  // Handle card delete (teachers/admins)
  const handleDeleteCard = async () => {
    const card = getCurrentCard();
    if (!card || !currentSession) return;

    try {
      const res = await deleteCard(card.deckId, card.id);
      if (res?.success) {
        // Remove the card from the session via proper Zustand state update
        const remaining = currentSession.cards?.filter(c => c.id !== card.id) || [];
        if (remaining.length === 0) {
          onBack();
        } else {
          const newIndex =
            currentCardIndex >= remaining.length ? remaining.length - 1 : currentCardIndex;
          useStudySessionsStore.setState(state => ({
            currentSession: state.currentSession
              ? { ...state.currentSession, cards: remaining }
              : null,
            currentCardIndex: newIndex,
          }));
        }
      } else {
        alert(res?.error?.message || 'Eroare la ștergerea cardului.');
      }
    } catch {
      alert('Eroare la ștergerea cardului.');
    }
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

    const { completeSession } = useStudySessionsStore.getState();
    const result = await completeSession(currentSession.id, {
      score,
      correctCount,
      incorrectCount,
      skippedCount: actualSkippedCount, // Include unanswered cards as skipped
      durationSeconds, // Accurate active time from per-card tracking
      cardProgressUpdates,
      clientTimezoneOffset: new Date().getTimezoneOffset(),
    });

    // completeSession returns null on API failure (it catches its own errors)
    if (!result) {
      alert('Eroare la finalizarea sesiunii. Te rugăm să încerci din nou.');
      return; // Stay on modal so user can retry
    }

    // Check if user leveled up
    if (result.leveledUp && result.newLevel) {
      const oldLevel = result.newLevel - 1;
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
  };

  // Handle shuffle cards
  const handleShuffle = () => {
    if (
      window.confirm(
        'Sigur vrei să amesteci cardurile? Progresul (răspunsuri), XP-ul și streak-ul vor fi resetate.'
      )
    ) {
      shuffleCards();
    }
  };

  // Handle restart session
  const handleRestart = () => {
    if (
      window.confirm(
        'Sigur vrei să restartezi sesiunea? Progresul (răspunsuri), XP-ul și streak-ul vor fi resetate.'
      )
    ) {
      restartSession();
      userXPStateRef.current = null;
      lastSyncedSessionXPRef.current = 0;
      setShowCompletionModal(false);
      setShowXPAnimation(false);
      setShowStreakCelebration(false);
      setShowLevelUp(false);
      setShowSparkle(false);
      setShowShake(false);
      setAnswerFlash(null);
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

      // Sound & visual effects for correct/incorrect
      if (isCorrect) {
        soundEngine.playCorrect();
        setShowSparkle(true);
        setAnswerFlash('correct');
      } else {
        soundEngine.playIncorrect();
        setShowShake(true);
        setAnswerFlash('incorrect');
      }
      setTimeout(() => {
        setShowShake(false);
        setAnswerFlash(null);
      }, 500);

      // Trigger XP animation only if XP actually changed
      setTimeout(() => {
        const xpChange = useStudySessionsStore.getState().sessionXP - previousXP;
        if (xpChange !== 0) {
          setEarnedXP(xpChange);
          setShowXPAnimation(true);
          soundEngine.playXPGain();
        }

        // Check for level up during session
        checkLevelUp();
      }, 10);

      // Record correct answer timestamp for sliding-window achievement checks
      if (isCorrect) {
        recordCorrectAnswer();
      }

      // Check for streak celebration (5, 10, 15, 20, etc.) - only if correct
      if (isCorrect) {
        const newStreak = useStudySessionsStore.getState().streak; // Get updated streak from store
        if (newStreak % 5 === 0 && newStreak >= 5 && newStreak > currentStreak) {
          setCelebrationStreak(newStreak);
          setShowStreakCelebration(true);
          soundEngine.playStreak(newStreak);
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
          soundEngine.playAchievement();
          // Force immediate server sync to persist the achievement in the database
          // This prevents the edge case where client shows animation but server hasn't saved yet
          syncProgress();
        }
      }
      // Check for daily XP goal celebration
      if (!dailyXPGoalTriggeredRef.current && !dailyXPGoalCelebration) {
        const currentSessionXP = useStudySessionsStore.getState().sessionXP;
        const totalDailyXP = dailyStartXPRef.current + currentSessionXP;
        if (totalDailyXP >= dailyXPGoalRef.current) {
          dailyXPGoalTriggeredRef.current = true;
          const todayKey = `daily_xp_goal_${new Date().toISOString().split('T')[0]}`;
          sessionStorage.setItem(todayKey, 'true');
          setDailyXPGoalCelebration(true);
        }
      }
    }
    // Scenario C: Already answered (incorrect→correct or same) → Skip answerCard
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

    let effectiveCurrentXP: number;
    let effectiveNextLevelXP: number;
    let effectiveLevel: number;

    if (userXPStateRef.current) {
      // Level-up already happened this session - use ref + XP earned since last check
      const xpSinceLastCheck = currentSessionXP - userXPStateRef.current.sessionXPAtCheck;
      effectiveCurrentXP = userXPStateRef.current.currentXP + Math.max(0, xpSinceLastCheck);
      effectiveNextLevelXP = userXPStateRef.current.nextLevelXP;
      effectiveLevel = userXPStateRef.current.level;
    } else {
      // No level-up yet this session - use user XP + unsynced session XP
      const unsyncedXP = currentSessionXP - lastSyncedSessionXPRef.current;
      effectiveCurrentXP = user.currentXP + Math.max(0, unsyncedXP);
      effectiveNextLevelXP = user.nextLevelXP;
      effectiveLevel = user.level;
    }

    // Check if user has reached or exceeded next level threshold
    if (effectiveCurrentXP >= effectiveNextLevelXP && !showLevelUp) {
      const oldLevel = effectiveLevel;
      let newLevel = oldLevel;
      let remainingXP = effectiveCurrentXP;
      let nextLevelXP = effectiveNextLevelXP;

      // Calculate new level(s) - user might level up multiple times
      while (remainingXP >= nextLevelXP) {
        remainingXP -= nextLevelXP;
        newLevel++;
        // Each level requires 20% more XP (exponential growth)
        nextLevelXP = Math.floor(nextLevelXP * 1.2);
      }

      // Synchronously update ref to prevent re-triggering on next answer
      userXPStateRef.current = {
        currentXP: remainingXP,
        nextLevelXP,
        level: newLevel,
        sessionXPAtCheck: currentSessionXP,
      };

      // Also update React state for display (async, corrected on next render)
      updateUser({
        level: newLevel,
        currentXP: remainingXP,
        nextLevelXP: nextLevelXP,
      });

      setLevelUpData({ oldLevel, newLevel });
      setShowLevelUp(true);
      soundEngine.playLevelUp();

      // Auto-hide after 3 seconds
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  };

  // Loading state
  if (isLoading || !currentSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-accent)' }}
          ></div>
          <p style={{ color: 'var(--text-tertiary)' }}>Se încarcă sesiunea...</p>
        </div>
      </div>
    );
  }

  const currentCard = getCurrentCard();

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p style={{ color: 'var(--text-tertiary)' }}>Nu există carduri în această sesiune.</p>
          <button
            onClick={onBack}
            className="mt-4 px-6 py-2 text-white rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--dashboard-bg)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 font-medium transition-all active:scale-95"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowLeft size={20} />
              Înapoi
            </button>

            {/* Shuffle, Restart & Finalizare Buttons */}
            <div className="flex items-center gap-2 mr-12 sm:mr-0">
              <button
                onClick={handleShuffle}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all active:scale-95"
                style={{ color: 'var(--color-accent)' }}
                title="Amestecă cardurile"
              >
                <Shuffle size={18} />
                <span className="hidden sm:inline">Amestecă</span>
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-3 py-2 text-sm text-orange-500 rounded-lg font-medium transition-all active:scale-95"
                style={{ ['--hover-bg' as string]: 'rgba(249, 115, 22, 0.1)' }}
                onMouseEnter={e =>
                  (e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.1)')
                }
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Restartează sesiunea"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Restart</span>
              </button>

              <button
                onClick={() => setShowCompletionModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-green-500 rounded-lg font-medium transition-all active:scale-95"
                onMouseEnter={e =>
                  (e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)')
                }
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Finalizează sesiunea"
              >
                <CheckCircle size={18} />
                <span className="hidden sm:inline">Finalizare</span>
              </button>
            </div>
          </div>

          {/* Session Title */}
          <div
            className="rounded-xl shadow-sm p-6"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '1px',
              borderColor: 'var(--card-border)',
            }}
          >
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {currentSession.deck?.title || currentSession.title || 'Sesiune de studiu'}
              {currentSession.deck?.difficulty && (
                <span
                  className="ml-2 text-lg font-semibold"
                  style={{ color: 'var(--color-accent-text)' }}
                >
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
        <ScreenShake active={showShake} intensity="medium">
          <div
            className={`mb-6 relative rounded-2xl transition-shadow ${answerFlash === 'correct' ? 'animate-correct-flash' : answerFlash === 'incorrect' ? 'animate-incorrect-flash' : ''}`}
          >
            {currentCard.type === 'standard' && (
              <StandardCard
                card={currentCard}
                onAnswer={handleAnswer}
                onNext={() => {
                  if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
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
                isSkipped={answers[currentCard.id] === 'skipped'}
                canEditDelete={canEditDelete}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            )}
            {currentCard.type === 'quiz' && (
              <QuizCard
                card={currentCard}
                onAnswer={handleAnswer}
                onAutoAdvance={() => {
                  const totalCards = currentSession?.cards?.length || 0;
                  if (currentCardIndex < totalCards - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
                }}
                onNext={() => {
                  if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
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
                canEditDelete={canEditDelete}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            )}
            {currentCard.type === 'type-answer' && (
              <TypeAnswerCard
                card={currentCard}
                onAnswer={handleAnswer}
                onAutoAdvance={() => {
                  const totalCards = currentSession?.cards?.length || 0;
                  if (currentCardIndex < totalCards - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
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
                canEditDelete={canEditDelete}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            )}
            {currentCard.type === 'multiple-answer' && (
              <MultipleAnswerCard
                card={currentCard}
                onAnswer={handleAnswer}
                onAutoAdvance={() => {
                  const totalCards = currentSession?.cards?.length || 0;
                  if (currentCardIndex < totalCards - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
                }}
                onNext={() => {
                  if (currentCardIndex < (currentSession?.cards?.length || 0) - 1) {
                    nextCard();
                  } else {
                    setShowCompletionModal(true);
                  }
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
                canEditDelete={canEditDelete}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
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
        </ScreenShake>

        {/* Particle Effects */}
        <SparkleExplosion active={showSparkle} onComplete={() => setShowSparkle(false)} />

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

        {/* Daily XP Goal Celebration */}
        {dailyXPGoalCelebration && (
          <AchievementCelebration
            icon="zap"
            title={`Daily XP Goal! +${Math.floor(dailyXPGoalRef.current * 0.01)} XP bonus`}
            color="bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
            onComplete={() => setDailyXPGoalCelebration(false)}
          />
        )}

        {/* Session Completion Modal (sound triggered via effect below) */}
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
            cards={currentSession.cards || []}
            answers={answers}
            onSaveAndExit={handleSaveAndExit}
            onFinishAndExit={handleFinishAndExit}
            onReviewMistakes={handleReviewMistakes}
          />
        )}

        {/* Edit Card Modal (teachers/admins) */}
        {editingCard && (
          <EditCardModal
            card={editingCard}
            onClose={() => setEditingCard(null)}
            onSave={handleCardSaved}
          />
        )}
      </div>
    </div>
  );
};
