# Admin System Implementation Plan
**Date**: October 29, 2025  
**Status**: Planning

## Overview
Complete admin system with authentication, waitlist management, database CRUD operations, and algorithm hyperparameter tuning. Admin panel will feature a futuristic, beautiful design with sharp colors and gradients matching the main app aesthetic.

---

## Phase 1: Database Schema & Foundation

### Step 1.1: Add Admin Role to Users Table
- [ ] Create migration script to add `role` column to `users` table
- [ ] Add CHECK constraint for valid roles ('user', 'admin')
- [ ] Create index on `role` column for performance
- [ ] Update existing admin users in database (manual SQL)

**SQL Script:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
  CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Grant admin role to specific users (run manually)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@toki-app.com';
```

### Step 1.2: Create Algorithm Hyperparameters Table
- [ ] Create `algorithm_hyperparameters` table
- [ ] Add columns for all 7 weights (w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen)
- [ ] Set default values that sum to 1.0
- [ ] Add tracking columns (updated_by, updated_at)
- [ ] Insert initial default row

**SQL Script:**
```sql
CREATE TABLE IF NOT EXISTS algorithm_hyperparameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  w_hist NUMERIC(5,4) DEFAULT 0.20,
  w_social NUMERIC(5,4) DEFAULT 0.15,
  w_pop NUMERIC(5,4) DEFAULT 0.20,
  w_time NUMERIC(5,4) DEFAULT 0.15,
  w_geo NUMERIC(5,4) DEFAULT 0.20,
  w_novel NUMERIC(5,4) DEFAULT 0.10,
  w_pen NUMERIC(5,4) DEFAULT 0.05,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id)
);

INSERT INTO algorithm_hyperparameters (id) 
VALUES (gen_random_uuid()) 
ON CONFLICT DO NOTHING;
```

### Step 1.3: Create Email Templates Table
- [ ] Create `email_templates` table
- [ ] Add columns: template_name, subject, body_text, variables (JSONB)
- [ ] Insert default waitlist welcome template

**SQL Script:**
```sql
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO email_templates (template_name, subject, body_text, variables) 
VALUES (
  'waitlist_welcome',
  'You''re in. 🖤',
  'Hey,\n\nYou''re officially on the waitlist for Toki.\nYou''re number **#{position}** on the **{city}** list.\nWe''ll let you know the moment you can drop in.\n\nIn the meantime, don''t be a stranger.\nTell your people. The more of us here, the better it gets.\n\n—\nToki',
  '{"position": "number", "city": "string", "name": "string"}'::jsonb
) ON CONFLICT DO NOTHING;
```

---

## Phase 2: Backend Authentication & Authorization

### Step 2.1: Update Admin Middleware
- [ ] Update `requireAdmin` middleware in `toki-backend/src/routes/admin.ts`
- [ ] Check for `role = 'admin'` in database query
- [ ] Return proper 403 error if not admin
- [ ] Test middleware with admin and non-admin users

**File**: `toki-backend/src/routes/admin.ts`
```typescript
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### Step 2.2: Create Admin Login Endpoint
- [ ] Create `POST /api/admin/login` route
- [ ] Validate email/password
- [ ] Check if user has admin role
- [ ] Return JWT token if valid
- [ ] Add rate limiting to prevent brute force

### Step 2.3: Create Admin Session Endpoint
- [ ] Create `GET /api/admin/me` route
- [ ] Return current admin user info
- [ ] Verify admin role on each request

---

## Phase 3: Waitlist Management API

### Step 3.1: Get All Waitlist Entries
- [ ] Create `GET /api/admin/waitlist` endpoint
- [ ] Add pagination (page, limit)
- [ ] Add filtering (location, platform, date range)
- [ ] Add sorting options
- [ ] Return formatted list with all fields

### Step 3.2: Get Single Waitlist Entry
- [ ] Create `GET /api/admin/waitlist/:id` endpoint
- [ ] Return detailed entry information
- [ ] Include created_at timestamp

