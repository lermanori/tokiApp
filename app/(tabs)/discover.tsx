import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import DiscoverMap from '@/components/DiscoverMap';
import { DiscoverHeader } from '@/components/DiscoverHeader';
import { DiscoverCategories } from '@/components/DiscoverCategories';
import { useApp } from '@/contexts/AppContext';
import { useDiscoverData } from '@/hooks/useDiscoverData';
import { useDiscoverFilters } from '@/hooks/useDiscoverFilters';
import { TokiEvent } from '@/utils/discoverTypes';
import { CATEGORIES } from '@/utils/categories';

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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  
  const selectedEventRef = useRef<TokiEvent | null>(null);
  const calloutOpeningRef = useRef(false);
  const calloutOpeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRefreshedOnFocusRef = useRef(false);
  const renderCountRef = useRef(0);
  
  // Track component renders
  renderCountRef.current += 1;
  console.log(`📍 [DISCOVER] Component render #${renderCountRef.current}`, {
    timestamp: Date.now(),
    tokisCount: state.tokis.length,
  });

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
    selectedCategory,
    setSelectedCategory,
    selectedFilters,
    filteredEvents,
    handleFilterChange,
    clearAllFilters,
  } = useDiscoverFilters(events, userConnections);

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
    console.log('📍 [DISCOVER] handleRegionChange called', {
      lat: r.latitude.toFixed(6),
      lng: r.longitude.toFixed(6),
      timestamp: Date.now(),
    });
    
    if (calloutOpeningRef.current) {
      console.log('📍 [DISCOVER] Callout opening - skipping region update');
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
      console.log('📍 [DISCOVER] Region unchanged - skipping update');
      return;
    }

    console.log('📍 [DISCOVER] Updating map region state', {
      oldLat: currentMapRegion.latitude.toFixed(6),
      newLat: r.latitude.toFixed(6),
      oldLng: currentMapRegion.longitude.toFixed(6),
      newLng: r.longitude.toFixed(6),
    });
    // Update region state (this will not cause map re-render due to memo)
    updateMapRegion(r, true);
  }, [updateMapRegion]); // Only depend on updateMapRegion, not mapRegion

  const renderInteractiveMap = useCallback(() => {
    console.log('📍 [DISCOVER] renderInteractiveMap callback executed', {
      mapRegionLat: mapRegion.latitude.toFixed(6),
      filteredEventsCount: filteredEvents.length,
      timestamp: Date.now(),
    });
    return (
      <View style={styles.mapContainer} key="map-container">
        <DiscoverMap
          key="discover-map" // Stable key to prevent remounting
          region={mapRegion}
          onRegionChange={handleRegionChange}
          events={filteredEvents as any}
          onEventPress={handleEventPress}
          onMarkerPress={handleMapMarkerPress}
          onToggleList={toggleMapView}
        />
      </View>
    );
  }, [mapRegion, filteredEvents, handleRegionChange, handleEventPress, handleMapMarkerPress, toggleMapView]);
  
  // Track when renderInteractiveMap callback is recreated
  const prevDepsRef = useRef<{
    mapRegion: typeof mapRegion;
    filteredEvents: typeof filteredEvents;
    handleRegionChange: typeof handleRegionChange;
    handleEventPress: typeof handleEventPress;
    handleMapMarkerPress: typeof handleMapMarkerPress;
    toggleMapView: typeof toggleMapView;
  } | null>(null);
  
  useEffect(() => {
    if (prevDepsRef.current) {
      const depsChanged = {
        mapRegion: prevDepsRef.current.mapRegion !== mapRegion,
        filteredEvents: prevDepsRef.current.filteredEvents !== filteredEvents,
        handleRegionChange: prevDepsRef.current.handleRegionChange !== handleRegionChange,
        handleEventPress: prevDepsRef.current.handleEventPress !== handleEventPress,
        handleMapMarkerPress: prevDepsRef.current.handleMapMarkerPress !== handleMapMarkerPress,
        toggleMapView: prevDepsRef.current.toggleMapView !== toggleMapView,
      };
      const anyChanged = Object.values(depsChanged).some(v => v);
      if (anyChanged) {
        console.log('📍 [DISCOVER] renderInteractiveMap dependencies changed', depsChanged);
      }
    }
    prevDepsRef.current = { mapRegion, filteredEvents, handleRegionChange, handleEventPress, handleMapMarkerPress, toggleMapView };
  });

  const getSectionTitle = () => {
    if ((state.loading && state.totalNearbyCount === 0 && state.tokis.length === 0) || 
        (state.totalNearbyCount === 0 && state.tokis.length === 0 && !state.error)) {
      return 'Loading...';
    }
    if (state.totalNearbyCount > 0) {
      return `${state.totalNearbyCount} Toki${state.totalNearbyCount !== 1 ? 's' : ''} nearby`;
    }
    if (state.tokis.length > 0) {
      return `${state.tokis.length} Toki${state.tokis.length !== 1 ? 's' : ''} nearby`;
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
        showMap={showMap}
        isLoading={state.loading}
      />

      <FlatList
        key={`flatlist-${numColumns}`}
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        style={styles.content}
        numColumns={numColumns}
        ListHeaderComponent={useMemo(() => (
          <>
            {showMap && renderInteractiveMap()}
            <DiscoverCategories
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              showMap={showMap}
            />
            <View>
              <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
            </View>
          </>
        ), [showMap, renderInteractiveMap, categories, selectedCategory, setSelectedCategory])}
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
        showAdvancedFilters={false}
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
