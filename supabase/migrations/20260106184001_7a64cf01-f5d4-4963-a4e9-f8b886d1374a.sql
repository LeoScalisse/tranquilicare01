-- Create policy for NGO owners to add posts to their own approved NGO
CREATE POLICY "NGO owners can add posts to their approved NGO"
ON public.ngo_posts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ngos 
    WHERE ngos.id = ngo_posts.ngo_id 
      AND ngos.owner_id = auth.uid() 
      AND ngos.status = 'approved'::ngo_status
  )
);

-- Create policy for NGO owners to delete their own posts
CREATE POLICY "NGO owners can delete their own posts"
ON public.ngo_posts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ngos 
    WHERE ngos.id = ngo_posts.ngo_id 
      AND ngos.owner_id = auth.uid()
  )
);