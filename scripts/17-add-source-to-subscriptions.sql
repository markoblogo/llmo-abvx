-- Add source column to subscriptions table
-- This script is idempotent and safe to run multiple times

-- Check if source column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'source'
  ) THEN
    -- Add source column with default 'regular'
    ALTER TABLE public.subscriptions ADD COLUMN source TEXT NOT NULL DEFAULT 'regular';
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.subscriptions.source IS 'Source of subscription: regular (paid), gift (admin-gifted), trial (free trial)';
  END IF;
END $$;

-- Verify the update
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions' 
AND column_name = 'source';


