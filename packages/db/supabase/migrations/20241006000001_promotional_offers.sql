-- Migration: Add promotional offer functionality for payment conversion
-- Created: 2024-10-06
-- Description: Adds columns to events table for venue promotional incentives

-- Add promotional offer columns to events table
ALTER TABLE events
ADD COLUMN promo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN promo_message TEXT,
ADD COLUMN promo_duration INTEGER; -- Duration in minutes

-- Add comment for clarity
COMMENT ON COLUMN events.promo_enabled IS 'Whether promotional offer is active for this event';
COMMENT ON COLUMN events.promo_message IS 'Custom promotional message (e.g., "Pay within 10 minutes and receive a free pot of Carlton Draught")';
COMMENT ON COLUMN events.promo_duration IS 'Promotional offer validity duration in minutes (defaults to payment_timeout_minutes if null)';

-- Add promo tracking columns to patron_entries table
ALTER TABLE patron_entries
ADD COLUMN promo_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN promo_expired_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN patron_entries.promo_claimed IS 'Whether participant paid within promotional offer window';
COMMENT ON COLUMN patron_entries.promo_expired_at IS 'When the promotional offer expired for this entry';

-- Function to calculate promo deadline for an entry
CREATE OR REPLACE FUNCTION calculate_promo_deadline(
    entry_created_at TIMESTAMP WITH TIME ZONE,
    event_promo_duration INTEGER,
    event_payment_timeout INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Use promo_duration if set, otherwise fall back to payment timeout
    IF event_promo_duration IS NOT NULL AND event_promo_duration > 0 THEN
        RETURN entry_created_at + (event_promo_duration || ' minutes')::INTERVAL;
    ELSIF event_payment_timeout IS NOT NULL AND event_payment_timeout > 0 THEN
        RETURN entry_created_at + (event_payment_timeout || ' minutes')::INTERVAL;
    ELSE
        -- Default to 15 minutes
        RETURN entry_created_at + '15 minutes'::INTERVAL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if promo is still valid for an entry
CREATE OR REPLACE FUNCTION is_promo_valid(
    entry_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    entry_record RECORD;
    promo_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get entry and event details
    SELECT
        pe.created_at,
        pe.payment_status,
        pe.promo_claimed,
        e.promo_enabled,
        e.promo_duration,
        e.payment_timeout_minutes
    INTO entry_record
    FROM patron_entries pe
    JOIN events e ON pe.event_id = e.id
    WHERE pe.id = entry_id;

    -- Return false if entry not found or promo not enabled
    IF NOT FOUND OR NOT entry_record.promo_enabled THEN
        RETURN FALSE;
    END IF;

    -- Return false if already claimed or paid
    IF entry_record.promo_claimed OR entry_record.payment_status = 'paid' THEN
        RETURN FALSE;
    END IF;

    -- Calculate promo deadline
    promo_deadline := calculate_promo_deadline(
        entry_record.created_at,
        entry_record.promo_duration,
        entry_record.payment_timeout_minutes
    );

    -- Return true if promo is still valid
    RETURN NOW() <= promo_deadline;
END;
$$ LANGUAGE plpgsql;

-- Function to get promo stats for an event
CREATE OR REPLACE FUNCTION get_promo_stats(event_uuid UUID)
RETURNS TABLE(
    total_entries INTEGER,
    promo_eligible INTEGER,
    promo_claimed INTEGER,
    promo_expired INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_entries,
        COUNT(*) FILTER (WHERE e.promo_enabled)::INTEGER as promo_eligible,
        COUNT(*) FILTER (WHERE pe.promo_claimed)::INTEGER as promo_claimed,
        COUNT(*) FILTER (WHERE pe.promo_expired_at IS NOT NULL AND pe.promo_expired_at <= NOW())::INTEGER as promo_expired,
        CASE
            WHEN COUNT(*) FILTER (WHERE e.promo_enabled) > 0 THEN
                ROUND(
                    (COUNT(*) FILTER (WHERE pe.promo_claimed)::NUMERIC /
                     COUNT(*) FILTER (WHERE e.promo_enabled)::NUMERIC) * 100,
                    2
                )
            ELSE 0
        END as conversion_rate
    FROM patron_entries pe
    JOIN events e ON pe.event_id = e.id
    WHERE pe.event_id = event_uuid
    AND pe.payment_status != 'expired';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set promo_expired_at when appropriate
CREATE OR REPLACE FUNCTION update_promo_expiry()
RETURNS TRIGGER AS $$
DECLARE
    event_record RECORD;
    promo_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only process if this is an insert or status change
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status) THEN
        -- Get event details
        SELECT promo_enabled, promo_duration, payment_timeout_minutes
        INTO event_record
        FROM events
        WHERE id = NEW.event_id;

        -- Only set promo expiry if promo is enabled
        IF event_record.promo_enabled THEN
            promo_deadline := calculate_promo_deadline(
                NEW.created_at,
                event_record.promo_duration,
                event_record.payment_timeout_minutes
            );

            -- Set promo_expired_at if deadline has passed and not already claimed
            IF NOW() > promo_deadline AND NOT NEW.promo_claimed THEN
                NEW.promo_expired_at := promo_deadline;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for promo expiry updates
DROP TRIGGER IF EXISTS trigger_update_promo_expiry ON patron_entries;
CREATE TRIGGER trigger_update_promo_expiry
    BEFORE INSERT OR UPDATE ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_promo_expiry();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_promo_deadline TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_promo_valid TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_promo_stats TO authenticated, anon;