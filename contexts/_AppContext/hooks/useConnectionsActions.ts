// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1689-1929.
// loadCurrentUser + 10 connection handlers + searchUsers.
// Owns local state: isLoadingConnections, isLoadingPendingConnections, pendingLoadCurrentUserRef.
// Same-hook cross-calls: acceptConnectionRequest → getConnections (no actionsRef needed).

import { useState, useRef, Dispatch } from 'react';
import { apiService } from '../../../services/api';
import type { AppState, AppAction, User } from '../types';
import { STORAGE_KEYS, storage } from '../constants';

export function useConnectionsActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
) {
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isLoadingPendingConnections, setIsLoadingPendingConnections] = useState(false);
  const pendingLoadCurrentUserRef = useRef<Promise<void> | null>(null);

  const loadCurrentUser = async (): Promise<void> => {
    // If there's already a pending request, return that promise instead
    if (pendingLoadCurrentUserRef.current) {
      console.log('🔄 loadCurrentUser: Reusing pending request');
      return pendingLoadCurrentUserRef.current;
    }

    console.log('🔄 loadCurrentUser called');

    // Create the request promise
    const requestPromise = (async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Get the full response to access user and stats
        console.log('🌐 Calling apiService.getCurrentUser()...');
        const response = await apiService.getCurrentUser();
        console.log('🌐 API response received:', response);

        // The API service already extracts response.data, so we get: { user: User; socialLinks: any; stats: any; verified: boolean }
        const user = response.user;
        const stats = response.stats;
        console.log('👤 User data from API:', user);
        console.log('📊 Stats data from API:', stats);
        console.log('🔗 Social links from API:', response.socialLinks);

        // Transform backend user data to match our interface
        const transformedUser: User = {
          id: user.id,
          name: user.name,
          email: user.email,
          bio: user.bio || '',
          location: user.location || '',
          avatar: user.avatar || 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1770670984/wanderercreative-blank-profile-picture-973460_1920_smqcnp.jpg',
          verified: response.verified,
          socialLinks: response.socialLinks || {},
          memberSince: user.memberSince,
          tokisCreated: stats?.tokis_created || 0,
          tokisJoined: stats?.tokis_joined || 0,
          connections: stats?.connections_count || 0,
          rating: parseFloat(user.rating) || 0,
          latitude: user.latitude,
          longitude: user.longitude,
        };

        console.log('🔄 Dispatching UPDATE_CURRENT_USER with:', transformedUser);
        dispatch({ type: 'UPDATE_CURRENT_USER', payload: transformedUser });
        storage.set(STORAGE_KEYS.CURRENT_USER, transformedUser);
        console.log('✅ Current user loaded successfully:', transformedUser.name);
        console.log('📊 User stats:', { tokisCreated: transformedUser.tokisCreated, tokisJoined: transformedUser.tokisJoined, connections: transformedUser.connections });

        // Force a re-render by dispatching again after a short delay
        setTimeout(() => {
          console.log('🔄 Forcing stats update...');
          dispatch({ type: 'UPDATE_CURRENT_USER', payload: transformedUser });
        }, 100);
      } catch (error) {
        console.error('❌ Failed to load current user:', error);
        // Don't show error alert here as it might be expected if user is not logged in
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        // Clear the pending request when done
        pendingLoadCurrentUserRef.current = null;
      }
    })();

    // Store the pending request
    pendingLoadCurrentUserRef.current = requestPromise;
    return requestPromise;
  };

  // Connection actions
  const getConnections = async (): Promise<{ connections: any[]; pagination: any }> => {
    try {
      // Prevent duplicate API calls
      if (isLoadingConnections) {
        console.log('⏳ Connections already loading, returning cached data');
        return { connections: state.connections, pagination: { page: 1, limit: 10, total: state.connections.length, pages: 1 } };
      }

      setIsLoadingConnections(true);
      const response = await apiService.getConnections();

      // Update global state
      dispatch({ type: 'SET_CONNECTIONS', payload: response.connections });

      return response;
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
      return { connections: state.connections, pagination: { page: 1, limit: 10, total: state.connections.length, pages: 1 } };
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const getConnectionsForToki = async (tokiId: string): Promise<{ connections: any[]; toki: { id: string; title: string } }> => {
    try {
      const response = await apiService.getConnectionsForToki(tokiId);
      console.log('✅ Connections for toki loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load connections for toki:', error);
      return { connections: [], toki: { id: tokiId, title: '' } };
    }
  };

  const getFriendsAttendingToki = async (tokiId: string): Promise<Array<{ id: string; name: string; avatar?: string }>> => {
    try {
      const response = await apiService.getFriendsAttendingToki(tokiId);
      console.log('✅ Friends attending toki loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load friends attending toki:', error);
      return [];
    }
  };

  const getPendingConnections = async (): Promise<any[]> => {
    try {
      // Prevent duplicate API calls
      if (isLoadingPendingConnections) {
        console.log('⏳ Pending connections already loading, returning cached data');
        return state.pendingConnections;
      }

      setIsLoadingPendingConnections(true);
      const response = await apiService.getPendingConnections();

      // Update global state
      dispatch({ type: 'SET_PENDING_CONNECTIONS', payload: response });

      console.log('✅ Pending connections loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load pending connections:', error);
      return state.pendingConnections;
    } finally {
      setIsLoadingPendingConnections(false);
    }
  };

  const sendConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.sendConnectionRequest(userId);
      console.log('✅ Connection request sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send connection request:', error);
      return false;
    }
  };

  const acceptConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.respondToConnectionRequest(userId, 'accept');

      // Find the pending connection and move it to connections
      const pendingConn = state.pendingConnections.find((p: any) =>
        (p.user?.id || p.requester_id || p.id) === userId
      );

      if (pendingConn) {
        // Remove from pending
        dispatch({
          type: 'SET_PENDING_CONNECTIONS', payload: state.pendingConnections.filter((p: any) =>
            (p.user?.id || p.requester_id || p.id) !== userId
          )
        });

        // Add to connections (need to fetch full connection data)
        await getConnections();
      }

      console.log('✅ Connection request accepted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept connection request:', error);
      return false;
    }
  };

  const declineConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.respondToConnectionRequest(userId, 'decline');

      // Remove from pending connections
      dispatch({
        type: 'SET_PENDING_CONNECTIONS', payload: state.pendingConnections.filter((p: any) =>
          (p.user?.id || p.requester_id || p.id) !== userId
        )
      });

      console.log('✅ Connection request declined successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to decline connection request:', error);
      return false;
    }
  };

  const removeConnection = async (userId: string): Promise<boolean> => {
    try {
      await apiService.removeConnection(userId);

      // Remove from global state
      dispatch({ type: 'REMOVE_CONNECTION', payload: userId });

      console.log('✅ Connection removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to remove connection:', error);
      return false;
    }
  };

  const cancelConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.cancelConnectionRequest(userId);
      // Pending requests are not in the main 'connections' state usually,
      // but we might need to refresh pending connections if we're tracking them.
      // For now, removeConnection also covers the backend side.
      console.log('✅ Connection request cancelled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel connection request:', error);
      return false;
    }
  };

  const searchUsers = async (query?: string): Promise<any[]> => {
    try {
      console.log('🔍 Searching for users with query:', query);
      const response = await apiService.searchUsers({ q: query });
      console.log('✅ API response:', response);
      console.log('✅ Users found:', response.users.length);
      return response.users;
    } catch (error) {
      console.error('❌ Failed to search users:', error);
      return [];
    }
  };

  return {
    loadCurrentUser,
    getConnections,
    getConnectionsForToki,
    getFriendsAttendingToki,
    getPendingConnections,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    removeConnection,
    cancelConnectionRequest,
    searchUsers,
  };
}
