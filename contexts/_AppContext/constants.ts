// Auto-generated slice — do not edit manually.
// Source: contexts/AppContext.tsx lines 206-257
// Phase-1 pure extraction: STORAGE_KEYS and storage helper.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './types';

export const STORAGE_KEYS = {
  TOKIS: 'toki_app_tokis',
  CURRENT_USER: 'toki_app_current_user',
  MESSAGES: 'toki_app_messages',
  LAST_SYNC: 'toki_app_last_sync',
};

// Local storage helpers
export const storage = {
  get: async (key: string) => {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  },
  set: async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to storage:', error);
    }
  },
  remove: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },
};

export const initialUser: User = {
  id: '1',
  name: 'Maya Cohen',
  bio: 'Love exploring Tel Aviv\'s hidden gems ✨ Always up for coffee and good vibes',
  location: 'Tel Aviv, Israel',
  avatar: 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1770670984/wanderercreative-blank-profile-picture-973460_1920_smqcnp.jpg',
  verified: true,
  socialLinks: {
    instagram: '@maya_tlv',
    linkedin: 'maya-cohen-tlv',
  },
  memberSince: 'March 2023',
  tokisCreated: 0,
  tokisJoined: 0,
  connections: 4,
  rating: 4.8,
};

