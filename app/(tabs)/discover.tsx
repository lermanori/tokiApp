import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  
  const selectedEventRef = useRef<TokiEvent | null>(null);
  const calloutOpeningRef = useRef(false);
  const calloutOpeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Refresh on focus if no data
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected && state.tokis.length === 0 && (state.currentUser?.latitude && state.currentUser?.longitude || mapRegion.latitude && mapRegion.longitude)) {
        const lat = state.currentUser?.latitude || mapRegion.latitude;
        const lng = state.currentUser?.longitude || mapRegion.longitude;
        handleRefresh(selectedFilters.radius);
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

  const handleRegionChange = useCallback((r: any) => {
    if (calloutOpeningRef.current) {
      return;
    }
    
    const eps = 0.00005;
    const same =
      Math.abs(r.latitude - mapRegion.latitude) < eps &&
      Math.abs(r.longitude - mapRegion.longitude) < eps &&
      Math.abs(r.latitudeDelta - mapRegion.latitudeDelta) < eps &&
      Math.abs(r.longitudeDelta - mapRegion.longitudeDelta) < eps;
    if (same) return;

    updateMapRegion(r, true);
  }, [mapRegion, updateMapRegion]);

  const renderInteractiveMap = useCallback(() => (
    <View style={styles.mapContainer}>
      <DiscoverMap
        region={mapRegion}
        onRegionChange={handleRegionChange}
        events={filteredEvents as any}
        onEventPress={handleEventPress}
        onMarkerPress={handleMapMarkerPress}
        onToggleList={toggleMapView}
      />
    </View>
  ), [mapRegion, filteredEvents, handleRegionChange, handleEventPress, handleMapMarkerPress, toggleMapView]);

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
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        style={styles.content}
        ListHeaderComponent={() => (
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
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
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
        contentContainerStyle={filteredEvents.length === 0 ? styles.contentEmpty : styles.contentList}
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
