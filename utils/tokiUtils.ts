/**
 * Utility functions for Toki-related operations
 * These are pure functions with no external dependencies
 */

import { getCategoryEmoji, getCategoryLabel } from '@/utils/categories';

/**
 * Get user initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get activity emoji based on category
 * Now uses centralized category configuration
 */
export { getCategoryEmoji as getActivityEmoji, getCategoryLabel as getActivityLabel };

/**
 * Format location for compact display
 */
export const formatLocationDisplay = (fullLocation: string): string => {
  if (!fullLocation) return '';

  // Split by commas and clean up
  const parts = fullLocation.split(',').map(part => part.trim());

  if (parts.length >= 2) {
    // Try to extract city and landmark/area name
    const city = parts[parts.length - 2]; // Usually the city is second to last
    const landmark = parts[0]; // First part is usually the landmark/area name

    // If we have a city and landmark, format as "City, Landmark"
    if (city && landmark && city !== landmark) {
      return `${city}, ${landmark}`;
    }

    // Fallback: just show first two meaningful parts
    const meaningfulParts = parts.filter(part =>
      part &&
      !part.includes('Subdistrict') &&
      !part.includes('District') &&
      part.length > 2
    );

    if (meaningfulParts.length >= 2) {
      return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
    }
  }

  // If all else fails, just show the first meaningful part
  return parts[0] || fullLocation;
};

/**
 * Format time display with smart scheduling
 */
export const formatTimeDisplay = (time: string | undefined, scheduledTime?: string): string => {
  // If we have scheduled time, use it for smart display
  if (scheduledTime) {
    try {
      // Parse the scheduled time as UTC to avoid timezone conversion issues
      // The backend sends time in format "YYYY-MM-DD HH:MM" which should be treated as UTC
      const date = new Date(scheduledTime + 'Z'); // Add 'Z' to indicate UTC
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Format time as HH:MM
      const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC' // Display time in UTC to match input
      });

      // Check if it's today, tomorrow, or later
      if (eventDate.getTime() === today.getTime()) {
        return `today at ${timeString}`;
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        return `tomorrow at ${timeString}`;
      } else {
        // Format as DD/MM/YY HH:MM
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year} at ${timeString}`;
      }
    } catch (error) {
      console.error('Error parsing scheduled time:', error);
      // Fallback to original time if parsing fails
      return time || 'Time TBD';
    }
  }

  // If no scheduled time, handle the time parameter safely
  if (!time) {
    return 'Time TBD';
  }

  // For relative time slots, show as is
  if (['Now', '30 min', '1 hour', '2 hours', '3 hours', 'Tonight', 'Tomorrow'].includes(time)) {
    return time;
  }

  // For specific time slots like "9:00 AM", show as is
  if (time.includes(':')) {
    return time;
  }

  // For generic slots like "morning", "afternoon", "evening"
  return time;
};

/**
 * Check if user can invite to a Toki
 */
export const canUserInvite = (toki: any, currentUserId?: string): boolean => {
  if (!toki) return false;
  
  // Host can always invite
  if (toki.isHostedByUser || toki.host?.id === currentUserId) {
    return true;
  }
  
  // For public tokis, participants can invite
  if (toki.visibility === 'public' && (toki.joinStatus === 'joined' || toki.joinStatus === 'approved')) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can manage a Toki (host only)
 */
export const canUserManage = (toki: any, currentUserId?: string): boolean => {
  if (!toki || !currentUserId) return false;
  return toki.isHostedByUser || toki.host?.id === currentUserId;
};

/**
 * Get join button text based on status
 */
export const getJoinButtonText = (joinStatus?: string, isHostedByUser?: boolean): string => {
  if (isHostedByUser) return 'Your Event';
  
  switch (joinStatus) {
    case 'not_joined': return 'Join Event';
    case 'pending': return 'Request Sent';
    case 'approved': return 'Join Chat';
    case 'joined': return 'Open Chat';
    case 'completed': return 'Event Completed';
    default: return 'Join Event';
  }
};

/**
 * Get join button style based on status
 */
export const getJoinButtonStyle = (joinStatus?: string, isHostedByUser?: boolean): 'primary' | 'secondary' | 'success' => {
  if (isHostedByUser) return 'secondary';
  
  switch (joinStatus) {
    case 'not_joined': return 'primary';
    case 'pending': return 'secondary';
    case 'approved': 
    case 'joined': return 'success';
    case 'completed': return 'secondary';
    default: return 'primary';
  }
};
