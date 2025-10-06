-- Migration: Results and Winners System
-- Created: 2024-10-06
-- Description: Complete event lifecycle with results entry, winner identification, and prize tracking

-- Create custom enum types
CREATE TYPE results_status AS ENUM ('pending', 'final', 'disputed');
CREATE TYPE win_status AS ENUM ('none', 'first', 'second', 'third', 'placed');

-- Add results tracking to events table
ALTER TABLE events
ADD COLUMN results_status results_status DEFAULT 'pending',
ADD COLUMN results_entered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN results_entered_by UUID REFERENCES auth.users(id);

-- Add comments for clarity
COMMENT ON COLUMN events.results_status IS 'Status of race results: pending (not entered), final (locked), disputed (under review)';
COMMENT ON COLUMN events.results_entered_at IS 'When race results were first entered';
COMMENT ON COLUMN events.results_entered_by IS 'User who entered the results';

-- Create event_results table for race finishing positions
CREATE TABLE event_results (
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

-- Add RLS to event_results
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_results
CREATE POLICY "Users can view results for their tenant's events" ON event_results
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN tenant_users tu ON e.tenant_id = tu.tenant_id
            WHERE tu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage results for their tenant's events" ON event_results
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            JOIN tenant_users tu ON e.tenant_id = tu.tenant_id
            WHERE tu.user_id = auth.uid()
        )
    );

-- Add winner tracking to patron_entries table
ALTER TABLE patron_entries
ADD COLUMN win_status win_status DEFAULT 'none',
ADD COLUMN notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN prize_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN prize_claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN claimed_by_staff UUID REFERENCES auth.users(id);

-- Add comments for clarity
COMMENT ON COLUMN patron_entries.win_status IS 'Whether participant won: none, first, second, third, or placed';
COMMENT ON COLUMN patron_entries.notified_at IS 'When winner was notified of their win';
COMMENT ON COLUMN patron_entries.prize_claimed IS 'Whether winner has collected their prize';
COMMENT ON COLUMN patron_entries.prize_claimed_at IS 'When prize was claimed';
COMMENT ON COLUMN patron_entries.claimed_by_staff IS 'Staff member who processed prize collection';

-- Add horse_number to assignments table for easier winner matching
ALTER TABLE assignments
ADD COLUMN horse_number INTEGER;

-- Update existing assignments to include horse numbers from event_horses
UPDATE assignments
SET horse_number = (
    SELECT eh.number
    FROM event_horses eh
    WHERE eh.id = assignments.event_horse_id
);

-- Make horse_number NOT NULL going forward
ALTER TABLE assignments
ALTER COLUMN horse_number SET NOT NULL;

-- Add index for faster winner lookups
CREATE INDEX idx_assignments_event_horse_number ON assignments(event_id, horse_number);
CREATE INDEX idx_patron_entries_win_status ON patron_entries(event_id, win_status) WHERE win_status != 'none';
CREATE INDEX idx_event_results_event_place ON event_results(event_id, place);

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

-- Trigger to auto-match winners when results are inserted/updated
CREATE TRIGGER trigger_match_winners
    AFTER INSERT OR UPDATE ON event_results
    FOR EACH ROW
    EXECUTE FUNCTION match_event_winners();

