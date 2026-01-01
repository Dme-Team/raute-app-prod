-- Script to test Role System (Manager vs Driver)
-- Run this in Supabase SQL Editor

-- Step 1: Create a test driver user in the users table
-- This creates a user account linked to your existing company
DO $$
DECLARE
    v_company_id UUID;
    v_driver_user_id UUID;
    v_driver_id UUID;
BEGIN
    -- Get your company ID (assumes you have at least one company)
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    -- Create a driver user (this will be the login account)
    INSERT INTO users (id, company_id, email, full_name, role)
    VALUES (
        gen_random_uuid(),
        v_company_id,
        'driver@test.com',
        'Test Driver',
        'driver'
    )
    RETURNING id INTO v_driver_user_id;
    
    -- Create a driver record linked to this user
    INSERT INTO drivers (id, company_id, user_id, name, phone, vehicle_type, status)
    VALUES (
        gen_random_uuid(),
        v_company_id,
        v_driver_user_id,
        'Test Driver',
        '555-0001',
        'Van',
        'active'
    )
    RETURNING id INTO v_driver_id;
    
    -- Assign some of your existing orders to this driver
    -- This assigns the first 2 orders with coordinates to the driver
    UPDATE orders
    SET driver_id = v_driver_id, status = 'assigned'
    WHERE id IN (
        SELECT id FROM orders 
        WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        LIMIT 2
    );
    
    RAISE NOTICE 'Driver created successfully!';
    RAISE NOTICE 'Driver User ID: %', v_driver_user_id;
    RAISE NOTICE 'Driver ID: %', v_driver_id;
    RAISE NOTICE 'Email: driver@test.com';
    RAISE NOTICE 'You need to set a password in Supabase Auth Dashboard';
END $$;
