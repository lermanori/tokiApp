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
      console.log('⚡ [FLOW DEBUG] [FAST REDIRECT] Valid tokens found, redirecting immediately to:', effectiveReturnTo);
      setHasCheckedFastRedirect(true);
      
      // Build the redirect URL with parameters
      // For toki-details, we need to preserve all URL parameters
      let redirectUrl = effectiveReturnTo;
      const paramsToInclude: Record<string, string> = {};
      
      // Include effectiveOtherParams, but filter out internal params like 'screen' and 'params'
      Object.entries(effectiveOtherParams).forEach(([key, value]) => {
        if (key !== 'screen' && key !== 'params' && value !== undefined && value !== null) {
          const stringValue = Array.isArray(value) ? value[0] : String(value);
          // Only include if it's a valid string (not '[object Object]')
          if (stringValue && stringValue !== '[object Object]') {
            paramsToInclude[key] = stringValue;
          }
        }
      });
      
      // Also check urlParams for any missing parameters (especially for toki-details)
      if (effectiveReturnTo === '/toki-details' || effectiveReturnTo?.includes('toki-details')) {
        Object.entries(urlParams).forEach(([key, value]) => {
          if (key !== 'returnTo' && key !== 'code' && key !== 'screen' && key !== 'params' && value && !paramsToInclude[key]) {
            paramsToInclude[key] = value;
          }
        });
      }
      
      if (Object.keys(paramsToInclude).length > 0) {
        const queryString = new URLSearchParams(paramsToInclude);
        redirectUrl += `?${queryString.toString()}`;
      }
      
      console.log('⚡ [FLOW DEBUG] [FAST REDIRECT] Full redirect URL with params:', redirectUrl);
      router.replace(redirectUrl as any);
      return;
    }
  }, [effectiveReturnTo, effectiveOtherParams, urlParams, segments, router, hasCheckedFastRedirect]);

  useEffect(() => {
    // Check if user is authenticated with debouncing
    const checkAuth = async () => {
      // Cross-platform path detection: use window.location for web, segments for native
      const getCurrentPath = () => {
        // Web: use window.location.pathname
        if (typeof window !== 'undefined' && window.location?.pathname) {
          return window.location.pathname;
        }
        // Native: build path from segments
        if (segments.length > 0) {
          return `/${segments.join('/')}`;
        }
        return '';
      };
      
      const path = getCurrentPath();
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
        
        // 🔍 LOG: Initial state when auth check runs
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] Starting auth check');
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] Current path:', path);
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] Segments:', segments);
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] effectiveReturnTo:', effectiveReturnTo);
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] urlParams:', urlParams);
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] effectiveOtherParams:', effectiveOtherParams);
        
        const isAuthenticated = await apiService.isAuthenticated();
        const hasUserData = state.currentUser && state.currentUser.id;
        const inLoginScreen = segments[0] === 'login';
        // Treat the URL path as join during the very first render before segments are populated
        const inJoinScreen = segments[0] === 'join' || pathIsJoin;
        const inHealthScreen = segments[0] === 'health';
        const inWaitlistScreen = segments[0] === 'waitlist' || path.startsWith('/waitlist');
        const inSetPasswordScreen = segments[0] === 'set-password' || path.startsWith('/set-password');
        const inResetPasswordScreen = segments[0] === 'reset-password' || path.startsWith('/reset-password');
        
        if (!isAuthenticated && !inLoginScreen && !inJoinScreen && !inHealthScreen && !inWaitlistScreen && !inSetPasswordScreen && !inResetPasswordScreen) {
          // Check if we're on toki-details page - preserve the tokiId parameter
          // Cross-platform: check both path (web) and segments (native)
          const isTokiDetailsPage = path.startsWith('/toki-details') || segments[0] === 'toki-details';
          
          if (isTokiDetailsPage) {
            // Extract all URL parameters including tokiId
            // Cross-platform: use searchParams (works on both web and native) with urlParams fallback (web only)
            const returnParams: Record<string, string> = {};
            
            // Get tokiId: priority is searchParams (works on both platforms), then urlParams (web only)
            const tokiId = (typeof searchParams.tokiId === 'string' ? searchParams.tokiId : Array.isArray(searchParams.tokiId) ? searchParams.tokiId[0] : undefined) || urlParams.tokiId;
            if (tokiId) returnParams.tokiId = tokiId;
            
            // Preserve other parameters if they exist (check searchParams first for cross-platform support)
            const title = (typeof searchParams.title === 'string' ? searchParams.title : Array.isArray(searchParams.title) ? searchParams.title[0] : undefined) || urlParams.title;
            const location = (typeof searchParams.location === 'string' ? searchParams.location : Array.isArray(searchParams.location) ? searchParams.location[0] : undefined) || urlParams.location;
            const time = (typeof searchParams.time === 'string' ? searchParams.time : Array.isArray(searchParams.time) ? searchParams.time[0] : undefined) || urlParams.time;
            
            if (title) returnParams.title = title;
            if (location) returnParams.location = location;
            if (time) returnParams.time = time;
            
            // Redirect to login with returnTo and parameters
            const loginUrl = `/login?returnTo=/toki-details${Object.keys(returnParams).length > 0 ? '&' + new URLSearchParams(returnParams).toString() : ''}`;
            console.log('🔗 [FLOW DEBUG] [DEEP LINK] Preserving toki-details parameters, redirecting to:', loginUrl);
            router.replace(loginUrl);
          } else {
            // For other pages, redirect to login normally
            router.replace('/login');
          }
        } else if (isAuthenticated && inLoginScreen) {
          // Redirect to main app if authenticated
          // Respect returnTo params (e.g., invite flow)
          if (effectiveReturnTo === 'join' && typeof effectiveCode === 'string' && effectiveCode.length > 0) {
            router.replace(`/join/${effectiveCode}`);
          } else if (effectiveReturnTo && effectiveReturnTo !== 'join') {
            // Handle other returnTo paths
            const cleanParams = Object.fromEntries(
              Object.entries(effectiveOtherParams)
                .filter(([key, value]) => {
                  // Filter out internal params and invalid values
                  if (key === 'screen' || key === 'params') return false;
                  if (value === undefined || value === null) return false;
                  const stringValue = Array.isArray(value) ? value[0] : String(value);
                  return stringValue && stringValue !== '[object Object]';
                })
                .map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value)])
            );
            const returnToPath = Array.isArray(effectiveReturnTo) ? effectiveReturnTo[0] : effectiveReturnTo;
            
            // For toki-details, also check searchParams and urlParams for any missing parameters (cross-platform)
            if (returnToPath === '/toki-details' || returnToPath?.includes('toki-details')) {
              // Check searchParams first (works on both platforms)
              ['tokiId', 'title', 'location', 'time'].forEach(key => {
                if (!cleanParams[key]) {
                  const value = typeof searchParams[key] === 'string' ? searchParams[key] : Array.isArray(searchParams[key]) ? searchParams[key][0] : undefined;
                  if (value) cleanParams[key] = value;
                }
              });
              // Also check urlParams for web (fallback)
              Object.entries(urlParams).forEach(([key, value]) => {
                if (key !== 'returnTo' && key !== 'code' && value && !cleanParams[key]) {
                  cleanParams[key] = value;
                }
              });
            }
            
            // If returnTo is toki-details, navigate directly instead of going through tabs
            if (returnToPath === '/toki-details' || returnToPath?.includes('toki-details')) {
              let redirectUrl = returnToPath;
              if (Object.keys(cleanParams).length > 0) {
                const queryString = new URLSearchParams(cleanParams);
                redirectUrl += `?${queryString.toString()}`;
              }
              console.log('✅ [FLOW DEBUG] [DIRECT NAVIGATE] Navigating directly to toki-details:', redirectUrl);
              router.replace(redirectUrl as any);
            } else {
              // For other paths, set redirection and go to tabs (let RedirectionGuard handle it)
              console.log('🔄 [FLOW DEBUG] [REDIRECT TO TABS] Setting redirection for non-toki-details path:', returnToPath);
              actions.setRedirection(returnToPath, cleanParams);
              router.replace('/(tabs)');
            }
          } else {
            console.log('🚨 [FLOW DEBUG] [REDIRECT TO TABS] Condition: authenticated && inLoginScreen && NO returnTo');
            console.log('🚨 [FLOW DEBUG] [REDIRECT TO TABS] Current path:', path);
            console.log('🚨 [FLOW DEBUG] [REDIRECT TO TABS] Segments:', segments);
            console.log('🚨 [FLOW DEBUG] [REDIRECT TO TABS] effectiveReturnTo:', effectiveReturnTo);
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
            const queryString = new URLSearchParams(returnParams);
            redirectUrl += `?${queryString.toString()}`;
          }
          
          router.replace(redirectUrl as any);
        } else if (isAuthenticated && effectiveReturnTo && !inJoinScreen) {
          // Handle direct redirection for authenticated users (even if on login screen)
          const cleanParams = Object.fromEntries(
            Object.entries(effectiveOtherParams)
              .filter(([key, value]) => {
                // Filter out internal params and invalid values
                if (key === 'screen' || key === 'params') return false;
                if (value === undefined || value === null) return false;
                const stringValue = Array.isArray(value) ? value[0] : String(value);
                return stringValue && stringValue !== '[object Object]';
              })
              .map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value)])
          );
          
          // For toki-details, also check searchParams and urlParams for any missing parameters (cross-platform)
          if (effectiveReturnTo === '/toki-details' || effectiveReturnTo?.includes('toki-details')) {
            // Check searchParams first (works on both platforms)
            ['tokiId', 'title', 'location', 'time'].forEach(key => {
              if (!cleanParams[key]) {
                const value = typeof searchParams[key] === 'string' ? searchParams[key] : Array.isArray(searchParams[key]) ? searchParams[key][0] : undefined;
                if (value) cleanParams[key] = value;
              }
            });
            // Also check urlParams for web (fallback)
            Object.entries(urlParams).forEach(([key, value]) => {
              if (key !== 'returnTo' && key !== 'code' && key !== 'screen' && key !== 'params' && value && !cleanParams[key]) {
                cleanParams[key] = value;
              }
            });
          }
          
          // Build the redirect URL with parameters
          let redirectUrl = effectiveReturnTo;
          if (Object.keys(cleanParams).length > 0) {
            const queryString = new URLSearchParams(cleanParams);
            redirectUrl += `?${queryString.toString()}`;
          }
          
          console.log('🔄 [FLOW DEBUG] [AUTH REDIRECT] Redirecting authenticated user to:', redirectUrl);
          router.replace(redirectUrl as any);
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        // If there's an error, don't immediately redirect - this might be a network issue
        // Only redirect if we're not on the login, join, health, waitlist, set-password, or reset-password screen and have no current user
        if (segments[0] !== 'login' && segments[0] !== 'join' && segments[0] !== 'health' && segments[0] !== 'waitlist' && segments[0] !== 'set-password' && segments[0] !== 'reset-password' && (!state.currentUser || !state.currentUser.id)) {
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
        console.log('🔄 [FLOW DEBUG] [USER DATA] User data loaded, redirecting to:', effectiveReturnTo);
        
        // Build the redirect URL with parameters
        // effectiveOtherParams should already contain all params except returnTo and code
        // Filter out internal params like 'screen' and 'params'
        const paramsToInclude: Record<string, string> = {};
        Object.entries(effectiveOtherParams).forEach(([key, value]) => {
          if (key !== 'screen' && key !== 'params' && value) {
            paramsToInclude[key] = value;
          }
        });
        
        // Ensure we have all parameters from the URL (double-check for toki-details)
        if (effectiveReturnTo === '/toki-details' || effectiveReturnTo?.includes('toki-details')) {
          Object.entries(urlParams).forEach(([key, value]) => {
            if (key !== 'returnTo' && key !== 'code' && key !== 'screen' && key !== 'params' && value && !paramsToInclude[key]) {
              paramsToInclude[key] = value;
            }
          });
        }
        
        let redirectUrl = effectiveReturnTo;
        if (Object.keys(paramsToInclude).length > 0) {
          const queryString = new URLSearchParams(paramsToInclude);
          redirectUrl += `?${queryString.toString()}`;
        }
        
        console.log('🔄 [FLOW DEBUG] [USER DATA] Redirecting to:', redirectUrl);
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
        <Stack.Screen name="set-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
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