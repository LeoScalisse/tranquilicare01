-- Add column to track if owner has seen verification result
ALTER TABLE public.ngos ADD COLUMN has_seen_result boolean DEFAULT false;

-- Allow NGO owners to update has_seen_result on their own NGO
CREATE POLICY "NGO owners can mark result as seen"
ON public.ngos
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);