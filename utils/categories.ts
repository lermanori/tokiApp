// Canonical Toki categories and shared icon/color config

export const CATEGORIES: string[] = [
  'sports',
  'coffee',
  'music',
  'dinner',
  'work',
  'culture',
  'nature',
  'drinks',
  'party',
  'wellness',
  'chill',
  'morning',
];

// Shared colors used by map markers and badges (can be adjusted later)
export const CATEGORY_COLORS: Record<string, string> = {
  sports: '#4DC4AA',
  coffee: '#EC4899',
  music: '#7C3AED',
  dinner: '#F59E0B',
  work: '#10B981',
  culture: '#F43F5E',
  nature: '#34D399',
  drinks: '#FBBF24',
  party: '#8B5CF6',
  wellness: '#6EE7B7',
  chill: '#60A5FA',
  morning: '#FCD34D',
};

// Placeholder for asset paths; to be populated when icons are added
export const CATEGORY_ICONS = {
  emoji: {
    sports: require('@/assets/emojis/sports.png'),
    coffee: require('@/assets/emojis/coffee.png'),
    music: require('@/assets/emojis/music.png'),
    dinner: require('@/assets/emojis/food.png'),
    work: require('@/assets/emojis/work.png'),
    culture: require('@/assets/emojis/art.png'),
    nature: require('@/assets/emojis/nature.png'),
    drinks: require('@/assets/emojis/drinks.png'),
    party: require('@/assets/emojis/celebration.png'),
    wellness: require('@/assets/emojis/wellness.png'),
    chill: require('@/assets/emojis/home.png'),
    morning: require('@/assets/emojis/beach.png'), // temporary until sun icon is added
  } as Record<string, any>,
  map: {
    sports: require('@/assets/emojis/sports.png'),
    coffee: require('@/assets/emojis/coffee.png'),
    music: require('@/assets/emojis/music.png'),
    dinner: require('@/assets/emojis/food.png'),
    work: require('@/assets/emojis/work.png'),
    culture: require('@/assets/emojis/art.png'),
    nature: require('@/assets/emojis/nature.png'),
    drinks: require('@/assets/emojis/drinks.png'),
    party: require('@/assets/emojis/celebration.png'),
    wellness: require('@/assets/emojis/wellness.png'),
    chill: require('@/assets/emojis/home.png'),
    morning: require('@/assets/emojis/beach.png'),
  } as Record<string, any>,
};

// Web-friendly icon URLs (served from /assets in Expo Web)
export const CATEGORY_ICON_WEB: Record<string, string> = {
  sports: '/assets/emojis/sports.png',
  coffee: '/assets/emojis/coffee.png',
  music: '/assets/emojis/music.png',
  dinner: '/assets/emojis/food.png',
  work: '/assets/emojis/work.png',
  culture: '/assets/emojis/art.png',
  nature: '/assets/emojis/nature.png',
  drinks: '/assets/emojis/drinks.png',
  party: '/assets/emojis/celebration.png',
  wellness: '/assets/emojis/wellness.png',
  chill: '/assets/emojis/home.png',
  morning: '/assets/emojis/beach.png',
};


