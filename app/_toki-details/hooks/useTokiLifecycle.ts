// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: showDeleteConfirm, showRatingPrompt, participantsForRating, isCompleting,
//       showHostOnlyConfirm.
// Handles: handleEditPress, handleDeletePress, handleConfirmDelete, handleCancelDelete,
//          handleCompleteEvent, completeEventAfterRatings, handleBoostManagePress.

import { useState, Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { TokiDetails } from '../data';

interface UseTokiLifecycleArgs {
  toki: TokiDetails | null;
  setToki: Dispatch<SetStateAction<TokiDetails | null>>;
  state: any;
  actions: any;
}

export function useTokiLifecycle({ toki, setToki, state, actions }: UseTokiLifecycleArgs) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [participantsForRating, setParticipantsForRating] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
  }>>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showHostOnlyConfirm, setShowHostOnlyConfirm] = useState(false);

  const handleEditPress = () => {
    if (!toki) return;
    console.log('Edit Toki pressed for:', toki.id);
    router.push(`/edit-toki?tokiId=${toki.id}`);
  };

  const handleDeletePress = () => {
    if (!toki) return;
    console.log('🗑️ Delete button pressed for Toki:', toki.id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!toki) return;

    console.log('🗑️ User confirmed delete for Toki:', toki.id);
    try {
      console.log('🗑️ Calling deleteTokiBackend...');
      const success = await actions.deleteTokiBackend(toki.id);
      console.log('🗑️ Delete result:', success);
      if (success) {
        console.log('✅ Delete successful, navigating back');
        router.back();
      } else {
        console.log('❌ Delete failed');
      }
    } catch (error) {
      console.error('❌ Error deleting Toki:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    console.log('❌ Delete cancelled');
    setShowDeleteConfirm(false);
  };

  const completeEventAfterRatings = async () => {
    if (!toki) return;

    console.log('🚀 Starting completeEventAfterRatings for Toki:', toki.id);
    setIsCompleting(true);

    try {
      console.log('🚀 Calling actions.completeToki...');
      const success = await actions.completeToki(toki.id);
      console.log('🚀 completeToki result:', success);

      if (success) {
        console.log('🚀 Updating local state...');
        setToki(prev => prev ? ({
          ...prev,
          joinStatus: 'completed',
        }) : null);

        console.log('🚀 Showing success alert...');
        Alert.alert(
          'Event Completed',
          'Your event has been marked as completed!',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🚀 Navigating to explore page...');
                router.push('/(tabs)');
              }
            }
          ]
        );

        // Fallback navigation in case the alert doesn't work
        setTimeout(() => {
          console.log('🚀 Fallback navigation to explore page...');
          router.push('/(tabs)');
        }, 2000);
        console.log('✅ Event completed for Toki:', toki.id);
      } else {
        console.log('❌ completeToki returned false');
        Alert.alert('Error', 'Failed to complete the event. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error completing event:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCompleteEvent = async () => {
    if (!toki || !state.currentUser) return;
    if (!toki.isHostedByUser) {
      Alert.alert('Permission Denied', 'Only the host can complete the event.');
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to complete event. Please check your connection and try again.');
      return;
    }

    // Prepare participants data for rating
    const participants: Array<{
      id: string;
      name: string;
      avatar?: string;
      isHost: boolean;
    }> = [];

    if (toki.participants && Array.isArray(toki.participants)) {
      console.log('🎯 Participants from backend:', toki.participants);
      toki.participants.forEach(participant => {
        if (participant.id !== state.currentUser.id) {
          participants.push({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            isHost: false,
          });
        }
      });
    } else {
      console.log('⚠️ No participants data from backend:', toki.participants);
    }

    console.log('🎯 Final participants for rating:', participants);

    if (participants.length > 0) {
      try {
        const ratingsCheck = await actions.checkRatingsForToki(toki.id);
        if (ratingsCheck.success && ratingsCheck.data) {
          const alreadyRatedIds = ratingsCheck.data.data.alreadyRatedUserIds || [];
          const unratedParticipants = participants.filter(p => !alreadyRatedIds.includes(p.id));

          console.log('🎯 Already rated participants:', alreadyRatedIds);
          console.log('🎯 Unrated participants:', unratedParticipants.map(p => p.id));

          if (unratedParticipants.length === 0) {
            console.log('🎯 All participants already rated, completing event directly');
            await completeEventAfterRatings();
            return;
          } else {
            setParticipantsForRating(unratedParticipants);
            setShowRatingPrompt(true);
          }
        } else {
          setParticipantsForRating(participants);
          setShowRatingPrompt(true);
        }
      } catch (error) {
        console.error('❌ Error checking ratings:', error);
        setParticipantsForRating(participants);
        setShowRatingPrompt(true);
      }
    } else {
      console.log('🚀 No participants to rate, completing event immediately...');
      await completeEventAfterRatings();
    }
  };

  const handleBoostManagePress = () => {
    if (!toki) return;
    router.push({
      pathname: '/boost-manage' as any,
      params: {
        tokiId: toki.id,
        title: toki.title,
      },
    });
  };

  return {
    showDeleteConfirm,
    setShowDeleteConfirm,
    showRatingPrompt,
    setShowRatingPrompt,
    participantsForRating,
    isCompleting,
    showHostOnlyConfirm,
    setShowHostOnlyConfirm,
    handleEditPress,
    handleDeletePress,
    handleConfirmDelete,
    handleCancelDelete,
    handleCompleteEvent,
    completeEventAfterRatings,
    handleBoostManagePress,
  };
}
