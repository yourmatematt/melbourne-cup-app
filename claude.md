# Melbourne Cup Venue Sweep Platform

## Project Overview
A white-label digital sweep platform for hospitality venues running Melbourne Cup events. Replaces paper-based sweeps with QR code joins, branded TV displays, animated draws, and lead capture.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS, Shadcn/ui components
- **Database**: Supabase (Postgres + Realtime)
- **Auth**: Supabase Auth (email/password for venues)
- **Storage**: Supabase Storage (logos, images)
- **Animations**: Framer Motion
- **Payments**: Stripe (venue billing only)
- **Deployment**: Vercel + Supabase Cloud

## Project Structure
/apps/web           # Main Next.js application
/packages/ui        # Shared React components
/packages/db        # Supabase schema, migrations, types
/docs               # Documentation

## Key Architectural Decisions

### Multi-Tenancy
- Row-Level Security (RLS) for all tables
- tenant_id on all relevant tables
- Isolated data per venue
- No cross-tenant queries

### Realtime Requirements
- Patron join counts update live on all screens
- Draw assignments broadcast immediately
- Event status changes sync across devices
- Use Supabase Realtime channels per event

### Security Constraints
- NO localStorage or sessionStorage in artifacts/components
- All sensitive operations server-side
- RLS policies enforce tenant isolation
- Patron data requires explicit consent flag

### Performance Targets
- <3s patron join on 4G
- 60fps animations on TV display
- Support 300 concurrent patrons per event
- Optimistic UI updates with rollback

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Zod schemas for all external data
- Export types from barrel files

### Components
- Use Shadcn/ui components as base
- Server Components by default
- Client Components only when needed (interactivity, hooks)
- Co-locate styles with components

### File Naming
- Components: PascalCase (e.g., `PatronJoinForm.tsx`)
- Utilities: camelCase (e.g., `formatJoinCode.ts`)
- Routes: lowercase with hyphens (e.g., `[event-id]`)

### Database
- Use Supabase client helpers
- Type-safe queries with generated types
- Transactions for critical operations (draws, assignments)
- Optimistic updates with error rollback

### Styling
- TailwindCSS utility classes only
- No custom CSS files (use Tailwind arbitrary values)
- Responsive mobile-first
- Dark mode support optional (venues choose)

## Domain Concepts

### Event Lifecycle
1. **Draft** - Being configured by venue
2. **Lobby** - Open for patron joins, QR displayed
3. **Drawing** - Active draw in progress
4. **Complete** - Draw finished, winner announced

### Assignment Rules
- Random Fisher-Yates shuffle
- Equal distribution across horses
- Scratched horses auto-skipped
- Undo last N assignments supported

### Lead Capture
- Only export data with explicit consent
- Separate CSVs: all participants vs leads only
- GDPR-compliant consent language

### Branding
- Venues upload: logo, primary colour, secondary colour, bg image
- Applied via CSS custom properties
- Preview mode before saving
- Cached for performance

## Critical Features

### Must Have (V1)
- Venue signup & auth
- Event creation (sweep mode only)
- QR patron join
- Random draw algorithm
- TV display with animations
- Lead export (CSV)
- Basic branding (logo + colours)

### Nice to Have (Post-V1)
- Calcutta/auction mode
- Multi-room events
- Stripe billing integration
- Advanced analytics
- Email notifications

## External Dependencies
- Supabase client: `@supabase/supabase-js`
- Shadcn/ui: `@radix-ui/*`
- Framer Motion: `framer-motion`
- Zod: `zod`
- Recharts: `recharts` (analytics)

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
Testing Approach

Unit tests for utilities and helpers
Integration tests for API routes
E2E tests for critical flows (join, draw, export)
Manual testing on real devices for TV display

Known Constraints

Melbourne Cup 2025: Tuesday, November 4th, 3:00 PM AEDT
Field size: up to 24 horses
Capacity: 10-200 patrons per event
No gambling/payments between patrons and venue
Compliance: promo mode (free) or offline cash handling

Reference Implementation

AFL Grand Final prototype (index.html) shows desired UX
Confetti, animations, card reveals should match quality
Hot draws (star players/horses) get special effects

Accessibility

WCAG AA compliance target
Keyboard navigation on TV display
Screen reader support on forms
High contrast mode consideration

Common Pitfalls to Avoid

❌ Don't use localStorage/sessionStorage
❌ Don't expose service role key client-side
❌ Don't skip RLS policies
❌ Don't block main thread with heavy animations
❌ Don't allow cross-tenant data leaks
✅ DO use server-side validation
✅ DO handle offline/reconnection gracefully
✅ DO show loading states
✅ DO use optimistic UI updates

Questions to Ask Before Implementing

Does this need realtime updates?
Should this be a Server or Client Component?
Does this query respect RLS?
Is there a race condition risk?
How does this handle network failure?

Deployment Checklist

 RLS enabled on all tables
 Environment variables set in Vercel
 Database migrations run
 Supabase production project configured
 Demo seed data loaded
 Error tracking setup
 Performance monitoring enabled