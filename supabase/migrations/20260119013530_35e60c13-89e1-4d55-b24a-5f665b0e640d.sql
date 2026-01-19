-- Drop the authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view approved NGOs" ON public.ngos;

-- Restore policy allowing anyone to view approved NGOs (public data)
CREATE POLICY "Anyone can view approved NGOs"
ON public.ngos FOR SELECT
USING (status = 'approved'::ngo_status);