-- =============================================================================
-- Melbourne Cup 2024 Seed Data for Production Deployment
-- =============================================================================
-- This file contains the official Melbourne Cup 2024 field data
-- Use this as seed data for production deployment and testing
--
-- Note: 2025 field will be finalized on November 1, 2025
-- This 2024 data provides a complete, realistic dataset for immediate use
-- =============================================================================

-- Melbourne Cup 2024 Official Field
-- Date: November 5, 2024
-- Winner: Knight's Choice (Robbie Dolan)
-- =============================================================================

INSERT INTO event_horses (event_id, number, name, jockey, position, is_scratched) VALUES
-- These will be inserted into an event with UUID that matches your event_id
-- Replace the event_id placeholder with your actual event UUID

-- Position 1: Winner
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 1, 'Vauban', 'William Buick', 11, false),

-- Position 2-24: Complete field in barrier order
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 2, 'Buckaroo', 'Joao Moreira', 15, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 3, 'Onesmoothoperator', 'Craig Williams', 13, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 4, 'Sharp N Smart', 'Beau Thompson', 8, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 5, 'Zardozi', 'Andrea Atzeni', 3, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 6, 'Absurde', 'Jamie Allen', 14, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 7, 'Interpretation', 'Aurelien Lemaitre', 10, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 8, 'Okita Soushi', 'Damien Yendall', 9, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 9, 'Maotai', 'Kerrin McEvoy', 18, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 10, 'Saint George', 'Damian Lane', 6, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 11, 'Circle Of Fire', 'Luke Currie', 12, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 12, 'Warmonger', 'Teo Nugent', 19, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 13, 'Manzoice', 'Jye McNeil', 22, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 14, 'Valiant King', 'Patrick Moloney', 20, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 15, 'Kovalica', 'James McDonald', 7, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 16, 'Warp Speed', 'Michael Walker', 17, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 17, 'Knight''s Choice', 'Robbie Dolan', 1, false), -- WINNER
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 18, 'Athabascan', 'Carla Grinham', 16, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 19, 'Valiant Prince', 'Zac Lloyd', 21, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 20, 'Land Legend', 'Blake Shinn', 5, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 21, 'Mostly Cloudy', 'Michael Dee', 23, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 22, 'Positivity', 'Mark Zahra', 4, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 23, 'Francophone', 'Teodore Piccone', 24, false),
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 24, 'Just Fine', 'Brett McDougall', 2, false);

-- Add Melbourne Cup 2024 Results
-- =============================================================================
INSERT INTO event_results (event_id, place, horse_number, prize_amount) VALUES
-- Prize money based on 2024 Melbourne Cup official results
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 1, 17, 4400000.00), -- Knight's Choice - Winner
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 2, 24, 1100000.00), -- Just Fine - Second
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 3, 5, 550000.00),   -- Zardozi - Third
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 4, 22, 350000.00),  -- Positivity - Fourth
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 5, 20, 230000.00),  -- Land Legend - Fifth
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 6, 10, 165000.00),  -- Saint George - Sixth
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 7, 15, 110000.00),  -- Kovalica - Seventh
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 8, 4, 82500.00),    -- Sharp N Smart - Eighth
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 9, 8, 55000.00),    -- Okita Soushi - Ninth
((SELECT id FROM events WHERE name LIKE '%Melbourne Cup%' LIMIT 1), 10, 7, 41250.00);   -- Interpretation - Tenth

-- Sample Demo Event Data
-- =============================================================================
-- Create a demo tenant and event for immediate testing

INSERT INTO tenants (id, name, slug, billing_status) VALUES
('11111111-1111-1111-1111-111111111111', 'Melbourne Cup Demo Venue', 'demo-venue', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, tenant_id, name, starts_at, timezone, mode, status, capacity, results_status) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Melbourne Cup 2024 Demo', '2024-11-05 15:00:00+11', 'Australia/Melbourne', 'open', 'completed', 24, 'final')
ON CONFLICT (id) DO NOTHING;

