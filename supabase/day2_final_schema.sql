-- ==========================================
-- DAY 2 CONSOLIDATED SCHEMA CHANGES
-- ==========================================

-- 1. Ensure 'drivers' table has email column (Fixed api error)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);

-- 2. Ensure 'users' table has profile_image column (Fixed profile page)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 3. Disable conflicting triggers (We moved to API-based creation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- 4. Storage Policies for Profile Images (Bucket 'profiles' must exist)
-- (Make sure you created the 'profiles' bucket in Dashboard as Public)

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))::text
);

-- Policy: Public read access
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars');

-- Policy: Users can update/delete their own
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))::text
);

-- ==========================================
-- MANUAL DATA FIXES (For existing 'testo' user)
-- ==========================================
-- UPDATE users SET full_name = 'Testo Driver' WHERE email = 'testo@gmail.com';
