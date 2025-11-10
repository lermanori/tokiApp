import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, TextInput, Animated, RefreshControl, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Filter, MapPin, Clock, Users, Heart, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import TokiIcon from '@/components/TokiIcon';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import { useApp } from '@/contexts/AppContext';
import { CATEGORIES, getCategoryColor } from '@/utils/categories';

export default function ExploreScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    visibility: 'all',
    category: 'all',
    distance: 'all',
    availability: 'all',
    participants: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [userConnections, setUserConnections] = useState<string[]>([]); // Store connection user IDs
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const categories = ['all', ...CATEGORIES];

  // Calculate number of columns based on screen width (dynamic up to 7 columns)
  const numColumns = React.useMemo(() => {
    if (width >= 3200) return 7; // Ultra wide: 7 columns
    if (width >= 2800) return 6; // XXL Desktop: 6 columns
    if (width >= 2400) return 5; // XL Desktop: 5 columns
    if (width >= 2000) return 4; // Large Desktop: 4 columns
    if (width >= 1600) return 3; // Desktop: 3 columns
    if (width >= 1200) return 2; // Tablet/Desktop: 2 columns
    return 1; // Mobile: 1 column
  }, [width]);

  // Load user connections to check if hosts are connections
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const result = await actions.getConnections();
        // Connection structure: { id, createdAt, user: { id, name, avatar, ... } }
        const connectionIds = result.connections.map((conn: any) => {
          // Handle both structures: conn.user.id or conn.id (if user is flattened)
          return conn.user?.id || conn.id;
        }).filter((id: string) => id); // Filter out any undefined values
        setUserConnections(connectionIds);
        console.log('👥 [EXPLORE] Loaded connections:', connectionIds.length, 'users');
        console.log('👥 [EXPLORE] Connection IDs:', connectionIds);
      } catch (error) {
        console.error('❌ [EXPLORE] Failed to load connections:', error);
      }
    };
    if (state.isConnected && state.currentUser?.id) {
      loadConnections();
    }
  }, [state.isConnected, state.currentUser?.id]);

  // Load nearby tokis on mount and when user location is available
  useEffect(() => {
    if (state.isConnected && state.currentUser?.latitude && state.currentUser?.longitude) {
      loadNearbyTokis(1, false);
    }
  }, [state.isConnected, state.currentUser?.latitude, state.currentUser?.longitude]);

  // Refresh Tokis when screen comes into focus (e.g., after creating a new Toki)
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected && state.currentUser?.latitude && state.currentUser?.longitude) {
        loadNearbyTokis(1, false);
      }
    }, [state.isConnected, state.currentUser?.latitude, state.currentUser?.longitude])
  );

  const loadNearbyTokis = useCallback(async (page: number, append: boolean) => {
    if (!state.currentUser?.latitude || !state.currentUser?.longitude) {
      console.log('⚠️ [EXPLORE] No user location available');
      return;
    }

    // Prevent duplicate requests
    if (isLoadingMore && append) {
      return;
    }

    try {
      if (!append) {
        // Don't reset total count on initial load - let it be set by the response
      } else {
        setIsLoadingMore(true);
      }

      const response = await actions.loadNearbyTokis({
        latitude: state.currentUser.latitude,
        longitude: state.currentUser.longitude,
        radius: 10,
        page: page
      }, append);

      setCurrentPage(page);
      setHasMore(response.pagination.hasMore);
    } catch (error) {
      console.error('❌ [EXPLORE] Failed to load nearby tokis:', error);
      setHasMore(false); // Stop trying if there's an error
    } finally {
      setIsLoadingMore(false);
    }
  }, [state.currentUser?.latitude, state.currentUser?.longitude, isLoadingMore, actions]);

  const handleLoadMore = useCallback(() => {
    // FlatList's onEndReached can fire multiple times, so we need to guard against duplicates
    if (isLoadingMore || !hasMore || !state.currentUser?.latitude || !state.currentUser?.longitude) {
      return;
    }
    
    // Use functional update to ensure we get the latest currentPage
    setCurrentPage(prevPage => {
      const nextPage = prevPage + 1;
      // Call loadNearbyTokis with append=true to add to existing items
      loadNearbyTokis(nextPage, true).catch(err => {
        console.error('❌ [EXPLORE] Error in handleLoadMore:', err);
      });
      return nextPage;
    });
  }, [isLoadingMore, hasMore, state.currentUser?.latitude, state.currentUser?.longitude, loadNearbyTokis]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await actions.checkConnection();
    if (state.currentUser?.latitude && state.currentUser?.longitude) {
      await loadNearbyTokis(1, false);
    }
    setRefreshing(false);
  };


  const clearSearch = () => {
    setSearchQuery('');
    setShowSearch(false);
  };

  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      visibility: 'all',
      category: 'all',
      distance: 'all',
      availability: 'all',
      participants: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setSelectedCategory('all');
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleEventPress = (toki: any) => {
    router.push({
      pathname: '/toki-details',
      params: {
        tokiId: toki.id,
        tokiData: JSON.stringify(toki)
      }
    });
  };


  const filteredTokis = state.tokis.filter(toki => {
    const matchesSearch = searchQuery === '' ||
      toki.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toki.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toki.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toki.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      toki.host.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = (selectedCategory === 'all' || toki.category === selectedCategory) &&
      (selectedFilters.category === 'all' || toki.category === selectedFilters.category);

    const matchesVisibility = (() => {
      if (selectedFilters.visibility === 'all') {
        return true; // Show all tokis
      }
      
      if (selectedFilters.visibility === 'hosted_by_me') {
        // Filter to show only tokis hosted by the current user
        return toki.isHostedByUser === true;
      }
      
      if (selectedFilters.visibility === 'connections') {
        // Filter to show tokis where the host is in the user's connections list
        const hostIsConnection = userConnections.includes(toki.host.id);
        return hostIsConnection;
      }
      
      // Match exact visibility value (public, etc.)
      return toki.visibility === selectedFilters.visibility;
    })();

    // Distance filtering using backend-provided km (e.g., "2.5 km")
    const matchesDistance = (() => {
      if (selectedFilters.distance === 'all') return true;

      // Parse numeric km from string like "2.3 km" or "0.0 km"
      const km = typeof toki.distance === 'string'
        ? parseFloat(toki.distance)
        : (typeof (toki as any).distanceKm === 'number' ? (toki as any).distanceKm : NaN);

      if (!Number.isFinite(km)) return false; // cannot evaluate → exclude when a specific range chosen

      const opt = selectedFilters.distance;
      if (opt === 'Under 1km') return km < 1;
      if (opt === '1-3km') return km >= 1 && km < 3;
      if (opt === '3-5km') return km >= 3 && km < 5;
      if (opt === '5km+') return km >= 5;
      return true;
    })();

    // Availability based on percentage full: currentAttendees / maxAttendees
    const matchesAvailability = selectedFilters.availability === 'all' ||
      (() => {
        // currentAttendees may arrive as string; attendees is our mapped value
        const current = (() => {
          const a = (toki as any).attendees;
          if (Number.isFinite(a)) return a as number;
          const ca = (toki as any).currentAttendees;
          const parsed = typeof ca === 'string' ? parseInt(ca, 10) : ca;
          return Number.isFinite(parsed) ? (parsed as number) : 0;
        })();
        const max = Number.isFinite(toki.maxAttendees) ? toki.maxAttendees : 0;
        if (!max || max <= 0) return true; // can't evaluate meaningfully

        const percent = (current / max) * 100;

        switch (selectedFilters.availability) {
          case 'spots available':
            // Any room left
            return current < max;
          case 'almost full':
            // At least 80% full but not yet full
            return percent >= 80 && current < max;
          case 'waitlist':
            // Full or over capacity
            return current >= max;
          default:
            return true;
        }
      })();

    const matchesParticipants = selectedFilters.participants === 'all' ||
      (() => {
        const attendees = toki.attendees || 0;
        switch (selectedFilters.participants) {
          case '1-10': return attendees >= 1 && attendees <= 10;
          case '10-50': return attendees >= 10 && attendees <= 50;
          case '50-100': return attendees >= 50 && attendees <= 100;
          case '100+': return attendees >= 100;
          default: return true;
        }
      })();

    // Time (date) filter using scheduledTime and dateFrom/dateTo
    const matchesTime = (() => {
      const df = (selectedFilters as any).dateFrom;
      const dt = (selectedFilters as any).dateTo;
      if (!df && !dt) return true; // no time filter

      const scheduled = toki.scheduledTime ? new Date(toki.scheduledTime).getTime() : NaN;
      if (!Number.isFinite(scheduled)) return false; // cannot evaluate

      if (df && scheduled < new Date(df).getTime()) return false;
      if (dt && scheduled > new Date(dt).getTime()) return false;
      return true;
    })();

    return matchesSearch 
      && matchesCategory 
      && matchesVisibility 
      && matchesDistance 
      && matchesAvailability 
      && matchesParticipants
      && matchesTime;
  });


  const handleTokiPress = (toki: any) => {
    router.push({
      pathname: '/toki-details',
      params: {
        tokiId: toki.id,
        tokiData: JSON.stringify(toki)
      }
    });
  };

  const getJoinStatusText = (toki: any) => {
    if (toki.isHostedByUser) return 'Hosting';

    switch (toki.joinStatus) {
      case 'not_joined': return 'I want to join';
      case 'pending': return 'Request pending';
      case 'approved': return 'Approved - Join chat';
      case 'joined': return 'You\'re in!';
      default: return 'I want to join';
    }
  };

  const getJoinStatusColor = (toki: any) => {
    if (toki.isHostedByUser) return '#B49AFF';

    switch (toki.joinStatus) {
      case 'not_joined': return '#4DC4AA';
      case 'pending': return '#F9E79B';
      case 'approved': return '#A7F3D0';
      case 'joined': return '#EC4899';
      default: return '#4DC4AA';
    }
  };



  // Render header component for FlatList
  const renderHeader = () => (
    <>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
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
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter size={20} color="#B49AFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.sectionTitle}>
          {(state.loading && state.totalNearbyCount === 0 && state.tokis.length === 0) || 
           (state.totalNearbyCount === 0 && state.tokis.length === 0 && !state.error)
            ? 'Loading...' 
            : state.totalNearbyCount > 0
            ? `${state.totalNearbyCount} Toki${state.totalNearbyCount !== 1 ? 's' : ''} nearby`
            : state.tokis.length > 0
            ? `${state.tokis.length} Toki${state.tokis.length !== 1 ? 's' : ''} nearby`
            : 'No Tokis nearby'}
          {searchQuery && (
            <Text style={styles.searchResultText}> for "{searchQuery}"</Text>
          )}
        </Text>

        {state.loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Tokis...</Text>
          </View>
        )}

        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={async () => {
              await actions.checkConnection();
              if (state.currentUser?.latitude && state.currentUser?.longitude) {
                await loadNearbyTokis(1, false);
              }
            }}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  // Render empty state
  const renderEmpty = () => {
    if (state.loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Search size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Tokis found</Text>
        <Text style={styles.emptyDescription}>
          {searchQuery
            ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
            : 'No Tokis match your selected filters. Try removing some filters.'
          }
        </Text>
        {(searchQuery || selectedCategory !== 'all') && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setShowSearch(false);
            }}
          >
            <Text style={styles.clearFiltersText}>Clear all filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render footer (loading indicator)
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        key={`flatlist-${numColumns}`}
        data={filteredTokis}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <View style={[
            styles.cardWrapper,
            numColumns > 1 && styles.cardWrapperGrid
          ]}>
            <TokiCard
              toki={item}
              onPress={() => handleTokiPress(item)}
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
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={filteredTokis.length === 0 ? styles.contentEmpty : [
          styles.contentList,
          numColumns > 1 && { paddingHorizontal: 12 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // iOS-friendly infinite scroll props
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2} // Trigger when 20% from bottom (very aggressive for iOS)
        // Performance optimizations
        removeClippedSubviews={false} // Disable on iOS to prevent rendering issues
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        // Scroll animation support + backup trigger for iOS
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: false,
            listener: (event: any) => {
              // Backup trigger: manually check scroll position for iOS
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              if (contentSize.height > 0 && !isLoadingMore && hasMore) {
                const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                // Trigger when within 1000px of bottom (very aggressive)
                if (distanceFromBottom <= 1000) {
                  handleLoadMore();
                }
              }
            }
          }
        )}
        scrollEventThrottle={16}
      />

      <TokiFilters
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAll={clearAllFilters}
        onApply={applyFilters}
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
    flexGrow: 1,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  contentList: {
    paddingBottom: 20,
  },
  flatList: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    color: '#1C1C1C'
  },
  searchPlaceholder: {
    color: '#999999',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    outline: 'none',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  tokisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
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
  searchResultText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  clearAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterOptionSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  applyButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  categoryButtonActive: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  categoryTextActive: {
    color: '#FFFFFF',
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