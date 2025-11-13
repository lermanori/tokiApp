import { config } from '@/services/config';

/**
 * Get the base URL for sharing
 * @param baseUrl - Optional base URL override
 * @returns Base URL for sharing
 */
const getBaseUrl = (baseUrl?: string): string => {
  if (baseUrl) return baseUrl;
  
  // Try to get from config, fallback to localhost for development
  try {
    return config.frontend.baseUrl;
  } catch {
    return 'http://localhost:8081';
  }
};

/**
 * Generate a Toki URL for sharing
 * @param tokiId - The ID of the Toki
 * @param baseUrl - Optional base URL (defaults to config)
 * @returns Complete URL for the Toki
 */
export const generateTokiUrl = (tokiId: string, baseUrl?: string): string => {
  const base = getBaseUrl(baseUrl);
  return `${base}/toki-details?tokiId=${tokiId}`;
};

/**
 * Generate a shareable URL for a Toki with additional parameters
 * @param toki - The Toki object
 * @param baseUrl - Optional base URL
 * @returns Complete URL with all necessary parameters
 */
export const generateTokiShareUrl = (toki: any, baseUrl?: string): string => {
  const base = getBaseUrl(baseUrl);
  const url = `${base}/toki-details?tokiId=${toki.id}`;
  
  // Add additional parameters if they exist
  const params = new URLSearchParams();
  if (toki.title) params.append('title', toki.title);
  if (toki.location) params.append('location', toki.location);
  if (toki.timeSlot) params.append('time', toki.timeSlot);
  
  const paramString = params.toString();
  return paramString ? `${url}&${paramString}` : url;
};

/**
 * Generate a share message for a Toki
 * @param toki - The Toki object
 * @returns Formatted share message
 */
export const generateTokiShareMessage = (toki: any): string => {
  const title = toki.title || 'Amazing Event';
  const location = toki.location || 'TBD';
  const time = toki.timeSlot || 'TBD';
  
  return `🎉 Check out this event: "${title}"\n📍 ${location}\n⏰ ${time}\n\nJoin me on Toki!`;
};

/**
 * Generate a short share message for social media
 * @param toki - The Toki object
 * @returns Short formatted share message
 */
export const generateTokiShareMessageShort = (toki: any): string => {
  const title = toki.title || 'Amazing Event';
  return `🎉 "${title}" - Join me on Toki!`;
};

/**
 * Generate share options for different platforms
 * @param toki - The Toki object
 * @returns Share options object
 */
export const generateTokiShareOptions = (toki: any) => {
  const url = generateTokiShareUrl(toki);
  const message = generateTokiShareMessage(toki);
  const shortMessage = generateTokiShareMessageShort(toki);
  
  return {
    url,
    message,
    shortMessage,
    title: toki.title || 'Toki Event',
    // Platform-specific options
    twitter: {
      message: shortMessage,
      url
    },
    whatsapp: {
      message: `${message}\n${url}`
    },
    email: {
      subject: `Invitation: ${toki.title}`,
      body: `${message}\n\nClick here to join: ${url}`
    }
  };
};

/**
 * Generate an invite link URL for joining a Toki
 * @param inviteCode - The invite code for the Toki
 * @param baseUrl - Optional base URL (defaults to config)
 * @returns Complete invite link URL
 */
export const generateInviteLinkUrl = (inviteCode: string, baseUrl?: string): string => {
  const base = getBaseUrl(baseUrl);
  return `${base}/join/${inviteCode}`;
};
