-- Crear Tabla de Publicaciones Guardadas (Saved Posts)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id SERIAL PRIMARY KEY,
    post_id integer REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_saved_post UNIQUE (post_id, user_id)
);

-- Habilitar RLS en publicaciones guardadas
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Políticas para publicaciones guardadas
CREATE POLICY "Allow public read for saved_posts" ON public.saved_posts
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for saved_posts" ON public.saved_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own saved_posts" ON public.saved_posts
    FOR DELETE USING (auth.uid() = user_id);
