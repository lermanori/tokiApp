import React, { createContext, useContext, useEffect, useState } from 'react';

import { apiService } from '@/services/api';

export type FeatureMap = {
  boosts: boolean;
};

const defaults: FeatureMap = {
  boosts: false,
};

const FeaturesContext = createContext<FeatureMap>(defaults);

export const FeaturesProvider = ({ children }: { children: React.ReactNode }) => {
  const [features, setFeatures] = useState<FeatureMap>(defaults);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getFeatures()
      .then((flags) => {
        if (cancelled) return;
        setFeatures({
          boosts: flags.boosts === true,
        });
      })
      .catch(() => {
        // Fail closed: defaults stay (all off)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>
  );
};

export const useFeatures = (): FeatureMap => useContext(FeaturesContext);
