-- Production Database Setup Script
-- Run this script on your Supabase production instance

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patron_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenants table
CREATE POLICY "Admins can view all tenants" ON tenants
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can view own tenant" ON tenants
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'host' AND
    id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create RLS policies for events table
CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can manage own tenant events" ON events
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'host' AND
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (
    status IN ('lobby', 'drawing', 'complete') AND
    visibility = 'public'
  );

-- Create RLS policies for event_horses table
CREATE POLICY "Admins can manage all horses" ON event_horses
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can manage horses for own events" ON event_horses
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'host' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_horses.event_id
      AND events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Public can view horses for active events" ON event_horses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_horses.event_id
      AND events.status IN ('lobby', 'drawing', 'complete')
      AND events.visibility = 'public'
    )
  );

-- Create RLS policies for patron_entries table
CREATE POLICY "Admins can manage all entries" ON patron_entries
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can manage entries for own events" ON patron_entries
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'host' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = patron_entries.event_id
      AND events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Users can view own entries" ON patron_entries
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create entries" ON patron_entries
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own entries" ON patron_entries
  FOR UPDATE USING (created_by = auth.uid());

-- Create RLS policies for assignments table
CREATE POLICY "Admins can manage all assignments" ON assignments
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can manage assignments for own events" ON assignments
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'host' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = assignments.event_id
      AND events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Users can view own assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patron_entries
      WHERE patron_entries.id = assignments.patron_entry_id
      AND patron_entries.created_by = auth.uid()
    )
  );

CREATE POLICY "Public can view assignments for completed events" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = assignments.event_id
      AND events.status = 'complete'
      AND events.visibility = 'public'
    )
  );

-- Create RLS policies for audit_logs table
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can view logs for own events" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'host' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = audit_logs.event_id
      AND events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Create RLS policies for notifications table
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM patron_entries WHERE created_by = auth.uid()
    )
  );

-- Create RLS policies for resource_locks table
CREATE POLICY "Authenticated users can manage locks" ON resource_locks
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for draw_checkpoints table
CREATE POLICY "Hosts can manage draw checkpoints for own events" ON draw_checkpoints
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'host') AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = draw_checkpoints.event_id
      AND (
        auth.jwt() ->> 'role' = 'admin' OR
        events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      )
    )
  );

-- Create RLS policies for join_attempts table
CREATE POLICY "Admins can view all join attempts" ON join_attempts
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Hosts can view join attempts for own events" ON join_attempts
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'host' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = join_attempts.event_id
      AND events.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_tenant_status ON events(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patron_entries_event_created ON patron_entries(event_id, created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_event_patron ON assignments(event_id, patron_entry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_event_timestamp ON audit_logs(event_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_locks_resource_expires ON resource_locks(resource_type, resource_id, expires_at);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(auth.jwt() ->> 'role', 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'tenant_id')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      new_data,
      created_by
    ) VALUES (
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_by
    ) VALUES (
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      old_data,
      created_by
    ) VALUES (
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
DROP TRIGGER IF EXISTS audit_events ON events;
CREATE TRIGGER audit_events
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_patron_entries ON patron_entries;
CREATE TRIGGER audit_patron_entries
  AFTER INSERT OR UPDATE OR DELETE ON patron_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_assignments ON assignments;
CREATE TRIGGER audit_assignments
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Set up database backup configuration
SELECT cron.schedule(
  'nightly-backup',
  '0 2 * * *',
  'SELECT pg_dump_all();'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Revoke dangerous permissions
REVOKE ALL ON pg_user FROM PUBLIC;
REVOKE ALL ON pg_roles FROM PUBLIC;
REVOKE ALL ON pg_group FROM PUBLIC;
REVOKE ALL ON pg_authid FROM PUBLIC;
REVOKE ALL ON pg_auth_members FROM PUBLIC;
REVOKE ALL ON pg_database FROM PUBLIC;
REVOKE ALL ON pg_tablespace FROM PUBLIC;
REVOKE ALL ON pg_settings FROM PUBLIC;

COMMIT;