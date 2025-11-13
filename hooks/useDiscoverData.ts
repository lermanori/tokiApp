import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TokiEvent, MapRegion } from '@/utils/discoverTypes';
import { transformTokiToEvent } from '@/utils/discoverHelpers';
import { geocodingService } from '@/services/geocoding';

const DEFAULT_REGION: MapRegion = {
  latitude: 32.0853, // Tel Aviv
  longitude: 34.7818,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const useDiscoverData = () => {
  const { state, actions } = useApp();
  const [events, setEvents] = useState<TokiEvent[]>([]);
  const [mapRegion, setMapRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const previousEventIdsRef = useRef<string>('');
  const mapRegionInitializedRef = useRef(false);
  const hasInitiallyLoadedRef = useRef(false);
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transform tokis to events
  useEffect(() => {
    if (state.tokis.length > 0) {
      const transformedEvents = state.tokis.map(transformTokiToEvent);
      const newEventIds = transformedEvents.map(e => e.id).sort().join(',');
      
      if (previousEventIdsRef.current !== newEventIds) {
        setEvents(transformedEvents);
        previousEventIdsRef.current = newEventIds;
      }
    } else if (state.tokis.length === 0) {
      if (previousEventIdsRef.current !== '') {
        setEvents([]);
        previousEventIdsRef.current = '';
      }
    }
  }, [state.tokis]);

  // Initialize map region from user profile location - only once on mount
  useEffect(() => {
    if (mapRegionInitializedRef.current) return;
    
    const setFromProfile = async () => {
      try {
        const profileLoc = state.currentUser?.location?.trim();
        if (profileLoc) {
          const results = await geocodingService.geocodeAddress(profileLoc, 0);
          if (results && results[0]) {
            const { latitude, longitude } = results[0];
            // Only update if significantly different from default to avoid unnecessary updates
            const currentLat = mapRegion.latitude;
            const currentLng = mapRegion.longitude;
            const latDiff = Math.abs(latitude - currentLat);
            const lngDiff = Math.abs(longitude - currentLng);
            
            // Only update if difference is significant (> 0.01 degrees ~ 1km)
            if (latDiff > 0.01 || lngDiff > 0.01) {
              setMapRegion({
                latitude,
                longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              });
            }
            mapRegionInitializedRef.current = true;
            return;
          }
        }
        // Fallback to default - mark as initialized
        mapRegionInitializedRef.current = true;
      } catch (error) {
        // Mark as initialized even on error to prevent retries
        mapRegionInitializedRef.current = true;
      }
    };
    setFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.location]); // Only depend on location, not mapRegion to avoid loops

  // Load nearby tokis
  const loadNearbyTokis = useCallback(async (
    page: number,
    append: boolean,
    latitude?: number,
    longitude?: number,
    radius?: string
  ) => {
    // Use current values from state/refs to avoid stale closures
    const currentLat = latitude || state.currentUser?.latitude || mapRegion.latitude;
    const currentLng = longitude || state.currentUser?.longitude || mapRegion.longitude;
    
    if (!currentLat || !currentLng) {
      console.log('⚠️ [DISCOVER] No location available');
      return;
    }

    if (isLoadingMore && append) {
      return;
    }

    try {
      if (append) {
        setIsLoadingMore(true);
      }

      const searchRadius = parseFloat(radius || '500') || 500;
      const response = await actions.loadNearbyTokis({
        latitude: currentLat,
        longitude: currentLng,
        radius: searchRadius,
        page: page
      }, append);

      setCurrentPage(page);
      setHasMore(response.pagination.hasMore);
    } catch (error) {
      console.error('❌ [DISCOVER] Failed to load nearby tokis:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [state.currentUser?.latitude, state.currentUser?.longitude, mapRegion.latitude, mapRegion.longitude, isLoadingMore, actions]);

  // Initial load - only run once when connected
  useEffect(() => {
    if (hasInitiallyLoadedRef.current) return;
    if (!state.isConnected) return;
    
    const lat = state.currentUser?.latitude || mapRegion.latitude;
    const lng = state.currentUser?.longitude || mapRegion.longitude;
    
    if (lat && lng) {
      // Use the callback directly but don't include it in deps to avoid circular updates
      // Default to 500km radius for initial load (matches backend default)
      loadNearbyTokis(1, false, lat, lng, '500').then(() => {
        hasInitiallyLoadedRef.current = true;
      }).catch(() => {
        hasInitiallyLoadedRef.current = true; // Mark as loaded even on error
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isConnected, state.currentUser?.latitude, state.currentUser?.longitude]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  const handleLoadMore = useCallback((radius?: string) => {
    if (isLoadingMore || !hasMore) return;
    
    const lat = state.currentUser?.latitude || mapRegion.latitude;
    const lng = state.currentUser?.longitude || mapRegion.longitude;
    
    if (!lat || !lng) return;
    
    setCurrentPage(prevPage => {
      const nextPage = prevPage + 1;
      // Call loadNearbyTokis directly with current values
      loadNearbyTokis(nextPage, true, lat, lng, radius).catch(err => {
        console.error('❌ [DISCOVER] Error in handleLoadMore:', err);
      });
      return nextPage;
    });
  }, [isLoadingMore, hasMore, state.currentUser?.latitude, state.currentUser?.longitude, mapRegion.latitude, mapRegion.longitude, loadNearbyTokis]);

  const handleRefresh = useCallback(async (radius?: string) => {
    try {
      setRefreshing(true);
      const lat = state.currentUser?.latitude || mapRegion.latitude;
      const lng = state.currentUser?.longitude || mapRegion.longitude;
      if (lat && lng) {
        // Refresh both tokis and notifications in parallel
        await Promise.all([
          loadNearbyTokis(1, false, lat, lng, radius),
          actions.loadNotifications() // Also refresh notifications
        ]);
      }
    } catch (error) {
      console.error('❌ [DISCOVER] Failed to refresh Tokis:', error);
    } finally {
      setRefreshing(false);
    }
  }, [state.currentUser?.latitude, state.currentUser?.longitude, mapRegion.latitude, mapRegion.longitude, loadNearbyTokis, actions]);

  const updateMapRegion = useCallback((region: MapRegion, userInitiated: boolean = false) => {
    // Validate region has valid coordinates before setting
    if (region && typeof region.latitude === 'number' && typeof region.longitude === 'number' && Number.isFinite(region.latitude) && Number.isFinite(region.longitude)) {
      setMapRegion(region);
      if (userInitiated) {
        mapRegionInitializedRef.current = true;
      }
    } else {
      console.error('❌ [useDiscoverData] Invalid region passed to updateMapRegion:', region);
    }
  }, []);

  return {
    events,
    mapRegion,
    userConnections: state.userConnectionsIds, // Use centralized state
    currentPage,
    isLoadingMore,
    hasMore,
    refreshing,
    loadNearbyTokis,
    handleLoadMore,
    handleRefresh,
    updateMapRegion,
  };
};

