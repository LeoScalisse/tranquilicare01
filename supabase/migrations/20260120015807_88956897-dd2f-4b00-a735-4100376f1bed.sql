-- Add policy to allow service role to insert Stripe accounts
CREATE POLICY "Service role can insert Stripe accounts"
ON public.ngo_stripe_accounts
FOR INSERT
WITH CHECK (true);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Admins can manage Stripe accounts" ON public.ngo_stripe_accounts;

CREATE POLICY "Admins can manage Stripe accounts"
ON public.ngo_stripe_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));