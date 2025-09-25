import React, { useEffect } from 'react';
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

export default function DiscoverMap({ region, events, onEventPress, onMarkerPress, onToggleList }: Props) {
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
    <View style={{ position: 'relative', backgroundColor: '#FFFFFF', marginBottom: 8 }}>
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

          {events.map((event) => (
            event.coordinate?.latitude && event.coordinate?.longitude ? (
              <Marker
                key={event.id}
                position={[event.coordinate.latitude, event.coordinate.longitude]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `
                    <div style="
                      background-color: ${getCategoryColorForMap(event.category)};
                      width: 24px; height: 24px; border-radius: 50%; border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;
                      color: white; font-weight: bold; font-size: 12px; font-family: Inter, sans-serif;">
                      ${event.category.charAt(0).toUpperCase()}
                    </div>`,
                  iconSize: [24, 24], iconAnchor: [12, 12]
                })}
                eventHandlers={{ click: () => onMarkerPress(event) }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                    <strong>{event.title}</strong><br />
                    <span style={{ color: '#B49AFF' }}>{event.category}</span><br />
                    {event.location}<br />
                    <button style={{ background: '#B49AFF', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 6 }}
                      onClick={() => onEventPress(event)}>
                      View Details
                    </button>
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