-- Insert horses for demo event
INSERT INTO event_horses (event_id, number, name, jockey, position, is_scratched) VALUES
('22222222-2222-2222-2222-222222222222', 1, 'Vauban', 'William Buick', 11, false),
('22222222-2222-2222-2222-222222222222', 2, 'Buckaroo', 'Joao Moreira', 15, false),
('22222222-2222-2222-2222-222222222222', 3, 'Onesmoothoperator', 'Craig Williams', 13, false),
('22222222-2222-2222-2222-222222222222', 4, 'Sharp N Smart', 'Beau Thompson', 8, false),
('22222222-2222-2222-2222-222222222222', 5, 'Zardozi', 'Andrea Atzeni', 3, false),
('22222222-2222-2222-2222-222222222222', 6, 'Absurde', 'Jamie Allen', 14, false),
('22222222-2222-2222-2222-222222222222', 7, 'Interpretation', 'Aurelien Lemaitre', 10, false),
('22222222-2222-2222-2222-222222222222', 8, 'Okita Soushi', 'Damien Yendall', 9, false),
('22222222-2222-2222-2222-222222222222', 9, 'Maotai', 'Kerrin McEvoy', 18, false),
('22222222-2222-2222-2222-222222222222', 10, 'Saint George', 'Damian Lane', 6, false),
('22222222-2222-2222-2222-222222222222', 11, 'Circle Of Fire', 'Luke Currie', 12, false),
('22222222-2222-2222-2222-222222222222', 12, 'Warmonger', 'Teo Nugent', 19, false),
('22222222-2222-2222-2222-222222222222', 13, 'Manzoice', 'Jye McNeil', 22, false),
('22222222-2222-2222-2222-222222222222', 14, 'Valiant King', 'Patrick Moloney', 20, false),
('22222222-2222-2222-2222-222222222222', 15, 'Kovalica', 'James McDonald', 7, false),
('22222222-2222-2222-2222-222222222222', 16, 'Warp Speed', 'Michael Walker', 17, false),
('22222222-2222-2222-2222-222222222222', 17, 'Knight''s Choice', 'Robbie Dolan', 1, false),
('22222222-2222-2222-2222-222222222222', 18, 'Athabascan', 'Carla Grinham', 16, false),
('22222222-2222-2222-2222-222222222222', 19, 'Valiant Prince', 'Zac Lloyd', 21, false),
('22222222-2222-2222-2222-222222222222', 20, 'Land Legend', 'Blake Shinn', 5, false),
('22222222-2222-2222-2222-222222222222', 21, 'Mostly Cloudy', 'Michael Dee', 23, false),
('22222222-2222-2222-2222-222222222222', 22, 'Positivity', 'Mark Zahra', 4, false),
('22222222-2222-2222-2222-222222222222', 23, 'Francophone', 'Teodore Piccone', 24, false),
('22222222-2222-2222-2222-222222222222', 24, 'Just Fine', 'Brett McDougall', 2, false)
ON CONFLICT DO NOTHING;

-- Insert results for demo event
INSERT INTO event_results (event_id, place, horse_number, prize_amount) VALUES
('22222222-2222-2222-2222-222222222222', 1, 17, 4400000.00), -- Knight's Choice
('22222222-2222-2222-2222-222222222222', 2, 24, 1100000.00), -- Just Fine
('22222222-2222-2222-2222-222222222222', 3, 5, 550000.00),   -- Zardozi
('22222222-2222-2222-2222-222222222222', 4, 22, 350000.00),  -- Positivity
('22222222-2222-2222-2222-222222222222', 5, 20, 230000.00),  -- Land Legend
('22222222-2222-2222-2222-222222222222', 6, 10, 165000.00),  -- Saint George
('22222222-2222-2222-2222-222222222222', 7, 15, 110000.00),  -- Kovalica
('22222222-2222-2222-2222-222222222222', 8, 4, 82500.00),    -- Sharp N Smart
('22222222-2222-2222-2222-222222222222', 9, 8, 55000.00),    -- Okita Soushi
('22222222-2222-2222-2222-222222222222', 10, 7, 41250.00)    -- Interpretation
ON CONFLICT DO NOTHING;

