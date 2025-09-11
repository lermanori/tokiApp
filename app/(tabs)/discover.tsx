import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Filter, Plus, Minus, Search, RefreshCw, Navigation, Crosshair, Clock, Users } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import TokiIcon from '@/components/TokiIcon';
import TokiCard from '@/components/TokiCard';
import TokiFilters from '@/components/TokiFilters';
import { useApp } from '@/contexts/AppContext';
import { getActivityPhoto } from '@/utils/activityPhotos';

// Platform-specific map imports
const isWeb = Platform.OS === 'web';

// Web-only Leaflet imports
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;
if (isWeb) {
  const Leaflet = require('react-leaflet');
  const LeafletCore = require('leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  Marker = Leaflet.Marker;
  Popup = Leaflet.Popup;
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

const categories = ['all', 'sports', 'beach', 'sunset', 'coffee', 'work', 'music', 'jazz', 'drinks', 'networking', 'wellness', 'yoga', 'morning', 'art', 'walking', 'culture'];

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
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 32.0853, // Default to Tel Aviv
    longitude: 34.7818,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showMap, setShowMap] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

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

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('📍 Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation(location);
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });

        console.log('📍 User location obtained:', location.coords);
      } catch (error) {
        console.error('📍 Error getting location:', error);
      }
    };

    getUserLocation();
  }, []);

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

    // Add user location for radius search
    if (userLocation) {
      queryParams.userLatitude = userLocation.coords.latitude.toString();
      queryParams.userLongitude = userLocation.coords.longitude.toString();
    } else {
      // Fallback to default Tel Aviv coordinates
      queryParams.userLatitude = '32.0853';
      queryParams.userLongitude = '34.7818';
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
  const centerOnUserLocation = () => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
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

    const matchesVisibility = selectedFilters.visibility === 'all' ||
      event.visibility === selectedFilters.visibility;

    const matchesDistance = selectedFilters.distance === 'all' ||
      (() => {
        // This would need actual distance calculation in a real app
        // For now, just return true as we don't have distance data
        return true;
      })();

    const matchesAvailability = selectedFilters.availability === 'all' ||
      (() => {
        const attendees = event.attendees || 0;
        const maxAttendees = event.maxAttendees || 10;
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
        const attendees = event.attendees || 0;
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
  const getCategoryColorForMap = (category: string) => {
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
      case 'social': return '#6B7280';
      default: return '#666666';
    }
  };

  const renderInteractiveMap = () => {
    // Web platform with Leaflet
    if (isWeb) {
      return (
        <View style={styles.mapContainer}>
          <div style={styles.webMapContainer}>
            <MapContainer
              center={[mapRegion.latitude, mapRegion.longitude]}
              zoom={13}
              style={styles.leafletMap}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={[userLocation.coords.latitude, userLocation.coords.longitude]}
                  icon={L.divIcon({
                    className: 'user-location-marker',
                    html: `
                      <div style="
                        background-color: #4ECDC4;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 10px;
                        font-family: Inter, sans-serif;
                      ">
                        👤
                      </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  })}
                >
                  <Popup>
                    <div style={styles.leafletPopup}>
                      <strong>Your Location</strong><br />
                      You are here
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Toki markers */}
              {filteredEvents.map((event) => {
                if (event.coordinate.latitude && event.coordinate.longitude) {
                  return (
                    <Marker
                      key={event.id}
                      position={[event.coordinate.latitude, event.coordinate.longitude]}
                      icon={L.divIcon({
                        className: 'custom-marker',
                        html: `
                          <div style="
                            background-color: ${getCategoryColorForMap(event.category)};
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                            font-family: Inter, sans-serif;
                          ">
                            ${event.category.charAt(0).toUpperCase()}
                          </div>
                        `,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                      })}
                      eventHandlers={{
                        click: () => handleMapMarkerPress(event)
                      }}
                    >
                      <Popup>
                        <div style={styles.leafletPopup}>
                          <strong>{event.title}</strong><br />
                          <span style={{ color: '#B49AFF' }}>{event.category}</span><br />
                          {event.location}<br />
                          {formatAttendees(event.attendees, event.maxAttendees)}<br />
                          <button
                            style={styles.leafletButton}
                            onClick={() => handleEventPress(event)}
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>

            {/* Map Controls Overlay */}
            <div style={styles.webMapControls}>
              <button style={styles.webMapControlButton} onClick={centerOnUserLocation}>
                🎯
              </button>
              <button style={styles.webMapControlButton} onClick={toggleMapView}>
                📋
              </button>
            </div>
          </div>
        </View>
      );
    }

    // Native platform map - will be implemented when needed
    return (
      <View style={styles.mapContainer}>
        <View style={styles.nativeMapPlaceholder}>
          <Text style={styles.nativeMapTitle}>Interactive Map</Text>
          <Text style={styles.nativeMapSubtitle}>Loading map...</Text>
          <TouchableOpacity style={styles.nativeMapButton} onPress={toggleMapView}>
            <Text style={styles.nativeMapButtonText}>Switch to List View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };


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
    <SafeAreaView style={styles.container}>
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