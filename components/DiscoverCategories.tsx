import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CATEGORIES } from '@/utils/categories';

interface DiscoverCategoriesProps {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  showMap: boolean;
}

export const DiscoverCategories: React.FC<DiscoverCategoriesProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  showMap,
}) => {
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
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => onCategorySelect(category)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.categoryTextActive
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