-- Function to get winners for an event
CREATE OR REPLACE FUNCTION get_event_winners(event_uuid UUID)
RETURNS TABLE(
    place INTEGER,
    horse_number INTEGER,
    participant_id UUID,
    participant_name TEXT,
    join_code TEXT,
    email TEXT,
    phone TEXT,
    prize_amount DECIMAL,
    win_status win_status,
    notified_at TIMESTAMP WITH TIME ZONE,
    prize_claimed BOOLEAN,
    prize_claimed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.place,
        er.horse_number,
        pe.id as participant_id,
        pe.display_name as participant_name,
        pe.join_code,
        pe.email,
        pe.phone,
        er.prize_amount,
        pe.win_status,
        pe.notified_at,
        pe.prize_claimed,
        pe.prize_claimed_at
    FROM event_results er
    JOIN assignments a ON a.event_id = er.event_id AND a.horse_number = er.horse_number
    JOIN patron_entries pe ON pe.id = a.patron_entry_id
    WHERE er.event_id = event_uuid
    ORDER BY er.place ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if participant won by join code
CREATE OR REPLACE FUNCTION check_winner_by_join_code(
    event_uuid UUID,
    participant_join_code TEXT
)
RETURNS TABLE(
    won BOOLEAN,
    place INTEGER,
    horse_number INTEGER,
    participant_name TEXT,
    prize_amount DECIMAL,
    event_name TEXT,
    venue_name TEXT,
    win_status win_status
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (pe.win_status != 'none') as won,
        er.place,
        COALESCE(er.horse_number, a.horse_number) as horse_number,
        pe.display_name as participant_name,
        er.prize_amount,
        e.name as event_name,
        t.name as venue_name,
        pe.win_status
    FROM patron_entries pe
    JOIN assignments a ON a.patron_entry_id = pe.id
    JOIN events e ON e.id = pe.event_id
    JOIN tenants t ON t.id = e.tenant_id
    LEFT JOIN event_results er ON er.event_id = pe.event_id AND er.horse_number = a.horse_number
    WHERE pe.event_id = event_uuid
    AND UPPER(pe.join_code) = UPPER(participant_join_code)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get results summary for an event
CREATE OR REPLACE FUNCTION get_event_results_summary(event_uuid UUID)
RETURNS TABLE(
    total_participants INTEGER,
    winners_count INTEGER,
    results_final BOOLEAN,
    results_entered_at TIMESTAMP WITH TIME ZONE,
    prizes_claimed INTEGER,
    prizes_unclaimed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_participants,
        COUNT(*) FILTER (WHERE pe.win_status != 'none')::INTEGER as winners_count,
        (e.results_status = 'final') as results_final,
        e.results_entered_at,
        COUNT(*) FILTER (WHERE pe.prize_claimed = true)::INTEGER as prizes_claimed,
        COUNT(*) FILTER (WHERE pe.win_status != 'none' AND pe.prize_claimed = false)::INTEGER as prizes_unclaimed
    FROM events e
    JOIN patron_entries pe ON pe.event_id = e.id
    WHERE e.id = event_uuid
    GROUP BY e.id, e.results_status, e.results_entered_at;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize results (lock them)
CREATE OR REPLACE FUNCTION finalize_event_results(
    event_uuid UUID,
    finalizing_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    result_count INTEGER;
BEGIN
    -- Check if there are any results entered
    SELECT COUNT(*) INTO result_count
    FROM event_results
    WHERE event_id = event_uuid;

    IF result_count = 0 THEN
        RAISE EXCEPTION 'Cannot finalize results: No results have been entered for this event';
    END IF;

    -- Update event status to final
    UPDATE events
    SET
        results_status = 'final',
        results_entered_at = COALESCE(results_entered_at, NOW()),
        results_entered_by = COALESCE(results_entered_by, finalizing_user_id),
        updated_at = NOW()
    WHERE id = event_uuid;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock results for editing (admin only)
CREATE OR REPLACE FUNCTION unlock_event_results(
    event_uuid UUID,
    unlock_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Log the unlock action (you could create an audit table for this)
    INSERT INTO event_results (event_id, place, horse_number, prize_amount)
    VALUES (event_uuid, 0, 0, 0); -- Dummy record to log unlock action

    -- Update event status back to pending
    UPDATE events
    SET
        results_status = 'pending',
        updated_at = NOW()
    WHERE id = event_uuid;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_event_winners TO authenticated;
GRANT EXECUTE ON FUNCTION check_winner_by_join_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_event_results_summary TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_event_results TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_event_results TO authenticated;

-- Create updated_at trigger for event_results
CREATE TRIGGER set_timestamp_event_results
    BEFORE UPDATE ON event_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add validation to ensure results can only be entered after event starts
CREATE OR REPLACE FUNCTION validate_results_timing()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if event has started (basic validation)
    IF EXISTS (
        SELECT 1 FROM events
        WHERE id = NEW.event_id
        AND starts_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Cannot enter results for an event that has not started yet';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_results_timing
    BEFORE INSERT OR UPDATE ON event_results
    FOR EACH ROW
    EXECUTE FUNCTION validate_results_timing();