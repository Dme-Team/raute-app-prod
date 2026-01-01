-- ============================================
-- ULTIMATE FIX: Trigger Handles Everything
-- ============================================
-- The API Route now ONLY creates the Auth user with metadata.
-- This trigger reads the metadata and creates everything else.
-- NO MORE CONFLICTS!

-- Step 1: Clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Step 2: Smart trigger that handles both admin-created and self-signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_company_id UUID;
  driver_data JSONB;
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
BEGIN
  -- 🔍 Check if this is an admin-created user (has role in app_metadata)
  user_role := new.raw_app_meta_data->>'role';
  user_company_id := (new.raw_app_meta_data->>'company_id')::uuid;

  IF user_role = 'driver' AND user_company_id IS NOT NULL THEN
    -- ✅ SCENARIO 1: Admin created this driver
    driver_data := new.raw_app_meta_data->'driver_data';
    
    -- Create user profile
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', driver_data->>'name'),
      'driver',
      user_company_id
    );

    -- Create driver record
    INSERT INTO public.drivers (
      company_id, 
      user_id, 
      email, 
      name, 
      phone, 
      vehicle_type, 
      status, 
      is_online
    )
    VALUES (
      user_company_id,
      new.id,
      driver_data->>'email',
      driver_data->>'name',
      driver_data->>'phone',
      driver_data->>'vehicle_type',
      'active',
      false
    );

  ELSE
    -- 🔍 SCENARIO 2: Self-signup - check if email matches existing driver
    SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
    FROM public.drivers 
    WHERE email = new.email
    LIMIT 1;

    IF existing_driver_id IS NOT NULL THEN
      -- Driver found: link to existing profile
      INSERT INTO public.users (id, email, full_name, role, company_id)
      VALUES (new.id, new.email, driver_name, 'driver', driver_company);

      UPDATE public.drivers 
      SET user_id = new.id 
      WHERE id = existing_driver_id;

    ELSE
      -- New user: create as manager
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        'manager'
      );
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

-- ============================================
-- ✅ DONE! The system now works as:
-- 1. Admin creates driver → API sends metadata → Trigger creates everything
-- 2. Driver self-signup → Trigger links to existing profile (if any)
-- 3. New manager signup → Trigger creates manager profile
-- NO MORE DATABASE CONFLICTS!
-- ============================================