### Step 3.3: Create User from Waitlist Entry
- [ ] Create `POST /api/admin/waitlist/:id/user` endpoint
- [ ] Extract data from waitlist entry
- [ ] Create user account (generate password or send reset link)
- [ ] Send welcome email using template system
- [ ] Mark waitlist entry as converted (optional: add `converted` column)

### Step 3.4: Send Custom Email to Waitlist Entry
- [ ] Create `POST /api/admin/waitlist/:id/email` endpoint
- [ ] Allow custom subject and body
- [ ] Use Resend API to send email
- [ ] Log email sends for tracking

### Step 3.5: Waitlist Statistics
- [ ] Create `GET /api/admin/waitlist/stats` endpoint
- [ ] Return total count, by location, by platform
- [ ] Return signup trend over time

---

## Phase 4: Database Management API (Users)

### Step 4.1: List All Users
- [ ] Create `GET /api/admin/users` endpoint
- [ ] Add pagination
- [ ] Add search (name, email)
- [ ] Add filtering (role, verified status, date range)
- [ ] Add sorting options

### Step 4.2: Get User Details
- [ ] Create `GET /api/admin/users/:id` endpoint
- [ ] Return full user profile
- [ ] Include related data (connections, tokis created, ratings)

### Step 4.3: Update User
- [ ] Create `PUT /api/admin/users/:id` endpoint
- [ ] Allow updating: name, email, bio, location, role, verified status
- [ ] Validate role changes
- [ ] Prevent self-role removal (if only one admin)

### Step 4.4: Delete User
- [ ] Create `DELETE /api/admin/users/:id` endpoint
- [ ] Add cascade delete handling
- [ ] Add confirmation mechanism (optional soft delete)

### Step 4.5: Create User
- [ ] Create `POST /api/admin/users` endpoint
- [ ] Validate all required fields
- [ ] Generate password or require password
- [ ] Send welcome email (optional)

---

## Phase 5: Database Management API (Tokis)

### Step 5.1: List All Tokis
- [ ] Create `GET /api/admin/tokis` endpoint
- [ ] Add pagination
- [ ] Add search (title, description, location)
- [ ] Add filtering (category, status, host, date range)
- [ ] Add sorting options

### Step 5.2: Get Toki Details
- [ ] Create `GET /api/admin/tokis/:id` endpoint
- [ ] Return full toki data
- [ ] Include participants, messages count, tags

### Step 5.3: Update Toki
- [ ] Create `PUT /api/admin/tokis/:id` endpoint
- [ ] Allow updating all toki fields
- [ ] Validate category, time_slot, max_attendees

### Step 5.4: Delete Toki
- [ ] Create `DELETE /api/admin/tokis/:id` endpoint
- [ ] Handle cascade deletes (participants, messages, etc.)

### Step 5.5: Create Toki
- [ ] Create `POST /api/admin/tokis` endpoint
- [ ] Allow admin to create tokis on behalf of users
- [ ] Set host_id appropriately

---

## Phase 6: Algorithm Hyperparameters API

### Step 6.1: Get Current Hyperparameters
- [ ] Create `GET /api/admin/algorithm` endpoint
- [ ] Return current weight values
- [ ] Include metadata (updated_by, updated_at)
- [ ] Add explanation text for each parameter

### Step 6.2: Update Hyperparameters
- [ ] Create `PUT /api/admin/algorithm` endpoint
- [ ] Validate weights sum to 1.0 (100%)
- [ ] Validate each weight is between 0 and 1
- [ ] Store updated_by user ID
- [ ] Update updated_at timestamp
- [ ] Return validation errors if invalid

### Step 6.3: Hyperparameter Validation Logic
- [ ] Create validation function
- [ ] Check sum of all weights equals 1.0
- [ ] Check individual weight ranges (0-1)
- [ ] Return clear error messages

---

## Phase 7: Email Template Management API

### Step 7.1: List Email Templates
- [ ] Create `GET /api/admin/email-templates` endpoint
- [ ] Return all templates with metadata

### Step 7.2: Get Single Template
- [ ] Create `GET /api/admin/email-templates/:id` endpoint
- [ ] Return template with variables schema

