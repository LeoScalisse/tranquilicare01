-- Fix RLS policies for ngo-posts bucket: explicitly reference storage.objects.name

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read ngo-posts objects" ON storage.objects;
DROP POLICY IF EXISTS "Approved NGO owners can upload ngo-posts objects" ON storage.objects;
DROP POLICY IF EXISTS "Approved NGO owners can delete ngo-posts objects" ON storage.objects;

-- Public read policy
CREATE POLICY "Public can read ngo-posts objects"
ON storage.objects
AS PERMISSIVE
FOR SELECT
USING (bucket_id = 'ngo-posts');

-- INSERT policy with explicit storage.objects.name reference
CREATE POLICY "Approved NGO owners can upload ngo-posts objects"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ngo-posts'
  AND EXISTS (
    SELECT 1
    FROM public.ngos
    WHERE public.ngos.id::text = split_part(storage.objects.name, '/', 1)
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);

-- DELETE policy with explicit storage.objects.name reference
CREATE POLICY "Approved NGO owners can delete ngo-posts objects"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ngo-posts'
  AND EXISTS (
    SELECT 1
    FROM public.ngos
    WHERE public.ngos.id::text = split_part(storage.objects.name, '/', 1)
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);