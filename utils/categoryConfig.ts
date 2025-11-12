// Category Configuration and Icon Registry - SINGLE SOURCE OF TRUTH
// ⭐ ADD NEW CATEGORIES HERE - Add both the config entry AND the icon require() ⭐

export interface CategoryDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  photoUrl: string;
  iconAsset: string; // Asset name for require() paths (without .png)
  iconWeb: string; // Web asset path
}

// Icon Asset Registry - Add require() calls here when adding new categories
const iconAssetRegistry: Record<string, any> = {
  sports: require('@/assets/emojis/sports.png'),
  coffee: require('@/assets/emojis/coffee.png'),
  music: require('@/assets/emojis/music.png'),
  food: require('@/assets/emojis/food.png'),
  work: require('@/assets/emojis/work.png'),
  art: require('@/assets/emojis/art.png'),
  nature: require('@/assets/emojis/nature.png'),
  drinks: require('@/assets/emojis/drinks.png'),
  celebration: require('@/assets/emojis/celebration.png'),
  wellness: require('@/assets/emojis/wellness.png'),
  home: require('@/assets/emojis/home.png'),
  beach: require('@/assets/emojis/beach.png'),
  shopping: require('@/assets/emojis/shopping.png'),
  Education: require('@/assets/emojis/Education.png'),
  Film: require('@/assets/emojis/Film.png'),
};

// ⭐ ADD NEW CATEGORIES HERE ⭐
// When adding a new category:
// 1. Add the category config below
// 2. Add the icon require() above in iconAssetRegistry
export const CATEGORY_CONFIG: Record<string, CategoryDefinition> = {
  sports: {
    id: 'sports',
    name: 'Sports',
    emoji: '🏃‍♂️',
    description: 'Physical activities and sports',
    color: '#4DC4AA',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380708/sports_bv1jns.png',
    iconAsset: 'sports',
    iconWeb: '/assets/emojis/sports.png',
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    emoji: '☕',
    description: 'Coffee meetups and cafes',
    color: '#EC4899',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/coffee_kag3lc.png',
    iconAsset: 'coffee',
    iconWeb: '/assets/emojis/coffee.png',
  },
  music: {
    id: 'music',
    name: 'Music',
    emoji: '🎵',
    description: 'Music events and jam sessions',
    color: '#7C3AED',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380704/music_ouscq8.png',
    iconAsset: 'music',
    iconWeb: '/assets/emojis/music.png',
  },
  dinner: {
    id: 'dinner',
    name: 'Dinner',
    emoji: '🍝',
    description: 'Food and dining experiences',
    color: '#F59E0B',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/dinner_uoty7y.png',
    iconAsset: 'food',
    iconWeb: '/assets/emojis/food.png',
  },
  work: {
    id: 'work',
    name: 'Work',
    emoji: '💼',
    description: 'Work-related activities and networking',
    color: '#10B981',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380709/work_f694g1.jpg',
    iconAsset: 'work',
    iconWeb: '/assets/emojis/work.png',
  },
  culture: {
    id: 'culture',
    name: 'Culture',
    emoji: '🎨',
    description: 'Art and creative activities',
    color: '#F43F5E',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380701/culture_zymri0.png',
    iconAsset: 'art',
    iconWeb: '/assets/emojis/art.png',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    emoji: '🌳',
    description: 'Outdoor and nature activities',
    color: '#34D399',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380712/nature_kdhbeo.png',
    iconAsset: 'nature',
    iconWeb: '/assets/emojis/nature.png',
  },
  drinks: {
    id: 'drinks',
    name: 'Drinks',
    emoji: '🍸',
    description: 'Social drinking and nightlife',
    color: '#FBBF24',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/drink_byadmr.png',
    iconAsset: 'drinks',
    iconWeb: '/assets/emojis/drinks.png',
  },
  party: {
    id: 'party',
    name: 'Party',
    emoji: '🎉',
    description: 'Social gatherings and hangouts',
    color: '#8B5CF6',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380706/party_lc0zsy.png',
    iconAsset: 'celebration',
    iconWeb: '/assets/emojis/celebration.png',
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness',
    emoji: '🧘',
    description: 'Wellness, meditation, and health',
    color: '#6EE7B7',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380707/wellness_r38koo.png',
    iconAsset: 'wellness',
    iconWeb: '/assets/emojis/wellness.png',
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    emoji: '🏠',
    description: 'Relaxed, casual activities',
    color: '#60A5FA',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/chill_rkntyv.png',
    iconAsset: 'home',
    iconWeb: '/assets/emojis/home.png',
  },
  morning: {
    id: 'morning',
    name: 'Morning',
    emoji: '☀️',
    description: 'Morning-oriented activities',
    color: '#FCD34D',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/morning_fgj9p6.png',
    iconAsset: 'beach', // temporary until sun icon is added
    iconWeb: '/assets/emojis/beach.png',
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    emoji: '🛍️',
    description: 'Shopping trips and retail experiences',
    color: '#F97316',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/shopping1_oeoj3v.png',
    iconAsset: 'shopping',
    iconWeb: '/assets/emojis/shopping.png',
  },
  education: {
    id: 'education',
    name: 'Education',
    emoji: '📚',
    description: 'Learning and educational activities',
    color: '#3B82F6',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/education_1_gbyyol.png',
    iconAsset: 'Education',
    iconWeb: '/assets/emojis/Education.png',
  },
  film: {
    id: 'film',
    name: 'Film',
    emoji: '🎬',
    description: 'Movies and cinema experiences',
    color: '#9333EA',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/education_1_gbyyol.png',
    iconAsset: 'Film',
    iconWeb: '/assets/emojis/Film.png',
  },
};

// Export icon asset registry getter
export const getIconAsset = (iconAssetName: string): any => {
  // Validate that icon asset exists
  if (__DEV__) {
    const requiredIconAssets = new Set(
      Object.values(CATEGORY_CONFIG).map(def => def.iconAsset)
    );
    
    if (!iconAssetRegistry[iconAssetName] && requiredIconAssets.has(iconAssetName)) {
      console.warn(
        `Missing icon asset "${iconAssetName}" in iconAssetRegistry. ` +
        `Add it to iconAssetRegistry in utils/categoryConfig.ts`
      );
    }
  }
  
  return iconAssetRegistry[iconAssetName] || iconAssetRegistry.work;
};




