import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useApp } from '../contexts/AppContext';

interface RedirectionGuardProps {
  children: React.ReactNode;
}

export default function RedirectionGuard({ children }: RedirectionGuardProps) {
  const { state, actions } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { redirection } = state;
    
    // Only process redirection if we have one
    if (!redirection.returnTo) {
      return;
    }

    const currentPath = `/${segments.join('/')}`;
    console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Checking redirection:', {
      returnTo: redirection.returnTo,
      currentPath,
      segments,
      isRedirecting: redirection.isRedirecting,
      returnParams: redirection.returnParams,
      hasCurrentUser: !!state.currentUser?.id
    });

    // Check if we've reached the target page
    // For toki-details, check if we're actually on that page (not just if path includes the string)
    const isOnTargetPage = redirection.returnTo?.startsWith('/toki-details') 
      ? (currentPath === '/toki-details' || segments[0] === 'toki-details')
      : (currentPath === redirection.returnTo || currentPath.includes(redirection.returnTo.replace('/', '')));
    
    if (isOnTargetPage) {
      console.log('✅ [FLOW DEBUG] [REDIRECTION GUARD] Reached target page, clearing redirection');
      actions.clearRedirection();
      return;
    }

    // If we're in the main app but not on the target page, redirect immediately
    // Only redirect if user is authenticated (check by user ID in state)
    const hasUserData = !!state.currentUser?.id;
    const isInTabs = segments[0] === '(tabs)' || segments.length === 0; // Also check if segments is empty (initial load)
    
    if (isInTabs && redirection.returnTo && hasUserData) {
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] User is in tabs and has user data, redirecting to target page:', redirection.returnTo);
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] returnParams:', redirection.returnParams);
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] User ID:', state.currentUser?.id);
      
      // Small delay to ensure tabs are fully loaded
      setTimeout(() => {
        // Build the redirect URL with parameters
        let redirectUrl = redirection.returnTo;
        
        // Special handling for join route: construct /join/[code] path
        // Handle both 'join' format and '/join/[code]' format
        if (redirection.returnTo === 'join' && redirection.returnParams?.code) {
          redirectUrl = `/join/${redirection.returnParams.code}`;
          // Remove code from params since it's in the path
          const { code, ...otherParams } = redirection.returnParams;
          if (Object.keys(otherParams).length > 0) {
            const searchParams = new URLSearchParams(otherParams);
            redirectUrl += `?${searchParams.toString()}`;
          }
          console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Constructed join URL:', redirectUrl);
        } else if (redirection.returnTo && redirection.returnTo.startsWith('/join/')) {
          // Handle full join path like /join/ABC123
          redirectUrl = redirection.returnTo;
          if (redirection.returnParams && Object.keys(redirection.returnParams).length > 0) {
            const searchParams = new URLSearchParams(redirection.returnParams);
            redirectUrl += `?${searchParams.toString()}`;
          }
          console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Using full join path:', redirectUrl);
        } else if (redirection.returnParams && Object.keys(redirection.returnParams).length > 0) {
          const searchParams = new URLSearchParams(redirection.returnParams);
          redirectUrl += `?${searchParams.toString()}`;
        }
        
        console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Final redirect URL:', redirectUrl);
        router.replace(redirectUrl as any);
      }, 100);
    } else if (redirection.returnTo && !hasUserData) {
      // User data not ready yet, wait a bit and retry
      console.log('⏳ [FLOW DEBUG] [REDIRECTION GUARD] User data not ready yet, will retry...');
    } else {
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Not redirecting - conditions not met:', {
        isInTabs,
        hasReturnTo: !!redirection.returnTo,
        hasCurrentUser: !!state.currentUser?.id,
        segments: segments.join('/')
      });
    }
  }, [state.redirection, segments, actions, router, state.currentUser?.id]);

  return <>{children}</>;
}
