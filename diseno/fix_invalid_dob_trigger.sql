-- 1. Crear una función auxiliar para castear texto a DATE de forma segura
CREATE OR REPLACE FUNCTION public.safe_cast_to_date(val text)
RETURNS DATE AS $$
BEGIN
  RETURN val::DATE;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL; -- Retorna NULL si la fecha es inválida o tiene formato incorrecto
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Actualizar la función del trigger handle_new_user para usar el casteo seguro
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
    public.safe_cast_to_date(new.raw_user_meta_data->>'dob'), -- Casteo seguro de la fecha de nacimiento
    new.raw_user_meta_data->>'residence_country',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
