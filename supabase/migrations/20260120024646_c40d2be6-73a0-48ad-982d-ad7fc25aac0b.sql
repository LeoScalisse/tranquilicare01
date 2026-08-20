-- Fix the view to use SECURITY INVOKER (which is the default, but explicitly set)
-- First drop and recreate the view
DROP VIEW IF EXISTS public.ngos_public;

-- Recreate view - views are SECURITY INVOKER by default in PostgreSQL
-- The warning was likely due to older PostgreSQL versions. Let's be explicit.
CREATE VIEW public.ngos_public 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  name, 
  description, 
  category, 
  goal, 
  image, 
  verified, 
  status, 
  created_at,
  updated_at,
  instagram
FROM public.ngos
WHERE status = 'approved'::ngo_status;

-- Re-grant permissions
GRANT SELECT ON public.ngos_public TO anon;
GRANT SELECT ON public.ngos_public TO authenticated;