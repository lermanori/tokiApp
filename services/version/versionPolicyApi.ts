import { getBackendUrl } from '@/services/config';

import { getDeviceVersionInfo, getVersionHeaders } from './deviceInfo';
import type { DeviceVersionInfo, VersionPolicy } from './types';

export const fetchVersionPolicy = async (
  deviceInfo: DeviceVersionInfo = getDeviceVersionInfo(),
): Promise<VersionPolicy> => {
  const response = await fetch(`${getBackendUrl()}/api/mobile/bootstrap`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getVersionHeaders(deviceInfo),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `Failed to fetch version policy (${response.status})`);
  }

  return data as VersionPolicy;
};
