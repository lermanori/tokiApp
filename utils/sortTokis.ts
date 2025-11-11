import { SortState } from '@/components/TokiSortModal';
import { TokiEvent } from '@/utils/discoverTypes';

function toMs(value: string | Date | undefined): number {
  if (!value) return 0;
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.getTime ? d.getTime() : 0;
}

function haversineKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseDistanceKm(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const n = parseFloat(input.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function sortEvents(
  list: TokiEvent[],
  sort: SortState,
  userLat?: number,
  userLng?: number
) {
  const copy = [...list];
  const dir = sort.sortOrder === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    switch (sort.sortBy) {
      case 'date': {
        // Prefer scheduledTime, then time, then any startDate
        const aMs = toMs((a as any).scheduledTime || (a as any).time || (a as any).startDate);
        const bMs = toMs((b as any).scheduledTime || (b as any).time || (b as any).startDate);
        return dir * (aMs - bMs);
      }
      case 'distance': {
        // If each item already includes a distance string/number, prefer that
        const aParsed = parseDistanceKm((a as any).distance ?? (a as any).distanceKm);
        const bParsed = parseDistanceKm((b as any).distance ?? (b as any).distanceKm);
        if (aParsed != null && bParsed != null) {
          return aParsed - bParsed;
        }
        // Otherwise fall back to geodesic distance from user/map location
        const aLat = (a as any).latitude ?? (a as any).coordinate?.latitude;
        const aLng = (a as any).longitude ?? (a as any).coordinate?.longitude;
        const bLat = (b as any).latitude ?? (b as any).coordinate?.latitude;
        const bLng = (b as any).longitude ?? (b as any).coordinate?.longitude;
        const da = haversineKm(userLat, userLng, aLat, aLng);
        const db = haversineKm(userLat, userLng, bLat, bLng);
        return da - db;
      }
      case 'popularity': {
        const ap = (a as any).participantCount ?? (a as any).attendees ?? 0;
        const bp = (b as any).participantCount ?? (b as any).attendees ?? 0;
        return bp - ap; // always most first
      }
      case 'created': {
        const ac = toMs((a as any).createdAt);
        const bc = toMs((b as any).createdAt);
        return bc - ac; // newest first
      }
      case 'title': {
        const at = (a as any).title || '';
        const bt = (b as any).title || '';
        return at.localeCompare(bt);
      }
      case 'relevance':
      default:
        return 0;
    }
  });

  return copy;
}


