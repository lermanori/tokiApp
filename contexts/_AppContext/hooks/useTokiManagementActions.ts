// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1028-1387.
// 24 handlers: join requests (5), updateTokiBackend, invites (4), invite links (6),
// hide users (3), getTokiById, viewToki, removeParticipant, deleteTokiBackend, completeToki.
// Cross-hook calls via actionsRef: syncData (ConnectionSync), loadTokis (TokiDiscovery).

import { Dispatch, MutableRefObject } from 'react';
import { apiService } from '../../../services/api';
import type { AppState, AppAction } from '../types';
import { STORAGE_KEYS, storage } from '../constants';

export function useTokiManagementActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  const sendJoinRequest = async (id: string): Promise<'approved' | 'pending' | null> => {
    try {
      console.log('🔄 Sending join request to backend for Toki:', id);

      const response = await apiService.joinToki(id);

      if (response.success) {
        const backendStatus = (response.data?.status as 'approved' | 'pending' | undefined) || 'pending';
        try {
          await apiService.trackEngagement(id, 'join_request');
        } catch (trackingError) {
          console.warn('⚠️ Failed to track join engagement:', trackingError);
        }
        // Update local state to reflect backend status
        dispatch({
          type: 'UPDATE_TOKI',
          payload: {
            id,
            updates: {
              joinStatus: backendStatus,
            },
          },
        });

        // Update sync time
        setTimeout(() => actionsRef.current.syncData(), 100);

        console.log(`✅ Join flow successful with status: ${backendStatus}`);
        return backendStatus;
      } else {
        console.error('❌ Join request failed:', response.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to send join request:', error);
      return null;
    }
  };

  const cancelJoinRequest = async (tokiId: string): Promise<boolean> => {
    try {
      console.log('🔄 Cancelling join request for Toki:', tokiId);

      const response = await apiService.cancelJoinRequest(tokiId);

      if (response.success) {
        // Update local state to reflect cancellation
        dispatch({
          type: 'UPDATE_TOKI',
          payload: {
            id: tokiId,
            updates: {
              joinStatus: 'not_joined',
            },
          },
        });

        console.log('✅ Join request cancelled successfully');
        return true;
      } else {
        console.error('❌ Failed to cancel join request:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to cancel join request:', error);
      return false;
    }
  };

  const approveJoinRequest = async (tokiId: string, requestId: string): Promise<boolean> => {
    try {
      console.log('✅ Approving join request:', requestId, 'for Toki:', tokiId);

      const response = await apiService.approveJoinRequest(tokiId, requestId);

      if (response.success) {
        console.log('✅ Join request approved successfully');
        return true;
      } else {
        console.error('❌ Failed to approve join request:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to approve join request:', error);
      return false;
    }
  };

  const declineJoinRequest = async (tokiId: string, requestId: string): Promise<boolean> => {
    try {
      console.log('❌ Declining join request:', requestId, 'for Toki:', tokiId);

      const response = await apiService.declineJoinRequest(tokiId, requestId);

      if (response.success) {
        console.log('✅ Join request declined successfully');
        return true;
      } else {
        console.error('❌ Failed to decline join request:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to decline join request:', error);
      return false;
    }
  };

  const getJoinRequests = async (tokiId: string): Promise<any[]> => {
    try {
      console.log('📋 Getting join requests for Toki:', tokiId);

      const response = await apiService.getJoinRequests(tokiId);

      if (response.success) {
        console.log('✅ Retrieved join requests:', response.data.requests);
        return response.data.requests;
      } else {
        console.error('❌ Failed to get join requests');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get join requests:', error);
      return [];
    }
  };

  const updateTokiBackend = async (id: string, updates: any): Promise<boolean> => {
    console.log('📝 Updating Toki:', id, 'with updates:', updates);
    try {
      await apiService.updateToki(id, updates);

      // Update local state using existing action
      dispatch({
        type: 'UPDATE_TOKI',
        payload: { id, updates }
      });

      console.log('✅ Toki updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update Toki:', error);
      // Re-throw the error so the calling screen can handle it with ErrorModal
      throw error;
    }
  };

  // Invites actions
  const createInvite = async (tokiId: string, invitedUserId: string): Promise<boolean> => {
    try {
      const res = await apiService.createInvite(tokiId, invitedUserId);
      return !!res;
    } catch (e) {
      console.error('❌ Failed to create invite:', e);
      return false;
    }
  };

  const listInvites = async (tokiId: string): Promise<any[]> => {
    try {
      const res = await apiService.listInvites(tokiId);
      return res.data?.invites || [];
    } catch (e) {
      console.error('❌ Failed to list invites:', e);
      return [];
    }
  };

  const respondToInvite = async (tokiId: string, inviteId: string, action: 'accept' | 'decline'): Promise<boolean> => {
    try {
      await apiService.respondToInvite(tokiId, inviteId, action);
      return true;
    } catch (e) {
      console.error('❌ Failed to respond to invite:', e);
      return false;
    }
  };

  const respondToInviteViaNotification = async (notificationId: string, action: 'accept' | 'decline'): Promise<boolean> => {
    try {
      await apiService.respondToInviteViaNotification(notificationId, action);
      return true;
    } catch (e) {
      console.error('❌ Failed to respond to invite via notification:', e);
      return false;
    }
  };

  // =========================
  // Invite Links (URL-based)
  // =========================
  const generateInviteLink = async (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<any> => {
    try {
      const res: any = await apiService.generateInviteLink(tokiId, opts);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to generate invite link:', e);
      return null;
    }
  };

  const regenerateInviteLink = async (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<any> => {
    try {
      const res: any = await apiService.regenerateInviteLink(tokiId, opts);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to regenerate invite link:', e);
      return null;
    }
  };

  const deactivateInviteLink = async (linkId: string): Promise<boolean> => {
    try {
      const res: any = await apiService.deactivateInviteLink(linkId);
      return !!res?.success;
    } catch (e) {
      console.error('❌ Failed to deactivate invite link:', e);
      return false;
    }
  };

  const getInviteLinksForToki = async (tokiId: string): Promise<any> => {
    try {
      const res: any = await apiService.getInviteLinksForToki(tokiId);
      return res?.data || { links: [], activeLink: null };
    } catch (e) {
      console.error('❌ Failed to load invite links for toki:', e);
      return { links: [], activeLink: null };
    }
  };

  const getInviteLinkInfo = async (code: string): Promise<any> => {
    try {
      const res: any = await apiService.getInviteLinkInfo(code);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to get invite link info:', e);
      return null;
    }
  };

  const joinByInviteCode = async (inviteCode: string): Promise<boolean> => {
    try {
      const res: any = await apiService.joinByInviteCode(inviteCode);
      if (res?.success) {
        // Refresh tokis so joinStatus reflects approved
        setTimeout(() => actionsRef.current.loadTokis(), 100);
        return true;
      }
      return false;
    } catch (e) {
      console.error('❌ Failed to join by invite code:', e);
      return false;
    }
  };

  // Hide actions
  const hideUser = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      await apiService.hideUser(tokiId, userId);
      return true;
    } catch (e) {
      console.error('❌ Failed to hide user:', e);
      return false;
    }
  };

  const listHiddenUsers = async (tokiId: string): Promise<any[]> => {
    try {
      const res: any = await apiService.listHiddenUsers(tokiId);
      return res?.data?.hiddenUsers || [];
    } catch (e) {
      console.error('❌ Failed to list hidden users:', e);
      return [];
    }
  };

  const unhideUser = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      await apiService.unhideUser(tokiId, userId);
      return true;
    } catch (e) {
      console.error('❌ Failed to unhide user:', e);
      return false;
    }
  };

  const getTokiById = async (tokiId: string): Promise<any> => {
    try {
      const data = await apiService.getToki(tokiId);
      return data;
    } catch (e) {
      console.error('❌ Failed to get toki by id:', e);
      return null;
    }
  };
  const viewToki = async (tokiId: string): Promise<void> => {
    try {
      await apiService.viewToki(tokiId);
    } catch (e) {
      console.warn('❌ Failed to record toki view in context:', e);
    }
  };


  const removeParticipant = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      const response = await apiService.removeParticipant(tokiId, userId);
      if (response.success) {
        // Refresh the tokis data to update participants list
        setTimeout(() => actionsRef.current.loadTokis(), 100);
        return true;
      }
      return false;
    } catch (e) {
      console.error('❌ Failed to remove participant:', e);
      return false;
    }
  };

  const deleteTokiBackend = async (id: string): Promise<boolean> => {
    console.log('🗑️ Deleting Toki:', id);
    try {
      console.log('🗑️ Calling apiService.deleteToki...');
      await apiService.deleteToki(id);
      console.log('🗑️ API call successful');

      // Remove from local state
      console.log('🗑️ Updating local state...');
      const updatedTokis = state.tokis.filter(toki => toki.id !== id);
      console.log('🗑️ Tokis before:', state.tokis.length, 'after:', updatedTokis.length);

      dispatch({ type: 'SET_TOKIS', payload: updatedTokis });
      storage.set(STORAGE_KEYS.TOKIS, updatedTokis);

      console.log('✅ Toki deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete Toki:', error);
      return false;
    }
  };

  const completeToki = async (id: string): Promise<boolean> => {
    console.log('�� Completing Toki:', id);
    try {
      const response = await apiService.completeToki(id);
      if (response.success) {
        console.log('✅ Toki completed successfully');
        // Reload Tokis to get updated status
        await actionsRef.current.loadTokis();
        return true;
      } else {
        console.error('❌ Failed to complete Toki:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to complete Toki:', error);
      return false;
    }
  };

  return {
    sendJoinRequest,
    cancelJoinRequest,
    approveJoinRequest,
    declineJoinRequest,
    getJoinRequests,
    updateTokiBackend,
    createInvite,
    listInvites,
    respondToInvite,
    respondToInviteViaNotification,
    generateInviteLink,
    regenerateInviteLink,
    deactivateInviteLink,
    getInviteLinksForToki,
    getInviteLinkInfo,
    joinByInviteCode,
    hideUser,
    listHiddenUsers,
    unhideUser,
    getTokiById,
    viewToki,
    removeParticipant,
    deleteTokiBackend,
    completeToki,
  };
}
