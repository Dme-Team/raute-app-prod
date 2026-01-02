-- Add push_token column to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT; -- 'android', 'ios', 'web'

-- Enable RLS for updates on this column if not already covered
-- The existing policy for drivers updating themselves might cover this, 
-- but ensuring specific access is good practice.

-- Example policy update (if needed, otherwise rely on existing 'Drivers can update own profile'):
-- CREATE POLICY "Drivers can update their own push token" ...
