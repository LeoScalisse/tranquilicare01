-- Create donations table to track completed donations
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in centavos going to NGO
  platform_tip INTEGER DEFAULT 0, -- Platform tip in centavos
  donor_email TEXT, -- Optional, if provided by Stripe
  donor_name TEXT, -- Optional, if provided by Stripe
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_donations_ngo_id ON public.donations(ngo_id);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donations table
-- NGO owners can view their own donations
CREATE POLICY "NGO owners can view their donations"
ON public.donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ngos
    WHERE ngos.id = donations.ngo_id
    AND ngos.owner_id = auth.uid()
  )
);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert donations (for webhook)
CREATE POLICY "Service role can insert donations"
ON public.donations
FOR INSERT
WITH CHECK (true);

-- Add trigger for realtime updates (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;