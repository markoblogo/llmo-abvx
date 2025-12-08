-- Add llms.txt tracking fields to links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS llms_file_status TEXT;
ALTER TABLE links ADD COLUMN IF NOT EXISTS llms_last_update TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on llms status
CREATE INDEX IF NOT EXISTS idx_links_llms_last_update ON links(llms_last_update DESC);

-- Add comment to explain the fields
COMMENT ON COLUMN links.llms_file_status IS 'Status of llms.txt file: updated, needs-update, or NULL';
COMMENT ON COLUMN links.llms_last_update IS 'Timestamp of last llms.txt file update';





