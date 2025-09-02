import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, TextInput, Modal, Animated, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Filter, MapPin, Clock, Users, Heart, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import TokiIcon from '@/components/TokiIcon';
import TokiCard from '@/components/TokiCard';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const { state, actions } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState({
    visibility: 'all',
    category: 'all',
    distance: 'all',
    availability: 'all',
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  const allTags = ['sports', 'beach', 'sunset', 'coffee', 'work', 'music', 'jazz', 'drinks', 'networking', 'wellness', 'yoga', 'morning', 'art', 'walking', 'culture'];

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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearch(false);
  };

  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      visibility: 'all',
      category: 'all',
      distance: 'all',
      availability: 'all',
    });
    setSelectedTags([]);
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
    
    const matchesTags = selectedTags.length === 0 || 
      toki.tags.some(tag => selectedTags.includes(tag));

    const matchesVisibility = selectedFilters.visibility === 'all' || 
      toki.visibility === selectedFilters.visibility;

    const matchesCategory = selectedFilters.category === 'all' || 
      toki.category === selectedFilters.category;
    
    return matchesSearch && matchesTags && matchesVisibility && matchesCategory;
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

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <X size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Visibility Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Visibility</Text>
            <View style={styles.filterOptions}>
              {['all', 'public', 'connections', 'friends'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    selectedFilters.visibility === option && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, visibility: option }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilters.visibility === option && styles.filterOptionTextSelected
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.filterOptions}>
              {['all', 'sports', 'work', 'music', 'wellness', 'art'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    selectedFilters.category === option && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, category: option }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilters.category === option && styles.filterOptionTextSelected
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Distance Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Distance</Text>
            <View style={styles.filterOptions}>
              {['all', 'under 1km', '1-3km', '3-5km', '5km+'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    selectedFilters.distance === option && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, distance: option }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilters.distance === option && styles.filterOptionTextSelected
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Availability Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Availability</Text>
            <View style={styles.filterOptions}>
              {['all', 'spots available', 'almost full', 'waitlist'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    selectedFilters.availability === option && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedFilters(prev => ({ ...prev, availability: option }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilters.availability === option && styles.filterOptionTextSelected
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
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
                  style={styles.searchInput}
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

        <View style={styles.tagsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroll}
          >
            {allTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagSelected
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[
                  styles.tagText,
                  selectedTags.includes(tag) && styles.tagTextSelected
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.tokisContainer}>
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
              {(searchQuery || selectedTags.length > 0) && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedTags([]);
                    setShowSearch(false);
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredTokis.map((toki) => (
              <TokiCard
                key={toki.id}
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
            ))
          )}
        </View>
      </Animated.ScrollView>

      <FilterModal />
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
  tagsContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  tagsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  tagSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  tokisContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 16,
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
});