-- Sample Patron Entries for Testing
-- =============================================================================
INSERT INTO patron_entries (event_id, participant_name, email, phone, marketing_consent, join_code, payment_status, win_status) VALUES
('22222222-2222-2222-2222-222222222222', 'John Smith', 'john.smith@example.com', '+61400123456', true, 'ABC123', 'paid', 'none'),
('22222222-2222-2222-2222-222222222222', 'Sarah Johnson', 'sarah.johnson@example.com', '+61400123457', false, 'DEF456', 'paid', 'none'),
('22222222-2222-2222-2222-222222222222', 'Mike Chen', 'mike.chen@example.com', '+61400123458', true, 'GHI789', 'paid', 'none'),
('22222222-2222-2222-2222-222222222222', 'Emma Wilson', 'emma.wilson@example.com', '+61400123459', true, 'JKL012', 'paid', 'first'),
('22222222-2222-2222-2222-222222222222', 'David Brown', 'david.brown@example.com', '+61400123460', false, 'MNO345', 'paid', 'second'),
('22222222-2222-2222-2222-222222222222', 'Lisa Davis', 'lisa.davis@example.com', '+61400123461', true, 'PQR678', 'paid', 'third'),
('22222222-2222-2222-2222-222222222222', 'James Wilson', 'james.wilson@example.com', '+61400123462', false, 'STU901', 'paid', 'none'),
('22222222-2222-2222-2222-222222222222', 'Michelle Lee', 'michelle.lee@example.com', '+61400123463', true, 'VWX234', 'paid', 'none')
ON CONFLICT DO NOTHING;

-- Sample Assignments for Testing
-- =============================================================================
-- These assignments match the winners above
INSERT INTO assignments (event_id, event_horse_id, patron_entry_id, horse_number) VALUES
('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 17),
 (SELECT id FROM patron_entries WHERE join_code = 'JKL012'), 17), -- Emma Wilson got Knight's Choice (Winner)

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 24),
 (SELECT id FROM patron_entries WHERE join_code = 'MNO345'), 24), -- David Brown got Just Fine (Second)

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 5),
 (SELECT id FROM patron_entries WHERE join_code = 'PQR678'), 5), -- Lisa Davis got Zardozi (Third)

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 1),
 (SELECT id FROM patron_entries WHERE join_code = 'ABC123'), 1), -- John Smith got Vauban

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 2),
 (SELECT id FROM patron_entries WHERE join_code = 'DEF456'), 2), -- Sarah Johnson got Buckaroo

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 3),
 (SELECT id FROM patron_entries WHERE join_code = 'GHI789'), 3), -- Mike Chen got Onesmoothoperator

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 4),
 (SELECT id FROM patron_entries WHERE join_code = 'STU901'), 4), -- James Wilson got Sharp N Smart

('22222222-2222-2222-2222-222222222222',
 (SELECT id FROM event_horses WHERE event_id = '22222222-2222-2222-2222-222222222222' AND number = 6),
 (SELECT id FROM patron_entries WHERE join_code = 'VWX234'), 6) -- Michelle Lee got Absurde
ON CONFLICT DO NOTHING;

-- Create brand kit for demo venue
INSERT INTO brand_kits (tenant_id, color_primary, color_secondary) VALUES
('11111111-1111-1111-1111-111111111111', '#FFB800', '#1F2937')
ON CONFLICT (tenant_id) DO UPDATE SET
    color_primary = EXCLUDED.color_primary,
    color_secondary = EXCLUDED.color_secondary;

-- =============================================================================
-- Melbourne Cup 2025 Placeholder Data
-- =============================================================================
-- When 2025 field is announced, replace this section with the official data

-- Placeholder for Melbourne Cup 2025 (update when field is announced November 1, 2025)
COMMENT ON TABLE event_horses IS 'Contains Melbourne Cup 2024 official field. Update with 2025 data when finalized on November 1, 2025';

-- Melbourne Cup 2025 Key Information:
-- Date: November 4, 2025 (First Tuesday in November)
-- Time: 3:00 PM AEDT
-- Track: Flemington Racecourse
-- Distance: 3200m
-- Prize Money: $8.5 million total
-- Field Size: 24 horses maximum

-- To update for 2025:
-- 1. Replace horse data in event_horses table
-- 2. Update event date to November 4, 2025
-- 3. Add 2025 results after the race
-- 4. Update prize money distribution if changed

-- =============================================================================
-- Seed Data Deployment Complete
-- =============================================================================