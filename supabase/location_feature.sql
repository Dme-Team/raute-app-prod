-- FIXED: Remove foreign key reference to company_profiles since it doesn't exist yet in the simplified schema.
-- We will just store the company_id as a UUID for now (logic is handled in app).

CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  accuracy FLOAT, -- meter accuracy
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID -- Removed REFERENCES company_profiles(id)
);

-- Enable RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Allow drivers to insert rows (Only their own)
CREATE POLICY "Drivers can insert their own location"
ON driver_locations FOR INSERT
WITH CHECK (
    driver_id IN (
        SELECT id FROM drivers WHERE user_id = auth.uid()
    )
);

-- Allow Managers to read locations
CREATE POLICY "Managers can read company driver locations"
ON driver_locations FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

-- Add lat/lng to the Activity Logs table as well for "Clock In/Out" events
ALTER TABLE driver_activity_logs 
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT;
