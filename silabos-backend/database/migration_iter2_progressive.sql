-- ============================================================
-- MIGRACIÓN ITERACIÓN 2: Wizard Progresivo v3
-- Ejecutar manualmente en Adminer (pestaña "Comando SQL")
-- Todas las instrucciones son idempotentes (IF NOT EXISTS / DO NOTHING)
-- ============================================================

-- ============================================================
-- MIGRACIÓN A: Esquema base del wizard progresivo
-- ============================================================

-- A.1 Extender tabla syllabi para draft progresivo
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS wizard_version VARCHAR DEFAULT 'v2';
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS current_step VARCHAR DEFAULT 'course';
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS requires_academic_validation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS academic_validation_status VARCHAR NOT NULL DEFAULT 'not_required';
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS submitted_for_validation_at TIMESTAMPTZ;
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id);
ALTER TABLE syllabi
    ADD COLUMN IF NOT EXISTS autosaved_at TIMESTAMPTZ;

-- A.2 Tabla de revisiones por bloque (observaciones académicas)
CREATE TABLE IF NOT EXISTS syllabus_step_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id     UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    step_key        VARCHAR(50) NOT NULL,
    block_key       VARCHAR(100),
    review_action   VARCHAR(20) NOT NULL CHECK (review_action IN ('comment', 'approve', 'return')),
    observation     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_step_reviews_syllabus ON syllabus_step_reviews(syllabus_id, step_key);

-- A.3 Tabla de caché/auditoría de sugerencias IA
CREATE TABLE IF NOT EXISTS syllabus_ai_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id     UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    step_key        VARCHAR(50) NOT NULL,
    request_hash    VARCHAR(64),
    input_json      JSONB,
    output_json     JSONB,
    accepted        BOOLEAN,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_syllabus ON syllabus_ai_suggestions(syllabus_id, step_key);

-- A.4 Settings configurables del sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value_json  JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO system_settings (key, value_json) VALUES
    ('wizard.max_skills', '8'),
    ('wizard.max_conocimientos', '8'),
    ('wizard.max_actitudes', '6'),
    ('wizard.version', '"v3-progressive"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- MIGRACIÓN B: Compatibilidades pedagógicas
-- ============================================================

-- B.1 Catálogo de evidencias de evaluación
CREATE TABLE IF NOT EXISTS evaluation_evidence_catalog (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20) UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO evaluation_evidence_catalog (code, name, description) VALUES
    ('INF', 'Informe', 'Documento escrito que reporta resultados de una actividad'),
    ('PRY', 'Proyecto', 'Trabajo integrador que resuelve un problema real'),
    ('EXP', 'Exposición oral', 'Presentación verbal de resultados o investigación'),
    ('LAB', 'Práctica de laboratorio', 'Actividad experimental en entorno controlado'),
    ('POR', 'Portafolio', 'Colección de trabajos que evidencian el aprendizaje'),
    ('RUB', 'Rúbrica de desempeño', 'Evaluación de habilidades mediante criterios'),
    ('EXM', 'Examen', 'Evaluación escrita o digital de conocimientos'),
    ('DEF', 'Defensa de proyecto', 'Sustentación oral de proyecto ante jurado'),
    ('AUT', 'Autoevaluación', 'Reflexión del estudiante sobre su propio aprendizaje'),
    ('COE', 'Coevaluación', 'Evaluación entre pares')
ON CONFLICT (code) DO NOTHING;

-- B.2 Catálogo de instrumentos de evaluación
CREATE TABLE IF NOT EXISTS evaluation_instruments_catalog (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(20) UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO evaluation_instruments_catalog (code, name, description) VALUES
    ('RBR', 'Rúbrica analítica', 'Instrumento con criterios y niveles de logro descriptivos'),
    ('LST', 'Lista de cotejo', 'Verificación de presencia/ausencia de criterios'),
    ('ESC', 'Escala de valoración', 'Gradación numérica o cualitativa de desempeño'),
    ('GUA', 'Guía de observación', 'Registro de comportamientos observados'),
    ('PRB', 'Prueba objetiva', 'Test de selección múltiple, V/F, completar'),
    ('PEA', 'Prueba de ensayo', 'Evaluación de respuesta abierta y argumentada'),
    ('REG', 'Registro anecdótico', 'Notas descriptivas de incidentes significativos'),
    ('AUT', 'Ficha de autoevaluación', 'Instrumento guiado de reflexión propia'),
    ('COE', 'Ficha de coevaluación', 'Instrumento guiado de evaluación entre pares')
ON CONFLICT (code) DO NOTHING;

-- B.3 Compatibilidad método ↔ evidencia
CREATE TABLE IF NOT EXISTS teaching_method_evidence_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_method_id  UUID NOT NULL REFERENCES teaching_methods(id) ON DELETE CASCADE,
    evidence_id         UUID NOT NULL REFERENCES evaluation_evidence_catalog(id) ON DELETE CASCADE,
    priority            INTEGER NOT NULL DEFAULT 50,
    is_recommended      BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teaching_method_id, evidence_id)
);
CREATE INDEX IF NOT EXISTS idx_method_evidence_links_method ON teaching_method_evidence_links(teaching_method_id);

-- B.4 Compatibilidad método ↔ instrumento
CREATE TABLE IF NOT EXISTS teaching_method_instrument_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_method_id  UUID NOT NULL REFERENCES teaching_methods(id) ON DELETE CASCADE,
    instrument_id       UUID NOT NULL REFERENCES evaluation_instruments_catalog(id) ON DELETE CASCADE,
    priority            INTEGER NOT NULL DEFAULT 50,
    is_recommended      BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teaching_method_id, instrument_id)
);
CREATE INDEX IF NOT EXISTS idx_method_instrument_links_method ON teaching_method_instrument_links(teaching_method_id);

-- B.5 Asegurar que teaching_method_skill_links existe (ya creado en iter1)
-- Si no se ejecutó iter1, esta instrucción lo crea:
CREATE TABLE IF NOT EXISTS teaching_method_skill_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_method_id  UUID NOT NULL REFERENCES teaching_methods(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
    priority            INTEGER NOT NULL DEFAULT 50,
    is_recommended      BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teaching_method_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_method_skill_links_method ON teaching_method_skill_links(teaching_method_id);

-- ============================================================
-- MIGRACIÓN C: Enriquecimiento de teaching_methods
-- ============================================================

ALTER TABLE teaching_methods
    ADD COLUMN IF NOT EXISTS grading_template_json JSONB;

ALTER TABLE teaching_methods
    ADD COLUMN IF NOT EXISTS phase_rules_json JSONB;

-- ============================================================
-- MIGRACIÓN D: Índices adicionales y constraints
-- ============================================================

-- D.1 Índice para buscar draft progresivo por curso+semestre+usuario
CREATE INDEX IF NOT EXISTS idx_syllabi_draft_lookup
    ON syllabi (course_id, semester, user_id, wizard_version)
    WHERE status = 'draft';

-- D.2 Constraint de valores válidos para academic_validation_status
-- (verificación a nivel aplicación — PostgreSQL requiere ALTER TABLE con CHECK)
-- Nota: Si la tabla ya existe con datos, usar DO UPDATE en lugar de ADD CONSTRAINT

-- D.3 Índice para validación académica pendiente
CREATE INDEX IF NOT EXISTS idx_syllabi_pending_validation
    ON syllabi (academic_validation_status)
    WHERE academic_validation_status = 'pending';

-- ============================================================
-- FIN DE MIGRACIÓN ITER 2 (4 grupos: A, B, C, D)
-- Verificar con: SELECT * FROM system_settings;
-- ============================================================
