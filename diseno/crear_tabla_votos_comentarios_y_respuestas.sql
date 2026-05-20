-- 1. Añadir parent_id a la tabla de comentarios para permitir respuestas anidadas
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Crear Tabla de Votos para Comentarios (Comment Votes)
CREATE TABLE IF NOT EXISTS public.comment_votes (
    id SERIAL PRIMARY KEY,
    comment_id integer REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_comment_user_vote UNIQUE (comment_id, user_id)
);

-- Habilitar RLS en votos de comentarios
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- Políticas para votos de comentarios
CREATE POLICY "Allow public read for comment_votes" ON public.comment_votes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for comment_votes" ON public.comment_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own comment_votes" ON public.comment_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own comment_votes" ON public.comment_votes
    FOR DELETE USING (auth.uid() = user_id);
