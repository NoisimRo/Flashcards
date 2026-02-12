import { create } from 'zustand';
import type { Deck } from '../types/models';
import type { CreateDeckRequest, UpdateDeckRequest, DeckListParams } from '../types/api';
import * as decksApi from '../api/decks';

interface DecksStore {
  // State
  decks: Deck[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDecks: (params?: DeckListParams) => Promise<void>;
  fetchGuestDecks: (guestToken: string) => Promise<void>;
  addDeckLocally: (deck: Deck) => void;
  createDeck: (data: CreateDeckRequest) => Promise<Deck | null>;
  updateDeck: (id: string, data: UpdateDeckRequest) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  refreshDeck: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useDecksStore = create<DecksStore>((set, get) => ({
  // Initial state
  decks: [],
  isLoading: false,
  error: null,

  // Fetch decks
  fetchDecks: async (params?: DeckListParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await decksApi.getDecks(params);
      if (response.success && response.data) {
        set({ decks: response.data, isLoading: false });
      } else {
        set({ error: response.error?.message || 'Failed to fetch decks', isLoading: false });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Fetch guest decks by token
  fetchGuestDecks: async (guestToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await decksApi.getGuestDecks(guestToken);
      if (response.success && response.data) {
        set({ decks: response.data, isLoading: false });
      } else {
        set({ decks: [], isLoading: false });
      }
    } catch {
      set({ decks: [], isLoading: false });
    }
  },

  // Add a deck to local state without API call (used for guest-created decks)
  addDeckLocally: (deck: Deck) => {
    set(state => ({
      decks: [...state.decks, deck],
    }));
  },

  // Create deck
  createDeck: async (data: CreateDeckRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await decksApi.createDeck(data);
      if (response.success && response.data) {
        set(state => ({
          decks: [...state.decks, response.data!],
          isLoading: false,
        }));
        return response.data;
      } else {
        set({ error: response.error?.message || 'Failed to create deck', isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  // Update deck
  updateDeck: async (id: string, data: UpdateDeckRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await decksApi.updateDeck(id, data);
      if (response.success && response.data) {
        set(state => ({
          decks: state.decks.map(d => (d.id === id ? response.data! : d)),
          isLoading: false,
        }));
      } else {
        set({ error: response.error?.message || 'Failed to update deck', isLoading: false });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Delete deck
  deleteDeck: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await decksApi.deleteDeck(id);
      if (response.success) {
        set(state => ({
          decks: state.decks.filter(d => d.id !== id),
          isLoading: false,
        }));
      } else {
        set({ error: response.error?.message || 'Failed to delete deck', isLoading: false });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Refresh a single deck (after adding cards, etc.)
  refreshDeck: async (id: string) => {
    try {
      const response = await decksApi.getDeck(id);
      if (response.success && response.data) {
        set(state => ({
          decks: state.decks.map(d => (d.id === id ? response.data! : d)),
        }));
      }
    } catch (error) {
      console.error('Error refreshing deck:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
