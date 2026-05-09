import React from 'react';

import { VersionGateScreen } from './VersionGateScreen';

interface MaintenanceScreenProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export const MaintenanceScreen = ({
  title,
  message,
  onRetry,
}: MaintenanceScreenProps) => {
  return (
    <VersionGateScreen
      mode="maintenance"
      title={title}
      message={message}
      primaryAction={{ label: 'Try again', onPress: onRetry }}
    />
  );
};
