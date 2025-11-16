import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { CATEGORY_COLORS } from '@/utils/categories';
import { CATEGORY_CONFIG, getIconAsset } from '@/utils/categoryConfig';
import { View } from 'react-native';

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

// This file intentionally keeps Leaflet usage local to web-only component
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, L: any;
const isWeb = true;
if (isWeb) {
  const Leaflet = require('react-leaflet');
  const LeafletCore = require('leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  Marker = Leaflet.Marker;
  Popup = Leaflet.Popup;
  useMap = Leaflet.useMap;
  L = LeafletCore;
}

const getCategoryColorForMap = (category: string) => CATEGORY_COLORS[category] || '#666666';

export default function DiscoverMap({ region, events, onEventPress, onMarkerPress, onToggleList, highlightedTokiId, highlightedCoordinates }: Props) {
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
    
    useEffect(() => {
      mapInstanceRef.current = map;
    }, [map]);
    
    // Handle map centering when highlighted coordinates change
    useEffect(() => {
      if (highlightedTokiId && highlightedCoordinates && map) {
        map.setView(
          [highlightedCoordinates.latitude, highlightedCoordinates.longitude],
          16,
          { animate: true, duration: 0.5 }
        );
      }
    }, [highlightedTokiId, highlightedCoordinates, map]);
    
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
          center={highlightedTokiId && highlightedCoordinates 
            ? [highlightedCoordinates.latitude, highlightedCoordinates.longitude]
            : [region.latitude, region.longitude]}
          zoom={highlightedTokiId ? 16 : 13}
          style={{ width: '100%', height: '100%' }}
          key="map-container"
          zoomControl={false}
        >
          <MapController />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

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


