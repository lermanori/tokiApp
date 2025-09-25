import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker as RNMarker, Callout as RNCallout, PROVIDER_GOOGLE } from 'react-native-maps';

type EventItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  attendees?: number;
  maxAttendees?: number;
  coordinate?: { latitude: number; longitude: number };
};

interface Props {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onRegionChange: (r: any) => void;
  events: EventItem[];
  onEventPress: (e: EventItem) => void;
  onMarkerPress: (e: EventItem) => void;
  onToggleList: () => void;
}

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

const formatAttendees = (attendees?: number, maxAttendees?: number) => {
  const a = attendees ?? 0;
  const m = maxAttendees ?? 0;
  return `${a}/${m} people`;
};

export default function DiscoverMap({ region, onRegionChange, events, onEventPress, onMarkerPress, onToggleList }: Props) {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={onRegionChange}
      >
        {events.map((event) => (
          Number.isFinite(event.coordinate?.latitude) && Number.isFinite(event.coordinate?.longitude) && (
            <RNMarker
              key={event.id}
              coordinate={{ latitude: event.coordinate!.latitude, longitude: event.coordinate!.longitude }}
              pinColor={getCategoryColorForMap(event.category)}
              onPress={() => onMarkerPress(event)}
            >
              <RNCallout onPress={() => onEventPress(event)}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{event.title}</Text>
                  <Text style={styles.calloutCategory}>{event.category}</Text>
                  <Text style={styles.calloutLocation}>{event.location}</Text>
                  <Text style={styles.calloutAttendees}>{formatAttendees(event.attendees, event.maxAttendees)}</Text>
                  <View style={styles.calloutButton}>
                    <Text style={styles.calloutButtonText}>View Details</Text>
                  </View>
                </View>
              </RNCallout>
            </RNMarker>
          )
        ))}
      </MapView>

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.control} onPress={onToggleList}>
          <Text>📋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', backgroundColor: '#FFFFFF', marginBottom: 8 },
  map: { width: '100%', height: 300, borderRadius: 16 },
  overlay: { position: 'absolute', top: 16, right: 16, gap: 8 },
  control: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  calloutContainer: { width: 200, padding: 12 },
  calloutTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1C1C1C', marginBottom: 4 },
  calloutCategory: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#B49AFF', marginBottom: 4 },
  calloutLocation: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 4 },
  calloutAttendees: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 8 },
  calloutButton: { backgroundColor: '#B49AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  calloutButtonText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#FFFFFF' },
});


