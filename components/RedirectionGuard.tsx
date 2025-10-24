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
    console.log('🔄 [REDIRECTION GUARD] Checking redirection:', {
      returnTo: redirection.returnTo,
      currentPath,
      segments,
      isRedirecting: redirection.isRedirecting
    });

    // Check if we've reached the target page
    if (currentPath === redirection.returnTo || 
        currentPath.includes(redirection.returnTo.replace('/', ''))) {
      console.log('✅ [REDIRECTION GUARD] Reached target page, clearing redirection');
      actions.clearRedirection();
      return;
    }

    // If we're in the main app but not on the target page, redirect immediately
    // Only redirect if user is authenticated
    if (segments[0] === '(tabs)' && redirection.returnTo && state.currentUser?.id) {
      console.log('🔄 [REDIRECTION GUARD] User is in tabs and authenticated, redirecting to target page:', redirection.returnTo);
      
      // Small delay to ensure tabs are fully loaded
      setTimeout(() => {
        // Build the redirect URL with parameters
        let redirectUrl = redirection.returnTo;
        if (redirection.returnParams && Object.keys(redirection.returnParams).length > 0) {
          const searchParams = new URLSearchParams(redirection.returnParams);
          redirectUrl += `?${searchParams.toString()}`;
        }
        
        console.log('🔄 [REDIRECTION GUARD] Redirecting to:', redirectUrl);
        router.replace(redirectUrl as any);
      }, 100);
    }
  }, [state.redirection, segments, actions, router]);

  return <>{children}</>;
}
