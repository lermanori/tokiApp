# File: package.json

### Summary
Project dependencies and scripts configuration file. Defines all npm packages, Expo SDK packages, and build/development scripts.

### Fixes Applied log
- problem: `eas-cli` installed as local devDependency, but should be used globally or via npx.
- solution: Removed `eas-cli` from devDependencies to follow Expo best practices.
- problem: Package versions mismatched with Expo SDK 54 requirements (expo, expo-camera, expo-router, expo-web-browser).
- solution: Updated packages to match Expo SDK 54 patch versions: expo@54.0.23, expo-camera@~17.0.9, expo-router@~6.0.14, expo-web-browser@~15.0.9.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.8 to 1.0.9.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.9 to 1.0.10.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.10 to 1.0.11.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.11 to 1.0.12.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.12 to 1.0.13.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.14 to 1.0.15.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.15 to 1.0.16.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.16 to 1.0.17.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.17 to 1.0.18.
- problem: Version bump needed for new release.
- solution: Bumped version from 1.0.18 to 1.0.19.

### How Fixes Were Implemented
- Removed `eas-cli` from devDependencies section. EAS CLI should be installed globally (`npm install -g eas-cli`) or used via `npx eas-cli`.
- Ran `npx expo install` to update packages to versions compatible with Expo SDK 54, ensuring all patch versions match the expected SDK requirements.


