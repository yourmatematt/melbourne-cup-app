# Melbourne Cup Venue Sweep Platform - Database Schema Documentation

## Overview
This document describes the complete database schema for the Melbourne Cup Venue Sweep Platform. The schema is designed for multi-tenant SaaS architecture with strict data isolation and real-time capabilities.

## Key Architectural Features
- **Multi-tenant**: Row-Level Security (RLS) ensures data isolation per venue
- **Real-time**: Supabase Realtime enabled for live updates
- **Scalable**: Optimized indexes and constraints for performance
- **Secure**: Comprehensive RLS policies and helper functions
- **Event-driven**: Triggers for automated business logic

---

## Tables Overview

### Core Business Tables

#### `tenants`
**Purpose**: Represents venues/customers using the platform

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| name | TEXT | No | - | Venue display name |
| slug | TEXT | No | - | URL-friendly identifier |
| billing_status | billing_status | No | 'trial' | Billing status (active, suspended, trial, cancelled) |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_tenants_slug` (unique constraint)
- `idx_tenants_billing_status`

**RLS Policies**: Users can only access tenants they belong to

---

#### `users`
**Purpose**: Extends Supabase auth.users with additional profile data

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | - | FK to auth.users(id), primary key |
| email | TEXT | No | - | User email address |
| name | TEXT | Yes | - | Display name |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_users_email`

**RLS Policies**: Users can only access their own data

---

#### `tenant_users`
**Purpose**: Junction table for user-venue relationships with roles

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| tenant_id | UUID | No | - | FK to tenants(id) |
| user_id | UUID | No | - | FK to users(id) |
| role | user_role | No | 'member' | User role (owner, admin, member) |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |

**Indexes**:
- `idx_tenant_users_tenant_id`
- `idx_tenant_users_user_id`
- `idx_tenant_users_role`

**Constraints**: Unique(tenant_id, user_id)

**RLS Policies**: Users can view memberships for their tenants

---

#### `brand_kits`
**Purpose**: Venue branding and customization settings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| tenant_id | UUID | No | - | FK to tenants(id) |
| logo_url | TEXT | Yes | - | Logo image URL |
| color_primary | TEXT | Yes | '#1F2937' | Primary brand color |
| color_secondary | TEXT | Yes | '#6B7280' | Secondary brand color |
| bg_image_url | TEXT | Yes | - | Background image URL |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_brand_kits_tenant_id`

**Constraints**: Unique(tenant_id) - one brand kit per tenant

**RLS Policies**: Tenant members can view, admins can manage

---

#### `events`
**Purpose**: Sweep events (Melbourne Cup races)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| tenant_id | UUID | No | - | FK to tenants(id) |
| name | TEXT | No | - | Event display name |
| starts_at | TIMESTAMP WITH TIME ZONE | No | - | Event start time |
| timezone | TEXT | No | 'Australia/Melbourne' | Event timezone |
| mode | event_mode | No | 'open' | Access mode (open, private, invite_only) |
| status | event_status | No | 'draft' | Event status (draft, active, drawing, completed, cancelled) |
| capacity | INTEGER | Yes | 24 | Maximum participants |
| lead_capture | BOOLEAN | Yes | false | Enable lead capture |
| entry_fee | DECIMAL(10,2) | Yes | 0.00 | Entry fee amount |
| payment_timeout_minutes | INTEGER | Yes | 15 | Payment timeout duration |
| requires_payment | BOOLEAN | Yes | false | Whether payment is required |
| promo_enabled | BOOLEAN | No | FALSE | Enable promotional offers |
| promo_message | TEXT | Yes | - | Promotional message text |
| promo_duration | INTEGER | Yes | - | Promo validity duration (minutes) |
| results_status | results_status | Yes | 'pending' | Results status (pending, final, disputed) |
| results_entered_at | TIMESTAMP WITH TIME ZONE | Yes | - | When results were entered |
| results_entered_by | UUID | Yes | - | FK to auth.users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_events_tenant_id`
- `idx_events_status`
- `idx_events_starts_at`
- `idx_events_mode`
- `idx_events_tenant_status`

**Constraints**:
- capacity > 0
- starts_at > created_at

**RLS Policies**: Tenant members can view, admins can manage, public can view open events

---

