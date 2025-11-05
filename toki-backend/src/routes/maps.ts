import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// Simple in-memory cache (key -> { data, expiresAt })
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function fallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildShortLabel(components: any, formattedAddress: string): string {
  const byType = (type: string) => components?.find((c: any) => (c.types || []).includes(type))?.long_name;

  const neighborhood = byType('sublocality') || byType('neighborhood');
  const city = byType('locality') || byType('postal_town') || byType('administrative_area_level_2');
  const route = byType('route');
  const name = byType('point_of_interest') || byType('establishment');

  if (neighborhood && city) return `${neighborhood}, ${city}`;
  if (name && city) return `${name}, ${city}`;
  if (route && city) return `${route}, ${city}`;
  // Fallback to first 2 parts of formatted address
  const parts = formattedAddress?.split(',').map((p: string) => p.trim()) || [];
  return parts.slice(0, 2).join(', ') || formattedAddress;
}

router.get('/places', async (req: Request, res: Response) => {
  try {
    const { input, lat, lng, sessiontoken } = req.query as { input?: string; lat?: string; lng?: string; sessiontoken?: string };

    if (!input || input.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'input must be at least 2 characters' });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: 'GOOGLE_MAPS_API_KEY is not configured' });

    const cacheKey = `places:${input}:${lat || ''}:${lng || ''}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const params = new URLSearchParams({
      input: input.trim(),
      key,
      //   types: 'geocode',
      language: 'en',
      sessiontoken: sessiontoken || (typeof (global as any).crypto?.randomUUID === 'function' ? (global as any).crypto.randomUUID() : fallbackUUID()),
    });

    if (lat && lng) {
      params.append('location', `${lat},${lng}`);
      params.append('radius', '50000'); // 50km bias
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      logger.error('Places Autocomplete error:', data);
      return res.status(502).json({ success: false, message: 'Places Autocomplete failed', status: data.status });
    }

    const predictions = (data.predictions || []).slice(0, 5).map((p: any) => ({
      description: p.description,
      place_id: p.place_id,
      types: p.types || [],
      structured: {
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      },
    }));

    const payload = { predictions, sessionToken: params.get('sessiontoken') };
    setCache(cacheKey, payload);
    return res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('Places proxy error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/place-details', async (req: Request, res: Response) => {
  try {
    const { placeId, sessiontoken } = req.query as { placeId?: string; sessiontoken?: string };
    if (!placeId) return res.status(400).json({ success: false, message: 'placeId is required' });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: 'GOOGLE_MAPS_API_KEY is not configured' });

    const cacheKey = `details:${placeId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const params = new URLSearchParams({
      place_id: placeId,
      key,
      language: 'en',
      sessiontoken: sessiontoken || (typeof (global as any).crypto?.randomUUID === 'function' ? (global as any).crypto.randomUUID() : fallbackUUID()),
      fields: 'place_id,geometry,formatted_address,address_component,name'
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      logger.error('Place Details error:', data);
      return res.status(502).json({ success: false, message: 'Place Details failed', status: data.status });
    }

    const r = data.result;
    const components = r.address_components || [];
    const formatted_address = r.formatted_address;
    const shortLabel = buildShortLabel(components, formatted_address);
    const location = {
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
    };

    const payload = {
      placeId: r.place_id,
      formatted_address,
      shortLabel,
      location,
      components: components.map((c: any) => ({ long_name: c.long_name, short_name: c.short_name, types: c.types }))
    };

    setCache(cacheKey, payload);
    return res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('Place details proxy error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Forward geocode: address -> lat/lng (Google Geocoding)
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = req.query as { address?: string };
    if (!address || address.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'address must be at least 2 characters' });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: 'GOOGLE_MAPS_API_KEY is not configured' });

    const clean = address.trim();
    const cacheKey = `geocode:${clean}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const params = new URLSearchParams({
      address: clean,
      key,
      language: 'en'
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      logger.error('Geocode error:', data);
      return res.status(502).json({ success: false, message: 'Geocode failed', status: data.status });
    }

    const r = (data.results || [])[0];
    const components = r?.address_components || [];
    const formatted_address = r?.formatted_address || clean;
    const shortLabel = buildShortLabel(components, formatted_address);
    const location = {
      lat: r?.geometry?.location?.lat,
      lng: r?.geometry?.location?.lng,
    };

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(404).json({ success: false, message: 'No coordinates found' });
    }

    const payload = {
      formatted_address,
      shortLabel,
      location,
      components: components.map((c: any) => ({ long_name: c.long_name, short_name: c.short_name, types: c.types }))
    };

    setCache(cacheKey, payload);
    return res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('Geocode proxy error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reverse geocode lat/lng to a concise neighborhood/city label
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: 'GOOGLE_MAPS_API_KEY is not configured' });

    // const cacheKey = `rev:${lat},${lng}`;
    // const cached = getFromCache(cacheKey);
    // if (cached) return res.json({ success: true, data: cached });

    const params = new URLSearchParams({ latlng: `${lat},${lng}`, key, language: 'en' });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK') {
      logger.error('Reverse geocode error:', data);
      return res.status(502).json({ success: false, message: 'Reverse geocode failed', status: data.status });
    }

    const result = (data.results || [])[0];
    const components = result?.address_components || [];
    const formatted = result?.formatted_address || `${lat},${lng}`;

    // Helper to fetch component by type
    const byType = (type: string) => components.find((c: any) => (c.types || []).includes(type))?.long_name;

    const neighborhood = byType('neighborhood') || byType('sublocality') || byType('sublocality_level_1') || byType('administrative_area_level_3');
    const city = byType('locality') || byType('postal_town') || byType('administrative_area_level_2');
    const region = byType('administrative_area_level_1');
    const country = byType('country');

    // Build an approximate, non-precise label (never includes house numbers or streets)
    let approximateLabel = '';
    if (neighborhood && city) approximateLabel = `${neighborhood}, ${city}`;
    else if (city && region) approximateLabel = `${city}, ${region}`;
    else if (city && country) approximateLabel = `${city}, ${country}`;
    else approximateLabel = neighborhood || city || region || country || 'Current area';

    const shortLabel = approximateLabel; // keep compatibility name

    // Filter components to exclude precise address parts
    const allowedTypes = new Set([
      'neighborhood', 'sublocality', 'sublocality_level_1', 'locality', 'postal_town',
      'administrative_area_level_3', 'administrative_area_level_2', 'administrative_area_level_1', 'country'
    ]);
    const coarseComponents = components
      .map((c: any) => ({ long_name: c.long_name, short_name: c.short_name, types: c.types }))
      .filter((c: any) => (c.types || []).some((t: string) => allowedTypes.has(t)));

    const payload = {
      shortLabel,           // approximate label safe for UI
      neighborhood: neighborhood || null,
      city: city || null,
      region: region || null,
      country: country || null,
      components: coarseComponents // only coarse-grained components
      // Note: formatted_address intentionally omitted to avoid exposing precise address
    };

    // setCache(cacheKey, payload);
    return res.json({ success: true, data: payload });
  } catch (error) {
    logger.error('Reverse geocode proxy error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;


