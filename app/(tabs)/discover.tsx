import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import DiscoverMap from '@/components/DiscoverMap';
import { DiscoverHeader } from '@/components/DiscoverHeader';
import { DiscoverCategories } from '@/components/DiscoverCategories';
import TokiSortModal, { SortState } from '@/components/TokiSortModal';
import { useApp } from '@/contexts/AppContext';
import { useDiscoverData } from '@/hooks/useDiscoverData';
import { useDiscoverFilters } from '@/hooks/useDiscoverFilters';
import { TokiEvent } from '@/utils/discoverTypes';
import { CATEGORIES } from '@/utils/categories';
import { apiService } from '@/services/api';
import { getBackendUrl } from '@/services/config';
import { sortEvents } from '@/utils/sortTokis';

// Platform-specific map imports
const isWeb = Platform.OS === 'web';

// Web-only Leaflet imports
if (isWeb) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.textContent = `
    .custom-marker {
      background: transparent !important;
      border: none !important;
    }
    .user-location-marker {
      background: transparent !important;
      border: none !important;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
    }
    .leaflet-popup-tip {
      background: white !important;
    }
  `;
  document.head.appendChild(style);
}

const categories = ['all', ...CATEGORIES];

export default function DiscoverScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [highlightedTokiId, setHighlightedTokiId] = useState<string | null>(null);
  const [highlightedTokiCoordinates, setHighlightedTokiCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sort, setSort] = useState<SortState>({ sortBy: 'relevance', sortOrder: 'asc' });
  
  const selectedEventRef = useRef<TokiEvent | null>(null);
  const calloutOpeningRef = useRef(false);
  const calloutOpeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRefreshedOnFocusRef = useRef(false);
  const renderCountRef = useRef(0);
  const justSetHighlightRef = useRef(false); // Track if we just set highlight to prevent immediate clearing
  
  // Track component renders
  renderCountRef.current += 1;

  // Custom hooks for data and filtering
  const {
    events,
    mapRegion,
    userConnections,
    isLoadingMore,
    hasMore,
    refreshing,
    handleLoadMore,
    handleRefresh,
    updateMapRegion,
  } = useDiscoverData();

  const {
    selectedCategories,
    setSelectedCategories,
    selectedFilters,
    filteredEvents,
    handleFilterChange,
    clearAllFilters,
  } = useDiscoverFilters(events, userConnections);

  // Sorting
  const sortedEvents = useMemo(() => {
    const lat = mapRegion?.latitude ?? state.currentUser?.latitude;
    const lng = mapRegion?.longitude ?? state.currentUser?.longitude;
    return sortEvents(filteredEvents as any, sort, lat, lng);
  }, [filteredEvents, sort, mapRegion?.latitude, mapRegion?.longitude, state.currentUser?.latitude, state.currentUser?.longitude]);

  // Reset refresh flag when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        hasRefreshedOnFocusRef.current = false;
      };
    }, [])
  );

  // Refresh on focus if no data - but only once per focus session
  useFocusEffect(
    React.useCallback(() => {
      if (hasRefreshedOnFocusRef.current) return;
      if (state.isConnected && state.tokis.length === 0 && (state.currentUser?.latitude && state.currentUser?.longitude || mapRegion.latitude && mapRegion.longitude)) {
        const lat = state.currentUser?.latitude || mapRegion.latitude;
        const lng = state.currentUser?.longitude || mapRegion.longitude;
        handleRefresh(selectedFilters.radius);
        hasRefreshedOnFocusRef.current = true;
      }
    }, [state.isConnected, state.currentUser?.latitude, state.currentUser?.longitude, state.tokis.length, mapRegion, handleRefresh, selectedFilters.radius])
  );

  // Handle highlightTokiId from navigation params
  useEffect(() => {
    const highlightTokiId = params.highlightTokiId as string | undefined;
    
    if (!highlightTokiId) {
      // Don't clear highlight immediately if we just set it - give popup time to open
      // Only clear after a delay to allow popup opening logic to run
      if (highlightedTokiId && !justSetHighlightRef.current) {
        setHighlightedTokiId(null);
        setHighlightedTokiCoordinates(null);
      } else if (justSetHighlightRef.current) {
        // Reset the flag after a delay
        setTimeout(() => {
          justSetHighlightRef.current = false;
        }, 6000); // Reset after 6 seconds
      }
      return;
    }

    // Find toki in filteredEvents
    const foundToki = filteredEvents.find(e => e.id === highlightTokiId);
    
    if (foundToki && foundToki.coordinate) {
      // Toki found in current events with coordinates
      const coords = foundToki.coordinate;
      const lat = coords.latitude;
      const lng = coords.longitude;
      
      // Validate coordinates are numbers
      if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
        justSetHighlightRef.current = true; // Mark that we just set the highlight
        setHighlightedTokiId(highlightTokiId);
        setHighlightedTokiCoordinates(coords);
        setShowMap(true); // Ensure map is visible
        
        // Center map on toki coordinates with tighter zoom
        updateMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.002, // Very tight zoom (~200m view) for better focus
          longitudeDelta: 0.002,
        }, true);
        
        // Clear param AFTER a delay to allow popup to open
        // Don't clear immediately as it triggers the effect again and clears state
        setTimeout(() => {
          router.setParams({ highlightTokiId: undefined });
        }, 5000); // Give 5 seconds for popup to open
      } else {
        console.warn('📍 [DISCOVER] Toki coordinate is invalid:', highlightTokiId, coords);
        router.setParams({ highlightTokiId: undefined });
      }
    } else if (foundToki && !foundToki.coordinate) {
      // Toki found but no coordinates - try to fetch from API
      fetchTokiForHighlight(highlightTokiId);
    } else {
      // Toki not in current events - fetch from API
      fetchTokiForHighlight(highlightTokiId);
    }
  }, [params.highlightTokiId, filteredEvents, updateMapRegion]);


  // Fetch toki from API when not found in current events
  const fetchTokiForHighlight = async (tokiId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/tokis/${tokiId}`, {
        headers: {
          'Authorization': `Bearer ${apiService.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tokiData = data.data;
        
        // Ensure coordinates are numbers
        const lat = typeof tokiData.latitude === 'number' ? tokiData.latitude : parseFloat(tokiData.latitude);
        const lng = typeof tokiData.longitude === 'number' ? tokiData.longitude : parseFloat(tokiData.longitude);
        
        if (lat && lng && !isNaN(lat) && !isNaN(lng) && Number.isFinite(lat) && Number.isFinite(lng)) {
          const coords = {
            latitude: lat,
            longitude: lng,
          };
          justSetHighlightRef.current = true; // Mark that we just set the highlight
          setHighlightedTokiId(tokiId);
          setHighlightedTokiCoordinates(coords);
          setShowMap(true); // Ensure map is visible
          
        // Center map on toki coordinates with tighter zoom
        updateMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.002, // Very tight zoom (~200m view) for better focus
          longitudeDelta: 0.002,
        }, true);
        
        // Clear param AFTER a delay to allow popup to open
        setTimeout(() => {
          router.setParams({ highlightTokiId: undefined });
        }, 5000); // Give 5 seconds for popup to open
        } else {
          console.warn('📍 [DISCOVER] Toki has no valid coordinates:', tokiId, { lat, lng });
          router.setParams({ highlightTokiId: undefined });
        }
      } else {
        console.warn('⚠️ [DISCOVER] Failed to fetch toki, response not ok:', response.status);
        router.setParams({ highlightTokiId: undefined });
      }
    } catch (error) {
      console.error('❌ [DISCOVER] Failed to fetch toki for highlight:', error);
      router.setParams({ highlightTokiId: undefined });
    }
  };

  // Apply filters
  const applyFilters = useCallback(() => {
    setShowFilterModal(false);

    const queryParams: any = {};
    if (selectedFilters.category !== 'all') queryParams.category = selectedFilters.category;
    if (selectedFilters.dateFrom) queryParams.dateFrom = selectedFilters.dateFrom;
    if (selectedFilters.dateTo) queryParams.dateTo = selectedFilters.dateTo;
    if (selectedFilters.radius !== '10') queryParams.radius = selectedFilters.radius;

    if (mapRegion?.latitude && mapRegion?.longitude) {
      queryParams.userLatitude = mapRegion.latitude.toString();
      queryParams.userLongitude = mapRegion.longitude.toString();
    }

    actions.loadTokisWithFilters(queryParams);
  }, [selectedFilters, mapRegion, actions]);

  // Event handlers
  const handleEventPress = useCallback((event: TokiEvent) => {
    router.push({
      pathname: '/toki-details',
      params: {
        tokiId: event.id,
        tokiData: JSON.stringify(event)
      }
    });
  }, []);

  const handleMapMarkerPress = useCallback((event: TokiEvent) => {
    if (calloutOpeningTimeoutRef.current) {
      clearTimeout(calloutOpeningTimeoutRef.current);
    }
    calloutOpeningRef.current = true;
    
    requestAnimationFrame(() => {
      selectedEventRef.current = event;
    });
    
    calloutOpeningTimeoutRef.current = setTimeout(() => {
      calloutOpeningRef.current = false;
    }, 500);
  }, []);

  const toggleMapView = useCallback(() => {
    setShowMap(prev => !prev);
  }, []);

  // Use ref to store current mapRegion so handleRegionChange doesn't need to depend on it
  const mapRegionRef = useRef(mapRegion);
  useEffect(() => {
    mapRegionRef.current = mapRegion;
  }, [mapRegion]);

  const handleRegionChange = useCallback((r: any) => {
    if (calloutOpeningRef.current) {
      return;
    }
    
    // Use ref to get current mapRegion (no dependency needed)
    const currentMapRegion = mapRegionRef.current;
    
    // Only update if region changed significantly to avoid unnecessary re-renders
    const eps = 0.00005;
    const same =
      Math.abs(r.latitude - currentMapRegion.latitude) < eps &&
      Math.abs(r.longitude - currentMapRegion.longitude) < eps &&
      Math.abs(r.latitudeDelta - currentMapRegion.latitudeDelta) < eps &&
      Math.abs(r.longitudeDelta - currentMapRegion.longitudeDelta) < eps;
    if (same) {
      return;
    }
    // Update region state (this will not cause map re-render due to memo)
    updateMapRegion(r, true);
  }, [updateMapRegion]); // Only depend on updateMapRegion, not mapRegion

  const renderInteractiveMap = useCallback(() => {
    return (
      <View style={styles.mapContainer} key="map-container">
        <DiscoverMap
          key="discover-map" // Stable key to prevent remounting
          region={mapRegion}
          onRegionChange={handleRegionChange}
          events={sortedEvents as any}
          onEventPress={handleEventPress as any}
          onMarkerPress={handleMapMarkerPress as any}
          onToggleList={toggleMapView}
          highlightedTokiId={highlightedTokiId}
          highlightedCoordinates={highlightedTokiCoordinates}
        />
      </View>
    );
  }, [mapRegion, sortedEvents, handleRegionChange, handleEventPress, handleMapMarkerPress, toggleMapView, highlightedTokiId, highlightedTokiCoordinates]);
  

  const getSectionTitle = () => {
    if ((state.loading && state.totalNearbyCount === 0 && state.tokis.length === 0) || 
        (state.totalNearbyCount === 0 && state.tokis.length === 0 && !state.error)) {
      return 'Loading...';
    }
    const count = sortedEvents.length;
    if (count > 0) {
      return `${count} Toki${count !== 1 ? 's' : ''} nearby`;
    }
    return 'No Tokis nearby';
  };

  const handleRefreshWithRadius = useCallback(() => {
    handleRefresh(selectedFilters.radius);
  }, [handleRefresh, selectedFilters.radius]);

  const handleLoadMoreWithRadius = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    handleLoadMore(selectedFilters.radius);
  }, [isLoadingMore, hasMore, handleLoadMore, selectedFilters.radius]);

  // Calculate number of columns based on screen width (dynamic up to 7 columns)
  const numColumns = useMemo(() => {
    if (width >= 3200) return 7; // Ultra wide: 7 columns
    if (width >= 2800) return 6; // XXL Desktop: 6 columns
    if (width >= 2400) return 5; // XL Desktop: 5 columns
    if (width >= 2000) return 4; // Large Desktop: 4 columns
    if (width >= 1600) return 3; // Desktop: 3 columns
    if (width >= 1200) return 2; // Tablet/Desktop: 2 columns
    return 1; // Mobile: 1 column
  }, [width]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DiscoverHeader
        onRefresh={handleRefreshWithRadius}
        onToggleMap={toggleMapView}
        onOpenFilters={() => setShowFilterModal(true)}
        onOpenSort={() => setShowSortModal(true)}
        showMap={showMap}
        isLoading={state.loading}
      />

      <FlatList
        key={`flatlist-${numColumns}`}
        data={sortedEvents}
        keyExtractor={(item) => item.id}
        style={styles.content}
        numColumns={numColumns}
        ListHeaderComponent={useMemo(() => (
          <>
            {showMap && renderInteractiveMap()}
            <DiscoverCategories
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryToggle={setSelectedCategories}
              showMap={showMap}
            />
            <View>
              <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
            </View>
          </>
        ), [showMap, renderInteractiveMap, categories, selectedCategories, setSelectedCategories, sortedEvents.length])}
        renderItem={({ item }) => (
          <View style={[
            styles.cardWrapper,
            numColumns > 1 && styles.cardWrapperGrid
          ]}>
            <TokiCard
              toki={item}
              onPress={() => handleEventPress(item)}
              onHostPress={() => {
                if (item.host.id && item.host.id !== state.currentUser?.id) {
                  router.push({
                    pathname: '/chat',
                    params: {
                      otherUserId: item.host.id,
                      otherUserName: item.host.name,
                      isGroup: 'false'
                    }
                  });
                }
              }}
            />
          </View>
        )}
        ListFooterComponent={() => (
          <>
            {isLoadingMore && (
              <View style={styles.loadingMoreContainer}>
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
            <View style={styles.bottomSpacing} />
          </>
        )}
        contentContainerStyle={filteredEvents.length === 0 ? styles.contentEmpty : [
          // we keep using filteredEvents.length here to preserve empty state alignment,
          // but item rendering uses sortedEvents.
          styles.contentList,
          numColumns > 1 && { paddingHorizontal: 12 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefreshWithRadius} />
        }
        onEndReached={handleLoadMoreWithRadius}
        onEndReachedThreshold={0.2}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          if (contentSize.height > 0 && !isLoadingMore && hasMore) {
            const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
            if (distanceFromBottom <= 1000) {
              handleLoadMoreWithRadius();
            }
          }
        }}
        scrollEventThrottle={16}
      />

      <TokiFilters
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAll={clearAllFilters}
        onApply={applyFilters}
        selectedCategories={selectedCategories}
        onCategoryToggle={setSelectedCategories}
        showAdvancedFilters={false}
      />
      <TokiSortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        value={sort}
        onChange={setSort}
        onApply={() => setShowSortModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  contentList: {
    paddingBottom: 20,
  },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  cardWrapperGrid: {
    width: undefined,
    flex: 1,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 16,
    marginTop: 16,
    marginLeft: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  loadingMoreContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
