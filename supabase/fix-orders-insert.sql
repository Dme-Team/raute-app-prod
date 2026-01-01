-- Fix: Allow managers to insert orders
-- Run this in Supabase SQL Editor

-- Drop existing restrictive insert policy if any
DROP POLICY IF EXISTS "Admins and managers can insert orders" ON orders;

-- Create policy to allow insert
CREATE POLICY "Managers can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
