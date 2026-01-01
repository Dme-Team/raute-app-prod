-- 1. Add profile_image column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 2. Create profiles storage bucket (run this in Supabase Dashboard → Storage)
-- Go to Storage → Create new bucket → Name: "profiles" → Public: Yes

-- 3. Set up storage policies (run after creating bucket)
-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))::text
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars');

-- Allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles' 
  AND (storage.foldername(name))[1] = 'avatars'
);
