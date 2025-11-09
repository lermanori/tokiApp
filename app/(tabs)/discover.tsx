import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Filter, Plus, Minus, Search, RefreshCw, Navigation, Crosshair, Clock, Users } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import TokiIcon from '@/components/TokiIcon';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import { useApp } from '@/contexts/AppContext';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { geocodingService } from '@/services/geocoding';
import DiscoverMap from '@/components/DiscoverMap';
import { CATEGORIES, getCategoryColor } from '@/utils/categories';

// Platform-specific map imports
const isWeb = Platform.OS === 'web';

// Web-only Leaflet imports
let MapContainer: any, TileLayer: any, LeafletMarker: any, LeafletPopup: any, L: any;
if (isWeb) {
  const Leaflet = require('react-leaflet');
  const LeafletCore = require('leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  LeafletMarker = Leaflet.Marker;
  LeafletPopup = Leaflet.Popup;
  L = LeafletCore;
}

interface TokiEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  scheduledTime?: string; // Add scheduledTime for smart time formatting
  attendees: number;
  maxAttendees: number;
  category: string;
  distance: string;
  visibility?: 'public' | 'connections' | 'friends';
  host: {
    id: string; // Add host.id for conversation functionality
    name: string;
    avatar: string;
  };
  image: string;
  tags: string[];
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined';
}

// Using unified getActivityPhoto from utils/activityPhotos.ts

// Helper function to format attendees display
const formatAttendees = (attendees: number, maxAttendees: number) => {
  // Every Toki has at least 1 attendee (the host), so only show "-" for truly missing data
  const attendeesText = attendees !== null && attendees !== undefined ? attendees.toString() : '-';
  const maxText = maxAttendees !== null && maxAttendees !== undefined ? maxAttendees.toString() : '-';
  return `${attendeesText}/${maxText} people`;
};

// Helper function to transform backend Toki data to TokiEvent format
// This is no longer needed since we're using the shared TokiCard component
// const transformTokiToEvent = (toki: any): TokiEvent => {
//   return {
//     id: toki.id,
//     title: toki.title,
//     description: toki.description,
//     location: toki.location,
//     time: toki.timeSlot,
//     attendees: toki.attendees || 0,
//     maxAttendees: toki.maxAttendees || 0,
//     category: toki.category,
//     distance: toki.distance?.km ? `${toki.distance.km} km` : '0.0 km',
//     host: {
//       name: toki.host.name,
//       avatar: toki.host.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
//     },
//     image: toki.imageUrl || getImageForActivity(toki.category),
//     tags: toki.tags || [toki.category],
//     coordinate: { 
//       latitude: toki.latitude ? parseFloat(toki.latitude) : 32.0853, 
//       longitude: toki.longitude ? parseFloat(toki.latitude) : 34.7818 
//     },
//     isHostedByUser: toki.isHostedByUser || false,
//     joinStatus: toki.joinStatus || 'not_joined',
//   };
// };

const categories = ['all', ...CATEGORIES];