### Step 7.3: Update Email Template
- [ ] Create `PUT /api/admin/email-templates/:id` endpoint
- [ ] Validate template structure
- [ ] Update updated_at timestamp
- [ ] Support variable placeholders (`{position}`, `{city}`, etc.)

### Step 7.4: Create Email Template
- [ ] Create `POST /api/admin/email-templates` endpoint
- [ ] Validate required fields
- [ ] Validate template_name uniqueness

### Step 7.5: Delete Email Template
- [ ] Create `DELETE /api/admin/email-templates/:id` endpoint
- [ ] Prevent deletion of default templates (optional)

---

## Phase 8: Backend-Served React Admin Panel

### Step 8.1: Create Admin React App Structure
- [ ] Create `toki-backend/admin-panel/` directory at backend root
- [ ] Initialize React app with Vite or Create React App
- [ ] Set up TypeScript (matching main app standards)
- [ ] Configure build output to `toki-backend/admin-panel/build/`
- [ ] Set up routing structure

**Directory Structure:**
```
toki-backend/
├── admin-panel/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── Login.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── WaitlistTab.tsx
│   │   │   │   ├── DatabaseTab.tsx
│   │   │   │   └── AlgorithmTab.tsx
│   │   │   └── shared/
│   │   ├── hooks/
│   │   │   └── useAdminAuth.ts
│   │   ├── services/
│   │   │   └── adminApi.ts
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── theme.ts
│   │   │   └── components.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts (or similar)
│   └── build/ (output directory)
└── src/
    └── views/
        └── admin/ (served from build/)
```

### Step 8.2: Configure React Admin App Build
- [ ] Set base path in build config to `/admin`
- [ ] Configure API proxy or absolute URLs to `/api/admin/*`
- [ ] Set up build script to output to `build/` directory
- [ ] Configure environment variables for API endpoints
- [ ] Add build script to backend package.json

**Vite config example:**
```typescript
export default defineConfig({
  base: '/admin/',
  build: {
    outDir: 'build',
    assetsDir: 'static'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
});
```

### Step 8.3: Configure Express to Serve React Build
- [ ] Update `toki-backend/src/index.ts` to serve React build files
- [ ] Serve static files from `admin-panel/build/`
- [ ] Set up catch-all route for React Router
- [ ] Handle both `/admin` and `/admin/*` routes

**Implementation in `index.ts`:**
```typescript
// Serve admin panel React build files
const adminBuildPath = path.join(__dirname, '../admin-panel/build');
app.use('/admin/static', express.static(path.join(adminBuildPath, 'static')));

// Serve admin panel HTML for all routes (React Router handles routing)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});
```

### Step 8.4: Create Admin Login Component
- [ ] Create `admin-panel/src/components/auth/Login.tsx`
- [ ] Add login form with email/password fields
- [ ] Use admin API service to call `/api/admin/login`
- [ ] Store JWT in localStorage or memory
- [ ] Redirect to dashboard on successful login
- [ ] Add error handling and display
- [ ] Use React Router for navigation
- [ ] **Styling**: Futuristic login page with animated gradient background
- [ ] **Styling**: Glassmorphism login card with neon glow on focus

### Step 8.5: Create Admin Dashboard Component
- [ ] Create `admin-panel/src/components/dashboard/Dashboard.tsx`
- [ ] Add tab navigation for 3 sections:
  1. Waitlist Management
  2. Database Management (Users & Tokis)
  3. Algorithm Hyperparameters
- [ ] Add logout button
- [ ] Use React Router for tab navigation
- [ ] Add protected route wrapper
- [ ] **Styling**: Hero gradient background matching main app (`#FFF1EB` → `#F3E7FF` → `#E5DCFF`)
- [ ] **Styling**: Glassmorphism header with sharp shadows

### Step 8.6: Admin Authentication Context/Hook
- [ ] Create `admin-panel/src/hooks/useAdminAuth.ts`
- [ ] Manage admin JWT token state
- [ ] Provide login/logout functions
- [ ] Check token on app load
- [ ] Redirect to login if not authenticated
- [ ] Add token refresh logic (optional)

