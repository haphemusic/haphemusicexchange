-- 1. Asegurar que RLS está habilitado en work_instruments
ALTER TABLE work_instruments ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para evitar errores de duplicado
DROP POLICY IF EXISTS "Permitir lectura pública de work_instruments" ON work_instruments;
DROP POLICY IF EXISTS "Permitir inserción de instrumentos por creador de obra" ON work_instruments;
DROP POLICY IF EXISTS "Permitir actualización de instrumentos por creador de obra" ON work_instruments;
DROP POLICY IF EXISTS "Permitir eliminación de instrumentos por creador de obra" ON work_instruments;

-- 3. Crear política para SELECT (lectura pública)
-- Cualquiera (incluso no autenticados) puede ver qué instrumentos tiene una obra
CREATE POLICY "Permitir lectura pública de work_instruments" ON work_instruments
FOR SELECT USING (true);

-- 4. Crear política para INSERT
-- Permite insertar filas en work_instruments si el usuario autenticado es el creador de la obra (submitted_by)
CREATE POLICY "Permitir inserción de instrumentos por creador de obra" ON work_instruments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_instruments.work_id 
      AND works.submitted_by = auth.uid()
  )
);

-- 5. Crear política para UPDATE
-- Permite actualizar filas en work_instruments si el usuario autenticado es el creador de la obra (submitted_by)
CREATE POLICY "Permitir actualización de instrumentos por creador de obra" ON work_instruments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_instruments.work_id 
      AND works.submitted_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_instruments.work_id 
      AND works.submitted_by = auth.uid()
  )
);

-- 6. Crear política para DELETE
-- Permite eliminar filas en work_instruments si el usuario autenticado es el creador de la obra (submitted_by)
CREATE POLICY "Permitir eliminación de instrumentos por creador de obra" ON work_instruments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM works
    WHERE works.id = work_instruments.work_id 
      AND works.submitted_by = auth.uid()
  )
);
