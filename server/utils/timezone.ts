/**
 * Timezone utility for computing the user's local date.
 *
 * Cloud Run defaults to UTC, but users are in Romania (UTC+2 / UTC+3 DST).
 * `new Date().toISOString().split('T')[0]` always returns the UTC date,
 * which can be a day behind the user's local date between midnight and
 * 2-3 AM local time. This utility computes the correct local date.
 *
 * Priority:
 *   1. clientTimezoneOffset (from frontend's new Date().getTimezoneOffset())
 *   2. TZ environment variable (set to Europe/Bucharest in Cloud Run)
 */

/**
 * Returns the current date string (YYYY-MM-DD) in the user's local timezone.
 */
export function getLocalToday(clientTimezoneOffset?: number | null): string {
  const now = new Date();

  if (clientTimezoneOffset != null) {
    // getTimezoneOffset() returns minutes where UTC+2 → -120
    // Shift UTC time by the offset to get local time
    const localMs = now.getTime() - clientTimezoneOffset * 60 * 1000;
    const local = new Date(localMs);
    return local.toISOString().split('T')[0];
  }

  // Fallback: use server's local date (respects TZ env var)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the user's local hour (0-23).
 */
export function getLocalHour(clientTimezoneOffset?: number | null): number {
  if (clientTimezoneOffset != null) {
    return Math.floor((((new Date().getUTCHours() - clientTimezoneOffset / 60) % 24) + 24) % 24);
  }
  return new Date().getHours();
}
