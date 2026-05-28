-- 1. Agrega la columna email a la tabla public.profiles para visualizar el correo en el panel de administración
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Rellena la columna email con los datos de auth.users para los usuarios existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. Actualiza el trigger handle_new_user para que guarde automáticamente el email de nuevos usuarios registrados
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
    residence_country,
    email
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'initial_role',
    (new.raw_user_meta_data->>'dob')::DATE,
    new.raw_user_meta_data->>'residence_country',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
