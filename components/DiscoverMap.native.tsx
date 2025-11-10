import React, { useMemo, useRef, memo, useEffect } from 'react';
import { CATEGORY_COLORS } from '@/utils/categories';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import MapView, { Marker as RNMarker, Callout as RNCallout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '@/utils/categories';
import Callout from './Callout';
import ClusterCallout from './ClusterCallout';

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

function DiscoverMap({ region, onRegionChange, events, onEventPress, onMarkerPress, onToggleList }: Props) {
  const pendingSelectionRef = useRef<EventItem | null>(null);
  // Freeze the initial region on first mount only - never update after mount
  const initialRegionRef = useRef(region);
  const isFirstMountRef = useRef(true);
  // Store current region in ref to avoid re-renders during dragging
  const currentRegionRef = useRef(region);
  const renderCountRef = useRef(0);
  // Ref to MapView for programmatic control
  const mapViewRef = useRef<MapView>(null);
  
  // Track component renders
  renderCountRef.current += 1;
  console.log(`🗺️ [MAP] Component render #${renderCountRef.current}`, {
    timestamp: Date.now(),
    eventsCount: events?.length || 0,
    regionLat: region.latitude.toFixed(6),
    regionLng: region.longitude.toFixed(6),
  });
  
  // Only set initialRegionRef on the very first render (check render count to avoid false positives)
  if (isFirstMountRef.current && renderCountRef.current === 1) {
    initialRegionRef.current = region;
    currentRegionRef.current = region;
    isFirstMountRef.current = false;
    console.log('🗺️ [MAP] First mount - initial region set', region);
  } else if (isFirstMountRef.current && renderCountRef.current > 1) {
    // Component was remounted - reset the flag but keep initial region
    console.log('🗺️ [MAP] Component remounted - keeping initial region', {
      renderCount: renderCountRef.current,
      initialRegion: initialRegionRef.current,
    });
    isFirstMountRef.current = false;
  }
  
  // Update current region ref when region prop changes (but don't cause re-render)
  useEffect(() => {
    console.log('🗺️ [MAP] Region prop changed, updating ref', {
      oldLat: currentRegionRef.current.latitude.toFixed(6),
      newLat: region.latitude.toFixed(6),
      oldLng: currentRegionRef.current.longitude.toFixed(6),
      newLng: region.longitude.toFixed(6),
    });
    currentRegionRef.current = region;
  }, [region]);
  
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
        ref={mapViewRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegionRef.current}
        onRegionChange={(newRegion) => {
          // Update ref during dragging (no re-render)
          console.log('🗺️ [MAP] onRegionChange (during drag)', {
            lat: newRegion.latitude.toFixed(6),
            lng: newRegion.longitude.toFixed(6),
            timestamp: Date.now(),
          });
          currentRegionRef.current = newRegion;
        }}
        onRegionChangeComplete={(newRegion) => {
          // Only update parent state when dragging stops (causes minimal re-renders)
          console.log('🗺️ [MAP] onRegionChangeComplete (drag stopped)', {
            lat: newRegion.latitude.toFixed(6),
            lng: newRegion.longitude.toFixed(6),
            timestamp: Date.now(),
          });
          currentRegionRef.current = newRegion;
          onRegionChange(newRegion);
        }}
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
              pinColor={'#FFFFFF'}
              onPress={() => {
                const selected = group.items[0];
                const pressTime = Date.now();
                console.log('🧭 [MAP] Marker pressed → onMarkerPress()', {
                  eventId: selected?.id,
                  title: selected?.title,
                  coordinate: selected?.coordinate,
                  clusterSize: group.items.length,
                  timestamp: pressTime
                });
                // Track when callout should be visible (after marker press, callout typically shows immediately)
                setTimeout(() => {
                  console.log('📌 [MAP] Callout should be VISIBLE now (estimated)', {
                    eventId: selected?.id,
                    title: selected?.title,
                    timestamp: Date.now(),
                    delay: Date.now() - pressTime
                  });
                }, 50); // Small delay to allow callout to render
                onMarkerPress(selected);
              }}
            >
              {/* Custom icon inside a small circular container */}
              <View style={{ backgroundColor: '#FFFFFF', width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: getCategoryColorForMap(group.items[0].category), justifyContent: 'center', alignItems: 'center' }}>
                {(() => {
                  const category = group.items[0].category;
                  const iconSource = CATEGORY_ICONS.map[category];
                  
                  if (iconSource) {
                    return <Image source={iconSource} style={{ width: 22, height: 22 }} />;
                  } else {
                    return <Image source={DEFAULT_CATEGORY_ICON} style={{ width: 22, height: 22 }} />;
                  }
                })()}
                {group.items.length > 1 && (
                  <View style={{ position: 'absolute', bottom: -6, right: -6, backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#FFFFFF' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11 }}>{group.items.length}</Text>
                  </View>
                )}
              </View>
              <RNCallout 
                onPress={group.items.length === 1 ? () => {
                  const selected = pendingSelectionRef.current || group.items[0];
                  console.log('🧭 [MAP] Callout pressed → onEventPress()', {
                    eventId: selected?.id,
                    title: selected?.title,
                  });
                  onEventPress(selected);
                } : undefined}>
                  {group.items.length === 1 ? (
                  <Callout event={group.items[0]} />
                  ) : (
                  <ClusterCallout events={group.items} onEventPress={onEventPress} />
                )}
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
            const current = currentRegionRef.current;
            const next = {
              ...current,
              latitudeDelta: current.latitudeDelta * 0.6,
              longitudeDelta: current.longitudeDelta * 0.6,
            };
            // Animate map to new region (required for iOS)
            if (mapViewRef.current) {
              mapViewRef.current.animateToRegion(next, 300);
            }
            // Update ref and parent state
            currentRegionRef.current = next;
            onRegionChange(next);
          }}
        >
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.control, styles.zoomButton]}
          onPress={() => {
            const current = currentRegionRef.current;
            const next = {
              ...current,
              latitudeDelta: current.latitudeDelta * 1.4,
              longitudeDelta: current.longitudeDelta * 1.4,
            };
            // Animate map to new region (required for iOS)
            if (mapViewRef.current) {
              mapViewRef.current.animateToRegion(next, 300);
            }
            // Update ref and parent state
            currentRegionRef.current = next;
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
  container: { position: 'relative', backgroundColor: '#FFFFFF' },
  map: { width: '100%', height: 300, borderRadius: 16 },
  overlay: { position: 'absolute', top: 16, right: 16, gap: 8 },
  control: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  zoomButton: { marginBottom: 6 },
  zoomText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#1C1C1C' },
});

