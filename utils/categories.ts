// Category utilities and helper functions
// Category definitions are in utils/categoryConfig.ts

import { CATEGORY_CONFIG, CategoryDefinition, getIconAsset } from './categoryConfig';

// Re-export CategoryDefinition for convenience
export type { CategoryDefinition };

// Helper function to get category definition
export const getCategoryDefinition = (category: string | null | undefined): CategoryDefinition | null => {
  if (!category) return null;
  return CATEGORY_CONFIG[category.toLowerCase()] || null;
};

// Helper functions - use these instead of switch statements
export const getCategoryEmoji = (category: string | null | undefined): string => {
  const def = getCategoryDefinition(category);
  return def?.emoji || '🎉';
};

export const getCategoryLabel = (category: string | null | undefined): string => {
  const def = getCategoryDefinition(category);
  return def?.name || 'Activity';
};

export const getCategoryColor = (category: string | null | undefined): string => {
  const def = getCategoryDefinition(category);
  return def?.color || '#666666';
};

export const getCategoryPhoto = (category: string | null | undefined): string => {
  const def = getCategoryDefinition(category);
  if (def) return def.photoUrl;
  // Safe fallback
  return 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=2';
};

export const getCategoryDescription = (category: string | null | undefined): string => {
  const def = getCategoryDefinition(category);
  return def?.description || 'Activity';
};

// For backend API - returns array format
export const getCategoriesForAPI = () => {
  return Object.values(CATEGORY_CONFIG).map(def => ({
    id: def.id,
    name: def.name,
    icon: def.emoji,
    description: def.description,
  }));
};

// Derived exports for backward compatibility
export const CATEGORIES: string[] = Object.keys(CATEGORY_CONFIG);

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([key, def]) => [key, def.color])
);

// Icon mappings automatically generated from CATEGORY_CONFIG
export const CATEGORY_ICONS = {
  emoji: Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([key, def]) => [
      key,
      getIconAsset(def.iconAsset),
    ])
  ) as Record<string, any>,
  map: Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([key, def]) => [
      key,
      getIconAsset(def.iconAsset),
    ])
  ) as Record<string, any>,
};

export const CATEGORY_ICON_WEB: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([key, def]) => [key, def.iconWeb])
);

// Default icon for categories without specific icons
export const DEFAULT_CATEGORY_ICON = require('@/assets/emojis/work.png');
