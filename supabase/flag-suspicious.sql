-- Flag for out-of-range deliveries
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS was_out_of_range BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivery_distance_meters FLOAT;
