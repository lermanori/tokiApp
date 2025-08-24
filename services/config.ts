import { getCurrentDeploymentConfig } from './deployment-config';

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
      : 'https://backend-production-d8ec.up.railway.app/',
    
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
    version: '1.0.0',
    debug: __DEV__
  }
};

// Helper function to get the correct backend URL
export const getBackendUrl = () => {
  if (__DEV__) {
    // In development, try to detect the correct IP
    // You can override this by setting the IP manually
    return config.backend.baseUrl;
  }
  return config.backend.baseUrl;
};

// Helper function to get the correct WebSocket URL
export const getWebSocketUrl = () => {
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
