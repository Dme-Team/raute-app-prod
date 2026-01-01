-- 1. Ensure Hubs Table Exists (Fixing the fetching error)
CREATE TABLE IF NOT EXISTS public.hubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

-- Re-apply policies to ensure access
DROP POLICY IF EXISTS "Users can view hubs for their company" ON public.hubs;
CREATE POLICY "Users can view hubs for their company"
    ON public.hubs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.users
            WHERE users.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Managers can insert hubs for their company" ON public.hubs;
CREATE POLICY "Managers can insert hubs for their company"
    ON public.hubs FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Managers can update hubs for their company" ON public.hubs;
CREATE POLICY "Managers can update hubs for their company"
    ON public.hubs FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Managers can delete hubs for their company" ON public.hubs;
CREATE POLICY "Managers can delete hubs for their company"
    ON public.hubs FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('manager', 'admin')
        )
    );

-- 2. Seed Sample Data
DO $$
DECLARE
    v_company_id UUID;
    v_hub_id UUID;
    v_driver_id_1 UUID;
    v_driver_id_2 UUID;
BEGIN
    -- Get the first company found (You must be signed up first!)
    SELECT id INTO v_company_id FROM companies LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE NOTICE 'No company found. Please sign up in the app first, then run this script.';
        RETURN;
    END IF;

    -- A) Create a Main Hub (Warehouse) if none exists
    IF NOT EXISTS (SELECT 1 FROM hubs WHERE company_id = v_company_id) THEN
        INSERT INTO hubs (company_id, name, address, latitude, longitude)
        VALUES (v_company_id, 'Central Warehouse', 'Market St, San Francisco, CA', 37.7749, -122.4194)
        RETURNING id INTO v_hub_id;
    ELSE
        SELECT id INTO v_hub_id FROM hubs WHERE company_id = v_company_id LIMIT 1;
    END IF;

    -- B) Create Sample Drivers
    IF NOT EXISTS (SELECT 1 FROM drivers WHERE company_id = v_company_id AND name = 'John Fast') THEN
        INSERT INTO drivers (company_id, name, phone, vehicle_type, status)
        VALUES (v_company_id, 'John Fast', '+15550199', 'Van', 'active')
        RETURNING id INTO v_driver_id_1;
    ELSE
        SELECT id INTO v_driver_id_1 FROM drivers WHERE company_id = v_company_id AND name = 'John Fast' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM drivers WHERE company_id = v_company_id AND name = 'Sarah Route') THEN
        INSERT INTO drivers (company_id, name, phone, vehicle_type, status)
        VALUES (v_company_id, 'Sarah Route', '+15550188', 'Box Truck', 'active')
        RETURNING id INTO v_driver_id_2;
    ELSE
         SELECT id INTO v_driver_id_2 FROM drivers WHERE company_id = v_company_id AND name = 'Sarah Route' LIMIT 1;
    END IF;

    -- C) Create Sample Orders (Mix of Pending, Assigned, Delivered)
    
    -- 1. Pending Orders (Unassigned)
    INSERT INTO orders (company_id, order_number, customer_name, address, city, state, zip_code, phone, status, delivery_date, notes, latitude, longitude)
    VALUES
    (v_company_id, 'ORD-101', 'Alice Bakery', '123 Valencia St', 'San Francisco', 'CA', '94103', '555-0101', 'pending', CURRENT_DATE, 'Deliver to back door', 37.7651, -122.4218),
    (v_company_id, 'ORD-102', 'Tech Corp HQ', '456 Montgomery St', 'San Francisco', 'CA', '94104', '555-0102', 'pending', CURRENT_DATE, 'Front desk', 37.7935, -122.4036),
    (v_company_id, 'ORD-103', 'Sunset Café', '789 Irving St', 'San Francisco', 'CA', '94122', '555-0103', 'pending', CURRENT_DATE + 1, 'Morning delivery only', 37.7635, -122.4667);

    -- 2. Assigned Orders (To Driver 1)
    INSERT INTO orders (company_id, order_number, customer_name, address, city, state, zip_code, phone, status, delivery_date, driver_id, notes, latitude, longitude)
    VALUES
    (v_company_id, 'ORD-201', 'City Hall', '1 Dr Carlton B Goodlett Pl', 'San Francisco', 'CA', '94102', '555-0201', 'assigned', CURRENT_DATE, v_driver_id_1, 'Security check required', 37.7793, -122.4192),
    (v_company_id, 'ORD-202', 'Union Square Store', '333 Post St', 'San Francisco', 'CA', '94108', '555-0202', 'in_progress', CURRENT_DATE, v_driver_id_1, 'Call on arrival', 37.7879, -122.4075);

    -- 3. Delivered Orders (To Driver 2)
    INSERT INTO orders (company_id, order_number, customer_name, address, city, state, zip_code, phone, status, delivery_date, driver_id, notes, latitude, longitude)
    VALUES
    (v_company_id, 'ORD-301', 'Ferry Building', '1 Ferry Building', 'San Francisco', 'CA', '94111', '555-0301', 'delivered', CURRENT_DATE, v_driver_id_2, 'Left at reception', 37.7955, -122.3937);

    RAISE NOTICE 'Sample data planted successfully for company ID %', v_company_id;
END $$;
