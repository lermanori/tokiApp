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
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380708/sports_bv1jns.png';
    case 'coffee':
      // Fresh latte art in a cozy cafe (2024)
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/coffee_kag3lc.png';
    case 'music':
      // Concert crowd, hands up, great lights
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380704/music_ouscq8.png';
    case 'dinner':
      // Clean, colorful flat-lay salad
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/dinner_uoty7y.png';
    case 'work':
      // Team collaborating around a laptop (modern office)
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380709/work_f694g1.jpg';
    case 'culture':
      // Artist painting on canvas in sunlit studio (2025)
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380701/culture_zymri0.png';
    case 'nature':
      // Alpine lake + mountains (clean landscape)
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380712/nature_kdhbeo.png';
    case 'drinks':
      // Cheers with beer mugs (clear "social drinks" signal)
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/drink_byadmr.png';
    case 'party':
      // Social gatherings and events
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380706/party_lc0zsy.png';
    case 'wellness':
      // Health and wellness activities
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380707/wellness_r38koo.png';
    case 'chill':
      // Relaxed, casual activities
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/chill_rkntyv.png';
    case 'morning':
      // Morning and sunrise scenes
      return 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/morning_fgj9p6.png';
    default:
      // Safe fallback: collaborative work vibe
      return 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
  }
};