### Step 8.7: Admin API Service
- [ ] Create `admin-panel/src/services/adminApi.ts`
- [ ] Use fetch API for all backend calls
- [ ] Add JWT token to Authorization header
- [ ] Handle token expiration and redirect
- [ ] Centralized error handling
- [ ] TypeScript types for API responses

### Step 8.8: Build & Deployment Setup
- [ ] Add build script: `npm run build:admin` or similar
- [ ] Configure production build optimizations
- [ ] Set up CI/CD to build admin panel before backend deploy
- [ ] Ensure build files are included in backend deployment
- [ ] Test build output serves correctly

### Step 8.9: Admin Panel Design System & Styling
- [ ] Create design system matching main app but more futuristic
- [ ] Set up global CSS/styled-components with design tokens
- [ ] Implement gradient backgrounds and modern UI elements
- [ ] Add sharp, vibrant colors and glassmorphism effects

**Design System Requirements:**
```css
/* Color Palette - Futuristic & Sharp */
--primary-purple: #8B5CF6;
--primary-purple-light: #B49AFF;
--primary-purple-dark: #7C3AED;
--secondary-teal: #4DC4AA;
--accent-pink: #EC4899;
--accent-amber: #F59E0B;
--accent-green: #10B981;
--accent-red: #EF4444;
--gradient-primary: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
--gradient-secondary: linear-gradient(135deg, #4DC4AA 0%, #10B981 100%);
--gradient-hero: linear-gradient(135deg, #FFF1EB 0%, #F3E7FF 50%, #E5DCFF 100%);
--gradient-card: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(243,231,255,0.9) 100%);
--glass-bg: rgba(255, 255, 255, 0.1);
--glass-border: rgba(255, 255, 255, 0.2);
--shadow-sm: 0 2px 4px rgba(139, 92, 246, 0.1);
--shadow-md: 0 4px 12px rgba(139, 92, 246, 0.15);
--shadow-lg: 0 8px 24px rgba(139, 92, 246, 0.2);
--shadow-glow: 0 0 20px rgba(139, 92, 246, 0.3);

/* Typography */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-bold: 'Inter-Bold';
--font-semi: 'Inter-SemiBold';
--font-medium: 'Inter-Medium';
--font-regular: 'Inter-Regular';

/* Spacing & Layout */
--border-radius-sm: 8px;
--border-radius-md: 12px;
--border-radius-lg: 16px;
--border-radius-xl: 20px;
--border-radius-full: 9999px;
```

**UI Component Styles:**
- **Background**: Gradient hero background (similar to messages screen)
- **Cards**: Glassmorphism effect with subtle gradients, sharp shadows
- **Buttons**: Gradient backgrounds with hover glow effects
- **Tables**: Modern, clean with gradient row highlights on hover
- **Inputs**: Glass-like appearance with purple focus states
- **Modals**: Backdrop blur with glassmorphism modal cards
- **Tabs**: Gradient underlines, smooth transitions
- **Badges**: Sharp colored badges with gradients
- **Icons**: Lucide React icons with gradient fills (optional)

**Futuristic Enhancements:**
- Animated gradient backgrounds
- Subtle particle effects (optional)
- Glassmorphism throughout
- Neon glow effects on interactive elements
- Smooth micro-animations
- Cyberpunk-inspired accents
- Sharp geometric shapes
- Holographic card effects

### Access Information
- **Admin Login**: `http://localhost:3002/admin/login` or `https://yourbackend.com/admin/login`
- **Admin Dashboard**: `http://localhost:3002/admin` or `https://yourbackend.com/admin`
- **API Endpoints**: All admin APIs remain under `/api/admin/*`
- **Authentication**: JWT stored in localStorage, sent in Authorization header for API calls
- **React Router**: Client-side routing handles all `/admin/*` paths

---

## Phase 9: Waitlist Management UI (React)