// Skip re-render when only the region prop changes (prevents janky re-renders on iOS when dragging)
export default memo(DiscoverMap, (prev, next) => {
  const shouldSkip = {
    eventsChanged: false,
    callbacksChanged: false,
    regionChanged: false,
  };
  
  // Re-render if events array reference changed
  if (prev.events !== next.events) {
    // Deep check: compare event IDs to avoid re-renders when array is recreated with same content
    if (prev.events.length !== next.events.length) {
      shouldSkip.eventsChanged = true;
      console.log('🗺️ [MAP MEMO] Events length changed - RE-RENDER', {
        prevLength: prev.events.length,
        nextLength: next.events.length,
      });
      return false;
    }
    const prevIds = prev.events.map(e => e.id).sort().join(',');
    const nextIds = next.events.map(e => e.id).sort().join(',');
    if (prevIds !== nextIds) {
      shouldSkip.eventsChanged = true;
      console.log('🗺️ [MAP MEMO] Event IDs changed - RE-RENDER');
      return false;
    }
  }
  
  // Re-render if callbacks changed
  if (prev.onEventPress !== next.onEventPress) {
    shouldSkip.callbacksChanged = true;
    console.log('🗺️ [MAP MEMO] onEventPress changed - RE-RENDER');
    return false;
  }
  if (prev.onMarkerPress !== next.onMarkerPress) {
    shouldSkip.callbacksChanged = true;
    console.log('🗺️ [MAP MEMO] onMarkerPress changed - RE-RENDER');
    return false;
  }
  if (prev.onToggleList !== next.onToggleList) {
    shouldSkip.callbacksChanged = true;
    console.log('🗺️ [MAP MEMO] onToggleList changed - RE-RENDER');
    return false;
  }
  
  // Check if region changed
  const regionChanged = 
    prev.region.latitude !== next.region.latitude ||
    prev.region.longitude !== next.region.longitude ||
    prev.region.latitudeDelta !== next.region.latitudeDelta ||
    prev.region.longitudeDelta !== next.region.longitudeDelta;
  
  if (regionChanged) {
    shouldSkip.regionChanged = true;
    console.log('🗺️ [MAP MEMO] Region changed - SKIP RE-RENDER', {
      prevLat: prev.region.latitude.toFixed(6),
      nextLat: next.region.latitude.toFixed(6),
      prevLng: prev.region.longitude.toFixed(6),
      nextLng: next.region.longitude.toFixed(6),
    });
  }
  
  // Intentionally ignore changes to region and onRegionChange to prevent re-renders during map drag
  const skipRender = !shouldSkip.eventsChanged && !shouldSkip.callbacksChanged;
  if (skipRender) {
    console.log('🗺️ [MAP MEMO] Skipping re-render', shouldSkip);
  }
  return skipRender;
});

