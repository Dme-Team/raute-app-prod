-- ============================================
-- FIX: Prevent Trigger Conflict with Admin API
-- ============================================
-- This fixes the "Database error creating new user" issue
-- by making the trigger smart enough to detect when a user
-- is created via Admin API vs Self Sign-up

-- Step 1: Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Step 2: Create improved function with conflict detection
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
  user_already_exists BOOLEAN;
BEGIN
  -- 🔍 DETECTION: Check if user profile already exists
  -- (This means it was created by Admin API Route)
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = new.id
  ) INTO user_already_exists;

  -- 🚫 SKIP: If profile exists, the API Route already handled everything
  IF user_already_exists THEN
    RETURN new;
  END IF;

  -- ✅ HANDLE: This is a self-signup or organic registration
  
  -- Check if this email matches a pre-added driver (invited by manager)
  SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
  FROM public.drivers 
  WHERE email = new.email
  LIMIT 1;

  IF existing_driver_id IS NOT NULL THEN
    -- 🔗 SCENARIO A: Driver Self Sign-up (Manager invited them earlier)
    -- Create user profile with driver role
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (new.id, new.email, driver_name, 'driver', driver_company);

    -- Link the auth user to the driver record
    UPDATE public.drivers 
    SET user_id = new.id 
    WHERE id = existing_driver_id;

  ELSE
    -- 🆕 SCENARIO B: New Manager/User Sign-up
    -- Create user profile with manager role (default)
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      'manager'
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

-- ============================================
-- ✅ Done! Now both flows work without conflict:
-- 1. Manager creates Driver → API Route handles everything
-- 2. Driver signs up → Trigger links them to existing profile
-- ============================================