### Step 9.1: Waitlist Table Component
- [ ] Create `admin-panel/src/components/dashboard/WaitlistTab.tsx`
- [ ] Create `WaitlistTable.tsx` component
- [ ] Use React hooks (useState, useEffect) to fetch and display waitlist entries
- [ ] Add pagination controls with page/limit parameters
- [ ] Add search/filter inputs (location, platform, date range)
- [ ] Add sortable columns (email, location, created_at, etc.)
- [ ] Use adminApi service to call `GET /api/admin/waitlist`
- [ ] **Styling**: Glassmorphism card design with gradient accents, hover glow on rows
- [ ] **Styling**: Futuristic table design with gradient border highlights

### Step 9.2: Waitlist Entry Modal
- [ ] Create `WaitlistEntryModal.tsx` React component
- [ ] Display entry details (email, phone, location, reason, platform, created_at)
- [ ] Show action buttons (Create User, Send Email)
- [ ] Handle modal open/close state with React state
- [ ] Use React Portal for modal overlay (optional)
- [ ] **Styling**: Glassmorphism modal with backdrop blur, neon button glows

### Step 9.3: Create User from Waitlist
- [ ] Create `CreateUserFromWaitlist.tsx` React component
- [ ] Form fields: name, email (pre-filled), password generation option
- [ ] Use React Hook Form or controlled components
- [ ] Preview email template before sending
- [ ] Handle success/error states with React state
- [ ] Call `POST /api/admin/waitlist/:id/user` via adminApi
- [ ] **Styling**: Gradient form inputs with glass effect, purple focus glow

### Step 9.4: Send Email Modal
- [ ] Create `SendEmailModal.tsx` React component
- [ ] Select email template dropdown (from templates API)
- [ ] Custom subject and body fields with controlled inputs
- [ ] Preview email with variables filled (position, city, name)
- [ ] Send via `POST /api/admin/waitlist/:id/email` API
- [ ] **Styling**: Futuristic email composer with gradient preview pane

### Step 9.5: Waitlist Statistics
- [ ] Create `WaitlistStats.tsx` React component
- [ ] Display stats cards (total, by location, by platform)
- [ ] Call `GET /api/admin/waitlist/stats` API using useEffect
- [ ] Show chart/graph of signups over time (optional, using recharts or Chart.js)
- [ ] **Styling**: Gradient stat cards with glassmorphism, neon glow effects
- [ ] **Styling**: Animated number counters, gradient chart colors

---

## Phase 10: Database Management UI (Users) - React

### Step 10.1: Users Table Component
- [ ] Create `UsersTable.tsx` React component
- [ ] Add to `DatabaseTab.tsx` (Tab 2 - Users section)
- [ ] Use React hooks to fetch and display users
- [ ] Display users in sortable table (name, email, role, verified, created_at)
- [ ] Add search input (name, email) with debounced search
- [ ] Add filter dropdowns (role, verified status)
- [ ] Add pagination controls
- [ ] Call `GET /api/admin/users` via adminApi service
- [ ] **Styling**: Role badges with gradient colors (admin: purple gradient, user: teal gradient)
- [ ] **Styling**: Verified badges with neon glow, glassmorphism cards

### Step 10.2: User Edit Modal
- [ ] Create `UserEditModal.tsx` React component
- [ ] Form fields: name, email, bio, location, role selector, verified checkbox
- [ ] Use React Hook Form or controlled components
- [ ] Role selector dropdown with warning if changing admin role
- [ ] Save/Cancel buttons
- [ ] Call `PUT /api/admin/users/:id` on save via adminApi
- [ ] **Styling**: Glassmorphism edit form with gradient accents

### Step 10.3: User Create Modal
- [ ] Create `UserCreateModal.tsx` React component
- [ ] Form fields: name, email, password (or generate option), role, bio, location
- [ ] Password generation checkbox/button with state
- [ ] Send welcome email checkbox
- [ ] Call `POST /api/admin/users` via adminApi
- [ ] **Styling**: Futuristic create form with animated gradient buttons

### Step 10.4: User Actions
- [ ] Add delete button for each user row
- [ ] Create `DeleteConfirmDialog.tsx` React component
- [ ] Call `DELETE /api/admin/users/:id` via adminApi
- [ ] Add bulk actions (optional): bulk delete, bulk role change with checkboxes
- [ ] **Styling**: Red gradient delete button with glow warning effect

