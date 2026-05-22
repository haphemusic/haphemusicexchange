-- SCRIPT PARA CORREGIR LA CODIFICACIÓN DE LAS OBRAS (CORRECCIÓN DE MOJIBAKE)
-- Instrucciones: Copia y pega este script completo en el SQL Editor de tu Dashboard de Supabase y ejecútalo.
-- Esto solucionará los problemas de caracteres extraños (tÃ©cnica, DisposiciÃ³n, etc.) de las obras.

-- 1. Corregir Obra ID 11 (Reflejos del Viento)
UPDATE works
SET 
  subtitle = 'para Flauta y Electrónica en Vivo',
  premiere_venue = 'Auditorio Nacional de Música',
  premiere_performers = 'Clara Torres (flute) and Manuel Gutiérrez (electronics)',
  program_notes = 'Reflejos del Viento explora los límites acústicos de la flauta traversa mediante el diálogo constante con procesos de electrónica en vivo.'
WHERE id = 11;

-- 2. Corregir Obra ID 23 (Líneas del horizonte)
UPDATE works
SET 
  title = 'Líneas del horizonte',
  unusual_preparations = 'Clarinete con sordina de gasa (técnica extendida)',
  premiere_venue = 'L''Auditori — Sala Oriol Martorell',
  premiere_performers = 'Dúo Contemporánica (Laura Mas, clarinete; Pau Serra, violonchelo)',
  commissioned_by = 'Centre de Cultura Contemporània de Barcelona (CCCB)',
  publisher = 'Tritó Edicions',
  program_notes = 'Líneas del horizonte explora la tensión entre el movimiento y la quietud a través del diálogo íntimo entre clarinete y violonchelo. La obra articula una serie de gestos que van desde la resonancia casi inmóvil hasta explosiones de energía rítmica, creando un espacio sonoro que evoca paisajes en constante transformación.',
  space_requirements = 'Disposición estándar en escena',
  additional_info = 'Requiere ensayo específico para la coordinación de microtonos en el dúo. Incluye notación de cuartos de tono.'
WHERE id = 23;

-- 3. Consulta de verificación
SELECT id, title, subtitle, unusual_preparations, space_requirements, premiere_venue, premiere_performers 
FROM works 
WHERE id IN (11, 23);
