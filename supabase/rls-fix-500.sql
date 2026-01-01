-- Fix 500 Error: Update Users RLS Policy
-- Run this in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- Create a simpler policy that allows users to view their own record
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Allow users to view other users in their company (using a more efficient query)
CREATE POLICY "Users can view company members"
  ON users FOR SELECT
  USING (
    company_id = (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );
