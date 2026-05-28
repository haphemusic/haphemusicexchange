-- Habilitar RLS en la tabla performances (por si acaso)
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas de actualización previas para evitar conflictos
DROP POLICY IF EXISTS "Compositores e intérpretes editan interpretaciones" ON performances;
DROP POLICY IF EXISTS "Permitir actualización de interpretaciones" ON performances;

-- Crear política para permitir la actualización de interpretaciones
-- Permite la edición tanto al intérprete dueño del registro como al compositor de la obra asociada
CREATE POLICY "Compositores e intérpretes editan interpretaciones" ON performances
FOR UPDATE USING (
  auth.uid() = performer_id OR 
  EXISTS (
    SELECT 1 FROM works 
    WHERE works.id = performances.work_id 
      AND (
        works.composer_profile_id = auth.uid() OR
        (works.composer_profile_id IS NULL AND works.submitted_by = auth.uid())
      )
  )
)
WITH CHECK (
  auth.uid() = performer_id OR 
  EXISTS (
    SELECT 1 FROM works 
    WHERE works.id = performances.work_id 
      AND (
        works.composer_profile_id = auth.uid() OR
        (works.composer_profile_id IS NULL AND works.submitted_by = auth.uid())
      )
  )
);
