import React, { useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { CATEGORY_COLORS } from '@/utils/categories';
import { CATEGORY_CONFIG, getIconAsset } from '@/utils/categoryConfig';
import { View } from 'react-native';

// Module-level variables to persist map position across remounts
let lastKnownMapCenter: [number, number] | null = null;
let lastKnownMapZoom: number | null = null;
let mapHasBeenInitialized = false;
let initialMapCenter: [number, number] | null = null; // No default - wait for user location
let initialMapZoom = 13;

// Geo helpers for radius-based movement constraints
const EARTH_RADIUS_M = 6371000; // mean Earth radius in meters

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const lon2 = toRadians(b.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}

// Clamp a point to lie on or within a circle of radius maxRadiusMeters around center
function clampPointToRadius(
  center: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
  maxRadiusMeters: number
): { latitude: number; longitude: number } {
  const distance = haversineDistanceMeters(center, point);

  if (!Number.isFinite(distance) || distance === 0 || distance <= maxRadiusMeters) {
    return point;
  }

  const lat1 = toRadians(center.latitude);
  const lon1 = toRadians(center.longitude);
  const lat2 = toRadians(point.latitude);
  const lon2 = toRadians(point.longitude);

  const dLon = lon2 - lon1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);

  const angDist = maxRadiusMeters / EARTH_RADIUS_M;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAng = Math.sin(angDist);
  const cosAng = Math.cos(angDist);

  const lat3 = Math.asin(sinLat1 * cosAng + cosLat1 * sinAng * Math.cos(bearing));
  const lon3 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * sinAng * cosLat1,
      cosAng - sinLat1 * Math.sin(lat3)
    );

  return {
    latitude: toDegrees(lat3),
    longitude: toDegrees(lon3),
  };
}

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
  // Optional radius constraint around user profile location (ExMap)
  profileCenter?: { latitude: number; longitude: number } | null;
  maxRadiusMeters?: number;
}