#### `event_horses`
**Purpose**: Horses participating in each event

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| event_id | UUID | No | - | FK to events(id) |
| number | INTEGER | No | - | Horse number (1-24) |
| name | TEXT | No | - | Horse name |
| jockey | TEXT | Yes | - | Jockey name |
| is_scratched | BOOLEAN | Yes | false | Whether horse is scratched |
| position | INTEGER | Yes | - | Finishing position (if applicable) |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_event_horses_event_id`
- `idx_event_horses_number`
- `idx_event_horses_is_scratched`
- `idx_event_horses_position`

**Constraints**:
- Unique(event_id, number)
- number > 0
- position > 0 (if not null)

**RLS Policies**: Follow event access rules, public can view for open events

---

#### `patron_entries`
**Purpose**: Participants in sweep events

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| event_id | UUID | No | - | FK to events(id) |
| participant_name | TEXT | No | - | Participant full name |
| email | TEXT | Yes | - | Email address |
| phone | TEXT | Yes | - | Phone number |
| marketing_consent | BOOLEAN | Yes | false | Marketing consent flag |
| join_code | TEXT | Yes | - | Unique join code |
| payment_status | payment_status | No | 'pending' | Payment status (pending, paid, expired) |
| payment_deadline | TIMESTAMP WITH TIME ZONE | Yes | - | Payment deadline |
| payment_amount | DECIMAL(10,2) | Yes | - | Amount paid |
| paid_at | TIMESTAMP WITH TIME ZONE | Yes | - | Payment timestamp |
| entry_method | TEXT | Yes | 'online' | How they registered |
| promo_claimed | BOOLEAN | Yes | FALSE | Whether promo was claimed |
| promo_expired_at | TIMESTAMP WITH TIME ZONE | Yes | - | Promo expiry timestamp |
| win_status | win_status | Yes | 'none' | Winner status (none, first, second, third, placed) |
| notified_at | TIMESTAMP WITH TIME ZONE | Yes | - | Winner notification timestamp |
| prize_claimed | BOOLEAN | Yes | FALSE | Whether prize was collected |
| prize_claimed_at | TIMESTAMP WITH TIME ZONE | Yes | - | Prize collection timestamp |
| claimed_by_staff | UUID | Yes | - | FK to auth.users(id) |
| user_agent | TEXT | Yes | - | Browser user agent |
| ip_address | INET | Yes | - | IP address |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_patron_entries_event_id`
- `idx_patron_entries_email`
- `idx_patron_entries_join_code`
- `idx_patron_entries_created_at`
- `idx_patron_entries_event_created`
- `idx_patron_entries_payment_deadline`
- `idx_patron_entries_payment_status`
- `idx_patron_entries_win_status`

**Constraints**:
- email IS NOT NULL OR phone IS NOT NULL

**RLS Policies**: Follow event access rules, public can create entries in open events

---

#### `assignments`
**Purpose**: Horse-participant assignments (the "draw")

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| event_id | UUID | No | - | FK to events(id) |
| event_horse_id | UUID | No | - | FK to event_horses(id) |
| patron_entry_id | UUID | No | - | FK to patron_entries(id) |
| assigned_by | UUID | Yes | - | FK to users(id) |
| horse_number | INTEGER | No | - | Horse number (denormalized) |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |

**Indexes**:
- `idx_assignments_event_id`
- `idx_assignments_event_horse_id`
- `idx_assignments_patron_entry_id`
- `idx_assignments_assigned_by`
- `idx_assignments_event_created`
- `idx_assignments_event_horse_number`

**Constraints**:
- Unique(event_id, event_horse_id) - one participant per horse
- Unique(event_id, patron_entry_id) - one horse per participant

**RLS Policies**: Follow event access rules, public can view assignments in public events

---

#### `event_results`
**Purpose**: Race finishing positions and prize amounts

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| event_id | UUID | No | - | FK to events(id) |
| place | INTEGER | No | - | Finishing position (1-24) |
| horse_number | INTEGER | No | - | Horse number |
| prize_amount | DECIMAL(10,2) | Yes | - | Prize amount for this place |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Last update timestamp |

**Indexes**:
- `idx_event_results_event_place`

**Constraints**:
- place >= 1 AND place <= 24
- horse_number >= 1 AND horse_number <= 24
- Unique(event_id, place)
- Unique(event_id, horse_number)

**RLS Policies**: Tenant members can view and manage results

---

### Legacy Tables

#### `winners`
**Purpose**: Legacy winners table (replaced by event_results + win_status)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| event_id | UUID | No | - | FK to events(id) |
| event_horse_id | UUID | No | - | FK to event_horses(id) |
| patron_entry_id | UUID | No | - | FK to patron_entries(id) |
| place | INTEGER | No | - | Finishing position |
| created_at | TIMESTAMP WITH TIME ZONE | No | NOW() | Creation timestamp |

**Note**: This table is maintained for backward compatibility but new implementations should use the `event_results` table with `win_status` on `patron_entries`.

---

## Enums

