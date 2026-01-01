-- 1. Add 'is_online' column to drivers table (Default false)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Create a Function to Auto-Link Drivers on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
BEGIN
  -- Check if this email matches a pre-added driver
  SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
  FROM public.drivers 
  WHERE email = new.email
  LIMIT 1;

  IF existing_driver_id IS NOT NULL THEN
    -- A. If it's a Driver found in the database:
    -- 1. Create entry in public.users with 'driver' role
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (new.id, new.email, driver_name, 'driver', driver_company);

    -- 2. Link the auth user to the driver row
    UPDATE public.drivers 
    SET user_id = new.id 
    WHERE id = existing_driver_id;

  ELSE
    -- B. Normal User (Manager signing up fresh)
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'manager');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the Trigger (Drop old one first if exists to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();
