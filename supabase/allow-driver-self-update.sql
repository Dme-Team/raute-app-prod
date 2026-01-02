-- ALOW DRIVERS TO UPDATE THEIR OWN STATUS
-- This is critical for the "Go Online" button to work.

-- 1. Enable RLS on drivers table (just in case)
ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;

-- 2. Drop the policy if it already exists to avoid conflict errors
DROP POLICY IF EXISTS "Enable update for drivers own record" ON "public"."drivers";

-- 3. Create the policy that allows update ONLY if the user_id matches the authenticated user
CREATE POLICY "Enable update for drivers own record"
ON "public"."drivers"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Just to be safe, grant update permission on the specific column (optional but good practice)
GRANT UPDATE (is_online, location) ON "public"."drivers" TO authenticated;
