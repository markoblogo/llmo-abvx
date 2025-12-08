-- Add new fields to links table
ALTER TABLE links
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS links_type_idx ON links(type);
CREATE INDEX IF NOT EXISTS links_platform_idx ON links(platform);
CREATE INDEX IF NOT EXISTS links_topics_idx ON links USING GIN(topics);
CREATE INDEX IF NOT EXISTS links_keywords_idx ON links USING GIN(keywords);

-- Add comments for documentation
COMMENT ON COLUMN links.type IS 'Type of website: Blog, Portfolio, SaaS, Agency, Shop, AI Tool, Company, Media';
COMMENT ON COLUMN links.platform IS 'Platform: Stand-alone, Medium, Substack, Notion, WordPress, Custom';
COMMENT ON COLUMN links.topics IS 'Array of topics: AI & Tech, Design, Business, Lifestyle, Education, Science';
COMMENT ON COLUMN links.keywords IS 'Array of keywords (max 5)';
COMMENT ON COLUMN links.short_description IS 'Short description (max 280 characters)';





