import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Deck, Card, User, SessionData } from '../types';
import { useToast } from '../src/components/ui/Toast';
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  RotateCw,
  Shuffle,
  SkipForward,
  Undo2,
  Edit2,
  Trash2,
  Flame,
  X,
  Save,
  Trophy,
  RefreshCcw,
  Sparkles,
  ArrowRight,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StudySessionProps {
  deck: Deck;
  user: User;
  onFinish: (score: number, totalCards: number, clearSession: boolean) => void;
  onSaveProgress: (deckId: string, data: SessionData) => void;
  onUpdateUserXP: (xp: number) => void;
  onBack: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
}

type AnswerStatus = 'correct' | 'incorrect' | 'skipped' | null;

const StudySession: React.FC<StudySessionProps> = ({
  deck,
  user,
  onFinish,
  onSaveProgress,
  onUpdateUserXP,
  onBack,
  onEditCard,
  onDeleteCard,
}) => {
  // Toast for notifications
  const toast = useToast();

  // --- STATE ---

  // Initialization: check for sessionData in deck
  const hasSavedSession =
    !!deck.sessionData && Object.keys(deck.sessionData.answers).length < deck.cards.length;

  const [activeCards, setActiveCards] = useState<Card[]>(() => {
    if (hasSavedSession && deck.sessionData?.shuffledOrder) {
      // Reconstruct order from saved IDs
      const orderMap = new Map(deck.cards.map(c => [c.id, c]));
      const ordered = deck.sessionData.shuffledOrder
        .map(id => orderMap.get(id))
        .filter(Boolean) as Card[];
      return ordered.length > 0 ? ordered : [...deck.cards];
    }
    return [...deck.cards];
  });

  const [currentIndex, setCurrentIndex] = useState(() =>
    hasSavedSession ? deck.sessionData!.currentIndex : 0
  );
  const [answers, setAnswers] = useState<Record<string, AnswerStatus>>(() =>
    hasSavedSession ? deck.sessionData!.answers : {}
  );
  const [streak, setStreak] = useState(() => (hasSavedSession ? deck.sessionData!.streak : 0));
  const [sessionXP, setSessionXP] = useState(() =>
    hasSavedSession ? deck.sessionData!.sessionXP : 0
  );
  const [awardedCards, setAwardedCards] = useState<Set<string>>(() =>
    hasSavedSession ? new Set(deck.sessionData!.awardedCards) : new Set()
  );

  // Navigation & Display
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Hint System
  const [hintRevealed, setHintRevealed] = useState(false);

  // Type-in Answer Feature
  const [userInputValue, setUserInputValue] = useState('');
  const [inputFeedback, setInputFeedback] = useState<'success' | 'error' | null>(null);

  // UX / Animations
  const [isFinished, setIsFinished] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [floatingXP, setFloatingXP] = useState<{ show: boolean; id: number }>({
    show: false,
    id: 0,
  });

  const totalProjectedXP = user.currentXP + sessionXP;
  const isLevelUp = totalProjectedXP >= user.nextLevelXP;

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quiz State
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  // Touch/Swipe State
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null);
  const [swipeActive, setSwipeActive] = useState(false);

  const SWIPE_THRESHOLD = 100; // Minimum distance for valid swipe

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    console.log('🔍 [StudySession] Persistence effect triggered', {
      isFinished,
      answers,
      currentIndex,
      sessionXP,
    });
    if (!isFinished) {
      const data: SessionData = {
        answers,
        streak,
        sessionXP,
        awardedCards: Array.from(awardedCards),
        currentIndex,
        shuffledOrder: activeCards.map(c => c.id),
      };
      console.log('💾 [StudySession] Calling onSaveProgress with data:', data);
      onSaveProgress(deck.id, data);
    }
  }, [
    answers,
    streak,
    sessionXP,
    awardedCards,
    currentIndex,
    activeCards,
    isFinished,
    deck.id,
    onSaveProgress,
  ]);

  // Adjust index if card deleted
  useEffect(() => {
    if (currentIndex >= activeCards.length && activeCards.length > 0) {
      setCurrentIndex(activeCards.length - 1);
    }
  }, [activeCards.length, currentIndex]);

  // Trigger level up animation
  useEffect(() => {
    if (isLevelUp && !showLevelUp) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
  }, [isLevelUp]);

  // --- LOGIC ---

  const currentCard = activeCards[currentIndex];
  const progress = activeCards.length > 0 ? (currentIndex / activeCards.length) * 100 : 0;
  const currentAnswer = currentCard ? answers[currentCard.id] : null;

  // Chart Data Calculation
  const correctCount = Object.values(answers).filter(a => a === 'correct').length;
  const incorrectCount = Object.values(answers).filter(a => a === 'incorrect').length;
  const skippedCount = Object.values(answers).filter(a => a === 'skipped').length;
  const remainingCount = activeCards.length - (correctCount + incorrectCount + skippedCount);

  const pieData = [
    { name: 'Știut', value: correctCount, color: '#22c55e' }, // green-500
    { name: 'Neștiut', value: incorrectCount, color: '#ef4444' }, // red-500
    { name: 'Sărit', value: skippedCount, color: '#9ca3af' }, // gray-400
    { name: 'Rămas', value: remainingCount, color: '#e5e7eb' }, // gray-200
  ];

  // Restart / Reset
  const handleRestartSession = () => {
    if (
      confirm('Ești sigur că vrei să începi de la zero? Progresul sesiunii curente se va pierde.')
    ) {
      // Reset everything
      const freshCards = [...deck.cards];
      setActiveCards(freshCards);
      setAnswers({});
      setStreak(0);
      setSessionXP(0);
      setAwardedCards(new Set());
      setCurrentIndex(0);
      setIsFinished(false);
      setHintRevealed(false);
      setUserInputValue('');
      setInputFeedback(null);

      // Also update the persistent store immediately to avoid stale data on resume
      const resetData: SessionData = {
        answers: {},
        streak: 0,
        sessionXP: 0,
        awardedCards: [],
        currentIndex: 0,
        shuffledOrder: freshCards.map(c => c.id),
      };
      onSaveProgress(deck.id, resetData);
    }
  };

  const toggleShuffle = () => {
    const shuffled = [...activeCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setActiveCards(shuffled);
    setCurrentIndex(0);
    setIsShuffled(true);
  };

  const handleUseHint = () => {
    if (hintRevealed) return;

    const COST = 20;

    // Check available XP including session XP
    const availableXP = user.currentXP + sessionXP;
    if (availableXP < COST) {
      toast.warning(
        'XP Insuficient',
        `Ai nevoie de ${COST} XP pentru indiciu, dar ai doar ${availableXP} XP.`
      );
      return;
    }

    // Deduct XP from session first, then from user if needed
    if (sessionXP >= COST) {
      setSessionXP(prev => prev - COST);
    } else {
      const remainingCost = COST - sessionXP;
      setSessionXP(0);
      // Send negative delta to deduct XP
      onUpdateUserXP(-remainingCost);
    }

    // Reveal Hint
    setHintRevealed(true);
    toast.info('Indiciu folosit', `-${COST} XP`);
  };

  // Helper to render context with bold word
  const renderContext = (context: string, word: string) => {
    if (!context) return null;

    // Simple case-insensitive match for the word to bold it
    const parts = context.split(new RegExp(`(${word})`, 'gi'));
    return (
      <span className="italic">
        {parts.map((part, i) =>
          part.toLowerCase() === word.toLowerCase() ? (
            <strong key={i} className="text-gray-900 not-italic border-b-2 border-yellow-300">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Review Loop (Continue with incorrect)
  const handleReviewMistakes = () => {
    const incorrectIds = Object.keys(answers).filter(
      id => answers[id] === 'incorrect' || answers[id] === 'skipped'
    );
    const incorrectCards = deck.cards.filter(c => incorrectIds.includes(c.id));

    if (incorrectCards.length === 0) return;

    // Shuffle the incorrect cards
    const shuffled = [...incorrectCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setActiveCards(shuffled);
    setAnswers({});
    setCurrentIndex(0);
    setStreak(0);
    setIsFinished(false);
    setUserInputValue('');
    setInputFeedback(null);
    setHintRevealed(false);
  };

  const handleFlip = () => {
    // Strict Mode: If manually flipping, assume incorrect
    if (!isFlipped && !inputFeedback) {
      setAnswers(prev => ({ ...prev, [activeCards[currentIndex].id]: 'incorrect' }));
      setStreak(0);
    }
    setIsFlipped(!isFlipped);
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setUserInputValue('');
      setInputFeedback(null);
      setHintRevealed(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 150);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    setIsFlipped(false);
    setUserInputValue('');
    setInputFeedback(null);
    setHintRevealed(false);
    setTimeout(() => {
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex(c => c + 1);
      } else {
        setIsFinished(true);
      }
    }, 150);
  }, [currentIndex, activeCards.length]);

  const handleAnswer = useCallback(
    (status: 'correct' | 'incorrect') => {
      const cardId = activeCards[currentIndex].id;

      // Strict Mode: Don't allow changing from Incorrect to Correct
      if (status === 'correct' && answers[cardId] === 'incorrect') {
        goToNext();
        return;
      }

      setAnswers(prev => ({ ...prev, [cardId]: status }));

      if (status === 'correct') {
        if (!awardedCards.has(cardId)) {
          const newStreak = streak + 1;
          setStreak(newStreak);

          // Award 10 XP for correct answer
          let xpGained = 10;

          // Award bonus 50 XP for every 5 streak
          if (newStreak > 0 && newStreak % 5 === 0) {
            xpGained += 50;
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 4000);
            toast.success(
              'Streak Bonus!',
              `+50 XP pentru ${newStreak} răspunsuri consecutive corecte!`
            );
          }

          setSessionXP(prev => prev + xpGained);
          setAwardedCards(prev => new Set(prev).add(cardId));

          setFloatingXP({ show: true, id: Date.now() });
          setTimeout(() => setFloatingXP(prev => ({ ...prev, show: false })), 1500);
        }
      } else {
        setStreak(0);
      }

      goToNext();
    },
    [activeCards, currentIndex, goToNext, streak, awardedCards, answers, toast]
  );

  const handleSkip = useCallback(() => {
    if (activeCards[currentIndex] && !answers[activeCards[currentIndex].id]) {
      setAnswers(prev => ({
        ...prev,
        [activeCards[currentIndex].id]: 'skipped',
      }));
    }
    goToNext();
  }, [activeCards, currentIndex, answers, goToNext]);

  const handleQuizAnswer = (idx: number) => {
    if (quizAnswered) return; // Prevent multiple answers

    setSelectedQuizOption(idx);
    setQuizAnswered(true);

    const isCorrect = idx === currentCard.correctOptionIndex;

    // Show feedback for 1.5 seconds before moving to next card
    setTimeout(() => {
      handleAnswer(isCorrect ? 'correct' : 'incorrect');
      setSelectedQuizOption(null);
      setQuizAnswered(false);
    }, 1500);
  };

  // --- Type-in Logic ---
  const checkInputAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const userAnswer = userInputValue.trim().toLowerCase();
    const correctAnswers = currentCard.back.split(/[,;]/).map(s => s.trim().toLowerCase());
    const isMatch = correctAnswers.some(
      ans => ans === userAnswer || (ans.length > 3 && userAnswer.includes(ans))
    );

    if (isMatch) {
      setInputFeedback('success');
      setIsFlipped(true);
      setTimeout(() => handleAnswer('correct'), 1000);
    } else {
      setInputFeedback('error');
      setIsFlipped(true);
      setAnswers(prev => ({ ...prev, [currentCard.id]: 'incorrect' }));
      setStreak(0);
    }
  };

  // --- Swipe Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !swipeActive) return;
    const touch = e.targetTouches[0];
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchCurrent) {
      resetSwipe();
      return;
    }

    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = Math.abs(touchCurrent.y - touchStart.y);

    // Check if horizontal swipe (not vertical scroll)
    if (deltaY > 50) {
      resetSwipe();
      return;
    }

    // Check total movement
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // TAP (minimal movement) → Flip card
    if (totalMovement < 20) {
      handleFlip();
    }
    // Swipe LEFT → Previous Card (Back)
    else if (deltaX < -SWIPE_THRESHOLD) {
      triggerHaptic();
      goToPrevious();
    }
    // Swipe RIGHT → Next Card
    else if (deltaX > SWIPE_THRESHOLD) {
      triggerHaptic();
      goToNext();
    }

    resetSwipe();
  };

  const resetSwipe = () => {
    setSwipeActive(false);
    setTouchStart(null);
    setTouchCurrent(null);
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // Subtle vibration
    }
  };

  // Calculate dynamic styles for swipe animation
  const getSwipeStyles = () => {
    if (!swipeActive || !touchStart || !touchCurrent) {
      return { transform: 'translateX(0px) rotate(0deg)', opacity: 1 };
    }

    const deltaX = touchCurrent.x - touchStart.x;
    const opacity = Math.max(0.6, 1 - Math.abs(deltaX) / 300);
    const rotation = deltaX * 0.05; // Subtle rotation

    return {
      transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
      opacity: opacity,
      transition: 'none',
    };
  };

  // Calculate indicator opacity
  const getIndicatorOpacity = (direction: 'left' | 'right') => {
    if (!swipeActive || !touchStart || !touchCurrent) return 0;

    const deltaX = touchCurrent.x - touchStart.x;
    if (direction === 'left' && deltaX < 0) {
      return Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
    }
    if (direction === 'right' && deltaX > 0) {
      return Math.min(deltaX / SWIPE_THRESHOLD, 1);
    }
    return 0;
  };

  // CRUD Handlers
  const openEditModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCard({ ...currentCard });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCard) {
      onEditCard(editingCard);
      setEditingCard(null);
    }
  };

  const deleteCurrentCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDeleteCard(currentCard.id);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || editingCard) return;

      if (document.activeElement === inputRef.current) {
        if (e.key === 'Enter') {
          checkInputAnswer();
        }
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          if (!isFlipped) {
            handleFlip();
          }
          break;
        case 'ArrowLeft':
          if (currentCard.type === 'standard' && isFlipped) handleAnswer('incorrect');
          else goToPrevious();
          break;
        case 'ArrowRight':
          // Strict mode: If already incorrect, Right Arrow just moves next
          if (currentCard.type === 'standard' && isFlipped) {
            if (currentAnswer === 'incorrect') goToNext();
            else handleAnswer('correct');
          } else handleSkip();
          break;
        case 'ArrowUp':
          handleFlip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFinished,
    isFlipped,
    currentCard,
    goToPrevious,
    handleSkip,
    handleAnswer,
    handleFlip,
    editingCard,
    userInputValue,
    currentAnswer,
    goToNext,
  ]);

  const calculateScore = () => Object.values(answers).filter(a => a === 'correct').length;
  const incorrectTotal = Object.values(answers).filter(
    a => a === 'incorrect' || a === 'skipped'
  ).length;

  // Sync session XP to backend and finish
  const handleFinishWithXPSync = async (score: number, clearSession: boolean) => {
    // Sync accumulated session XP to backend
    if (sessionXP > 0) {
      await onUpdateUserXP(sessionXP);
    }
    // Call original finish handler
    onFinish(score, deck.totalCards, clearSession);
  };

  // --- RENDER ---

  if (activeCards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Deck Gol</h2>
        <p className="mb-4 text-gray-500">Nu există carduri în acest deck.</p>
        <button
          onClick={onBack}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium"
        >
          Înapoi
        </button>
      </div>
    );
  }

  if (isFinished) {
    const score = calculateScore();
    const isPerfect = incorrectTotal === 0;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#F8F6F1]">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full animate-pop-in">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isPerfect ? 'bg-green-100' : 'bg-orange-100'}`}
          >
            {isPerfect ? (
              <CheckCircle className="text-green-600 w-10 h-10" />
            ) : (
              <RefreshCcw className="text-orange-600 w-10 h-10" />
            )}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isPerfect ? 'Sesiune Perfectă!' : 'Rundă Completă!'}
          </h2>
          <p className="text-gray-500 mb-8">
            {isPerfect
              ? `Ai știut toate cele ${activeCards.length} carduri.`
              : `Ai greșit ${incorrectTotal} din ${activeCards.length} carduri.`}
          </p>

          <div className="mb-6 bg-gray-50 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-gray-500">XP Sesiune</span>
              <span className="font-bold text-green-600">+{sessionXP} XP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Total XP</span>
              <span className="font-bold text-gray-900">{user.currentXP + sessionXP} XP</span>
            </div>
          </div>

          {isPerfect ? (
            <button
              onClick={() => handleFinishWithXPSync(score, true)}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
            >
              Finalizează & Ieși
            </button>
          ) : (
            <button
              onClick={handleReviewMistakes}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCcw size={20} /> Continuă cu cele greșite
            </button>
          )}

          <div className="mt-4">
            <button
              onClick={() => handleFinishWithXPSync(score, false)}
              className="text-gray-500 font-bold py-2 hover:text-gray-900 text-sm"
            >
              Continuă mai târziu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentLevel = isLevelUp ? user.level + 1 : user.level;

  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-4xl mx-auto relative overflow-hidden">
      {/* Streak Celebration */}
      {showCelebration && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-pop-in border-4 border-orange-400">
            <Trophy className="w-20 h-20 text-yellow-500 mb-4 animate-bounce" />
            <h2 className="text-4xl font-black text-gray-900 italic tracking-tighter">EXCELENT!</h2>
            <p className="text-xl font-bold text-orange-500 mt-2">{streak} la rând!</p>
          </div>
        </div>
      )}

      {/* Level Up Overlay */}
      {showLevelUp && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none">
          <div className="animate-level-up flex flex-col items-center">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-5xl font-black text-indigo-600 tracking-tighter drop-shadow-lg bg-white/80 backdrop-blur-sm px-8 py-4 rounded-3xl border-4 border-indigo-200">
              LEVEL {user.level + 1}
            </h2>
          </div>
        </div>
      )}

      {/* Dynamic Header - Deck Name & Category */}
      <div className="mb-4 z-10 relative">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{deck.title}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {deck.subject} {deck.topic && `• ${deck.topic}`}
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 z-10 relative">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Progress Area */}
        <div className="flex-1 mx-4 flex flex-col justify-center">
          {/* Top Stats Row */}
          <div className="flex justify-between items-end mb-2 px-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {currentIndex + 1} / {activeCards.length}
              </span>
              {streak > 2 && (
                <div className="flex items-center gap-1 bg-orange-100 px-2 py-0.5 rounded-full animate-pop-in">
                  <Flame size={12} className="text-orange-500 fill-orange-500 animate-pulse" />
                  <span className="text-xs font-bold text-orange-600">{streak}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 relative">
                <Sparkles size={12} className="text-green-500 fill-green-500" />
                <span className="text-xs font-bold text-green-700">{totalProjectedXP} XP</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar + Chart Row */}
          <div className="flex items-center gap-3 mt-1">
            {/* Dynamic Pie Chart (Left) */}
            <div className="w-10 h-10 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={10}
                    outerRadius={20}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                    }}
                    itemStyle={{ padding: 0 }}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Thicker Progress Bar (Right) */}
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner relative">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleRestartSession}
            title="Restart"
            className="group relative p-2 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors shadow-sm"
          >
            <RotateCcw size={18} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Restart
            </span>
          </button>

          <button
            onClick={toggleShuffle}
            title="Amestecă cardurile"
            className={`p-2 rounded-full transition-colors ${isShuffled ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
          >
            <Shuffle size={20} />
          </button>
        </div>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center perspective-1000 min-h-[300px] md:min-h-[400px] z-10 relative">
        {/* Floating XP */}
        {floatingXP.show && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="text-green-500 font-black text-2xl animate-float-xp whitespace-nowrap drop-shadow-sm">
              +10 XP
            </div>
          </div>
        )}

        {currentCard.type === 'standard' ? (
          <div className="w-full max-w-lg aspect-[4/3.9] relative group">
            {/* Swipe Indicator LEFT - Înapoi */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/90 to-transparent rounded-[2rem] flex items-center justify-start px-8 pointer-events-none z-10"
              style={{ opacity: getIndicatorOpacity('left') }}
            >
              <ChevronLeft size={48} className="text-white" />
              <span className="text-white font-bold text-2xl ml-4">Înapoi</span>
            </div>

            {/* Swipe Indicator RIGHT - Înainte */}
            <div
              className="absolute inset-0 bg-gradient-to-l from-blue-500/90 to-transparent rounded-[2rem] flex items-center justify-end px-8 pointer-events-none z-10"
              style={{ opacity: getIndicatorOpacity('right') }}
            >
              <span className="text-white font-bold text-2xl mr-4">Înainte</span>
              <ChevronLeft size={48} className="text-white rotate-180" />
            </div>

            <div
              className={`
                  w-full h-full transition-all duration-500 transform-style-3d relative
                  ${isFlipped ? 'rotate-y-180' : ''}
                `}
              style={getSwipeStyles()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* FRONT */}
              <div
                className="absolute inset-0 backface-hidden bg-white border-2 border-[#E5E7EB] rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-6 md:p-10 text-center z-20 overflow-hidden cursor-pointer"
                onClick={e => {
                  // Don't flip if clicking on buttons or input
                  if ((e.target as HTMLElement).closest('button, input')) return;
                  handleFlip();
                }}
              >
                {/* Card Edit Controls (Top Right) */}
                <div
                  className="absolute top-4 right-4 flex gap-2 z-50 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={openEditModal}
                    className="p-2 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-full transition-colors cursor-pointer shadow-sm"
                    title="Editează"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={deleteCurrentCard}
                    className="p-2 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors cursor-pointer shadow-sm"
                    title="Șterge"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Hint Button (Top Left) */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleUseHint();
                  }}
                  className="absolute top-4 left-4 p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors flex items-center gap-1 shadow-sm z-50 cursor-pointer"
                  title="Folosește indiciu (-20 XP)"
                >
                  <Lightbulb size={18} fill={hintRevealed ? 'currentColor' : 'none'} />
                </button>

                {/* Status Badge (Center Top) */}
                {currentAnswer && (
                  <div
                    className={`absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm whitespace-nowrap z-40
                     ${
                       currentAnswer === 'correct'
                         ? 'bg-green-100 text-green-700'
                         : currentAnswer === 'incorrect'
                           ? 'bg-red-100 text-red-700'
                           : 'bg-gray-100 text-gray-600'
                     }
                   `}
                  >
                    {currentAnswer === 'correct'
                      ? 'Știut'
                      : currentAnswer === 'incorrect'
                        ? 'Neștiut'
                        : 'Sărit'}
                  </div>
                )}

                {/* Hint Reveal Area - Showing Context + Hint */}
                {hintRevealed && (
                  <div
                    key={`hint-${currentCard.id}`}
                    className="absolute top-20 left-0 right-0 px-8 animate-fade-in pointer-events-none z-30"
                  >
                    <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm p-4 rounded-xl shadow-sm text-center">
                      {/* Context Sentence Section */}
                      {currentCard.context && (
                        <div className="mb-3 text-gray-700 text-base leading-relaxed pb-3 border-b border-yellow-200/50">
                          {renderContext(currentCard.context, currentCard.front)}
                        </div>
                      )}

                      {/* Starts-with Hint Section */}
                      <div className="text-yellow-900 font-medium flex flex-col sm:flex-row items-center justify-center gap-1">
                        <span>Indiciu: Începe cu</span>
                        <span className="text-xl font-bold bg-white/50 px-2 rounded">
                          {currentCard.back.substring(0, 1).toUpperCase()}...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4 mt-8">
                  Întrebare
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 leading-snug select-none mb-6">
                  {currentCard.front}
                </h3>

                {/* Input Field on Front */}
                {!isFlipped && (
                  <div
                    className="w-full max-w-xs relative mt-auto mb-20 z-50"
                    onClick={e => e.stopPropagation()}
                  >
                    <form onSubmit={checkInputAnswer} className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 pr-12 text-center font-bold focus:border-indigo-500 focus:outline-none transition-colors"
                        placeholder="Scrie răspunsul... (opțional)"
                        value={userInputValue}
                        onChange={e => setUserInputValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                      <button
                        type="submit"
                        disabled={!userInputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-500 p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </form>
                  </div>
                )}

                {/* Navigation and Flip buttons at bottom of card */}
                {!isFlipped && (
                  <div className="absolute bottom-6 left-0 right-0 px-6 z-50">
                    <div className="flex items-center gap-3">
                      {/* Back Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          goToPrevious();
                        }}
                        disabled={currentIndex === 0}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        title="Card anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {/* Show Answer Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleFlip();
                        }}
                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-indigo-700 active:bg-indigo-800 transition-all active:scale-98"
                      >
                        Arată Răspunsul
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSkip();
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                        title="Card următor"
                      >
                        {currentIndex === activeCards.length - 1 ? (
                          <CheckCircle size={20} className="text-indigo-600" />
                        ) : (
                          <ArrowRight size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* BACK */}
              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 border-2 rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-6 md:p-10 text-center z-20 group cursor-pointer
                 ${inputFeedback === 'error' ? 'bg-red-50 border-red-200' : 'bg-[#F0FDF4] border-green-200'}
              `}
                onClick={e => {
                  // Don't flip if clicking on buttons
                  if ((e.target as HTMLElement).closest('button')) return;
                  handleFlip();
                }}
              >
                {/* Back Controls */}
                <div
                  className="absolute top-4 right-4 flex gap-2 z-50 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={openEditModal}
                    className="p-2 bg-white/50 hover:bg-white hover:text-indigo-600 rounded-full transition-colors shadow-sm cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                {inputFeedback === 'error' && (
                  <div className="mb-4 text-red-500 font-bold flex items-center gap-2 animate-pop-in">
                    <XCircle size={20} /> Răspuns greșit
                  </div>
                )}
                {inputFeedback === 'success' && (
                  <div className="mb-4 text-green-600 font-bold flex items-center gap-2 animate-pop-in">
                    <CheckCircle size={20} /> Corect!
                  </div>
                )}

                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">
                  Răspuns Corect
                </p>
                <h3 className="text-xl md:text-3xl font-medium text-gray-800 leading-relaxed select-none mb-6">
                  {currentCard.back}
                </h3>

                {/* Navigation and Answer buttons at bottom of back side */}
                <div className="absolute bottom-6 left-0 right-0 px-6 z-50">
                  {/* Navigation row */}
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        goToPrevious();
                      }}
                      disabled={currentIndex === 0}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 border border-gray-200 text-gray-600 shadow-sm hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      title="Card anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleSkip();
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/80 border border-gray-200 text-gray-600 shadow-sm hover:bg-white transition-all active:scale-95"
                      title="Card următor"
                    >
                      {currentIndex === activeCards.length - 1 ? (
                        <CheckCircle size={18} className="text-indigo-600" />
                      ) : (
                        <ArrowRight size={18} />
                      )}
                    </button>
                  </div>

                  {/* Answer buttons row */}
                  <div className="flex gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleAnswer('incorrect');
                      }}
                      className="flex-1 bg-red-100 text-red-700 border border-red-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-200 transition-all active:scale-95 shadow-sm"
                    >
                      <XCircle size={20} /> <span>Nu știu</span>
                    </button>

                    {currentAnswer === 'incorrect' ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          goToNext();
                        }}
                        className="flex-1 bg-gray-900 text-white border border-gray-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                      >
                        <span>Continuă</span> <ArrowRight size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleAnswer('correct');
                        }}
                        className="flex-1 bg-green-100 text-green-700 border border-green-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-200 transition-all active:scale-95 shadow-sm animate-pulse-green"
                      >
                        <CheckCircle size={20} /> <span>Știu</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Card */
          <div
            className="w-full max-w-lg min-h-[500px] bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100 animate-slide-up relative group"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Quiz Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-50 group-hover:opacity-100 transition-opacity">
              <button
                onClick={deleteCurrentCard}
                className="p-2 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <h3 className="text-2xl font-bold text-gray-800 text-center mb-8">
              {currentCard.front}
            </h3>
            <div className="space-y-3">
              {currentCard.options?.map((opt, idx) => {
                const isSelected = selectedQuizOption === idx;
                const isCorrect = idx === currentCard.correctOptionIndex;
                const showCorrect = quizAnswered && isCorrect;
                const showIncorrect = quizAnswered && isSelected && !isCorrect;

                return (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(idx)}
                    disabled={quizAnswered}
                    className={`w-full p-4 text-left border-2 rounded-xl transition-all font-medium active:scale-98 flex justify-between items-center
                      ${showCorrect ? 'bg-green-50 border-green-500 text-green-700' : ''}
                      ${showIncorrect ? 'bg-red-50 border-red-500 text-red-700' : ''}
                      ${!quizAnswered ? 'border-transparent bg-gray-50 hover:bg-indigo-50 hover:border-indigo-500 text-gray-700' : ''}
                      ${quizAnswered && !isSelected && !isCorrect ? 'opacity-50' : ''}
                    `}
                  >
                    <span>{opt}</span>
                    {showCorrect && <CheckCircle size={20} className="text-green-600" />}
                    {showIncorrect && <XCircle size={20} className="text-red-600" />}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons for Quiz cards */}
            <div className="absolute bottom-6 left-0 right-0 px-8">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  disabled={currentIndex === 0}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  title="Card anterior"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleSkip();
                  }}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border-2 border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                  title="Card următor"
                >
                  {currentIndex === activeCards.length - 1 ? (
                    <CheckCircle size={20} className="text-indigo-600" />
                  ) : (
                    <ArrowRight size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="hidden md:block text-center mt-4 text-xs text-gray-400 font-medium">
        [Space/Enter] Verifică/Întoarce &nbsp;•&nbsp; [←] Anterior / Greșit &nbsp;•&nbsp; [→]{' '}
        {currentAnswer === 'incorrect' ? 'Continuă' : 'Următor / Corect'}
      </div>

      {/* EDIT MODAL - Same as before */}
      {editingCard && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingCard(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Editează Card</h3>
              <button
                onClick={() => setEditingCard(null)}
                className="text-gray-400 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Față (Întrebare)
                </label>
                <textarea
                  className="w-full border-2 border-gray-100 rounded-xl p-3 font-medium focus:border-indigo-500 outline-none resize-none"
                  rows={3}
                  value={editingCard.front}
                  onChange={e => setEditingCard({ ...editingCard, front: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Spate (Răspuns)
                </label>
                <textarea
                  className="w-full border-2 border-gray-100 rounded-xl p-3 font-medium focus:border-indigo-500 outline-none resize-none"
                  rows={3}
                  value={editingCard.back}
                  onChange={e => setEditingCard({ ...editingCard, back: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Save size={18} /> Salvează Modificările
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySession;
