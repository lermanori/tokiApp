import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export function configureForegroundNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}


