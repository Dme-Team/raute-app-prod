-- Add idle tracking to drivers
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS idle_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS battery_level INTEGER; -- Optional: knowing battery can explain signal loss vs turning off phone

-- Function to calculate distance (Haversine mostly, but simple for now)
-- We'll handle logic in client for now to save DB CPU.