---

## Phase 11: Database Management UI (Tokis) - React

### Step 11.1: Tokis Table Component
- [ ] Create `TokisTable.tsx` React component
- [ ] Add to `DatabaseTab.tsx` (Tab 2 - Tokis sub-tab)
- [ ] Use React hooks to fetch and display tokis
- [ ] Display tokis in sortable table (title, host, category, status, location, created_at)
- [ ] Add search input (title, description, location) with debounced search
- [ ] Add filter dropdowns (category, status, host)
- [ ] Add pagination controls
- [ ] Call `GET /api/admin/tokis` via adminApi service
- [ ] **Styling**: Category badges with sharp gradient colors matching main app
- [ ] **Styling**: Status indicators with neon glow effects

### Step 11.2: Toki Edit Modal
- [ ] Create `TokiEditModal.tsx` React component
- [ ] Form fields: title, description, category, time_slot, location, max_attendees, visibility, status
- [ ] Use React Hook Form or controlled components
- [ ] Category selector dropdown with all available categories
- [ ] Time slot selector dropdown
- [ ] Location input field with validation
- [ ] Call `PUT /api/admin/tokis/:id` on save via adminApi
- [ ] **Styling**: Glassmorphism edit modal with gradient category selector

### Step 11.3: Toki Create Modal
- [ ] Create `TokiCreateModal.tsx` React component
- [ ] Form with all required fields (same structure as edit)
- [ ] Host selector dropdown (fetch from users API)
- [ ] All toki fields (empty initial state)
- [ ] Call `POST /api/admin/tokis` via adminApi
- [ ] **Styling**: Futuristic create form with animated gradient submit button

---

## Phase 12: Algorithm Hyperparameters UI - React

### Step 12.1: Hyperparameter Sliders
- [ ] Create `AlgorithmTab.tsx` React component (Tab 3)
- [ ] Create `HyperparameterSlider.tsx` React component
- [ ] Use controlled input (slider) for each weight
- [ ] Display current value as percentage (e.g., "20%")
- [ ] Show remaining percentage dynamically as user adjusts (useMemo)
- [ ] Add explanation tooltip/help text for each parameter
- [ ] Real-time validation (ensure sum = 100%) with useMemo
- [ ] **Styling**: Custom gradient sliders with neon track, glow on active
- [ ] **Styling**: Sharp, futuristic slider design with animated fill

### Step 12.2: Algorithm Formula Display
- [ ] Create `AlgorithmPreview.tsx` React component
- [ ] Display formula with current weights dynamically
- [ ] Visual representation (bar chart or pie chart of weights)
- [ ] Use recharts or Chart.js for React integration
- [ ] Explanation panel for each component with React components
- [ ] **Styling**: Gradient chart colors matching category colors
- [ ] **Styling**: Holographic formula display with glassmorphism card

### Step 12.3: Save Confirmation
- [ ] Add validation function using React useMemo/useCallback
- [ ] Validate weights sum to 100% before allowing save
- [ ] Show warning/error message with React state
- [ ] Create `SaveConfirmationDialog.tsx` component
- [ ] Call `PUT /api/admin/algorithm` via adminApi on confirm
- [ ] **Styling**: Warning states with amber gradient glow, success with green glow

### Step 12.4: Algorithm Tab Layout
- [ ] Create full `AlgorithmTab.tsx` component
- [ ] Group sliders by section (similarity, social, popularity, etc.)
- [ ] Add explanation panel on the side with React components
- [ ] Display formula preview at top
- [ ] Add save button that triggers validation and confirmation dialog
- [ ] **Styling**: Section cards with gradient borders, neon accents

