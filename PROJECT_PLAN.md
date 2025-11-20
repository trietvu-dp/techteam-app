# Student Tech Team Web Application - Project Plan

## Executive Summary

A multi-tenant web application enabling schools to manage student tech support teams. The platform provides device check/repair ticket management, and learning challenges or experiences - all with secure data isolation per school.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Development Phases](#development-phases)
7. [Technical Stack](#technical-stack)
8. [Security & Multi-tenancy](#security--multi-tenancy)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Feature Specifications](#feature-specifications)

---

## 1. Project Overview

### 1.1 Purpose
Enable student tech teams to efficiently manage device checks/repairs, review learning modules, and access other training resources while providing administrators with oversight and analytics.

### 1.2 Target Users
- **Digital Promise Super Admin)**: Manage and set up school accounts.
- **School Administrators**: Teachers who oversee student tech teams
- **Student Tech Team Members**: Students providing tech support services

### 1.3 Key Business Requirements
- Multi-tenant architecture with complete data isolation per school
- Mobile-first responsive design for tablets and smartphones
- Secure authentication and role-based access control
- Real-time ticket status tracking
- Gamified learning system with points and rankings
- Comprehensive learning and resource library

---

## 2. System Architecture

### 2.1 Architecture Pattern
**Three-tier Architecture with Multi-tenancy**

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  (React SPA - Mobile-first responsive design)           │
│  - Landing Page (Public)                                 │
│  - Dashboard (Authenticated)                             │
│  - Ticket Management                                     │
│  - Learning Platform                                     │
│  - Rankings & Analytics                                  │
│  - Resources Library                                     │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  (Node.js + Express + TypeScript)                       │
│  - Authentication Middleware           │
│  - Tenant Isolation Middleware                          │
│  - API Routes (/api/*)                                  │
│  - Business Logic                                        │
│  - Validation (Zod schemas)                             │
└─────────────────────────────────────────────────────────┘
                          ↕ Drizzle ORM
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  (PostgreSQL Database)                                   │
│  - Multi-tenant data with school_id foreign keys        │
│  - Row-level security enforcement                       │
│  - Indexed queries for performance                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Multi-tenancy Strategy
**Shared Database with Tenant Discriminator**

- Single database instance
- Every table includes `school_id` foreign key
- Application-level tenant isolation via middleware
- All queries filtered by authenticated user's school
- No cross-tenant data access possible

### 2.3 Data Flow

```
User Action (Frontend)
    ↓
API Request with Auth Token
    ↓
Authentication Middleware (validates session)
    ↓
Tenant Resolution Middleware (extracts school_id from user)
    ↓
Route Handler (business logic)
    ↓
Storage Layer (queries filtered by school_id)
    ↓
PostgreSQL Database
    ↓
Response (tenant-specific data only)
    ↓
Frontend Update (React Query cache invalidation)
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────┐
│   schools    │◄─────────│    users     │
│──────────────│ 1      * │──────────────│
│ id (PK)      │          │ id (PK)      │
│ name         │          │ school_id FK │
│ address      │          │ email        │
│ contact_email│          │ first_name   │
│ created_at   │          │ last_name    │
└──────────────┘          │ role (ENUM)  │
      ▲                   │ points       │
      │                   │ created_at   │
      │                   └──────────────┘
      │                         ▲
      │                         │
      │                   ┌─────┴─────┐
      │                   │           │
┌─────┴──────┐    ┌──────┴──────┐  ┌─┴────────────┐
│  tickets   │    │work_logs    │  │challenge_    │
│            │    │             │  │completions   │
│────────────│    │─────────────│  │──────────────│
│ id (PK)    │    │ id (PK)     │  │ id (PK)      │
│ school_id  │    │ school_id   │  │ school_id    │
│ assigned_to│    │ user_id FK  │  │ user_id FK   │
│ student_name│   │ log_date    │  │ challenge_id │
│ device_type│    │ description │  │ completed_at │
│ issue      │    │ created_at  │  │ points_earned│
│ status     │    └─────────────┘  └──────────────┘
│ created_at │
└────────────┘
      ▲
      │
┌─────┴──────────┐
│ ticket_notes   │
│────────────────│
│ id (PK)        │
│ school_id      │
│ ticket_id FK   │
│ user_id FK     │
│ note_text      │
│ created_at     │
└────────────────┘

┌──────────────┐      ┌────────────────┐
│ challenges   │      │   resources    │
│──────────────│      │────────────────│
│ id (PK)      │      │ id (PK)        │
│ title        │      │ title          │
│ description  │      │ category (ENUM)│
│ difficulty   │      │ content_type   │
│ points       │      │ url            │
│ is_active    │      │ description    │
│ created_at   │      │ created_at     │
└──────────────┘      └────────────────┘
```

### 3.2 Table Definitions

#### 3.2.1 Core Tables

**schools**
```typescript
{
  id: varchar (PK, UUID)
  name: varchar (255) NOT NULL
  address: text
  contactEmail: varchar (255)
  adminName: varchar (255)
  createdAt: timestamp DEFAULT now()
  updatedAt: timestamp DEFAULT now()
}
```

**users** 
```typescript
{
  id: varchar (PK)
  schoolId: varchar (FK → schools.id) NOT NULL
  email: varchar (255) UNIQUE
  firstName: varchar (100)
  lastName: varchar (100)
  profileImageUrl: varchar (500)
  role: enum ('admin', 'student') NOT NULL
  points: integer DEFAULT 0
  isActive: boolean DEFAULT true
  createdAt: timestamp DEFAULT now()
  updatedAt: timestamp DEFAULT now()
}
```

**tickets**
```typescript
{
  id: varchar (PK, UUID)
  schoolId: varchar (FK → schools.id) NOT NULL
  assignedTo: varchar (FK → users.id) NULL
  studentName: varchar (255) NOT NULL
  studentGrade: varchar (50) NOT NULL
  deviceType: enum ('ipad', 'chromebook', 'pc_laptop', 'macbook') NOT NULL
  issueType: enum ('check', 'repair') NOT NULL
  issueDescription: text NOT NULL
  status: enum ('pending', 'in_progress', 'complete') DEFAULT 'pending'
  createdAt: timestamp DEFAULT now()
  updatedAt: timestamp DEFAULT now()
}
```

**ticket_notes**
```typescript
{
  id: varchar (PK, UUID)
  schoolId: varchar (FK → schools.id) NOT NULL
  ticketId: varchar (FK → tickets.id) NOT NULL
  userId: varchar (FK → users.id) NOT NULL
  noteText: text NOT NULL
  createdAt: timestamp DEFAULT now()
}
```

#### 3.2.2 Learning & Gamification Tables

**challenges**
```typescript
{
  id: varchar (PK, UUID)
  title: varchar (255) NOT NULL
  description: text NOT NULL
  difficulty: enum ('beginner', 'intermediate', 'advanced') NOT NULL
  points: integer NOT NULL
  category: enum ('hardware', 'software', 'network', 'security', 'troubleshooting')
  isActive: boolean DEFAULT true
  createdAt: timestamp DEFAULT now()
}
```

**challenge_completions**
```typescript
{
  id: varchar (PK, UUID)
  schoolId: varchar (FK → schools.id) NOT NULL
  userId: varchar (FK → users.id) NOT NULL
  challengeId: varchar (FK → challenges.id) NOT NULL
  completedAt: timestamp DEFAULT now()
  pointsEarned: integer NOT NULL
  
  UNIQUE (userId, challengeId)
}
```

**work_logs**
```typescript
{
  id: varchar (PK, UUID)
  schoolId: varchar (FK → schools.id) NOT NULL
  userId: varchar (FK → users.id) NOT NULL
  logDate: date NOT NULL
  description: text NOT NULL
  createdAt: timestamp DEFAULT now()
}
```

**resources**
```typescript
{
  id: varchar (PK, UUID)
  title: varchar (255) NOT NULL
  category: enum ('hardware', 'software', 'network', 'security', 
                  'troubleshooting', 'best_practices', 'certifications')
  contentType: enum ('article', 'video', 'interactive', 'document')
  url: varchar (500)
  description: text
  thumbnailUrl: varchar (500)
  createdAt: timestamp DEFAULT now()
}
```

### 3.3 Indexes & Constraints

**Performance Indexes:**
- `idx_users_school_id` on users(school_id)
- `idx_tickets_school_id_status` on tickets(school_id, status)
- `idx_tickets_assigned_to` on tickets(assigned_to)
- `idx_challenge_completions_user` on challenge_completions(user_id)
- `idx_work_logs_user_date` on work_logs(user_id, log_date DESC)

**Unique Constraints:**
- users.email (globally unique)
- challenge_completions (user_id, challenge_id) (no duplicate completions)

**Foreign Key Cascades:**
- All school_id references: ON DELETE CASCADE
- ticket_notes.ticket_id: ON DELETE CASCADE
- challenge_completions.challenge_id: ON DELETE RESTRICT

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
App.tsx
├── ThemeProvider (dark/light mode)
├── AuthProvider
├── QueryClientProvider (TanStack Query)
└── Router
    ├── Landing (public)
    │   ├── Hero
    │   ├── Features
    │   ├── LoginButton
    │   └── Footer
    │
    ├── AppLayout (authenticated, with sidebar)
    │   ├── Sidebar
    │   │   ├── SchoolInfo
    │   │   ├── Navigation
    │   │   └── UserProfile
    │   │
    │   ├── Header
    │   │   ├── Breadcrumbs
    │   │   ├── Search
    │   │   └── ThemeToggle
    │   │
    │   └── MainContent
    │       ├── Dashboard
    │       │   ├── StatsCards
    │       │   ├── RecentTickets
    │       │   └── QuickActions
    │       │
    │       ├── Tickets
    │       │   ├── TicketList
    │       │   │   ├── FilterBar
    │       │   │   ├── SearchInput
    │       │   │   └── TicketCard[]
    │       │   ├── TicketDetail
    │       │   │   ├── TicketHeader
    │       │   │   ├── TicketInfo
    │       │   │   ├── NotesSection
    │       │   │   └── ActionButtons
    │       │   └── NewTicketDialog
    │       │       └── TicketForm
    │       │
    │       ├── Learning
    │       │   ├── TabNavigation
    │       │   ├── Challenges
    │       │   │   ├── ActiveChallenges
    │       │   │   └── RecommendedChallenges
    │       │   ├── WorkLog
    │       │   │   ├── LogForm
    │       │   │   ├── ActivityCalendar
    │       │   │   └── RecentLogs
    │       │   └── Rankings
    │       │       ├── LeaderboardTable
    │       │       └── UserRankCard
    │       │
    │       ├── Resources
    │       │   ├── CategoryTabs
    │       │   └── ResourceGrid
    │       │       └── ResourceCard[]
    │       │
    │       └── Settings (admin only)
    │           ├── SchoolSettings
    │           ├── TeamManagement
    │           │   ├── StudentList
    │           │   └── InviteStudentDialog
    │           └── ProfileSettings
    │
    └── NotFound
```

### 4.2 Page Specifications

#### 4.2.1 Landing Page (Public)
**Route:** `/`
**Access:** Unauthenticated users
**Components:**
- Hero section with application overview
- Feature highlights (3 columns on desktop, stacked on mobile)
- Call-to-action: "Get Started" button → redirects to `/api/login`
- Responsive navigation bar

#### 4.2.2 Dashboard (Home)
**Route:** `/` (authenticated)
**Access:** All authenticated users
**Components:**
- **Stats Cards** (4-column grid → 2 columns on tablet → 1 on mobile):
  - Total Open Tickets
  - Tickets In Progress
  - Completed This Week
  - Your Points
- **Recent Tickets** (last 5, with quick actions)
- **Quick Actions Bar**:
  - New Ticket button
  - Log Work button
  - View Challenges link
- **Activity Feed** (recent team activity)

#### 4.2.3 Tickets Page
**Route:** `/tickets`
**Access:** All authenticated users
**Features:**
- **Filter Bar:**
  - Status dropdown (All, Pending, In Progress, Complete)
  - Device type filter
  - Date range picker
  - Assigned to me toggle
- **Search:** Real-time search by student name or issue
- **Ticket List:** Card-based layout with:
  - Ticket ID badge
  - Status badge (color-coded)
  - Student name & grade
  - Device type icon
  - Issue preview (truncated)
  - Assigned tech member avatar
  - Timestamp
- **Ticket Detail View (Modal or Side Panel):**
  - Full ticket information
  - Edit status dropdown (for assigned user or admin)
  - Notes section with timestamp
  - Add note form
  - Activity timeline
- **New Ticket Form (Dialog):**
  - Student name (text input)
  - Student grade (select)
  - Device type (radio buttons with icons)
  - Issue type (Check/Repair radio)
  - Issue description (textarea)
  - Submit button

#### 4.2.4 Learning Platform
**Route:** `/learning`
**Access:** All authenticated users
**Tab Navigation:**

**Tab 1: Challenges**
- **Active Challenges:** Grid of challenge cards showing:
  - Title
  - Difficulty badge
  - Points value
  - Description preview
  - Completion status (for user)
  - "Start" or "View Details" button
- **Recommended Challenges:** Similar grid for suggested challenges
- **Challenge Detail View (Dialog):**
  - Full description
  - Learning objectives
  - Step-by-step instructions
  - Mark as complete button
  - Points award confirmation

**Tab 2: Work Log**
- **Log Entry Form:**
  - Date picker (defaults to today)
  - Description textarea
  - Submit button
- **Activity Calendar:**
  - Month view with dots indicating logged days
  - Click day to view logs
- **Recent Work Logs:**
  - List of last 10 entries with date and description
  - Edit/delete actions

**Tab 3: Rankings**
- **Leaderboard Table:**
  - Rank number
  - User avatar and name
  - Total points
  - Badges/achievements
  - Highlighted row for current user
- **Your Rank Card:**
  - Current rank
  - Points
  - Next rank threshold
  - Progress bar

**Tab 4: Resources** (linked here or separate page)

#### 4.2.5 Resources Page
**Route:** `/resources`
**Access:** All authenticated users
**Layout:**
- **Category Tabs:** Hardware | Software | Network | Security | Troubleshooting | Best Practices | Certifications
- **Resource Grid:** (3 columns → 2 → 1 responsive)
  - Resource card showing:
    - Thumbnail image
    - Title
    - Content type badge (Video/Article/Interactive/Document)
    - Description preview
    - "View Resource" link/button
- **Search & Filter Bar:**
  - Search by title
  - Filter by content type

#### 4.2.6 Settings Page (Admin Only)
**Route:** `/settings`
**Access:** Admin role only
**Sections:**
- **School Information:**
  - School name (editable)
  - Contact email
  - Address
  - Save button
- **Team Management:**
  - Student list table (name, email, points, status, actions)
  - Invite student button → opens dialog with email input
  - Deactivate/activate user toggle
- **Profile Settings:**
  - User's own profile information
  - Change password option (if applicable)

### 4.3 State Management

**TanStack Query (React Query) Strategy:**

```typescript
// Query Keys Structure
const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (filters: TicketFilters) => [...queryKeys.tickets.lists(), filters] as const,
    details: () => [...queryKeys.tickets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tickets.details(), id] as const,
  },
  challenges: {
    all: ['challenges'] as const,
    active: () => [...queryKeys.challenges.all, 'active'] as const,
    recommended: () => [...queryKeys.challenges.all, 'recommended'] as const,
    detail: (id: string) => [...queryKeys.challenges.all, id] as const,
  },
  users: {
    me: ['users', 'me'] as const,
    school: (schoolId: string) => ['users', 'school', schoolId] as const,
    rankings: () => ['users', 'rankings'] as const,
  },
  workLogs: {
    all: ['workLogs'] as const,
    byUser: (userId: string) => [...queryKeys.workLogs.all, userId] as const,
    byDate: (date: string) => [...queryKeys.workLogs.all, 'date', date] as const,
  },
  resources: {
    all: ['resources'] as const,
    byCategory: (category: string) => [...queryKeys.resources.all, category] as const,
  },
};
```

**Cache Invalidation Strategy:**
- On ticket creation: Invalidate `tickets.lists()`
- On ticket update: Invalidate specific `tickets.detail(id)` and `tickets.lists()`
- On challenge completion: Invalidate `challenges.all`, `users.rankings`, `users.me`
- On work log creation: Invalidate `workLogs.byUser(userId)`

**Optimistic Updates:**
- Ticket status changes
- Adding notes to tickets
- Marking challenges complete

### 4.4 Responsive Design Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

**Mobile Adaptations:**
- Sidebar → Hamburger menu with drawer
- 3-column grids → Single column
- Tables → Card-based lists
- Inline forms → Full-width stacked forms
- Hover states → Touch-friendly tap targets (min 44x44px)

---

## 5. Backend Architecture

### 5.1 API Routes

**Authentication Routes:**
```
GET  /api/login              → Initiate OIDC login
GET  /api/callback           → OIDC callback handler
GET  /api/logout             → Logout and clear session
GET  /api/auth/user          → Get current authenticated user
```

**School Routes:**
```
POST /api/schools            → Create new school (during registration)
GET  /api/schools/:id        → Get school details
PUT  /api/schools/:id        → Update school info (admin only)
```

**User Routes:**
```
GET  /api/users              → List users in school (admin only)
GET  /api/users/me           → Get current user profile
PUT  /api/users/me           → Update own profile
GET  /api/users/rankings     → Get leaderboard for school
POST /api/users/invite       → Invite new student (admin only)
PUT  /api/users/:id/activate → Activate/deactivate user (admin only)
```

**Ticket Routes:**
```
GET    /api/tickets          → List tickets (filtered by school)
                               Query params: ?status=pending&deviceType=ipad&search=john
POST   /api/tickets          → Create new ticket
GET    /api/tickets/:id      → Get ticket details
PUT    /api/tickets/:id      → Update ticket (status, assignment)
DELETE /api/tickets/:id      → Delete ticket (admin only)

POST   /api/tickets/:id/notes → Add note to ticket
GET    /api/tickets/:id/notes → Get notes for ticket
```

**Challenge Routes:**
```
GET  /api/challenges               → List all challenges
GET  /api/challenges/active        → Get active challenges for user
GET  /api/challenges/recommended   → Get recommended challenges
GET  /api/challenges/:id           → Get challenge details
POST /api/challenges/:id/complete  → Mark challenge complete
```

**Work Log Routes:**
```
GET    /api/work-logs        → Get work logs (filtered by user/date)
                               Query params: ?userId=123&date=2024-01-15
POST   /api/work-logs        → Create work log entry
PUT    /api/work-logs/:id    → Update work log
DELETE /api/work-logs/:id    → Delete work log
```

**Resource Routes:**
```
GET  /api/resources          → List resources
                               Query params: ?category=hardware&contentType=video
GET  /api/resources/:id      → Get resource details
```

### 5.2 Middleware Stack

```typescript
// Execution order (top to bottom)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(getSession());              // Session management
app.use(passport.initialize());
app.use(passport.session());

// Protected routes
app.use('/api/*', isAuthenticated); // Verify user session
app.use('/api/*', extractTenant);   // Extract school_id from user
app.use('/api/*', validateInput);   // Zod schema validation

// Route handlers
registerRoutes(app);

// Error handling
app.use(errorHandler);
```

### 5.3 Tenant Isolation Middleware

```typescript
// server/middleware/tenant.ts
export const extractTenant: RequestHandler = async (req, res, next) => {
  const userId = req.user?.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const user = await storage.getUser(userId);
  
  if (!user || !user.schoolId) {
    return res.status(403).json({ message: 'User not associated with a school' });
  }
  
  // Attach schoolId to request for downstream use
  req.schoolId = user.schoolId;
  req.userRole = user.role;
  
  next();
};
```

### 5.4 Storage Layer Interface

```typescript
// server/storage.ts
export interface IStorage {
  // School operations
  createSchool(school: InsertSchool): Promise<School>;
  getSchool(id: string): Promise<School | undefined>;
  updateSchool(id: string, updates: Partial<School>): Promise<School>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersBySchool(schoolId: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserPoints(userId: string, pointsDelta: number): Promise<User>;
  getRankings(schoolId: string): Promise<User[]>;
  
  // Ticket operations
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  getTickets(schoolId: string, filters: TicketFilters): Promise<Ticket[]>;
  getTicket(id: string, schoolId: string): Promise<Ticket | undefined>;
  updateTicket(id: string, schoolId: string, updates: Partial<Ticket>): Promise<Ticket>;
  deleteTicket(id: string, schoolId: string): Promise<void>;
  
  // Ticket notes
  createTicketNote(note: InsertTicketNote): Promise<TicketNote>;
  getTicketNotes(ticketId: string, schoolId: string): Promise<TicketNote[]>;
  
  // Challenge operations
  getChallenges(): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  getActiveChallenges(userId: string): Promise<ChallengeWithProgress[]>;
  getRecommendedChallenges(userId: string): Promise<Challenge[]>;
  completeChallenge(userId: string, challengeId: string, schoolId: string): Promise<ChallengeCompletion>;
  getUserChallengeCompletions(userId: string): Promise<ChallengeCompletion[]>;
  
  // Work log operations
  createWorkLog(log: InsertWorkLog): Promise<WorkLog>;
  getWorkLogs(filters: WorkLogFilters): Promise<WorkLog[]>;
  updateWorkLog(id: string, schoolId: string, updates: Partial<WorkLog>): Promise<WorkLog>;
  deleteWorkLog(id: string, schoolId: string): Promise<void>;
  
  // Resource operations
  getResources(filters: ResourceFilters): Promise<Resource[]>;
  getResource(id: string): Promise<Resource | undefined>;
}
```

### 5.5 Validation Schemas (Zod)

```typescript
// Ticket validation example
export const createTicketSchema = insertTicketSchema
  .omit({ id: true, createdAt: true, updatedAt: true, schoolId: true })
  .extend({
    studentName: z.string().min(1, "Student name is required").max(255),
    studentGrade: z.string().min(1, "Grade is required"),
    issueDescription: z.string().min(10, "Please provide a detailed description"),
  });

// Challenge completion validation
export const completeChallengeSchema = z.object({
  challengeId: z.string().uuid(),
});

// Work log validation
export const createWorkLogSchema = insertWorkLogSchema
  .omit({ id: true, createdAt: true, schoolId: true })
  .extend({
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    description: z.string().min(10, "Please provide more details"),
  });
```

---

## 6. Development Phases

### Phase 1: Schema & Frontend (Beautiful UI Foundation)
**Duration:** Comprehensive (largest phase)
**Priority:** Highest - Establishes visual excellence

**Deliverables:**
1. **Complete Database Schema** (`shared/schema.ts`)
   - All tables with relationships
   - Zod validation schemas
   - TypeScript types for all entities

2. **Design System Implementation**
   - Update `tailwind.config.ts` with color palette
   - Configure `index.html` with Inter and JetBrains Mono fonts
   - Keep `index.css` unchanged (pre-configured)

3. **Comprehensive UI Component Library**
   - All page layouts (Landing, Dashboard, Tickets, Learning, Resources, Settings)
   - Reusable components (TicketCard, ChallengeCard, StatsCard, LeaderboardTable, etc.)
   - Forms with validation UI (NewTicketForm, WorkLogForm, etc.)
   - Modals and dialogs (TicketDetail, ChallengeDetail, InviteStudent)
   - Navigation components (Sidebar, Header, Breadcrumbs)
   - Empty states, loading skeletons, error boundaries
   - Responsive layouts for all breakpoints
   - Beautiful interactions (hover states, transitions, animations)
   - Perfect accessibility (ARIA labels, keyboard navigation, focus management)

**Quality Standards:**
- Pixel-perfect alignment and spacing
- Consistent color contrast (WCAG AA minimum)
- Smooth animations (60fps)
- Mobile-first responsive design
- Touch-friendly targets (minimum 44x44px)
- Beautiful empty states with helpful messaging
- Elegant loading states (skeletons, not spinners where possible)

**Mock Data Strategy:**
- Use TypeScript constants for realistic mock data during Phase 1
- Clear separation of mock data from component logic
- Easy to replace with API calls in Phase 3

---

### Phase 2: Backend Implementation
**Duration:** Moderate
**Priority:** High - Enables functionality

**Deliverables:**
1. **Database Setup**
   - Create `server/db.ts` with Drizzle connection
   - Run `npm run db:push` to create tables
   - Verify schema in database

2. **Storage Layer Implementation**
   - Replace `MemStorage` with `DatabaseStorage` in `server/storage.ts`
   - Implement all `IStorage` methods
   - Add proper error handling and logging

3. **Auth Integration**
   - Implement `server/auth.ts` (from blueprint)
   - Configure session management with PostgreSQL
   - Set up OIDC callbacks

4. **API Route Handlers**
   - Implement all routes in `server/routes.ts`
   - Add tenant isolation middleware
   - Add Zod validation for request bodies
   - Implement business logic:
     * Ticket assignment logic
     * Points calculation for challenges
     * Rankings algorithm (ORDER BY points DESC)
     * Work log aggregation
   - Error handling with proper status codes

5. **Middleware Stack**
   - Authentication middleware (`isAuthenticated`)
   - Tenant extraction middleware (`extractTenant`)
   - Role-based access control (`requireAdmin`)
   - Request validation middleware

**Testing:**
- Manual API testing with curl/Postman
- Verify tenant isolation (cannot access other school's data)
- Test authentication flows
- Validate all CRUD operations

---

### Phase 3: Integration, Polish & Testing
**Duration:** Moderate
**Priority:** Critical - Ensures quality

**Deliverables:**
1. **Frontend-Backend Integration**
   - Replace all mock data with TanStack Query hooks
   - Implement all mutations with cache invalidation
   - Add optimistic updates for instant feedback
   - Handle loading states (show skeletons)
   - Handle error states (toast notifications)
   - Implement retry logic for failed requests

2. **Authentication Flow**
   - Implement `useAuth` hook
   - Protect routes based on authentication
   - Handle unauthorized errors (401 redirects)
   - Implement landing page for logged-out users
   - Home page for logged-in users

3. **Error Handling**
   - Page-level error boundaries
   - Endpoint-level error handling with toasts
   - Graceful degradation for network failures
   - User-friendly error messages

4. **Polish & UX Improvements**
   - Add micro-interactions (button press states, card hover effects)
   - Implement keyboard shortcuts (Cmd+K for search, etc.)
   - Add confirmation dialogs for destructive actions
   - Implement form auto-save drafts (localStorage)
   - Add success animations (checkmarks, confetti for challenge completion)

5. **End-to-End Testing**
   - Test critical user flows with `run_test` tool:
     * User registration and login
     * Creating and managing tickets
     * Completing challenges and earning points
     * Viewing rankings
     * Logging work
     * Browsing resources
   - Test on multiple breakpoints (mobile, tablet, desktop)
   - Verify multi-tenant isolation
   - Performance testing (page load times, query optimization)

**Success Criteria:**
- All MVP features functional and tested
- No console errors or warnings
- Responsive on all breakpoints
- Beautiful UI matching design guidelines
- Fast page loads (<2 seconds)
- No data leakage between tenants

---

## 7. Technical Stack

### 7.1 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Wouter | Latest | Client-side routing |
| TanStack Query | 5.x | Data fetching & caching |
| React Hook Form | Latest | Form management |
| Zod | Latest | Schema validation |
| Tailwind CSS | 3.x | Styling framework |
| Shadcn UI | Latest | Component library |
| Lucide React | Latest | Icon system |
| date-fns | Latest | Date manipulation |
| Recharts | Latest | Data visualization |

### 7.2 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime environment |
| Express.js | 5.x | Web framework |
| TypeScript | 5.x | Type safety |
| Drizzle ORM | Latest | Database ORM |
| PostgreSQL | 15+ | Primary database |
| Passport.js | Latest | Authentication |
| OpenID Client | Latest | OIDC implementation |
| Express Session | Latest | Session management |
| Zod | Latest | Server-side validation |

### 7.3 Development Tools

| Tool | Purpose |
|------|---------|
| Vite | Build tool & dev server |
| ESLint | Code linting |
| Prettier | Code formatting |
| Drizzle Kit | Database migrations |
| tsx | TypeScript execution |

---

## 8. Security & Multi-tenancy

### 8.1 Authentication Strategy
- **Provider:** Auth (OpenID Connect)
- **Supported Methods:** Google, GitHub, Apple, Email/Password
- **Session Storage:** PostgreSQL (secure, persistent)
- **Session Duration:** 7 days
- **Token Refresh:** Automatic via refresh tokens

### 8.2 Authorization Model

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | - Full access to all schools' data<br>- Manage team members for all schools (invite, activate, deactivate)<br>- Edit school settings<br>- View all tickets and analytics<br>- All student permissions |
| **Admin** | - Full access to school data<br>- Manage team members (invite, activate, deactivate)<br>- Edit school settings<br>- View all tickets and analytics<br>- All student permissions |
| **Student** | - View and create tickets<br>- Assign tickets to self<br>- Add notes to tickets<br>- Complete challenges<br>- Log work<br>- View resources<br>- View rankings |

### 8.3 Data Isolation Strategy

**Multi-tenant Security Layers:**

1. **Application Layer:**
   ```typescript
   // Every query automatically filtered by school_id
   const tickets = await storage.getTickets(req.schoolId, filters);
   ```

2. **Database Layer:**
   ```sql
   -- All tenant-specific tables include school_id
   CREATE INDEX idx_tickets_school ON tickets(school_id);
   ```

3. **Middleware Enforcement:**
   ```typescript
   // Tenant extraction middleware
   req.schoolId = user.schoolId; // Attached to every request
   ```

4. **Validation Layer:**
   ```typescript
   // Ensure user can only access their school's data
   if (ticket.schoolId !== req.schoolId) {
     throw new ForbiddenError();
   }
   ```

### 8.4 Security Best Practices

**Input Validation:**
- All API inputs validated with Zod schemas
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection via session cookies (SameSite, httpOnly, secure)

**Secrets Management:**
- `SESSION_SECRET` stored in environment variables
- `DATABASE_URL` never exposed to frontend
- OIDC credentials (REPL_ID) kept server-side only

**API Security:**
- All routes require authentication (except landing page)
- Rate limiting on sensitive endpoints (TBD in future phase)
- CORS configured for specific domains

---

## 9. User Roles & Permissions

### 9.1 User Journey: School Administrator

**Onboarding:**
1. Lands on public landing page
2. Clicks "Get Started" → redirects to `/api/login`
3. Logs in
4. First-time login → prompted to create school profile
   - School name
   - Address
   - Contact email
5. Redirected to Dashboard with setup wizard

**Daily Workflow:**
1. Views dashboard with team stats
2. Reviews pending tickets
3. Assigns tickets to students
4. Invites new students to team (via Settings page)
5. Monitors team rankings and progress
6. Reviews completed work logs

**Permissions:**
- All student permissions +
- Manage team members (invite, activate, deactivate)
- Edit school information
- View analytics (future phase)
- Delete tickets

### 9.2 User Journey: Student Tech Team Member

**Onboarding:**
1. Receives email invitation from admin
2. Clicks invitation link → `/api/login`
3. Logs in
4. Automatically associated with school
5. Sees welcome message and dashboard

**Daily Workflow:**
1. **Morning:** Checks dashboard for assigned tickets
2. **Device Check/Repair:**
   - Views ticket details
   - Changes status to "In Progress"
   - Performs check/repair
   - Adds notes documenting work
   - Marks ticket "Complete"
3. **Learning:**
   - Browses recommended challenges
   - Completes challenges to earn points
   - Logs daily work in work log
4. **Resource Browsing:**
   - Watches training videos
   - Reads troubleshooting guides
5. **Checks Rankings:** Views leaderboard position

**Permissions:**
- Create tickets
- View all tickets in school
- Update tickets assigned to them
- Add notes to any ticket
- Complete challenges
- Log work
- View resources
- View rankings

---

## 10. Feature Specifications

### 10.1 Device Check & Repair System

**Ticket Lifecycle:**
```
[Created] → [Pending] → [In Progress] → [Complete]
    ↓
[Assigned to Student] (optional)
    ↓
[Notes Added] (multiple, with timestamps)
```

**Required Fields:**
- Student name (text)
- Student grade (select: K-12 + Other)
- Device type (radio: iPad, Chromebook, PC Laptop, MacBook)
- Issue type (radio: Check, Repair)
- Issue description (textarea, min 10 chars)

**Auto-generated:**
- Ticket ID (UUID)
- Timestamp (created_at)
- Status (default: Pending)

**Ticket Actions:**
- **View:** Anyone in school
- **Edit Status:** Assigned user or admin
- **Add Notes:** Anyone in school
- **Delete:** Admin only
- **Assign:** Admin or self-assignment

**Filters:**
- Status (Pending, In Progress, Complete, All)
- Device Type (multi-select)
- Assigned to Me (toggle)
- Date Range (from - to)
- Search (student name, issue description)

### 10.2 Learning Challenges System

**Challenge Structure:**
- **Title:** Short, descriptive (e.g., "Replace a Chromebook Screen")
- **Description:** Detailed instructions with steps
- **Difficulty:** Beginner, Intermediate, Advanced
- **Points:** 10-100 based on difficulty
- **Category:** Hardware, Software, Network, Security, Troubleshooting
- **Active Status:** Only active challenges shown to students

**Challenge States:**
- **Not Started:** User hasn't attempted
- **Completed:** User marked as complete (once per challenge)

**Completion Flow:**
1. Student views challenge details
2. Reads instructions
3. Performs task in real world
4. Clicks "Mark as Complete"
5. Confirmation dialog
6. Points awarded immediately
7. Challenge moves to "Active Challenges"
8. User's total points updated
9. Rankings refreshed

**Points System:**
- Beginner: 10-25 points
- Intermediate: 30-60 points
- Advanced: 70-100 points
- Bonus for completing challenges in new categories

### 10.3 Work Log System

**Purpose:** Daily activity tracking and reflection

**Entry Structure:**
- **Date:** Single date (not range)
- **Description:** Freeform text (min 10 chars)
- **User:** Auto-attached
- **School:** Auto-attached

**Calendar View:**
- Month grid view
- Dots on days with entries
- Click day → view/edit entries
- Highlight today

**Recent Logs:**
- Last 10 entries
- Sorted by date DESC
- Edit/delete actions
- Pagination (future phase)

### 10.4 Rankings & Leaderboard

**Ranking Calculation:**
- **Primary:** Total points (challenges + bonuses)
- **Tiebreaker:** Earlier join date (who reached points first)

**Leaderboard Display:**
- Rank number (#1, #2, etc.)
- User avatar
- User name
- Total points
- Badge icons (future: achievements)
- Highlight current user's row

**Your Rank Card:**
- Current rank in school
- Total points
- Next rank threshold (e.g., "15 points to #5")
- Progress bar

**Updates:**
- Real-time on challenge completion
- Recalculated on page load

### 10.5 Resources Library

**Resource Categories:**
1. **Hardware:** Physical device repair guides
2. **Software:** OS, apps, drivers troubleshooting
3. **Network:** Wi-Fi, connectivity, network setup
4. **Security:** Password management, malware removal
5. **Troubleshooting:** General problem-solving strategies
6. **Best Practices:** Workflow optimization, customer service
7. **Certifications:** Info on CompTIA A+, Google IT Support, etc.

**Resource Types:**
- **Article:** Written guides (external links)
- **Video:** Tutorial videos (YouTube, Vimeo embedded)
- **Interactive:** Simulations, quizzes (future phase)
- **Document:** PDFs, manuals (download links)

**Resource Card:**
- Thumbnail image
- Title
- Category badge
- Content type icon
- Short description (2-3 lines)
- "View Resource" button

**Filters:**
- Category tabs (horizontal)
- Content type filter (dropdown)
- Search by title

---


## 11. Success Metrics

### 11.1 Technical KPIs
- Page load time < 2 seconds
- API response time < 500ms (95th percentile)
- Zero data leakage incidents (multi-tenant isolation)
- 99.9% uptime
- Zero critical security vulnerabilities

### 11.2 User Experience KPIs
- Mobile-first responsive design (all features work on phones)
- WCAG AA accessibility compliance
- Zero console errors on production
- Intuitive navigation (users complete tasks without help)

### 11.3 Feature Adoption KPIs (Future)
- Average tickets created per student per week
- Challenge completion rate
- Daily active users
- Work log completion rate

---

## 12. Deployment & Operations

### 12.1 Deployment
- **Environment:** AWS EC2
- **Database:** AWS RDS PostgreSQL
- **Domain:** techteam.dpvils.org
- **SSL/TLS:** Let's Encrypt
- **Environment Variables:**
  - `DATABASE_URL` (auto-configured)
  - `SESSION_SECRET` (auto-configured)
  - `REPL_ID` (auto-configured)
  - `ISSUER_URL` (auto-configured)

### 12.2 Monitoring (Future Phase)
- Application logs (console.log → structured logging)
- Error tracking (Sentry integration)
- Performance monitoring (Web Vitals)
- Database query analysis

---

## 13. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data leakage between schools | **Critical** | Low | Rigorous testing of tenant isolation, middleware enforcement |
| Poor mobile performance | High | Medium | Mobile-first development, performance budgets |
| User confusion with multi-role UX | Medium | Medium | Clear role indicators, contextual help, onboarding wizard |
| Challenge completion fraud | Medium | Medium | Honor system for MVP, verification system in future phase |
| Session hijacking | High | Low | Secure cookies (httpOnly, secure, SameSite), short session TTL |

---

## 14. Conclusion

This project plan provides a comprehensive roadmap for building a production-ready, multi-tenant student tech support platform. The phased approach ensures:

1. **Beautiful UI First:** Establishes visual excellence and user experience early
2. **Solid Backend:** Implements secure, scalable data persistence
3. **Seamless Integration:** Connects frontend and backend with proper error handling
4. **Quality Assurance:** Thorough testing and review

The resulting application will empower student tech teams to manage device repairs efficiently while gamifying the learning experience through challenges, rankings, and comprehensive resources.

