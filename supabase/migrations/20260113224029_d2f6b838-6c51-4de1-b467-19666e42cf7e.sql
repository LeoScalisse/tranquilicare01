-- Consolidate storage RLS policies for ngo-posts bucket (remove legacy policies)

-- Drop legacy/duplicate policies if present
DROP POLICY IF EXISTS "NGO owners can upload post files" ON storage.objects;
DROP POLICY IF EXISTS "NGO owners can delete post files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read ngo-posts" ON storage.objects;
DROP POLICY IF EXISTS "NGO owners can upload ngo-posts" ON storage.objects;
DROP POLICY IF EXISTS "NGO owners can delete ngo-posts" ON storage.objects;

-- Public read (bucket is public, but policy still required when RLS is enabled)
CREATE POLICY "Public can read ngo-posts objects"
ON storage.objects
AS PERMISSIVE
FOR SELECT
USING (bucket_id = 'ngo-posts');

-- Authenticated NGO owner of an approved NGO can upload into their own folder: {ngo_id}/...
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
    WHERE public.ngos.id::text = (storage.foldername(name))[1]
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);

-- Authenticated NGO owner of an approved NGO can delete from their own folder: {ngo_id}/...
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
    WHERE public.ngos.id::text = (storage.foldername(name))[1]
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);
