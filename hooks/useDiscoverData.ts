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
  const [mapEvents, setMapEvents] = useState<TokiEvent[]>([]);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWaitingForUserLocation, setIsWaitingForUserLocation] = useState(true);
  
  const previousEventIdsRef = useRef<string>('');
  const previousMapEventIdsRef = useRef<string>('');
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

  // Transform map tokis to events (used for rendering all markers)
  useEffect(() => {
    if (state.mapTokis.length > 0) {
      const transformedMap = state.mapTokis.map(transformTokiToEvent);
      const newMapIds = transformedMap.map(e => e.id).sort().join(',');
      
      if (previousMapEventIdsRef.current !== newMapIds) {
        setMapEvents(transformedMap);
        previousMapEventIdsRef.current = newMapIds;
      }
    } else if (state.mapTokis.length === 0) {
      if (previousMapEventIdsRef.current !== '') {
        setMapEvents([]);
        previousMapEventIdsRef.current = '';
      }
    }
  }, [state.mapTokis]);

  // Initialize map region from user location - wait for user location before setting
  useEffect(() => {
    if (mapRegionInitializedRef.current) return;
    
    // Wait for user location (latitude/longitude) - don't use default Tel Aviv
    if (!state.currentUser?.latitude || !state.currentUser?.longitude) {
      return; // Wait for user location
    }
    
    const setFromUserLocation = async () => {
      try {
        // Use user's latitude/longitude directly if available
        if (state.currentUser.latitude && state.currentUser.longitude) {
          setMapRegion({
            latitude: state.currentUser.latitude,
            longitude: state.currentUser.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          mapRegionInitializedRef.current = true;
          return;
        }
        
        // Fallback: try to geocode location string if coordinates not available
        const profileLoc = state.currentUser?.location?.trim();
        if (profileLoc) {
          const results = await geocodingService.geocodeAddress(profileLoc, 0);
          if (results && results[0]) {
            const { latitude, longitude } = results[0];
            setMapRegion({
              latitude,
              longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            mapRegionInitializedRef.current = true;
            return;
          }
        }
        // If no location available, mark as initialized but don't set mapRegion (stay null)
        mapRegionInitializedRef.current = true;
      } catch (error) {
        // Mark as initialized even on error to prevent retries
        mapRegionInitializedRef.current = true;
      }
    };
    setFromUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentUser?.latitude, state.currentUser?.longitude, state.currentUser?.location]);

  // Load nearby tokis
  const loadNearbyTokis = useCallback(async (
    page: number,
    append: boolean,
    latitude?: number,
    longitude?: number,
    radius?: string
  ) => {
    // Use current values from state/refs to avoid stale closures
    // Prefer user location, fallback to mapRegion if available
    const currentLat = latitude || state.currentUser?.latitude || mapRegion?.latitude;
    const currentLng = longitude || state.currentUser?.longitude || mapRegion?.longitude;
    
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

      // Reset to page 1 if this is a refresh (append: false), otherwise use the requested page
      setCurrentPage(append ? page : 1);
      setHasMore(response.pagination.hasMore);
      
      // Mark initial load as complete when we get the first non-append response
      if (!append) {
        hasInitiallyLoadedRef.current = true;
      }
    } catch (error) {
      console.error('❌ [DISCOVER] Failed to load nearby tokis:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [state.currentUser?.latitude, state.currentUser?.longitude, mapRegion?.latitude, mapRegion?.longitude, isLoadingMore, actions]);

  // Initial load - only run once when connected (using ref to prevent strict mode double calls)
  // Wait for user location before loading (don't use default Tel Aviv)
  useEffect(() => {
    if (hasInitiallyLoadedRef.current) {
      setIsWaitingForUserLocation(false);
      return;
    }
    if (!state.isConnected) {
      setIsWaitingForUserLocation(true);
      return;
    }
    
    // Wait for user location - don't use default Tel Aviv coordinates
    if (!state.currentUser?.latitude || !state.currentUser?.longitude) {
      console.log('🏄 [MAP-FLOW] useDiscoverData: Waiting for user location...', {
        hasUser: !!state.currentUser,
        hasLatitude: !!state.currentUser?.latitude,
        hasLongitude: !!state.currentUser?.longitude
      });
      setIsWaitingForUserLocation(true);
      return; // Wait for user location to be available
    }
    
    // User location is available, proceed with load
    const lat = state.currentUser.latitude;
    const lng = state.currentUser.longitude;
    
    console.log('🏄 [MAP-FLOW] useDiscoverData initial load:', { 
      lat, 
      lng, 
      source: 'userProfile'
    });
    
    // Mark as loading immediately to prevent duplicate calls in React strict mode
    hasInitiallyLoadedRef.current = true;
    setIsWaitingForUserLocation(false);
    
    // Use the callback directly but don't include it in deps to avoid circular updates
    // Default to 500km radius for initial load (matches backend default)
    loadNearbyTokis(1, false, lat, lng, '500').catch(() => {
      // Reset on error so it can retry if needed
      hasInitiallyLoadedRef.current = false;
      setIsWaitingForUserLocation(true);
    });
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
    // Prevent load more until initial load has completed
    if (!hasInitiallyLoadedRef.current) {
      console.log('⏳ [DISCOVER] Skipping load more - initial load not complete');
      return;
    }
    
    if (isLoadingMore || !hasMore) return;
    
    // Prevent load more if we don't have any tokis yet (safety check)
    if (state.tokis.length === 0) {
      console.log('⏳ [DISCOVER] Skipping load more - no tokis loaded yet');
      return;
    }
    
    const lat = state.currentUser?.latitude || mapRegion?.latitude;
    const lng = state.currentUser?.longitude || mapRegion?.longitude;
    
    if (!lat || !lng) return;
    
    setCurrentPage(prevPage => {
      const nextPage = prevPage + 1;
      // Call loadNearbyTokis directly with current values
      loadNearbyTokis(nextPage, true, lat, lng, radius).catch(err => {
        console.error('❌ [DISCOVER] Error in handleLoadMore:', err);
      });
      return nextPage;
    });
  }, [isLoadingMore, hasMore, state.currentUser?.latitude, state.currentUser?.longitude, state.tokis.length, mapRegion?.latitude, mapRegion?.longitude, loadNearbyTokis]);

  const handleRefresh = useCallback(async (radius?: string) => {
    try {
      setRefreshing(true);
      // Reset currentPage to 1 when refreshing
      setCurrentPage(1);
      const lat = state.currentUser?.latitude || mapRegion?.latitude;
      const lng = state.currentUser?.longitude || mapRegion?.longitude;
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
  }, [state.currentUser?.latitude, state.currentUser?.longitude, mapRegion?.latitude, mapRegion?.longitude, loadNearbyTokis, actions]);

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
    mapEvents,
    mapRegion,
    userConnections: state.userConnectionsIds, // Use centralized state
    currentPage,
    isLoadingMore,
    hasMore,
    refreshing,
    isWaitingForUserLocation,
    loadNearbyTokis,
    handleLoadMore,
    handleRefresh,
    updateMapRegion,
  };
};

