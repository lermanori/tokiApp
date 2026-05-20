import { getCurrentDeploymentConfig } from './deployment-config';
import { getLaunchArg } from './launchArgs';

// Configuration for the Toki app


export const config = {
  // Frontend configuration
  frontend: {
    // Base path for routing - empty for custom domain, '/tokiApp' for GitHub Pages
    basePath: __DEV__ 
      ? ''  // Local development - no base path
      : getCurrentDeploymentConfig().basePath,  // Production - from deployment config
    
    // Full frontend URL - for absolute URLs and redirects
    baseUrl: __DEV__ 
      ? 'http://localhost:8081'  // Local development
      : getCurrentDeploymentConfig().baseUrl,  // Production - from deployment config
  },
  
  // Backend API configuration
  backend: {
    // For development on mobile device, use your computer's IP address
    // You can find this by running 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
    baseUrl: __DEV__ 
      ? 'http://localhost:3002'  // Local development
      : 'https://backend-production-d8ec.up.railway.app',  // No trailing slash
    
    // WebSocket configuration
    websocket: {
      url: __DEV__ 
        ? 'http://localhost:3002'  // Local development
        : 'wss://backend-production-d8ec.up.railway.app',
      options: {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      }
    }
  },
  
  // App configuration
  app: {
    name: 'Toki',
    version: '1.3.1',
    debug: __DEV__
  }
};

const getRuntimeBackendOverride = () => {
  return getLaunchArg('TOKI_E2E_API_URL');
};

const getRuntimeWebSocketOverride = () => {
  const explicitOverride = getLaunchArg('TOKI_E2E_WS_URL');
  if (explicitOverride) {
    return explicitOverride;
  }

  const backendOverride = getRuntimeBackendOverride();
  if (!backendOverride) {
    return undefined;
  }

  if (backendOverride.startsWith('https://')) {
    return backendOverride.replace('https://', 'wss://');
  }

  if (backendOverride.startsWith('http://')) {
    return backendOverride.replace('http://', 'ws://');
  }

  return undefined;
};

// Build-time E2E backend override. Expo inlines EXPO_PUBLIC_* env vars at build
// time, so passing EXPO_PUBLIC_E2E_BACKEND_URL=http://localhost:3002 to the
// detox build command bakes the override into the release bundle without
// changing source. Safe to leave in production builds — when the env var is
// unset, this constant is undefined and the normal config applies.
const BUILD_TIME_E2E_BACKEND_URL: string | undefined = process.env.EXPO_PUBLIC_E2E_BACKEND_URL;

// Helper function to get the correct backend URL
export const getBackendUrl = () => {
  const runtimeOverride = getRuntimeBackendOverride();
  if (runtimeOverride) {
    return runtimeOverride;
  }

  if (BUILD_TIME_E2E_BACKEND_URL) {
    return BUILD_TIME_E2E_BACKEND_URL;
  }

  return config.backend.baseUrl;
};

// Helper function to get the correct WebSocket URL
export const getWebSocketUrl = () => {
  const runtimeOverride = getRuntimeWebSocketOverride();
  if (runtimeOverride) {
    return runtimeOverride;
  }

  if (__DEV__) {
    // In development, try to detect the correct IP
    // You can override this by setting the IP manually
    return config.backend.websocket.url;
  }
  return config.backend.websocket.url;
};

// Helper function to get the frontend base path for routing
export const getFrontendBasePath = () => {
  return config.frontend.basePath;
};

// Helper function to get the full frontend URL
export const getFrontendUrl = () => {
  return config.frontend.baseUrl;
};

console.log('🔍 [CONFIG] __DEV__:', __DEV__);
console.log('🔍 [CONFIG] Backend URL:', getBackendUrl());
