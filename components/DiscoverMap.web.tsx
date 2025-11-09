import React, { useEffect, useMemo } from 'react';
import { CATEGORY_COLORS } from '@/utils/categories';
// Web icon URLs resolved by bundler
// Importing ensures correct hashed paths in Expo Web
import sportsIcon from '@/assets/emojis/sports.png';
import coffeeIcon from '@/assets/emojis/coffee.png';
import musicIcon from '@/assets/emojis/music.png';
import foodIcon from '@/assets/emojis/food.png';
import workIcon from '@/assets/emojis/work.png';
import artIcon from '@/assets/emojis/art.png';
import natureIcon from '@/assets/emojis/nature.png';
import drinksIcon from '@/assets/emojis/drinks.png';
import socialIcon from '@/assets/emojis/celebration.png';
import wellnessIcon from '@/assets/emojis/wellness.png';
import cultureIcon from '@/assets/emojis/home.png';
import morningIcon from '@/assets/emojis/beach.png';
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
}

// This file intentionally keeps Leaflet usage local to web-only component
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;
const isWeb = true;
if (isWeb) {
  const Leaflet = require('react-leaflet');
  const LeafletCore = require('leaflet');
  MapContainer = Leaflet.MapContainer;
  TileLayer = Leaflet.TileLayer;
  Marker = Leaflet.Marker;
  Popup = Leaflet.Popup;
  L = LeafletCore;
}

const getCategoryColorForMap = (category: string) => CATEGORY_COLORS[category] || '#666666';

export default function DiscoverMap({ region, events, onEventPress, onMarkerPress, onToggleList }: Props) {
  const toUrl = (icon: any): string => {
    if (!icon) return '';
    if (typeof icon === 'string') return icon;
    if (typeof icon.uri === 'string') return icon.uri; // Expo web assets export shape
    if (typeof icon.src === 'string') return icon.src;
    if (typeof icon.default === 'string') return icon.default;
    return '';
  };

  const ICON_WEB: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {
      sports: toUrl(sportsIcon),
      coffee: toUrl(coffeeIcon),
      music: toUrl(musicIcon),
      food: toUrl(foodIcon),
      work: toUrl(workIcon),
      art: toUrl(artIcon),
      nature: toUrl(natureIcon),
      drinks: toUrl(drinksIcon),
      social: toUrl(socialIcon),
      wellness: toUrl(wellnessIcon),
      culture: toUrl(cultureIcon),
      morning: toUrl(morningIcon),
    };
    try { console.log('[DiscoverMap.web] ICON_WEB', map); } catch {}
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
    <View style={{ position: 'relative', backgroundColor: '#FFFFFF' }}>
      <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 16, overflow: 'hidden' }}>
        <MapContainer
          center={[region.latitude, region.longitude]}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {clustered.map((group) => (
            Number.isFinite(group.lat) && Number.isFinite(group.lng) ? (
              <Marker
                key={group.key}
                position={[group.lat, group.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `
                    <div style="
                      background-color: #FFFFFF;
                      width: 32px; height: 32px; border-radius: 50%; border: 3px solid ${getCategoryColorForMap(group.items[0].category)};
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: visible; position: relative;">
                      <img src="${ICON_WEB[group.items[0].category] || ''}" style="width: 22px; height: 22px; object-fit: contain;" />
                      ${group.items.length > 1 ? `<div style="position:absolute; bottom:-6px; right:-6px; background:#111827; color:#fff; font-size:11px; border-radius:10px; padding:1px 5px; border:2px solid #fff;">${group.items.length}</div>` : ''}
                    </div>`,
                  iconSize: [32, 32], iconAnchor: [16, 16]
                })}
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

        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', fontSize: 18 }} onClick={onToggleList}>
            📋
          </button>
        </div>
      </div>
    </View>
  );
}


