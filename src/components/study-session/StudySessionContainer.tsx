import React, { useEffect } from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { StandardCard } from './cards/StandardCard';
import { QuizCard } from './cards/QuizCard';
import { TypeAnswerCard } from './cards/TypeAnswerCard';
import { NavigationControls } from './controls/NavigationControls';
import { ProgressBar } from './progress/ProgressBar';
import { SessionStats } from './progress/SessionStats';
import { StreakIndicator } from './feedback/StreakIndicator';
import { XPIndicator } from './feedback/XPIndicator';
import { ArrowLeft } from 'lucide-react';

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
  } = useStudySessionsStore();

  // Load session and enable auto-save on mount
  useEffect(() => {
    loadSession(sessionId);
    enableAutoSave();

    return () => {
      disableAutoSave();
      resetSessionState();
    };
  }, [sessionId, loadSession, enableAutoSave, disableAutoSave, resetSessionState]);

  // Handle answer submission
  const handleAnswer = (isCorrect: boolean) => {
    const currentCard = getCurrentCard();
    if (!currentCard) return;

    answerCard(currentCard.id, isCorrect);

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
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Înapoi
          </button>

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
