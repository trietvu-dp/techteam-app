# Student Tech Support Application

## Overview

A multi-tenant web application that enables schools to manage student tech support teams. The platform provides device check/repair ticket management, gamified learning challenges, team rankings, and a comprehensive resource library. Students can track device repairs, earn points through challenges, and build technical skills while providing tech support services to their schools.

**Key Features:**
- Device check-in and repair tracking system
- Gamified learning with challenges, points, and rankings
- Resource library with tutorials and documentation
- Multi-tenant architecture with complete data isolation per school
- Mobile-first responsive design

## Recent Changes

**November 19, 2025 - Fixed Hardcoded Badge Counts with Performance Optimization:**
- Replaced all hardcoded badge counts with real data calculations:
  - DeviceChecks.tsx: "12 Checked", "8 Pending", "2 Issues" now calculated from actual device check tickets
  - Repairs.tsx: "2 Pending", "2 In Progress", "1 Completed" now calculated from actual repair tickets
  - Learn.tsx: "3 Joined" replaced with "{count} Available" showing actual number of active challenges
- All badge counts now dynamically update based on database state
- Counts are filtered by ticket status: completed, pending, issue (device checks), in_progress (repairs)
- Implemented performance optimizations:
  - Wrapped all data transformations and count calculations in `useMemo` hooks with proper dependencies
  - Added loading state placeholders to prevent layout shift during data fetch
  - DeviceChecks: Shows 3 placeholder badges ("...") during loading
  - Repairs: Shows "..." in stat cards during loading
  - Learn: Shows "Loading..." in challenge badge (always visible)
- Fixed status key inconsistency in Repairs component:
  - Changed `getStatusInfo` from "in-progress" (hyphen) to "in_progress" (underscore) to match database schema
  - Status labels and icons now correctly display for in-progress repair tickets

**November 19, 2025 - Removed All Hardcoded Data from Student Pages:**
- Replaced all hardcoded mock data in DeviceChecks.tsx, Repairs.tsx, and Learn.tsx with real database data
- Created 5 new student API endpoints:
  - `/api/student/device-checks` - Returns all device check tickets assigned to or created by the student
  - `/api/student/repairs` - Returns all repair tickets assigned to or created by the student
  - `/api/student/challenges` - Returns all active challenges
  - `/api/student/rankings` - Returns student rankings sorted by points
  - `/api/student/resources` - Returns learning resources (articles, videos, documents)
- Updated all student components to use TanStack Query with proper TypeScript types (Ticket, Challenge, Resource, User)
- Added comprehensive error handling with error states for all queries
- Added loading states and empty state messages for better UX
- All data transformations now use proper types without `any` casts
- Resources component now uses all fields from Resource schema (thumbnailUrl, duration, views, etc.)
- All components handle network failures gracefully with user-friendly error messages

**November 19, 2025 - Dynamic Teacher Dropdown in Device Check Forms:**
- Replaced hardcoded teacher list with dynamic API-based dropdown
- Created new API endpoint `/api/schools/:schoolId/teachers` that:
  - Fetches all admin users (role='admin') for the authenticated user's school
  - Sorts teachers alphabetically by last name, first name
  - Returns minimal fields: id, firstName, lastName, username, email
- Updated DeviceChecks component to:
  - Fetch teachers using TanStack Query with proper error handling
  - Display full names (firstName + lastName) with fallback to username
  - Show loading state ("Loading teachers...")
  - Show error state ("Error loading teachers" / "Failed to load teachers. Please try again.")
  - Implement searchable teacher dropdown using Command component
- Query key properly guards against undefined schoolId to prevent invalid API calls
- All teacher data now dynamically loaded from database per school (multi-tenant safe)

**November 18, 2025 - Fixed Admin Dashboard Routing Issue:**
- Resolved critical routing bug preventing admin pages from rendering
- Root cause: wouter's `component` prop in nested Switch blocks doesn't pass location context correctly
- Solution: Changed App.tsx to render dashboard component directly (`<Dashboard />`) instead of via Route component prop
- All 5 admin pages now render correctly: Overview, Students, Device Checks, Repairs, Learning Progress
- Sidebar navigation fully functional with proper route matching and active states
- Verified all admin components successfully load and fetch data from backend APIs

**November 18, 2025 - School Admin Dashboard with Sidebar Navigation:**
- Converted school admin dashboard from tabbed layout to sidebar navigation (matching student dashboard pattern)
- Created 5 new admin components for modular organization:
  - `AdminOverview` - School statistics overview with student/ticket counts
  - `AdminStudentsList` - Student management with add new student form
  - `AdminDeviceChecks` - All device check tickets with date/student sorting
  - `AdminRepairs` - All repair tickets with date/student sorting
  - `AdminLearningProgress` - Learning module completion tracking per student
- Added 3 new school admin API endpoints:
  - `PATCH /api/schools/:schoolId/students/:studentId` - Update student information
  - `POST /api/schools/:schoolId/students/:studentId/reset-password` - Reset student password
  - `GET /api/schools/:schoolId/students/:studentId/details` - Comprehensive student view with all tickets, challenges, and work logs
- Created detailed student view page (`StudentDetail`) with:
  - Student profile information and statistics (points, streak, ticket counts)
  - Edit student info dialog (username, email, first/last name)
  - Password reset dialog for admins
  - Tabbed interface showing device checks, repairs, learning modules, and work logs
- Implemented proper route parameter handling for student detail views
- All admin views properly scoped to school context with authorization checks

