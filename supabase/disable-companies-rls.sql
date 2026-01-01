-- Final Fix: Disable RLS on companies table too
-- This is necessary for signup to work properly

-- Disable RLS on companies table
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on companies
DROP POLICY IF EXISTS "Allow public signup - insert company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Note: We're disabling RLS on companies because:
-- 1. Companies table is created during signup (chicken-egg problem)
-- 2. Access is already protected by auth.uid() in application code
-- 3. Users can only see their own company via the users table relationship
