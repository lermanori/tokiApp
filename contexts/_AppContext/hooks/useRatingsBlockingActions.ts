// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1527-1687.
// Self-contained: same-hook calls (submitRating→getUserRatings, blockUser→loadBlockedUsers, etc.)

import { Dispatch } from 'react';
import { apiService, BlockStatus } from '../../../services/api';
import type { AppState, AppAction } from '../types';

export function useRatingsBlockingActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
) {
  const getUserRatings = async (userId: string) => {
    try {
      const response: any = await apiService.getUserRatings(userId);
      dispatch({
        type: 'SET_USER_RATINGS',
        payload: {
          userId,
          ratings: response.ratings,
          stats: response.stats
        }
      });
      console.log('✅ User ratings loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load user ratings:', error);
    }
  };

  const submitRating = async (ratedUserId: string, tokiId: string, rating: number, reviewText?: string): Promise<boolean> => {
    try {
      const response: any = await apiService.submitRating(ratedUserId, tokiId, rating, reviewText);
      if (response?.success) {
        // Reload ratings to get updated data
        await getUserRatings(ratedUserId);
        console.log('✅ Rating submitted successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to submit rating:', error);
      return false;
    }
  };

  const updateRating = async (ratingId: string, rating: number, reviewText?: string): Promise<boolean> => {
    try {
      const response = await apiService.updateRating(ratingId, rating, reviewText);
      if (response.success) {
        // Reload ratings to get updated data
        await getUserRatings(state.currentUser.id);
        console.log('✅ Rating updated successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to update rating:', error);
      return false;
    }
  };

  const deleteRating = async (ratingId: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteRating(ratingId);
      if (response.success) {
        // Reload ratings to get updated data
        await getUserRatings(state.currentUser.id);
        console.log('✅ Rating deleted successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to delete rating:', error);
      return false;
    }
  };

  const getUserRatingStats = async (userId: string): Promise<void> => {
    try {
      const response = await apiService.getUserRatingStats(userId);
      if (response.success) {
        // Store rating stats in state using existing action type
        dispatch({
          type: 'SET_USER_RATINGS',
          payload: {
            userId,
            ratings: [], // Empty array since we're only getting stats
            stats: response.data
          }
        });
        console.log('✅ User rating stats loaded successfully');
      } else {
        console.error('❌ Failed to load user rating stats:', response.message);
      }
    } catch (error) {
      console.error('❌ Failed to load user rating stats:', error);
    }
  };

  const checkRatingsForToki = async (tokiId: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const response = await apiService.checkRatingsForToki(tokiId);
      return response;
    } catch (error) {
      console.error('❌ Failed to check ratings for Toki:', error);
      return { success: false, message: 'Failed to check ratings' };
    }
  };

  // Blocking actions
  const loadBlockedUsers = async () => {
    try {
      const response = await apiService.getBlockedUsers();
      dispatch({ type: 'SET_BLOCKED_USERS', payload: response.blockedUsers });
      console.log('✅ Blocked users loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load blocked users:', error);
    }
  };

  const loadBlockedByUsers = async () => {
    try {
      const response = await apiService.getBlockedByUsers();
      dispatch({ type: 'SET_BLOCKED_BY_USERS', payload: response.blockedBy });
      console.log('✅ Users who blocked me loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load users who blocked me:', error);
    }
  };

  const blockUser = async (userId: string, reason?: string): Promise<boolean> => {
    try {
      const response = await apiService.blockUser(userId, reason);
      if (response.success) {
        // Reload blocked users list
        await loadBlockedUsers();
        console.log('✅ User blocked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to block user:', error);
      return false;
    }
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await apiService.unblockUser(userId);
      if (response.success) {
        // Reload blocked users list
        await loadBlockedUsers();
        console.log('✅ User unblocked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to unblock user:', error);
      return false;
    }
  };

  const checkBlockStatus = async (userId: string): Promise<BlockStatus> => {
    try {
      const status = await apiService.checkBlockStatus(userId);
      console.log('✅ Block status checked successfully');
      return status;
    } catch (error) {
      console.error('❌ Failed to check block status:', error);
      return { blockedByMe: false, blockedByThem: false, canInteract: true };
    }
  };

  return {
    getUserRatings,
    submitRating,
    updateRating,
    deleteRating,
    getUserRatingStats,
    checkRatingsForToki,
    loadBlockedUsers,
    loadBlockedByUsers,
    blockUser,
    unblockUser,
    checkBlockStatus,
  };
}
