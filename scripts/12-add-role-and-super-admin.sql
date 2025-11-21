-- Add role column to profiles table if it doesn't exist
-- This script is idempotent and safe to run multiple times

-- Check if role column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    
    -- Add constraint to ensure role is either 'user' or 'admin'
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('user', 'admin'));
    
    -- Set default value for existing rows
    UPDATE profiles SET role = 'user' WHERE role IS NULL;
  END IF;
END $$;

-- Set super-admin role for a.biletskiy@gmail.com
-- This is idempotent - safe to run multiple times
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'a.biletskiy@gmail.com';

-- Verify the update
SELECT email, role, full_name 
FROM profiles 
WHERE email = 'a.biletskiy@gmail.com';




