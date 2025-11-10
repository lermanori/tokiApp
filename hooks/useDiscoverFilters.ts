import { useState, useMemo, useCallback } from 'react';
import { TokiEvent, DiscoverFilters } from '@/utils/discoverTypes';
import { filterEvents } from '@/utils/discoverHelpers';

const DEFAULT_FILTERS: DiscoverFilters = {
  visibility: 'all',
  category: 'all',
  distance: 'all',
  availability: 'all',
  participants: 'all',
  dateFrom: '',
  dateTo: '',
  radius: '10'
};

export const useDiscoverFilters = (
  events: TokiEvent[],
  userConnections: string[]
) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);

  const filteredEvents = useMemo(() => {
    return filterEvents(events, searchQuery, selectedCategory, selectedFilters, userConnections);
  }, [events, searchQuery, selectedCategory, selectedFilters, userConnections]);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters(DEFAULT_FILTERS);
    setSelectedCategory('all');
    setSearchQuery('');
  }, []);

  return {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedFilters,
    setSelectedFilters,
    filteredEvents,
    handleFilterChange,
    clearAllFilters,
  };
};

