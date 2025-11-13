import React, { useEffect } from 'react';
import { router } from 'expo-router';

// Redirect to exMap since it's now the main explore screen
export default function ExploreScreen() {
  useEffect(() => {
    router.replace('/(tabs)/exMap');
  }, []);
  
  return null;
}
