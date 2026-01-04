import { create } from 'zustand';
import type { StudySession, StudySessionWithData } from '../types/models';
import type {
  CreateStudySessionRequest,
  GetStudySessionsParams,
  UpdateStudySessionRequest,
  CompleteStudySessionRequest,
} from '../types/api';
import * as sessionsApi from '../api/studySessions';

interface StudySessionsStore {
  // State
  activeSessions: StudySession[];
  currentSession: StudySessionWithData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchActiveSessions: (params?: GetStudySessionsParams) => Promise<void>;
  createSession: (request: CreateStudySessionRequest) => Promise<StudySessionWithData | null>;
  loadSession: (id: string) => Promise<void>;
  updateSessionProgress: (id: string, progress: UpdateStudySessionRequest) => Promise<void>;
  completeSession: (id: string, results: CompleteStudySessionRequest) => Promise<any>;
  abandonSession: (id: string) => Promise<void>;
  clearCurrentSession: () => void;
  clearError: () => void;
}

export const useStudySessionsStore = create<StudySessionsStore>((set, get) => ({
  // Initial state
  activeSessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  // Fetch active sessions
  fetchActiveSessions: async (params?: GetStudySessionsParams) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.getStudySessions(params);
      if (response.success && response.data) {
        set({ activeSessions: response.data, isLoading: false });
      } else {
        set({
          error: response.error?.message || 'Failed to fetch sessions',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Create session
  createSession: async (request: CreateStudySessionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.createStudySession(request);
      if (response.success && response.data) {
        const session = response.data.session;
        set(state => ({
          activeSessions: [...state.activeSessions, session],
          currentSession: session,
          isLoading: false,
        }));
        return session;
      } else {
        set({
          error: response.error?.message || 'Failed to create session',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  // Load session
  loadSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.getStudySession(id);
      if (response.success && response.data) {
        set({ currentSession: response.data, isLoading: false });
      } else {
        set({
          error: response.error?.message || 'Failed to load session',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Update session progress
  updateSessionProgress: async (id: string, progress: UpdateStudySessionRequest) => {
    console.log('🔄 [Store] updateSessionProgress called', { id, progress });
    try {
      console.log('📡 [Store] Sending PUT request to API...');
      const response = await sessionsApi.updateStudySession(id, progress);
      console.log('✅ [Store] API response received:', response);
      if (response.success && response.data) {
        set(state => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, ...response.data }
            : null,
          activeSessions: state.activeSessions.map(s =>
            s.id === id ? { ...s, ...response.data } : s
          ),
        }));
      } else {
        console.error('❌ [Store] API response not successful:', response.error);
      }
    } catch (error) {
      console.error('❌ [Store] Error updating session progress:', error);
    }
  },

  // Complete session
  completeSession: async (id: string, results: CompleteStudySessionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.completeStudySession(id, results);
      if (response.success && response.data) {
        set(state => ({
          activeSessions: state.activeSessions.filter(s => s.id !== id),
          currentSession: null,
          isLoading: false,
        }));
        // Return the complete response data (includes leveledUp, xpEarned, etc.)
        return response.data;
      } else {
        set({
          error: response.error?.message || 'Failed to complete session',
          isLoading: false,
        });
        return null;
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  // Abandon session
  abandonSession: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionsApi.abandonStudySession(id);
      if (response.success) {
        set(state => ({
          activeSessions: state.activeSessions.filter(s => s.id !== id),
          currentSession: state.currentSession?.id === id ? null : state.currentSession,
          isLoading: false,
        }));
      } else {
        set({
          error: response.error?.message || 'Failed to abandon session',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ error: 'Network error', isLoading: false });
    }
  },

  // Clear current session
  clearCurrentSession: () => set({ currentSession: null }),

  // Clear error
  clearError: () => set({ error: null }),
}));
