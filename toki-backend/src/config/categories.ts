// Canonical Toki categories - SINGLE SOURCE OF TRUTH
// This file should match utils/categories.ts in the frontend
// ⭐ ADD NEW CATEGORIES HERE - This is the only place you need to edit! ⭐

export interface CategoryDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  photoUrl: string;
}

// ⭐ ADD NEW CATEGORIES HERE ⭐
export const CATEGORY_CONFIG: Record<string, CategoryDefinition> = {
  sports: {
    id: 'sports',
    name: 'Sports',
    emoji: '🏃‍♂️',
    description: 'Physical activities and sports',
    color: '#4DC4AA',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380708/sports_bv1jns.png',
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    emoji: '☕',
    description: 'Coffee meetups and cafes',
    color: '#EC4899',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/coffee_kag3lc.png',
  },
  music: {
    id: 'music',
    name: 'Music',
    emoji: '🎵',
    description: 'Music events and jam sessions',
    color: '#7C3AED',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380704/music_ouscq8.png',
  },
  dinner: {
    id: 'dinner',
    name: 'Dinner',
    emoji: '🍝',
    description: 'Food and dining experiences',
    color: '#F59E0B',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/dinner_uoty7y.png',
  },
  work: {
    id: 'work',
    name: 'Work',
    emoji: '💼',
    description: 'Work-related activities and networking',
    color: '#10B981',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380709/work_f694g1.jpg',
  },
  culture: {
    id: 'culture',
    name: 'Culture',
    emoji: '🎨',
    description: 'Art and creative activities',
    color: '#F43F5E',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380701/culture_zymri0.png',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    emoji: '🌳',
    description: 'Outdoor and nature activities',
    color: '#34D399',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380712/nature_kdhbeo.png',
  },
  drinks: {
    id: 'drinks',
    name: 'Drinks',
    emoji: '🍸',
    description: 'Social drinking and nightlife',
    color: '#FBBF24',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380703/drink_byadmr.png',
  },
  party: {
    id: 'party',
    name: 'Party',
    emoji: '🎉',
    description: 'Social gatherings and hangouts',
    color: '#8B5CF6',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380706/party_lc0zsy.png',
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness',
    emoji: '🧘',
    description: 'Wellness, meditation, and health',
    color: '#6EE7B7',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380707/wellness_r38koo.png',
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    emoji: '🏠',
    description: 'Relaxed, casual activities',
    color: '#60A5FA',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380702/chill_rkntyv.png',
  },
  morning: {
    id: 'morning',
    name: 'Morning',
    emoji: '☀️',
    description: 'Morning-oriented activities',
    color: '#FCD34D',
    photoUrl: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1760380705/morning_fgj9p6.png',
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    emoji: '🛍️',
    description: 'Shopping trips and retail experiences',
    color: '#F97316',
    photoUrl: 'https://images.pexels.com/photos/9963294/pexels-photo-9963294.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
  },
  education: {
    id: 'education',
    name: 'Education',
    emoji: '📚',
    description: 'Learning and educational activities',
    color: '#3B82F6',
    photoUrl: 'https://images.pexels.com/photos/159775/library-la-trobe-study-students-159775.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
  },
  film: {
    id: 'film',
    name: 'Film',
    emoji: '🎬',
    description: 'Movies and cinema experiences',
    color: '#9333EA',
    photoUrl: 'https://images.pexels.com/photos/436413/pexels-photo-436413.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2',
  },
};

// For backend API - returns array format
export const getCategoriesForAPI = () => {
  return Object.values(CATEGORY_CONFIG).map(def => ({
    id: def.id,
    name: def.name,
    icon: def.emoji,
    description: def.description,
  }));
};

