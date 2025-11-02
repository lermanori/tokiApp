import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, TextInput, Animated, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Filter, MapPin, Clock, Users, Heart, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import TokiIcon from '@/components/TokiIcon';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const { state, actions } = useApp();
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
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  const categories = ['all', 'sports', 'beach', 'sunset', 'coffee', 'work', 'music', 'jazz', 'drinks', 'networking', 'wellness', 'yoga', 'morning', 'art', 'walking', 'culture'];

  // Refresh Tokis when screen comes into focus (e.g., after creating a new Toki)
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected) {
        actions.loadTokis();
      }
    }, [state.isConnected])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await actions.checkConnection();
    await actions.loadTokis();
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

    const matchesVisibility = selectedFilters.visibility === 'all' ||
      (selectedFilters.visibility === 'hosted_by_me' 
        ? toki.isHostedByUser === true
        : toki.visibility === selectedFilters.visibility);

    const matchesDistance = selectedFilters.distance === 'all' ||
      (() => {
        // This would need actual distance calculation in a real app
        // For now, just return true as we don't have distance data
        return true;
      })();

    const matchesAvailability = selectedFilters.availability === 'all' ||
      (() => {
        const attendees = toki.attendees || 0;
        const maxAttendees = toki.maxAttendees || 10;
        const spotsLeft = maxAttendees - attendees;

        switch (selectedFilters.availability) {
          case 'spots available': return spotsLeft > 0;
          case 'almost full': return spotsLeft <= 2 && spotsLeft > 0;
          case 'waitlist': return spotsLeft <= 0;
          default: return true;
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

    return matchesSearch && matchesCategory && matchesVisibility && matchesDistance && matchesAvailability && matchesParticipants;
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sports': return '#4DC4AA';
      case 'beach': return '#F9E79B';
      case 'sunset': return '#B49AFF';
      case 'coffee': return '#EC4899';
      case 'work': return '#A7F3D0';
      case 'music': return '#F3E7FF';
      case 'jazz': return '#4DC4AA';
      case 'drinks': return '#F9E79B';
      case 'networking': return '#B49AFF';
      case 'wellness': return '#EC4899';
      case 'yoga': return '#4DC4AA';
      case 'morning': return '#F3E7FF';
      case 'art': return '#EC4899';
      case 'walking': return '#4DC4AA';
      case 'culture': return '#B49AFF';
      default: return '#666666';
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
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
            {filteredTokis.length} Toki{filteredTokis.length !== 1 ? 's' : ''} nearby
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
                await actions.loadTokis();
              }}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.tokisContainer}>


          {!state.loading && filteredTokis.length === 0 ? (
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
          ) : (
            filteredTokis.map((toki) => (
              <View key={toki.id} style={styles.cardWrapper}>
                <TokiCard
                  toki={toki}
                  onPress={() => handleTokiPress(toki)}
                  onHostPress={() => {
                    if (toki.host.id && toki.host.id !== state.currentUser?.id) {
                      router.push({
                        pathname: '/chat',
                        params: {
                          otherUserId: toki.host.id,
                          otherUserName: toki.host.name,
                          isGroup: 'false'
                        }
                      });
                    }
                  }}
                />
              </View>
            ))
          )}
        </View>
      </Animated.ScrollView>

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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 360,
    maxWidth: 520,
    width: '100%',
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
});