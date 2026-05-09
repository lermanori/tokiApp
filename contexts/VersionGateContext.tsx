import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { registerUnsupportedVersionHandler } from '@/services/version/versionGateBridge';
import { buildUnsupportedPolicyFromApi } from '@/services/version/versionGateMachine';
import type { UnsupportedVersionPayload, VersionPolicy } from '@/services/version/types';

type SoftPromptState = {
  title: string;
  message: string;
  mode: 'soft_update' | 'ota_ready';
  storeUrl?: string | null;
};

type VersionGateMode = 'bootstrapping' | 'allowed' | 'blocked';

interface VersionGateState {
  mode: VersionGateMode;
  policy: VersionPolicy | null;
  reason: string | null;
  softPrompt: SoftPromptState | null;
}

interface VersionGateContextValue {
  state: VersionGateState;
  setMode: (mode: VersionGateMode, policy: VersionPolicy | null, reason?: string | null) => void;
  setSoftPrompt: (prompt: SoftPromptState | null) => void;
}

const initialState: VersionGateState = {
  mode: 'bootstrapping',
  policy: null,
  reason: null,
  softPrompt: null,
};

const VersionGateContext = createContext<VersionGateContextValue | undefined>(undefined);

export const VersionGateProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<VersionGateState>(initialState);

  useEffect(() => {
    const handler = (payload: UnsupportedVersionPayload) => {
      const policy = buildUnsupportedPolicyFromApi(payload);
      setState((currentState) => ({
        ...currentState,
        mode: 'blocked',
        policy,
        reason: payload.message || 'This version of Toki is no longer supported.',
      }));
    };

    registerUnsupportedVersionHandler(handler);
    return () => {
      registerUnsupportedVersionHandler(null);
    };
  }, []);

  const value = useMemo<VersionGateContextValue>(() => ({
    state,
    setMode: (mode, policy, reason = null) => {
      setState((currentState) => ({
        ...currentState,
        mode,
        policy,
        reason,
      }));
    },
    setSoftPrompt: (softPrompt) => {
      setState((currentState) => ({
        ...currentState,
        softPrompt,
      }));
    },
  }), [state]);

  return (
    <VersionGateContext.Provider value={value}>
      {children}
    </VersionGateContext.Provider>
  );
};

export const useVersionGate = (): VersionGateContextValue => {
  const context = useContext(VersionGateContext);
  if (!context) {
    throw new Error('useVersionGate must be used within VersionGateProvider');
  }

  return context;
};
