-- 1. AGREGAR COLUMNAS A LA TABLA WORKS
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS composer_name TEXT;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS composer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. FUNCIÓN DE AUTO-VINCULACIÓN AL INSERTAR/MODIFICAR OBRAS
-- Si se añade o modifica una obra con composer_name, busca si ya existe un perfil de compositor registrado con ese nombre y le asigna el ID.
CREATE OR REPLACE FUNCTION public.auto_link_work_composer_profile()
RETURNS trigger AS $$
DECLARE
  matching_profile_id uuid;
BEGIN
  IF NEW.composer_name IS NOT NULL AND NEW.composer_profile_id IS NULL THEN
    SELECT id INTO matching_profile_id
    FROM public.profiles
    WHERE role = 'composer'
      AND LOWER(REGEXP_REPLACE(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(NEW.composer_name), '\s+', ' ', 'g'))
    LIMIT 1;
    
    IF matching_profile_id IS NOT NULL THEN
      NEW.composer_profile_id := matching_profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS BEFORE RE-CREATING
DROP TRIGGER IF EXISTS on_work_insert_auto_link ON public.works;

CREATE TRIGGER on_work_insert_auto_link
  BEFORE INSERT OR UPDATE OF composer_name ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_work_composer_profile();


-- 3. FUNCIÓN DE VINCULACIÓN RETROACTIVA AL CREAR/MODIFICAR PERFIL DE COMPOSITOR
-- Si un usuario se registra o actualiza su perfil como 'composer', busca obras huérfanas que coincidan con su nombre y se las asocia.
CREATE OR REPLACE FUNCTION public.link_works_to_composer()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'composer' AND (NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL) THEN
    UPDATE public.works
    SET composer_profile_id = NEW.id
    WHERE composer_profile_id IS NULL
      AND composer_name IS NOT NULL
      AND LOWER(REGEXP_REPLACE(TRIM(composer_name), '\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), '\s+', ' ', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS BEFORE RE-CREATING
DROP TRIGGER IF EXISTS on_profile_composer_link ON public.profiles;

CREATE TRIGGER on_profile_composer_link
  AFTER INSERT OR UPDATE OF first_name, last_name, role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_works_to_composer();


-- 4. VINCULACIÓN RETROACTIVA DE OBRAS EXISTENTES (Corrige nombres con espacios desiguales como "las  cigarreras" vs "las cigarreras")
UPDATE public.works w
SET composer_profile_id = p.id
FROM public.profiles p
WHERE w.composer_profile_id IS NULL
  AND w.composer_name IS NOT NULL
  AND p.role = 'composer'
  AND LOWER(REGEXP_REPLACE(TRIM(w.composer_name), '\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '\s+', ' ', 'g'));
