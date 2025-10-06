-- Fix patron_entries table schema to match frontend expectations
-- Rename display_name to participant_name and consent to marketing_consent

-- Rename display_name column to participant_name
ALTER TABLE patron_entries
RENAME COLUMN display_name TO participant_name;

-- Rename consent column to marketing_consent
ALTER TABLE patron_entries
RENAME COLUMN consent TO marketing_consent;

-- Add missing columns that frontend expects but don't exist in schema
ALTER TABLE patron_entries
ADD COLUMN IF NOT EXISTS entry_method TEXT DEFAULT 'self-registered',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Add comment for clarity
COMMENT ON COLUMN patron_entries.participant_name IS 'Full name of the participant (renamed from display_name)';
COMMENT ON COLUMN patron_entries.marketing_consent IS 'Whether participant consented to marketing (renamed from consent)';
COMMENT ON COLUMN patron_entries.entry_method IS 'How the participant entered (self-registered, admin-added, etc.)';
COMMENT ON COLUMN patron_entries.payment_status IS 'Payment status (free, pending, paid, failed)';