**Hyperparameter Explanations:**
- **w_hist (SimilarityToPastLiked)**: How much the user has liked similar events in the past. Higher = more personalized recommendations.
- **w_social (SocialBoost)**: Boost if user's friends/connections are going. Higher = more social discovery.
- **w_pop (Popularity)**: How popular/trending the event is. Higher = more mainstream events surface.
- **w_time (TimeDecay)**: Recency boost - sooner events score higher. Higher = prioritize immediate events.
- **w_geo (Proximity)**: Closer events score higher. Higher = more local discovery.
- **w_novel (NoveltyBoost)**: Boost for new/diverse event types. Higher = more variety in recommendations.
- **w_pen (DuplicateCategoryPenalty)**: Penalty for too many same-category events. Higher = more diversity enforcement.

---

## Phase 13: Email Template Management UI - React

### Step 13.1: Email Template List (Settings Section)
- [ ] Create `EmailTemplateList.tsx` React component
- [ ] Add to waitlist tab or separate settings section
- [ ] Use React hooks to fetch and display templates
- [ ] Display all templates in a list or table
- [ ] Add search/filter input with debounced search
- [ ] Call `GET /api/admin/email-templates` via adminApi
- [ ] **Styling**: Template cards with glassmorphism, gradient accents

### Step 13.2: Email Template Editor
- [ ] Create `EmailTemplateEditor.tsx` React component
- [ ] Use textarea for template body or React rich text editor (react-quill)
- [ ] Add variable placeholder buttons above editor
- [ ] Create preview pane with sample data (controlled component)
- [ ] Add Save/Cancel buttons
- [ ] Call `PUT /api/admin/email-templates/:id` via adminApi on save
- [ ] **Styling**: Split-screen editor with gradient preview pane border

### Step 13.3: Template Variables Helper
- [ ] Create `TemplateVariablesPanel.tsx` React component
- [ ] Show available variables panel
- [ ] Add clickable variable buttons that insert into template (use callback)
- [ ] Show variable descriptions (tooltip or help text)
- [ ] Variables: `{position}`, `{city}`, `{name}`, `{email}`
- [ ] Handle variable insertion into editor state
- [ ] **Styling**: Variable buttons with gradient backgrounds, hover glow

---

## Phase 14: Integration & Testing

### Step 14.1: API Integration Testing
- [ ] Test all admin endpoints with Postman/curl
- [ ] Test authentication flow
- [ ] Test error handling
- [ ] Test validation

### Step 14.2: Frontend Integration
- [ ] Connect all UI components to API
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Add toast notifications

### Step 14.3: End-to-End Testing
- [ ] Test complete admin workflows
- [ ] Test waitlist → user creation flow
- [ ] Test algorithm parameter updates
- [ ] Test email template system

### Step 14.4: Security Testing
- [ ] Test unauthorized access attempts
- [ ] Test role-based access control
- [ ] Test rate limiting
- [ ] Test input validation

---

## Phase 15: Polish & Documentation

### Step 15.1: UI/UX Polish & Futuristic Styling
- [ ] Add loading skeletons with gradient shimmer effects
- [ ] Add error boundaries with beautiful error states
- [ ] Improve responsive design (desktop-first, mobile-friendly)
- [ ] Add keyboard shortcuts (optional)
- [ ] Implement smooth page transitions
- [ ] Add hover effects with glow on interactive elements
- [ ] Create animated gradient backgrounds
- [ ] Add glassmorphism effects to modals and cards
- [ ] Implement dark mode support (optional, with neon accents)
- [ ] Add micro-animations for state changes
- [ ] Style tables with gradient row highlights
- [ ] Create futuristic button styles with hover glow
- [ ] Add particle effects or animated backgrounds (optional, performance-conscious)

### Step 15.2: Documentation
- [ ] Document API endpoints
- [ ] Document hyperparameters
- [ ] Add inline code comments
- [ ] Create admin user guide

### Step 15.3: Performance Optimization
- [ ] Optimize database queries
- [ ] Add caching where appropriate
- [ ] Optimize large table renders
- [ ] Add virtual scrolling if needed

---

## File Structure Reference

