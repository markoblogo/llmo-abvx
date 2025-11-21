-- Add admin_level column to profiles table
-- This script is idempotent and safe to run multiple times

-- Check if admin_level column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'admin_level'
  ) THEN
    -- Add admin_level column with default 'none'
    ALTER TABLE public.profiles ADD COLUMN admin_level TEXT NOT NULL DEFAULT 'none';
    
    -- Add constraint to ensure admin_level is one of: 'none', 'basic', 'super'
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_admin_level_check 
      CHECK (admin_level IN ('none', 'basic', 'super'));
    
    -- Set default value for existing rows
    UPDATE public.profiles SET admin_level = 'none' WHERE admin_level IS NULL;
    
    -- Migrate existing admin users: if role = 'admin', set admin_level = 'basic'
    -- (super-admin will be set separately below)
    UPDATE public.profiles 
    SET admin_level = 'basic' 
    WHERE role = 'admin' AND admin_level = 'none';
  END IF;
END $$;

-- Set super-admin level for a.biletskiy@gmail.com
-- This is idempotent - safe to run multiple times
UPDATE public.profiles 
SET admin_level = 'super' 
WHERE email = 'a.biletskiy@gmail.com';

-- Create index for faster admin_level lookups
CREATE INDEX IF NOT EXISTS idx_profiles_admin_level ON public.profiles(admin_level) WHERE admin_level != 'none';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.admin_level IS 'Admin access level: none (regular user), basic (basic admin), super (super admin with full access)';

-- Verify the update
SELECT email, role, admin_level, full_name 
FROM public.profiles 
WHERE email = 'a.biletskiy@gmail.com' OR admin_level != 'none';

