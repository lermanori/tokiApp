import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES } from '@/utils/categories';

type TimeFilter = 'all' | 'today' | 'this_weekend';

interface DiscoverCategoriesProps {
  categories: string[];
  selectedCategories: string[]; // includes 'all' when no specific selected
  onCategoryToggle: (next: string[]) => void;
  showMap: boolean;
  timeFilter?: TimeFilter;
  onTimeFilterChange?: (filter: TimeFilter) => void;
}

const TIME_PILLS: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: '📅 Today' },
  { id: 'this_weekend', label: '📅 This Weekend' },
];

export const DiscoverCategories: React.FC<DiscoverCategoriesProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  showMap,
  timeFilter = 'all',
  onTimeFilterChange,
}) => {
  const handlePress = (category: string) => {
    // Special behavior for 'all'
    if (category === 'all') {
      onCategoryToggle(['all']);
      return;
    }
    // Toggle category in list, removing 'all' if present
    const current = selectedCategories.includes('all')
      ? []
      : selectedCategories;
    const next = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    onCategoryToggle(next.length === 0 ? ['all'] : next);
  };

  const handleTimePillPress = (pillId: TimeFilter) => {
    if (!onTimeFilterChange) return;
    // Toggle: if already active, reset to 'all'; otherwise select it
    onTimeFilterChange(timeFilter === pillId ? 'all' : pillId);
  };

  const isActive = (category: string) => {
    return selectedCategories.includes(category) ||
      (category === 'all' && selectedCategories.includes('all'));
  };

  return (
    <View style={[styles.categoriesContainer, showMap && styles.categoriesContainerNoTopPadding]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {/* "All" pill */}
        <TouchableOpacity
          key="all"
          style={[
            styles.categoryButton,
            isActive('all') && styles.categoryButtonActive
          ]}
          onPress={() => handlePress('all')}
        >
          <Text style={[
            styles.categoryText,
            isActive('all') && styles.categoryTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {/* Time filter pills */}
        {TIME_PILLS.map((pill) => (
          <TouchableOpacity
            key={pill.id}
            style={[
              styles.categoryButton,
              styles.timePillButton,
              timeFilter === pill.id && styles.timePillButtonActive
            ]}
            onPress={() => handleTimePillPress(pill.id)}
          >
            <Text style={[
              styles.categoryText,
              styles.timePillText,
              timeFilter === pill.id && styles.timePillTextActive
            ]}>
              {pill.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Category pills (skip 'all' since it's already rendered) */}
        {categories.filter(c => c !== 'all').map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              isActive(category) && styles.categoryButtonActive
            ]}
            onPress={() => handlePress(category)}
          >
            <Text style={[
              styles.categoryText,
              isActive(category) && styles.categoryTextActive
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  categoriesContainerNoTopPadding: {
    paddingTop: 0,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  categoryButtonActive: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  timePillButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  timePillButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  timePillText: {
    color: '#C2410C',
  },
  timePillTextActive: {
    color: '#FFFFFF',
  },
});
