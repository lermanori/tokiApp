// Module-level data and types extracted from app/toki-details.tsx
// Phase-1 split: pure declarations, no closure coupling.

// Constants
export const MAX_PARTICIPANTS_DISPLAY = 2; // Maximum number of participants to show before "View more" button

export interface TokiDetails {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  timeSlot?: string; // Add timeSlot for compatibility
  scheduledTime?: string; // Add scheduled time for smart display
  attendees: number;
  maxAttendees: number | null;
  autoApprove?: boolean;
  category: string; // Add category for activity photos
  tags: string[];
  host: {
    id: string;
    name: string;
    avatar: string;
    rating?: number;
    bio?: string;
  };
  hostId?: string; // Alternative way to store host ID
  image: string;
  distance?: string | { km: number; miles: number };
  visibility?: 'public' | 'private' | 'connections' | 'friends';
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'completed';
  link?: string;
  latitude?: number;
  longitude?: number;
  participants?: Array<{
    id: string;
    name: string;
    avatar?: string;
    // isHost?: boolean; // not used
  }>;
  friendsAttending?: Array<{
    id: string;
    name: string;
    avatar?: string;
    isFriend?: boolean;
  }>;
  isPaid?: boolean;
  isBoosted?: boolean;
  boostId?: string | null;
}

// Fallback data for different Tokis
export const tokiDetailsMap: { [key: string]: TokiDetails } = {
  '1': {
    id: '1',
    title: 'Sunset Beach Volleyball',
    description: 'Join us for a fun and casual beach volleyball game as the sun sets over the beautiful Tel Aviv coastline. Perfect for all skill levels - whether you\'re a pro or just want to have fun! We\'ll play a few games, enjoy the sunset, and maybe grab drinks afterward.',
    location: 'Gordon Beach, Tel Aviv',
    time: '6:30 PM - 8:30 PM',
    attendees: 8,
    maxAttendees: 12,
    category: 'sports',
    tags: ['sports', 'beach', 'sunset', 'volleyball'],
    host: {
      id: 'host-1',
      name: 'Maya Cohen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.8,
      bio: 'Beach volleyball enthusiast and sunset lover. Organizing fun games for 3+ years!',
    },
    image: '', // Use getActivityPhoto fallback
    distance: '0.3 km',
    isHostedByUser: true,
    joinStatus: 'approved',
  },
  '2': {
    id: '2',
    title: 'Morning Yoga in the Park',
    description: 'Start your day with peaceful yoga session in beautiful Yarkon Park. All levels welcome! Bring your own mat or rent one on-site. We\'ll focus on gentle stretches and mindfulness to set a positive tone for your day.',
    location: 'Yarkon Park, Tel Aviv',
    time: '7:00 AM - 8:30 AM',
    attendees: 12,
    maxAttendees: 20,
    category: 'wellness',
    tags: ['wellness', 'yoga', 'morning', 'mindfulness'],
    host: {
      id: 'host-2',
      name: 'Maya Cohen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.9,
      bio: 'Certified yoga instructor passionate about wellness and community building.',
    },
    image: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '1.5 km',
    isHostedByUser: true,
    joinStatus: 'approved',
  },
  '3': {
    id: '3',
    title: 'Rothschild Coffee & Work',
    description: 'Join fellow digital nomads and remote workers for a productive coworking session at one of Tel Aviv\'s most charming cafés. Bring your laptop, grab a great coffee, and enjoy the company of like-minded professionals. Perfect for networking and getting work done in a vibrant atmosphere.',
    location: 'Rothschild Boulevard, Tel Aviv',
    time: '2:00 PM - 6:00 PM',
    attendees: 5,
    maxAttendees: 8,
    category: 'coffee',
    tags: ['coffee', 'work', 'networking', 'coworking'],
    host: {
      id: 'host-3',
      name: 'Daniel Levy',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.6,
      bio: 'Tech entrepreneur and coffee enthusiast. Love connecting with fellow creatives and professionals.',
    },
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '0.8 km',
    isHostedByUser: false,
    joinStatus: 'approved',
  },
  '4': {
    id: '4',
    title: 'Jazz Night at Dizengoff',
    description: 'Experience the magic of live jazz in an intimate setting on Dizengoff Street. Tonight features a local trio playing classic standards and modern interpretations. Great drinks, amazing music, and wonderful company guaranteed. Perfect for jazz lovers and those looking to discover something new.',
    location: 'Dizengoff Street, Tel Aviv',
    time: '8:00 PM - 11:00 PM',
    attendees: 16,
    maxAttendees: 20,
    category: 'music',
    tags: ['music', 'jazz', 'drinks', 'nightlife'],
    host: {
      id: 'host-4',
      name: 'Yael Rosenberg',
      avatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.9,
      bio: 'Jazz aficionado and event organizer. Passionate about bringing people together through music.',
    },
    image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '1.2 km',
    isHostedByUser: false,
    joinStatus: 'not_joined',
  },
  '5': {
    id: '5',
    title: 'Tech Meetup & Networking',
    description: 'Join fellow tech enthusiasts for an evening of networking, knowledge sharing, and collaboration. Whether you\'re a developer, designer, product manager, or just interested in tech, this is the perfect opportunity to connect with like-minded professionals.',
    location: 'WeWork, Rothschild Boulevard',
    time: '7:00 PM - 9:00 PM',
    attendees: 7,
    maxAttendees: 15,
    category: 'work',
    tags: ['tech', 'networking', 'professional', 'collaboration'],
    host: {
      id: 'host-5',
      name: 'David Chen',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      rating: 4.7,
      bio: 'Senior software engineer and tech community organizer. Passionate about fostering meaningful connections in the tech world.',
    },
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
    distance: '0.9 km',
    isHostedByUser: false,
    joinStatus: 'not_joined',
  }
};
