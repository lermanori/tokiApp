# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Toki Social Map is a location-based social networking mobile app for discovering, creating, and joining local activities. It's a monorepo with:

- **Frontend**: React Native 0.81.5 + Expo SDK 54 + React 19 (cross-platform: iOS, Android, Web)
- **Backend**: Express.js + TypeScript in `/toki-backend`
- **Database**: PostgreSQL via Supabase
- **Real-time**: Socket.io for messaging
- **Storage**: Cloudinary for images

## Development Commands

### Frontend (root directory)
```bash
npm run dev              # Start Expo dev server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run build:web        # Build web version
npm run lint             # Run Expo lint
npm run start:device     # Run on physical iOS device (Release)
```

### Backend (`toki-backend/`)
```bash
npm run dev              # Start with nodemon (auto-rebuilds admin panel)
npm run build            # Compile TypeScript
npm start                # Run compiled dist/index.js
npm test                 # Run Jest tests
npm run lint             # ESLint check
npm run lint:fix         # ESLint with auto-fix
npm run migrate          # Run database migrations
```

## Architecture

### Frontend Structure
- `/app` - Expo Router file-based routing
  - `/(tabs)/` - Main tab navigation (discover map, create, messages, notifications, profile)
  - Dynamic routes: `chat.tsx`, `toki-details.tsx`, `user-profile/[userId].tsx`, `join/[code].tsx`
- `/components` - Reusable React components (DiscoverMap, ImageUpload, ParticipantsModal, etc.)
- `/contexts/AppContext.tsx` - Global state management
- `/hooks` - Custom hooks (useDiscoverData, useDiscoverFilters)
- `/services` - API client (`api.ts`), Socket.io client (`socket.ts`), geocoding
- `/utils` - Helpers for categories, sorting, distance calculations

### Backend Structure (`toki-backend/src/`)
- `/routes/` - API endpoints:
  - `auth.ts` - Authentication, registration, password reset
  - `tokis.ts` - Activity CRUD, search, filtering
  - `messages.ts` - Direct & group messaging
  - `connections.ts` - User connections/followers
  - `notifications.ts` - Push notifications (Expo)
  - `admin.ts` - Admin panel endpoints
  - `blocks.ts`, `reports.ts` - Content moderation
  - `ratings.ts` - User ratings
- `/services/` - Business logic
- `/mcp/` - Model Context Protocol integration for AI tooling
- `/scripts/` - Migrations and utility scripts
- `/admin-panel/` - Next.js admin dashboard

### Maps Implementation
- **Mobile**: `react-native-maps` (native map components)
- **Web**: `react-leaflet` with Leaflet.js
- Components have web/native variants (e.g., `DiscoverMap.tsx` vs `DiscoverMap.web.tsx`)

## Key Patterns

### API Communication
- Frontend uses `/services/api.ts` for REST calls with JWT auth
- Real-time messaging via Socket.io (`/services/socket.ts`)
- Production API: `https://backend-production-d8ec.up.railway.app`

### Activity Data Model ("Tokis")
- Core fields: title, description, location, latitude/longitude, scheduledTime, category, maxAttendees
- Categories: sports, coffee, music, dinner, work, culture, nature, drinks, party, wellness, chill, morning, shopping, education, film
- Time slots: now, 30min, 1hour, 2hours, 3hours, tonight, tomorrow, morning, afternoon, evening
- Visibility: public, connections, friends, private

### TypeScript Configuration
- Frontend: extends `expo/tsconfig.base`, path alias `@/*` → `./`
- Backend: strict mode, path alias `@/*` → `src/*`

## Cursor Rules Note

The project has a Cursor rule (`.cursor/rules/file-doc-generator.mdc`) that auto-generates `.md` companion files for code files. These contain summaries and fix logs - they are auto-generated documentation, not source files.

## Deployment

- **Backend**: Railway (`railway.json` config, see `RAILWAY_DEPLOYMENT.md`)
- **iOS**: EAS Build (`eas.json`, see `BUILD_IOS_LOCALLY.md`)
- **Web**: GitHub Pages via `npm run deploy`
