-- Update downloads table to add email and download count tracking
ALTER TABLE public.downloads
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_downloads_email ON public.downloads(email);
CREATE INDEX IF NOT EXISTS idx_downloads_last_reminder ON public.downloads(last_reminder_sent);

-- Update existing downloads to have download_count = 1
UPDATE public.downloads
SET download_count = 1
WHERE download_count IS NULL;




