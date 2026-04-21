-- ============================================================
-- MIGRACIÓN ITER 3: Vínculos método ↔ instrumento de evaluación
-- Regla 12 del manual: cada evidencia vinculada a instrumento.
-- ============================================================

-- Función auxiliar de inserción idempotente
-- (usamos INSERT ... ON CONFLICT DO NOTHING vía subquery)

-- ABPro
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Proyectos' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Proyectos' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Proyectos' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Proyectos' AND i.code = 'COE'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- ABDe
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Desafíos' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Desafíos' AND i.code = 'ESC'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Desafíos' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Aprendizaje Cooperativo
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Cooperativo' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Cooperativo' AND i.code = 'COE'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Cooperativo' AND i.code = 'AUT'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Cooperativo' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Estudio de Casos
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Estudio De Casos' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Estudio De Casos' AND i.code = 'PEA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Estudio De Casos' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Estudio De Casos' AND i.code = 'ESC'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Aprendizaje Basado en Investigación
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Investigación' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Investigación' AND i.code = 'PEA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Investigación' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Investigación' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Aprendizaje Experiencial
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Experiencial' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Experiencial' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Experiencial' AND i.code = 'AUT'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Experiencial' AND i.code = 'REG'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Taller
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Taller' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Taller' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Taller' AND i.code = 'ESC'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Taller' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Modelo CER
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Modelo CER' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Modelo CER' AND i.code = 'PEA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Modelo CER' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Indagación Argumentada (ADI)
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Indagación Argumentada' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Indagación Argumentada' AND i.code = 'GUA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Indagación Argumentada' AND i.code = 'PEA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Indagación Argumentada' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Resolución de Problemas
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Resolución de Problemas' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Resolución de Problemas' AND i.code = 'PRB'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Resolución de Problemas' AND i.code = 'PEA'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Aprendizaje Basado En Resolución de Problemas' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

-- Educación Matemática Realista
INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 10, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Educación Matemática Realista' AND i.code = 'RBR'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 20, true
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Educación Matemática Realista' AND i.code = 'PRB'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 30, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Educación Matemática Realista' AND i.code = 'LST'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;

INSERT INTO teaching_method_instrument_links (teaching_method_id, instrument_id, priority, is_recommended)
SELECT tm.id, i.id, 40, false
FROM teaching_methods tm, evaluation_instruments_catalog i
WHERE tm.name = 'Educación Matemática Realista' AND i.code = 'ESC'
ON CONFLICT (teaching_method_id, instrument_id) DO NOTHING;
