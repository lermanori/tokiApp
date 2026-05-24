import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import Share from 'react-native-share';

const FACEBOOK_APP_ID: string =
  (Constants.expoConfig?.extra as any)?.FACEBOOK_APP_ID ||
  process.env.FACEBOOK_APP_ID ||
  '';

export class InstagramNotAvailableError extends Error {
  constructor(message = 'Instagram is not installed') {
    super(message);
    this.name = 'InstagramNotAvailableError';
  }
}

export interface ShareToStoryInput {
  stickerBase64: string;
  backgroundBase64: string;
  attributionUrl: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
}

export const isInstagramAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'ios') {
      // Requires LSApplicationQueriesSchemes to include "instagram-stories".
      return await Linking.canOpenURL('instagram-stories://share');
    }
    // Android: react-native-share's isPackageInstalled works here.
    const installed = await Share.isPackageInstalled('com.instagram.android');
    return !!installed?.isInstalled;
  } catch {
    return false;
  }
};

export const shareTokiToInstagramStory = async (
  input: ShareToStoryInput,
): Promise<void> => {
  if (!FACEBOOK_APP_ID) {
    throw new Error('Missing FACEBOOK_APP_ID in expo config extras');
  }

  const available = await isInstagramAvailable();
  if (!available) throw new InstagramNotAvailableError();

  const stickerImage = input.stickerBase64.startsWith('data:')
    ? input.stickerBase64
    : `data:image/png;base64,${input.stickerBase64}`;
  const backgroundImage = input.backgroundBase64.startsWith('data:')
    ? input.backgroundBase64
    : `data:image/png;base64,${input.backgroundBase64}`;

  await Share.shareSingle({
    social: Share.Social.INSTAGRAM_STORIES as any,
    appId: FACEBOOK_APP_ID,
    backgroundImage,
    stickerImage,
    attributionURL: input.attributionUrl,
    backgroundTopColor: input.backgroundTopColor ?? '#8B5CF6',
    backgroundBottomColor: input.backgroundBottomColor ?? '#5B21B6',
  });
};
