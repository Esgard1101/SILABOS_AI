-- Mapa Semanal de Conocimientos (Step 9 del wizard).
-- Genera, audita y confirma 16 conocimientos semanales como verdad curricular
-- ANTES de la generacion progresiva por unidad. Una vez confirmado, el motor
-- de unidades no puede modificar el campo `knowledge` de cada semana.
--
-- map_json shape (array de 16 elementos):
--   {
--     "week": 1..16,
--     "unit_number": 1..N,
--     "knowledge": "texto principal obligatorio",
--     "subtopics": ["sub 1", "sub 2"],
--     "emphasis": "frase de aplicacion docente",
--     "source_notes": "referencia/origen NotebookLM",
--     "locked": false,
--     "warnings": [{"code":"REPETITION","message":"..."}]
--   }
--
-- audit_json shape:
--   {
--     "overall_signal": "ok" | "soft_warnings" | "hard_block",
--     "warnings": [{"week": int, "code": "REPETITION"|"VAGUE"|"OUT_OF_SCOPE", "message": "..."}],
--     "repeated_pairs": [[week_a, week_b]],
--     "model_used": "...",
--     "generated_at": "iso8601"
--   }

CREATE TABLE IF NOT EXISTS syllabus_knowledge_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'superseded')),
    notebook_context_text TEXT,
    map_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    teacher_notes TEXT,
    teacher_instruction TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    UNIQUE (syllabus_id, version)
);

-- Solo un mapa confirmado vigente por silabo. Versiones previas pasan a
-- 'superseded' cuando se confirma una nueva.
CREATE UNIQUE INDEX IF NOT EXISTS ux_knowledge_map_confirmed_per_syllabus
ON syllabus_knowledge_maps(syllabus_id)
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_knowledge_maps_syllabus_status
ON syllabus_knowledge_maps(syllabus_id, status);

CREATE INDEX IF NOT EXISTS idx_knowledge_maps_syllabus_updated
ON syllabus_knowledge_maps(syllabus_id, updated_at DESC);

-- Trigger para mantener updated_at consistente.
CREATE OR REPLACE FUNCTION touch_syllabus_knowledge_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_maps_touch_updated_at ON syllabus_knowledge_maps;
CREATE TRIGGER trg_knowledge_maps_touch_updated_at
BEFORE UPDATE ON syllabus_knowledge_maps
FOR EACH ROW
EXECUTE FUNCTION touch_syllabus_knowledge_maps_updated_at();

ALTER TABLE syllabus_knowledge_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_maps_owner_select ON syllabus_knowledge_maps;
CREATE POLICY knowledge_maps_owner_select
ON syllabus_knowledge_maps
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS knowledge_maps_owner_insert ON syllabus_knowledge_maps;
CREATE POLICY knowledge_maps_owner_insert
ON syllabus_knowledge_maps
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS knowledge_maps_owner_update ON syllabus_knowledge_maps;
CREATE POLICY knowledge_maps_owner_update
ON syllabus_knowledge_maps
FOR UPDATE
TO authenticated
USING (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS knowledge_maps_owner_delete ON syllabus_knowledge_maps;
CREATE POLICY knowledge_maps_owner_delete
ON syllabus_knowledge_maps
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) IS NOT NULL
    AND
    EXISTS (
        SELECT 1 FROM syllabi s
        WHERE s.id = syllabus_id AND s.user_id = (SELECT auth.uid())
    )
);

-- Job types nuevos para ai_generation_jobs (tipos sueltos, no enum):
-- 'progressive_knowledge_map_suggest'
-- 'progressive_knowledge_map_audit'
-- 'progressive_knowledge_map_reprompt'
--
-- Nota: si la tabla ai_generation_jobs.job_type usa CHECK constraint con lista
-- cerrada, agregar los 3 nuevos tipos. Si es VARCHAR libre, no requiere cambio.
