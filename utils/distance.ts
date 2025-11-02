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
