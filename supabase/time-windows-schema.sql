-- Add Time Window columns to 'orders'
-- Format: Time (HH:MM) or interval, depending on preference. 
-- Using 'time' type for simplicity, independent of date.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS time_window_start time,
ADD COLUMN IF NOT EXISTS time_window_end time;

-- Example: Start 09:00:00, End 11:00:00

-- Comment: The optimizer must prioritize strictly:
-- 1. Locked Orders (Manual Override)
-- 2. Time Windows (Hard Constraint)
-- 3. Distance (Efficiency)
