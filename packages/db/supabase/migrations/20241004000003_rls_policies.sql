-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patron_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

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

-- Tenants policies
CREATE POLICY "Users can view their tenants" ON tenants
    FOR SELECT USING (id = ANY(get_user_tenant_ids(auth.uid())));

CREATE POLICY "Owners can update their tenants" ON tenants
    FOR UPDATE USING (user_has_role_in_tenant(auth.uid(), id, 'owner'));

CREATE POLICY "Owners can delete their tenants" ON tenants
    FOR DELETE USING (user_has_role_in_tenant(auth.uid(), id, 'owner'));

-- Users policies
CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update themselves" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Tenant users policies
CREATE POLICY "Users can view tenant memberships" ON tenant_users
    FOR SELECT USING (
        user_id = auth.uid() OR
        tenant_id = ANY(get_user_tenant_ids(auth.uid()))
    );

CREATE POLICY "Admins can manage tenant users" ON tenant_users
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Brand kits policies
CREATE POLICY "Tenant members can view brand kits" ON brand_kits
    FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins can manage brand kits" ON brand_kits
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Events policies
CREATE POLICY "Tenant members can view events" ON events
    FOR SELECT USING (tenant_id = ANY(get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins can manage events" ON events
    FOR ALL USING (user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Event horses policies
CREATE POLICY "Users can view event horses" ON event_horses
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage event horses" ON event_horses
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

-- Patron entries policies
CREATE POLICY "Users can view patron entries" ON patron_entries
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

CREATE POLICY "Members can create patron entries" ON patron_entries
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
            AND e.status = 'active'
        )
    );

CREATE POLICY "Admins can manage patron entries" ON patron_entries
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

-- Assignments policies
CREATE POLICY "Users can view assignments" ON assignments
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage assignments" ON assignments
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

-- Winners policies
CREATE POLICY "Users can view winners" ON winners
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.tenant_id = ANY(get_user_tenant_ids(auth.uid()))
        )
    );

CREATE POLICY "Admins can manage winners" ON winners
    FOR ALL USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND user_has_role_in_tenant(auth.uid(), e.tenant_id, 'admin')
        )
    );

-- Special policies for public access
-- Allow public to view certain event data for public events
CREATE POLICY "Public can view public events" ON events
    FOR SELECT USING (mode = 'open' AND status = 'active');

CREATE POLICY "Public can view public event horses" ON event_horses
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'active'
        )
    );

CREATE POLICY "Public can create entries in public events" ON patron_entries
    FOR INSERT WITH CHECK (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'active'
        )
    );

CREATE POLICY "Public can view assignments in public events" ON assignments
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status IN ('active', 'drawing', 'completed')
        )
    );

CREATE POLICY "Public can view winners in public events" ON winners
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM events e
            WHERE e.id = event_id
            AND e.mode = 'open'
            AND e.status = 'completed'
        )
    );