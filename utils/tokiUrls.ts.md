# File: tokiUrls.ts

### Summary
This file contains utility functions for generating URLs and share messages for Tokis. It includes functions for generating Toki detail URLs, share URLs, share messages, and invite link URLs. All URL generation uses the deployment configuration to ensure correct base URLs across different environments.

### Fixes Applied log
- **Problem**: Invite links were generated in the backend with hardcoded URLs, not respecting the frontend deployment configuration (local/customDomain/githubPages).
- **Solution**: Added `generateInviteLinkUrl()` function that uses `config.frontend.baseUrl` (from deployment-config) to construct invite link URLs, following the same pattern as share URLs.

### How Fixes Were Implemented
- **Problem**: Invite links didn't use deployment configuration for URL generation
- **Solution**: 
  - Added `generateInviteLinkUrl(inviteCode: string, baseUrl?: string)` function
  - Uses the same `getBaseUrl()` helper that share URLs use, which reads from `config.frontend.baseUrl`
  - Returns URLs in the format: `${baseUrl}/join/${inviteCode}`
  - This ensures invite links work correctly in all deployment environments (local development, custom domain, GitHub Pages)

