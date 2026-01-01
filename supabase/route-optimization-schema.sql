-- Add fields to 'drivers' table for Route Optimization
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS default_start_address text,
ADD COLUMN IF NOT EXISTS default_start_lat double precision,
ADD COLUMN IF NOT EXISTS default_start_lng double precision,
ADD COLUMN IF NOT EXISTS current_lat double precision,
ADD COLUMN IF NOT EXISTS current_lng double precision,
ADD COLUMN IF NOT EXISTS last_location_update timestamptz;

-- Add 'route_index' to 'orders' to store the optimized sequence (e.g., Stop #1, Stop #2)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS route_index integer;

-- Add index for faster queries on assigned routes
CREATE INDEX IF NOT EXISTS idx_orders_driver_route ON orders(driver_id, route_index);

-- Comment: This allows us to know where a driver starts their day (for optimization)
-- and their live location (for "Best Fit" ad-hoc assignments).
