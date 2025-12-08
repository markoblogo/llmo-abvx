-- Set super admin role and admin_level for a.biletskiy@gmail.com
-- This script ensures the super admin user has both role = 'admin' and admin_level = 'super'
-- This is important for backward compatibility with code that checks only role field

-- 1. Show current profile state
SELECT 
  id, 
  email, 
  role, 
  admin_level,
  full_name,
  created_at
FROM public.profiles
WHERE email = 'a.biletskiy@gmail.com';

-- 2. Update role and admin_level to ensure super admin status
UPDATE public.profiles
SET 
  role = 'admin',
  admin_level = 'super'
WHERE email = 'a.biletskiy@gmail.com';

-- 3. Verify the update
SELECT 
  id, 
  email, 
  role, 
  admin_level,
  full_name,
  created_at
FROM public.profiles
WHERE email = 'a.biletskiy@gmail.com';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.role IS 'User role: user or admin. For backward compatibility.';
COMMENT ON COLUMN public.profiles.admin_level IS 'Admin access level: none (regular user), basic (basic admin), super (super admin with full access).';


