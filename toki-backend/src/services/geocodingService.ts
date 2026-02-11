import logger from '../utils/logger';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocoding service using Google Maps Geocoding API
 * Converts location strings to coordinates
 */
class GeocodingService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Check if geocoding is available (API key is configured)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Geocode a location string to coordinates using Google Maps API
   * @param location - The location string to geocode
   * @returns Promise with geocoding result or null if geocoding fails
   */
  async geocode(location: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      logger.warn('Geocoding unavailable: GOOGLE_MAPS_API_KEY not configured');
      return null;
    }

    if (!location || location.trim().length < 2) {
      logger.warn('Geocoding skipped: location string too short');
      return null;
    }

    try {
      const params = new URLSearchParams({
        address: location.trim(),
        key: this.apiKey,
        language: 'en'
      });

      const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK') {
        logger.warn(`Geocoding failed for "${location}": ${data.status}`, {
          status: data.status,
          error_message: data.error_message
        });
        return null;
      }

      const result = data.results?.[0];
      if (!result?.geometry?.location) {
        logger.warn(`No coordinates found for "${location}"`);
        return null;
      }

      const geocodeResult: GeocodeResult = {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address || location
      };

      logger.info(`Geocoded "${location}" to (${geocodeResult.latitude}, ${geocodeResult.longitude})`);
      return geocodeResult;

    } catch (error) {
      logger.error(`Geocoding error for "${location}":`, error);
      return null;
    }
  }

  /**
   * Geocode multiple locations in batch
   * @param locations - Array of location strings
   * @returns Promise with array of geocode results (null for failed geocoding)
   */
  async geocodeBatch(locations: string[]): Promise<(GeocodeResult | null)[]> {
    if (!this.isAvailable()) {
      return locations.map(() => null);
    }

    // Process geocoding requests sequentially to avoid rate limits
    const results: (GeocodeResult | null)[] = [];

    for (const location of locations) {
      const result = await this.geocode(location);
      results.push(result);

      // Small delay to avoid hitting rate limits (max 50 requests/second)
      if (results.length < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
export default geocodingService;
