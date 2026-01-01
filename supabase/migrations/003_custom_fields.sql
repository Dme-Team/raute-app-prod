-- Custom Fields Feature Migration
-- Allows companies to define custom order fields with granular driver visibility

-- Create custom_fields table
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'textarea')),
    field_label TEXT NOT NULL, -- Display name (e.g., "Insurance Type")
    placeholder TEXT, -- Optional placeholder text
    options JSONB, -- For 'select' type: ["Option 1", "Option 2"]
    is_required BOOLEAN DEFAULT false,
    driver_visible BOOLEAN DEFAULT false, -- Show to drivers by default?
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add custom fields columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}', -- {field_id: value}
ADD COLUMN IF NOT EXISTS driver_visible_overrides TEXT[] DEFAULT '{}'; -- Array of field_id's to show to driver

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_fields_company ON custom_fields(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_custom_fields ON orders USING GIN (custom_fields);

-- Add RLS policies for custom_fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- Managers can do everything with their company's custom fields
CREATE POLICY "Managers can manage custom fields"
ON custom_fields
FOR ALL
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'manager'
    )
);

-- Drivers can only view fields (read-only)
CREATE POLICY "Drivers can view custom fields"
ON custom_fields
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_fields_updated_at
BEFORE UPDATE ON custom_fields
FOR EACH ROW
EXECUTE FUNCTION update_custom_fields_updated_at();

-- Add comment
COMMENT ON TABLE custom_fields IS 'Dynamic custom fields that companies can define for their orders';
COMMENT ON COLUMN custom_fields.driver_visible IS 'Whether this field should be visible to drivers by default';
COMMENT ON COLUMN orders.driver_visible_overrides IS 'Array of custom field IDs that should be shown to the driver for this specific order (overrides default visibility)';
