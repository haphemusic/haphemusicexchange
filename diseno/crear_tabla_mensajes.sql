-- 1. Crear Tabla de Mensajes
CREATE TABLE IF NOT EXISTS public.messages (
    id SERIAL PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS en la tabla
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad RLS
-- Lectura: los usuarios solo pueden ver mensajes en los que participan (como emisor o receptor)
CREATE POLICY "Users can view their own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Escritura: los usuarios solo pueden enviar mensajes donde firmen como el sender
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Actualización: el destinatario puede marcar el mensaje como leído (is_read = true)
CREATE POLICY "Receivers can update read status" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- 4. Habilitar Realtime para la tabla de mensajes en Supabase
-- Agrega la tabla a la publicación de Supabase Realtime si no existe ya
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;
