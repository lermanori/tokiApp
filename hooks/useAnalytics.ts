import { useCallback } from 'react';
import { Platform } from 'react-native';
import { apiService } from '../services/api';

export type AnalyticsAction =
    | 'app_open'
    | 'map_tap'
    | 'event_viewed'
    | 'filter_applied'
    | 'push_opened'
    | 'profile_viewed';

export function useAnalytics() {
    const trackEvent = useCallback(async (action: AnalyticsAction, screen?: string, metadata?: Record<string, any>) => {
        try {
            await apiService.post('/analytics/track', {
                action,
                screen,
                platform: Platform.OS,
                version: '1.0.0', // TODO: Get actual app version
                metadata
            });
        } catch (error) {
            // Fail silently for analytics so we don't disrupt user flow
            console.warn('Failed to track analytics event:', error);
        }
    }, []);

    return { trackEvent };
}
