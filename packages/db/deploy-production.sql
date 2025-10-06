-- =============================================================================
-- Melbourne Cup Venue Sweep Platform - Production Database Schema
-- =============================================================================
-- This script creates the complete database schema for production deployment
-- Run this in a fresh Supabase project SQL editor to recreate the entire database
--
-- IMPORTANT: This script is idempotent and can be run multiple times safely
-- =============================================================================

-- Enable necessary extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Custom Types and Enums
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE billing_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_mode AS ENUM ('open', 'private', 'invite_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft', 'active', 'drawing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE results_status AS ENUM ('pending', 'final', 'disputed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE win_status AS ENUM ('none', 'first', 'second', 'third', 'placed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Core Tables
-- =============================================================================

-- Tenants table (venues/customers)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    billing_status billing_status NOT NULL DEFAULT 'trial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant users junction table (user-venue relationships)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Brand kits table (venue branding/customization)
CREATE TABLE IF NOT EXISTS brand_kits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    color_primary TEXT DEFAULT '#1F2937',
    color_secondary TEXT DEFAULT '#6B7280',
    bg_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Events table (sweep events)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
    mode event_mode NOT NULL DEFAULT 'open',
    status event_status NOT NULL DEFAULT 'draft',
    capacity INTEGER DEFAULT 24,
    lead_capture BOOLEAN DEFAULT false,
    -- Payment related columns
    entry_fee DECIMAL(10,2) DEFAULT 0.00,
    payment_timeout_minutes INTEGER DEFAULT 15,
    requires_payment BOOLEAN DEFAULT false,
    -- Promotional offer columns
    promo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    promo_message TEXT,
    promo_duration INTEGER,
    -- Results tracking columns
    results_status results_status DEFAULT 'pending',
    results_entered_at TIMESTAMP WITH TIME ZONE,
    results_entered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event horses table (horses in each event)
CREATE TABLE IF NOT EXISTS event_horses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name TEXT NOT NULL,
    jockey TEXT,
    is_scratched BOOLEAN DEFAULT false,
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, number)
);

-- Patron entries table (participants)
CREATE TABLE IF NOT EXISTS patron_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    marketing_consent BOOLEAN DEFAULT false,
    join_code TEXT,
    -- Payment related columns
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_deadline TIMESTAMP WITH TIME ZONE,
    payment_amount DECIMAL(10,2),
    paid_at TIMESTAMP WITH TIME ZONE,
    entry_method TEXT DEFAULT 'online',
    -- Promotional offer columns
    promo_claimed BOOLEAN DEFAULT FALSE,
    promo_expired_at TIMESTAMP WITH TIME ZONE,
    -- Winner tracking columns
    win_status win_status DEFAULT 'none',
    notified_at TIMESTAMP WITH TIME ZONE,
    prize_claimed BOOLEAN DEFAULT FALSE,
    prize_claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_by_staff UUID REFERENCES auth.users(id),
    -- Additional tracking columns
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments table (patron-horse assignments)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_horse_id UUID NOT NULL REFERENCES event_horses(id) ON DELETE CASCADE,
    patron_entry_id UUID NOT NULL REFERENCES patron_entries(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    horse_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, event_horse_id),
    UNIQUE(event_id, patron_entry_id)
);

-- Winners table (legacy - keeping for compatibility)
CREATE TABLE IF NOT EXISTS winners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_horse_id UUID NOT NULL REFERENCES event_horses(id) ON DELETE CASCADE,
    patron_entry_id UUID NOT NULL REFERENCES patron_entries(id) ON DELETE CASCADE,
    place INTEGER NOT NULL CHECK (place > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, place),
    UNIQUE(event_id, event_horse_id)
);

-- Event results table (race finishing positions)
CREATE TABLE IF NOT EXISTS event_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    place INTEGER NOT NULL CHECK (place >= 1 AND place <= 24),
    horse_number INTEGER NOT NULL CHECK (horse_number >= 1 AND horse_number <= 24),
    prize_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique place per event and unique horse per event
    UNIQUE(event_id, place),
    UNIQUE(event_id, horse_number)
);

-- Create Performance Indexes
-- =============================================================================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON tenants(billing_status);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tenant users indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);

