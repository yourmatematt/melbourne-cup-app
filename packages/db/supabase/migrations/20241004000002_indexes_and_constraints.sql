-- Create indexes for performance optimization

-- Tenants indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_billing_status ON tenants(billing_status);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);

-- Tenant users indexes
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);

-- Brand kits indexes
CREATE INDEX idx_brand_kits_tenant_id ON brand_kits(tenant_id);

-- Events indexes
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_mode ON events(mode);

-- Event horses indexes
CREATE INDEX idx_event_horses_event_id ON event_horses(event_id);
CREATE INDEX idx_event_horses_number ON event_horses(event_id, number);
CREATE INDEX idx_event_horses_is_scratched ON event_horses(is_scratched);
CREATE INDEX idx_event_horses_position ON event_horses(position) WHERE position IS NOT NULL;

-- Patron entries indexes
CREATE INDEX idx_patron_entries_event_id ON patron_entries(event_id);
CREATE INDEX idx_patron_entries_email ON patron_entries(email) WHERE email IS NOT NULL;
CREATE INDEX idx_patron_entries_join_code ON patron_entries(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX idx_patron_entries_created_at ON patron_entries(created_at);

-- Assignments indexes
CREATE INDEX idx_assignments_event_id ON assignments(event_id);
CREATE INDEX idx_assignments_event_horse_id ON assignments(event_horse_id);
CREATE INDEX idx_assignments_patron_entry_id ON assignments(patron_entry_id);
CREATE INDEX idx_assignments_assigned_by ON assignments(assigned_by) WHERE assigned_by IS NOT NULL;

-- Winners indexes
CREATE INDEX idx_winners_event_id ON winners(event_id);
CREATE INDEX idx_winners_place ON winners(event_id, place);
CREATE INDEX idx_winners_event_horse_id ON winners(event_horse_id);
CREATE INDEX idx_winners_patron_entry_id ON winners(patron_entry_id);

-- Additional composite indexes for common queries
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);
CREATE INDEX idx_patron_entries_event_created ON patron_entries(event_id, created_at);
CREATE INDEX idx_assignments_event_created ON assignments(event_id, created_at);

-- Add check constraints
ALTER TABLE events ADD CONSTRAINT check_capacity_positive CHECK (capacity > 0);
ALTER TABLE event_horses ADD CONSTRAINT check_number_positive CHECK (number > 0);
ALTER TABLE event_horses ADD CONSTRAINT check_position_positive CHECK (position IS NULL OR position > 0);

-- Add additional constraints for data integrity
ALTER TABLE patron_entries ADD CONSTRAINT check_contact_info
    CHECK (email IS NOT NULL OR phone IS NOT NULL);

ALTER TABLE events ADD CONSTRAINT check_starts_at_future
    CHECK (starts_at > created_at);