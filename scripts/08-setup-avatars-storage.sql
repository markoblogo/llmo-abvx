-- Note: This script should be run in Supabase SQL Editor
-- It sets up the avatars storage bucket and policies

-- Create the avatars bucket (if it doesn't exist)
-- Note: Bucket creation must be done via Supabase Dashboard or Storage API
-- This is a reference for the bucket configuration:
-- Bucket name: avatars
-- Public: true (so avatars can be accessed via public URLs)
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- Storage policies for avatars bucket
-- Policy: Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');




