-- 1. Crear Tabla de Votos (Votes)
CREATE TABLE IF NOT EXISTS public.votes (
    id SERIAL PRIMARY KEY,
    post_id integer REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_post_user_vote UNIQUE (post_id, user_id)
);

-- Habilitar RLS para votos
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Políticas para votos
CREATE POLICY "Allow public read for votes" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for votes" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own votes" ON public.votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Crear Tabla de Notificaciones (Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id integer REFERENCES public.posts(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'comment', 'upvote'
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para notificaciones
CREATE POLICY "Allow users to read their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = receiver_id);

CREATE POLICY "Allow authenticated insert for notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Allow users to update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Allow users to delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = receiver_id);

-- Agregar la tabla de notificaciones a la publicación en tiempo real de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
