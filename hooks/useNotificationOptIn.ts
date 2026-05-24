import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerAndSyncPushToken } from '../utils/notifications';

const LAST_DISMISSED_KEY = '@toki/notifOptIn:lastDismissedAt';
const DISMISS_COUNT_KEY = '@toki/notifOptIn:dismissCount';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

type Mode = 'request' | 'openSettings';

export function useNotificationOptIn() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('request');

  const maybePrompt = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status === 'granted') return;

      const [dismissedAtRaw, countRaw] = await Promise.all([
        AsyncStorage.getItem(LAST_DISMISSED_KEY),
        AsyncStorage.getItem(DISMISS_COUNT_KEY),
      ]);
      const dismissCount = parseInt(countRaw || '0', 10) || 0;
      if (dismissCount >= MAX_DISMISSALS) return;

      const lastDismissedAt = parseInt(dismissedAtRaw || '0', 10) || 0;
      if (lastDismissedAt && Date.now() - lastDismissedAt < COOLDOWN_MS) return;

      const cannotReprompt = perms.status === 'denied' && perms.canAskAgain === false;
      setMode(cannotReprompt ? 'openSettings' : 'request');
      setVisible(true);
    } catch (e) {
      console.warn('[notifOptIn] maybePrompt failed:', e);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    setVisible(false);
    try {
      if (mode === 'openSettings') {
        await Linking.openSettings();
      } else {
        await registerAndSyncPushToken();
      }
    } catch (e) {
      console.warn('[notifOptIn] confirm failed:', e);
    }
  }, [mode]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      const countRaw = await AsyncStorage.getItem(DISMISS_COUNT_KEY);
      const next = (parseInt(countRaw || '0', 10) || 0) + 1;
      await AsyncStorage.multiSet([
        [LAST_DISMISSED_KEY, String(Date.now())],
        [DISMISS_COUNT_KEY, String(next)],
      ]);
    } catch (e) {
      console.warn('[notifOptIn] dismiss persist failed:', e);
    }
  }, []);

  return { visible, mode, maybePrompt, handleConfirm, handleDismiss };
}
