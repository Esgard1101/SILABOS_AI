-- Progressive Curriculum Engine v1
-- Adds product options, per-unit context, versioned unit generations and
-- weekly triple-coherence validations.

CREATE TABLE IF NOT EXISTS curricular_product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    timeline_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_selected_per_syllabus
ON curricular_product_options(syllabus_id)
WHERE selected = TRUE;

CREATE INDEX IF NOT EXISTS idx_product_options_syllabus
ON curricular_product_options(syllabus_id);

CREATE TABLE IF NOT EXISTS syllabus_unit_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    unit_number INT NOT NULL CHECK (unit_number > 0),
    raw_context_text TEXT,
    extracted_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    notebook_prompt_version VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (syllabus_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_unit_contexts_syllabus_unit
ON syllabus_unit_contexts(syllabus_id, unit_number);

CREATE TABLE IF NOT EXISTS syllabus_unit_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    unit_number INT NOT NULL CHECK (unit_number > 0),
    version INT NOT NULL DEFAULT 1 CHECK (version > 0),
    parent_generation_id UUID REFERENCES syllabus_unit_generations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'regenerating', 'rejected')),
    locked_weeks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    teacher_instruction TEXT,
    traceability_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_json JSONB NOT NULL,
    validation_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (syllabus_id, unit_number, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_unit_generation_approved
ON syllabus_unit_generations(syllabus_id, unit_number)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_unit_generations_syllabus_unit_status
ON syllabus_unit_generations(syllabus_id, unit_number, status);

CREATE INDEX IF NOT EXISTS idx_unit_generations_parent
ON syllabus_unit_generations(parent_generation_id);

CREATE TABLE IF NOT EXISTS syllabus_week_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES syllabus_unit_generations(id) ON DELETE CASCADE,
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    unit_number INT NOT NULL CHECK (unit_number > 0),
    week INT NOT NULL CHECK (week BETWEEN 1 AND 16),
    methodological_score INT CHECK (methodological_score BETWEEN 0 AND 2),
    cognitive_score INT CHECK (cognitive_score BETWEEN 0 AND 2),
    formative_score INT CHECK (formative_score BETWEEN 0 AND 2),
    technique_score INT CHECK (technique_score BETWEEN 0 AND 2),
    evidence_score INT CHECK (evidence_score BETWEEN 0 AND 2),
    total_score INT CHECK (total_score BETWEEN 0 AND 10),
    diagnosis VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (generation_id, week)
);

CREATE INDEX IF NOT EXISTS idx_week_validations_generation
ON syllabus_week_validations(generation_id);

CREATE INDEX IF NOT EXISTS idx_week_validations_syllabus_unit
ON syllabus_week_validations(syllabus_id, unit_number, week);

ALTER TABLE curricular_product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_unit_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_unit_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_week_validations ENABLE ROW LEVEL SECURITY;

-- Backend writes with the server database connection. These policies keep
-- direct authenticated reads scoped to the syllabus owner when PostgREST is used.
DROP POLICY IF EXISTS product_options_owner_select ON curricular_product_options;
CREATE POLICY product_options_owner_select
ON curricular_product_options
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

DROP POLICY IF EXISTS unit_contexts_owner_select ON syllabus_unit_contexts;
CREATE POLICY unit_contexts_owner_select
ON syllabus_unit_contexts
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

DROP POLICY IF EXISTS unit_generations_owner_select ON syllabus_unit_generations;
CREATE POLICY unit_generations_owner_select
ON syllabus_unit_generations
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

DROP POLICY IF EXISTS week_validations_owner_select ON syllabus_week_validations;
CREATE POLICY week_validations_owner_select
ON syllabus_week_validations
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
