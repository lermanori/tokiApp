import '@/utils/logger';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
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
  
  // Capture the initial URL before Expo Router processes it (runs only once on mount)
  useEffect(() => {
    const captureInitialUrl = async () => {
      if (Platform.OS === 'web') {
        // Web: use window.location and sessionStorage
        if (typeof window !== 'undefined' && window.location?.href && typeof sessionStorage !== 'undefined') {
          const url = window.location.href;
          const isDeepLink = url.includes('?') || 
                            url.includes('/toki-details') || 
                            url.includes('/join/') || 
                            url.includes('/user-profile/');
          
          if (isDeepLink && url !== 'http://localhost:8081/' && url !== 'http://localhost:8081') {
            const stored = sessionStorage.getItem('toki-initial-url');
            if (!stored) {
              sessionStorage.setItem('toki-initial-url', url);
              setInitialUrl(url);
              console.log('🔗 [INITIAL URL] Stored initial URL (web):', url);
            } else {
              setInitialUrl(stored);
            }
          }
        }
      } else {
        // Native (iOS): use Expo Linking API
        setIsWaitingForInitialUrl(true);
        try {
          const url = await Linking.getInitialURL();
          if (url) {
            setInitialUrl(url);
            console.log('🔗 [INITIAL URL] Got initial URL (native):', url);
          } else {
            console.log('🔗 [INITIAL URL] No initial URL found (native)');
          }
        } catch (error) {
          console.error('❌ [INITIAL URL] Error getting initial URL:', error);
        } finally {
          setIsWaitingForInitialUrl(false);
        }
      }
    };
    
    captureInitialUrl();
  }, []); // Run only once on mount
  
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
  
  // Memoize urlParams to prevent creating new object on every render
  // This prevents infinite loops in useEffect hooks that depend on it
  const urlParams = useMemo(() => {
    return getUrlParams();
  }, [typeof window !== 'undefined' && typeof window.location !== 'undefined' ? window.location.href : null]);
  
  const effectiveReturnTo = returnTo || urlParams.returnTo;
  const effectiveCode = code || urlParams.code;
  
  // Memoize effectiveOtherParams to prevent creating new object on every render
  // This prevents infinite loops in useEffect hooks that depend on it
  // Create a stable key from searchParams entries (excluding returnTo and code) for comparison
  const otherParamsKey = useMemo(() => {
    const entries = Object.entries(searchParams).filter(([key]) => key !== 'returnTo' && key !== 'code');
    return entries.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|');
  }, [searchParams]);
  
  // Create a stable urlParams key for comparison
  const urlParamsKey = useMemo(() => {
    const entries = Object.entries(urlParams).filter(([key]) => key !== 'returnTo' && key !== 'code');
    return entries.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|');
  }, [urlParams]);
  
  const effectiveOtherParams = useMemo(() => {
    // Always create a new object from the values to ensure stability
    // Use otherParams if it has keys, otherwise use filtered urlParams
    if (Object.keys(otherParams).length > 0) {
      return Object.fromEntries(Object.entries(otherParams));
    } else {
      return Object.fromEntries(Object.entries(urlParams).filter(([key]) => key !== 'returnTo' && key !== 'code'));
    }
  }, [otherParamsKey, urlParamsKey]);
  const [isReady, setIsReady] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasCheckedFastRedirect, setHasCheckedFastRedirect] = useState(false);
  const [hasHandledInitialUrl, setHasHandledInitialUrl] = useState(false);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [isWaitingForInitialUrl, setIsWaitingForInitialUrl] = useState(false);
  const lastProcessedSegmentsRef = useRef<string>('');
  
  // Create a stable string representation of segments for dependency comparison
  // Use JSON.stringify to create a stable key that only changes when segments actually change
  const segmentsKey = useMemo(() => JSON.stringify(segments), [segments.length, segments[0], segments[1]]);

  // Handle initial URL when app opens from universal link (not-found case)
  useEffect(() => {
    // Only run if we're on not-found screen and haven't handled it yet
    if (hasHandledInitialUrl) {
      return;
    }
    
    // Check if we're on not-found screen
    const isOnNotFound = segments[0] === '+not-found';
    if (!isOnNotFound) {
      return;
    }
    
    // On native, wait for initialUrl to be captured before proceeding
    if (Platform.OS !== 'web' && isWaitingForInitialUrl) {
      console.log('⏳ [INITIAL URL] Waiting for initialUrl to be captured...');
      return;
    }

    console.log('🔗 [INITIAL URL] Detected not-found screen, extracting path...');
    console.log('🔗 [INITIAL URL] initialUrl state:', initialUrl);
    console.log('🔗 [INITIAL URL] searchParams:', searchParams);
    console.log('🔗 [INITIAL URL] effectiveOtherParams:', effectiveOtherParams);
    console.log('🔗 [INITIAL URL] window.location.href:', typeof window !== 'undefined' ? window.location?.href : 'N/A');
    console.log('🔗 [INITIAL URL] window.location.search:', typeof window !== 'undefined' ? window.location?.search : 'N/A');

    // Try to extract the actual path from the URL
    const extractPathFromUrl = () => {
      // First priority: check initialUrl (captured before Expo Router processed it)
      // This is especially important on native where Linking.getInitialURL() is async
      if (initialUrl) {
        try {
          // Handle custom scheme URLs (tokimap://) and regular URLs
          let urlToParse = initialUrl;
          
          // If it's a custom scheme, convert to http for parsing
          if (urlToParse.startsWith('tokimap://')) {
            urlToParse = urlToParse.replace('tokimap://', 'http://');
          }
          
          // For native, the URL might be a full URL or just a path
          let url: URL;
          if (urlToParse.startsWith('http://') || urlToParse.startsWith('https://')) {
            url = new URL(urlToParse);
          } else {
            // For native, if it's just a path, construct a full URL for parsing
            url = new URL(urlToParse, 'https://toki-app.com');
          }
          
          const pathname = url.pathname;
          if (pathname && pathname !== '/' && pathname !== '/+not-found') {
            const params: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            console.log('🔗 [INITIAL URL] Extracted from initialUrl state:', pathname, params);
            // Clear it after use
            setInitialUrl(null);
            if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
              sessionStorage.removeItem('toki-initial-url');
            }
            return { path: pathname, params };
          }
        } catch (error) {
          console.error('❌ [INITIAL URL] Error parsing initialUrl state:', error);
        }
      }
      
      // Second priority: check effectiveOtherParams.path (contains the original URL with query params)
      const pathParam = effectiveOtherParams.path;
      if (pathParam) {
        const pathStr = Array.isArray(pathParam) ? pathParam[0] : pathParam;
        if (pathStr && typeof pathStr === 'string' && pathStr.includes('/')) {
          try {
            // Handle paths with or without protocol
            let pathToParse = pathStr;
            if (!pathToParse.startsWith('http://') && !pathToParse.startsWith('https://')) {
              pathToParse = `http://${pathToParse}`;
            }
            
            const url = new URL(pathToParse);
            const extractedPath = url.pathname;
            const params: Record<string, string> = {};
            
            url.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            
            if (extractedPath && extractedPath !== '/') {
              console.log('🔗 [INITIAL URL] Extracted from effectiveOtherParams.path:', extractedPath, params);
              return { path: extractedPath, params };
            }
          } catch (error) {
            console.error('❌ [INITIAL URL] Error parsing effectiveOtherParams.path:', error);
          }
        }
      }
      
      // Fallback: try sessionStorage for web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        const storedInitialUrl = sessionStorage.getItem('toki-initial-url');
        if (storedInitialUrl) {
          try {
            const url = new URL(storedInitialUrl);
            const pathname = url.pathname;
            if (pathname && pathname !== '/' && pathname !== '/+not-found') {
              const params: Record<string, string> = {};
              url.searchParams.forEach((value, key) => {
                params[key] = value;
              });
              console.log('🔗 [INITIAL URL] Extracted from sessionStorage:', pathname, params);
              sessionStorage.removeItem('toki-initial-url');
              return { path: pathname, params };
            }
          } catch (error) {
            console.error('❌ [INITIAL URL] Error parsing sessionStorage URL:', error);
          }
        }
      }
      
      // Fallback: try to get the path directly from window.location.href (most reliable)
      if (typeof window !== 'undefined' && window.location?.href) {
        try {
          const url = new URL(window.location.href);
          const pathname = url.pathname;
          
          // If pathname is valid and not just '/', use it
          if (pathname && pathname !== '/' && pathname !== '/+not-found') {
            const params: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            console.log('🔗 [INITIAL URL] Extracted path from window.location:', pathname, params);
            return { path: pathname, params };
          }
        } catch (error) {
          console.error('❌ [INITIAL URL] Error parsing window.location.href:', error);
        }
      }
      
      // Check if we have path info in searchParams or effectiveOtherParams
      // The path might be split into an array like ["localhost:8081", "toki-details"]
      const notFoundArray = searchParams['not-found'] || effectiveOtherParams['not-found'];
      const pathSource = searchParams.path || effectiveOtherParams.path;
      
      // If we have a not-found array, reconstruct the path
      if (notFoundArray && Array.isArray(notFoundArray) && notFoundArray.length >= 2) {
        try {
          // Reconstruct: ["localhost:8081", "toki-details"] -> "localhost:8081/toki-details"
          const host = notFoundArray[0];
          const pathPart = notFoundArray.slice(1).join('/');
          const reconstructedPath = `${host}/${pathPart}`;
          
          // Get query params from the original URL - try multiple sources
          let params: Record<string, string> = {};
          
          // First, try to get from window.location.search (if URL hasn't changed yet)
          if (typeof window !== 'undefined' && window.location?.search) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.forEach((value, key) => {
              params[key] = value;
            });
          }
          
          // Also check if there's a full URL in the path param that might have query params
          // The path param contains the original full URL like "localhost:8081/toki-details?tokiId=..."
          const pathParam = searchParams.path || effectiveOtherParams.path;
          console.log('🔗 [INITIAL URL] Checking path param for query params:', pathParam);
          if (pathParam) {
            const pathStr = Array.isArray(pathParam) ? pathParam[0] : pathParam;
            console.log('🔗 [INITIAL URL] Path string:', pathStr, 'Type:', typeof pathStr);
            if (pathStr && typeof pathStr === 'string') {
              // Check if it contains query params
              if (pathStr.includes('?')) {
                try {
                  // Extract everything after the ?
                  const urlMatch = pathStr.match(/\?([^#]*)/);
                  if (urlMatch) {
                    const queryString = urlMatch[1];
                    console.log('🔗 [INITIAL URL] Found query string in path param:', queryString);
                    const urlParams = new URLSearchParams(queryString);
                    urlParams.forEach((value, key) => {
                      params[key] = value;
                      console.log('🔗 [INITIAL URL] Extracted param:', key, '=', value);
                    });
                  }
                } catch (e) {
                  console.error('❌ [INITIAL URL] Error parsing query from path param:', e);
                }
              } else {
                console.log('🔗 [INITIAL URL] Path string does not contain query params');
              }
            }
          } else {
            console.log('🔗 [INITIAL URL] No path param found');
          }
          
          // Parse the reconstructed path
          let pathToParse = reconstructedPath;
          if (!pathToParse.startsWith('http://') && !pathToParse.startsWith('https://')) {
            pathToParse = `http://${pathToParse}`;
          }
          
          const url = new URL(pathToParse);
          const extractedPath = url.pathname;
          
          // Merge params from URL if any (though reconstructed path likely won't have query params)
          url.searchParams.forEach((value, key) => {
            params[key] = value;
          });
          
          if (extractedPath && extractedPath !== '/') {
            console.log('🔗 [INITIAL URL] Extracted path from not-found array:', extractedPath, params);
            return { path: extractedPath, params };
          }
        } catch (error) {
          console.error('❌ [INITIAL URL] Error parsing not-found array:', error);
        }
      }
      
      // Fallback: check pathSource (single string)
      if (pathSource) {
        const pathStr = Array.isArray(pathSource) ? pathSource[0] : pathSource;
        if (pathStr && typeof pathStr === 'string') {
          try {
            // Handle paths with or without protocol
            // Format could be: "localhost:8081/toki-details?..." or "https://toki-app.com/toki-details?..."
            let pathToParse = pathStr;
            
            // If it doesn't start with http, add it for parsing
            if (!pathToParse.startsWith('http://') && !pathToParse.startsWith('https://')) {
              pathToParse = `http://${pathToParse}`;
            }
            
            const url = new URL(pathToParse);
            const extractedPath = url.pathname;
            const params: Record<string, string> = {};
            
            url.searchParams.forEach((value, key) => {
              params[key] = value;
            });
            
            if (extractedPath && extractedPath !== '/') {
              console.log('🔗 [INITIAL URL] Extracted path from path param:', extractedPath, params);
              return { path: extractedPath, params };
            }
          } catch (error) {
            console.error('❌ [INITIAL URL] Error parsing path from searchParams:', error);
            // Fallback: try simple regex extraction
            try {
              const match = pathStr.match(/(\/[^?]*)(?:\?(.*))?$/);
              if (match) {
                const extractedPath = match[1];
                const queryString = match[2];
                const params: Record<string, string> = {};
                
                if (queryString) {
                  const urlParams = new URLSearchParams(queryString);
                  urlParams.forEach((value, key) => {
                    params[key] = value;
                  });
                }
                
                console.log('🔗 [INITIAL URL] Extracted path using regex fallback:', extractedPath, params);
                return { path: extractedPath, params };
              }
            } catch (fallbackError) {
              console.error('❌ [INITIAL URL] Regex fallback also failed:', fallbackError);
            }
          }
        }
      }
      
      return null;
    };

    const urlInfo = extractPathFromUrl();
    if (urlInfo && urlInfo.path) {
      const { path, params } = urlInfo;
      
      console.log('🔗 [INITIAL URL] Handling universal link - navigating to:', path, params);
      console.log('🔗 [INITIAL URL] Params keys:', Object.keys(params));
      console.log('🔗 [INITIAL URL] Params values:', params);
      
      const hasParams = Object.keys(params).length > 0;
      
      // On native, if we extracted a path but have no params and initialUrl hasn't been set yet,
      // wait for initialUrl before navigating (it likely has the params)
      if (Platform.OS !== 'web' && !hasParams && initialUrl === null) {
        console.log('⏳ [INITIAL URL] Found path but no params on native, waiting for initialUrl to be captured...');
        return; // Don't navigate yet, wait for initialUrl
      }
      
      // Mark as handled
      setHasHandledInitialUrl(true);
      
      // Navigate using object form with params (more reliable than query string)
      if (hasParams) {
        // Use object form for better param handling
        router.replace({
          pathname: path as any,
          params: params as any,
        });
        console.log('🔗 [INITIAL URL] Navigated using object form with params');
      } else {
        // If no params, just use the path (might be a path without params, or web fallback)
        router.replace(path as any);
        console.log('🔗 [INITIAL URL] Navigated to path without params');
      }
    } else {
      console.log('⚠️ [INITIAL URL] Could not extract path from URL');
      
      // If initialUrl is still being captured (async on native), don't mark as handled yet
      // The effect will re-run when initialUrl changes
      if (!initialUrl && Platform.OS !== 'web') {
        console.log('⏳ [INITIAL URL] initialUrl not ready yet (async on native), will retry when it becomes available');
        return; // Don't mark as handled, let it retry
      }
      
      // If we couldn't extract and initialUrl is available (web), mark as handled to prevent infinite loops
      if (Platform.OS === 'web') {
        setHasHandledInitialUrl(true);
      }
    }
  }, [segments, searchParams, effectiveOtherParams, router, hasHandledInitialUrl, initialUrl, isWaitingForInitialUrl]);

  // Fast redirect check - runs immediately on mount
  useEffect(() => {
    if (hasCheckedFastRedirect || !effectiveReturnTo || segments[0] !== 'login') {
      return;
    }

    // Check if user has valid tokens immediately
    const hasValidTokens = apiService.hasToken();
    if (hasValidTokens) {
      console.log('⚡ [FLOW DEBUG] [FAST REDIRECT] Valid tokens found, redirecting immediately to:', effectiveReturnTo);
      setHasCheckedFastRedirect(true);
      
      // Special handling for join route: construct /join/[code] path
      let redirectUrl = effectiveReturnTo;
      if (effectiveReturnTo === 'join' && effectiveCode) {
        const codeValue = Array.isArray(effectiveCode) ? effectiveCode[0] : effectiveCode;
        redirectUrl = `/join/${codeValue}`;
        console.log('⚡ [FLOW DEBUG] [FAST REDIRECT] Constructed join URL:', redirectUrl);
        router.replace(redirectUrl as any);
        return;
      }
      
      // Build the redirect URL with parameters
      // For toki-details, we need to preserve all URL parameters
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
  }, [effectiveReturnTo, effectiveCode, effectiveOtherParams, urlParams, segments, router, hasCheckedFastRedirect]);

  useEffect(() => {
    // Check if user is authenticated with debouncing
    const checkAuth = async () => {
      // Skip if we've already processed these exact segments
      if (segmentsKey === lastProcessedSegmentsRef.current) {
        console.log('⏭️ [AUTH CHECK] Skipping - segments unchanged:', segmentsKey);
        return;
      }
      
      // Cross-platform path detection: prefer segments over window.location for accuracy
      // Segments are more reliable during navigation transitions
      const getCurrentPath = () => {
        // First, try to build path from segments (most reliable during navigation)
        if (segments.length > 0) {
          const segmentsPath = `/${segments.join('/')}`;
          // On web, validate against window.location to catch mismatches
          if (typeof window !== 'undefined' && window.location?.pathname) {
            const windowPath = window.location.pathname;
            // If segments path doesn't match window path, there might be a navigation in progress
            // In that case, prefer segments as they're more up-to-date during transitions
            if (segmentsPath !== windowPath && segmentsPath !== '/' && windowPath !== '/') {
              console.log('⚠️ [PATH DETECTION] Mismatch detected - segments:', segmentsPath, 'window:', windowPath, 'using segments');
            }
          }
          return segmentsPath;
        }
        // Fallback: use window.location.pathname on web
        if (typeof window !== 'undefined' && window.location?.pathname) {
          return window.location.pathname;
        }
        return '';
      };
      
      const path = getCurrentPath();
      
      // Build path from segments for validation
      const segmentsPath = segments.length > 0 ? `/${segments.join('/')}` : '';
      const pathIsJoin = path.startsWith('/join');
      const pathIsLogin = path.startsWith('/login');
      const isOnNotFound = segments[0] === '+not-found';

      // If we're on not-found screen, skip auth check and let initial URL handler run first
      if (isOnNotFound && !hasHandledInitialUrl) {
        console.log('⏸️ [AUTH CHECK] On not-found screen, skipping auth check to let initial URL handler run');
        return;
      }

      // Prevent multiple simultaneous auth checks
      if (isCheckingAuth) {
        return;
      }
      
      // Debounce auth checks - only run once every 5 seconds
      const now = Date.now();
      if (now - lastAuthCheck < 5000) {
        return;
      }
      
      // Mark these segments as processed BEFORE any async operations or redirects
      lastProcessedSegmentsRef.current = segmentsKey;
      console.log('📝 [AUTH CHECK] Marked segments as processed:', segmentsKey);
      
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
        
        console.log('🔍 [FLOW DEBUG] [AUTH CHECK] Auth status:', {
          isAuthenticated,
          hasUserData,
          currentUserId: state.currentUser?.id,
          hasToken: apiService.hasToken(),
          inLoginScreen,
          redirectionState: state.redirection
        });
        // Treat the URL path as join during the very first render before segments are populated
        const inJoinScreen = segments[0] === 'join' || pathIsJoin;
        const inHealthScreen = segments[0] === 'health';
        const inWaitlistScreen = segments[0] === 'waitlist' || path.startsWith('/waitlist');
        const inRegisterScreen = segments[0] === 'register' || path.startsWith('/register');
        const inSetPasswordScreen = segments[0] === 'set-password' || path.startsWith('/set-password');
        const inResetPasswordScreen = (segments[0] as string) === 'reset-password' || path.startsWith('/reset-password');
        const inTermsOfUseScreen = segments[0] === 'terms-of-use' || path.startsWith('/terms-of-use');
        const inPrivacyPolicyScreen = segments[0] === 'privacy-policy' || path.startsWith('/privacy-policy');
        
        if (!isAuthenticated && !inLoginScreen && !inJoinScreen && !inHealthScreen && !inWaitlistScreen && !inSetPasswordScreen && !inResetPasswordScreen && !inRegisterScreen && !inTermsOfUseScreen && !inPrivacyPolicyScreen) {
          // If user has tokens but isAuthenticated is false, it's likely a race condition
          // Don't preserve the path - just redirect to login and let fast redirect handle it
          const hasTokens = apiService.hasToken();
          if (hasTokens) {
            console.log('⚠️ [FLOW DEBUG] [AUTH CHECK] Race condition detected: has tokens but not authenticated, redirecting to login without preserving path');
            router.replace('/login');
            return;
          }
          
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
            router.replace(loginUrl as any);
          } else if (pathIsJoin) {
            // Preserve join link path - extract code from path
            const pathParts = path.split('/');
            const codeFromPath = pathParts[pathParts.length - 1]; // Get last part of path (the code)
            
            if (codeFromPath && codeFromPath !== 'join') {
              // Redirect to login with returnTo=join and code parameter
              const loginUrl = `/login?returnTo=join&code=${codeFromPath}`;
              console.log('🔗 [FLOW DEBUG] [DEEP LINK] Preserving join link, redirecting to:', loginUrl);
              router.replace(loginUrl as any);
            } else {
              // Fallback: redirect to login normally if code can't be extracted
              console.log('⚠️ [FLOW DEBUG] [DEEP LINK] Could not extract code from join path, redirecting to login');
              router.replace('/login');
            }
          } else {
            // For other pages, preserve the path as returnTo
            // Use segments path if available and consistent, otherwise use window path
            let preservedPath = segmentsPath || path;
            
            // Validate: if we have both segments and window path, they should match
            // If they don't match, it might be a stale path from a previous navigation
            if (segmentsPath && path && segmentsPath !== path && path !== '/' && segmentsPath !== '/') {
              console.log('⚠️ [FLOW DEBUG] [DEEP LINK] Path mismatch detected - segments:', segmentsPath, 'window:', path);
              // Prefer segments path as it's more reliable during navigation
              preservedPath = segmentsPath;
            }
            
            // Don't preserve paths that are clearly invalid or stale
            // Skip if path is a tab route that doesn't match current segments
            if (preservedPath && preservedPath !== '/login' && preservedPath !== '/') {
              // Additional validation: if segments show we're on a different tab, don't preserve stale path
              const isTabRoute = preservedPath.startsWith('/(tabs)') || preservedPath.startsWith('/exMap') || preservedPath.startsWith('/profile') || preservedPath.startsWith('/messages');
              if (isTabRoute && segmentsPath && segmentsPath !== preservedPath && segmentsPath !== '/') {
                console.log('⚠️ [FLOW DEBUG] [DEEP LINK] Stale tab path detected, not preserving:', preservedPath, 'current segments:', segmentsPath);
                // Don't preserve stale path, just redirect to login
                router.replace('/login');
                return;
              }
              
              const loginUrl = `/login?returnTo=${encodeURIComponent(preservedPath)}`;
              console.log('🔗 [FLOW DEBUG] [DEEP LINK] Preserving path, redirecting to:', loginUrl);
              router.replace(loginUrl as any);
            } else {
              // Fallback: redirect to login normally
              router.replace('/login');
            }
          }
        } else if (isAuthenticated && inLoginScreen) {
          // Redirect to main app if authenticated
          // Respect returnTo params (e.g., invite flow)
          const returnToPath = Array.isArray(effectiveReturnTo) ? effectiveReturnTo[0] : effectiveReturnTo;
          
          // Handle join paths - check both 'join' and '/join/[code]' formats
          if ((effectiveReturnTo === 'join' && typeof effectiveCode === 'string' && effectiveCode.length > 0) ||
              (returnToPath && returnToPath.startsWith('/join/'))) {
            // Extract code from path if it's a full path like /join/ABC123
            let codeToUse = effectiveCode;
            if (returnToPath && returnToPath.startsWith('/join/')) {
              const pathParts = returnToPath.split('/');
              codeToUse = pathParts[pathParts.length - 1];
            }
            
            if (codeToUse) {
              const codeValue = Array.isArray(codeToUse) ? codeToUse[0] : codeToUse;
              console.log('🔄 [FLOW DEBUG] [AUTH REDIRECT] Navigating to join page with code:', codeValue);
              router.replace(`/join/${codeValue}`);
              return;
            }
          }
          
          if (effectiveReturnTo && effectiveReturnTo !== 'join' && !returnToPath?.startsWith('/join/')) {
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
        } else if (isAuthenticated && !inLoginScreen && !inJoinScreen && !inHealthScreen && !inWaitlistScreen && !inRegisterScreen && !inTermsOfUseScreen && !inPrivacyPolicyScreen) {
          // IMPORTANT: Don't redirect authenticated users if they're on a valid page
          // List of valid authenticated routes (both deep links and regular authenticated routes)
          const validAuthenticatedRoutes = [
            'toki-details',
            'user-profile',
            'join',
            'register',
            'notifications',
            'connections',
            'chat',
            'edit-profile',
            'my-tokis',
            'saved-tokis',
          ];
          
          const isOnValidPage = 
            validAuthenticatedRoutes.some(route => segments[0] === route) ||
            path.startsWith('/toki-details') ||
            path.startsWith('/user-profile/') ||
            path.startsWith('/join/') ||
            path.startsWith('/notifications') ||
            path.startsWith('/connections') ||
            path.startsWith('/chat') ||
            path.startsWith('/edit-profile') ||
            path.startsWith('/my-tokis') ||
            path.startsWith('/saved-tokis');
          
          // Also check if we're still handling initial URL (on native, this might take a moment)
          const isHandlingInitialUrl = isOnNotFound && !hasHandledInitialUrl;
          
          if (isOnValidPage || isHandlingInitialUrl) {
            console.log('✅ [AUTH CHECK] Authenticated user on valid page, staying put');
            console.log('✅ [AUTH CHECK] isOnValidPage:', isOnValidPage, 'isHandlingInitialUrl:', isHandlingInitialUrl, 'segments:', segments, 'path:', path);
            return; // Don't redirect, let them stay on the valid page
          }
          
          // If we get here, user is authenticated but on an unrecognized page
          // Only redirect to tabs if we're not in the middle of initial URL handling
          // AND we're not already on tabs (check segments to avoid redirect loops)
          // On web, path '/' is the root and should be treated as "on tabs" to prevent redirect loops
          const isOnTabs = segments[0] === '(tabs)' || 
                          (segments as string[]).includes('(tabs)') || 
                          path.startsWith('/(tabs)') || 
                          (path === '/' && Platform.OS === 'web'); // Root path on web = tabs
          
          if ((hasHandledInitialUrl || Platform.OS === 'web') && !isOnTabs) {
            console.log('🔄 [AUTH CHECK] Authenticated user on unrecognized page, redirecting to tabs');
            console.log('🔄 [AUTH CHECK] Current segments:', segments, 'path:', path);
            // Update ref before redirect to prevent re-processing
            lastProcessedSegmentsRef.current = segmentsKey;
            router.replace('/(tabs)');
          } else {
            console.log('✅ [AUTH CHECK] Already on tabs or skipping redirect. isOnTabs:', isOnTabs, 'segments:', segments, 'path:', path);
            // If we're on root path, just set ready without redirecting
            if (path === '/' && Platform.OS === 'web') {
              setIsReady(true);
            }
          }
        } else if ((isAuthenticated || hasUserData) && state.redirection.isRedirecting && state.redirection.returnTo) {
          // Handle pending redirection after login
          // Use hasUserData as fallback if isAuthenticated check hasn't updated yet
          const { returnTo, returnParams } = state.redirection;
          
          console.log('🔄 [FLOW DEBUG] [REDIRECTION] Processing redirection:', { 
            returnTo, 
            returnParams,
            isAuthenticated,
            hasUserData,
            currentUserId: state.currentUser?.id
          });
          
          // Special handling for join route: construct /join/[code] path
          let redirectUrl = returnTo;
          if (returnTo === 'join' && returnParams?.code) {
            redirectUrl = `/join/${returnParams.code}`;
            // Remove code from params since it's in the path
            const { code, ...otherParams } = returnParams;
            if (Object.keys(otherParams).length > 0) {
              const queryString = new URLSearchParams(otherParams);
              redirectUrl += `?${queryString.toString()}`;
            }
            console.log('🔄 [FLOW DEBUG] [REDIRECTION] Constructed join URL:', redirectUrl);
          } else if (returnParams && Object.keys(returnParams).length > 0) {
            const queryString = new URLSearchParams(returnParams);
            redirectUrl += `?${queryString.toString()}`;
          }
          
          console.log('🔄 [FLOW DEBUG] [REDIRECTION] Final redirect URL:', redirectUrl);
          console.log('🔄 [FLOW DEBUG] [REDIRECTION] Executing redirect now...');
          router.replace(redirectUrl as any);
        } else if (isAuthenticated && effectiveReturnTo && !inJoinScreen) {
          // CRITICAL FIX: Only respect returnTo if we're on login screen
          // When navigating from authenticated screens (like notifications), ignore stale returnTo
          // This prevents intermittent redirects to stale paths when clicking notifications
          if (segments[0] !== 'login') {
            console.log('⚠️ [FLOW DEBUG] [AUTH REDIRECT] Ignoring stale returnTo when navigating from authenticated screen:', effectiveReturnTo, 'current segments:', segments);
            return; // Don't redirect, let normal navigation proceed
          }
          
          // Handle direct redirection for authenticated users (only on login screen)
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
          
          // Special handling for join route: construct /join/[code] path
          let redirectUrl = effectiveReturnTo;
          if (effectiveReturnTo === 'join' && code) {
            const codeValue = Array.isArray(code) ? code[0] : code;
            redirectUrl = `/join/${codeValue}`;
            // Remove code from params since it's in the path
            delete cleanParams.code;
            if (Object.keys(cleanParams).length > 0) {
              const queryString = new URLSearchParams(cleanParams);
              redirectUrl += `?${queryString.toString()}`;
            }
            console.log('🔄 [FLOW DEBUG] [AUTH REDIRECT] Constructed join URL:', redirectUrl);
          } else if (Object.keys(cleanParams).length > 0) {
            const queryString = new URLSearchParams(cleanParams);
            redirectUrl += `?${queryString.toString()}`;
          }
          
          console.log('🔄 [FLOW DEBUG] [AUTH REDIRECT] Redirecting authenticated user to:', redirectUrl);
          router.replace(redirectUrl as any);
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        // If there's an error, don't immediately redirect - this might be a network issue
        // Only redirect if we're not on the login, join, health, waitlist, set-password, reset-password, or terms-of-use screen and have no current user
        if ((segments[0] as string) !== 'login' && (segments[0] as string) !== 'join' && (segments[0] as string) !== 'health' && (segments[0] as string) !== 'waitlist' && (segments[0] as string) !== 'set-password' && (segments[0] as string) !== 'reset-password' && (segments[0] as string) !== 'terms-of-use' && (segments[0] as string) !== 'privacy-policy' && (!state.currentUser || !state.currentUser.id)) {
          console.log('🔄 Redirecting to login - auth error and no current user');
          router.replace('/login');
        }
      } finally {
        setIsCheckingAuth(false);
        setIsReady(true);
      }
    };
    
    checkAuth();
  }, [segmentsKey]); // Use memoized segments key to prevent infinite loops from array reference changes

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

  // Show loading screen while waiting for initial URL on native
  if (Platform.OS !== 'web' && isWaitingForInitialUrl && segments[0] === '+not-found' && !hasHandledInitialUrl) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
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
        <Stack.Screen name="terms-of-use" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});