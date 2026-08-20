-- Add owner_id to ngos table to link NGO to authenticated user
ALTER TABLE public.ngos ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- Enable realtime for ngos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ngos;

-- Create policy for NGO owners to view their own NGO
CREATE POLICY "NGO owners can view their own NGO"
ON public.ngos
FOR SELECT
USING (auth.uid() = owner_id);

-- Create policy for NGO owners to update their own approved NGO
CREATE POLICY "NGO owners can update their own approved NGO"
ON public.ngos
FOR UPDATE
USING (auth.uid() = owner_id AND status = 'approved'::ngo_status);