**November 18, 2025 - Student Dashboard Real Data Implementation:**
- Removed all hardcoded dummy data from student dashboard
- Created three dedicated API endpoints for student dashboard:
  - `/api/student/dashboard-stats` - Real-time statistics (checks today, active repairs, skills progress, pending tasks)
  - `/api/student/recent-activity` - Recent tickets created by or assigned to the student
  - `/api/student/skills-progress` - Challenge completion progress grouped by category
- Student dashboard now displays logged-in user's actual name and real data from database
- Implemented empty state handling for students with no data
- Fixed ticket creation: auto-assigns tickets to creating user, enforces 'pending' status for new tickets
- Fixed metrics: pending tasks now correctly counts open tickets (status 'pending' or 'in_progress')

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Material Design principles with modern SaaS refinements
- Mobile-first responsive design approach

**Design System:**
- Custom color palette defined via CSS variables in `client/src/index.css`
- Typography: Inter font family with defined scale (text-xs through text-3xl)
- Spacing primitives using Tailwind units (2, 4, 6, 8, 12, 16)
- Component variants using class-variance-authority (CVA)

**State Management:**
- Server state managed by TanStack Query with custom query client
- Local component state via React hooks
- Form state handled by react-hook-form with Zod validation

**Key UI Patterns:**
- Dashboard view with stats cards and quick actions
- Multi-step forms for device checks and repairs
- Tabbed interfaces for learning resources
- Command palette (cmdk) for student/teacher search
- Dialog modals for detail views and forms

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- Session-based authentication via express-session
- RESTful API design pattern

**Authentication & Authorization:**
- Replit Auth (OpenID Connect) for user authentication
- Session management with PostgreSQL-backed session store (connect-pg-simple)
- Role-based access control (admin vs student roles)
- Multi-tenant security with school-based data isolation

**Database Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Schema-first approach with migrations in `/migrations` directory
- Enum types for constrained values (device types, statuses, difficulty levels, etc.)

**Data Model Architecture:**
- Multi-tenant design with `schools` table as root entity
- All user data scoped to `schoolId` for complete data isolation
- Session storage table required for Replit Auth integration
- Comprehensive entity relationships: users, tickets, challenges, work logs, resources, achievements, certifications

**API Design:**
- Endpoints organized in `server/routes.ts`
- Input validation using Zod schemas derived from Drizzle schema
- Consistent error handling with HTTP status codes
- Authentication middleware (`isAuthenticated`) protecting all routes
- Storage abstraction layer in `server/storage.ts` for database operations

**Key API Endpoints:**
- `/api/auth/user` - Get current authenticated user
- `/api/onboarding/complete` - User onboarding with school assignment
- Ticket management endpoints (CRUD operations)
- Challenge and work log endpoints
- Resource library endpoints
- Rankings and statistics endpoints

### Multi-Tenancy Strategy

**School Isolation:**
- Every user belongs to exactly one school (`users.schoolId` foreign key)
- All queries filtered by authenticated user's school association
- Database-level constraints enforce data isolation
- No cross-school data access possible

**Onboarding Flow:**
- New users authenticated via Replit Auth
- Onboarding process assigns user to specific school
- User profile created with school assignment and role
- Default student role with gamification features enabled

### Deployment Architecture

**Build Process:**
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Single deployment artifact with static file serving

**Environment Configuration:**
- `DATABASE_URL` - Neon PostgreSQL connection string (required)
- `SESSION_SECRET` - Session encryption key (required)
- `ISSUER_URL` - Replit Auth OIDC endpoint (defaults to replit.com/oidc)
- `REPL_ID` - Replit application identifier (required for auth)

**Development vs Production:**
- Development: Vite dev server with HMR, Replit-specific plugins
- Production: Express serves pre-built static assets
- Conditional plugin loading based on `NODE_ENV` and `REPL_ID`

## External Dependencies

### Database
- **Neon PostgreSQL** - Serverless PostgreSQL database
  - Connection via `@neondatabase/serverless` with WebSocket support
  - Pool-based connection management
  - Schema managed by Drizzle Kit migrations

### Authentication
- **Replit Auth** - OpenID Connect authentication provider
  - OAuth 2.0 flow with PKCE
  - Session-based token management with refresh tokens
  - User claims: sub (user ID), email, profile data

### Third-Party Services
- **Google Fonts** - Inter and JetBrains Mono fonts via CDN
- **Radix UI** - Headless component primitives (20+ packages)
- **React ecosystem** - TanStack Query, React Hook Form, Wouter

### Development Tools
- **Replit Plugins** - Development banner, cartographer, runtime error modal (dev only)
- **Drizzle Kit** - Database migrations and schema management
- **TypeScript** - Type checking and compilation
- **Vite** - Frontend build tool and dev server
- **esbuild** - Backend bundler for production

### Key NPM Packages
- **UI Components**: @radix-ui/react-* (accordion, dialog, dropdown, etc.)
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Styling**: tailwindcss, class-variance-authority, clsx, tailwind-merge
- **Database**: drizzle-orm, drizzle-zod, @neondatabase/serverless
- **Auth**: openid-client, passport, express-session, connect-pg-simple
- **Utilities**: date-fns, nanoid, ws (WebSocket for Neon)

### Session Storage
- PostgreSQL `sessions` table (required for Replit Auth)
- Managed by `connect-pg-simple` adapter
- 7-day TTL with automatic cleanup