-- Add RLS policies for ngo-posts storage bucket

-- Allow public to read files from ngo-posts bucket
CREATE POLICY "Public can read ngo-posts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ngo-posts');

-- Allow NGO owners to upload files to their NGO folder
CREATE POLICY "NGO owners can upload ngo-posts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ngo-posts'
  AND EXISTS (
    SELECT 1
    FROM public.ngos
    WHERE public.ngos.id = (storage.foldername(name))[1]::uuid
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);

-- Allow NGO owners to delete files from their NGO folder
CREATE POLICY "NGO owners can delete ngo-posts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ngo-posts'
  AND EXISTS (
    SELECT 1
    FROM public.ngos
    WHERE public.ngos.id = (storage.foldername(name))[1]::uuid
      AND public.ngos.owner_id = auth.uid()
      AND public.ngos.status = 'approved'::public.ngo_status
  )
);