export type BackendSupportState =
  | 'supported'
  | 'soft_outdated'
  | 'requires_ota'
  | 'requires_store'
  | 'maintenance';

type Platform = 'ios' | 'android' | 'web';

export interface ClientVersionMetadata {
  platform: Platform;
  appVersion: string | null;
  appBuild: number | null;
  runtimeVersion: string | null;
  updateId: string | null;
  updateChannel: string | null;
}

export interface BackendVersionPolicy {
  policyVersion: string;
  ttlSeconds: number;
  validUntil: string;
  support: {
    state: BackendSupportState;
    reasonCode: string | null;
    title: string | null;
    message: string | null;
    delivery: 'none' | 'ota' | 'store';
    minVersion: {
      ios: string | null;
      android: string | null;
    };
    minBuild: {
      ios: number | null;
      android: number | null;
    };
    recommendedVersion: {
      ios: string | null;
      android: string | null;
    };
    recommendedBuild: {
      ios: number | null;
      android: number | null;
    };
    supportedRuntimes: string[];
    storeUrl: {
      ios: string | null;
      android: string | null;
    };
  };
  maintenance: {
    active: boolean;
    title: string | null;
    message: string | null;
    eta: string | null;
  };
}

const DEFAULT_RUNTIME_VERSION = '1.0.1';
const DEFAULT_TTL_SECONDS = 300;

