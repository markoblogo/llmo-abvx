-- Create analyzer_logs table for storing Analyzer Pro results
-- This table tracks all AI visibility analysis runs for users

CREATE TABLE IF NOT EXISTS public.analyzer_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.links(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  factors JSONB,
  visibility TEXT CHECK (visibility IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analyzer_logs_user_id ON public.analyzer_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analyzer_logs_link_id ON public.analyzer_logs(link_id);
CREATE INDEX IF NOT EXISTS idx_analyzer_logs_created_at ON public.analyzer_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzer_logs_user_created ON public.analyzer_logs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.analyzer_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own analyzer logs
CREATE POLICY "Users can view own analyzer logs"
  ON public.analyzer_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own analyzer logs
CREATE POLICY "Users can insert own analyzer logs"
  ON public.analyzer_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all analyzer logs
CREATE POLICY "Admins can view all analyzer logs"
  ON public.analyzer_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.analyzer_logs IS 'Stores results from Analyzer Pro AI visibility analysis';
COMMENT ON COLUMN public.analyzer_logs.user_id IS 'User who ran the analysis';
COMMENT ON COLUMN public.analyzer_logs.link_id IS 'Optional link ID if analysis was run for a specific link';
COMMENT ON COLUMN public.analyzer_logs.url IS 'URL that was analyzed';
COMMENT ON COLUMN public.analyzer_logs.score IS 'AI visibility score (0-100)';
COMMENT ON COLUMN public.analyzer_logs.recommendations IS 'Array of recommendation strings';
COMMENT ON COLUMN public.analyzer_logs.factors IS 'Breakdown of scoring factors';
COMMENT ON COLUMN public.analyzer_logs.visibility IS 'Visibility level: high, medium, or low';

