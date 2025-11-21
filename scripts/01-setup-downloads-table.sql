-- Create downloads table for tracking eBook downloads
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a download record
CREATE POLICY "Anyone can insert downloads"
  ON public.downloads
  FOR INSERT
  WITH CHECK (true);

-- Users can only view their own downloads
CREATE POLICY "Users can view own downloads"
  ON public.downloads
  FOR SELECT
  USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admins can view all downloads
CREATE POLICY "Admins can view all downloads"
  ON public.downloads
  FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_timestamp ON public.downloads(timestamp);
