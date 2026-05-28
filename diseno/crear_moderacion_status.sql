-- 1. Función para validar el estado del usuario antes de cualquier modificación
CREATE OR REPLACE FUNCTION public.check_user_active()
RETURNS trigger AS $$
DECLARE
    user_status text;
BEGIN
    -- Si no hay sesión autenticada (por ejemplo, triggers del sistema), permitimos la operación
    IF auth.uid() IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Consultar el estado del usuario en su perfil
    SELECT status INTO user_status 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- Si no hay perfil o es nulo, consideramos que está activo por defecto
    IF user_status IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Si está baneado, denegamos cualquier acción
    IF user_status = 'banned' THEN
        RAISE EXCEPTION 'Tu cuenta ha sido baneada permanentemente por un administrador.';
    END IF;
    
    -- Si está suspendido, denegamos cualquier inserción, actualización o borrado
    IF user_status = 'suspended' THEN
        RAISE EXCEPTION 'Tu cuenta está temporalmente suspendida. No puedes realizar esta operación.';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar triggers previos si existen
DROP TRIGGER IF EXISTS check_user_status_on_works ON public.works;
DROP TRIGGER IF EXISTS check_user_status_on_performances ON public.performances;
DROP TRIGGER IF EXISTS check_user_status_on_posts ON public.posts;
DROP TRIGGER IF EXISTS check_user_status_on_comments ON public.comments;
DROP TRIGGER IF EXISTS check_user_status_on_messages ON public.messages;
DROP TRIGGER IF EXISTS check_user_status_on_votes ON public.votes;
DROP TRIGGER IF EXISTS check_user_status_on_work_votes ON public.work_votes;
DROP TRIGGER IF EXISTS check_user_status_on_comment_votes ON public.comment_votes;
DROP TRIGGER IF EXISTS check_user_status_on_saved_posts ON public.saved_posts;

-- 3. Crear triggers BEFORE INSERT OR UPDATE OR DELETE en cada una de las tablas correspondientes

-- Obras
CREATE TRIGGER check_user_status_on_works
  BEFORE INSERT OR UPDATE OR DELETE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Interpretaciones
CREATE TRIGGER check_user_status_on_performances
  BEFORE INSERT OR UPDATE OR DELETE ON public.performances
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Posts de foro
CREATE TRIGGER check_user_status_on_posts
  BEFORE INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Comentarios de foro
CREATE TRIGGER check_user_status_on_comments
  BEFORE INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Mensajes privados
CREATE TRIGGER check_user_status_on_messages
  BEFORE INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Votos de posts
CREATE TRIGGER check_user_status_on_votes
  BEFORE INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Votos de obras
CREATE TRIGGER check_user_status_on_work_votes
  BEFORE INSERT OR UPDATE OR DELETE ON public.work_votes
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Votos de comentarios
CREATE TRIGGER check_user_status_on_comment_votes
  BEFORE INSERT OR UPDATE OR DELETE ON public.comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();

-- Posts guardados
CREATE TRIGGER check_user_status_on_saved_posts
  BEFORE INSERT OR UPDATE OR DELETE ON public.saved_posts
  FOR EACH ROW EXECUTE FUNCTION public.check_user_active();
