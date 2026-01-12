import React from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';
import { StudySessionContainer } from '../study-session/StudySessionContainer';
import type { User } from '../../../types';

interface StudySessionPlayerProps {
  sessionId: string;
  user: User;
  onFinish: () => void;
  onBack: () => void;
}

/**
 * StudySessionPlayer - Wrapper component with completion logic
 * Delegates UI rendering to StudySessionContainer
 */
const StudySessionPlayer: React.FC<StudySessionPlayerProps> = ({
  sessionId,
  user,
  onFinish,
  onBack,
}) => {
  const toast = useToast();
  const { currentSession, completeSession } = useStudySessionsStore();

  // Handle session completion
  const handleComplete = async () => {
    if (!currentSession) return;

    const { answers, sessionXP, baselineDuration, sessionStartTime } =
      useStudySessionsStore.getState();

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
      durationSeconds: baselineDuration + Math.floor((Date.now() - sessionStartTime) / 1000),
      cardProgressUpdates: currentSession.selectedCardIds.map(cardId => ({
        cardId,
        wasCorrect: answers[cardId] === 'correct',
        timeSpentSeconds: Math.floor(
          (baselineDuration + Math.floor((Date.now() - sessionStartTime) / 1000)) / totalCards
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
        toast.success(
          `Sesiune completată! Scor: ${score}% (${correctCount}/${totalCards} corecte)`
        );
      }
      onFinish();
    } else {
      toast.error('Eroare la finalizarea sesiunii');
    }
  };

  // Render the new atomic design UI
  return <StudySessionContainer sessionId={sessionId} onFinish={handleComplete} onBack={onBack} />;
};

export default StudySessionPlayer;
