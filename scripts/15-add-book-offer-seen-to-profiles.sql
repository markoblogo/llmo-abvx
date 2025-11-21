-- Add book_offer_seen field to profiles table
-- This field tracks whether the user has seen the book download offer popup

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS book_offer_seen BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster lookups (optional, but helpful if we query by this field)
CREATE INDEX IF NOT EXISTS idx_profiles_book_offer_seen ON public.profiles(book_offer_seen);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.book_offer_seen IS 'Indicates whether the user has seen the book download offer popup. Set to true after first viewing or dismissing the popup.';

