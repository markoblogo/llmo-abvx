-- Add hierarchical category columns to links table
ALTER TABLE links
ADD COLUMN IF NOT EXISTS category_level1 TEXT,
ADD COLUMN IF NOT EXISTS category_level2 TEXT,
ADD COLUMN IF NOT EXISTS category_level3 TEXT;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS links_category_level1_idx ON links(category_level1);
CREATE INDEX IF NOT EXISTS links_category_level2_idx ON links(category_level2);
CREATE INDEX IF NOT EXISTS links_category_level3_idx ON links(category_level3);

-- Add comments for documentation
COMMENT ON COLUMN links.category_level1 IS 'Level 1 category: Blog, Website, Product, Service, Store, Portfolio, Agency, Publication, App, Personal, Social Media';
COMMENT ON COLUMN links.category_level2 IS 'Level 2 category: Platform-specific (Medium, Substack, WordPress, X/Twitter, etc.)';
COMMENT ON COLUMN links.category_level3 IS 'Level 3 category: Topic/Theme (AI, Marketing, Design, Tech, Lifestyle, Business, Education, Science)';

-- Backward compatibility: Migrate existing category to category_level1 if null
UPDATE links
SET category_level1 = COALESCE(category_level1, category, 'Other')
WHERE category_level1 IS NULL;




