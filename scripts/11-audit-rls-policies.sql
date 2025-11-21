-- Audit and fix RLS policies for security
-- Ensure users can only access their own rows, admins can access everything

-- ============================================
-- LINKS TABLE
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all links" ON links;
DROP POLICY IF EXISTS "Admins can update all links" ON links;
DROP POLICY IF EXISTS "Admins can delete all links" ON links;

-- Policy: Admins can view all links
CREATE POLICY "Admins can view all links"
  ON links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all links
CREATE POLICY "Admins can update all links"
  ON links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete all links
CREATE POLICY "Admins can delete all links"
  ON links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can delete all subscriptions" ON public.subscriptions;

-- Policy: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert subscriptions (for manual creation if needed)
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
  ON public.subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ANALYSES TABLE
-- ============================================

-- Analyses table already has admin policies, but let's ensure they're correct
-- Policy already exists: "Admins can view all analyses"
-- No need to add update/delete policies for analyses (users shouldn't modify analyses)

-- ============================================
-- DOWNLOADS TABLE
-- ============================================

-- Add admin policies for downloads table (if needed for admin access)
DROP POLICY IF EXISTS "Admins can view all downloads" ON public.downloads;

CREATE POLICY "Admins can view all downloads"
  ON public.downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Query to verify all policies are in place
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('links', 'subscriptions', 'analyses', 'profiles', 'downloads')
-- ORDER BY tablename, policyname;

