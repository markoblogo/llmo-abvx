-- Add avatar_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image stored in Supabase Storage';




