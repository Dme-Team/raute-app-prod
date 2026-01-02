-- Use this script to manually move Alex Rivera to a new location
-- so you can verify the map displays multiple drivers correctly.

UPDATE public.drivers
SET 
    current_lat = 34.0722, 
    current_lng = -118.2637, -- Slightly Northwest of downtown LA/Sarah
    status = 'active',
    is_online = true,
    location_updated_at = NOW()
WHERE email = 'alex@example.com';

-- Verify the update
SELECT name, current_lat, current_lng FROM public.drivers WHERE email = 'alex@example.com';
