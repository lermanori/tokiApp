import { Platform } from 'react-native';
import { LaunchArguments } from 'react-native-launch-arguments';

type LaunchArgsMap = Record<string, string>;

const readLaunchArgs = (): LaunchArgsMap => {
  if (Platform.OS !== 'ios') {
    return {};
  }

  try {
    const raw = LaunchArguments.value<Record<string, unknown>>() ?? {};
    const result: LaunchArgsMap = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
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