-- Brand kits indexes
CREATE INDEX IF NOT EXISTS idx_brand_kits_tenant_id ON brand_kits(tenant_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_mode ON events(mode);
CREATE INDEX IF NOT EXISTS idx_events_tenant_status ON events(tenant_id, status);

-- Event horses indexes
CREATE INDEX IF NOT EXISTS idx_event_horses_event_id ON event_horses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_horses_number ON event_horses(event_id, number);
CREATE INDEX IF NOT EXISTS idx_event_horses_is_scratched ON event_horses(is_scratched);
CREATE INDEX IF NOT EXISTS idx_event_horses_position ON event_horses(position) WHERE position IS NOT NULL;

-- Patron entries indexes
CREATE INDEX IF NOT EXISTS idx_patron_entries_event_id ON patron_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_patron_entries_email ON patron_entries(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patron_entries_join_code ON patron_entries(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patron_entries_created_at ON patron_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_patron_entries_event_created ON patron_entries(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patron_entries_payment_deadline ON patron_entries(payment_deadline) WHERE payment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_patron_entries_payment_status ON patron_entries(payment_status, event_id);
CREATE INDEX IF NOT EXISTS idx_patron_entries_win_status ON patron_entries(event_id, win_status) WHERE win_status != 'none';

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_event_id ON assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event_horse_id ON assignments(event_horse_id);
CREATE INDEX IF NOT EXISTS idx_assignments_patron_entry_id ON assignments(patron_entry_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by) WHERE assigned_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_event_created ON assignments(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_event_horse_number ON assignments(event_id, horse_number);

-- Winners indexes
CREATE INDEX IF NOT EXISTS idx_winners_event_id ON winners(event_id);
CREATE INDEX IF NOT EXISTS idx_winners_place ON winners(event_id, place);
CREATE INDEX IF NOT EXISTS idx_winners_event_horse_id ON winners(event_horse_id);
CREATE INDEX IF NOT EXISTS idx_winners_patron_entry_id ON winners(patron_entry_id);

-- Event results indexes
CREATE INDEX IF NOT EXISTS idx_event_results_event_place ON event_results(event_id, place);

-- Add Data Integrity Constraints
-- =============================================================================
DO $$ BEGIN
    ALTER TABLE events ADD CONSTRAINT check_capacity_positive CHECK (capacity > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE event_horses ADD CONSTRAINT check_number_positive CHECK (number > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE event_horses ADD CONSTRAINT check_position_positive CHECK (position IS NULL OR position > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE patron_entries ADD CONSTRAINT check_contact_info CHECK (email IS NOT NULL OR phone IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE events ADD CONSTRAINT check_starts_at_future CHECK (starts_at > created_at);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable Row Level Security
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patron_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

-- Create Helper Functions for RLS
-- =============================================================================

-- Helper function to get user's accessible tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids(user_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT tu.tenant_id
        FROM tenant_users tu
        WHERE tu.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_role_in_tenant(user_uuid UUID, tenant_uuid UUID, required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM tenant_users tu
        WHERE tu.user_id = user_uuid
        AND tu.tenant_id = tenant_uuid
        AND (
            tu.role = required_role OR
            (required_role = 'member' AND tu.role IN ('admin', 'owner')) OR
            (required_role = 'admin' AND tu.role = 'owner')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Row Level Security Policies
-- =============================================================================

-- Tenants policies
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
CREATE POLICY "Users can view their tenants" ON tenants
    FOR SELECT USING (id = ANY(get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Owners can update their tenants" ON tenants;
CREATE POLICY "Owners can update their tenants" ON tenants
    FOR UPDATE USING (user_has_role_in_tenant(auth.uid(), id, 'owner'));

DROP POLICY IF EXISTS "Owners can delete their tenants" ON tenants;
CREATE POLICY "Owners can delete their tenants" ON tenants
    FOR DELETE USING (user_has_role_in_tenant(auth.uid(), id, 'owner'));

-- Users policies
DROP POLICY IF EXISTS "Users can view themselves" ON users;
CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update themselves" ON users;
CREATE POLICY "Users can update themselves" ON users
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow user creation" ON users;
CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Tenant users policies
DROP POLICY IF EXISTS "Users can view tenant memberships" ON tenant_users;
CREATE POLICY "Users can view tenant memberships" ON tenant_users
    FOR SELECT USING (
        user_id = auth.uid() OR
        tenant_id = ANY(get_user_tenant_ids(auth.uid()))
    );

DROP POLICY IF EXISTS "Admins can manage tenant users" ON tenant_users;
CREATE POLICY "Admins can manage tenant users" ON tenant_users
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Brand kits policies
DROP POLICY IF EXISTS "Tenant members can view brand kits" ON brand_kits;
CREATE POLICY "Tenant members can view brand kits" ON brand_kits
    FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage brand kits" ON brand_kits;
CREATE POLICY "Admins can manage brand kits" ON brand_kits
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Events policies
DROP POLICY IF EXISTS "Tenant members can view events" ON events;
CREATE POLICY "Tenant members can view events" ON events
    FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

DROP POLICY IF EXISTS "Public can view public events" ON events;
CREATE POLICY "Public can view public events" ON events
    FOR SELECT USING (mode = 'open' AND status = 'active');

-- Event horses policies
DROP POLICY IF EXISTS "Users can view event horses" ON event_horses;
CREATE POLICY "Users can view event horses" ON event_horses
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Admins can manage event horses" ON event_horses;
CREATE POLICY "Admins can manage event horses" ON event_horses
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Public can view public event horses" ON event_horses;
CREATE POLICY "Public can view public event horses" ON event_horses
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'active'
        )
    );

-- Patron entries policies
DROP POLICY IF EXISTS "Users can view patron entries" ON patron_entries;
CREATE POLICY "Users can view patron entries" ON patron_entries
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Members can create patron entries" ON patron_entries;
CREATE POLICY "Members can create patron entries" ON patron_entries
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
            AND e.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Admins can manage patron entries" ON patron_entries;
CREATE POLICY "Admins can manage patron entries" ON patron_entries
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Public can create entries in public events" ON patron_entries;
CREATE POLICY "Public can create entries in public events" ON patron_entries
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'active'
        )
    );

-- Assignments policies
DROP POLICY IF EXISTS "Users can view assignments" ON assignments;
CREATE POLICY "Users can view assignments" ON assignments
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Admins can manage assignments" ON assignments;
CREATE POLICY "Admins can manage assignments" ON assignments
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Public can view assignments in public events" ON assignments;
CREATE POLICY "Public can view assignments in public events" ON assignments
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status IN ('active', 'drawing', 'completed')
        )
    );

-- Winners policies
DROP POLICY IF EXISTS "Users can view winners" ON winners;
CREATE POLICY "Users can view winners" ON winners
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Admins can manage winners" ON winners;
CREATE POLICY "Admins can manage winners" ON winners
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

DROP POLICY IF EXISTS "Public can view winners in public events" ON winners;
CREATE POLICY "Public can view winners in public events" ON winners
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'completed'
        )
    );

-- Event results policies
DROP POLICY IF EXISTS "Users can view results for their tenant's events" ON event_results;
CREATE POLICY "Users can view results for their tenant's events" ON event_results
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN tenant_users tu ON e.tenant_id = tu.tenant_id
            WHERE tu.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage results for their tenant's events" ON event_results;
CREATE POLICY "Users can manage results for their tenant's events" ON event_results
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN tenant_users tu ON e.tenant_id = tu.tenant_id
            WHERE tu.user_id = auth.uid()
        )
    );

-- Create Realtime Publication
-- =============================================================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_horses;
ALTER PUBLICATION supabase_realtime ADD TABLE patron_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE winners;
ALTER PUBLICATION supabase_realtime ADD TABLE event_results;
ALTER PUBLICATION supabase_realtime ADD TABLE brand_kits;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_users;

-- Create Utility Functions
-- =============================================================================

-- Function to generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle user creation from auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default brand kit for new tenants
CREATE OR REPLACE FUNCTION create_default_brand_kit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_kits (tenant_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set payment deadline on insert
CREATE OR REPLACE FUNCTION set_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set deadline for pending payments
    IF NEW.payment_status = 'pending' THEN
        -- Get timeout from event configuration, default to 15 minutes
        SELECT
            NOW() + INTERVAL '1 minute' * COALESCE(e.payment_timeout_minutes, 15)
        INTO NEW.payment_deadline
        FROM events e
        WHERE e.id = NEW.event_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically match winners when results are entered
CREATE OR REPLACE FUNCTION match_event_winners()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset all win statuses for this event first
    UPDATE patron_entries
    SET win_status = 'none', notified_at = NULL
    WHERE event_id = NEW.event_id;

    -- Match winners based on horse numbers
    UPDATE patron_entries pe
    SET win_status = CASE
        WHEN er.place = 1 THEN 'first'::win_status
        WHEN er.place = 2 THEN 'second'::win_status
        WHEN er.place = 3 THEN 'third'::win_status
        ELSE 'placed'::win_status
    END
    FROM event_results er
    JOIN assignments a ON a.event_id = er.event_id AND a.horse_number = er.horse_number
    WHERE pe.id = a.patron_entry_id
    AND er.event_id = NEW.event_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers
-- =============================================================================

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Trigger to create default brand kit
DROP TRIGGER IF EXISTS create_tenant_brand_kit ON tenants;
CREATE TRIGGER create_tenant_brand_kit
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_brand_kit();

-- Updated_at triggers
DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS brand_kits_updated_at ON brand_kits;
CREATE TRIGGER brand_kits_updated_at
    BEFORE UPDATE ON brand_kits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS event_horses_updated_at ON event_horses;
CREATE TRIGGER event_horses_updated_at
    BEFORE UPDATE ON event_horses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS patron_entries_updated_at ON patron_entries;
CREATE TRIGGER patron_entries_updated_at
    BEFORE UPDATE ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger to set payment deadline on insert
DROP TRIGGER IF EXISTS set_payment_deadline_trigger ON patron_entries;
CREATE TRIGGER set_payment_deadline_trigger
    BEFORE INSERT ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_deadline();

-- Trigger to auto-match winners when results are inserted/updated
DROP TRIGGER IF EXISTS trigger_match_winners ON event_results;
CREATE TRIGGER trigger_match_winners
    AFTER INSERT OR UPDATE ON event_results
    FOR EACH ROW
    EXECUTE FUNCTION match_event_winners();

-- =============================================================================
-- Database Schema Deployment Complete
-- =============================================================================
-- The Melbourne Cup Venue Sweep Platform database schema has been successfully created.
--
-- Next steps:
-- 1. Run the Melbourne Cup 2025 horse seed data script
-- 2. Configure your environment variables
-- 3. Test the schema with your application
--
-- For support, refer to the schema documentation or contact the development team.
-- =============================================================================