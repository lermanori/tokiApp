// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 448-495.
// Owns local state: isCheckingConnection, lastConnectionCheckMs.

import { useState, Dispatch } from 'react';
import { apiService } from '../../../services/api';
import { getBackendUrl } from '../../../services/config';
import type { AppState, AppAction } from '../types';

export function useConnectionSyncActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
) {
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [lastConnectionCheckMs, setLastConnectionCheckMs] = useState(0);

  const checkConnection = async () => {
    try {
      const path = typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping health check on auth/join routes');
        return;
      }

      if (isCheckingConnection) {
        console.log('⏳ Skipping health check: already in-flight');
        return;
      }
      const now = Date.now();
      if (now - lastConnectionCheckMs < 3000) {
        console.log('🕒 Skipping health check: cooldown');
        return;
      }

      setIsCheckingConnection(true);
      setLastConnectionCheckMs(now);

      await apiService.healthCheck();
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      const backendUrl = getBackendUrl();
      console.error('❌ Backend connection failed:', error);
      console.error('❌ Backend URL attempted:', backendUrl);
      console.error('❌ Health check endpoint:', `${backendUrl}/api/health`);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Unable to connect to server' });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const syncData = async () => {
    try {
      // Frontend-only mode - just update sync time
      const now = new Date().toISOString();
      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });
      console.log('✅ Frontend data synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync frontend data:', error);
    }
  };

  return { checkConnection, syncData };
}
