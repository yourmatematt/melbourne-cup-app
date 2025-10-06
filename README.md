# Melbourne Cup Venue Sweep Platform

A Next.js 14 application for managing Melbourne Cup venue sweeps with real-time features powered by Supabase.

## Project Structure

```
melbourne-cup-app/
├── apps/
│   └── web/                 # Next.js 14 application
├── packages/
│   ├── ui/                  # Shared React components
│   └── db/                  # Supabase migrations and types
├── package.json             # Root package.json with workspaces
└── turbo.json              # Turborepo configuration
```

## Tech Stack

- **Next.js 14** - App Router with TypeScript
- **Supabase** - Database, Authentication, and Real-time
- **TailwindCSS** - Styling
- **Shadcn/ui** - UI Component Library
- **Turborepo** - Monorepo management

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Update the Supabase credentials in `.env.local`

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run type-check` - Run TypeScript checks

## Packages

### apps/web
Next.js 14 application with:
- TypeScript strict mode
- App Router
- Supabase integration (client/server)
- Middleware for auth
- TailwindCSS configuration

### packages/ui
Shared React components built with:
- Shadcn/ui components
- TypeScript
- TailwindCSS

### packages/db
Database management with:
- Supabase migrations
- TypeScript type generation
- Local development configuration