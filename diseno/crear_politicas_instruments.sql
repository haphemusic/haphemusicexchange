-- 1. Asegurar que RLS está habilitado en instruments
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para evitar errores de duplicado
DROP POLICY IF EXISTS "Permitir lectura pública de instruments" ON instruments;
DROP POLICY IF EXISTS "Permitir gestión de instruments para anon y authenticated" ON instruments;

-- 3. Crear política para SELECT (lectura pública)
-- Cualquier usuario (autenticado o no) puede listar los instrumentos
CREATE POLICY "Permitir lectura pública de instruments" ON instruments
FOR SELECT USING (true);

-- 4. Crear política para INSERT, UPDATE, DELETE
-- Permite insertar, actualizar y borrar instrumentos (necesario para CRUD en instrumentos.html)
CREATE POLICY "Permitir gestión de instruments para anon y authenticated" ON instruments
FOR ALL USING (true) WITH CHECK (true);