// This file intentionally keeps Leaflet usage local to web-only component
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, L: any, Circle: any;
const isWeb = true;
if (isWeb) {
  const Leaflet = require('react-leaflet');
  const LeafletCore = require('leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  Marker = Leaflet.Marker;
  Popup = Leaflet.Popup;
  useMap = Leaflet.useMap;
  Circle = Leaflet.Circle;
  L = LeafletCore;
}

const getCategoryColorForMap = (category: string) => CATEGORY_COLORS[category] || '#666666';

function DiscoverMap({
  region,
  events,
  onEventPress,
  onMarkerPress,
  onToggleList,
  highlightedTokiId,
  highlightedCoordinates,
  profileCenter,
  maxRadiusMeters,
}: Props) {
  const toUrl = (icon: any): string => {
    if (!icon) return '';
    if (typeof icon === 'string') return icon;
    if (typeof icon.uri === 'string') return icon.uri; // Expo web assets export shape
    if (typeof icon.src === 'string') return icon.src;
    if (typeof icon.default === 'string') return icon.default;
    return '';
  };

  // Normalize legacy/alias category names to keys in CATEGORY_CONFIG
  const resolveCategoryKey = (category: string): string => {
    const raw = (category || '').toLowerCase();
    const aliases: Record<string, string> = {
      social: 'party',
      food: 'dinner',
      celebration: 'party',
      art: 'culture',
    };
    const candidate = aliases[raw] || raw;
    return CATEGORY_CONFIG[candidate] ? candidate : raw;
  };

  // Build icon URL map from single source of truth (CATEGORY_CONFIG)
  // Prefer bundler-resolved require() paths for hashed URLs; fall back to iconWeb if needed.
  const ICON_WEB: Record<string, string> = useMemo(() => {
    const entries = Object.entries(CATEGORY_CONFIG).map(([key, def]) => {
      const url = toUrl(getIconAsset(def.iconAsset)) || def.iconWeb || '';
      return [key, url] as [string, string];
    });
    const map = Object.fromEntries(entries) as Record<string, string>;
    try { console.log('[DiscoverMap.web] ICON_WEB (from CATEGORY_CONFIG)', map); } catch {}
    return map;
  }, []);
  // Proximity clustering (~50 meters)
  const clustered = useMemo(() => {
    const groups: { key: string; items: EventItem[]; lat: number; lng: number }[] = [];
    const meterToDeg = 1 / 111320; // rough conversion for latitude
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

  // Store marker refs for programmatic popup opening
  const markerRefs = useRef<Map<string, any>>(new Map());
  // Store map instance ref
  const mapInstanceRef = useRef<any>(null);
  
  // Memoize icon creation per cluster to prevent flickering
  const iconCache = useRef<Map<string, any>>(new Map());
  
  const getMarkerIcon = useCallback((group: { key: string; items: EventItem[]; lat: number; lng: number }) => {
    const cacheKey = `${group.key}-${group.items[0].category}-${group.items.length}`;
    
    if (iconCache.current.has(cacheKey)) {
      return iconCache.current.get(cacheKey);
    }
    
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: #FFFFFF;
          width: 32px; height: 32px; border-radius: 50%; border: 3px solid ${getCategoryColorForMap(group.items[0].category)};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: visible; position: relative;">
          <img src="${ICON_WEB[resolveCategoryKey(group.items[0].category)] || ''}" style="width: 22px; height: 22px; object-fit: contain;" />
          ${group.items.length > 1 ? `<div style="position:absolute; bottom:-6px; right:-6px; background:#111827; color:#fff; font-size:11px; border-radius:10px; padding:1px 5px; border:2px solid #fff;">${group.items.length}</div>` : ''}
        </div>`,
      iconSize: [32, 32], 
      iconAnchor: [16, 16]
    });
    
    iconCache.current.set(cacheKey, icon);
    return icon;
  }, [ICON_WEB]);

  // Clear icon cache when events change significantly
  useEffect(() => {
    // Only clear if the number of clusters changed significantly
    const currentClusterCount = clustered.length;
    if (iconCache.current.size > currentClusterCount * 2) {
      iconCache.current.clear();
    }
  }, [clustered.length]);

  // MapController component - must be inside MapContainer to use useMap hook
  const MapController = () => {
    const map = useMap();
    const isFirstMountRef = useRef(true);
    const hasInitializedRef = useRef(false);
    // Use refs to avoid recreating event listener when props change
    const profileCenterRef = useRef(profileCenter);
    const maxRadiusMetersRef = useRef(maxRadiusMeters);
    // Flag to prevent infinite loop when programmatically setting view
    const isClampingRef = useRef(false);
    
    // Update refs when props change
    useEffect(() => {
      profileCenterRef.current = profileCenter;
      maxRadiusMetersRef.current = maxRadiusMeters;
    }, [profileCenter, maxRadiusMeters]);
    
    useEffect(() => {
      mapInstanceRef.current = map;
      
      // On first mount, restore last known position if available, otherwise use initial
      if (isFirstMountRef.current && !hasInitializedRef.current) {
        isFirstMountRef.current = false;
        hasInitializedRef.current = true;
        
        // Check if we have highlighted coordinates on first mount (priority)
        if (highlightedTokiId && highlightedCoordinates) {
          const newCenter: [number, number] = [highlightedCoordinates.latitude, highlightedCoordinates.longitude];
          console.log('🏄 [MAP-FLOW] MapController: Setting view from highlighted coordinates:', newCenter);
          map.setView(newCenter, 16, { animate: false });
          lastKnownMapCenter = newCenter;
          lastKnownMapZoom = 16;
        } else {
          // Check for profileCenter first (via ref to get current value)
          const currentProfileCenter = profileCenterRef.current;
          
          // If we have both lastKnownMapCenter and profileCenter, check if they're close
          // If lastKnown is far from profileCenter, prioritize profileCenter (user's actual location)
          if (lastKnownMapCenter && lastKnownMapZoom !== null && currentProfileCenter && currentProfileCenter.latitude && currentProfileCenter.longitude) {
            const distance = haversineDistanceMeters(
              { latitude: lastKnownMapCenter[0], longitude: lastKnownMapCenter[1] },
              { latitude: currentProfileCenter.latitude, longitude: currentProfileCenter.longitude }
            );
            
            // If lastKnown is more than 1km from profileCenter, use profileCenter instead
            if (distance > 1000) {
              console.log('🏄 [MAP-FLOW] MapController: Last known position is far from profile center, using profile center', {
                lastKnown: lastKnownMapCenter,
                profileCenter: [currentProfileCenter.latitude, currentProfileCenter.longitude],
                distance
              });
              map.setView([currentProfileCenter.latitude, currentProfileCenter.longitude], 13, { animate: false });
              lastKnownMapCenter = [currentProfileCenter.latitude, currentProfileCenter.longitude];
              lastKnownMapZoom = 13;
            } else {
              // Restore user's last position (it's close to profile center)
              console.log('🏄 [MAP-FLOW] MapController: Restoring last known position (close to profile center):', lastKnownMapCenter);
              map.setView(lastKnownMapCenter, lastKnownMapZoom, { animate: false });
            }
          } else if (lastKnownMapCenter && lastKnownMapZoom !== null) {
            // Restore user's last position (no profileCenter available)
            console.log('🏄 [MAP-FLOW] MapController: Restoring last known position (no profileCenter):', lastKnownMapCenter);
            map.setView(lastKnownMapCenter, lastKnownMapZoom, { animate: false });
          } else if (currentProfileCenter && currentProfileCenter.latitude && currentProfileCenter.longitude) {
            // Use profile center if available
            console.log('🏄 [MAP-FLOW] MapController: Setting view from profile center:', [currentProfileCenter.latitude, currentProfileCenter.longitude]);
            map.setView([currentProfileCenter.latitude, currentProfileCenter.longitude], 13, { animate: false });
            lastKnownMapCenter = [currentProfileCenter.latitude, currentProfileCenter.longitude];
            lastKnownMapZoom = 13;
            mapHasBeenInitialized = true;
          } else if (!mapHasBeenInitialized && initialMapCenter) {
            // Fallback to initial props (only if available - no default Tel Aviv)
            console.log('🏄 [MAP-FLOW] MapController: Setting view from initial props:', initialMapCenter);
            map.setView(initialMapCenter, initialMapZoom, { animate: false });
            lastKnownMapCenter = initialMapCenter;
            lastKnownMapZoom = initialMapZoom;
            mapHasBeenInitialized = true;
          } else if (!mapHasBeenInitialized && !initialMapCenter) {
            // No location available yet - don't initialize map
            console.log('🏄 [MAP-FLOW] MapController: Waiting for location - map not initialized yet');
          }
        }
        
        // Set up maxBounds and drag handler if profileCenter and radius are available
        const currentProfileCenter = profileCenterRef.current;
        const currentMaxRadius = maxRadiusMetersRef.current;
        
        console.log('🏄 [MAP-FLOW] MapController: Checking radius constraint setup', {
          hasProfileCenter: !!currentProfileCenter,
          profileCenter: currentProfileCenter,
          hasMaxRadius: !!currentMaxRadius,
          maxRadius: currentMaxRadius
        });
        
        if (currentProfileCenter && currentMaxRadius && currentMaxRadius > 0) {
          // Validate and convert to numbers to prevent string concatenation
          const lat = typeof currentProfileCenter.latitude === 'number' 
            ? currentProfileCenter.latitude 
            : parseFloat(String(currentProfileCenter.latitude || 0));
          const lng = typeof currentProfileCenter.longitude === 'number'
            ? currentProfileCenter.longitude
            : parseFloat(String(currentProfileCenter.longitude || 0));
          const radius = typeof currentMaxRadius === 'number'
            ? currentMaxRadius
            : parseFloat(String(currentMaxRadius || 0));
          
          console.log('🏄 [MAP-FLOW] MapController: Validated values', { lat, lng, radius, isValid: Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radius) });
          
          // Only proceed if all values are valid finite numbers
          if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radius) && radius > 0) {
            // Calculate maxBounds from profile center and radius
            const radiusDegrees = radius / 111320; // rough conversion: 1 degree ≈ 111km
            const bounds = L.latLngBounds(
              [lat - radiusDegrees, lng - radiusDegrees],
              [lat + radiusDegrees, lng + radiusDegrees]
            );
            console.log('🏄 [MAP-FLOW] MapController: Setting maxBounds', { 
              center: [lat, lng], 
              radiusMeters: radius, 
              radiusDegrees, 
              bounds: [[lat - radiusDegrees, lng - radiusDegrees], [lat + radiusDegrees, lng + radiusDegrees]]
            });
            map.setMaxBounds(bounds);
          
            // Handle drag events to clamp during drag (not just after)
            const handleDrag = () => {
              if (isClampingRef.current) {
                console.log('🏄 [MAP-FLOW] Drag handler: Skipping (already clamping)');
                return;
              }
              
              const center = map.getCenter();
              const distance = haversineDistanceMeters(
                { latitude: lat, longitude: lng },
                { latitude: center.lat, longitude: center.lng }
              );
              
              if (distance > radius + 10) {
                console.log('🏄 [MAP-FLOW] Drag handler: Clamping (distance exceeds radius)', { 
                  distance, 
                  radius, 
                  center: [center.lat, center.lng],
                  profileCenter: [lat, lng]
                });
                const clamped = clampPointToRadius(
                  { latitude: lat, longitude: lng },
                  { latitude: center.lat, longitude: center.lng },
                  radius
                );
                
                isClampingRef.current = true;
                map.setView([clamped.latitude, clamped.longitude], map.getZoom(), { animate: false });
                setTimeout(() => { isClampingRef.current = false; }, 50);
              }
            };
            
            console.log('🏄 [MAP-FLOW] MapController: Drag handler registered');
          
            map.on('drag', handleDrag);
            
            // Cleanup for drag handler
            const cleanupDrag = () => {
              map.off('drag', handleDrag);
              map.setMaxBounds(null);
            };
            
            // Track user movements via map events (not props)
            const handleMoveEnd = () => {
              // Skip if we're currently programmatically setting the view (prevents infinite loop)
              if (isClampingRef.current) {
                console.log('🏄 [MAP-FLOW] MoveEnd handler: Skipping (already clamping)');
                return;
              }

              const center = map.getCenter();
              const zoom = map.getZoom();
              let nextCenter = {
                latitude: center.lat,
                longitude: center.lng,
              };

              // Use validated numeric values from outer scope
              // Check distance first to avoid unnecessary clamping calculation
              const distance = haversineDistanceMeters(
                {
                  latitude: lat,
                  longitude: lng,
                },
                nextCenter
              );

              console.log('🏄 [MAP-FLOW] MoveEnd handler: Checking distance', { 
                distance, 
                radius, 
                center: [center.lat, center.lng],
                profileCenter: [lat, lng],
                needsClamp: distance > radius + 10
              });

              // Only clamp if actually outside radius (with small tolerance for floating point precision)
              if (distance > radius + 10) { // 10m tolerance
                console.log('🏄 [MAP-FLOW] MoveEnd handler: Clamping (distance exceeds radius)');
                const clamped = clampPointToRadius(
                  {
                    latitude: lat,
                    longitude: lng,
                  },
                  nextCenter,
                  radius
                );

                // Set flag before calling setView to prevent recursive call
                isClampingRef.current = true;
                map.setView([clamped.latitude, clamped.longitude], zoom, { animate: false });
                
                // Reset flag after a short delay to allow moveend to fire and be ignored
                setTimeout(() => {
                  isClampingRef.current = false;
                }, 100);
                
                nextCenter = clamped;
              }

              lastKnownMapCenter = [nextCenter.latitude, nextCenter.longitude];
              lastKnownMapZoom = zoom;
            };
            
            console.log('🏄 [MAP-FLOW] MapController: MoveEnd handler registered');
            
            map.on('moveend', handleMoveEnd);
            
            // Cleanup event listeners on unmount
            return () => {
              map.off('moveend', handleMoveEnd);
              cleanupDrag();
            };
          } // End of validation check
        } else {
          // No radius constraint - just track movements
          const handleMoveEnd = () => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            lastKnownMapCenter = [center.lat, center.lng];
            lastKnownMapZoom = zoom;
          };
          
          map.on('moveend', handleMoveEnd);
          
          return () => {
            map.off('moveend', handleMoveEnd);
          };
        }
      }
    }, [map, highlightedTokiId, highlightedCoordinates]);
    
    // Handle map centering when highlighted coordinates change after initial mount (programmatic jump)
    useEffect(() => {
      if (highlightedTokiId && highlightedCoordinates && map && hasInitializedRef.current) {
        const newCenter: [number, number] = [highlightedCoordinates.latitude, highlightedCoordinates.longitude];
        map.setView(newCenter, 16, { animate: true, duration: 0.5 });
        // Update last known position
        lastKnownMapCenter = newCenter;
        lastKnownMapZoom = 16;
      }
    }, [highlightedTokiId, highlightedCoordinates, map]);
    
    // Center map on profile location when it becomes available (handles async loading)
    const hasAppliedProfileCenterRef = useRef(false);

    useEffect(() => {
      if (
        map && 
        profileCenter && 
        profileCenter.latitude && 
        profileCenter.longitude &&
        hasInitializedRef.current && 
        !hasAppliedProfileCenterRef.current
      ) {
        console.log('🏄 [MAP-FLOW] Profile center async effect: Profile center available', profileCenter);
        // Only apply if we don't have highlighted coordinates (they take priority)
        if (!highlightedTokiId || !highlightedCoordinates) {
          const currentCenter = map.getCenter();
          const distanceFromProfile = haversineDistanceMeters(
            { latitude: currentCenter.lat, longitude: currentCenter.lng },
            { latitude: profileCenter.latitude, longitude: profileCenter.longitude }
          );
          
          console.log('🏄 [MAP-FLOW] Profile center async effect: Distance check', { 
            distanceFromProfile, 
            currentCenter: [currentCenter.lat, currentCenter.lng],
            profileCenter: [profileCenter.latitude, profileCenter.longitude],
            willCenter: distanceFromProfile > 1000
          });
          
          // Only center if we're far from profile center (more than 1km away)
          // This prevents re-centering if user has already moved the map
          if (distanceFromProfile > 1000) {
            console.log('🏄 [MAP-FLOW] Profile center async effect: Centering map on profile location');
            hasAppliedProfileCenterRef.current = true;
            map.setView(
              [profileCenter.latitude, profileCenter.longitude],
              13,
              { animate: false }
            );
            lastKnownMapCenter = [profileCenter.latitude, profileCenter.longitude];
            lastKnownMapZoom = 13;
          } else {
            console.log('🏄 [MAP-FLOW] Profile center async effect: Skipping (too close to current position)');
          }
        } else {
          console.log('🏄 [MAP-FLOW] Profile center async effect: Skipping (highlighted coordinates take priority)');
        }
      }
    }, [map, profileCenter, highlightedTokiId, highlightedCoordinates]);
    
    return null;
  };

  // Handle highlighted toki - open popup after map centers
  useEffect(() => {
    console.log(`🔵 [CALLOUT WEB] Highlight effect triggered:`, {
      highlightedTokiId,
      hasCoordinates: !!highlightedCoordinates,
      clusteredCount: clustered.length
    });
    
    if (!highlightedTokiId || !highlightedCoordinates) {
      console.log(`🔵 [CALLOUT WEB] No highlight - exiting`);
      return;
    }

    // Find the cluster/marker containing this toki
    const cluster = clustered.find(group => {
      return group.items.some(item => item.id === highlightedTokiId);
    });
    
    console.log(`🔵 [CALLOUT WEB] Cluster search result:`, {
      found: !!cluster,
      clusterKey: cluster?.key,
      clusterItemsCount: cluster?.items.length
    });

    if (cluster) {
      console.log(`🔵 [CALLOUT WEB] Found cluster, scheduling popup open attempts: 200ms, 500ms, 1000ms, 2000ms`);
      // Wait for map to center (MapContainer will handle centering via props)
      // Then open popup
      let popupOpened = false;
      const openPopup = (attempt: number) => {
        if (popupOpened) {
          console.log(`🔵 [CALLOUT WEB] Attempt ${attempt} skipped - already opened`);
          return;
        }
        
        console.log(`🔵 [CALLOUT WEB] Attempt ${attempt} - Opening popup for cluster: ${cluster.key}`);
        const marker = markerRefs.current.get(cluster.key);
        console.log(`🔵 [CALLOUT WEB] Marker ref status:`, {
          hasMarker: !!marker,
          clusterKey: cluster.key,
          totalMarkers: markerRefs.current.size,
          allKeys: Array.from(markerRefs.current.keys())
        });
        
        if (marker) {
          // React Leaflet: Marker ref has leafletElement property that contains the Leaflet marker instance
          // Try direct access first
          let leafletMarker = null;
          
          if ((marker as any).leafletElement) {
            leafletMarker = (marker as any).leafletElement;
            console.log(`🔵 [CALLOUT WEB] Found leafletElement directly`);
          } else if ((marker as any).getLeafletElement) {
            // Some versions use getLeafletElement() method
            leafletMarker = (marker as any).getLeafletElement();
            console.log(`🔵 [CALLOUT WEB] Found leafletElement via getLeafletElement()`);
          } else {
            // Try accessing via internal structure
            const markerInstance = (marker as any);
            if (markerInstance._leaflet_id && mapInstanceRef.current) {
              const mapLayers = (mapInstanceRef.current as any)._layers;
              if (mapLayers && mapLayers[markerInstance._leaflet_id]) {
                leafletMarker = mapLayers[markerInstance._leaflet_id];
                console.log(`🔵 [CALLOUT WEB] Found leafletElement via map layers`);
              }
            }
          }
          
          if (leafletMarker && typeof leafletMarker.openPopup === 'function') {
            try {
              console.log(`🔵 [CALLOUT WEB] Using openPopup() method`);
              leafletMarker.openPopup();
              popupOpened = true;
              console.log(`✅ [CALLOUT WEB] Popup opened successfully via openPopup()`);
              return; // Success, don't retry
            } catch (e) {
              console.log(`⚠️ [CALLOUT WEB] openPopup() threw error:`, e);
              // Retry after short delay
              setTimeout(() => openPopup(attempt), 200);
            }
          } else {
            console.log(`⚠️ [CALLOUT WEB] Could not find leafletElement or openPopup method`);
            // Retry after short delay
            setTimeout(() => openPopup(attempt), 200);
          }
        } else {
          // Marker ref not ready, retry
          console.log(`⚠️ [CALLOUT WEB] Marker ref not found, retrying in 200ms...`);
          setTimeout(() => openPopup(attempt), 200);
        }
      };

      // Wait for map to render and center
      // Use shorter delays for faster popup opening
      // First attempt after map centers (200ms - map should be ready quickly)
      const timeoutId1 = setTimeout(() => openPopup(1), 200);
      // Second attempt in case first fails (500ms)
      const timeoutId2 = setTimeout(() => openPopup(2), 500);
      // Third attempt (1000ms) - fallback for slower renders
      const timeoutId3 = setTimeout(() => openPopup(3), 1000);
      // Fourth attempt (2000ms) - final fallback
      const timeoutId4 = setTimeout(() => openPopup(4), 2000);

      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
        clearTimeout(timeoutId4);
      };
    }
  }, [highlightedTokiId, highlightedCoordinates, clustered]);

  // Initialize module variables on first render (only once)
  useEffect(() => {
    if (!mapHasBeenInitialized) {
      // Set initial center/zoom from props (priority: highlighted > profileCenter > region)
      // Don't use default Tel Aviv - wait for actual location
      if (highlightedTokiId && highlightedCoordinates) {
        initialMapCenter = [highlightedCoordinates.latitude, highlightedCoordinates.longitude];
        initialMapZoom = 16;
        console.log('🏄 [MAP-FLOW] Initial center set from highlighted coordinates:', initialMapCenter);
      } else if (profileCenter && profileCenter.latitude && profileCenter.longitude) {
        // Use profile center if available (before region prop)
        initialMapCenter = [profileCenter.latitude, profileCenter.longitude];
        initialMapZoom = 13;
        console.log('🏄 [MAP-FLOW] Initial center set from profile center:', initialMapCenter);
      } else if (region && region.latitude && region.longitude) {
        // Use region prop if available (no default Tel Aviv)
        initialMapCenter = [region.latitude, region.longitude];
        initialMapZoom = 13;
        console.log('🏄 [MAP-FLOW] Initial center set from region prop:', initialMapCenter);
      }
      // If none available, initialMapCenter stays null - map won't render until location is available
    }
  }, [profileCenter]); // Include profileCenter so it updates when available

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  return (
    <View style={{ position: 'relative', backgroundColor: '#FFFFFF', marginTop: 20 }}>
      <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 16, overflow: 'hidden' }}>
        <MapContainer
          center={initialMapCenter || [0, 0]} // Temporary - will be set by MapController
          zoom={initialMapZoom}
          style={{ width: '100%', height: '100%' }}
          key="map-container"
          zoomControl={false}
        >
          <MapController />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Radius circle overlay - shows allowed movement area around profile location */}
          {profileCenter && maxRadiusMeters && maxRadiusMeters > 0 && Circle && (
            <Circle
              center={[profileCenter.latitude, profileCenter.longitude]}
              radius={maxRadiusMeters}
              pathOptions={{
                fillColor: '#B49AFF',
                fillOpacity: 0.1,
                color: '#B49AFF',
                weight: 2,
                opacity: 0.4,
              }}
            />
          )}

          {clustered.map((group) => (
            Number.isFinite(group.lat) && Number.isFinite(group.lng) ? (
              <Marker
                key={group.key}
                ref={(ref: any) => {
                  if (ref) {
                    markerRefs.current.set(group.key, ref);
                  } else {
                    markerRefs.current.delete(group.key);
                  }
                }}
                position={[group.lat, group.lng]}
                icon={getMarkerIcon(group)}
                eventHandlers={{ click: () => onMarkerPress(group.items[0]) }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', minWidth: 240 }}>
                    {group.items.length === 1 ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{group.items[0].title}</div>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{
                            background: '#F5F3FF', color: '#6D28D9', padding: '2px 8px', borderRadius: 999,
                            fontSize: 11, fontWeight: 600
                          }}>{group.items[0].category}</span>
                        </div>
                        <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>{group.items[0].location}</div>
                        <button style={{ background: '#B49AFF', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 6 }}
                          onClick={() => onEventPress(group.items[0])}>
                          View Details
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.items.length} events here</div>
                        <ul style={{ textAlign: 'left', padding: 0, margin: 0, maxHeight: 160, overflow: 'auto', listStyle: 'none' }}>
                          {group.items.map((ev) => (
                            <li key={ev.id} style={{ margin: '8px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#8B5CF6' }} />
                                <a
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); onEventPress(ev); }}
                                  style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: 600, padding: '2px 4px', borderRadius: 6 }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                  {ev.title}
                                </a>
                              </div>
                              <div style={{ marginLeft: 16, display: 'flex', gap: 8, marginTop: 2 }}>
                                <span style={{ background: '#F5F3FF', color: '#6D28D9', padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{ev.category}</span>
                                <span style={{ color: '#6B7280', fontSize: 11 }}>{typeof ev.attendees === 'number' && typeof ev.maxAttendees === 'number' ? `${ev.attendees}/${ev.maxAttendees} people` : ''}</span>
                                <span style={{ color: '#6B7280', fontSize: 11 }}>{ev.location}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>

        <div style={{ position: 'absolute', top: 60, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', fontSize: 18 }} onClick={onToggleList}>
            📋
          </button>
        </div>
      </div>
    </View>
  );
}

// Memoize component to prevent unnecessary re-renders when only region changes
export default memo(DiscoverMap, (prev, next) => {
  // Only re-render if events, callbacks, or highlight changed
  // Ignore region changes - map position is managed imperatively
  if (prev.events !== next.events) {
    const prevIds = prev.events.map(e => e.id).sort().join(',');
    const nextIds = next.events.map(e => e.id).sort().join(',');
    if (prevIds !== nextIds) return false;
  }
  
  if (prev.onEventPress !== next.onEventPress) return false;
  if (prev.onMarkerPress !== next.onMarkerPress) return false;
  if (prev.onToggleList !== next.onToggleList) return false;
  if (prev.highlightedTokiId !== next.highlightedTokiId) return false;
  if (prev.highlightedCoordinates !== next.highlightedCoordinates) return false;
  
  // Skip re-render if only region changed
  return true;
});

