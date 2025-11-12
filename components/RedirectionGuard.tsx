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
    if (currentPath === redirection.returnTo || 
        currentPath.includes(redirection.returnTo.replace('/', ''))) {
      console.log('✅ [FLOW DEBUG] [REDIRECTION GUARD] Reached target page, clearing redirection');
      actions.clearRedirection();
      return;
    }

    // If we're in the main app but not on the target page, redirect immediately
    // Only redirect if user is authenticated
    if (segments[0] === '(tabs)' && redirection.returnTo && state.currentUser?.id) {
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] User is in tabs and authenticated, redirecting to target page:', redirection.returnTo);
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] returnParams:', redirection.returnParams);
      
      // Small delay to ensure tabs are fully loaded
      setTimeout(() => {
        // Build the redirect URL with parameters
        let redirectUrl = redirection.returnTo;
        if (redirection.returnParams && Object.keys(redirection.returnParams).length > 0) {
          const searchParams = new URLSearchParams(redirection.returnParams);
          redirectUrl += `?${searchParams.toString()}`;
        }
        
        console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Final redirect URL:', redirectUrl);
        router.replace(redirectUrl as any);
      }, 100);
    } else {
      console.log('🔄 [FLOW DEBUG] [REDIRECTION GUARD] Not redirecting - conditions not met:', {
        isInTabs: segments[0] === '(tabs)',
        hasReturnTo: !!redirection.returnTo,
        hasCurrentUser: !!state.currentUser?.id
      });
    }
  }, [state.redirection, segments, actions, router, state.currentUser?.id]);

  return <>{children}</>;
}
