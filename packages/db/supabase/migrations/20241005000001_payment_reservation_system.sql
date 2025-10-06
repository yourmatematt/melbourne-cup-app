-- Payment Reservation System Migration
-- Adds payment status tracking and reservation timeout functionality

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'expired');

-- Add payment-related columns to patron_entries table
ALTER TABLE patron_entries
ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'pending',
ADD COLUMN payment_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_amount DECIMAL(10,2),
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN entry_method TEXT DEFAULT 'online';

-- Add payment-related columns to events table for configuration
ALTER TABLE events
ADD COLUMN entry_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN payment_timeout_minutes INTEGER DEFAULT 15,
ADD COLUMN requires_payment BOOLEAN DEFAULT false;

-- Create function to automatically set payment deadline on insert
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

-- Create trigger to set payment deadline on insert
CREATE TRIGGER set_payment_deadline_trigger
    BEFORE INSERT ON patron_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_deadline();

-- Create function to expire unpaid entries
CREATE OR REPLACE FUNCTION expire_unpaid_entries()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update entries where deadline has passed and payment is still pending
    UPDATE patron_entries
    SET
        payment_status = 'expired',
        updated_at = NOW()
    WHERE
        payment_status = 'pending'
        AND payment_deadline < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current paid participant count for capacity checking
CREATE OR REPLACE FUNCTION get_paid_participant_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM patron_entries
        WHERE event_id = event_uuid
        AND payment_status = 'paid'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get pending participant count
CREATE OR REPLACE FUNCTION get_pending_participant_count(event_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM patron_entries
        WHERE event_id = event_uuid
        AND payment_status = 'pending'
        AND payment_deadline > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to check if event has capacity for new registrations
CREATE OR REPLACE FUNCTION has_capacity(event_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_capacity INTEGER;
    paid_count INTEGER;
    pending_count INTEGER;
BEGIN
    -- Get event capacity
    SELECT capacity INTO event_capacity
    FROM events
    WHERE id = event_uuid;

    -- Get current counts
    SELECT get_paid_participant_count(event_uuid) INTO paid_count;
    SELECT get_pending_participant_count(event_uuid) INTO pending_count;

    -- Return true if there's space for one more
    RETURN (paid_count + pending_count) < event_capacity;
END;
$$ LANGUAGE plpgsql;

-- Create index for performance on payment deadline queries
CREATE INDEX idx_patron_entries_payment_deadline
ON patron_entries (payment_deadline)
WHERE payment_status = 'pending';

-- Create index for performance on payment status queries
CREATE INDEX idx_patron_entries_payment_status
ON patron_entries (payment_status, event_id);

-- Update existing entries to have 'paid' status (grandfathered in)
UPDATE patron_entries
SET payment_status = 'paid', paid_at = created_at
WHERE payment_status = 'pending';

-- Add comments for documentation
COMMENT ON COLUMN patron_entries.payment_status IS 'Payment status: pending (awaiting payment), paid (confirmed), expired (deadline passed)';
COMMENT ON COLUMN patron_entries.payment_deadline IS 'Deadline for payment confirmation, auto-set based on event timeout';
COMMENT ON COLUMN patron_entries.payment_amount IS 'Amount paid for entry fee';
COMMENT ON COLUMN patron_entries.paid_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN patron_entries.entry_method IS 'How the patron registered: online, manual, etc.';

COMMENT ON COLUMN events.entry_fee IS 'Entry fee amount for this event';
COMMENT ON COLUMN events.payment_timeout_minutes IS 'Minutes patrons have to pay after registering';
COMMENT ON COLUMN events.requires_payment IS 'Whether this event requires payment confirmation';