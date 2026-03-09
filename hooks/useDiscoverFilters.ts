import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TokiEvent, DiscoverFilters } from '@/utils/discoverTypes';
import { filterEvents } from '@/utils/discoverHelpers';
import { apiService } from '@/services/api';

const DEFAULT_FILTERS: DiscoverFilters = {
  visibility: 'all',
  category: 'all',
  distance: 'all',
  availability: 'all',
  participants: 'all',
  dateFrom: '',
  dateTo: '',
  radius: '500',
  isPaid: 'all'
};

export interface SearchUser {
  id: string;
  name: string;
  bio?: string;
  location?: string;
  avatar?: string;
  verified: boolean;
  rating: number | string;
  memberSince?: string;
  connectionsCount?: number;
  tokisCreated?: number;
  isConnected?: boolean;
}

export const useDiscoverFilters = (
  events: TokiEvent[],
  userConnections: string[]
) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_weekend'>('all');

  // User search state
  const [userSearchResults, setUserSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced user search when query changes
  useEffect(() => {
    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    // Clear results if query is too short
    if (!searchQuery || searchQuery.trim().length < 2) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const response = await apiService.searchUsers({ q: searchQuery.trim(), limit: 5 });
        setUserSearchResults((response.users || []) as SearchUser[]);
      } catch (error) {
        console.error('❌ [DISCOVER] User search error:', error);
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const filteredEvents = useMemo(() => {
    return filterEvents(events, searchQuery, selectedCategories, selectedFilters, userConnections, timeFilter);
  }, [events, searchQuery, selectedCategories, selectedFilters, userConnections, timeFilter]);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters(DEFAULT_FILTERS);
    setSelectedCategories(['all']);
    setSearchQuery('');
    setUserSearchResults([]);
    setTimeFilter('all');
  }, []);

  return {
    selectedCategories,
    setSelectedCategories,
    searchQuery,
    setSearchQuery,
    selectedFilters,
    setSelectedFilters,
    filteredEvents,
    handleFilterChange,
    clearAllFilters,
    userSearchResults,
    isSearchingUsers,
    timeFilter,
    setTimeFilter,
  };
};

