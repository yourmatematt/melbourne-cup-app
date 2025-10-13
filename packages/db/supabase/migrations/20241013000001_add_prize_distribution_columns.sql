-- Add prize distribution columns to events table
-- This allows events to have configurable prize split percentages

ALTER TABLE events
ADD COLUMN IF NOT EXISTS first_place_percentage DECIMAL(5,2) DEFAULT 60.00,
ADD COLUMN IF NOT EXISTS second_place_percentage DECIMAL(5,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS third_place_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Add comments to explain the columns
COMMENT ON COLUMN events.first_place_percentage IS 'Percentage of prize pool for 1st place (0-100)';
COMMENT ON COLUMN events.second_place_percentage IS 'Percentage of prize pool for 2nd place (0-100)';
COMMENT ON COLUMN events.third_place_percentage IS 'Percentage of prize pool for 3rd place (0-100)';

-- Add constraint to ensure percentages add up to 100
ALTER TABLE events
ADD CONSTRAINT check_prize_percentage_total
CHECK (first_place_percentage + second_place_percentage + third_place_percentage = 100.00);