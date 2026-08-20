-- Create storage bucket for NGO posts (images and videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ngo-posts', 'ngo-posts', true);

-- Allow authenticated users to upload files to their NGO folder
CREATE POLICY "NGO owners can upload post files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ngo-posts' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.ngos 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);

-- Allow anyone to view post files (public bucket)
CREATE POLICY "Anyone can view post files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ngo-posts');

-- Allow NGO owners to delete their post files
CREATE POLICY "NGO owners can delete post files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ngo-posts' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.ngos 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND owner_id = auth.uid()
  )
);