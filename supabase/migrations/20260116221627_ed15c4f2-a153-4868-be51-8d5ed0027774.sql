-- Drop the public policy that exposes contact information
DROP POLICY IF EXISTS "Anyone can view approved NGOs" ON public.ngos;

-- Create new policy requiring authentication to view approved NGOs
CREATE POLICY "Authenticated users can view approved NGOs"
ON public.ngos FOR SELECT
TO authenticated
USING (status = 'approved'::ngo_status);