// Geocoding service for converting addresses to coordinates
// Using OpenStreetMap Nominatim API (free, no API key required)

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: number;
  placeType?: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    town?: string;
    municipality?: string;
    city?: string;
    state_district?: string;
    state?: string;
    country?: string;
    postcode?: string;
    country_code?: string;
  };
}

export interface GeocodingError {
  message: string;
  code?: string;
}

class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private userAgent = 'TokiApp/1.0'; // Required by Nominatim terms of service
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingRequests: Map<string, AbortController> = new Map();

  /**
   * Convert an address to coordinates with debouncing and multiple results
   * @param address - The address to geocode
   * @param debounceMs - Debounce delay in milliseconds (default: 1000ms)
   * @param requestId - Unique identifier for this request (optional)
   * @param maxResults - Maximum number of results to return (default: 5)
   * @returns Promise with array of latitude and longitude coordinates
   */
  async geocodeAddress(address: string, debounceMs: number = 1000, requestId?: string, maxResults: number = 5): Promise<GeocodingResult[]> {
    const id = requestId || address;
    
    try {
      if (!address || address.trim().length === 0) {
        throw new Error('Address cannot be empty');
      }

      // Clean and format the address
      const cleanAddress = address.trim();
      
      // Cancel any pending request for this ID
      this.cancelPendingRequest(id);
      
      // Cancel any existing debounce timer for this ID
      this.cancelDebounceTimer(id);
      
      // Create a new AbortController for this request
      const abortController = new AbortController();
      this.pendingRequests.set(id, abortController);
      
      // Return a promise that resolves after debounce delay
      return new Promise((resolve, reject) => {
        const timer = setTimeout(async () => {
          try {
            // Check if request was cancelled
            if (abortController.signal.aborted) {
              reject(new Error('Request was cancelled'));
              return;
            }
            
            const results = await this.makeGeocodingRequest(cleanAddress, abortController.signal, maxResults);
            
            // Check if request was cancelled during the API call
            if (abortController.signal.aborted) {
              reject(new Error('Request was cancelled'));
              return;
            }
            
            resolve(results);
            
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              reject(new Error('Request was cancelled'));
            } else {
              reject(error);
            }
          } finally {
            // Clean up
            this.pendingRequests.delete(id);
            this.debounceTimers.delete(id);
          }
        }, debounceMs);
        
        // Store the timer for potential cancellation
        this.debounceTimers.set(id, timer as any);
      });
      
    } catch (error) {
      console.error('❌ [GEOCODING] Geocoding error for:', address, error);
      throw {
        message: error instanceof Error ? error.message : 'Geocoding failed',
        code: 'GEOCODING_ERROR'
      } as GeocodingError;
    }
  }

  /**
   * Make the actual geocoding API request
   * @param address - The address to geocode
   * @param signal - AbortSignal for cancelling the request
   * @param maxResults - Maximum number of results to return
   * @returns Promise with array of geocoding results
   */
  private async makeGeocodingRequest(address: string, signal: AbortSignal, maxResults: number): Promise<GeocodingResult[]> {
    // Build the query URL
    const queryParams = new URLSearchParams({
      q: address,
      format: 'json',
      limit: maxResults.toString(),
      addressdetails: '1',
      extratags: '1',
      namedetails: '1'
    });

    const url = `${this.baseUrl}/search?${queryParams.toString()}`;

    // Make the request with proper headers and abort signal
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No results found for this address');
    }

    // Process all results
    const results: GeocodingResult[] = [];
    
    for (const result of data) {
      // Validate the result
      if (!result.lat || !result.lon) {
        continue; // Skip invalid results
      }

      // Calculate confidence based on result quality
      const confidence = this.calculateConfidence(result);

      const geocodingResult: GeocodingResult = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name || address,
        confidence,
        placeType: result.type || result.class,
        importance: result.importance,
        address: result.address || {}
      };

      results.push(geocodingResult);
    }


    return results;
  }

  /**
   * Cancel a pending geocoding request
   * @param requestId - The request ID to cancel
   */
  cancelRequest(requestId: string): void {
    const abortController = this.pendingRequests.get(requestId);
    if (abortController) {
      abortController.abort();
      this.pendingRequests.delete(requestId);
      console.log('🚫 [GEOCODING] Cancelled request for:', requestId);
    }
  }

  /**
   * Cancel a debounce timer
   * @param requestId - The request ID to cancel
   */
  private cancelDebounceTimer(requestId: string): void {
    const timer = this.debounceTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(requestId);
      console.log('⏱️ [GEOCODING] Cancelled debounce timer for:', requestId);
    }
  }

  /**
   * Cancel a pending request
   * @param requestId - The request ID to cancel
   */
  private cancelPendingRequest(requestId: string): void {
    const abortController = this.pendingRequests.get(requestId);
    if (abortController) {
      abortController.abort();
      this.pendingRequests.delete(requestId);
      console.log('🚫 [GEOCODING] Cancelled pending request for:', requestId);
    }
  }

  /**
   * Calculate confidence score for a geocoding result
   * @param result - The geocoding result from Nominatim
   * @returns Confidence score from 0 to 1
   */
  private calculateConfidence(result: any): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for results with more details
    if (result.address) {
      if (result.address.house_number) confidence += 0.2;
      if (result.address.street) confidence += 0.1;
      if (result.address.city) confidence += 0.1;
      if (result.address.country) confidence += 0.1;
    }

    // Higher confidence for results with better match quality
    if (result.importance) {
      confidence += Math.min(result.importance * 0.1, 0.3);
    }

    // Cap confidence at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Format address for concise display
   * @param result - The geocoding result
   * @returns Concise address string
   */
  formatConciseAddress(result: GeocodingResult): string {
    const parts = [];
    
    // Start with the most specific location
    if (result.address?.road) {
      parts.push(result.address.road);
    }
    
    // Add city/town (but not both)
    if (result.address?.town) {
      parts.push(result.address.town);
    } else if (result.address?.city) {
      parts.push(result.address.city);
    }
    
    // Add state/province
    if (result.address?.state) {
      parts.push(result.address.state);
    }
    
    // Add country
    if (result.address?.country) {
      parts.push(result.address.country);
    }
    
    // If we have very few parts, add suburb for context
    if (parts.length < 2 && result.address?.suburb) {
      parts.splice(1, 0, result.address.suburb);
    }
    
    return parts.length > 0 ? parts.join(', ') : result.displayName;
  }

  /**
   * Reverse geocode coordinates to address
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Promise with formatted address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const queryParams = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1'
      });

      const url = `${this.baseUrl}/reverse?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.display_name) {
        throw new Error('No address found for these coordinates');
      }

      return data.display_name;

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw {
        message: error instanceof Error ? error.message : 'Reverse geocoding failed',
        code: 'REVERSE_GEOCODING_ERROR'
      } as GeocodingError;
    }
  }

  /**
   * Check if geocoding service is available
   * @returns Promise<boolean> - True if service is accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Geocoding service availability check failed:', error);
      return false;
    }
  }

  /**
   * Clean up all pending requests and timers
   */
  cleanup(): void {
    // Cancel all pending requests
    this.pendingRequests.forEach((controller, id) => {
      controller.abort();
      console.log('🧹 [GEOCODING] Cleaned up request for:', id);
    });
    this.pendingRequests.clear();

    // Clear all timers
    this.debounceTimers.forEach((timer, id) => {
      clearTimeout(timer);
      console.log('🧹 [GEOCODING] Cleaned up timer for:', id);
    });
    this.debounceTimers.clear();
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
export default geocodingService;
