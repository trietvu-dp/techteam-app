# Design Guidelines: Student Tech Support Application

## Design Approach

**Selected Approach**: Design System (Material Design) with Modern SaaS Refinements

**Justification**: This is a utility-focused productivity application requiring efficiency, learnability, and information density. Drawing from Material Design's proven patterns for forms and data display, enhanced with modern SaaS aesthetics from Linear and Notion for cleaner, more contemporary feel.

**Key Design Principles**:
- Clarity over decoration
- Efficient information hierarchy
- Mobile-first responsive design
- Accessible, high-contrast interfaces
- Consistent interaction patterns across all features

---

## Typography System

**Font Families**:
- Primary: Inter (CDN: Google Fonts)
- Monospace: JetBrains Mono (for device IDs, timestamps)

**Type Scale**:
- Headings: text-3xl (30px), text-2xl (24px), text-xl (20px) - font-semibold
- Body: text-base (16px) - font-normal
- Small: text-sm (14px) - labels, metadata
- Tiny: text-xs (12px) - timestamps, badges

**Hierarchy Rules**:
- Page titles: text-3xl font-semibold
- Section headers: text-xl font-semibold
- Card titles: text-lg font-medium
- Form labels: text-sm font-medium uppercase tracking-wide
- Body content: text-base leading-relaxed

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing: p-2, gap-2 (buttons, inline elements)
- Standard spacing: p-4, gap-4 (cards, form fields)
- Section spacing: p-6, p-8 (containers)
- Page margins: p-8, p-12 (main content areas)
- Large breaks: mb-16, py-16 (section separators)

**Grid System**:
- Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Tables: Full-width with responsive horizontal scroll
- Forms: max-w-2xl single column on mobile, max-w-4xl two-column on desktop

**Container Widths**:
- Dashboard content: max-w-7xl mx-auto
- Form pages: max-w-4xl mx-auto
- Full-width tables: w-full with px-4 or px-8

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with shadow-sm
- School logo/name (left), user profile menu (right)
- Mobile: Hamburger menu collapsing to drawer
- Height: h-16
- Padding: px-6

**Side Navigation** (Desktop only, lg+):
- Fixed left sidebar w-64
- Collapsible menu items with icons (Heroicons)
- Active state with subtle background treatment
- Categories: Dashboard, Tickets, Learning, Resources, Settings

**Tab Navigation** (Learning section):
- Horizontal tabs with underline active state
- Sticky positioning when scrolling
- Items: Challenges | Log Work | Rankings | Resources

### Core UI Elements

**Cards**:
- Standard: rounded-lg border p-6 shadow-sm
- Ticket cards: Include status badge, device icon, timestamp
- Challenge cards: Include points badge, difficulty indicator, completion status
- Hover: subtle shadow increase (shadow-md)

**Forms**:
- Labels: text-sm font-medium mb-2
- Inputs: rounded-md border px-4 py-2.5 focus:ring-2
- Text areas: min-h-32 rounded-md
- Select dropdowns: Custom styled with chevron icon
- Radio/Checkbox groups: vertical stack with gap-3
- Field spacing: mb-6 between fields
- Submit buttons: Full-width on mobile, auto-width on desktop

**Buttons**:
- Primary: px-6 py-2.5 rounded-md font-medium
- Secondary: border variant with transparent background
- Icon buttons: p-2 rounded-md (for actions in tables/cards)
- Sizes: Small (py-1.5 px-4), Default (py-2.5 px-6), Large (py-3 px-8)

**Tables**:
- Zebra striping for rows
- Sticky header on scroll
- Action column (right-aligned) with icon buttons
- Mobile: Card-based layout replacing table
- Filters: Top bar with search input and status dropdowns

**Status Badges**:
- Pending: Subtle background with border
- In Progress: Medium emphasis
- Complete: High emphasis with check icon
- Size: px-3 py-1 text-xs font-medium rounded-full

**Data Display**:
- Stats cards: Large number (text-3xl font-bold), label below (text-sm)
- Ranking list: Avatar + name + points in horizontal layout
- Activity calendar: Grid with day cells, dots for activity
- Progress bars: h-2 rounded-full with fill animation

### Overlays

**Modals**:
- Max width: max-w-2xl
- Backdrop: Semi-transparent with blur
- Content: rounded-xl p-8
- Close button: top-right corner
- Use for: Adding new tickets, viewing challenge details

**Dropdowns**:
- Menu items: px-4 py-2.5
- Dividers between groups
- Icons aligned left, text aligned left
- Shadow: shadow-lg

---

## Responsive Behavior

**Breakpoints**:
- Mobile: < 768px (single column, stacked nav)
- Tablet: 768px-1024px (two columns, tabs visible)
- Desktop: > 1024px (sidebar + three columns)

**Mobile Optimizations**:
- Bottom navigation bar for primary actions
- Swipeable cards for ticket management
- Collapsible filters and search
- Larger touch targets (min h-12)
- Full-width forms with generous padding

---

## Images

**Dashboard Hero Section**:
- Large illustration or photo showing students collaborating on device repair (optional based on branding)
- If used: Hero height h-64 md:h-80, with overlay gradient for text readability

**Empty States**:
- Friendly illustrations for empty ticket queues, no challenges, etc.
- Centered with max-w-sm, accompanied by helpful text

**Resource Library**:
- Thumbnail images for video tutorials
- Icon representations for document types
- Category header images (Hardware, Software, etc.)

---

## Animations

**Minimal & Purposeful**:
- Page transitions: Simple fade-in
- Modal entry: Scale from 95% to 100% with fade
- Button loading states: Spinner replacement
- Success confirmations: Brief scale pulse
- NO scroll animations, parallax, or decorative motion