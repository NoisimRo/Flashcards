import { useState, useCallback, useEffect } from 'react';
import type { LeaderboardEntry } from '../api/users';
import * as usersApi from '../api/users';

/**
 * Custom hook for leaderboard data management
 * Fetches and caches leaderboard data from API
 */
export function useLeaderboard() {
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await usersApi.getGlobalLeaderboard(100);
      if (response.success && response.data) {
        setLeaderboardEntries(response.data.leaderboard);
      } else {
        setError(response.error?.message || 'Failed to fetch leaderboard');
        setLeaderboardEntries([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Network error');
      setLeaderboardEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboardEntries,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
}