export default function DiscoverScreen() {
  const { state, actions } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<TokiEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TokiEvent | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    visibility: 'all',
    category: 'all',
    distance: 'all',
    availability: 'all',
    participants: 'all',
    dateFrom: '',
    dateTo: '',
    radius: '10'
  });

  // Map and location state
  const [mapRegion, setMapRegion] = useState({
    latitude: 32.0853, // Default to Tel Aviv
    longitude: 34.7818,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showMap, setShowMap] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [userConnections, setUserConnections] = useState<string[]>([]);

  // Load Tokis from backend and transform them to events
  useEffect(() => {
    if (state.tokis.length > 0) {
      const transformedEvents = state.tokis.map(toki => ({
        id: toki.id,
        title: toki.title,
        description: toki.description,
        location: toki.location,
        time: toki.time,
        scheduledTime: toki.scheduledTime, // Add scheduledTime for smart formatting
        attendees: toki.attendees || 0,
        maxAttendees: toki.maxAttendees || 0,
        category: toki.category,
        distance: toki.distance,
        visibility: toki.visibility, // include visibility for filtering
        host: {
          id: toki.host.id, // Add host.id for conversation functionality
          name: toki.host.name,
          avatar: toki.host.avatar, // Let TokiCard handle fallback with initials
        },
        image: toki.image || getActivityPhoto(toki.category),
        tags: toki.tags || [toki.category],
        coordinate: {
          latitude: toki.latitude || 32.0853,
          longitude: toki.longitude || 34.7818
        },
        isHostedByUser: toki.isHostedByUser || false,
        joinStatus: toki.joinStatus || 'not_joined',
      }));
      setEvents(transformedEvents);
    }
  }, [state.tokis]);

  // Load user connections to support visibility filtering by host connection
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const result = await actions.getConnections();
        const ids = (result.connections || []).map((c: any) => c.user?.id || c.id).filter((v: string) => v);
        setUserConnections(ids);
      } catch (e) {}
    };
    if (state.isConnected && state.currentUser?.id) {
      loadConnections();
    }
  }, [state.isConnected, state.currentUser?.id]);

  // Marker diagnostics: count how many markers should render and detect overlapping coordinates
  useEffect(() => {
    try {
      if (events.length === 0) return;

      const eventsWithCoords = events.filter((e) =>
        Number.isFinite(e?.coordinate?.latitude) && Number.isFinite(e?.coordinate?.longitude)
      );

      const keyFor = (e: TokiEvent) => `${e.coordinate.latitude.toFixed(5)},${e.coordinate.longitude.toFixed(5)}`;
      const groups: Record<string, TokiEvent[]> = {};
      for (const e of eventsWithCoords) {
        const k = keyFor(e);
        if (!groups[k]) groups[k] = [];
        groups[k].push(e);
      }

      const uniqueCoordinates = Object.keys(groups).length;
      const stackedGroups = Object.entries(groups)
        .filter(([, arr]) => arr.length > 1)
        .map(([pos, arr]) => ({ position: pos, count: arr.length, ids: arr.map((a) => a.id) }));

    } catch (err) {
      console.error('🗺️ [DISCOVER] Marker diagnostics error', err);
    }
  }, [events]);

  // Load Tokis when component mounts
  useEffect(() => {
    if (state.isConnected) {
      actions.loadTokis();
    }
  }, [state.isConnected]);

  // Refresh Tokis when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected) {
        actions.loadTokis();
      }
    }, [state.isConnected])
  );

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      await actions.loadTokis();
    } catch (error) {
      console.error('❌ [DISCOVER] Failed to refresh Tokis:', error);
    }
  };

  // Center map from user's profile location (not device GPS)
  useEffect(() => {
    const setFromProfile = async () => {
      try {
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
            return;
          }
        }
        // fallback to Tel Aviv
        setMapRegion({
          latitude: 32.0853,
          longitude: 34.7818,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        setMapRegion({
          latitude: 32.0853,
          longitude: 34.7818,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    };
    setFromProfile();
  }, [state.currentUser?.location]);

  // Add Leaflet CSS for web
  useEffect(() => {
    if (isWeb) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // Add custom CSS for markers
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

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  const applyFilters = () => {
    setShowFilterModal(false);

    // Build query parameters for advanced search
    const queryParams: any = {};

    if (selectedFilters.category !== 'all') queryParams.category = selectedFilters.category;
    if (selectedFilters.dateFrom) queryParams.dateFrom = selectedFilters.dateFrom;
    if (selectedFilters.dateTo) queryParams.dateTo = selectedFilters.dateTo;
    if (selectedFilters.radius !== '10') queryParams.radius = selectedFilters.radius;

    // Use current map center for radius search
    if (mapRegion?.latitude && mapRegion?.longitude) {
      queryParams.userLatitude = mapRegion.latitude.toString();
      queryParams.userLongitude = mapRegion.longitude.toString();
    }

    console.log('🔍 [DISCOVER] Applying advanced filters:', queryParams);

    // Call the backend with advanced filters
    actions.loadTokisWithFilters(queryParams);
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
      radius: '10'
    });
    setSelectedCategory('all');
    setSearchQuery('');
  };

  // Map control functions
  const centerOnProfileLocation = async () => {
    const profileLoc = state.currentUser?.location?.trim();
    if (!profileLoc) return;
    try {
      const results = await geocodingService.geocodeAddress(profileLoc, 0);
      if (results && results[0]) {
        const { latitude, longitude } = results[0];
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch { }
  };

  const toggleMapType = () => {
    setMapType(prev => {
      switch (prev) {
        case 'standard': return 'satellite';
        case 'satellite': return 'hybrid';
        case 'hybrid': return 'standard';
        default: return 'standard';
      }
    });
  };

  const toggleMapView = () => {
    setShowMap(!showMap);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = (selectedCategory === 'all' || event.category === selectedCategory) &&
      (selectedFilters.category === 'all' || event.category === selectedFilters.category);

    const matchesVisibility = (() => {
      if (selectedFilters.visibility === 'all') return true;
      if (selectedFilters.visibility === 'hosted_by_me') return event.isHostedByUser === true;
      if (selectedFilters.visibility === 'connections') {
        const hostIsConnection = userConnections.includes(event.host.id);
        return hostIsConnection;
      }
      return event.visibility === selectedFilters.visibility;
    })();

    // Distance from backend string (e.g., "2.3 km")
    const matchesDistance = (() => {
      if (selectedFilters.distance === 'all') return true;
      const km = typeof event.distance === 'string' ? parseFloat(event.distance) : NaN;
      if (!Number.isFinite(km)) return false;
      const opt = selectedFilters.distance;
      if (opt === 'Under 1km') return km < 1;
      if (opt === '1-3km') return km >= 1 && km < 3;
      if (opt === '3-5km') return km >= 3 && km < 5;
      if (opt === '5km+') return km >= 5;
      return true;
    })();

    const matchesAvailability = selectedFilters.availability === 'all' ||
      (() => {
        const current = Number.isFinite(event.attendees) ? event.attendees : 0;
        const max = Number.isFinite(event.maxAttendees) ? event.maxAttendees : 0;
        if (!max || max <= 0) return true;
        const percent = (current / max) * 100;
        switch (selectedFilters.availability) {
          case 'spots available':
            return current < max;
          case 'almost full':
            return percent >= 80 && current < max;
          case 'waitlist':
            return current >= max;
          default:
            return true;
        }
      })();

    const matchesParticipants = selectedFilters.participants === 'all' ||
      (() => {
        const attendees = event.attendees || 0;
        switch (selectedFilters.participants) {
          case '1-10': return attendees >= 1 && attendees <= 10;
          case '10-50': return attendees >= 10 && attendees <= 50;
          case '50-100': return attendees >= 50 && attendees <= 100;
          case '100+': return attendees >= 100;
          default: return true;
        }
      })();

    const matchesTime = (() => {
      const df = selectedFilters.dateFrom;
      const dt = selectedFilters.dateTo;
      if (!df && !dt) return true;
      const scheduled = event.scheduledTime ? new Date(event.scheduledTime).getTime() : NaN;
      if (!Number.isFinite(scheduled)) return false;
      if (df && scheduled < new Date(df).getTime()) return false;
      if (dt && scheduled > new Date(dt).getTime()) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesVisibility && matchesDistance && matchesAvailability && matchesParticipants && matchesTime;
  });

  const getJoinStatusText = (event: TokiEvent) => {
    if (event.isHostedByUser) return 'Hosting';

    switch (event.joinStatus) {
      case 'not_joined': return 'I want to join';
      case 'pending': return 'Request pending';
      case 'approved': return 'Approved - Join chat';
      case 'joined': return 'You\'re in!';
      default: return 'I want to join';
    }
  };

  const getJoinStatusColor = (event: TokiEvent) => {
    if (event.isHostedByUser) return '#B49AFF'; // Hosting - soft purple

    switch (event.joinStatus) {
      case 'not_joined': return '#4DC4AA'; // I want to join - pastel green
      case 'pending': return '#F9E79B'; // Request pending - soft yellow
      case 'approved': return '#A7F3D0'; // Approved - light pastel green
      case 'joined': return '#EC4899'; // You're in - friendly pink
      default: return '#4DC4AA';
    }
  };

  // Helper function to get category color for map markers
  const getCategoryColorForMap = getCategoryColor;

  const renderInteractiveMap = () => (
    <View style={styles.mapContainer}>
      <DiscoverMap
        region={mapRegion}
        onRegionChange={(r: any) => setMapRegion(r)}
        events={filteredEvents as any}
        onEventPress={handleEventPress}
        onMarkerPress={handleMapMarkerPress}
        onToggleList={toggleMapView}
      />
    </View>
  );


  const handleEventPress = (event: TokiEvent) => {
    router.push({
      pathname: '/toki-details',
      params: {
        tokiId: event.id,
        tokiData: JSON.stringify(event)
      }
    });
  };

  const handleMapMarkerPress = (event: TokiEvent) => {
    setSelectedEvent(event);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Discover</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleRefresh}
              disabled={state.loading}
            >
              <RefreshCw size={20} color={state.loading ? "#CCCCCC" : "#666666"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={toggleMapView}>
              {showMap ? <MapPin size={20} color="#666666" /> : <View style={styles.listIcon} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilterModal(true)}>
              <Filter size={20} color="#666666" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Section - Toggleable */}
        {showMap ? renderInteractiveMap() : (
          <View style={styles.listViewContainer}>
            <Text style={styles.listViewTitle}>Activities Near You</Text>
            <View style={styles.eventsContainer}>
              {filteredEvents.map((event) => (
                <View key={event.id} style={styles.cardWrapper}>
                  <TokiCard
                    toki={event}
                    onPress={() => handleEventPress(event)}
                    onHostPress={() => {
                      if (event.host.id && event.host.id !== state.currentUser?.id) {
                        router.push({
                          pathname: '/chat',
                          params: {
                            otherUserId: event.host.id,
                            otherUserName: event.host.name,
                            isGroup: 'false'
                          }
                        });
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Categories */}
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
            {filteredEvents.length} Toki{filteredEvents.length !== 1 ? 's' : ''} nearby
          </Text>
        </View>
        {/* Events List */}
        <View style={styles.eventsContainer}>

          {filteredEvents.map((event) => (
            <View key={event.id} style={styles.cardWrapper}>
              <TokiCard
                toki={event}
                onPress={() => handleEventPress(event)}
                onHostPress={() => {
                  if (event.host.id && event.host.id !== state.currentUser?.id) {
                    router.push({
                      pathname: '/chat',
                      params: {
                        otherUserId: event.host.id,
                        otherUserName: event.host.name,
                        isGroup: 'false'
                      }
                    });
                  }
                }}
              />
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
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
  content: {
    flex: 1,
  },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#E8F4FD',
    position: 'relative',
    overflow: 'hidden',
  },
  mapBackground: {
    flex: 1,
    position: 'relative',
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D1E7DD',
    opacity: 0.3,
  },
  horizontalLine: {
    width: '100%',
    height: 1,
  },
  verticalLine: {
    height: '100%',
    width: 1,
  },
  streetLabels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  streetLabel: {
    position: 'absolute',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapMarker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  attendeeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD93D',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  attendeeText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 32,
    height: 4,
    backgroundColor: '#EAEAEA',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  bottomSheetInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  bottomSheetActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
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
  eventsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
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
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokiIcon: {
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hostLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  hostName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    textDecorationLine: 'underline',
  },
  distance: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  joinStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  joinStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  bottomSpacing: {
    height: 20,
  },
  // Interactive Map Styles
  map: {
    width: '100%',
    height: 300,
    borderRadius: 16,
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapTypeIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapTypeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  calloutContainer: {
    width: 200,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    marginBottom: 4,
  },
  calloutLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  calloutAttendees: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  calloutButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  calloutButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  // List View Styles
  listViewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listViewTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  eventCardCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    marginBottom: 4,
  },
  eventCardLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  eventCardAttendees: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  listIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
  // Web Map Placeholder Styles
  webMapPlaceholder: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  webMapTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  webMapSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  webMapFeatures: {
    marginBottom: 24,
    alignItems: 'center',
  },
  webMapFeature: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  webMapButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webMapButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  // Leaflet Map Styles
  webMapContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  leafletPopup: {
    textAlign: 'center',
    fontFamily: 'Inter, sans-serif',
  },
  leafletButton: {
    backgroundColor: '#B49AFF',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    marginTop: '8px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
  },
  webMapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  webMapControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '8px',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  // Native Map Placeholder Styles
  nativeMapPlaceholder: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  nativeMapTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  nativeMapSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  nativeMapButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nativeMapButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
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
  // Date Range Filter Styles
  dateInputContainer: {
    gap: 12,
  },
  dateInputWrapper: {
    gap: 6,
  },
  dateInputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  // Radius Filter Styles
  radiusContainer: {
    gap: 12,
  },
  radiusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    textAlign: 'center',
  },
  radiusSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radiusMin: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#999999',
  },
  radiusMax: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#999999',
  },
  radiusSlider: {
    flex: 1,
    position: 'relative',
  },
  radiusSliderTrack: {
    height: 4,
    backgroundColor: '#EAEAEA',
    borderRadius: 2,
    position: 'relative',
  },
  radiusSliderFill: {
    height: 4,
    backgroundColor: '#B49AFF',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  radiusSliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#B49AFF',
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Sorting Styles
  sortContainer: {
    gap: 16,
  },
  sortRow: {
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sortOptionSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  sortOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  sortOptionTextSelected: {
    color: '#FFFFFF',
  },
  sortOrderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sortOrderOptionSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  sortOrderOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  sortOrderOptionTextSelected: {
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
  // New styles for host name in map popups
  popupContent: {
    fontFamily: 'Inter, sans-serif',
  },
  popupTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  popupDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  popupMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  hostLink: {
    color: '#B49AFF',
    textDecoration: 'underline',
    fontFamily: 'Inter-Medium',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hostLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  hostName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    textDecorationLine: 'underline',
  },
});