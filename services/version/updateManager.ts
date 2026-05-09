import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

import { isOtaDisabledForE2E } from '@/services/launchArgs';

export interface OtaCheckResult {
  isAvailable: boolean;
}

export const canUseOtaUpdates = (): boolean => {
  if (isOtaDisabledForE2E()) {
    return false;
  }

  if (Platform.OS === 'web') {
    return false;
  }

  return typeof (Updates as any)?.checkForUpdateAsync === 'function';
};

export const checkForOtaUpdate = async (): Promise<OtaCheckResult> => {
  if (!canUseOtaUpdates()) {
    return { isAvailable: false };
  }

  const result = await Updates.checkForUpdateAsync();
  return { isAvailable: Boolean(result.isAvailable) };
};

export const fetchOtaUpdate = async (): Promise<boolean> => {
  if (!canUseOtaUpdates()) {
    return false;
  }

  const result = await Updates.fetchUpdateAsync();
  return result.isNew ?? false;
};

export const reloadToApplyUpdate = async (): Promise<void> => {
  if (!canUseOtaUpdates()) {
    return;
  }

  await Updates.reloadAsync();
};
