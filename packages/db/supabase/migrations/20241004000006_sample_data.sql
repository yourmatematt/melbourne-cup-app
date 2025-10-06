-- Sample data for development and testing
-- This migration adds sample data for the Melbourne Cup sweep platform

-- Sample tenant
INSERT INTO tenants (id, name, slug, billing_status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Melbourne Cup Demo', 'melbourne-cup-demo', 'active');

-- Sample event with Melbourne Cup 2024 horses
INSERT INTO events (id, tenant_id, name, starts_at, timezone, mode, status, capacity) VALUES
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Melbourne Cup 2025', '2025-11-05 14:00:00+11', 'Australia/Melbourne', 'open', 'active', 24);

-- Sample Melbourne Cup horses (2024 field)
INSERT INTO event_horses (event_id, number, name, jockey) VALUES
('550e8400-e29b-41d4-a716-446655440002', 1, 'Vauban', 'W. Buick'),
('550e8400-e29b-41d4-a716-446655440002', 2, 'Buckaroo', 'J. McDonald'),
('550e8400-e29b-41d4-a716-446655440002', 3, 'Onesmoothoperator', 'C. Williams'),
('550e8400-e29b-41d4-a716-446655440002', 4, 'Sharp N Smart', 'B. Thompson'),
('550e8400-e29b-41d4-a716-446655440002', 5, 'Zardozi', 'A. Hamelin'),
('550e8400-e29b-41d4-a716-446655440002', 6, 'Absurde', 'J. Allen'),
('550e8400-e29b-41d4-a716-446655440002', 7, 'Interpretation', 'A. Badel'),
('550e8400-e29b-41d4-a716-446655440002', 8, 'Okita Soushi', 'D. Yendall'),
('550e8400-e29b-41d4-a716-446655440002', 9, 'Maotai', 'K. Parr'),
('550e8400-e29b-41d4-a716-446655440002', 10, 'Saint George', 'D. Lane'),
('550e8400-e29b-41d4-a716-446655440002', 11, 'Circle Of Fire', 'L. Currie'),
('550e8400-e29b-41d4-a716-446655440002', 12, 'Warmonger', 'T. Nugent'),
('550e8400-e29b-41d4-a716-446655440002', 13, 'Manzoice', 'J. Bowditch'),
('550e8400-e29b-41d4-a716-446655440002', 14, 'Valiant King', 'M. Poy'),
('550e8400-e29b-41d4-a716-446655440002', 15, 'Kovalica', 'J. McNeil'),
('550e8400-e29b-41d4-a716-446655440002', 16, 'Warp Speed', 'M. Walker'),
('550e8400-e29b-41d4-a716-446655440002', 17, 'Knight''s Choice', 'R. Dolan'),
('550e8400-e29b-41d4-a716-446655440002', 18, 'Athabascan', 'C. Newitt'),
('550e8400-e29b-41d4-a716-446655440002', 19, 'Valiant Prince', 'Z. Lloyd'),
('550e8400-e29b-41d4-a716-446655440002', 20, 'Land Legend', 'B. Shinn'),
('550e8400-e29b-41d4-a716-446655440002', 21, 'Mostly Cloudy', 'M. Dee'),
('550e8400-e29b-41d4-a716-446655440002', 22, 'Positivity', 'M. Zahra'),
('550e8400-e29b-41d4-a716-446655440002', 23, 'Francophone', 'T. Piccone'),
('550e8400-e29b-41d4-a716-446655440002', 24, 'Just Fine', 'B. McDougall');

-- Sample patron entries
INSERT INTO patron_entries (event_id, display_name, email, phone) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'John Smith', 'john@example.com', '+61400123456'),
('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah@example.com', '+61400123457'),
('550e8400-e29b-41d4-a716-446655440002', 'Mike Chen', 'mike@example.com', '+61400123458'),
('550e8400-e29b-41d4-a716-446655440002', 'Emma Wilson', 'emma@example.com', '+61400123459'),
('550e8400-e29b-41d4-a716-446655440002', 'David Brown', 'david@example.com', '+61400123460');

-- Note: Assignments and winners are intentionally left empty
-- These would be created during the actual sweep process

-- Sample brand kit
INSERT INTO brand_kits (tenant_id, color_primary, color_secondary) VALUES
('550e8400-e29b-41d4-a716-446655440001', '#FFB800', '#1F2937')
ON CONFLICT (tenant_id) DO UPDATE SET
    color_primary = EXCLUDED.color_primary,
    color_secondary = EXCLUDED.color_secondary;

-- Add a comment explaining this is sample data
COMMENT ON TABLE tenants IS 'Sample data added for development purposes';
COMMENT ON TABLE event_horses IS 'Includes actual Melbourne Cup 2024 field for realistic testing';