-- Enriquecimiento tabla courses
-- Nuevas columnas desde data de PDFs de planes de estudio
-- ─────────────────────────────────────────────────────────────
-- PASO 1: ALTER TABLE — agregar columnas nuevas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE courses
    -- Datos de la ficha (campos 1.x del PDF)
    ADD COLUMN IF NOT EXISTS hours_theory      INTEGER,          -- 1.9 "3T"
    ADD COLUMN IF NOT EXISTS hours_practice    INTEGER,          -- 1.9 "2P"
    ADD COLUMN IF NOT EXISTS prerequisites     VARCHAR(300),     -- 1.10
    ADD COLUMN IF NOT EXISTS tipo_curso        VARCHAR(30),      -- 1.7 Obligatorio/Electivo
    ADD COLUMN IF NOT EXISTS naturaleza        VARCHAR(50),      -- 1.11 Teórico-práctica/Teórica

    -- Arrays de contenido extraídos de la sumilla
    ADD COLUMN IF NOT EXISTS temas_conocimientos  JSONB,         -- lista después de "conocimiento de..."
    ADD COLUMN IF NOT EXISTS habilidades_desempenos JSONB,       -- lista después de "habilidades vinculadas a..."
    ADD COLUMN IF NOT EXISTS actividades_metodo   JSONB;         -- lista después de "Plantea actividades como..."

-- NOTA: scope ya existe en la tabla, se actualiza via UPSERT con el valor de 1.6
-- NOTA: hours_theory y hours_practice reemplazan el default hardcodeado de 2

-- ─────────────────────────────────────────────────────────────
-- VERIFICAR columnas agregadas
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN (
    'hours_theory','hours_practice','prerequisites',
    'tipo_curso','naturaleza',
    'temas_conocimientos','habilidades_desempenos','actividades_metodo'
  )
ORDER BY column_name;