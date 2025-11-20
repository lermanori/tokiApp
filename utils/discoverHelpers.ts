import { TokiEvent, DiscoverFilters } from './discoverTypes';
import { getActivityPhoto } from './activityPhotos';

/**
 * Transform backend Toki data to TokiEvent format
 */
export const transformTokiToEvent = (toki: any): TokiEvent => {
  const hasValidImage = toki.image && toki.image.trim() !== '' && !toki.image.includes('activityPhotos');
  const imageUrl = hasValidImage ? toki.image : getActivityPhoto(toki.category);
  
  return {
    id: toki.id,
    title: toki.title,
    description: toki.description,
    location: toki.location,
    time: toki.time,
    scheduledTime: toki.scheduledTime,
    attendees: toki.attendees || 0,
    maxAttendees: toki.maxAttendees || 0,
    category: toki.category,
    distance: toki.distance,
    visibility: toki.visibility,
    host: {
      id: toki.host.id,
      name: toki.host.name,
      avatar: toki.host.avatar,
    },
    image: imageUrl,
    tags: toki.tags || [toki.category],
    coordinate: {
      latitude: toki.latitude || 32.0853,
      longitude: toki.longitude || 34.7818
    },
    isHostedByUser: toki.isHostedByUser || false,
    joinStatus: toki.joinStatus || 'not_joined',
    algorithmScore: typeof toki.algorithmScore === 'number' ? toki.algorithmScore : null,
  };
};

/**
 * Filter events based on search query, category, and filters
 */
export const filterEvents = (
  events: TokiEvent[],
  searchQuery: string,
  selectedCategories: string[], // includes 'all' when none chosen
  selectedFilters: DiscoverFilters,
  userConnections: string[]
): TokiEvent[] => {
  return events.filter(event => {
    const matchesSearch = searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const categoryAnySelected = !selectedCategories.length || selectedCategories.includes('all');
    // Check if any selected category matches any tag in the event's tags array
    const matchesMultiCategory = categoryAnySelected || 
      selectedCategories.some(selectedCat => event.tags.includes(selectedCat));

    // Category chips are the single source of truth; modal category is ignored
    const matchesCategory = matchesMultiCategory;

    const matchesVisibility = (() => {
      if (selectedFilters.visibility === 'all') return true;
      if (selectedFilters.visibility === 'hosted_by_me') return event.isHostedByUser === true;
      if (selectedFilters.visibility === 'connections') {
        const hostIsConnection = userConnections.includes(event.host.id);
        return hostIsConnection;
      }
      return event.visibility === selectedFilters.visibility;
    })();

    const matchesDistance = (() => {
      if (selectedFilters.distance === 'all') return true;
      const km = typeof event.distance === 'string' ? parseFloat(event.distance) : NaN;
      if (!Number.isFinite(km)) return false;
      const opt = selectedFilters.distance;
      if (opt === 'Under 1km') return km < 1;
      if (opt === '1-3km') return km >= 1 && km < 3;
      if (opt === '3-5km') return km >= 3 && km < 5;
      if (opt === '5km+') return km >= 5;
      return true;
    })();

    const matchesAvailability = selectedFilters.availability === 'all' ||
      (() => {
        const current = Number.isFinite(event.attendees) ? event.attendees : 0;
        const max = Number.isFinite(event.maxAttendees) ? event.maxAttendees : 0;
        if (!max || max <= 0) return true;
        const percent = (current / max) * 100;
        switch (selectedFilters.availability) {
          case 'spots available':
            return current < max;
          case 'almost full':
            return percent >= 80 && current < max;
          case 'waitlist':
            return current >= max;
          default:
            return true;
        }
      })();

    const matchesParticipants = selectedFilters.participants === 'all' ||
      (() => {
        const attendees = event.attendees || 0;
        switch (selectedFilters.participants) {
          case '1-10': return attendees >= 1 && attendees <= 10;
          case '10-50': return attendees >= 10 && attendees <= 50;
          case '50-100': return attendees >= 50 && attendees <= 100;
          case '100+': return attendees >= 100;
          default: return true;
        }
      })();

    const matchesTime = (() => {
      const df = selectedFilters.dateFrom;
      const dt = selectedFilters.dateTo;
      if (!df && !dt) return true;
      const scheduled = event.scheduledTime ? new Date(event.scheduledTime).getTime() : NaN;
      if (!Number.isFinite(scheduled)) return false;
      if (df && scheduled < new Date(df).getTime()) return false;
      if (dt && scheduled > new Date(dt).getTime()) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesVisibility && matchesDistance && matchesAvailability && matchesParticipants && matchesTime;
  });
};

/**
 * Get join status text for an event
 */
export const getJoinStatusText = (event: TokiEvent): string => {
  if (event.isHostedByUser) return 'Hosting';

  switch (event.joinStatus) {
    case 'not_joined': return 'I want to join';
    case 'pending': return 'Request pending';
    case 'approved': return 'Approved - Join chat';
    case 'joined': return 'You\'re in!';
    default: return 'I want to join';
  }
};

/**
 * Get join status color for an event
 */
export const getJoinStatusColor = (event: TokiEvent): string => {
  if (event.isHostedByUser) return '#B49AFF';

  switch (event.joinStatus) {
    case 'not_joined': return '#4DC4AA';
    case 'pending': return '#F9E79B';
    case 'approved': return '#A7F3D0';
    case 'joined': return '#EC4899';
    default: return '#4DC4AA';
  }
};

