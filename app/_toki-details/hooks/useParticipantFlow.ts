// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: showParticipantsModal, showRemoveConfirm, participantsSearch, participantToRemove,
//       isRemovingParticipant.
// Handles: handleRemoveParticipant, handleOpenParticipantsModal, handleRemoveParticipantFromModal,
//          confirmRemoveParticipant, cancelRemoveParticipant.

import { useState, Dispatch, SetStateAction } from 'react';
import Toast from 'react-native-toast-message';
import { apiService } from '@/services/api';
import { TokiDetails } from '../data';

interface UseParticipantFlowArgs {
  toki: TokiDetails | null;
  setToki: Dispatch<SetStateAction<TokiDetails | null>>;
  actions: any;
}

export function useParticipantFlow({ toki, setToki, actions }: UseParticipantFlowArgs) {
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [participantToRemove, setParticipantToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingParticipant, setIsRemovingParticipant] = useState(false);

  const handleRemoveParticipant = (userId: string, participantName: string) => {
    console.log('🔴 Remove participant button pressed for:', userId, participantName);
    if (!toki) {
      console.log('❌ No toki found');
      return;
    }

    setParticipantToRemove({ id: userId, name: participantName });
    setShowRemoveConfirm(true);
  };

  const handleOpenParticipantsModal = () => {
    setParticipantsSearch('');
    setShowParticipantsModal(true);
  };

  const handleRemoveParticipantFromModal = async (participantId: string) => {
    if (!toki?.id) return;

    setIsRemovingParticipant(true);
    try {
      const response = await apiService.removeParticipant(toki.id, participantId);

      if (response.success) {
        setToki(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants?.filter(p => p.id !== participantId) || [],
            attendees: Math.max(0, (prev.attendees || 0) - 1)
          };
        });

        Toast.show({
          type: 'success',
          text1: 'Participant Removed',
          text2: 'The participant has been removed from the event'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to remove participant'
        });
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove participant'
      });
    } finally {
      setIsRemovingParticipant(false);
    }
  };

  const confirmRemoveParticipant = async () => {
    if (!toki || !participantToRemove) return;

    console.log('🔴 User confirmed removal, calling API...');
    try {
      const success = await actions.removeParticipant(toki.id, participantToRemove.id);
      if (success) {
        console.log('✅ Participant removed successfully');
        Toast.show({
          type: 'success',
          text1: 'Participant Removed',
          text2: `${participantToRemove.name} has been removed from the event`,
          position: 'top',
          visibilityTime: 3000,
          topOffset: 60,
        });
      } else {
        console.log('❌ Failed to remove participant');
        Toast.show({
          type: 'error',
          text1: 'Remove Failed',
          text2: 'Failed to remove participant',
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60,
        });
      }
    } catch (e) {
      console.error('❌ Error removing participant:', e);
      Toast.show({
        type: 'error',
        text1: 'Remove Failed',
        text2: 'Failed to remove participant',
        position: 'top',
        visibilityTime: 4000,
        topOffset: 60,
      });
    } finally {
      setShowRemoveConfirm(false);
      setParticipantToRemove(null);
    }
  };

  const cancelRemoveParticipant = () => {
    setShowRemoveConfirm(false);
    setParticipantToRemove(null);
  };

  return {
    showParticipantsModal,
    setShowParticipantsModal,
    showRemoveConfirm,
    participantsSearch,
    setParticipantsSearch,
    participantToRemove,
    isRemovingParticipant,
    handleRemoveParticipant,
    handleOpenParticipantsModal,
    handleRemoveParticipantFromModal,
    confirmRemoveParticipant,
    cancelRemoveParticipant,
  };
}
