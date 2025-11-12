# File: deployment-config.ts

### Summary
This file manages deployment-specific configurations including base URLs and paths for different deployment environments (GitHub Pages, custom domain, local development).

### Fixes Applied log
- **Problem**: `currentDeployment` was set to `'local'` but the comment indicated it should be using the custom domain `https://toki-app.com` for production. This caused share URLs to be generated with the wrong base URL in production.
- **Solution**: Changed `currentDeployment` from `'local'` to `'customDomain'` to ensure production share links use `https://toki-app.com` instead of `http://localhost:8081`.

### How Fixes Were Implemented
- **Problem**: Deployment configuration inconsistency - the code was set to use local development settings in production
- **Solution**:
  - Updated `currentDeployment` constant from `'local'` to `'customDomain'`
  - This ensures that when `__DEV__` is false (production), the `getCurrentDeploymentConfig()` function returns the `customDomain` configuration with `baseUrl: 'https://toki-app.com'` and `basePath: ''`
  - The `config.ts` file uses this deployment config to set `config.frontend.baseUrl` in production, which is then used by `tokiUrls.ts` to generate share links
  - This fix ensures that all share links generated in production will use the correct custom domain URL

