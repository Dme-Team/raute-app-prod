-- Add columns to store the location where the delivery was marked
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivered_lat FLOAT,
ADD COLUMN IF NOT EXISTS delivered_lng FLOAT;

-- Optional: Add a calculated column or view for distance verification later,
-- but for now we'll do the check in the UI or an Edge Function.
