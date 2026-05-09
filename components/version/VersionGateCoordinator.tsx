import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';

import { useVersionGate } from '@/contexts/VersionGateContext';
import {
  checkForOtaUpdate,
  fetchOtaUpdate,
  reloadToApplyUpdate,
} from '@/services/version/updateManager';
import { getDeviceVersionInfo } from '@/services/version/deviceInfo';
import {
  getSoftPromptFromPolicy,
  getValidCachedPolicy,
  isPolicyBlocking,
  shouldTryOtaForPolicy,
  VERSION_POLICY_STORAGE_KEY,
} from '@/services/version/versionGateMachine';
import { fetchVersionPolicy } from '@/services/version/versionPolicyApi';
import type { CachedVersionPolicyEnvelope, VersionPolicy } from '@/services/version/types';

import { MaintenanceScreen } from './MaintenanceScreen';
import { SoftUpdatePrompt } from './SoftUpdatePrompt';
import { VersionGateScreen } from './VersionGateScreen';

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
};

const parseCachedPolicy = async (): Promise<CachedVersionPolicyEnvelope | null> => {
  const rawValue = await AsyncStorage.getItem(VERSION_POLICY_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as CachedVersionPolicyEnvelope;
  } catch {
    return null;
  }
};

const persistPolicy = async (policy: VersionPolicy) => {
  const envelope: CachedVersionPolicyEnvelope = {
    savedAt: new Date().toISOString(),
    policy,
  };

  await AsyncStorage.setItem(VERSION_POLICY_STORAGE_KEY, JSON.stringify(envelope));
};

const openStoreUrl = async (policy: VersionPolicy | null) => {
  if (!policy) {
    return;
  }

  const targetUrl = Platform.OS === 'ios'
    ? policy.support.storeUrl?.ios
    : policy.support.storeUrl?.android;

  if (targetUrl) {
    await Linking.openURL(targetUrl);
  }
};

