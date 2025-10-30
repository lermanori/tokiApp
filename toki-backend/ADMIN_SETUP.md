# Admin Panel Setup & Testing Guide

## ✅ Migrations Status

**All migrations have been run successfully!**
- ✅ Admin role column added to `users` table
- ✅ `algorithm_hyperparameters` table created
- ✅ `email_templates` table created

Migrations now run automatically on server startup. They are idempotent (safe to run multiple times).

## 🚀 Quick Start

### 1. Build & Start Backend (includes admin panel build)

```bash
npm run dev
# This will:
# 1. Build the admin panel React app
# 2. Run database migrations
# 3. Start the backend server
```

Or separately:

```bash
# Build admin panel only
npm run build:admin

# Run migrations manually
npm run migrate

# Start backend
npm start
```

### 2. Access Admin Panel

Once the server is running:
- **Admin Login**: http://localhost:3002/admin/login
- **Admin Dashboard**: http://localhost:3002/admin

### 3. Create Admin User

Before logging in, you need to grant admin role to a user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

## 📁 File Structure

```
toki-backend/
├── admin-panel/              # React admin app
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/           # Custom hooks (useAdminAuth)
│   │   ├── services/        # API service (adminApi)
│   │   └── styles/         # CSS and theme
│   └── build/               # Built static files (served by Express)
├── src/
│   ├── scripts/
│   │   ├── add-admin-role.sql
│   │   ├── create-algorithm-hyperparameters.sql
│   │   ├── create-email-templates.sql
│   │   └── run-migrations.ts  # Migration runner
│   ├── routes/
│   │   └── admin.ts        # Admin API endpoints
│   └── index.ts            # Main server (serves admin panel)
```

## 🔌 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get current admin info

### Waitlist Management
- `GET /api/admin/waitlist` - List all entries (with pagination, filtering, sorting)
- `GET /api/admin/waitlist/:id` - Get single entry
- `GET /api/admin/waitlist/stats` - Get statistics
- `POST /api/admin/waitlist/:id/user` - Create user from waitlist entry
- `POST /api/admin/waitlist/:id/email` - Send email to entry

## 🎨 Admin Panel Features

### Current Implementation
- ✅ Login page with futuristic styling
- ✅ Dashboard with tabs (Waitlist, Database, Algorithm)
- ✅ Authentication system with JWT tokens
- ✅ API service with all endpoints defined

### Coming Soon (Phase 9+)
- ⏳ Waitlist management UI (table, filters, pagination)
- ⏳ User creation from waitlist
- ⏳ Email sending interface
- ⏳ Database management (Users & Tokis CRUD)
- ⏳ Algorithm hyperparameter tuning UI

## 🔧 Development

### Making Changes to Admin Panel

```bash
# Edit files in admin-panel/src/
# Rebuild (will be done automatically on dev/start):
npm run build:admin
```

### Adding New Migrations

1. Create SQL file in `src/scripts/`
2. Add migration logic to `src/scripts/run-migrations.ts`
3. Migrations run automatically on server start

## 📝 Notes

- Admin panel is served from `/admin/*` routes
- All admin API endpoints are under `/api/admin/*`
- JWT tokens are stored in localStorage (admin_token)
- Migrations are idempotent - safe to run multiple times

