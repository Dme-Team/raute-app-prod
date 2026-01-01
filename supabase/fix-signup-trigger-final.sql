-- ============================================
-- FINAL FIX: Smart Trigger with Admin Detection
-- ============================================
-- This version uses app_metadata to detect admin-created users
-- and skips auto-creation to avoid conflicts

-- Step 1: Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Step 2: Create smart function with app_metadata detection
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
  is_admin_created BOOLEAN;
BEGIN
  -- 🔍 DETECTION: Check if this was created by Admin API
  is_admin_created := (new.raw_app_meta_data->>'created_by_admin')::boolean;

  -- 🚫 SKIP: If created by admin, the API Route will handle everything
  IF is_admin_created = true THEN
    RETURN new;
  END IF;

  -- ✅ HANDLE: This is a self-signup (organic registration)
  
  -- Check if this email matches a pre-added driver
  SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
  FROM public.drivers 
  WHERE email = new.email
  LIMIT 1;

  IF existing_driver_id IS NOT NULL THEN
    -- 🔗 SCENARIO A: Driver Self Sign-up (Manager invited them earlier)
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (new.id, new.email, driver_name, 'driver', driver_company)
    ON CONFLICT (id) DO NOTHING;

    -- Link the driver record
    UPDATE public.drivers 
    SET user_id = new.id 
    WHERE id = existing_driver_id;

  ELSE
    -- 🆕 SCENARIO B: New Manager/User Sign-up
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      'manager'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();

-- ============================================
-- ✅ Done! The trigger now:
-- 1. Skips admin-created users (detects via app_metadata)
-- 2. Handles self-signup drivers (links to existing profile)
-- 3. Creates manager profiles for new signups
-- ============================================
