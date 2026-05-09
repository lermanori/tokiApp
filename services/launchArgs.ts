import { NativeModules, Platform } from 'react-native';

type LaunchArgsMap = Record<string, string>;

const readLaunchArgs = (): LaunchArgsMap => {
  if (Platform.OS !== 'ios') {
    return {};
  }

  const launchArgs = NativeModules?.TokiLaunchArgs?.launchArgs;
  if (!launchArgs || typeof launchArgs !== 'object') {
    return {};
  }

  return launchArgs as LaunchArgsMap;
};

const launchArgs = readLaunchArgs();

export const getLaunchArg = (key: string): string | undefined => {
  const value = launchArgs[key];
  return typeof value === 'string' ? value : undefined;
};

export const isRealtimeDisabledForE2E = (): boolean => {
  const rawValue = getLaunchArg('TOKI_E2E_DISABLE_REALTIME');
  return rawValue === '1' || rawValue === 'true';
};

export const isOtaDisabledForE2E = (): boolean => {
  const rawValue = getLaunchArg('TOKI_E2E_DISABLE_OTA');
  return rawValue === '1' || rawValue === 'true';
};