### `billing_status`
- `active`: Venue has active subscription
- `suspended`: Temporarily suspended
- `trial`: Free trial period
- `cancelled`: Subscription cancelled

### `user_role`
- `owner`: Full access, can manage billing
- `admin`: Can manage events and users
- `member`: Basic access, can view events

### `event_mode`
- `open`: Public events, anyone can join
- `private`: Venue staff only
- `invite_only`: Requires invitation

### `event_status`
- `draft`: Being configured
- `active`: Open for registrations
- `drawing`: Draw in progress
- `completed`: Event finished
- `cancelled`: Event cancelled

### `payment_status`
- `pending`: Awaiting payment
- `paid`: Payment confirmed
- `expired`: Payment deadline passed

### `results_status`
- `pending`: Results not entered
- `final`: Results locked in
- `disputed`: Under review

### `win_status`
- `none`: Did not win
- `first`: First place
- `second`: Second place
- `third`: Third place
- `placed`: Other placing

---

## Functions

### Helper Functions

#### `get_user_tenant_ids(user_uuid UUID) → UUID[]`
Returns array of tenant IDs the user has access to.

#### `user_has_role_in_tenant(user_uuid UUID, tenant_uuid UUID, required_role user_role) → BOOLEAN`
Checks if user has specified role (or higher) in tenant.

### Business Logic Functions

#### `generate_join_code() → TEXT`
Generates random 6-character alphanumeric join code.

#### `handle_new_user()`
Trigger function to create user profile when auth user is created.

#### `create_default_brand_kit()`
Trigger function to create default brand kit for new tenants.

#### `set_payment_deadline()`
Trigger function to automatically set payment deadlines.

#### `match_event_winners()`
Trigger function to match winners when results are entered.

#### `update_updated_at()`
Generic trigger function to update timestamp fields.

---

## Row Level Security (RLS)

### Key Principles
1. **Tenant Isolation**: Users can only access data for tenants they belong to
2. **Role-based Access**: Different permissions based on user role
3. **Public Access**: Open events allow anonymous participation
4. **Secure by Default**: All tables have RLS enabled

### Policy Categories

#### Tenant-scoped Policies
Most tables use tenant-based access control:
```sql
-- Example policy structure
CREATE POLICY "policy_name" ON table_name
FOR operation USING (
    EXISTS(
        SELECT 1 FROM events e
        WHERE e.id = event_id
        AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
    )
);
```

#### Public Access Policies
Open events allow public participation:
```sql
-- Example public policy
CREATE POLICY "public_access" ON table_name
FOR SELECT USING (
    EXISTS(
        SELECT 1 FROM events e
        WHERE e.id = event_id
        AND e.mode = 'open'
        AND e.status = 'active'
    )
);
```

---

## Real-time Configuration

### Supabase Realtime
Tables enabled for real-time updates:
- `events` - Status changes, live updates
- `event_horses` - Scratching updates
- `patron_entries` - Live participant tracking
- `assignments` - Live draw updates
- `winners` - Live results
- `event_results` - Race results
- `brand_kits` - Theme updates
- `tenant_users` - Membership changes

### Real-time Security
Real-time subscriptions inherit table RLS policies, ensuring users only receive updates for data they can access.

---

## Performance Considerations

### Indexing Strategy
- **Tenant isolation**: All tenant-scoped queries use `tenant_id` indexes
- **Event lookups**: `event_id` indexes on all event-related tables
- **Real-time queries**: Indexes on frequently updated columns
- **Partial indexes**: Used for conditional data (e.g., non-null values)

### Query Optimization
- Use `get_user_tenant_ids()` for efficient tenant filtering
- Leverage composite indexes for multi-column queries
- Consider query patterns when adding new indexes

---

## Migration Strategy

### Schema Evolution
1. All changes must be backward compatible
2. Use `IF NOT EXISTS` for idempotent migrations
3. Add new columns as nullable initially
4. Use separate migrations for data transformations

### Production Deployment
1. Run `deploy-production.sql` in fresh Supabase project
2. Verify RLS policies are enabled
3. Test with sample data
4. Configure real-time subscriptions
5. Set up monitoring and alerts

---

## Security Best Practices

### Data Protection
- All sensitive operations use `SECURITY DEFINER` functions
- RLS policies prevent cross-tenant data access
- Payment information handled with care
- Personal data requires explicit consent

### Access Control
- Role hierarchy: owner > admin > member
- Function permissions granted explicitly
- Public access limited to specific operations
- Regular security audits recommended

### Compliance Considerations
- GDPR compliance for marketing consent
- Data retention policies
- Audit trail for sensitive operations
- Secure handling of personal information