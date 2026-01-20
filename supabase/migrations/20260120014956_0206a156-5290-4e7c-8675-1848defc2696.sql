-- Create table to store NGO Stripe Connect account information
CREATE TABLE public.ngo_stripe_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngo_id UUID NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ngo_id)
);

-- Enable RLS
ALTER TABLE public.ngo_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- NGO owners can view their own Stripe account
CREATE POLICY "NGO owners can view their own Stripe account"
ON public.ngo_stripe_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ngos
    WHERE ngos.id = ngo_stripe_accounts.ngo_id
    AND ngos.owner_id = auth.uid()
  )
);

-- NGO owners can update their own Stripe account
CREATE POLICY "NGO owners can update their own Stripe account"
ON public.ngo_stripe_accounts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ngos
    WHERE ngos.id = ngo_stripe_accounts.ngo_id
    AND ngos.owner_id = auth.uid()
  )
);

-- Admins can manage all Stripe accounts
CREATE POLICY "Admins can manage Stripe accounts"
ON public.ngo_stripe_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view onboarding status for approved NGOs (needed for donation flow)
CREATE POLICY "Anyone can view onboarding status for approved NGOs"
ON public.ngo_stripe_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ngos
    WHERE ngos.id = ngo_stripe_accounts.ngo_id
    AND ngos.status = 'approved'::ngo_status
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_ngo_stripe_accounts_updated_at
BEFORE UPDATE ON public.ngo_stripe_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();