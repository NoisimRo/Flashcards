import React, { useEffect } from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';
import type { User } from '../../../types';

interface StudySessionPlayerProps {
  sessionId: string;
  user: User;
  onFinish: () => void;
  onBack: () => void;
}

/**
 * Simplified wrapper - Store now handles all session logic
 */
const StudySessionPlayer: React.FC<StudySessionPlayerProps> = ({
  sessionId,
  user,
  onFinish,
  onBack,
}) => {
  const toast = useToast();
  const {
    currentSession,
    loadSession,
    enableAutoSave,
    disableAutoSave,
    completeSession,
    isLoading,
  } = useStudySessionsStore();

  // Load session and enable auto-save
  useEffect(() => {
    loadSession(sessionId);
    enableAutoSave();

    return () => {
      disableAutoSave();
    };
  }, [sessionId, loadSession, enableAutoSave, disableAutoSave]);

  // Handle finish - sync with backend
  const handleFinish = async (clearSession: boolean) => {
    if (!currentSession) return;

    // If clearSession is false, just save and exit
    if (!clearSession) {
      toast.success('Progres salvat! Poți relua sesiunea mai târziu.');
      onFinish();
      return;
    }

    // Complete session with final results
    const { answers, sessionXP } = useStudySessionsStore.getState();
    const answersArray = Object.values(answers);
    const correctCount = answersArray.filter(a => a === 'correct').length;
    const incorrectCount = answersArray.filter(a => a === 'incorrect').length;
    const skippedCount = answersArray.filter(a => a === 'skipped').length;
    const totalCards = currentSession.cards?.length || 0;
    const score = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

    const result = await completeSession(sessionId, {
      score,
      correctCount,
      incorrectCount,
      skippedCount,
      durationSeconds: useStudySessionsStore.getState().baselineDuration +
        Math.floor((Date.now() - useStudySessionsStore.getState().sessionStartTime) / 1000),
      cardProgressUpdates: currentSession.selectedCardIds.map(cardId => ({
        cardId,
        wasCorrect: answers[cardId] === 'correct',
        timeSpentSeconds: Math.floor(
          (useStudySessionsStore.getState().baselineDuration +
            Math.floor((Date.now() - useStudySessionsStore.getState().sessionStartTime) / 1000)) /
            totalCards
        ),
      })),
    });

    if (result) {
      if (result.leveledUp) {
        toast.success(
          `🎉 LEVEL UP! Nivel ${result.oldLevel} → ${result.newLevel}! +${result.xpEarned} XP`
        );
      } else if (result.xpEarned > 0) {
        toast.success(
          `Sesiune completată! +${result.xpEarned} XP | Scor: ${score}% (${correctCount}/${totalCards} corecte)`
        );
      } else {
        toast.success(`Sesiune completată! Scor: ${score}% (${correctCount}/${totalCards} corecte)`);
      }
      onFinish();
    } else {
      toast.error('Eroare la finalizarea sesiunii');
    }
  };

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

  // Render session UI - Store handles all state
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Înapoi
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4">
            {currentSession.deck?.title || currentSession.title}
          </h1>

          <p className="text-gray-600 mb-6">
            Session player UI will be implemented here using Zustand store state.
          </p>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Progress:</span>
              <span className="font-bold">
                Card {useStudySessionsStore.getState().currentCardIndex + 1} of {currentSession.cards?.length || 0}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">XP:</span>
              <span className="font-bold text-green-600">
                {useStudySessionsStore.getState().sessionXP} XP
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Streak:</span>
              <span className="font-bold text-orange-600">
                {useStudySessionsStore.getState().streak}
              </span>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => handleFinish(false)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Salvează & Ieși
            </button>
            <button
              onClick={() => handleFinish(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Finalizează Sesiune
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySessionPlayer;
