// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: isJoining, showCancelRequestModal.
// Handles: handleJoinRequest, handleCancelRequest, handleChatPress, openHostChat,
// navigation helpers (navigateToExplore, navigateToUserProfile, canAccessChat),
// and button getters (getJoinButtonText, getJoinButtonColor).

import { useState, Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { apiService } from '@/services/api';
import { TokiDetails } from '../data';

interface UseJoinFlowArgs {
  toki: TokiDetails | null;
  setToki: Dispatch<SetStateAction<TokiDetails | null>>;
  state: any;
  actions: any;
  features: any;
  notifOptIn: { maybePrompt: () => void };
  loadTokiData: (tokiId: string, retryCount?: number) => Promise<void>;
}

export function useJoinFlow({
  toki,
  setToki,
  state,
  actions,
  features,
  notifOptIn,
  loadTokiData,
}: UseJoinFlowArgs) {
  const [isJoining, setIsJoining] = useState(false);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);

  const navigateToExplore = () => {
    if (!actions.requireAuthForIntent({ route: '/exMap' })) {
      return;
    }
    router.push('/exMap');
  };

  const navigateToUserProfile = (userId: string) => {
    if (!actions.requireAuthForIntent({
      route: `/user-profile/${userId}`,
      params: { userId },
    })) {
      return;
    }

    router.push({
      pathname: '/user-profile/[userId]',
      params: { userId }
    });
  };

  const openHostChat = () => {
    if (!toki) return;

    const hostId = toki.host.id || toki.hostId;
    if (!hostId) {
      Alert.alert('Error', 'Unable to identify host for chat.');
      return;
    }

    if (!actions.requireAuthForIntent({
      route: '/chat',
      params: {
        otherUserId: hostId,
        otherUserName: toki.host.name,
        isGroup: 'false',
      },
    })) {
      return;
    }

    router.push({
      pathname: '/chat',
      params: {
        otherUserId: hostId,
        otherUserName: toki.host.name,
        isGroup: 'false',
      }
    });
  };

  const handleChatPress = () => {
    if (!toki) return;

    if (!actions.requireAuthForIntent({
      route: '/toki-details',
      params: {
        tokiId: toki.id,
        resumeAction: 'chat',
      },
    })) {
      return;
    }

    // Only allow chat access if user is approved
    if (toki.joinStatus === 'approved' || toki.isHostedByUser) {
      if (features.boosts) {
        apiService.trackEngagement(toki.id, 'chat_join').catch((error: any) => {
          console.warn('⚠️ Failed to track chat join engagement:', error);
        });
      }
      router.push({
        pathname: '/chat',
        params: {
          tokiId: toki.id,
          otherUserName: toki.title,
          isGroup: 'true'
        }
      });
    } else {
      Alert.alert(
        'Chat Access Restricted',
        'You need to be approved by the host to access the group chat. Please send a join request first.'
      );
    }
  };

  const handleJoinRequest = async () => {
    if (!toki) return;

    if (!actions.requireAuthForIntent({
      route: '/toki-details',
      params: {
        tokiId: toki.id,
        resumeAction: 'join',
      },
    })) {
      return;
    }

    if (toki.isHostedByUser) {
      Alert.alert('Your Event', 'This is your event! You can manage it from your profile.');
      return;
    }

    // If user is already approved, navigate to chat
    if (toki.joinStatus === 'approved') {
      handleChatPress();
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to join. Please check your connection and try again.');
      return;
    }

    setIsJoining(true);

    try {
      switch (toki.joinStatus) {
        case 'not_joined': {
          const joinResultStatus = await actions.sendJoinRequest(toki.id);
          if (joinResultStatus === 'approved') {
            setToki(prev => prev ? ({ ...prev, joinStatus: 'approved' }) : null);
            setTimeout(() => { loadTokiData(toki.id); }, 300);
            console.log('✅ Auto-joined via invite for Toki:', toki.id);
            notifOptIn.maybePrompt();
          } else if (joinResultStatus === 'pending') {
            setToki(prev => prev ? ({ ...prev, joinStatus: 'pending' }) : null);
            console.log('✅ Join request pending for Toki:', toki.id);
            notifOptIn.maybePrompt();
          } else {
            Alert.alert('Error', 'Failed to send join request. Please try again.');
          }
          break;
        }

        case 'pending':
          setShowCancelRequestModal(true);
          break;
      }
    } catch (error) {
      console.error('❌ Error joining Toki:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!toki) return;

    setShowCancelRequestModal(false);

    try {
      const success = await actions.cancelJoinRequest(toki.id);
      if (success) {
        setToki(prev => prev ? ({ ...prev, joinStatus: 'not_joined' }) : null);
        console.log('✅ Join request cancelled for Toki:', toki.id);
      } else {
        Alert.alert('Error', 'Failed to cancel join request. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error cancelling join request:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const getJoinButtonText = () => {
    if (!toki) return 'Join';
    if (toki.isHostedByUser) return 'Your Event';

    switch (toki.joinStatus) {
      case 'not_joined': return 'I want to join';
      case 'pending': return 'Request Pending';
      case 'approved': return 'Join Chat';
      default: return 'I want to join';
    }
  };

  const getJoinButtonColor = () => {
    if (!toki) return '#4DC4AA';
    if (toki.isHostedByUser) return '#B49AFF';

    switch (toki.joinStatus) {
      case 'not_joined': return '#4DC4AA';
      case 'pending': return '#F9E79B';
      case 'approved': return '#4DC4AA';
      default: return '#4DC4AA';
    }
  };

  const canAccessChat = () => {
    if (!toki) return false;
    return toki.isHostedByUser || toki.joinStatus === 'approved';
  };

  return {
    isJoining,
    showCancelRequestModal,
    setShowCancelRequestModal,
    handleJoinRequest,
    handleCancelRequest,
    handleChatPress,
    openHostChat,
    navigateToExplore,
    navigateToUserProfile,
    canAccessChat,
    getJoinButtonText,
    getJoinButtonColor,
  };
}
