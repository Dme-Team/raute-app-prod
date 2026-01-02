-- ALter users role check to include 'dispatcher'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'driver', 'dispatcher'));

-- Alter drivers status check to include 'suspended'
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
ALTER TABLE drivers ADD CONSTRAINT drivers_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add status column to users (for freezing/holding accounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Add permissions column to users (for granular access control)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Create driver activity logs table
CREATE TABLE IF NOT EXISTS driver_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'working')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on logs
ALTER TABLE driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for logs
CREATE POLICY "Drivers can view/insert their own logs"
ON driver_activity_logs FOR ALL
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Managers can view all logs"
ON driver_activity_logs FOR SELECT
USING (
    driver_id IN (
        SELECT id FROM drivers WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'dispatcher')
        )
    )
);

-- Create Dispatcher Helper Function (similar to create_driver)
-- Uses the same flow: User + Profile
