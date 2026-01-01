-- Add entity_type to distinction between Order fields and Driver fields
ALTER TABLE custom_fields 
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'order';

-- Ensure existing fields are marked as 'order'
UPDATE custom_fields SET entity_type = 'order' WHERE entity_type IS NULL;

-- Add custom_values column to drivers table to store dynamic data
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '{}'::jsonb;

-- (Optional) Index for faster resizing if needed later
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
