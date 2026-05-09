import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { getAppVersion } from '@/services/appVersion';

import type { DeviceVersionInfo } from './types';

const getConfiguredBuild = (): string | null => {
  const expoConfig = Constants.expoConfig;

  if (Platform.OS === 'ios') {
    const buildNumber = expoConfig?.ios?.buildNumber;
    return typeof buildNumber === 'string' && buildNumber.length > 0 ? buildNumber : null;
  }

  if (Platform.OS === 'android') {
    const versionCode = expoConfig?.android?.versionCode;
    if (typeof versionCode === 'number' && Number.isFinite(versionCode)) {
      return String(versionCode);
    }
  }

  return null;
};

const getRuntimeVersion = (): string | null => {
  const runtimeVersion = (Updates as any)?.runtimeVersion ?? Constants.expoConfig?.runtimeVersion;
  return typeof runtimeVersion === 'string' && runtimeVersion.length > 0 ? runtimeVersion : null;
};

const getUpdateChannel = (): string | null => {
  const channel = (Updates as any)?.channel;
  return typeof channel === 'string' && channel.length > 0 ? channel : null;
};

const getUpdateId = (): string | null => {
  const updateId = (Updates as any)?.updateId;
  return typeof updateId === 'string' && updateId.length > 0 ? updateId : null;
};

export const getDeviceVersionInfo = (): DeviceVersionInfo => {
  return {
    platform: Platform.OS as DeviceVersionInfo['platform'],
    appVersion: getAppVersion(),
    appBuild: getConfiguredBuild(),
    runtimeVersion: getRuntimeVersion(),
    updateId: getUpdateId(),
    updateChannel: getUpdateChannel(),
    isEmbeddedLaunch: Boolean((Updates as any)?.isEmbeddedLaunch),
  };
};

export const getVersionHeaders = (deviceInfo: DeviceVersionInfo): Record<string, string> => {
  const headers: Record<string, string> = {
    'x-platform': deviceInfo.platform,
    'x-app-version': deviceInfo.appVersion,
  };

  if (deviceInfo.appBuild) {
    headers['x-app-build'] = deviceInfo.appBuild;
  }

  if (deviceInfo.runtimeVersion) {
    headers['x-runtime-version'] = deviceInfo.runtimeVersion;
  }

  if (deviceInfo.updateId) {
    headers['x-update-id'] = deviceInfo.updateId;
  }

  if (deviceInfo.updateChannel) {
    headers['x-update-channel'] = deviceInfo.updateChannel;
  }

  return headers;
};
