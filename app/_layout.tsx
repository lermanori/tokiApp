import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { state } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    // Check if user is authenticated with debouncing
    const checkAuth = async () => {
      // Prevent multiple simultaneous auth checks
      if (isCheckingAuth) {
        console.log('🔐 Auth check already in progress, skipping...');
        return;
      }
      
      // Debounce auth checks - only run once every 5 seconds
      const now = Date.now();
      if (now - lastAuthCheck < 5000) {
        console.log('🔐 Auth check debounced (last check was', Math.round((now - lastAuthCheck) / 1000), 'seconds ago)');
        return;
      }
      
      try {
        setIsCheckingAuth(true);
        setLastAuthCheck(now);
        
        const isAuthenticated = await apiService.isAuthenticated();
        const inLoginScreen = segments[0] === 'login';
        
        console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'inLoginScreen:', inLoginScreen, 'currentUser.id:', state.currentUser.id);
        
        if (!isAuthenticated && !inLoginScreen) {
          // Redirect to login if not authenticated
          console.log('🔄 Redirecting to login - not authenticated');
          router.replace('/login');
        } else if (isAuthenticated && inLoginScreen) {
          // Redirect to main app if authenticated
          console.log('🔄 Redirecting to main app - authenticated');
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        // If there's an error, don't immediately redirect - this might be a network issue
        // Only redirect if we're not on the login screen and have no current user
        if (segments[0] !== 'login' && (!state.currentUser || !state.currentUser.id)) {
          console.log('🔄 Redirecting to login - auth error and no current user');
          router.replace('/login');
        }
      } finally {
        setIsCheckingAuth(false);
        setIsReady(true);
      }
    };
    
    checkAuth();
  }, [segments, state.currentUser.id]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-toki" options={{ headerShown: false }} />
      <Stack.Screen name="toki-details" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="my-tokis" options={{ headerShown: false }} />
      <Stack.Screen name="saved-tokis" options={{ headerShown: false }} />
      <Stack.Screen name="connections" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProvider>
      <RootLayoutNav />
      <StatusBar style="auto" />
    </AppProvider>
  );
}