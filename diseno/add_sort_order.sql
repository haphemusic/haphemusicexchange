-- Agrega la columna sort_order para guardar la posición de los instrumentos
ALTER TABLE public.instruments ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Opcional: Actualizar el orden actual basado en el id para que no todos tengan 0
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY family ORDER BY name ASC) - 1 as new_order
  FROM instruments
)
UPDATE instruments
SET sort_order = numbered.new_order
FROM numbered
WHERE instruments.id = numbered.id;
