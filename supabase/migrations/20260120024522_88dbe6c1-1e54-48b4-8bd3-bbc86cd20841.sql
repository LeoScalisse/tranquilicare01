-- Create a public view for NGOs that excludes sensitive fields
CREATE OR REPLACE VIEW public.ngos_public AS
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
  instagram -- Keep instagram as it's typically meant to be public
FROM public.ngos
WHERE status = 'approved'::ngo_status;

-- Grant public SELECT on the view
GRANT SELECT ON public.ngos_public TO anon;
GRANT SELECT ON public.ngos_public TO authenticated;

-- Add database constraints for input validation
-- Note: Using triggers instead of CHECK constraints for flexibility

-- Create a validation trigger function
CREATE OR REPLACE FUNCTION public.validate_ngo_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Nome muito longo (máximo 100 caracteres)';
  END IF;
  
  -- Validate description length
  IF length(NEW.description) > 2000 THEN
    RAISE EXCEPTION 'Descrição muito longa (máximo 2000 caracteres)';
  END IF;
  
  -- Validate goal length
  IF length(NEW.goal) > 500 THEN
    RAISE EXCEPTION 'Objetivo muito longo (máximo 500 caracteres)';
  END IF;
  
  -- Validate rejection_reason length if set
  IF NEW.rejection_reason IS NOT NULL AND length(NEW.rejection_reason) > 1000 THEN
    RAISE EXCEPTION 'Motivo de rejeição muito longo (máximo 1000 caracteres)';
  END IF;
  
  -- Validate image size (base64 ~10MB = ~13MB encoded)
  IF NEW.image IS NOT NULL AND length(NEW.image) > 15000000 THEN
    RAISE EXCEPTION 'Imagem muito grande (máximo 10MB)';
  END IF;
  
  -- Basic email format validation
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de e-mail inválido';
  END IF;
  
  -- Instagram handle validation (allow @ prefix)
  IF NEW.instagram !~ '^@?[A-Za-z0-9._]+$' THEN
    RAISE EXCEPTION 'Formato de Instagram inválido';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_ngo_input_trigger ON public.ngos;
CREATE TRIGGER validate_ngo_input_trigger
BEFORE INSERT OR UPDATE ON public.ngos
FOR EACH ROW
EXECUTE FUNCTION public.validate_ngo_input();