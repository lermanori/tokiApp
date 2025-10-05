import '@/utils/logger';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
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
  const { returnTo, code } = useLocalSearchParams<{ returnTo?: string; code?: string }>();
  const [isReady, setIsReady] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    // Check if user is authenticated with debouncing
    const checkAuth = async () => {
      // Ensure routing has recognized the initial path (especially for deep links like /join/:code)
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const pathIsJoin = path.startsWith('/join');
      const pathIsLogin = path.startsWith('/login');

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
      
      // If we are navigating directly to a join link, do not block initial render
      // Let the join page fetch public invite info and handle login flow
      if (pathIsJoin) {
        console.log('🔗 Direct join link detected. Skipping initial auth check to avoid blocking navigation.');
        setLastAuthCheck(now);
        setIsReady(true);
        return;
      }

      // If on login with returnTo=join, also skip auth checks to avoid request storms
      if (pathIsLogin && returnTo === 'join') {
        console.log('🔐 On login with returnTo=join. Skipping auth check.');
        setLastAuthCheck(now);
        setIsReady(true);
        return;
      }

      try {
        setIsCheckingAuth(true);
        setLastAuthCheck(now);
        
        const isAuthenticated = await apiService.isAuthenticated();
        const inLoginScreen = segments[0] === 'login';
        // Treat the URL path as join during the very first render before segments are populated
        const inJoinScreen = segments[0] === 'join' || pathIsJoin;
        const inHealthScreen = segments[0] === 'health';
        const inWaitlistScreen = segments[0] === 'waitlist' || path.startsWith('/waitlist');
        
        console.log('🔐 Auth check - isAuthenticated:', isAuthenticated, 'inLoginScreen:', inLoginScreen, 'inJoinScreen:', inJoinScreen, 'inHealthScreen:', inHealthScreen, 'currentUser.id:', state.currentUser.id);
        
        if (!isAuthenticated && !inLoginScreen && !inJoinScreen && !inHealthScreen && !inWaitlistScreen) {
          // Redirect unauthenticated users to login; allow waitlist, join and health
          console.log('🔄 Redirecting to login - not authenticated');
          router.replace('/login');
        } else if (isAuthenticated && inLoginScreen) {
          // Redirect to main app if authenticated
          // Respect returnTo params (e.g., invite flow)
          if (returnTo === 'join' && typeof code === 'string' && code.length > 0) {
            console.log('🔄 Redirecting to join page after login with code:', code);
            router.replace(`/join/${code}`);
          } else {
            console.log('🔄 Redirecting to main app - authenticated');
            router.replace('/(tabs)');
          }
        } else if (isAuthenticated && inJoinScreen) {
          // If user is already on join page and authenticated, don't redirect
          // This prevents redirect loops with invalid invite codes
          console.log('✅ User is authenticated and on join page - staying put');
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        // If there's an error, don't immediately redirect - this might be a network issue
        // Only redirect if we're not on the login, join, or health screen and have no current user
        if (segments[0] !== 'login' && segments[0] !== 'join' && segments[0] !== 'health' && segments[0] !== 'waitlist' && (!state.currentUser || !state.currentUser.id)) {
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
      <Stack.Screen name="waitlist" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-toki" options={{ headerShown: false }} />
      <Stack.Screen name="toki-details" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="my-tokis" options={{ headerShown: false }} />
      <Stack.Screen name="saved-tokis" options={{ headerShown: false }} />
      <Stack.Screen name="connections" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
      <Stack.Screen name="join-test" options={{ headerShown: false }} />
      <Stack.Screen name="test-route" options={{ headerShown: false }} />
      <Stack.Screen name="health" options={{ headerShown: false }} />
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