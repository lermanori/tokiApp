# Files Modified: Backend (auth.ts, run-migrations.ts), Frontend (register.tsx, login.tsx, terms-of-use.tsx), API Service (api.ts)

### Summary
Implemented complete EULA (End User License Agreement) acceptance system across the full stack. Users must now accept Terms of Use during registration and will be prompted to accept updated terms on login. The system tracks acceptance timestamps and version numbers in the database, validates acceptance on the backend, and provides a seamless UI experience with checkboxes and modals.

### Fixes Applied log
- problem: Apple App Review requires EULA acceptance system for user-generated content apps
- solution: Added database columns `terms_accepted_at` and `terms_version` to users table
- solution: Updated registration endpoints to require `termsAccepted` parameter
- solution: Modified login endpoint to check terms version and return `requiresTermsAcceptance` flag
- solution: Created new `/api/auth/accept-terms` endpoint for post-login acceptance
- solution: Added terms acceptance checkbox to registration form
- solution: Implemented TermsAgreementModal component for login flow
- solution: Updated Terms of Use with NO TOLERANCE section

### How Fixes Were Implemented

#### Backend Changes (toki-backend/src/routes/auth.ts)
- Added `CURRENT_TERMS_VERSION` constant set to '2025-12-27'
- Modified `POST /api/auth/register` to validate `termsAccepted` boolean, return 400 if false
- Updated registration INSERT to include `terms_accepted_at` (NOW()) and `terms_version` fields
- Modified `POST /api/auth/register/invite` with same terms validation
- Updated `POST /api/auth/login` to select terms fields and check version match
- Login now returns `requiresTermsAcceptance: true` and `tokens: null` if terms not accepted
- Created `POST /api/auth/accept-terms` endpoint that updates user terms and issues tokens

#### Frontend Changes (app/register.tsx)
- Added `termsAccepted` state (boolean, default false)
- Created checkbox UI with Terms and Privacy Policy links
- Submit button disabled when checkbox unchecked
- All registration API calls include `termsAccepted: true` parameter

#### Frontend Changes (app/login.tsx)
- Added `showTermsModal` state
- Import and render TermsAgreementModal component
- Check `response.requiresTermsAcceptance` after login
- Show modal if terms not accepted, handle acceptance flow
- After acceptance, load user data and redirect to app

#### API Service Changes (services/api.ts)
- Updated `register()` method signature to include `termsAccepted: boolean`
- Modified `AuthResponse` interface to include optional `requiresTermsAcceptance` flag and nullable `tokens`
- Added `acceptTerms()` method that calls `/auth/accept-terms` and saves returned tokens
- Updated login to only save tokens if they exist (not null)

#### Terms of Use Updates (app/terms-of-use.tsx)
- Updated "Last Updated" date to December 27, 2025
- Added section 4.6 "NO TOLERANCE POLICY FOR OBJECTIONABLE CONTENT AND ABUSIVE BEHAVIOR"
- Included explicit zero-tolerance language for violations
- Listed consequences: immediate termination, permanent ban, legal action

### Data Flow
1. Registration: User checks box → submits → backend validates → stores terms_accepted_at/version → returns tokens
2. Login (terms accepted): User logs in → backend checks version → matches → returns tokens
3. Login (terms not accepted): User logs in → backend detects mismatch → returns requiresTermsAcceptance → frontend shows modal → user accepts → calls accept-terms → receives tokens → proceeds to app

### Testing Considerations
- New users cannot register without checking terms box
- Existing users without terms acceptance see modal on login
- Terms modal blocks app access until accepted
- Version tracking allows future updates to re-prompt users
- All error cases handled with appropriate messages
