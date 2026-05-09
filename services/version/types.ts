export type SupportState =
  | 'supported'
  | 'soft_outdated'
  | 'requires_ota'
  | 'requires_store'
  | 'maintenance';

export type UpdateDelivery = 'none' | 'ota' | 'store';

export interface VersionSupportPayload {
  state: SupportState;
  reasonCode?: string | null;
  title?: string | null;
  message?: string | null;
  delivery?: UpdateDelivery | null;
  minVersion?: {
    ios?: string | null;
    android?: string | null;
  } | null;
  minBuild?: {
    ios?: number | null;
    android?: number | null;
  } | null;
  recommendedVersion?: {
    ios?: string | null;
    android?: string | null;
  } | null;
  recommendedBuild?: {
    ios?: number | null;
    android?: number | null;
  } | null;
  supportedRuntimes?: string[] | null;
  storeUrl?: {
    ios?: string | null;
    android?: string | null;
  } | null;
}

export interface MaintenancePayload {
  active: boolean;
  title?: string | null;
  message?: string | null;
  eta?: string | null;
}

export interface VersionPolicy {
  policyVersion: string;
  ttlSeconds: number;
  validUntil: string;
  support: VersionSupportPayload;
  maintenance: MaintenancePayload;
}

export interface DeviceVersionInfo {
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  appBuild: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  updateChannel: string | null;
  isEmbeddedLaunch: boolean;
}

export interface CachedVersionPolicyEnvelope {
  savedAt: string;
  policy: VersionPolicy;
}

export interface UnsupportedVersionPayload {
  state: Extract<SupportState, 'requires_ota' | 'requires_store' | 'maintenance'>;
  title?: string | null;
  message?: string | null;
  delivery?: UpdateDelivery | null;
  storeUrl?: {
    ios?: string | null;
    android?: string | null;
  } | null;
}
