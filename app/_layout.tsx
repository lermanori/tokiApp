import '@/utils/logger';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';
import RedirectionGuard from '@/components/RedirectionGuard';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { state, actions } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { returnTo, code, ...otherParams } = searchParams;
  
  // Parse URL parameters directly for cases where useLocalSearchParams doesn't work
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {};
    // Check if window.location exists and has href (web only)
    if (typeof window.location === 'undefined' || !window.location.href) return {};
    try {
      const url = new URL(window.location.href);
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch (error) {
      // If URL parsing fails (React Native), return empty object
      return {};
    }
  };
  
  const urlParams = getUrlParams();
  const effectiveReturnTo = returnTo || urlParams.returnTo;
  const effectiveCode = code || urlParams.code;
  const effectiveOtherParams = Object.keys(otherParams).length > 0 ? otherParams : 
    Object.fromEntries(Object.entries(urlParams).filter(([key]) => key !== 'returnTo' && key !== 'code'));
  const [isReady, setIsReady] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasCheckedFastRedirect, setHasCheckedFastRedirect] = useState(false);

  // Fast redirect check - runs immediately on mount
  useEffect(() => {
    if (hasCheckedFastRedirect || !effectiveReturnTo || segments[0] !== 'login') {
      return;
    }

    // Check if user has valid tokens immediately
    const hasValidTokens = apiService.accessToken && apiService.refreshToken;
    if (hasValidTokens) {
      console.log('⚡ [FAST REDIRECT] Valid tokens found, redirecting immediately to:', effectiveReturnTo);
      setHasCheckedFastRedirect(true);
      
      // Build the redirect URL with parameters
      let redirectUrl = effectiveReturnTo;
      if (Object.keys(effectiveOtherParams).length > 0) {
        const searchParams = new URLSearchParams(effectiveOtherParams);
        redirectUrl += `?${searchParams.toString()}`;
      }
      
      router.replace(redirectUrl as any);
      return;
    }
  }, [effectiveReturnTo, effectiveOtherParams, segments, router, hasCheckedFastRedirect]);

  useEffect(() => {
    // Check if user is authenticated with debouncing
    const checkAuth = async () => {
      // Ensure routing has recognized the initial path (especially for deep links like /join/:code)
      const path = typeof window !== 'undefined' && window.location?.pathname 
        ? window.location.pathname 
        : '';
      const pathIsJoin = path.startsWith('/join');
      const pathIsLogin = path.startsWith('/login');

      // Prevent multiple simultaneous auth checks
      if (isCheckingAuth) {
        return;
      }
      
      // Debounce auth checks - only run once every 5 seconds
      const now = Date.now();
      if (now - lastAuthCheck < 5000) {
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
        const hasUserData = state.currentUser && state.currentUser.id;
        const inLoginScreen = segments[0] === 'login';
        // Treat the URL path as join during the very first render before segments are populated
        const inJoinScreen = segments[0] === 'join' || pathIsJoin;
        const inHealthScreen = segments[0] === 'health';
        const inWaitlistScreen = segments[0] === 'waitlist' || path.startsWith('/waitlist');
        
        if (!isAuthenticated && !inLoginScreen && !inJoinScreen && !inHealthScreen && !inWaitlistScreen) {
          // Redirect unauthenticated users to login; allow waitlist, join and health
          router.replace('/login');
        } else if (isAuthenticated && inLoginScreen) {
          // Redirect to main app if authenticated
          // Respect returnTo params (e.g., invite flow)
          if (effectiveReturnTo === 'join' && typeof effectiveCode === 'string' && effectiveCode.length > 0) {
            router.replace(`/join/${effectiveCode}`);
          } else if (effectiveReturnTo && effectiveReturnTo !== 'join') {
            // Handle other returnTo paths by setting redirection and going to main app
            const cleanParams = Object.fromEntries(
              Object.entries(effectiveOtherParams)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
            );
            const returnToPath = Array.isArray(effectiveReturnTo) ? effectiveReturnTo[0] : effectiveReturnTo;
            actions.setRedirection(returnToPath, cleanParams);
            router.replace('/(tabs)');
          } else {
            router.replace('/(tabs)');
          }
        } else if (isAuthenticated && inJoinScreen) {
          // If user is already on join page and authenticated, don't redirect
          // This prevents redirect loops with invalid invite codes
        } else if (isAuthenticated && state.redirection.isRedirecting && state.redirection.returnTo) {
          // Handle pending redirection after login
          const { returnTo, returnParams } = state.redirection;
          
          // Build the redirect URL with parameters
          let redirectUrl = returnTo;
          if (returnParams && Object.keys(returnParams).length > 0) {
            const searchParams = new URLSearchParams(returnParams);
            redirectUrl += `?${searchParams.toString()}`;
          }
          
          router.replace(redirectUrl as any);
        } else if (isAuthenticated && effectiveReturnTo && !inJoinScreen) {
          // Handle direct redirection for authenticated users (even if on login screen)
          const cleanParams = Object.fromEntries(
            Object.entries(effectiveOtherParams)
              .filter(([_, value]) => value !== undefined)
              .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
          );
          
          // Build the redirect URL with parameters
          let redirectUrl = effectiveReturnTo;
          if (Object.keys(cleanParams).length > 0) {
            const searchParams = new URLSearchParams(cleanParams);
            redirectUrl += `?${searchParams.toString()}`;
          }
          
          router.replace(redirectUrl as any);
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

  // Handle redirection when user data becomes available
  useEffect(() => {
    const handleUserDataRedirection = async () => {
      // Only run if we have user data and we're on login screen with returnTo
      if (!state.currentUser?.id || segments[0] !== 'login') {
        return;
      }

      // Parse URL parameters directly for cases where useLocalSearchParams doesn't work
      const getUrlParams = () => {
        if (typeof window === 'undefined') return {};
        if (typeof window.location === 'undefined' || !window.location.href) return {};
        try {
          const url = new URL(window.location.href);
          const params: Record<string, string> = {};
          url.searchParams.forEach((value, key) => {
            params[key] = value;
          });
          return params;
        } catch (error) {
          // If URL parsing fails (React Native), return empty object
          return {};
        }
      };
      const urlParams = getUrlParams();
      const effectiveReturnTo = urlParams.returnTo;
      const effectiveOtherParams = Object.fromEntries(
        Object.entries(urlParams).filter(([key]) => key !== 'returnTo' && key !== 'code')
      );

      if (effectiveReturnTo && effectiveReturnTo !== 'join') {
        console.log('🔄 [USER DATA] User data loaded, redirecting to:', effectiveReturnTo);
        
        // Build the redirect URL with parameters
        let redirectUrl = effectiveReturnTo;
        if (Object.keys(effectiveOtherParams).length > 0) {
          const searchParams = new URLSearchParams(effectiveOtherParams);
          redirectUrl += `?${searchParams.toString()}`;
        }
        
        console.log('🔄 [USER DATA] Redirecting to:', redirectUrl);
        router.replace(redirectUrl as any);
      }
    };

    handleUserDataRedirection();
  }, [state.currentUser?.id, segments, router]);

  if (!isReady) {
    return null;
  }

  return (
    <RedirectionGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="waitlist" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="toki-details" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="my-tokis" options={{ headerShown: false }} />
        <Stack.Screen name="saved-tokis" options={{ headerShown: false }} />
        <Stack.Screen name="connections" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="join-test" options={{ headerShown: false }} />
        <Stack.Screen name="test-route" options={{ headerShown: false }} />
        <Stack.Screen name="health" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </RedirectionGuard>
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
      <StatusBar style="dark" />
    </AppProvider>
  );
}