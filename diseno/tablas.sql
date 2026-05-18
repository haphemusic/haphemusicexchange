-- 1. Perfiles de Usuario (Registro Progresivo)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  username text UNIQUE,
  first_name text,
  last_name text,
  role text CHECK (role IN ('musician', 'composer', 'admin')),
  dob DATE,
  residence_country text,
  nationality text,
  country_of_birth text,
  place_of_birth text,
  gender text CHECK (gender IN ('female', 'male', 'other')),
  bio text,
  website text,
  
  -- Perfil Artístico
  main_aesthetic text,
  education text,
  awards text,
  copyright_society text,
  
  -- Multimedia
  soundcloud_url text,
  spotify_url text,
  youtube_url text,
  social_links jsonb, -- Almacena Instagram, X, LinkedIn, etc.
  
  -- Disponibilidad y Contacto
  accepting_commissions boolean DEFAULT false,
  open_to_collaboration boolean DEFAULT false,
  public_contact_email text,
  
  avatar_url text,
  is_complete boolean DEFAULT false, -- Flag para acceso total
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Catálogo de Instrumentos
CREATE TABLE instruments (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  family text
);

-- 3. Obras Musicales
CREATE TABLE works (
  id SERIAL PRIMARY KEY,
  composer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES profiles(id),
  title text NOT NULL,
  year integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Relación Obra-Instrumentos
CREATE TABLE work_instruments (
  work_id integer REFERENCES works(id) ON DELETE CASCADE,
  instrument_id integer REFERENCES instruments(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  PRIMARY KEY (work_id, instrument_id)
);

-- 5. Sincronización Automática con Metadatos Extendidos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    first_name, 
    last_name, 
    role, 
    dob, 
    residence_country
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'initial_role',
    (new.raw_user_meta_data->>'dob')::DATE,
    new.raw_user_meta_data->>'residence_country'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
