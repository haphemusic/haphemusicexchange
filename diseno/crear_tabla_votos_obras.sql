-- Crear Tabla de Votos para Obras (Work Votes)
CREATE TABLE IF NOT EXISTS public.work_votes (
    id SERIAL PRIMARY KEY,
    work_id integer REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_work_user_vote UNIQUE (work_id, user_id)
);

-- Habilitar RLS en votos de obras
ALTER TABLE public.work_votes ENABLE ROW LEVEL SECURITY;

-- Políticas para votos de obras
CREATE POLICY "Allow public read for work_votes" ON public.work_votes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for work_votes" ON public.work_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own work_votes" ON public.work_votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own work_votes" ON public.work_votes
    FOR DELETE USING (auth.uid() = user_id);
