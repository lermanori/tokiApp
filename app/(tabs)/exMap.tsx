import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, useWindowDimensions, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import DiscoverMap from '@/components/DiscoverMap';
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

export default function ExMapScreen() {
    const { state, actions, dispatch } = useApp();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMap, setShowMap] = useState(true); // Start with map view
    const [highlightedTokiId, setHighlightedTokiId] = useState<string | null>(null);
    const [highlightedTokiCoordinates, setHighlightedTokiCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
    const [sort, setSort] = useState<SortState>({ sortBy: 'relevance', sortOrder: 'asc' });

    const selectedEventRef = useRef<TokiEvent | null>(null);
    const calloutOpeningRef = useRef(false);
    const calloutOpeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasRefreshedOnFocusRef = useRef(false);
    const renderCountRef = useRef(0);
    const justSetHighlightRef = useRef(false);
    const hasReloadedForProfileCenterRef = useRef<string | null>(null);

    // Image loading tracking
    const [imageLoadTracking, setImageLoadTracking] = useState<Set<string>>(new Set());
    const imageLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const CARD_PAGE_SIZE = 20;
    const initialBatchSize = CARD_PAGE_SIZE;
    const [visibleCount, setVisibleCount] = useState(CARD_PAGE_SIZE);
    const [isLocalLoadingMore, setIsLocalLoadingMore] = useState(false);

    renderCountRef.current += 1;

    // Custom hooks for data and filtering
    const {
        events,
        mapEvents,
        mapRegion,
        userConnections,
        isLoadingMore,
        refreshing,
        isWaitingForUserLocation,
        handleRefresh,
        updateMapRegion,
    } = useDiscoverData();

    const baseEvents = useMemo(() => (mapEvents && mapEvents.length > 0 ? mapEvents : events), [mapEvents, events]);

    const {
        selectedCategories,
        setSelectedCategories,
        selectedFilters,
        filteredEvents,
        handleFilterChange,
        clearAllFilters,
        searchQuery,
        setSearchQuery,
    } = useDiscoverFilters(baseEvents, userConnections);

    // Profile-based center and radius (in meters) used to constrain map movement
    const profileCenter = useMemo(() => {
        const lat = state.currentUser?.latitude ?? mapRegion?.latitude;
        const lng = state.currentUser?.longitude ?? mapRegion?.longitude;
        // Ensure they're numbers, not strings
        const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat || 0));
        const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng || 0));
        
        // Only return if valid numbers
        if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
            return {
                latitude: latNum,
                longitude: lngNum,
            };
        }
        console.log('🏄 [MAP-FLOW] Profile center invalid, returning null');
        return null; // Return null if invalid
    }, [state.currentUser?.latitude, state.currentUser?.longitude, mapRegion?.latitude, mapRegion?.longitude]);

    const maxRadiusMeters = useMemo(() => {
        const rawRadius = selectedFilters.radius as any;
        const radiusValue =
            typeof rawRadius === 'number'
                ? rawRadius
                : parseFloat(String(rawRadius || '500'));
        const radiusKm = Number.isFinite(radiusValue) && radiusValue > 0 ? radiusValue : 500;
        // Backend radius is in kilometers; convert to meters for map constraint
        const radiusMeters = radiusKm * 1000;
        return radiusMeters;
    }, [selectedFilters.radius]);

    // Add error boundary for category changes
    const handleCategoryToggle = useCallback((categories: string[]) => {
        try {
            setSelectedCategories(categories);
        } catch (error) {
            console.error('❌ [EXMAP] Error in handleCategoryToggle:', error);
            console.error('❌ [EXMAP] Error stack:', error instanceof Error ? error.stack : 'No stack');
        }
    }, [selectedCategories, setSelectedCategories, baseEvents.length, filteredEvents.length]);

    // Sorting
    const sortedEvents = useMemo(() => {
        try {
            const lat = mapRegion?.latitude ?? state.currentUser?.latitude;
            const lng = mapRegion?.longitude ?? state.currentUser?.longitude;
            
            const result = sortEvents(filteredEvents as any, sort, lat, lng);
            return result;
        } catch (error) {
            console.error('❌ [EXMAP] Error in sortedEvents useMemo:', error);
            console.error('❌ [EXMAP] Error details:', {
                filteredEventsLength: filteredEvents.length,
                sort,
                mapRegion,
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return []; // Return empty array on error to prevent crash
        }
    }, [filteredEvents, sort, mapRegion?.latitude, mapRegion?.longitude, state.currentUser?.latitude, state.currentUser?.longitude, selectedCategories]);

    // Reset card pagination when the sorted event set changes
    useEffect(() => {
        if (sortedEvents.length === 0) {
            setVisibleCount(0);
            return;
        }
        setVisibleCount(Math.min(sortedEvents.length, CARD_PAGE_SIZE));
    }, [sortedEvents]);

    const paginatedEvents = useMemo(() => {
        if (visibleCount === 0) {
            return [];
        }
        return sortedEvents.slice(0, visibleCount);
    }, [sortedEvents, visibleCount]);

    const hasMoreLocal = visibleCount < sortedEvents.length;

    const handleLoadMoreLocal = useCallback(() => {
        if (isLocalLoadingMore || !hasMoreLocal) {
            return;
        }

        setIsLocalLoadingMore(true);
        requestAnimationFrame(() => {
            setVisibleCount(prev => Math.min(sortedEvents.length, prev + CARD_PAGE_SIZE));
            setTimeout(() => {
                setIsLocalLoadingMore(false);
            }, 150);
        });
    }, [hasMoreLocal, isLocalLoadingMore, sortedEvents.length]);

    // Sort categories by number of tokis in each category (most first), keeping 'all' first
    const sortedCategories = useMemo(() => {
        // Calculate counts per category
        const categoryCounts = new Map<string, number>();
        baseEvents.forEach(event => {
            const count = categoryCounts.get(event.category) || 0;
            categoryCounts.set(event.category, count + 1);
        });

        // Sort categories by count (descending), then alphabetically for ties
        const sorted = [...CATEGORIES].sort((a, b) => {
            const countA = categoryCounts.get(a) || 0;
            const countB = categoryCounts.get(b) || 0;
            if (countB !== countA) {
                return countB - countA; // Descending by count
            }
            return a.localeCompare(b); // Alphabetical for ties
        });

        // Always put 'all' first
        return ['all', ...sorted];
    }, [baseEvents]);

    // Reset image loading tracking when data changes
    useEffect(() => {
        if (!state.loading && state.tokis.length > 0) {
            setImageLoadTracking(new Set());
            if (imageLoadTimeoutRef.current) {
                clearTimeout(imageLoadTimeoutRef.current);
                imageLoadTimeoutRef.current = null;
            }
        }
    }, [state.loading, state.tokis.length]);

    // Handle image load completion
    const handleImageLoad = useCallback((tokiId: string) => {
        setImageLoadTracking(prev => {
            const updated = new Set(prev);
            updated.add(tokiId);
            return updated;
        });
    }, []);

    // Check if initial batch images are loaded
    useEffect(() => {
        if (state.loading || sortedEvents.length === 0) return;

        const initialBatch = sortedEvents.slice(0, initialBatchSize);
        const loadedCount = imageLoadTracking.size;
        const expectedCount = initialBatch.length;

        if (loadedCount >= expectedCount) {
            if (imageLoadTimeoutRef.current) {
                clearTimeout(imageLoadTimeoutRef.current);
                imageLoadTimeoutRef.current = null;
            }
            setTimeout(() => {
                if (state.loading) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }, 100);
            return;
        }

        if (!imageLoadTimeoutRef.current && expectedCount > 0) {
            imageLoadTimeoutRef.current = setTimeout(() => {
                if (state.loading) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
                imageLoadTimeoutRef.current = null;
            }, 3000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageLoadTracking, sortedEvents, state.loading]);

    // Reset refresh flag when screen loses focus
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                hasRefreshedOnFocusRef.current = false;
            };
        }, [])
    );

    // Reset refresh flag when location changes so focus effect can run again
    useEffect(() => {
        hasRefreshedOnFocusRef.current = false;
        console.log('🏄 [MAP-FLOW] Location changed, resetting focus guard', {
            lat: state.currentUser?.latitude,
            lng: state.currentUser?.longitude
        });
    }, [state.currentUser?.latitude, state.currentUser?.longitude]);

    // Load user location early on focus (before initial load)
    useFocusEffect(
        React.useCallback(() => {
            if (state.isConnected && !state.currentUser?.latitude) {
                console.log('🏄 [MAP-FLOW] Loading user location early...');
                actions.loadCurrentUser().catch(err => {
                    console.error('🏄 [MAP-FLOW] Failed to load user location:', err);
                });
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [state.isConnected, state.currentUser?.latitude])
    );

    // Refresh on focus if no data (only after user location is available)
    // NOTE: Initial nearby load is owned by useDiscoverData; this effect only syncs mapRegion.
    useFocusEffect(
        React.useCallback(() => {
            if (hasRefreshedOnFocusRef.current) return;
            // Wait for user location - don't use default Tel Aviv
            if (!state.currentUser?.latitude || !state.currentUser?.longitude) {
                return; // Wait for user location
            }

            // Use profileCenter coordinates if available, otherwise fall back to user location
            const lat = profileCenter?.latitude || state.currentUser?.latitude;
            const lng = profileCenter?.longitude || state.currentUser?.longitude;

            if (state.isConnected && lat && lng) {
                console.log('🏄 [MAP-FLOW] useFocusEffect: Syncing mapRegion to focus location', {
                    lat,
                    lng,
                    source: profileCenter ? 'profileCenter' : 'userProfile',
                });

                // Update mapRegion to profile center (or user location) so the map centers correctly,
                // but DO NOT load tokis here – that is handled by useDiscoverData.
                updateMapRegion(
                    {
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    },
                    false
                );

                hasRefreshedOnFocusRef.current = true;
            }
        }, [
            state.isConnected,
            profileCenter,
            state.currentUser?.latitude,
            state.currentUser?.longitude,
            updateMapRegion,
        ])
    );

    // Simple: When profile location changes, reload everything
    useEffect(() => {
        if (!profileCenter || !profileCenter.latitude || !profileCenter.longitude) return;
        if (!state.isConnected) return;
        
        // Create unique key for this profile center location
        const profileCenterKey = `${profileCenter.latitude},${profileCenter.longitude}`;
        
        // Skip if we've already reloaded for this exact location (prevents infinite loop)
        if (hasReloadedForProfileCenterRef.current === profileCenterKey) {
            return;
        }
        
        // Mark as reloaded for this location BEFORE making the call (prevents race conditions)
        hasReloadedForProfileCenterRef.current = profileCenterKey;
        
        // Update mapRegion to match profileCenter
        updateMapRegion({
            latitude: profileCenter.latitude,
            longitude: profileCenter.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        }, false);
        
        // Reload tokis with new location - call directly with new coordinates to ensure we use the correct location
        const radius = parseFloat(String(selectedFilters.radius || '500')) || 500;
        Promise.all([
            actions.loadNearbyTokis({
                latitude: profileCenter.latitude,
                longitude: profileCenter.longitude,
                radius: radius,
                page: 1
            }, false),
            actions.loadNotifications() // Also refresh notifications
        ]).catch(error => {
            console.error('❌ [MAP-FLOW] Failed to reload tokis after location change:', error);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileCenter?.latitude, profileCenter?.longitude, state.isConnected, selectedFilters.radius]);

    // Handle highlightTokiId from navigation params
    useEffect(() => {
        const highlightTokiId = params.highlightTokiId as string | undefined;

        if (!highlightTokiId) {
            if (highlightedTokiId && !justSetHighlightRef.current) {
                setHighlightedTokiId(null);
                setHighlightedTokiCoordinates(null);
            } else if (justSetHighlightRef.current) {
                setTimeout(() => {
                    justSetHighlightRef.current = false;
                }, 6000);
            }
            return;
        }

        const foundToki = filteredEvents.find(e => e.id === highlightTokiId);

        if (foundToki && foundToki.coordinate) {
            const coords = foundToki.coordinate;
            const lat = coords.latitude;
            const lng = coords.longitude;

            if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
                justSetHighlightRef.current = true;
                setHighlightedTokiId(highlightTokiId);
                setHighlightedTokiCoordinates(coords);
                setShowMap(true);

                updateMapRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.002,
                    longitudeDelta: 0.002,
                }, true);

                setTimeout(() => {
                    router.setParams({ highlightTokiId: undefined });
                }, 5000);
            } else {
                console.warn('📍 [EXMAP] Toki coordinate is invalid:', highlightTokiId, coords);
                router.setParams({ highlightTokiId: undefined });
            }
        } else if (foundToki && !foundToki.coordinate) {
            fetchTokiForHighlight(highlightTokiId);
        } else {
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

                const lat = typeof tokiData.latitude === 'number' ? tokiData.latitude : parseFloat(tokiData.latitude);
                const lng = typeof tokiData.longitude === 'number' ? tokiData.longitude : parseFloat(tokiData.longitude);

                if (lat && lng && !isNaN(lat) && !isNaN(lng) && Number.isFinite(lat) && Number.isFinite(lng)) {
                    const coords = {
                        latitude: lat,
                        longitude: lng,
                    };
                    justSetHighlightRef.current = true;
                    setHighlightedTokiId(tokiId);
                    setHighlightedTokiCoordinates(coords);
                    setShowMap(true);

                    updateMapRegion({
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.002,
                        longitudeDelta: 0.002,
                    }, true);

                    setTimeout(() => {
                        router.setParams({ highlightTokiId: undefined });
                    }, 5000);
                } else {
                    console.warn('📍 [EXMAP] Toki has no valid coordinates:', tokiId, { lat, lng });
                    router.setParams({ highlightTokiId: undefined });
                }
            } else {
                console.warn('⚠️ [EXMAP] Failed to fetch toki, response not ok:', response.status);
                router.setParams({ highlightTokiId: undefined });
            }
        } catch (error) {
            console.error('❌ [EXMAP] Failed to fetch toki for highlight:', error);
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
        queryParams.radius = selectedFilters.radius;

        // Use profileCenter first, then fall back to mapRegion
        const lat = profileCenter?.latitude || mapRegion?.latitude;
        const lng = profileCenter?.longitude || mapRegion?.longitude;
        
        if (lat && lng) {
            console.log('🏄 [MAP-FLOW] ApplyFilters: Using coordinates', { lat, lng, source: profileCenter ? 'profileCenter' : 'mapRegion' });
            queryParams.userLatitude = lat.toString();
            queryParams.userLongitude = lng.toString();
        }

        actions.loadTokisWithFilters(queryParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFilters, profileCenter, mapRegion]);

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

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setShowSearch(false);
    }, [setSearchQuery]);

    // Use ref to store current mapRegion
    const mapRegionRef = useRef(mapRegion);
    useEffect(() => {
        mapRegionRef.current = mapRegion;
    }, [mapRegion]);

    const handleRegionChange = useCallback((r: any) => {
        if (calloutOpeningRef.current) {
            return;
        }

        const currentMapRegion = mapRegionRef.current;

        const eps = 0.00005;
        const same =
            Math.abs(r.latitude - currentMapRegion.latitude) < eps &&
            Math.abs(r.longitude - currentMapRegion.longitude) < eps &&
            Math.abs(r.latitudeDelta - currentMapRegion.latitudeDelta) < eps &&
            Math.abs(r.longitudeDelta - currentMapRegion.longitudeDelta) < eps;
        if (same) {
            return;
        }
        updateMapRegion(r, true);
    }, [updateMapRegion]);

    // Create a stable key for the map based on events to force remount when events change significantly
    const mapKey = useMemo(() => {
        // Use a hash of event IDs and count to create a stable key
        // This forces remount when events change, preventing native index errors
        const eventIds = sortedEvents.map(e => e.id).sort().join(',');
        const hash = eventIds.length > 0 ? `${sortedEvents.length}-${eventIds.substring(0, 50)}` : 'empty';
        return `map-${hash}`;
    }, [sortedEvents]);

    const renderInteractiveMap = useCallback(() => {
        try {
            // Don't render map until mapRegion is available (user location loaded)
            if (!mapRegion || isWaitingForUserLocation) {
                return (
                    <View style={styles.mapContainer} key="map-container">
                        <View style={styles.mapLoadingOverlay}>
                            <ActivityIndicator size="large" color="#B49AFF" />
                            <Text style={styles.mapLoadingText}>Loading your location...</Text>
                        </View>
                    </View>
                );
            }

            // Validate events before passing to map
            const validEvents = sortedEvents.filter(e => {
                const hasValidCoords = e.coordinate &&
                    Number.isFinite(e.coordinate.latitude) &&
                    Number.isFinite(e.coordinate.longitude);
                if (!hasValidCoords) {
                    console.warn('⚠️ [EXMAP] Event missing valid coordinates:', e.id);
                }
                return hasValidCoords;
            });

            return (
                <View style={styles.mapContainer} key="map-container">
                    <DiscoverMap
                        key={mapKey}
                        region={mapRegion}
                        onRegionChange={handleRegionChange}
                        events={validEvents as any}
                        onEventPress={handleEventPress as any}
                        onMarkerPress={handleMapMarkerPress as any}
                        highlightedTokiId={highlightedTokiId}
                        highlightedCoordinates={highlightedTokiCoordinates}
                        profileCenter={profileCenter}
                        maxRadiusMeters={maxRadiusMeters}
                    />
                </View>
            );
        } catch (error) {
            console.error('❌ [EXMAP] Error rendering map:', error);
            console.error('❌ [EXMAP] Map render error details:', {
                sortedEventsLength: sortedEvents.length,
                mapRegion,
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return (
                <View style={styles.mapContainer}>
                    <Text style={{ padding: 20, color: 'red' }}>
                        Map rendering error. Check console.
                    </Text>
                </View>
            );
        }
    }, [mapRegion, sortedEvents, handleRegionChange, handleEventPress, handleMapMarkerPress, highlightedTokiId, highlightedTokiCoordinates, profileCenter, maxRadiusMeters, mapKey]);

    const getSectionTitle = () => {
        if (state.loading && state.tokis.length === 0) {
            return 'Loading...';
        }

        const hasFilters = (selectedCategories.length > 0 && !selectedCategories.includes('all')) ||
            searchQuery ||
            Object.values(selectedFilters).some(v => v !== 'all' && v !== '');

        if (hasFilters) {
            const filteredCount = sortedEvents.length;
            return filteredCount > 0
                ? `${filteredCount} Toki${filteredCount !== 1 ? 's' : ''} nearby`
                : 'No Tokis nearby';
        }

        const displayCount = state.totalNearbyCount >= 0 ? state.totalNearbyCount : (state.tokis.length > 0 ? state.tokis.length : 0);

        if (displayCount > 0) {
            return `${displayCount} Toki${displayCount !== 1 ? 's' : ''} nearby`;
        }
        return 'No Tokis nearby';
    };

    const handleRefreshWithRadius = useCallback(() => {
        handleRefresh(selectedFilters.radius);
    }, [handleRefresh, selectedFilters.radius]);

    // Calculate number of columns based on screen width
    const numColumns = useMemo(() => {
        if (width >= 3200) return 7;
        if (width >= 2800) return 6;
        if (width >= 2400) return 5;
        if (width >= 2000) return 4;
        if (width >= 1600) return 3;
        if (width >= 1200) return 2;
        return 1;
    }, [width]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {/* Header from Explore with extended controls */}
            <View style={styles.headerWrapper}>
                <LinearGradient
                    colors={['rgba(255, 241, 235, 1)', 'rgba(243, 231, 255, 1)', 'rgba(229, 220, 255, 1)']}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.greeting}>Feeling social right now?</Text>
                        <Text style={styles.subtitle}>Find what's happening around you</Text>
                        {!state.isConnected && (
                            <View style={styles.connectionStatus}>
                                <Text style={styles.connectionStatusText}>⚠️ Offline mode - limited functionality</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.searchContainer}>
                        {showSearch ? (
                            <View style={styles.searchInputContainer}>
                                <Search size={20} color="#666666" />
                                <TextInput
                                    style={{ outline: 'none', ...styles.searchInput }}
                                    placeholder="Search activities, locations, hosts..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#999999"
                                    autoFocus
                                />
                                <TouchableOpacity onPress={clearSearch}>
                                    <X size={20} color="#666666" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(true)}>
                                <Search size={20} color="#666666" />
                                <Text style={styles.searchPlaceholder}>Search activities...</Text>
                            </TouchableOpacity>
                        )}

                        {/* Extended controls from Map */}
                        <View style={styles.extendedControls}>
                            <TouchableOpacity style={styles.controlButton} onPress={() => setShowSortModal(true)}>
                                <ArrowUpDown size={20} color="#666666" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={() => setShowFilterModal(true)}>
                                <Filter size={20} color="#B49AFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <FlatList
                key={`flatlist-${numColumns}`}
                data={Array.isArray(paginatedEvents) ? paginatedEvents.filter(item => item && typeof item === 'object') : []}
                keyExtractor={(item, index) => {
                    if (!item || typeof item !== 'object') {
                        return `toki-fallback-${index}-${Date.now()}`;
                    }
                    if (!item.id || typeof item.id !== 'string') {
                        return `toki-${index}-${Math.random()}-${Date.now()}`;
                    }
                    return String(item.id);
                }}
                style={styles.content}
                numColumns={typeof numColumns === 'number' && numColumns > 0 ? numColumns : 1}
                ListHeaderComponent={useMemo(() => {
                    try {
                        const mapComponent = renderInteractiveMap();
                        const sectionTitle = getSectionTitle();

                        // Ensure all values are valid
                        if (!mapComponent || typeof mapComponent !== 'object') {
                            console.warn('⚠️ [EXMAP] Invalid mapComponent, rendering fallback');
                        }

                        return (
                            <>
                                {mapComponent && typeof mapComponent === 'object' ? mapComponent : null}
                                <DiscoverCategories
                                    categories={sortedCategories || []}
                                    selectedCategories={selectedCategories || []}
                                    onCategoryToggle={handleCategoryToggle}
                                    showMap={showMap}
                                />
                                <View>
                                    <Text style={styles.sectionTitle}>{String(sectionTitle || '')}</Text>
                                </View>
                                {(isWaitingForUserLocation || (state.loading && state.tokis.length === 0)) ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#B49AFF" />
                                        <Text style={styles.loadingText}>
                                            {isWaitingForUserLocation ? 'Loading your location...' : 'Loading Tokis...'}
                                        </Text>
                                    </View>
                                ) : null}
                            </>
                        );
                    } catch (error) {
                        console.error('❌ [EXMAP] Error in ListHeaderComponent:', error);
                        return (
                            <View>
                                <Text style={styles.sectionTitle}>Error loading content</Text>
                            </View>
                        );
                    }
                }, [renderInteractiveMap, sortedCategories, selectedCategories, handleCategoryToggle, sortedEvents.length, state.loading, state.tokis.length, selectedFilters, searchQuery, state.totalNearbyCount, isWaitingForUserLocation, mapRegion])}
                renderItem={({ item, index }) => {
                    if (!item || typeof item !== 'object') {
                        return null;
                    }
                    return (
                        <View style={[
                            styles.cardWrapper,
                            numColumns > 1 && styles.cardWrapperGrid
                        ]}>
                            <TokiCard
                                toki={item}
                                onPress={() => handleEventPress(item)}
                                onHostPress={() => {
                                    if (item.host?.id && item.host.id !== state.currentUser?.id) {
                                        router.push({
                                            pathname: '/chat',
                                            params: {
                                                otherUserId: String(item.host.id),
                                                otherUserName: String(item.host.name || 'Unknown'),
                                                isGroup: 'false'
                                            }
                                        });
                                    }
                                }}
                                onImageLoad={() => {
                                    if (item.id) {
                                        const idx = sortedEvents.findIndex(e => e?.id === item.id);
                                        if (idx >= 0 && idx < initialBatchSize) {
                                            handleImageLoad(item.id);
                                        }
                                    }
                                }}
                            />
                        </View>
                    );
                }}
                ListEmptyComponent={() => {
                    if (isWaitingForUserLocation) {
                        return (
                            <View style={styles.skeletonContainer}>
                                {[1, 2, 3, 4].map((i) => (
                                    <View key={i} style={styles.skeletonCard}>
                                        <View style={styles.skeletonImage} />
                                        <View style={styles.skeletonContent}>
                                            <View style={styles.skeletonTitle} />
                                            <View style={styles.skeletonText} />
                                            <View style={styles.skeletonTextShort} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    }
                    return null;
                }}
                ListFooterComponent={() => (
                    <>
                        {(isLocalLoadingMore || isLoadingMore) && (
                            <View style={styles.loadingMoreContainer}>
                                <ActivityIndicator size="small" color="#B49AFF" />
                                <Text style={styles.loadingMoreText}>Loading more...</Text>
                            </View>
                        )}
                        <View style={styles.bottomSpacing} />
                    </>
                )}
                contentContainerStyle={[
                    filteredEvents.length === 0 ? styles.contentEmpty : [
                        styles.contentList,
                        numColumns > 1 && { paddingHorizontal: 12 }
                    ],
                    { paddingTop: 0 } // No padding - content scrolls under header
                ]}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefreshWithRadius} />
                }
                onEndReached={handleLoadMoreLocal}
                onEndReachedThreshold={0.2}
                removeClippedSubviews={false}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={20}
                onScroll={(event) => {
                    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                    if (contentSize.height > 0 && !isLocalLoadingMore && hasMoreLocal) {
                        const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                        if (distanceFromBottom <= 1000) {
                            handleLoadMoreLocal();
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
        marginTop: -20, // Negative margin to pull up into header's rounded corner area
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerWrapper: {
        overflow: 'hidden',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        backgroundColor: 'transparent', // Transparent wrapper so content shows through rounded corners
        marginBottom: -20, // Negative margin to allow overlap
        zIndex: 1, // Ensure header stays on top
    },
    header: {
        // paddingTop: 20,
        paddingHorizontal: 20,
        paddingTop: 70,
        paddingBottom: 20,
    },
    headerContent: {
        marginBottom: 30,
    },
    greeting: {
        fontSize: 28,
        fontFamily: 'Inter-Bold',
        color: '#1C1C1C',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#666666',
    },
    connectionStatus: {
        marginTop: 12,
        padding: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    connectionStatusText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#EF4444',
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 20
    },
    searchButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        outline: 'none',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#1C1C1C',
    },
    searchPlaceholder: {
        color: '#999999',
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        outline: 'none',
    },
    extendedControls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
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
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#666666',
        marginTop: 8,
    },
    bottomSpacing: {
        height: 20,
    },
    loadingMoreContainer: {
        width: '100%',
        paddingVertical: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#666666',
    },
    mapLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    mapLoadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#666666',
    },
    skeletonContainer: {
        padding: 16,
        gap: 16,
    },
    skeletonCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    skeletonImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
    },
    skeletonContent: {
        flex: 1,
        marginLeft: 12,
        gap: 8,
    },
    skeletonTitle: {
        height: 20,
        width: '70%',
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    skeletonText: {
        height: 16,
        width: '100%',
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
    },
    skeletonTextShort: {
        height: 16,
        width: '60%',
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
    },
});

