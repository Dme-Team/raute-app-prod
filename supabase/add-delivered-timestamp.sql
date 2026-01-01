-- Add delivered_at timestamp to orders table
-- This tracks when an order was actually delivered

ALTER TABLE orders
ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX idx_orders_delivered_at ON orders(delivered_at);

-- Comment for documentation
COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when the order was marked as delivered by the driver';
