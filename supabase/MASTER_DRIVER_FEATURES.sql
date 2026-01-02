-- ==========================================
-- 🚀 MASTER MIGRATION FILE: DRIVER FEATURES
-- Run this entire file in Supabase SQL Editor
-- ==========================================

-- 1. PUSH NOTIFICATIONS
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS platform TEXT;

-- 2. LOCATION & GEO-TRACKING
-- Create table to store historical breadcrumbs
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  accuracy FLOAT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID -- Simplified: No FK to avoid errors if company table differs
);

-- RLS for Location History
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert their own location" ON driver_locations FOR INSERT
WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Managers can read company driver locations" ON driver_locations FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Add lat/lng to Activity Logs for "Clock In" location
ALTER TABLE driver_activity_logs ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE driver_activity_logs ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- 3. DELIVERY VERIFICATION (PROOF OF PRESENCE)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_lat FLOAT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_lng FLOAT;

-- 4. IDLE DETECTION & BATTERY
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS idle_since TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS battery_level INTEGER;

-- 5. ANTI-FRAUD FLAGGING
ALTER TABLE orders ADD COLUMN IF NOT EXISTS was_out_of_range BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_meters FLOAT;

-- 6. FINAL CLEANUP (Optional)
-- Ensure RLS allows updates to these new columns
-- (Existing policies usually cover "UPDATE self" but good to double check)
