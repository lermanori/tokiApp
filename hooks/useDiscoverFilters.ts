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
  radius: '500'
};

export const useDiscoverFilters = (
  events: TokiEvent[],
  userConnections: string[]
) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);

  const filteredEvents = useMemo(() => {
    return filterEvents(events, searchQuery, selectedCategories, selectedFilters, userConnections);
  }, [events, searchQuery, selectedCategories, selectedFilters, userConnections]);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setSelectedFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters(DEFAULT_FILTERS);
    setSelectedCategories(['all']);
    setSearchQuery('');
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
  };
};

