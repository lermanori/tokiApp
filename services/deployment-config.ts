// Deployment Configuration
// Update these values when deploying to different environments

export const deploymentConfig = {
  // GitHub Pages deployment
  githubPages: {
    basePath: '/tokiApp',
    baseUrl: 'https://lermanori.github.io/tokiApp'
  },
  
  // Custom domain deployment
  customDomain: {
    basePath: '',  // No base path for custom domain
    baseUrl: 'https://toki-app.com'  // Your actual custom domain
  },
  
  // Local development
  local: {
    basePath: '',
    baseUrl: 'http://localhost:8081'
  }
};

// Current deployment type
export const currentDeployment = 'local'; // Using custom domain https://toki-app.com

// Helper function to get current deployment config
export const getCurrentDeploymentConfig = () => {
  return deploymentConfig[currentDeployment as keyof typeof deploymentConfig];
};
