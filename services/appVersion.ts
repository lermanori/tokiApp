import Constants from 'expo-constants';
import packageJson from '../package.json';

export const getAppVersion = (): string => {
  return (
    packageJson.version ||
    Constants.expoConfig?.version ||
    (Constants as any)?.manifest2?.extra?.expoClient?.version ||
    'unknown'
  );
};
