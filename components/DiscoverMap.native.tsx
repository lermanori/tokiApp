import React, { useMemo, useRef, useCallback } from 'react';
import { CATEGORY_COLORS } from '@/utils/categories';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker as RNMarker, Callout as RNCallout, CalloutSubview, PROVIDER_GOOGLE } from 'react-native-maps';
import { Image, Platform } from 'react-native';
import { CATEGORY_ICONS } from '@/utils/categories';

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

const getCategoryColorForMap = (category: string) => CATEGORY_COLORS[category] || '#666666';

const formatAttendees = (attendees?: number, maxAttendees?: number) => {
  const a = attendees ?? 0;
  const m = maxAttendees ?? 0;
  return `${a}/${m} people`;
};

export default function DiscoverMap({ region, onRegionChange, events, onEventPress, onMarkerPress, onToggleList }: Props) {
  const pendingSelectionRef = useRef<EventItem | null>(null);
  // Proximity clustering (~50m)
  const clustered = useMemo(() => {
    const groups: { key: string; items: EventItem[]; lat: number; lng: number }[] = [];
    const meterToDeg = 1 / 111320;
    const radiusMeters = 50;
    const cell = radiusMeters * meterToDeg;
    const gridKey = (lat: number, lng: number) => `${Math.round(lat / cell)}_${Math.round(lng / cell)}`;
    (events || []).forEach((e) => {
      const lat = e.coordinate?.latitude;
      const lng = e.coordinate?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const key = gridKey(lat as number, lng as number);
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, items: [], lat: lat as number, lng: lng as number };
        groups.push(g);
      }
      g.items.push(e);
    });
    return groups;
  }, [events]);
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={onRegionChange}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={true}
        zoomControlEnabled={Platform.OS === 'android'}
        cacheEnabled={Platform.OS === 'android'}
      >
        {clustered.map((group) => (
          Number.isFinite(group.lat) && Number.isFinite(group.lng) && (
            <RNMarker
              key={group.key}
              coordinate={{ latitude: group.lat, longitude: group.lng }}
              pinColor={getCategoryColorForMap(group.items[0].category)}
              onPress={() => onMarkerPress(group.items[0])}
            >
              {/* Custom icon inside a small circular container */}
              <View style={{ backgroundColor: getCategoryColorForMap(group.items[0].category), width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                {CATEGORY_ICONS.map[group.items[0].category] && (
                  <Image source={CATEGORY_ICONS.map[group.items[0].category]} style={{ width: 22, height: 22 }} />
                )}
                {group.items.length > 1 && (
                  <View style={{ position: 'absolute', bottom: -6, right: -6, backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#FFFFFF' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11 }}>{group.items.length}</Text>
                  </View>
                )}
              </View>
              <RNCallout onPress={() => onEventPress(pendingSelectionRef.current || group.items[0])}>
                <View style={styles.calloutContainer}>
                  {group.items.length === 1 ? (
                    <>
                      <Text style={styles.calloutTitle}>{group.items[0].title}</Text>
                      <Text style={styles.calloutCategory}>{group.items[0].category}</Text>
                      <Text style={styles.calloutLocation}>{group.items[0].location}</Text>
                      <Text style={styles.calloutAttendees}>{formatAttendees(group.items[0].attendees, group.items[0].maxAttendees)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.calloutTitle}>{group.items.length} events here</Text>
                      <ScrollView style={styles.calloutList}>
                        {group.items.map((ev) => (
                          <CalloutSubview key={ev.id} onPress={() => onEventPress(ev)}>
                            <View style={styles.calloutListItem}>
                              <View style={styles.bullet} />
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={styles.calloutLink}
                                  numberOfLines={1}
                                  onPressIn={() => { pendingSelectionRef.current = ev; }}
                                >
                                  {ev.title}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                                  <View style={styles.badge}><Text style={styles.badgeText}>{ev.category}</Text></View>
                                  {typeof ev.attendees === 'number' && typeof ev.maxAttendees === 'number' && (
                                    <Text style={styles.metaText}>{`${ev.attendees}/${ev.maxAttendees} people`}</Text>
                                  )}
                                  {!!ev.location && (<Text style={styles.metaText}>{ev.location}</Text>)}
                                </View>
                              </View>
                            </View>
                          </CalloutSubview>
                        ))}
                      </ScrollView>
                    </>
                  )}
                  {group.items.length === 1 && (
                    <View style={styles.calloutButton}>
                      <Text style={styles.calloutButtonText}>View Details</Text>
                    </View>
                  )}
                </View>
              </RNCallout>
            </RNMarker>
          )
        ))}
      </MapView>

      <View style={styles.overlay}>
        {/* Zoom Controls */}
        <TouchableOpacity
          style={[styles.control, styles.zoomButton]}
          onPress={() => {
            const next = {
              ...region,
              latitudeDelta: region.latitudeDelta * 0.6,
              longitudeDelta: region.longitudeDelta * 0.6,
            };
            onRegionChange(next);
          }}
        >
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.control, styles.zoomButton]}
          onPress={() => {
            const next = {
              ...region,
              latitudeDelta: region.latitudeDelta * 1.4,
              longitudeDelta: region.longitudeDelta * 1.4,
            };
            onRegionChange(next);
          }}
        >
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
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
  zoomButton: { marginBottom: 6 },
  zoomText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#1C1C1C' },
  calloutContainer: { width: 200, padding: 12 },
  calloutTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1C1C1C', marginBottom: 4 },
  calloutCategory: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#B49AFF', marginBottom: 4 },
  calloutLocation: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 4 },
  calloutAttendees: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 8 },
  calloutList: { maxHeight: 120, marginTop: 6 },
  calloutListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6', marginRight: 8 },
  calloutLink: { fontSize: 13, color: '#4F46E5', textDecorationLine: 'underline', flexShrink: 1, fontWeight: '600' },
  badge: { backgroundColor: '#F5F3FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, marginRight: 6 },
  badgeText: { color: '#6D28D9', fontSize: 10, fontWeight: '600' },
  metaText: { color: '#6B7280', fontSize: 11, marginRight: 8 },
  calloutButton: { backgroundColor: '#B49AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  calloutButtonText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#FFFFFF' },
});


