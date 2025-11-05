/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// Helper function to format distance display
// Accepts either a string like "1.6 km" or an object with {km, miles}
export const formatDistanceDisplay = (
  distance: string | { km: number; miles: number } | undefined
): string => {
  if (!distance) return '';

  if (typeof distance === 'string') {
    return distance;
  }

  if (distance.km < 1) {
    const meters = Math.round(distance.km * 1000);
    return `${meters}m`;
  } else if (distance.km < 10) {
    return `${distance.km.toFixed(1)}km`;
  } else {
    return `${Math.round(distance.km)}km`;
  }
};
