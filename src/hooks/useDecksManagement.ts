import { useCallback } from 'react';
import { useDecksStore } from '../store/decksStore';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../store/AuthContext';
import { shouldPromptLogin } from '../utils/guestMode';
import type { Deck, DeckWithCards, Card } from '../types';
import * as decksApi from '../api/decks';
import { getSubjectId } from '../constants/subjects';

/**
 * Custom hook for deck management operations
 * Extracts deck CRUD logic from App.tsx
 */
export function useDecksManagement() {
  const { isAuthenticated } = useAuth();
  const { decks, isLoading, fetchDecks: refreshDecks } = useDecksStore();
  const { setShowLoginPrompt } = useUIStore();

  const isGuest = !isAuthenticated;

  const handleAddDeck = useCallback(
    async (newDeck: DeckWithCards) => {
      if (isGuest) {
        // Guest deck already created via guest API — add to local state
        useDecksStore.getState().addDeckLocally(newDeck);
        return;
      }

      try {
        const response = await decksApi.createDeck({
          title: newDeck.title,
          subject: getSubjectId(newDeck.subject),
          topic: newDeck.topic,
          difficulty: newDeck.difficulty,
          language: newDeck.language || 'ro',
          cards: newDeck.cards.map(c => ({
            front: c.front,
            back: c.back,
            context: c.context,
            type: c.type,
            options: c.options,
            correctOptionIndices: c.correctOptionIndices,
            tags: c.tags,
          })),
        });

        if (response.success) {
          await refreshDecks({ ownedOnly: true });
        }
      } catch (error) {
        console.error('Error creating deck:', error);
      }
    },
    [isGuest, refreshDecks]
  );

  const handleEditDeck = useCallback(
    async (updatedDeck: DeckWithCards) => {
      if (isGuest) return;

      try {
        // Update deck metadata
        await decksApi.updateDeck(updatedDeck.id, {
          title: updatedDeck.title,
          subject: getSubjectId(updatedDeck.subject),
          topic: updatedDeck.topic,
          difficulty: updatedDeck.difficulty,
          language: updatedDeck.language || 'ro',
        });

        // Check if there are cards with temporary IDs (AI-generated or local)
        const cardsToSave = updatedDeck.cards.filter(
          card => card.id.startsWith('ai-') || card.id.startsWith('temp-')
        );

        if (cardsToSave.length > 0) {
          // Add each new card to backend
          for (const card of cardsToSave) {
            try {
              await decksApi.addCard(updatedDeck.id, {
                front: card.front,
                back: card.back,
                context: card.context,
                type: card.type,
                options: card.options,
                correctOptionIndices: card.correctOptionIndices,
                tags: card.tags,
              });
            } catch (cardError) {
              console.error('Error adding card:', cardError);
            }
          }
        }

        // Refresh decks to get updated data
        await refreshDecks({ ownedOnly: true });
      } catch (error) {
        console.error('Error updating deck:', error);
      }
    },
    [isGuest, refreshDecks]
  );

  const handleDeleteDeck = useCallback(
    async (deckId: string) => {
      if (!confirm('Ești sigur că vrei să ștergi acest deck?')) return;

      if (!isGuest) {
        try {
          await decksApi.deleteDeck(deckId);
        } catch (error) {
          console.error('Error deleting deck:', error);
        }
      }

      await refreshDecks({ ownedOnly: true });
    },
    [isGuest, refreshDecks]
  );

  const handleResetDeck = useCallback(
    (deckId: string) => {
      if (isGuest) {
        const prompt = shouldPromptLogin('reset-deck', true);
        if (prompt) {
          setShowLoginPrompt(true, prompt);
        }
        return;
      }

      if (confirm('Ești sigur că vrei să resetezi progresul pentru acest deck?')) {
        // TODO: Implement reset deck logic
        console.log('Reset deck:', deckId);
      }
    },
    [isGuest, setShowLoginPrompt]
  );

  const handleEditCard = useCallback((deckId: string, updatedCard: Card) => {
    // TODO: Implement card editing logic
    console.log('Edit card:', deckId, updatedCard);
  }, []);

  const handleDeleteCard = useCallback((deckId: string, cardId: string) => {
    if (!confirm('Vrei să elimini acest card din deck definitiv?')) return;

    // TODO: Implement card deletion logic
    console.log('Delete card:', deckId, cardId);
  }, []);

  return {
    decks,
    isLoading,
    handleAddDeck,
    handleEditDeck,
    handleDeleteDeck,
    handleResetDeck,
    handleEditCard,
    handleDeleteCard,
  };
}
