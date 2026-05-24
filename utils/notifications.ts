import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from '../services/api';
import { getBackendUrl } from '../services/config';

export type PushRegistration = {
  token: string | null;
  platform: 'ios' | 'android' | 'web' | 'unknown';
};

export async function registerForPushNotificationsAsync(): Promise<PushRegistration> {
  if (Platform.OS === 'web') {
    return { token: null, platform: 'web' };
  }

  if (!Device.isDevice) {
    return { token: null, platform: 'unknown' };
  }

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;
  if (finalStatus !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') {
    return { token: null, platform: Platform.OS as any };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return { token: tokenData.data, platform: Platform.OS as any };
}

export async function registerAndSyncPushToken(): Promise<PushRegistration> {
  const reg = await registerForPushNotificationsAsync();
  if (!reg.token) {
    console.warn('⚠️ [PUSH] No token available (may be simulator or permissions denied)');
    return reg;
  }
  try {
    console.log('📱 [PUSH] Registering token:', reg.token.substring(0, 20) + '...');
    const response = await fetch(`${getBackendUrl()}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await apiService.getAccessToken()}`,
      },
      body: JSON.stringify({ token: reg.token, platform: reg.platform }),
    });
    if (response.ok) {
      console.log('✅ [PUSH] Token registered successfully');
    } else {
      console.warn('⚠️ [PUSH] Token registration failed:', response.status);
    }
  } catch (e) {
    console.warn('❌ [PUSH] Token sync failed:', e);
  }
  return reg;
}

export function configureForegroundNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}


