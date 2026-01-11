/**
 * Cleanup Job: Delete abandoned guest sessions
 *
 * This job should run daily (via cron or scheduled task) to clean up
 * guest sessions that haven't been accessed in the last 7 days.
 *
 * Usage:
 * - Via cron: 0 2 * * * node dist/server/jobs/cleanupGuestSessions.js
 * - Via npm script: npm run cleanup:guest-sessions
 * - Programmatically: import { cleanupGuestSessions } from './cleanupGuestSessions'
 */

import { query } from '../db/index.js';

interface CleanupResult {
  deletedCount: number;
  error?: string;
}

/**
 * Delete abandoned guest sessions
 * - Deletes sessions where is_guest = true
 * - Only deletes sessions not migrated to users (user_id IS NULL)
 * - Only deletes sessions older than 7 days (last_activity_at)
 */
export async function cleanupGuestSessions(): Promise<CleanupResult> {
  try {
    console.log('[Cleanup] Starting guest sessions cleanup...');

    const result = await query(
      `DELETE FROM study_sessions
       WHERE is_guest = true
         AND user_id IS NULL
         AND last_activity_at < NOW() - INTERVAL '7 days'
       RETURNING id`,
      []
    );

    const deletedCount = result.rows.length;

    console.log(`[Cleanup] Deleted ${deletedCount} abandoned guest sessions`);

    return { deletedCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Error during guest sessions cleanup:', errorMessage);
    return { deletedCount: 0, error: errorMessage };
  }
}

/**
 * Get statistics about guest sessions
 */
export async function getGuestSessionStats(): Promise<{
  total: number;
  active: number;
  abandoned: number;
  migrated: number;
}> {
  try {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE is_guest = true) as total,
         COUNT(*) FILTER (WHERE is_guest = true AND status = 'active') as active,
         COUNT(*) FILTER (WHERE is_guest = true AND user_id IS NULL AND last_activity_at < NOW() - INTERVAL '7 days') as abandoned,
         COUNT(*) FILTER (WHERE is_guest = true AND user_id IS NOT NULL) as migrated
       FROM study_sessions`,
      []
    );

    return {
      total: parseInt(result.rows[0].total) || 0,
      active: parseInt(result.rows[0].active) || 0,
      abandoned: parseInt(result.rows[0].abandoned) || 0,
      migrated: parseInt(result.rows[0].migrated) || 0,
    };
  } catch (error) {
    console.error('[Cleanup] Error getting guest session stats:', error);
    return { total: 0, active: 0, abandoned: 0, migrated: 0 };
  }
}

// Run cleanup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('[Cleanup] Running guest sessions cleanup job...');

    // Get stats before cleanup
    const statsBefore = await getGuestSessionStats();
    console.log('[Cleanup] Stats before cleanup:', statsBefore);

    // Run cleanup
    const result = await cleanupGuestSessions();

    if (result.error) {
      console.error('[Cleanup] Cleanup failed:', result.error);
      process.exit(1);
    }

    // Get stats after cleanup
    const statsAfter = await getGuestSessionStats();
    console.log('[Cleanup] Stats after cleanup:', statsAfter);

    console.log('[Cleanup] Cleanup job completed successfully');
    process.exit(0);
  })();
}