export const VersionGateCoordinator = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { state, setMode, setSoftPrompt } = useVersionGate();
  const hasStartedRef = useRef(false);

  const checkForBackgroundOta = useCallback(async () => {
    try {
      const otaResult = await withTimeout(
        checkForOtaUpdate(),
        5000,
        'Timed out while checking for background OTA update.',
      );

      if (!otaResult.isAvailable) {
        return;
      }

      const didFetch = await withTimeout(
        fetchOtaUpdate(),
        10000,
        'Timed out while fetching background OTA update.',
      );

      if (didFetch) {
        setSoftPrompt({
          title: 'Update ready',
          message: 'The latest Toki update is ready to install.',
          mode: 'ota_ready',
        });
      }
    } catch (error) {
      console.warn('Failed to check for background OTA update:', error);
    }
  }, [setSoftPrompt]);

  const applyNonBlockingPolicy = useCallback((policy: VersionPolicy) => {
    setMode('allowed', policy, null);

    const softPrompt = getSoftPromptFromPolicy(policy.support);
    if (softPrompt) {
      const storeUrl = Platform.OS === 'ios'
        ? policy.support.storeUrl?.ios
        : policy.support.storeUrl?.android;
      setSoftPrompt({
        title: softPrompt.title,
        message: softPrompt.message,
        mode: softPrompt.mode,
        storeUrl,
      });
    } else {
      setSoftPrompt(null);
    }
    setTimeout(() => {
      void checkForBackgroundOta();
    }, 0);
  }, [checkForBackgroundOta, setMode, setSoftPrompt]);

  const runBootstrap = useCallback(async () => {
    setMode('bootstrapping', state.policy, null);

    const deviceInfo = getDeviceVersionInfo();
    const cachedEnvelope = await parseCachedPolicy();
    const cachedPolicy = getValidCachedPolicy(cachedEnvelope);

    try {
      const policy = await withTimeout(
        fetchVersionPolicy(deviceInfo),
        8000,
        'Timed out while fetching version policy.',
      );
      await persistPolicy(policy);

      if (policy.maintenance.active || policy.support.state === 'maintenance') {
        setSoftPrompt(null);
        setMode('blocked', policy, policy.maintenance.message || policy.support.message || null);
        return;
      }

      if (shouldTryOtaForPolicy(policy)) {
        try {
          const updateAvailable = await withTimeout(
            checkForOtaUpdate(),
            5000,
            'Timed out while checking for a required OTA update.',
          );
          if (updateAvailable.isAvailable) {
            const didFetch = await withTimeout(
              fetchOtaUpdate(),
              10000,
              'Timed out while fetching a required OTA update.',
            );
            if (didFetch) {
              await reloadToApplyUpdate();
              return;
            }
          }

          setSoftPrompt(null);
          setMode('blocked', policy, policy.support.message || 'A required update could not be installed.');
          return;
        } catch (error) {
          console.warn('Required OTA update failed:', error);
          setSoftPrompt(null);
          setMode('blocked', policy, policy.support.message || 'A required update could not be installed.');
          return;
        }
      }

      if (isPolicyBlocking(policy.support.state)) {
        setSoftPrompt(null);
        setMode('blocked', policy, policy.support.message || null);
        return;
      }

      applyNonBlockingPolicy(policy);
    } catch (error) {
      console.warn('Version policy bootstrap failed:', error);

      if (cachedPolicy) {
        if (cachedPolicy.maintenance.active || isPolicyBlocking(cachedPolicy.support.state)) {
          setSoftPrompt(null);
          setMode('blocked', cachedPolicy, cachedPolicy.support.message || cachedPolicy.maintenance.message || null);
          return;
        }

        applyNonBlockingPolicy(cachedPolicy);
        return;
      }

      setSoftPrompt(null);
      setMode('allowed', null, 'Version policy unavailable, continuing with cached app state.');
    }
  }, [applyNonBlockingPolicy, setMode, setSoftPrompt, state.policy]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void runBootstrap();
  }, [runBootstrap]);

  if (state.mode === 'bootstrapping') {
    return (
      <VersionGateScreen
        mode="loading"
        title="Checking for updates"
        message="We’re making sure this version of Toki can run safely."
      />
    );
  }

  if (state.mode === 'blocked') {
    const policy = state.policy;
    const supportState = policy?.maintenance.active ? 'maintenance' : policy?.support.state;
    const title = policy?.maintenance.active
      ? policy.maintenance.title || 'Toki is under maintenance'
      : policy?.support.title || 'Update required';
    const message = state.reason
      || policy?.maintenance.message
      || policy?.support.message
      || 'Please update Toki to continue.';

    if (supportState === 'maintenance') {
      return (
        <MaintenanceScreen
          title={title}
          message={message}
          onRetry={() => {
            void runBootstrap();
          }}
        />
      );
    }

    return (
      <VersionGateScreen
        mode="blocked"
        title={title}
        message={message}
        primaryAction={
          supportState === 'requires_store'
            ? {
                label: 'Open store',
                onPress: () => {
                  void openStoreUrl(policy);
                },
              }
            : {
                label: 'Retry update',
                onPress: () => {
                  void runBootstrap();
                },
              }
        }
        secondaryAction={{
          label: 'Try again',
          onPress: () => {
            void runBootstrap();
          },
        }}
      />
    );
  }

  return (
    <>
      {children}
      {state.softPrompt ? (
        <SoftUpdatePrompt
          visible
          title={state.softPrompt.title}
          message={state.softPrompt.message}
          primaryLabel={state.softPrompt.mode === 'ota_ready' ? 'Restart now' : 'Update'}
          onPrimaryPress={() => {
            if (state.softPrompt?.mode === 'ota_ready') {
              void reloadToApplyUpdate();
              return;
            }

            const policy = state.policy;
            void openStoreUrl(policy);
          }}
          onClose={() => {
            setSoftPrompt(null);
          }}
        />
      ) : null}
    </>
  );
};
