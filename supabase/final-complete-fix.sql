-- FINAL FIX: Complete cleanup and RLS disable
-- Run this ONCE to fix everything

-- Step 1: Clean all data
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE drivers CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Step 2: Completely disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL policies (to be extra sure)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Step 4: Verify
SELECT 
    tablename, 
    'RLS ' || CASE WHEN rowsecurity THEN 'ENABLED ❌' ELSE 'DISABLED ✅' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'users', 'drivers', 'orders');
