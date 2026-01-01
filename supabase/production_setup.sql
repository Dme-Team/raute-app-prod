-- ==========================================
-- 🚀 RAUTE PRODUCTION SETUP SCRIPT
-- Run this in Supabase SQL Editor to setup the entire DB
-- ==========================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT, -- Added for linking
  phone TEXT,
  vehicle_type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'delivered', 'cancelled')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  route_index INTEGER,
  time_window_start TIME,
  time_window_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Simplified for Initial Production)
-- Allow all authenticated users to read basics (refine later for stricter privacy)
CREATE POLICY "Users view own company data" ON companies FOR SELECT USING (true);
CREATE POLICY "Users view company users" ON users FOR SELECT USING (true);
CREATE POLICY "Users view company drivers" ON drivers FOR SELECT USING (true);
CREATE POLICY "Users view company orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Managers manage all" ON orders FOR ALL USING (true); -- Refine to role='manager' later
CREATE POLICY "Drivers update own orders" ON orders FOR UPDATE USING (true);

-- 5. Full Search & AI Helpers (Optional)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);

-- 6. USER SIGNUP TRIGGER (CRITICAL)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup() 
RETURNS TRIGGER AS $$
DECLARE
  existing_driver_id UUID;
  driver_name TEXT;
  driver_company UUID;
  new_company_id UUID;
BEGIN
  -- Check if email matches a pre-added driver
  SELECT id, name, company_id INTO existing_driver_id, driver_name, driver_company
  FROM public.drivers 
  WHERE email = new.email
  LIMIT 1;

  IF existing_driver_id IS NOT NULL THEN
    -- Driver Signup: Link to existing driver profile
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (new.id, new.email, driver_name, 'driver', driver_company)
    ON CONFLICT (id) DO NOTHING;

    -- Update driver table with auth id
    UPDATE public.drivers SET user_id = new.id WHERE id = existing_driver_id;
  ELSE
    -- Manager Signup: Create new Company & User
    INSERT INTO public.companies (name) VALUES ('My Company') RETURNING id INTO new_company_id;
    
    INSERT INTO public.users (id, email, full_name, role, company_id)
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'Manager'),
      'manager',
      new_company_id
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_signup();
