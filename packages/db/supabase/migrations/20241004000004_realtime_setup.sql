-- Create publication for realtime functionality
-- This enables real-time subscriptions for the Melbourne Cup sweep platform

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create the realtime publication
CREATE PUBLICATION supabase_realtime;

-- Add tables to realtime publication for live updates
-- Events - for status changes and live updates
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Event horses - for scratching updates and position changes
ALTER PUBLICATION supabase_realtime ADD TABLE event_horses;

-- Patron entries - for live participant tracking
ALTER PUBLICATION supabase_realtime ADD TABLE patron_entries;

-- Assignments - for live draw updates
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;

-- Winners - for live results
ALTER PUBLICATION supabase_realtime ADD TABLE winners;

-- Brand kits - for live theme updates
ALTER PUBLICATION supabase_realtime ADD TABLE brand_kits;

-- Tenant users - for live membership changes
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_users;

-- Enable realtime for specific operations
-- We typically want INSERT, UPDATE, DELETE for most tables
-- but can be more selective if needed

-- Note: Realtime RLS policies will inherit from the table RLS policies
-- This ensures users only receive real-time updates for data they have access to

-- Create a function to broadcast custom realtime events
CREATE OR REPLACE FUNCTION broadcast_event_update(
    event_uuid UUID,
    event_type TEXT,
    payload JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
    -- This function can be used to send custom realtime notifications
    -- Example usage: SELECT broadcast_event_update('event-id', 'drawing_started', '{"message": "Draw has begun"}');

    PERFORM pg_notify(
        'event_update',
        json_build_object(
            'event_id', event_uuid,
            'type', event_type,
            'payload', payload,
            'timestamp', extract(epoch from now())
        )::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to notify when assignments change
CREATE OR REPLACE FUNCTION notify_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM broadcast_event_update(
        COALESCE(NEW.event_id, OLD.event_id),
        TG_OP::TEXT,
        CASE TG_OP
            WHEN 'INSERT' THEN row_to_json(NEW)::JSONB
            WHEN 'UPDATE' THEN jsonb_build_object(
                'old', row_to_json(OLD)::JSONB,
                'new', row_to_json(NEW)::JSONB
            )
            WHEN 'DELETE' THEN row_to_json(OLD)::JSONB
        END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignment changes
CREATE TRIGGER assignments_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_assignment_change();

-- Create a function to notify when event status changes
CREATE OR REPLACE FUNCTION notify_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM broadcast_event_update(
            NEW.id,
            'status_change',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event status changes
CREATE TRIGGER events_status_change_trigger
    AFTER UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION notify_event_status_change();

-- Create a function to notify when winners are announced
CREATE OR REPLACE FUNCTION notify_winner_announcement()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM broadcast_event_update(
        NEW.event_id,
        'winner_announced',
        jsonb_build_object(
            'place', NEW.place,
            'event_horse_id', NEW.event_horse_id,
            'patron_entry_id', NEW.patron_entry_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for winner announcements
CREATE TRIGGER winners_announcement_trigger
    AFTER INSERT ON winners
    FOR EACH ROW
    EXECUTE FUNCTION notify_winner_announcement();