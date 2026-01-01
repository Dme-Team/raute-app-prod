-- CLEAN SLATE: Delete old driver data and create fresh
-- Safe script that removes all old driver@test.com data

DO $$
DECLARE
    v_company_id UUID;
    v_auth_user_id UUID;
    v_driver_id UUID;
BEGIN
    -- Get company ID
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    -- Get the Auth user ID for driver@test.com
    SELECT id INTO v_auth_user_id 
    FROM auth.users 
    WHERE email = 'driver@test.com';
    
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION '⚠️ Create driver@test.com in Supabase Auth Dashboard first!';
    END IF;
    
    RAISE NOTICE '🧹 Cleaning old data...';
    
    -- Step 1: Unassign all orders from old driver records
    UPDATE orders
    SET driver_id = NULL
    WHERE driver_id IN (
        SELECT id FROM drivers WHERE user_id IN (
            SELECT id FROM users WHERE email = 'driver@test.com'
        )
    );
    
    -- Step 2: Delete old driver records
    DELETE FROM drivers 
    WHERE user_id IN (
        SELECT id FROM users WHERE email = 'driver@test.com'
    );
    
    -- Step 3: Delete old user profile
    DELETE FROM users 
    WHERE email = 'driver@test.com';
    
    RAISE NOTICE '✅ Old data cleaned';
    RAISE NOTICE '📝 Creating fresh driver...';
    
    -- Step 4: Create fresh user profile
    INSERT INTO users (id, company_id, email, full_name, role)
    VALUES (
        v_auth_user_id,
        v_company_id,
        'driver@test.com',
        'Test Driver',
        'driver'
    );
    
    -- Step 5: Create fresh driver record
    INSERT INTO drivers (company_id, user_id, name, phone, vehicle_type, status)
    VALUES (
        v_company_id,
        v_auth_user_id,
        'Test Driver',
        '555-0001',
        'Van',
        'active'
    )
    RETURNING id INTO v_driver_id;
    
    -- Step 6: Assign 2 orders
    UPDATE orders
    SET driver_id = v_driver_id, status = 'assigned'
    WHERE id IN (
        SELECT id FROM orders 
        WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        LIMIT 2
    );
    
    RAISE NOTICE '🎉 SUCCESS!';
    RAISE NOTICE '-----------------------------------';
    RAISE NOTICE 'Email: driver@test.com';
    RAISE NOTICE 'Password: (the one you set in Auth)';
    RAISE NOTICE 'Role: DRIVER';
    RAISE NOTICE '-----------------------------------';
    RAISE NOTICE '👉 Now: Logout → Login → See Driver View!';
END $$;
