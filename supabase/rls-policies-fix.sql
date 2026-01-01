-- Fix RLS Policies to allow signup
-- Run this in Supabase SQL Editor after the main schema

-- DROP existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- COMPANIES TABLE POLICIES

-- Allow anyone to insert a company (for signup)
CREATE POLICY "Allow public signup - insert company"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own company
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- USERS TABLE POLICIES

-- Allow anyone to insert a user (for signup)
CREATE POLICY "Allow public signup - insert user"
  ON users FOR INSERT
  WITH CHECK (true);

-- Allow users to view users in their company
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
