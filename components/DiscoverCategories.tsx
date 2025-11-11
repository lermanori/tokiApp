import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES } from '@/utils/categories';

interface DiscoverCategoriesProps {
  categories: string[];
  selectedCategories: string[]; // includes 'all' when no specific selected
  onCategoryToggle: (next: string[]) => void;
  showMap: boolean;
}

export const DiscoverCategories: React.FC<DiscoverCategoriesProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  showMap,
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
        {categories.map((category) => (
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
});

