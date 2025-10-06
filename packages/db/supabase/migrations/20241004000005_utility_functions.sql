-- Utility functions and triggers for the Melbourne Cup sweep platform

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

-- Function to automatically assign horses to patrons
CREATE OR REPLACE FUNCTION auto_assign_horses(event_uuid UUID)
RETURNS VOID AS $$
DECLARE
    patron_record RECORD;
    horse_record RECORD;
    assignment_count INTEGER := 0;
BEGIN
    -- Get unassigned patrons and horses for this event
    FOR patron_record IN
        SELECT pe.id as patron_id
        FROM patron_entries pe
        LEFT JOIN assignments a ON a.patron_entry_id = pe.id
        WHERE pe.event_id = event_uuid
        AND a.id IS NULL
        ORDER BY pe.created_at
    LOOP
        -- Find an unassigned horse
        SELECT eh.id INTO horse_record
        FROM event_horses eh
        LEFT JOIN assignments a ON a.event_horse_id = eh.id
        WHERE eh.event_id = event_uuid
        AND eh.is_scratched = false
        AND a.id IS NULL
        ORDER BY eh.number
        LIMIT 1;

        -- If we found a horse, create the assignment
        IF horse_record.id IS NOT NULL THEN
            INSERT INTO assignments (event_id, event_horse_id, patron_entry_id)
            VALUES (event_uuid, horse_record.id, patron_record.patron_id);

            assignment_count := assignment_count + 1;
        END IF;
    END LOOP;

    -- Update event status to drawing if assignments were made
    IF assignment_count > 0 THEN
        UPDATE events
        SET status = 'drawing'
        WHERE id = event_uuid AND status = 'active';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate event capacity
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_entries INTEGER;
    event_capacity INTEGER;
BEGIN
    -- Get current entry count and capacity
    SELECT COUNT(*), e.capacity
    INTO current_entries, event_capacity
    FROM patron_entries pe
    JOIN events e ON e.id = pe.event_id
    WHERE pe.event_id = NEW.event_id
    GROUP BY e.capacity;

    -- Check if we're exceeding capacity
    IF current_entries > event_capacity THEN
        RAISE EXCEPTION 'Event capacity of % exceeded', event_capacity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check capacity on patron entry insert
CREATE TRIGGER check_patron_entry_capacity
    AFTER INSERT ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_event_capacity();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brand_kits_updated_at
    BEFORE UPDATE ON brand_kits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER event_horses_updated_at
    BEFORE UPDATE ON event_horses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER patron_entries_updated_at
    BEFORE UPDATE ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to handle user creation from auth
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

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to create default brand kit for new tenants
CREATE OR REPLACE FUNCTION create_default_brand_kit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_kits (tenant_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default brand kit
CREATE TRIGGER create_tenant_brand_kit
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_default_brand_kit();

-- Function to prevent assignment of scratched horses
CREATE OR REPLACE FUNCTION prevent_scratched_horse_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM event_horses eh
        WHERE eh.id = NEW.event_horse_id
        AND eh.is_scratched = true
    ) THEN
        RAISE EXCEPTION 'Cannot assign scratched horse';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent scratched horse assignments
CREATE TRIGGER prevent_scratched_assignment
    BEFORE INSERT OR UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_scratched_horse_assignment();

-- Function to clean up assignments when horse is scratched
CREATE OR REPLACE FUNCTION handle_horse_scratching()
RETURNS TRIGGER AS $$
BEGIN
    -- If horse is being scratched, remove any assignments
    IF NEW.is_scratched = true AND OLD.is_scratched = false THEN
        DELETE FROM assignments WHERE event_horse_id = NEW.id;

        -- Notify about the scratching
        PERFORM broadcast_event_update(
            NEW.event_id,
            'horse_scratched',
            jsonb_build_object(
                'horse_id', NEW.id,
                'horse_number', NEW.number,
                'horse_name', NEW.name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for horse scratching
CREATE TRIGGER handle_scratching
    AFTER UPDATE ON event_horses
    FOR EACH ROW
    EXECUTE FUNCTION handle_horse_scratching();

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats(event_uuid UUID)
RETURNS TABLE(
    total_entries INTEGER,
    total_assignments INTEGER,
    available_horses INTEGER,
    capacity INTEGER,
    is_full BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(pe_count.count, 0)::INTEGER as total_entries,
        COALESCE(a_count.count, 0)::INTEGER as total_assignments,
        COALESCE(eh_count.available, 0)::INTEGER as available_horses,
        e.capacity,
        COALESCE(pe_count.count, 0) >= e.capacity as is_full
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as count
        FROM patron_entries
        WHERE event_id = event_uuid
        GROUP BY event_id
    ) pe_count ON pe_count.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as count
        FROM assignments
        WHERE event_id = event_uuid
        GROUP BY event_id
    ) a_count ON a_count.event_id = e.id
    LEFT JOIN (
        SELECT event_id, COUNT(*) as available
        FROM event_horses
        WHERE event_id = event_uuid AND is_scratched = false
        GROUP BY event_id
    ) eh_count ON eh_count.event_id = e.id
    WHERE e.id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;