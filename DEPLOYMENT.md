# Melbourne Cup App - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Melbourne Cup App to production on Vercel with Supabase.

## 🎯 Quick Deployment

For experienced developers, use the automated deployment script:

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

## 📋 Prerequisites

### Required Tools
- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Vercel CLI](https://vercel.com/cli) (`npm install -g vercel`)
- [Git](https://git-scm.com/)

### Required Accounts
- [Vercel](https://vercel.com/) account
- [Supabase](https://supabase.com/) account
- [Sentry](https://sentry.io/) account (optional)
- [PostHog](https://posthog.com/) account (optional)
- [Upstash Redis](https://upstash.com/) account (optional)

## 🗄️ Supabase Production Setup

### 1. Create Production Instance

1. **Create New Project**
   ```bash
   # Log into Supabase
   npx supabase login

   # Create new project
   npx supabase projects create melbourne-cup-prod
   ```

2. **Configure Database**
   ```bash
   # Run the production setup script
   psql -h db.your-project-ref.supabase.co -U postgres -f scripts/setup-production-db.sql
   ```

3. **Enable Row Level Security**
   - All tables should have RLS enabled (handled by setup script)
   - Verify policies are in place
   - Test with different user roles

### 2. Configure Supabase Settings

1. **Authentication Settings**
   - Go to Authentication > Settings
   - Set Site URL: `https://melbournecup.app`
   - Add Redirect URLs:
     - `https://melbournecup.app/auth/callback`
     - `https://staging.melbournecup.app/auth/callback`

2. **API Settings**
   - Go to Settings > API
   - Note down:
     - Project URL
     - Anon public key
     - Service role key (keep secret)

3. **Database Backups**
   - Go to Settings > Database
   - Enable automatic backups
   - Configure backup retention (recommended: 7 days)

## 🚀 Vercel Deployment

### 1. Initial Setup

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Link Project**
   ```bash
   vercel link
   # Follow prompts to link to existing project or create new one
   ```

### 2. Environment Variables

Configure these environment variables in the Vercel dashboard (`Settings > Environment Variables`):

#### Required Variables
```bash
# Next.js
NEXTAUTH_URL=https://melbournecup.app
NEXTAUTH_SECRET=your-secure-nextauth-secret-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Security
QR_CODE_SECRET=your-qr-code-signing-secret-here
ADMIN_TEST_TOKEN=your-secure-admin-token-here
```

#### Optional Variables
```bash
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here

# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=melbourne-cup-app
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-project-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true
```

### 3. Domain Configuration

1. **Add Custom Domain**
   - Go to Vercel dashboard > Project > Settings > Domains
   - Add `melbournecup.app` and `www.melbournecup.app`
   - Configure DNS records as instructed

2. **SSL Certificate**
   - Vercel automatically provisions SSL certificates
   - Verify HTTPS is working

## 🔧 Manual Deployment Steps

### 1. Pre-deployment Checks

```bash
# Install dependencies
npm install

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (if available)
npm test

# Build project
npm run build
```

### 2. Deploy to Staging

```bash
# Deploy to staging (preview deployment)
vercel

# Test staging deployment
curl https://your-staging-url.vercel.app/api/health
```

### 3. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Verify production deployment
curl https://melbournecup.app/api/health
```

## 🛡️ Security Configuration

### 1. Content Security Policy

The app includes a comprehensive CSP in `middleware.ts`. Verify it allows all required external services:

- Supabase (database and auth)
- Sentry (error tracking)
- PostHog (analytics)
- Font providers (Google Fonts)

### 2. Rate Limiting

Rate limiting is configured for different endpoint types:
- Auth endpoints: 5 requests per 15 minutes
- Admin endpoints: 200 requests per minute
- Patron endpoints: 20 requests per minute
- Public endpoints: 100 requests per minute

### 3. CORS Configuration

CORS is configured to allow:
- Production: `https://melbournecup.app`, `https://www.melbournecup.app`
- Development: `http://localhost:3000`

## 📊 Monitoring Setup

### 1. Sentry Error Tracking

1. Create Sentry project
2. Add DSN to environment variables
3. Configure release tracking:
   ```bash
   # Install Sentry CLI
   npm install -g @sentry/cli

   # Create release
   sentry-cli releases new $VERCEL_GIT_COMMIT_SHA
   sentry-cli releases set-commits $VERCEL_GIT_COMMIT_SHA --auto
   ```

### 2. PostHog Analytics

1. Create PostHog project
2. Add project key to environment variables
3. Verify event tracking is working

### 3. Health Monitoring

The app includes a comprehensive health check endpoint at `/api/health` that monitors:
- Database connectivity
- Realtime functionality
- Redis connectivity (if configured)
- Response times
- Memory usage

## 🗃️ Database Management

### 1. Running Migrations

```bash
# Check migration status
npm run migrate status

# Run pending migrations
npm run migrate

# Rollback migrations (if needed)
npm run migrate rollback
```

### 2. Seeding Demo Data

```bash
# Clean seed with demo data
npm run seed -- --clean

# Custom seed configuration
npm run seed -- --tenants=5 --events=20 --participants=50
```

### 3. Backup Strategy

1. **Automated Backups**
   - Supabase handles automated backups
   - Configure retention period in Supabase dashboard

2. **Manual Backups**
   ```bash
   # Export database
   pg_dump $DATABASE_URL > backup.sql

   # Restore database
   psql $DATABASE_URL < backup.sql
   ```

## 🔍 Testing Production Deployment

### 1. Automated Tests

```bash
# Run RLS policy tests
curl -X POST https://melbournecup.app/api/admin/test-rls \\
  -H "Authorization: Bearer $ADMIN_TEST_TOKEN"

# Check health endpoint
curl https://melbournecup.app/api/health

# Test sitemap
curl https://melbournecup.app/sitemap.xml

# Test robots.txt
curl https://melbournecup.app/robots.txt
```

### 2. Manual Testing Checklist

- [ ] Homepage loads correctly
- [ ] Event creation works (admin)
- [ ] QR code generation works
- [ ] Patron join flow works
- [ ] Real-time updates work
- [ ] TV display works
- [ ] Draw process works
- [ ] Spectator mode works
- [ ] Mobile responsiveness
- [ ] Error boundaries work
- [ ] Loading states work

### 3. Performance Testing

```bash
# Test page speed
npx lighthouse https://melbournecup.app --output=html

# Test load times
curl -w "@curl-format.txt" -o /dev/null -s https://melbournecup.app
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   ```bash
   # Check Vercel environment variables
   vercel env ls

   # Pull environment variables locally
   vercel env pull .env.local
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"

   # Check RLS policies
   npm run test:rls
   ```

3. **Build Failures**
   ```bash
   # Clear build cache
   vercel --force

   # Check build logs
   vercel logs
   ```

4. **Rate Limiting Issues**
   - Check Redis connectivity
   - Verify rate limiting configuration
   - Monitor rate limit headers

### Debugging Commands

```bash
# View deployment logs
vercel logs

# Check function logs
vercel logs --follow

# Inspect deployment
vercel inspect DEPLOYMENT_URL

# Get deployment info
vercel ls
```

## 📈 Performance Optimization

### 1. Caching Strategy

- Static assets: 1 year cache
- API responses: 5 minutes cache (public endpoints)
- Private data: No cache
- Health checks: No cache

### 2. Bundle Optimization

```bash
# Analyze bundle size
npm run analyze

# Check for duplicate dependencies
npx depcheck
```

### 3. Database Optimization

- Indexes are created for common queries
- Connection pooling via Supabase
- Query optimization for large datasets

## 🔄 Rollback Procedure

### Automatic Rollback

```bash
# Rollback to previous deployment
./scripts/deploy.sh rollback
```

### Manual Rollback

```bash
# List deployments
vercel ls melbourne-cup-app

# Promote previous deployment
vercel promote DEPLOYMENT_ID --yes
```

## 📞 Support

### Monitoring

- **Uptime Monitoring**: Set up external monitoring (e.g., UptimeRobot)
- **Error Tracking**: Sentry dashboard
- **Performance**: Vercel Analytics
- **Logs**: Vercel function logs

### Emergency Contacts

- Vercel Support: [Vercel Support](https://vercel.com/support)
- Supabase Support: [Supabase Support](https://supabase.com/support)

### Maintenance Windows

- Database maintenance: Typically Sunday 2-4 AM AEST
- Application deployments: Any time (zero-downtime)

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Melbourne Cup App Repository](https://github.com/your-org/melbourne-cup-app)