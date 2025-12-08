-- Monetization and Feature System Schema Updates
-- This script extends existing tables with monetization features

-- ============================================
-- 1. Extend links table with monetization fields
-- ============================================

ALTER TABLE public.links
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category_type TEXT,
ADD COLUMN IF NOT EXISTS category_subtype TEXT,
ADD COLUMN IF NOT EXISTS category_topic TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS short_description TEXT CHECK (char_length(short_description) <= 280);

-- Create indexes for featured listings and categorization
CREATE INDEX IF NOT EXISTS idx_links_is_featured ON public.links(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_links_featured_until ON public.links(featured_until) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_links_category_type ON public.links(category_type);
CREATE INDEX IF NOT EXISTS idx_links_category_topic ON public.links(category_topic);
CREATE INDEX IF NOT EXISTS idx_links_keywords ON public.links USING GIN(keywords);

-- Add comments for documentation
COMMENT ON COLUMN public.links.is_featured IS 'Whether this link is featured (boosted) in directory';
COMMENT ON COLUMN public.links.featured_until IS 'When the featured status expires';
COMMENT ON COLUMN public.links.category_type IS 'Main category type (Blog, Portfolio, SaaS, Agency, etc.)';
COMMENT ON COLUMN public.links.category_subtype IS 'Subcategory (Platform-specific)';
COMMENT ON COLUMN public.links.category_topic IS 'Topic/Theme (AI, Marketing, Design, etc.)';
COMMENT ON COLUMN public.links.keywords IS 'Array of SEO keywords (max 5)';
COMMENT ON COLUMN public.links.short_description IS 'Short description for listings (max 280 chars)';

-- ============================================
-- 2. Extend subscriptions table with Pro/Agency features
-- ============================================

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'pro', 'agency'));

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS agency_id UUID,
ADD COLUMN IF NOT EXISTS auto_llms BOOLEAN DEFAULT false;

-- Create index for agency subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_agency_id ON public.subscriptions(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_llms ON public.subscriptions(auto_llms) WHERE auto_llms = true;

-- Add comments
COMMENT ON COLUMN public.subscriptions.features IS 'JSON object with enabled features (analyzer_pro, metadata_suggestions, etc.)';
COMMENT ON COLUMN public.subscriptions.agency_id IS 'ID of the agency owner if this is an agency subscription';
COMMENT ON COLUMN public.subscriptions.auto_llms IS 'Whether llms.txt is automatically regenerated every 90 days';

-- ============================================
-- 3. Create agency_members table
-- ============================================

CREATE TABLE IF NOT EXISTS public.agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agency_owner_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agency_members_owner ON public.agency_members(agency_owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user ON public.agency_members(user_id);

-- Enable Row Level Security
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own agency memberships
CREATE POLICY "Users can view own agency memberships"
  ON public.agency_members
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = agency_owner_id);

-- Policy: Agency owners can manage members
CREATE POLICY "Agency owners can manage members"
  ON public.agency_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid()
      AND plan = 'agency'
      AND agency_id IS NULL
    )
    AND agency_owner_id = auth.uid()
  );

-- Trigger to update updated_at
CREATE TRIGGER update_agency_members_updated_at
  BEFORE UPDATE ON public.agency_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Create metadata_suggestions table (optional, for tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.metadata_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_user ON public.metadata_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_payment ON public.metadata_suggestions(payment_status);

ALTER TABLE public.metadata_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metadata suggestions"
  ON public.metadata_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metadata suggestions"
  ON public.metadata_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metadata suggestions"
  ON public.metadata_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. Update existing category columns if they exist
-- ============================================

-- Backward compatibility: migrate existing category fields
UPDATE public.links
SET category_type = COALESCE(category_type, category_level1, category, 'Other'),
    category_subtype = COALESCE(category_subtype, category_level2),
    category_topic = COALESCE(category_topic, category_level3)
WHERE category_type IS NULL;





