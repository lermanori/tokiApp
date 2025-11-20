export interface TokiEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  scheduledTime?: string;
  attendees: number;
  maxAttendees: number | null;
  autoApprove?: boolean;
  category: string;
  distance: string;
  visibility?: 'public' | 'connections' | 'friends';
  host: {
    id: string;
    name: string;
    avatar: string;
  };
  image: string;
  tags: string[];
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined';
  algorithmScore?: number | null;
  createdAt?: string;
}

export interface DiscoverFilters {
  visibility: string;
  category: string;
  distance: string;
  availability: string;
  participants: string;
  dateFrom: string;
  dateTo: string;
  radius: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

