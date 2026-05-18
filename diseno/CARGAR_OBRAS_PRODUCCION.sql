-- ===================================================================
-- SCRIPT PARA CARGAR OBRAS Y RELACIONES EN SUPABASE - PRODUCCIÓN
-- Ejecuta este script COMPLETO en Supabase SQL Editor
-- ===================================================================

-- 1. INSERTAR OBRAS VALIDADAS (composer_id debe ser un UUID válido de profiles)
INSERT INTO works (composer_id, submitted_by, title, year, status) VALUES
-- David Gutiérrez (e49c1241-c203-4c90-bcf5-ac9346071b30)
('e49c1241-c203-4c90-bcf5-ac9346071b30', 'e49c1241-c203-4c90-bcf5-ac9346071b30', 'Piccolo Concerto in C major, RV 443', 1728, 'validated'),
('e49c1241-c203-4c90-bcf5-ac9346071b30', 'e49c1241-c203-4c90-bcf5-ac9346071b30', 'Flute Quartet No. 1 in D major, K. 285', 1777, 'validated'),
('e49c1241-c203-4c90-bcf5-ac9346071b30', 'e49c1241-c203-4c90-bcf5-ac9346071b30', 'Fantaisie for Flute and Piano, Op. 79', 1898, 'validated'),
('e49c1241-c203-4c90-bcf5-ac9346071b30', 'e49c1241-c203-4c90-bcf5-ac9346071b30', 'Syrinx for Solo Flute', 1913, 'validated'),
('e49c1241-c203-4c90-bcf5-ac9346071b30', 'e49c1241-c203-4c90-bcf5-ac9346071b30', 'Sonata for Flute and Piano, FP 164', 1957, 'validated'),

-- Javier Campaña (e5489ccd-3c8a-40a1-93ab-32aa9c42821c)
('e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'Oboe Concerto in C minor, Op. 12', 1784, 'validated'),
('e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'Clarinet Quintet in A major, K. 581', 1789, 'validated'),
('e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'Brahms Violin Concerto in D major', 1878, 'validated'),
('e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'Cello Sonata No. 1 in F major, Op. 99', 1883, 'validated'),
('e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'e5489ccd-3c8a-40a1-93ab-32aa9c42821c', 'Debussy Quartet in G minor, L. 91', 1893, 'validated');

-- 2. INSERTAR RELACIONES OBRA-INSTRUMENTOS (work_id debe ser del INSERT anterior)
-- Para esto, usamos subqueries que ASUMEN que los INSERT anteriores tuvieron éxito
INSERT INTO work_instruments (work_id, instrument_id, quantity) VALUES

-- Obras de David Gutiérrez con instrumentos Flute family
((SELECT id FROM works WHERE title = 'Piccolo Concerto in C major, RV 443' LIMIT 1), 2, 1),  -- Piccolo
((SELECT id FROM works WHERE title = 'Flute Quartet No. 1 in D major, K. 285' LIMIT 1), 1, 4),  -- Flute x4
((SELECT id FROM works WHERE title = 'Fantaisie for Flute and Piano, Op. 79' LIMIT 1), 1, 1),  -- Flute
((SELECT id FROM works WHERE title = 'Syrinx for Solo Flute' LIMIT 1), 1, 1),  -- Flute
((SELECT id FROM works WHERE title = 'Sonata for Flute and Piano, FP 164' LIMIT 1), 1, 1),  -- Flute

-- Obras de Javier Campaña
((SELECT id FROM works WHERE title = 'Oboe Concerto in C minor, Op. 12' LIMIT 1), 4, 1),  -- Oboe (id 4)
((SELECT id FROM works WHERE title = 'Clarinet Quintet in A major, K. 581' LIMIT 1), 6, 1),  -- Clarinet (id 6)
((SELECT id FROM works WHERE title = 'Brahms Violin Concerto in D major' LIMIT 1), 10, 1),  -- Violin (id 10)
((SELECT id FROM works WHERE title = 'Cello Sonata No. 1 in F major, Op. 99' LIMIT 1), 12, 1),  -- Cello (id 12)
((SELECT id FROM works WHERE title = 'Debussy Quartet in G minor, L. 91' LIMIT 1), 10, 2),  -- Violin x2
((SELECT id FROM works WHERE title = 'Debussy Quartet in G minor, L. 91' LIMIT 1), 12, 2);  -- Cello x2

-- 3. VERIFICAR QUE TODO SE CARGÓ CORRECTAMENTE
SELECT COUNT(*) as total_works FROM works;
SELECT COUNT(*) as total_work_instruments FROM work_instruments;
SELECT * FROM works LIMIT 5;
SELECT * FROM work_instruments LIMIT 5;

-- ===================================================================
-- FIN DEL SCRIPT
-- ===================================================================
-- Si ves resultados en las queries de arriba, todo fue exitoso.
-- El buscador en index.html debería funcionar ahora.
