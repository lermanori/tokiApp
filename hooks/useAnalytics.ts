import { useCallback } from 'react';
import { Platform } from 'react-native';
import { apiService } from '../services/api';
import { getAppVersion } from '../services/appVersion';

export type AnalyticsAction =
    | 'app_open'
    | 'map_tap'
    | 'event_viewed'
    | 'filter_applied'
    | 'push_opened'
    | 'profile_viewed'
    | 'login_screen_viewed'
    | 'login_success'
    | 'startup_refresh_attempted'
    | 'startup_refresh_succeeded'
    | 'startup_refresh_failed';

export function useAnalytics() {
    const appVersion = getAppVersion();

    const trackEvent = useCallback(async (action: AnalyticsAction, screen?: string, metadata?: Record<string, any>) => {
        try {
            await apiService.post('/analytics/track', {
                action,
                screen,
                platform: Platform.OS,
                version: appVersion,
                metadata
            });
        } catch (error) {
            // Fail silently for analytics so we don't disrupt user flow
            console.warn('Failed to track analytics event:', error);
        }
    }, [appVersion]);

    return { trackEvent };
}
