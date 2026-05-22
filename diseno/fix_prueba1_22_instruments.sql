-- =====================================================================
-- FIX: Insertar instrumentos que faltan para "prueba 1 22" (work_id = 19)
-- 
-- Problema: Cuando se registró la obra, las políticas RLS de work_instruments
-- no estaban configuradas, así que el insert de instrumentos falló silenciosamente.
-- 
-- Solución: Insertar manualmente los instrumentos Horn y Flute.
-- =====================================================================

-- Verificar primero que no hay duplicados
SELECT * FROM work_instruments WHERE work_id = 19;

-- Insertar Horn (instrument_id = 26) y Flute (instrument_id = 1)
INSERT INTO work_instruments (work_id, instrument_id, quantity)
VALUES
  (19, 26, 1),  -- Horn
  (19,  1, 1)   -- Flute
ON CONFLICT DO NOTHING;

-- Verificar el resultado
SELECT 
  wi.work_id,
  wi.instrument_id,
  i.name,
  i.family,
  i.variant
FROM work_instruments wi
JOIN instruments i ON i.id = wi.instrument_id
WHERE wi.work_id = 19;
