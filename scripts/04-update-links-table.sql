-- Add missing columns to links table for admin management
ALTER TABLE links ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE links ADD COLUMN IF NOT EXISTS backlink_verified BOOLEAN DEFAULT false;

-- Update status check constraint to include new values
ALTER TABLE links DROP CONSTRAINT IF EXISTS links_status_check;
ALTER TABLE links ADD CONSTRAINT links_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired'));

-- Add RLS policies for admin access
CREATE POLICY "Admins can view all links"
  ON links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all links"
  ON links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all links"
  ON links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for click_count
CREATE INDEX IF NOT EXISTS links_click_count_idx ON links(click_count DESC);