```
toki-backend/
├── admin-panel/                    # React admin app
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── Login.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── WaitlistTab.tsx
│   │   │   │   ├── DatabaseTab.tsx
│   │   │   │   └── AlgorithmTab.tsx
│   │   │   ├── waitlist/
│   │   │   │   ├── WaitlistTable.tsx
│   │   │   │   ├── WaitlistEntryModal.tsx
│   │   │   │   └── WaitlistStats.tsx
│   │   │   ├── users/
│   │   │   │   ├── UsersTable.tsx
│   │   │   │   ├── UserEditModal.tsx
│   │   │   │   └── UserCreateModal.tsx
│   │   │   ├── tokis/
│   │   │   │   ├── TokisTable.tsx
│   │   │   │   ├── TokiEditModal.tsx
│   │   │   │   └── TokiCreateModal.tsx
│   │   │   ├── algorithm/
│   │   │   │   ├── HyperparameterSlider.tsx
│   │   │   │   ├── AlgorithmPreview.tsx
│   │   │   │   └── SaveConfirmationDialog.tsx
│   │   │   └── shared/
│   │   │       └── DeleteConfirmDialog.tsx
│   │   ├── hooks/
│   │   │   └── useAdminAuth.ts
│   │   ├── services/
│   │   │   └── adminApi.ts
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── theme.ts
│   │   │   └── components.css
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.ts (or similar)
│   └── build/                      # Built static files (served by Express)
├── src/
│   ├── routes/
│   │   ├── admin.ts (expand with all admin routes)
│   │   └── waitlist.ts (already exists)
│   ├── middleware/
│   │   └── auth.ts (update requireAdmin)
│   └── migrations/ (optional)
│       ├── add-admin-role.sql
│       ├── create-algorithm-hyperparameters.sql
│       └── create-email-templates.sql
└── index.ts (configure admin routes and serve React build)
```

**Access URLs:**
- Admin Login: `http://localhost:3002/admin/login`
- Admin Dashboard: `http://localhost:3002/admin`
- Admin API: `http://localhost:3002/api/admin/*`

---

## Priority Order (Recommended Implementation Sequence)

1. **Phase 1** - Database foundation (enables everything)
2. **Phase 2** - Admin authentication (required for all features)
3. **Phase 8** - Backend-served admin panel structure (basic admin UI setup)
4. **Phase 3** - Waitlist management API (quick win, high value)
5. **Phase 9** - Waitlist management UI (backend-served)
6. **Phase 4 & 5** - Database management API (core admin features)
7. **Phase 10 & 11** - Database management UI (backend-served)
8. **Phase 6** - Algorithm hyperparameters API (specific need)
9. **Phase 12** - Algorithm hyperparameters UI (backend-served)
10. **Phase 7** - Email templates API (enhances waitlist management)
11. **Phase 13** - Email template management UI (backend-served)
12. **Phase 14** - Testing & integration
13. **Phase 15** - Polish

---

## Notes

- All admin API routes should use `authenticateToken` + `requireAdmin` middleware
- Admin UI routes (`/admin`, `/admin/*`) serve React build files from Express
- Admin panel is served from backend, accessible at `http://yourbackend.com/admin`
- Admin React app is built and static files served from `toki-backend/admin-panel/build/`
- React Router handles client-side routing for all `/admin/*` paths
- Build admin panel before backend deployment: `cd admin-panel && npm run build`
- Consider adding audit logging for admin actions (track who changed what)
- Email template system can be extended for other email types later
- Algorithm hyperparameters should have a history/versioning system (optional enhancement)
- Consider adding export functionality for waitlist data (CSV/Excel)
- Use React hooks (useState, useEffect, useMemo, useCallback) for state management
- Consider using React Query or SWR for API data fetching and caching
- Use TypeScript for type safety across admin panel components
- **Design**: Match main app aesthetic but more futuristic - use same color palette (purples, teals, pinks) but with sharper gradients
- **Styling Library**: Consider styled-components, Tailwind CSS, or CSS Modules for component styling
- **Icons**: Use Lucide React (same as main app) with optional gradient fills
- **Animations**: Use Framer Motion or React Spring for smooth animations
- **Glassmorphism**: Implement glass-like effects with backdrop blur and transparency
- **Gradients**: Use CSS gradients throughout - buttons, backgrounds, borders, shadows
- **Visual Hierarchy**: Sharp, modern cards with elevation and glow effects
