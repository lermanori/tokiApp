// Activity type to Pexels photo mapping (curated)
export const getActivityPhoto = (category: string | null | undefined): string => {
  // Handle missing or null categories
  if (!category) {
    // Safe fallback: collaborative work vibe
    return 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
  }

  switch (category.toLowerCase()) {
    case 'sports':
      // Aerial street basketball at sunset
      return 'https://images.pexels.com/photos/30617879/pexels-photo-30617879.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'coffee':
      // Fresh latte art in a cozy cafe (2024)
      return 'https://images.pexels.com/photos/29621584/pexels-photo-29621584.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'music':
      // Concert crowd, hands up, great lights
      return 'https://images.pexels.com/photos/3727146/pexels-photo-3727146.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'food':
      // Clean, colorful flat-lay salad
      return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'work':
      // Team collaborating around a laptop (modern office)
      return 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'art':
      // Artist painting on canvas in sunlit studio (2025)
      return 'https://images.pexels.com/photos/31280515/pexels-photo-31280515.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'nature':
      // Alpine lake + mountains (clean landscape)
      return 'https://images.pexels.com/photos/5893625/pexels-photo-5893625.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'drinks':
      // Cheers with beer mugs (clear "social drinks" signal)
      return 'https://images.pexels.com/photos/27177210/pexels-photo-27177210.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'beach':
      // Beach activities and coastal views
      return 'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'sunset':
      // Golden hour and sunset photography
      return 'https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'jazz':
      // Intimate jazz and music venues
      return 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'networking':
      // Professional networking events
      return 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'wellness':
      // Health and wellness activities
      return 'https://images.pexels.com/photos/4056530/pexels-photo-4056530.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'yoga':
      // Yoga and meditation scenes
      return 'https://images.pexels.com/photos/4056530/pexels-photo-4056530.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'morning':
      // Morning and sunrise scenes
      return 'https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'walking':
      // Walking and outdoor activities
      return 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'culture':
      // Cultural and artistic activities
      return 'https://images.pexels.com/photos/1029243/pexels-photo-1029243.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    case 'social':
      // Social gatherings and events
      return 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
    default:
      // Safe fallback: collaborative work vibe
      return 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
  }
};
