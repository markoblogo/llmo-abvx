-- Add payment_status column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'active' 
CHECK (payment_status IN ('active', 'past_due', 'canceled', 'incomplete'));

-- Add RLS policies for admin access
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for payment_status
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status ON public.subscriptions(payment_status);
