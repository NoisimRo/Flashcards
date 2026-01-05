import React, { useEffect, useState, useCallback } from 'react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';
import StudySession from '../../../components/StudySession';
import type { Deck, Card, User, SessionData } from '../../../types';
import type { CardProgressBatchUpdate } from '../../types/api';

interface StudySessionPlayerProps {
  sessionId: string;
  user: User;
  onFinish: () => void;
  onBack: () => void;
}

/**
 * Wrapper around existing StudySession component
 * Integrates with new study sessions architecture
 */
const StudySessionPlayer: React.FC<StudySessionPlayerProps> = ({
  sessionId,
  user,
  onFinish,
  onBack,
}) => {
  const toast = useToast();
  const { currentSession, loadSession, updateSessionProgress, completeSession } =
    useStudySessionsStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [localDeck, setLocalDeck] = useState<Deck | null>(null);

  // Load session on mount
  useEffect(() => {
    loadSession(sessionId).then(() => {
      setIsInitialized(true);
    });
  }, [sessionId, loadSession]);

  // Convert session to Deck format for existing StudySession component
  useEffect(() => {
    if (currentSession && currentSession.cards) {
      // Transform session data to Deck format
      const deck: Deck = {
        id: currentSession.deckId || '',
        title: currentSession.deck?.title || currentSession.title,
        subject: currentSession.deck?.subjectName || currentSession.deck?.subject || 'Necunoscut',
        topic: currentSession.deck?.topic || '',
        difficulty: (currentSession.deck?.difficulty as any) || 'A2',
        cards: currentSession.cards.map(card => {
          const progress = currentSession.cardProgress?.[card.id];
          // Map CardStatus to local Card status type
          let status: 'new' | 'learning' | 'mastered' = 'new';
          if (progress) {
            if (progress.status === 'mastered') status = 'mastered';
            else if (progress.status === 'learning' || progress.status === 'reviewing')
              status = 'learning';
            else status = 'new';
          }

          return {
            ...card,
            status,
            // Convert CardType to local Card type
            type: card.type === 'type-answer' ? 'standard' : (card.type as 'standard' | 'quiz'),
          };
        }),
        totalCards: currentSession.totalCards,
        masteredCards: 0,
        // Restore session data if exists
        sessionData: {
          answers: currentSession.answers,
          streak: currentSession.streak,
          sessionXP: currentSession.sessionXP,
          awardedCards: [],
          currentIndex: currentSession.currentCardIndex,
          shuffledOrder: currentSession.selectedCardIds,
        },
      };

      setLocalDeck(deck);
    }
  }, [currentSession]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (!currentSession || !localDeck?.sessionData) return;

    const interval = setInterval(() => {
      updateSessionProgress(sessionId, {
        currentCardIndex: localDeck.sessionData!.currentIndex,
        answers: localDeck.sessionData!.answers,
        streak: localDeck.sessionData!.streak,
        sessionXP: localDeck.sessionData!.sessionXP,
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [sessionId, localDeck, currentSession, updateSessionProgress]);

  const handleSaveProgress = useCallback(
    (deckId: string, data: SessionData) => {
      console.log('📥 [StudySessionPlayer] handleSaveProgress called', {
        sessionId,
        deckId,
        data,
      });
      // Update local state
      setLocalDeck(prev =>
        prev
          ? {
              ...prev,
              sessionData: data,
            }
          : null
      );

      // Calculate elapsed time for incremental tracking
      const durationSeconds = currentSession
        ? Math.floor((Date.now() - new Date(currentSession.startedAt).getTime()) / 1000)
        : 0;

      // Debounced save to backend
      console.log('🚀 [StudySessionPlayer] Calling updateSessionProgress with:', {
        currentCardIndex: data.currentIndex,
        answers: data.answers,
        streak: data.streak,
        sessionXP: data.sessionXP,
        durationSeconds,
      });
      updateSessionProgress(sessionId, {
        currentCardIndex: data.currentIndex,
        answers: data.answers,
        streak: data.streak,
        sessionXP: data.sessionXP,
        durationSeconds,
      });
    },
    [sessionId, currentSession, updateSessionProgress]
  );

  const handleFinish = useCallback(
    async (score: number, totalCards: number, clearSession: boolean) => {
      if (!localDeck || !currentSession) return;

      const sessionData = localDeck.sessionData!;

      // If clearSession is false, just save progress and exit (don't complete)
      if (!clearSession) {
        // Calculate elapsed time
        const startTime = new Date(currentSession.startedAt).getTime();
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        // Save current progress with duration
        await updateSessionProgress(sessionId, {
          currentCardIndex: sessionData.currentIndex,
          answers: sessionData.answers,
          streak: sessionData.streak,
          sessionXP: sessionData.sessionXP,
          durationSeconds,
        });
        toast.success('Progres salvat! Poți relua sesiunea mai târziu.');
        onFinish();
        return;
      }

      // Calculate results for completion
      const answersArray = Object.values(sessionData.answers);
      const correctCount = answersArray.filter(a => a === 'correct').length;
      const incorrectCount = answersArray.filter(a => a === 'incorrect').length;
      const skippedCount = answersArray.filter(a => a === 'skipped').length;

      // Calculate duration (rough estimate)
      const startTime = new Date(currentSession.startedAt).getTime();
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      // Build card progress updates
      const cardProgressUpdates: CardProgressBatchUpdate[] = [];
      currentSession.selectedCardIds.forEach(cardId => {
        const answer = sessionData.answers[cardId];
        if (answer === 'correct' || answer === 'incorrect') {
          cardProgressUpdates.push({
            cardId,
            wasCorrect: answer === 'correct',
            timeSpentSeconds: Math.floor(durationSeconds / totalCards),
          });
        }
      });

      // Complete session
      const result = await completeSession(sessionId, {
        score,
        correctCount,
        incorrectCount,
        skippedCount,
        durationSeconds,
        cardProgressUpdates,
      });

      if (result) {
        // Show level up notification if applicable
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
    },
    [sessionId, localDeck, currentSession, completeSession, updateSessionProgress, toast, onFinish]
  );

  if (!isInitialized || !localDeck || !currentSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă sesiunea...</p>
        </div>
      </div>
    );
  }

  // Use existing StudySession component
  return (
    <StudySession
      deck={localDeck}
      user={user}
      onFinish={handleFinish}
      onSaveProgress={handleSaveProgress}
      onUpdateUserXP={() => {}} // XP handled by backend
      onBack={onBack}
      onEditCard={() => {}} // Disabled in session
      onDeleteCard={() => {}} // Disabled in session
    />
  );
};

export default StudySessionPlayer;