const compareSemver = (left: string, right: string): number => {
  const leftParts = left.split('.').map((part) => parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
};

const parseNumber = (rawValue: string | undefined): number | null => {
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const parseRuntimeList = (): string[] => {
  const rawValue = process.env.MOBILE_SUPPORTED_RUNTIMES;
  if (!rawValue) {
    return [DEFAULT_RUNTIME_VERSION];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const getPlatformValue = <T>(platform: Platform, values: { ios: T; android: T }): T | null => {
  if (platform === 'ios') {
    return values.ios;
  }

  if (platform === 'android') {
    return values.android;
  }

  return null;
};

const buildStoreUpdateMessage = (
  platform: Platform,
  storeUrl: { ios: string | null; android: string | null },
): string => {
  const baseMessage = 'This version of Toki is no longer supported. Please update to continue in the App Store.';
  const targetUrl = getPlatformValue(platform, storeUrl);

  if (!targetUrl) {
    return baseMessage;
  }

  return `${baseMessage} Or update here: ${targetUrl}`;
};

const isBelowMinimumVersion = (
  currentVersion: string | null,
  minimumVersion: string | null,
): boolean => {
  if (!currentVersion || !minimumVersion) {
    return false;
  }

  return compareSemver(currentVersion, minimumVersion) < 0;
};

const isBelowBuild = (currentBuild: number | null, minimumBuild: number | null): boolean => {
  if (currentBuild === null || minimumBuild === null) {
    return false;
  }

  return currentBuild < minimumBuild;
};

const getRequiredDelivery = (runtimeSupported: boolean): 'ota' | 'store' => {
  const mode = process.env.MOBILE_REQUIRED_UPDATE_DELIVERY || 'auto';

  if (mode === 'store') {
    return 'store';
  }

  if (mode === 'ota') {
    return runtimeSupported ? 'ota' : 'store';
  }

  return runtimeSupported ? 'ota' : 'store';
};

export const createUnsupportedVersionErrorPayload = (
  policy: BackendVersionPolicy,
) => ({
  success: false,
  code: 'APP_VERSION_UNSUPPORTED',
  supportState: policy.support.state,
  title: policy.support.title,
  message: policy.support.message,
  storeUrl: policy.support.storeUrl,
});

export const evaluateVersionPolicy = (
  client: ClientVersionMetadata,
  now: Date = new Date(),
): BackendVersionPolicy => {
  const ttlSeconds = parseNumber(process.env.MOBILE_POLICY_TTL_SECONDS) ?? DEFAULT_TTL_SECONDS;
  const supportedRuntimes = parseRuntimeList();
  const minVersion = {
    ios: process.env.MOBILE_MIN_VERSION_IOS ?? null,
    android: process.env.MOBILE_MIN_VERSION_ANDROID ?? null,
  };
  const minBuild = {
    ios: parseNumber(process.env.MOBILE_MIN_BUILD_IOS),
    android: parseNumber(process.env.MOBILE_MIN_BUILD_ANDROID),
  };
  const recommendedVersion = {
    ios: process.env.MOBILE_SOFT_VERSION_IOS ?? null,
    android: process.env.MOBILE_SOFT_VERSION_ANDROID ?? null,
  };
  const recommendedBuild = {
    ios: parseNumber(process.env.MOBILE_SOFT_BUILD_IOS),
    android: parseNumber(process.env.MOBILE_SOFT_BUILD_ANDROID),
  };
  const storeUrl = {
    ios: process.env.MOBILE_STORE_URL_IOS ?? null,
    android: process.env.MOBILE_STORE_URL_ANDROID ?? null,
  };

  const maintenanceActive = process.env.MOBILE_MAINTENANCE_ACTIVE === 'true';
  const runtimeSupported = client.platform === 'web'
    ? true
    : !client.runtimeVersion || supportedRuntimes.includes(client.runtimeVersion);

  const platformMinVersion = getPlatformValue(client.platform, minVersion);
  const platformMinBuild = getPlatformValue(client.platform, minBuild);
  const platformRecommendedVersion = getPlatformValue(client.platform, recommendedVersion);
  const platformRecommendedBuild = getPlatformValue(client.platform, recommendedBuild);

  let supportState: BackendSupportState = 'supported';
  let reasonCode: string | null = null;
  let title: string | null = null;
  let message: string | null = null;
  let delivery: 'none' | 'ota' | 'store' = 'none';

  if (maintenanceActive) {
    supportState = 'maintenance';
    reasonCode = 'MAINTENANCE_MODE';
    title = process.env.MOBILE_MAINTENANCE_TITLE || 'Toki is under maintenance';
    message = process.env.MOBILE_MAINTENANCE_MESSAGE || 'We’ll be back shortly.';
  } else if (!runtimeSupported) {
    supportState = 'requires_store';
    reasonCode = 'RUNTIME_UNSUPPORTED';
    title = 'Update required';
    message = buildStoreUpdateMessage(client.platform, storeUrl);
    delivery = 'store';
  } else if (
    isBelowMinimumVersion(client.appVersion, platformMinVersion)
    || isBelowBuild(client.appBuild, platformMinBuild)
  ) {
    const requiredDelivery = getRequiredDelivery(runtimeSupported);
    supportState = requiredDelivery === 'ota' ? 'requires_ota' : 'requires_store';
    reasonCode = 'MIN_BUILD_TOO_OLD';
    title = requiredDelivery === 'ota' ? 'Updating Toki' : 'Update required';
    message = requiredDelivery === 'ota'
      ? 'We need to install the latest fixes before you continue.'
      : buildStoreUpdateMessage(client.platform, storeUrl);
    delivery = requiredDelivery;
  } else if (
    isBelowMinimumVersion(client.appVersion, platformRecommendedVersion)
    || isBelowBuild(client.appBuild, platformRecommendedBuild)
  ) {
    supportState = 'soft_outdated';
    reasonCode = 'NEWER_BUILD_AVAILABLE';
    title = 'New version available';
    message = 'Update soon for the best experience.';
    delivery = 'store';
  }

  return {
    policyVersion: process.env.MOBILE_POLICY_VERSION || now.toISOString().slice(0, 10),
    ttlSeconds,
    validUntil: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    support: {
      state: supportState,
      reasonCode,
      title,
      message,
      delivery,
      minVersion,
      minBuild,
      recommendedVersion,
      recommendedBuild,
      supportedRuntimes,
      storeUrl,
    },
    maintenance: {
      active: maintenanceActive,
      title: maintenanceActive ? (process.env.MOBILE_MAINTENANCE_TITLE || 'Toki is under maintenance') : null,
      message: maintenanceActive ? (process.env.MOBILE_MAINTENANCE_MESSAGE || 'We’ll be back shortly.') : null,
      eta: process.env.MOBILE_MAINTENANCE_ETA || null,
    },
  };
};
