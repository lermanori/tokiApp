import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import dayjs from 'dayjs';
import { DiscoverFilters } from '@/utils/discoverTypes';
import { DEFAULT_FILTERS } from '@/hooks/useDiscoverFilters';
import { SortState, SortKey } from '@/components/TokiSortModal';

type ChippableKey = Exclude<keyof DiscoverFilters, 'dateFrom' | 'dateTo' | 'category'>;

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public',
  connections: 'Connections',
  hosted_by_me: 'Hosted by me',
};

const DISTANCE_LABELS: Record<string, string> = {
  'Under 1km': 'Under 1 km',
  '1-3km': '1–3 km',
  '3-5km': '3–5 km',
  '5km+': '5 km+',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  'spots available': 'Spots available',
  'almost full': 'Almost full',
  waitlist: 'Waitlist',
};

const PARTICIPANTS_LABELS: Record<string, string> = {
  '1-10': '1–10 people',
  '10-50': '10–50 people',
  '50-100': '50–100 people',
  '100+': '100+ people',
};

const PAID_LABELS: Record<string, string> = {
  free: 'Free events',
  paid: 'Paid events',
};

const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Relevance',
  date: 'Date (soonest)',
  distance: 'Distance (nearest)',
  popularity: 'Popularity',
  created: 'Newest',
  title: 'Title (A–Z)',
};

const labelFor = (key: ChippableKey, value: string): string | null => {
  switch (key) {
    case 'visibility':
      return VISIBILITY_LABELS[value] ?? null;
    case 'distance':
      return DISTANCE_LABELS[value] ?? null;
    case 'availability':
      return AVAILABILITY_LABELS[value] ?? null;
    case 'participants':
      return PARTICIPANTS_LABELS[value] ?? null;
    case 'isPaid':
      return PAID_LABELS[value] ?? null;
    case 'radius':
      return `Within ${value} km`;
    default:
      return null;
  }
};

interface Chip {
  id: string;
  label: string;
  onClear: () => void;
}

interface DiscoverActiveFiltersBarProps {
  filters: DiscoverFilters;
  sort: SortState;
  onClearFilter: (key: keyof DiscoverFilters) => void;
  onClearDateRange: () => void;
  onClearSort: () => void;
  onClearAll: () => void;
}

const formatDateChip = (from: string, to: string): string => {
  const fmt = (iso: string) => dayjs(iso).format('MMM D');
  if (!from && !to) return '';
  if (from && to) {
    const sameDay = dayjs(from).isSame(dayjs(to), 'day');
    return sameDay ? `Date: ${fmt(from)}` : `Date: ${fmt(from)} – ${fmt(to)}`;
  }
  return `Date: ${fmt(from || to)}`;
};

const DiscoverActiveFiltersBar: React.FC<DiscoverActiveFiltersBarProps> = ({
  filters,
  sort,
  onClearFilter,
  onClearDateRange,
  onClearSort,
  onClearAll,
}) => {
  const chips: Chip[] = [];

  (Object.keys(DEFAULT_FILTERS) as Array<keyof DiscoverFilters>).forEach((key) => {
    if (key === 'dateFrom' || key === 'dateTo' || key === 'category') return;
    const current = filters[key];
    if (current === DEFAULT_FILTERS[key]) return;
    const label = labelFor(key as ChippableKey, current);
    if (!label) return;
    chips.push({
      id: key,
      label,
      onClear: () => onClearFilter(key),
    });
  });

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      id: 'date',
      label: formatDateChip(filters.dateFrom, filters.dateTo),
      onClear: onClearDateRange,
    });
  }

  if (sort.sortBy !== 'relevance') {
    chips.push({
      id: 'sort',
      label: `Sort: ${SORT_LABELS[sort.sortBy]}`,
      onClear: onClearSort,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.chip}
            onPress={chip.onClear}
            accessibilityLabel={`Remove filter ${chip.label}`}
            testID={`active-filter-chip-${chip.id}`}
          >
            <Text style={styles.chipLabel}>{chip.label}</Text>
            <X size={14} color="#5B3FBF" />
          </TouchableOpacity>
        ))}
        {chips.length >= 2 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={onClearAll}
            testID="active-filter-clear-all"
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EBFF',
    borderColor: '#B49AFF',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#5B3FBF',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#5B3FBF',
    textDecorationLine: 'underline',
  },
});

export default DiscoverActiveFiltersBar;
