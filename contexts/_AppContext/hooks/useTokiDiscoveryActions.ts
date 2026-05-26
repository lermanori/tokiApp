// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 497-836.
// loadTokis, loadMyTokis, loadTokisWithFilters, loadNearbyTokis.
// Owns local state: isFetchingTokis, lastTokisFetchMs, nearbyRequestRef.

import { useState, useRef, Dispatch } from 'react';
import { apiService, Toki as ApiToki } from '../../../services/api';
import type { AppState, AppAction, Toki } from '../types';
import { formatDistanceString } from '../state';

const NEARBY_FETCH_LIMIT = 1000;

export function useTokiDiscoveryActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
) {
  const [isFetchingTokis, setIsFetchingTokis] = useState(false);
  const [lastTokisFetchMs, setLastTokisFetchMs] = useState(0);
  const nearbyRequestRef = useRef<{ params: string; promise: Promise<any> } | null>(null);

  const loadTokis = async () => {
    try {
      // Avoid hammering the API when entering via invite links or login
      const path = typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping loadTokis on auth/join routes');
        return;
      }

      // De-duplicate concurrent and very frequent calls
      if (isFetchingTokis) {
        console.log('⏳ Skipping loadTokis: already in-flight');
        return;
      }
      const now = Date.now();
      if (now - lastTokisFetchMs < 3000) {
        console.log('🕒 Skipping loadTokis: cooldown');
        return;
      }

      setIsFetchingTokis(true);
      setLastTokisFetchMs(now);
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getTokis();

      // Get current user ID from API service instead of state
      const currentUserId = apiService.getAccessToken() ?
        (await apiService.getCurrentUser()).user.id : null;

      const apiTokis: Toki[] = response.tokis.map((apiToki: ApiToki) => ({
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD', // Add fallback for undefined timeSlot
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || '',
        distance: formatDistanceString(apiToki.distance),
        isHostedByUser: currentUserId ? apiToki.host.id === currentUserId : false,
        joinStatus: apiToki.joinStatus || 'not_joined', // Use backend join status
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime, // Add scheduled time for better display
        // ADD MISSING COORDINATES
        latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
        algorithmScore: apiToki.algorithmScore ?? null,
        friendsGoing: (apiToki as any).friendsAttending || [],
      }));

      dispatch({ type: 'SET_TOKIS', payload: apiTokis });

      // Update total count from pagination (same logic as loadNearbyTokis)
      const pagination = response.pagination || (response as any).data?.pagination;
      const total = pagination?.total;

      if (total !== undefined && total !== null && total >= 0) {
        dispatch({ type: 'SET_TOTAL_NEARBY_COUNT', payload: total });
      }
    } catch (error) {
      console.error('❌ Failed to load Tokis:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load activities' });
    } finally {
      setIsFetchingTokis(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadMyTokis = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getMyTokis();

      // Get current user ID from API service instead of state
      const currentUserId = apiService.getAccessToken() ?
        (await apiService.getCurrentUser()).user.id : null;

      const apiTokis: Toki[] = response.tokis.map((apiToki: ApiToki) => ({
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD',
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || '',
        images: (apiToki as any).images || [],
        distance: formatDistanceString(apiToki.distance),
        isHostedByUser: currentUserId ? apiToki.host.id === currentUserId : false,
        joinStatus: apiToki.joinStatus || 'not_joined',
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime,
        latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
        friendsGoing: (apiToki as any).friendsAttending || [],
        isPaid: (apiToki as any).isPaid || false,
        autoApprove: (apiToki as any).autoApprove || false,
        externalLink: (apiToki as any).externalLink || '',
        isBoosted: apiToki.isBoosted || false,
        boostId: apiToki.boostId || null,
      }));

      dispatch({ type: 'SET_TOKIS', payload: apiTokis });
    } catch (error) {
      console.error('❌ Failed to load My Tokis:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load my tokis' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadTokisWithFilters = async (filters: any) => {
    try {
      const path = typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping loadTokisWithFilters on auth/join routes');
        return;
      }

      if (isFetchingTokis) {
        console.log('⏳ Skipping loadTokisWithFilters: already in-flight');
        return;
      }

      setIsFetchingTokis(true);
      dispatch({ type: 'SET_LOADING', payload: true });

      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiService.getTokis(filters);
      const apiTokis: Toki[] = response.tokis.map((apiToki: ApiToki) => ({
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD', // Add fallback for undefined timeSlot
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || '',
        distance: formatDistanceString(apiToki.distance),
        isHostedByUser: apiToki.host.id === state.currentUser.id,
        joinStatus: apiToki.joinStatus || 'not_joined',
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime, // Add scheduled time for better display
        // ADD MISSING COORDINATES
        latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
        algorithmScore: apiToki.algorithmScore ?? null,
        friendsGoing: (apiToki as any).friendsAttending || [],
        isBoosted: apiToki.isBoosted || false,
        boostId: apiToki.boostId || null,
        isPaid: (apiToki as any).isPaid || false,
      }));

      dispatch({ type: 'SET_TOKIS', payload: apiTokis });
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to load Tokis with filters:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load filtered activities' });
    } finally {
      setIsFetchingTokis(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadNearbyTokis = async (
    params: {
      latitude: number;
      longitude: number;
      radius?: number;
      page?: number;
      category?: string;
      timeSlot?: string;
      limit?: number;
    },
    append: boolean = false
  ): Promise<{ pagination: any }> => {
    // Create a unique key for this request to detect duplicates
    const requestKey = JSON.stringify({
      lat: params.latitude,
      lng: params.longitude,
      radius: params.radius || 10,
      page: params.page || 1,
      category: params.category,
      timeSlot: params.timeSlot,
      append
    });

    // Check if an identical request is already in-flight
    if (nearbyRequestRef.current && nearbyRequestRef.current.params === requestKey && !append) {
      console.log('⏳ [APP CONTEXT] Duplicate loadNearbyTokis request detected, returning existing promise');
      return nearbyRequestRef.current.promise;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        if (isFetchingTokis && !append) {
          console.log('⏳ Skipping loadNearbyTokis: already in-flight');
          return { pagination: { hasMore: false } };
        }

        if (!append) {
          setIsFetchingTokis(true);
          dispatch({ type: 'SET_LOADING', payload: true });
        }

        const response = await apiService.getNearbyTokis({
          latitude: params.latitude,
          longitude: params.longitude,
          radius: params.radius || 10,
          limit: params.limit ?? NEARBY_FETCH_LIMIT,
          page: params.page || 1,
          category: params.category,
          timeSlot: params.timeSlot
        });

        // Safety check: ensure response has tokis array (handle both response.tokis and response.data.tokis)
        const tokisArray = response?.tokis || (response as any)?.data?.tokis;
        if (!tokisArray || !Array.isArray(tokisArray)) {
          console.warn('⚠️ [APP CONTEXT] Invalid response from getNearbyTokis - no tokis array:', response);
          // Don't clear existing tokis if response is invalid
          return { pagination: { hasMore: false } };
        }

        // Get current user ID from API service
        const currentUserId = apiService.getAccessToken() ?
          (await apiService.getCurrentUser()).user.id : null;

        const apiTokis: Toki[] = tokisArray.map((apiToki: ApiToki) => ({
          id: apiToki.id,
          title: apiToki.title,
          description: apiToki.description,
          location: apiToki.location,
          time: apiToki.timeSlot || 'Time TBD',
          attendees: apiToki.currentAttendees,
          maxAttendees: apiToki.maxAttendees,
          tags: apiToki.tags,
          host: {
            id: apiToki.host.id,
            name: apiToki.host.name,
            avatar: apiToki.host.avatar || '',
          },
          image: apiToki.imageUrl || '',
          distance: formatDistanceString(apiToki.distance),
          isHostedByUser: currentUserId ? apiToki.host.id === currentUserId : false,
          joinStatus: apiToki.joinStatus || 'not_joined',
          visibility: apiToki.visibility,
          category: apiToki.category,
          createdAt: apiToki.createdAt,
          scheduledTime: apiToki.scheduledTime,
          latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
          longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
          isSaved: (apiToki as any).is_saved || false,
          algorithmScore: apiToki.algorithmScore ?? null,
          friendsGoing: (apiToki as any).friendsAttending || [],
          isBoosted: apiToki.isBoosted || false,
          boostId: apiToki.boostId || null,
          isPaid: (apiToki as any).isPaid || false,
        }));

        if (append) {
          // Append to existing tokis, avoiding duplicates
          const existingIds = new Set(state.tokis.map(t => t.id));
          const newTokis = apiTokis.filter(t => !existingIds.has(t.id));
          dispatch({ type: 'SET_TOKIS', payload: [...state.tokis, ...newTokis] });
        } else {
          // For refresh (append: false), always update state with new results
          // This ensures location changes clear old tokis even if new location has no tokis
          dispatch({ type: 'SET_TOKIS', payload: apiTokis });
        }

        // Update total count (only update if we got a valid total from pagination)
        // Handle both possible response structures: direct pagination or nested in data
        const pagination = response.pagination || (response as any).data?.pagination;
        const total = pagination?.total;

        if (total !== undefined && total !== null && total > 0) {
          dispatch({ type: 'SET_TOTAL_NEARBY_COUNT', payload: total });
        }

        return { pagination: pagination || response.pagination };
      } catch (error) {
        console.error('❌ [APP CONTEXT] Failed to load nearby Tokis:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load nearby activities' });
        return { pagination: { hasMore: false } };
      } finally {
        setIsFetchingTokis(false);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();

    // Store the promise in ref for duplicate detection (only for non-append requests)
    if (!append) {
      nearbyRequestRef.current = { params: requestKey, promise: requestPromise };
      // Clear the ref when the promise resolves or rejects
      requestPromise.finally(() => {
        if (nearbyRequestRef.current?.params === requestKey) {
          nearbyRequestRef.current = null;
        }
      });
    }

    return requestPromise;
  };

  return { loadTokis, loadMyTokis, loadTokisWithFilters, loadNearbyTokis };
}
