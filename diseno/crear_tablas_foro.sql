-- 1. Crear Tabla de Publicaciones (Posts)
CREATE TABLE IF NOT EXISTS public.posts (
    id SERIAL PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    media_url text,
    external_link text,
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Políticas para posts
CREATE POLICY "Allow public read for posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow authors to update their posts" ON public.posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Allow authors to delete their posts" ON public.posts
    FOR DELETE USING (auth.uid() = author_id);


-- 2. Crear Tabla de Comentarios (Comments)
CREATE TABLE IF NOT EXISTS public.comments (
    id SERIAL PRIMARY KEY,
    post_id integer REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para comentarios
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Políticas para comentarios
CREATE POLICY "Allow public read for comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow authors to update their comments" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Allow authors to delete their comments" ON public.comments
    FOR DELETE USING (auth.uid() = author_id);
