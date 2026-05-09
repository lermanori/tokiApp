import type {
  CachedVersionPolicyEnvelope,
  SupportState,
  UnsupportedVersionPayload,
  VersionPolicy,
  VersionSupportPayload,
} from './types';

export const VERSION_POLICY_STORAGE_KEY = 'toki_version_policy';

const BLOCKING_STATES = new Set<SupportState>(['maintenance', 'requires_ota', 'requires_store']);

export const isPolicyBlocking = (supportState: SupportState): boolean => {
  return BLOCKING_STATES.has(supportState);
};

export const isPolicyStillValid = (
  policy: Pick<VersionPolicy, 'validUntil'> | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!policy?.validUntil) {
    return false;
  }

  const validUntil = Date.parse(policy.validUntil);
  if (!Number.isFinite(validUntil)) {
    return false;
  }

  return validUntil > now.getTime();
};

export const getValidCachedPolicy = (
  cachedEnvelope: CachedVersionPolicyEnvelope | null,
  now: Date = new Date(),
): VersionPolicy | null => {
  if (!cachedEnvelope?.policy) {
    return null;
  }

  return isPolicyStillValid(cachedEnvelope.policy, now) ? cachedEnvelope.policy : null;
};

export const shouldTryOtaForPolicy = (policy: VersionPolicy): boolean => {
  return policy.support.state === 'requires_ota';
};

export const getSoftPromptFromPolicy = (support: VersionSupportPayload) => {
  if (support.state !== 'soft_outdated') {
    return null;
  }

  return {
    title: support.title || 'Update available',
    message: support.message || 'A newer version of Toki is available.',
    mode: 'soft_update' as const,
    storeUrl: support.storeUrl ?? null,
  };
};

export const buildUnsupportedPolicyFromApi = (
  payload: UnsupportedVersionPayload,
): VersionPolicy => {
  return {
    policyVersion: 'api-unsupported',
    ttlSeconds: 300,
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    support: {
      state: payload.state,
      title: payload.title,
      message: payload.message,
      delivery: payload.delivery,
      storeUrl: payload.storeUrl ?? null,
    },
    maintenance: {
      active: payload.state === 'maintenance',
      title: payload.title,
      message: payload.message,
      eta: null,
    },
  };
};
