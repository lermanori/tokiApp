// Configuration for the Toki app
export const config = {
  // Backend API configuration
  backend: {
    // For development on mobile device, use your computer's IP address
    // You can find this by running 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
    baseUrl: __DEV__ 
      ? 'http://localhost:3002'  // Local development
      : 'https://your-production-domain.com',
    
    // WebSocket configuration
    websocket: {
      url: __DEV__ 
        ? 'http://localhost:3002'  // Local development
        : 'wss://your-production-domain.com',
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
