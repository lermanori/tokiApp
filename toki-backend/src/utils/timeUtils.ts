/**
 * Time utility functions for Toki scheduling
 *
 * TIMEZONE CONTRACT:
 * - All scheduled_time values are stored and returned as UTC
 * - Format: "YYYY-MM-DD HH:MM" (without timezone suffix for frontend compatibility)
 */

/**
 * Infer a human-readable time description from scheduledTime
 * Used for display purposes when timeSlot is not available
 */
export function inferTimeDescription(scheduledTime: Date): string {
  const now = new Date();
  const diffMs = scheduledTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins <= 5) return 'Now';
  if (diffMins <= 45) return '30 min';
  if (diffMins <= 90) return '1 hour';
  if (diffMins <= 150) return '2 hours';
  if (diffMins <= 210) return '3 hours';

  const hour = scheduledTime.getUTCHours();
  if (hour >= 18 && hour <= 23) return 'Tonight';
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 18) return 'Afternoon';

  return 'Tomorrow';
}

/**
 * Format a Date object to the standard UTC string format
 * Returns "YYYY-MM-DD HH:MM" in UTC
 */
export function formatScheduledTimeUTC(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').slice(0, 16);
}
