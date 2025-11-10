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
  highlightedTokiId?: string | null;
  highlightedCoordinates?: { latitude: number; longitude: number } | null;
}

const getCategoryColorForMap = (category: string) => CATEGORY_COLORS[category] || '#666666';

function DiscoverMap({ region, onRegionChange, events, onEventPress, onMarkerPress, onToggleList, highlightedTokiId, highlightedCoordinates }: Props) {
  const pendingSelectionRef = useRef<EventItem | null>(null);
  // Freeze the initial region on first mount only - never update after mount
  const initialRegionRef = useRef(region);
  const isFirstMountRef = useRef(true);
  // Store current region in ref to avoid re-renders during dragging
  const currentRegionRef = useRef(region);
  const renderCountRef = useRef(0);
  // Ref to MapView for programmatic control
  const mapViewRef = useRef<MapView>(null);
  // Store marker refs for programmatic callout opening
  const markerRefs = useRef<Map<string, any>>(new Map());
  // Track highlighted cluster info
  const highlightedClusterInfoRef = useRef<{ clusterKey: string; initialIndex: number } | null>(null);
  
  // Track component renders
  renderCountRef.current += 1;
  
  // Only set initialRegionRef on the very first render (check render count to avoid false positives)
  if (isFirstMountRef.current && renderCountRef.current === 1) {
    initialRegionRef.current = region;
    currentRegionRef.current = region;
    isFirstMountRef.current = false;
  } else if (isFirstMountRef.current && renderCountRef.current > 1) {
    // Component was remounted - reset the flag but keep initial region
    isFirstMountRef.current = false;
  }
  
  // Update current region ref when region prop changes (but don't cause re-render)
  useEffect(() => {
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

  // Track if map is ready
  const mapReadyRef = useRef(false);

  // Handle highlighted toki - find cluster/marker, animate map, and open callout
  useEffect(() => {
    console.log(`🔵 [CALLOUT] Highlight effect triggered:`, {
      highlightedTokiId,
      hasCoordinates: !!highlightedCoordinates,
      clusteredCount: clustered.length
    });
    
    if (!highlightedTokiId || !highlightedCoordinates) {
      highlightedClusterInfoRef.current = null;
      console.log(`🔵 [CALLOUT] No highlight - exiting`);
      return;
    }

    // Find the cluster/marker containing this toki
    const cluster = clustered.find(group => {
      return group.items.some(item => item.id === highlightedTokiId);
    });

    console.log(`🔵 [CALLOUT] Cluster search result:`, {
      found: !!cluster,
      clusterKey: cluster?.key,
      clusterItemsCount: cluster?.items.length
    });

    if (cluster) {
      const tokiIndex = cluster.items.findIndex(item => item.id === highlightedTokiId);
      if (tokiIndex >= 0) {
        console.log(`🔵 [CALLOUT] Found toki in cluster at index ${tokiIndex}`);
        highlightedClusterInfoRef.current = {
          clusterKey: cluster.key,
          initialIndex: tokiIndex,
        };

        // Wait for map to be ready, then animate
        const animateAndOpen = () => {
          if (!mapViewRef.current) {
            console.log(`🔵 [CALLOUT] MapView ref not ready, retrying...`);
            setTimeout(animateAndOpen, 100);
            return;
          }

          console.log(`🔵 [CALLOUT] Starting map animation to highlighted toki`);
          // Animate map to highlighted toki location with very tight zoom
          const targetRegion = {
            latitude: highlightedCoordinates.latitude,
            longitude: highlightedCoordinates.longitude,
            latitudeDelta: 0.002, // Very tight zoom (~200m view) for better focus
            longitudeDelta: 0.002,
          };
          
          console.log(`🔵 [CALLOUT] Target region:`, {
            lat: targetRegion.latitude.toFixed(6),
            lng: targetRegion.longitude.toFixed(6),
            delta: targetRegion.latitudeDelta
          });
          
          // Update state first to ensure region prop is set (important for iOS)
          onRegionChange(targetRegion);
          
          // For iOS, wait a bit for the region prop to take effect, then animate
          const animationDuration = 800; // Longer duration for smoother, more fluid animation
          if (Platform.OS === 'ios') {
            // Small delay to ensure MapView has processed the region prop change
            setTimeout(() => {
              try {
                console.log(`🔵 [CALLOUT] Calling animateToRegion on iOS (${animationDuration}ms)`);
                mapViewRef.current?.animateToRegion(targetRegion, animationDuration);
                console.log(`✅ [CALLOUT] animateToRegion called successfully`);
                
                // Also try setCamera as backup (may provide smoother transition on some devices)
                setTimeout(() => {
                  try {
                    if (mapViewRef.current && (mapViewRef.current as any).setCamera) {
                      (mapViewRef.current as any).setCamera({
                        center: {
                          latitude: targetRegion.latitude,
                          longitude: targetRegion.longitude,
                        },
                        zoom: 18, // Higher zoom for tighter view
                        heading: 0,
                        pitch: 0,
                        altitude: 0,
                      });
                    }
                  } catch (e) {
                    // Silent fail
                  }
                }, 200);
              } catch (e) {
                // Fallback: try setCamera
                try {
                  if (mapViewRef.current && (mapViewRef.current as any).setCamera) {
                    (mapViewRef.current as any).setCamera({
                      center: {
                        latitude: targetRegion.latitude,
                        longitude: targetRegion.longitude,
                      },
                      zoom: 18,
                      heading: 0,
                      pitch: 0,
                      altitude: 0,
                    });
                  }
                } catch (e2) {
                  // Silent fail
                }
              }
            }, 100);
          } else {
            // Android
            try {
              console.log(`🔵 [CALLOUT] Calling animateToRegion on Android (${animationDuration}ms)`);
              mapViewRef.current.animateToRegion(targetRegion, animationDuration);
              console.log(`✅ [CALLOUT] animateToRegion called successfully`);
            } catch (e) {
              console.log(`⚠️ [CALLOUT] animateToRegion failed:`, e);
            }
          }
          
          // Schedule callout opening after animation completes (animationDuration + buffer)
          const firstAttemptDelay = animationDuration + 0; // 300ms buffer after animation
          const secondAttemptDelay = animationDuration + 800; // 800ms buffer as fallback
          console.log(`🔵 [CALLOUT] Scheduling callout open attempts: ${firstAttemptDelay}ms, ${secondAttemptDelay}ms`);

          // Wait for map animation to complete, then open callout
          // Track if callout was successfully opened to prevent multiple opens
          let calloutOpened = false;
          
          const openCallout = (attempt: number) => {
            // Don't try again if callout was already opened
            if (calloutOpened) {
              console.log(`🔵 [CALLOUT] Attempt ${attempt} skipped - already opened`);
              return;
            }
            
            console.log(`🔵 [CALLOUT] Attempt ${attempt} - Opening callout for cluster: ${cluster.key}`);
            const marker = markerRefs.current.get(cluster.key);
            console.log(`🔵 [CALLOUT] Marker ref status:`, {
              hasMarker: !!marker,
              clusterKey: cluster.key,
              totalMarkers: markerRefs.current.size,
              allKeys: Array.from(markerRefs.current.keys())
            });
            
            if (marker) {
              try {
                // react-native-maps Marker ref has showCallout() method
                if (typeof (marker as any).showCallout === 'function') {
                  console.log(`🔵 [CALLOUT] Using showCallout() method`);
                  (marker as any).showCallout();
                  calloutOpened = true;
                  console.log(`✅ [CALLOUT] Callout opened successfully via showCallout()`);
                  return; // Success, don't retry
                }
                
                // Fallback: try accessing native component
                const nativeHandle = (marker as any)._nativeComponent || (marker as any).getNode?.();
                if (nativeHandle && typeof nativeHandle.showCallout === 'function') {
                  console.log(`🔵 [CALLOUT] Using native handle showCallout()`);
                  nativeHandle.showCallout();
                  calloutOpened = true;
                  console.log(`✅ [CALLOUT] Callout opened successfully via native handle`);
                  return; // Success, don't retry
                }
                
                // Last resort: trigger onPress which automatically opens callout
                console.log(`🔵 [CALLOUT] Fallback: Using onMarkerPress`);
                onMarkerPress(cluster.items[0]);
                calloutOpened = true;
                console.log(`✅ [CALLOUT] Callout opened via onMarkerPress fallback`);
              } catch (e) {
                // Fallback: trigger onPress which opens callout automatically
                console.log(`⚠️ [CALLOUT] Error opening callout:`, e);
                console.log(`🔵 [CALLOUT] Fallback: Using onMarkerPress after error`);
                onMarkerPress(cluster.items[0]);
                calloutOpened = true;
                console.log(`✅ [CALLOUT] Callout opened via onMarkerPress fallback (after error)`);
              }
            } else {
              // Retry after a short delay if marker ref not ready
              console.log(`⚠️ [CALLOUT] Marker ref not found, retrying in 200ms...`);
              setTimeout(() => openCallout(attempt), 200);
            }
          };

          // First attempt after map animation completes
          const timeoutId1 = setTimeout(() => openCallout(1), firstAttemptDelay);
          // Second attempt in case first one fails
          const timeoutId2 = setTimeout(() => openCallout(2), secondAttemptDelay);

          return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
          };
        };

        // Start animation - don't wait for mapReady, just check if ref exists
        // For iOS, call immediately; for Android, use requestAnimationFrame with small delay
        if (Platform.OS === 'ios') {
          // iOS: Call immediately to ensure map moves
          animateAndOpen();
        } else {
          // Android: Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            setTimeout(animateAndOpen, 100);
          });
        }
        
        return () => {
          // Cleanup handled by timeouts in animateAndOpen
        };
      }
    }
  }, [highlightedTokiId, highlightedCoordinates, clustered, onMarkerPress, onRegionChange]);
  return (
    <View style={styles.container}>
      <MapView
        ref={mapViewRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegionRef.current}
        onRegionChange={(newRegion) => {
          // Update ref during dragging (no re-render)
          currentRegionRef.current = newRegion;
        }}
        onRegionChangeComplete={(newRegion) => {
          // Only update parent state when dragging stops (causes minimal re-renders)
          currentRegionRef.current = newRegion;
          onRegionChange(newRegion);
        }}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled={true}
        zoomControlEnabled={Platform.OS === 'android'}
        cacheEnabled={Platform.OS === 'android'}
        onMapReady={() => {
          mapReadyRef.current = true;
        }}
      >
        {clustered.map((group) => (
          Number.isFinite(group.lat) && Number.isFinite(group.lng) && (
            <RNMarker
              key={group.key}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current.set(group.key, ref);
                } else {
                  markerRefs.current.delete(group.key);
                }
              }}
              coordinate={{ latitude: group.lat, longitude: group.lng }}
              pinColor={'#FFFFFF'}
              onPress={() => {
                const selected = group.items[0];
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
                  onEventPress(selected);
                } : undefined}>
                  {group.items.length === 1 ? (
                  <Callout event={group.items[0]} />
                  ) : (
                  <ClusterCallout 
                    events={group.items} 
                    onEventPress={onEventPress}
                    initialIndex={
                      highlightedClusterInfoRef.current?.clusterKey === group.key
                        ? highlightedClusterInfoRef.current.initialIndex
                        : undefined
                    }
                  />
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
      return false;
    }
    const prevIds = prev.events.map(e => e.id).sort().join(',');
    const nextIds = next.events.map(e => e.id).sort().join(',');
    if (prevIds !== nextIds) {
      shouldSkip.eventsChanged = true;
      return false;
    }
  }
  
  // Re-render if callbacks changed
  if (prev.onEventPress !== next.onEventPress) {
    shouldSkip.callbacksChanged = true;
    return false;
  }
  if (prev.onMarkerPress !== next.onMarkerPress) {
    shouldSkip.callbacksChanged = true;
    return false;
  }
  if (prev.onToggleList !== next.onToggleList) {
    shouldSkip.callbacksChanged = true;
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
  }
  
  // Re-render if highlighted toki props changed (important for map animation and callout opening)
  const highlightedTokiIdChanged = prev.highlightedTokiId !== next.highlightedTokiId;
  const highlightedCoordinatesChanged = 
    prev.highlightedCoordinates?.latitude !== next.highlightedCoordinates?.latitude ||
    prev.highlightedCoordinates?.longitude !== next.highlightedCoordinates?.longitude;
  
  if (highlightedTokiIdChanged || highlightedCoordinatesChanged) {
    return false; // Force re-render
  }
  
  // Intentionally ignore changes to region and onRegionChange to prevent re-renders during map drag
  const skipRender = !shouldSkip.eventsChanged && !shouldSkip.callbacksChanged;
  return skipRender;
});

