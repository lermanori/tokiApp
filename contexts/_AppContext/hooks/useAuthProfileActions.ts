// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1389-1470.
// Owns local state: isCheckingAuthStatus, lastAuthStatusCheckMs.
// Cross-hook calls via actionsRef: clearAllData (Misc), loadCurrentUser (Connections).

import { useState, Dispatch, MutableRefObject } from 'react';
import { apiService } from '../../../services/api';
import type { AppState, AppAction } from '../types';
import { emptyUser } from '../state';

export function useAuthProfileActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  const [isCheckingAuthStatus, setIsCheckingAuthStatus] = useState(false);
  const [lastAuthStatusCheckMs, setLastAuthStatusCheckMs] = useState(0);

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const path = typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping auth status on auth/join routes');
        return false;
      }

      if (isCheckingAuthStatus) {
        console.log('⏳ Skipping auth status: already in-flight');
        return false;
      }
      const now = Date.now();
      if (now - lastAuthStatusCheckMs < 3000) {
        console.log('🕒 Skipping auth status: cooldown');
        return false;
      }

      setIsCheckingAuthStatus(true);
      setLastAuthStatusCheckMs(now);

      const isAuthenticated = await apiService.isAuthenticated();
      if (!isAuthenticated) {
        // Clear any stored user data when not authenticated
        dispatch({ type: 'UPDATE_CURRENT_USER', payload: emptyUser });
        console.log('🔐 User not authenticated, cleared user data');
      }
      return isAuthenticated;
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      return false;
    } finally {
      setIsCheckingAuthStatus(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 Starting logout process...');
    try {
      // Clear tokens from local storage (this is the key!)
      console.log('🗑️ Clearing auth tokens...');
      await apiService.clearTokens();

      // Clear all app data
      console.log('🗑️ Clearing app data...');
      await actionsRef.current.clearAllData();

      console.log('✅ User logged out successfully - tokens cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if there's an error, clear tokens and data
      console.log('🔄 Fallback: clearing tokens and data...');
      await apiService.clearTokens();
      await actionsRef.current.clearAllData();
    }
  };

  const updateProfile = async (updates: any): Promise<boolean> => {
    try {
      console.log('🟢 [AppContext] updateProfile called with:', updates);
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('🟢 [AppContext] Calling apiService.updateProfile...');
      const apiUser = await apiService.updateProfile(updates);
      console.log('🟢 [AppContext] apiService.updateProfile returned:', apiUser);

      // Reload the full user data to get updated stats and social links
      console.log('🟢 [AppContext] Reloading current user...');
      await actionsRef.current.loadCurrentUser();

      console.log('✅ Profile updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update profile' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return { checkAuthStatus, logout, updateProfile };
}
