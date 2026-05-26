// Phase-2 hook extraction from app/toki-details.tsx.
// Owns: showReportModal.
// Handles: handleReportToki.

import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { TokiDetails } from '../data';

interface UseReportFlowArgs {
  toki: TokiDetails | null;
  actions: any;
}

export function useReportFlow({ toki, actions }: UseReportFlowArgs) {
  const [showReportModal, setShowReportModal] = useState(false);

  const handleReportToki = async (reason: string) => {
    if (!toki) return;

    if (!actions.requireAuthForIntent({
      route: '/toki-details',
      params: { tokiId: toki.id },
    })) {
      return;
    }

    try {
      const success = await actions.reportToki(toki.id, reason);
      if (!success) {
        throw new Error('Failed to report Toki');
      }

      console.log('🔄 [TOKI DETAILS] Refreshing feeds after report...');
      await actions.loadTokis();

      Alert.alert(
        'Toki Reported',
        'Thank you for your report. This Toki has been hidden from your feed while we review it. You\'ll be able to see it again if our review determines it doesn\'t violate our guidelines.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reporting Toki:', error);
      throw error;
    }
  };

  return {
    showReportModal,
    setShowReportModal,
    handleReportToki,
  };
}
