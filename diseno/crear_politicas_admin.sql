-- =====================================================================
-- HAPHEMUSIC - Políticas de Seguridad de Supabase para Administradores
-- Ejecuta este script en el editor SQL de Supabase para permitir a los
-- administradores gestionar y eliminar obras, publicaciones y comentarios.
-- =====================================================================

-- 1. Políticas de administración sobre la tabla 'works' (Obras)
DROP POLICY IF EXISTS "Admins can do everything on works" ON public.works;
CREATE POLICY "Admins can do everything on works" ON public.works 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. Políticas de administración sobre la tabla 'posts' (Publicaciones Foro)
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post" ON public.posts
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Políticas de administración sobre la tabla 'comments' (Comentarios Foro)
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment" ON public.comments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
