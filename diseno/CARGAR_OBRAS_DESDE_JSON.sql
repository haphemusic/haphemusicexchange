-- ===================================================================
-- SCRIPT PARA CARGAR DATOS DE repertorio_limpio.json EN SUPABASE
-- Ejecuta este script COMPLETO en Supabase SQL Editor
-- ===================================================================

-- 1. INSERTAR OBRAS DESDE repertorio_limpio.json CON MAPEO DE COMPOSITORES
-- Mapeo: Buscar compositores por nombre en profiles y usar su ID

INSERT INTO works (composer_id, submitted_by, title, year, status) VALUES

-- Obertura Contemporánea - Manuel Solis
((SELECT id FROM profiles WHERE first_name = 'Manuel' AND last_name = 'Solis' LIMIT 1),
 (SELECT id FROM profiles WHERE first_name = 'Manuel' AND last_name = 'Solis' LIMIT 1),
 'Obertura Contemporánea', 2023, 'validated'),

-- Suite Para Cello - David Gutierrez
((SELECT id FROM profiles WHERE first_name = 'David' AND last_name = 'Gutiérrez' LIMIT 1),
 (SELECT id FROM profiles WHERE first_name = 'David' AND last_name = 'Gutiérrez' LIMIT 1),
 'Suite Para Cello', 2022, 'validated'),

-- Reflejos Sonoros - Juan Perez (si existe en profiles)
(COALESCE((SELECT id FROM profiles WHERE first_name = 'Juan' AND last_name = 'Perez' LIMIT 1),
          (SELECT id FROM profiles WHERE role = 'composer' LIMIT 1)),
 COALESCE((SELECT id FROM profiles WHERE first_name = 'Juan' AND last_name = 'Perez' LIMIT 1),
          (SELECT id FROM profiles WHERE role = 'composer' LIMIT 1)),
 'Reflejos Sonoros', 2021, 'validated'),

-- Ecos Del Bosque - Elena Garcia (si existe en profiles)
(COALESCE((SELECT id FROM profiles WHERE first_name = 'Elena' AND last_name = 'Garcia' LIMIT 1),
          (SELECT id FROM profiles WHERE role = 'composer' LIMIT 1)),
 COALESCE((SELECT id FROM profiles WHERE first_name = 'Elena' AND last_name = 'Garcia' LIMIT 1),
          (SELECT id FROM profiles WHERE role = 'composer' LIMIT 1)),
 'Ecos Del Bosque', 2024, 'validated');

-- 2. INSERTAR RELACIONES OBRA-INSTRUMENTOS (mapear nombres a IDs)
-- Instrumentos esperados en la tabla: Flute (1), Piccolo (2), Violin, Viola, Cello, Clarinet, Oboe, etc.

-- Obertura Contemporánea: Violin + Clarinet
INSERT INTO work_instruments (work_id, instrument_id, quantity) VALUES
((SELECT id FROM works WHERE title = 'Obertura Contemporánea' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Strings' AND name = 'Violin' LIMIT 1), 1),
((SELECT id FROM works WHERE title = 'Obertura Contemporánea' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Woodwinds' AND name = 'Clarinet' LIMIT 1), 1);

-- Suite Para Cello: Cello
INSERT INTO work_instruments (work_id, instrument_id, quantity) VALUES
((SELECT id FROM works WHERE title = 'Suite Para Cello' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Strings' AND name = 'Cello' LIMIT 1), 1);

-- Reflejos Sonoros: Flute + Piano + Cello
INSERT INTO work_instruments (work_id, instrument_id, quantity) VALUES
((SELECT id FROM works WHERE title = 'Reflejos Sonoros' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Woodwinds' AND name = 'Flute' LIMIT 1), 1),
((SELECT id FROM works WHERE title = 'Reflejos Sonoros' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Keyboards' AND name = 'Piano' LIMIT 1), 1),
((SELECT id FROM works WHERE title = 'Reflejos Sonoros' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Strings' AND name = 'Cello' LIMIT 1), 1);

-- Ecos Del Bosque: Oboe + Bassoon
INSERT INTO work_instruments (work_id, instrument_id, quantity) VALUES
((SELECT id FROM works WHERE title = 'Ecos Del Bosque' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Woodwinds' AND name = 'Oboe' LIMIT 1), 1),
((SELECT id FROM works WHERE title = 'Ecos Del Bosque' LIMIT 1),
 (SELECT id FROM instruments WHERE family = 'Woodwinds' AND name = 'Bassoon' LIMIT 1), 1);

-- 3. VERIFICAR RESULTADOS
SELECT 'OBRAS CARGADAS:' as status;
SELECT id, title, year, (SELECT first_name || ' ' || last_name FROM profiles WHERE id = composer_id) as composer FROM works;

SELECT 'RELACIONES OBRA-INSTRUMENTO:' as status;
SELECT w.title, i.name, i.family FROM work_instruments wi
JOIN works w ON wi.work_id = w.id
JOIN instruments i ON wi.instrument_id = i.id;

-- ===================================================================
-- FIN DEL SCRIPT
-- Ahora el buscador en index.html debería mostrar todas las obras
-- ===================================================================
