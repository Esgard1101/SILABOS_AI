-- Descripción: Migración del schema v1 al schema v2 para Silabos.AI

-- Habilitar extensión pgvector para el RAG en fases posteriores
CREATE EXTENSION IF NOT EXISTS vector;

-- Tablas NUEVAS a crear

-- 1. study_plans (Versión del plan de estudios de una carrera)
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    version VARCHAR NOT NULL,
    admission_from VARCHAR NOT NULL,
    pdf_path VARCHAR,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. performances (Desempeños D1, D2, D3 del Anexo 2 del Plan de Estudios)
CREATE TABLE IF NOT EXISTS performances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code VARCHAR NOT NULL,
    statement TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. users (Login básico propio)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'docente',
    career_id UUID REFERENCES careers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. syllabus_units (Una unidad didáctica por cada desempeño del curso)
CREATE TABLE IF NOT EXISTS syllabus_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
    unit_number INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. syllabus_contents (Matriz semanal del programa de contenidos)
CREATE TABLE IF NOT EXISTS syllabus_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    date_range VARCHAR NOT NULL,
    knowledge TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    activities TEXT NOT NULL,
    learning_evidence TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. syllabus_evaluation (Sistema de evaluación)
CREATE TABLE IF NOT EXISTS syllabus_evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    performance_id UUID NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
    required_skills TEXT NOT NULL,
    learning_evidence TEXT NOT NULL,
    evaluation_instrument TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. syllabus_grading (Sistema de calificación)
CREATE TABLE IF NOT EXISTS syllabus_grading (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    evidence_name VARCHAR NOT NULL,
    sigla VARCHAR NOT NULL,
    weight_percent INTEGER NOT NULL CHECK (weight_percent BETWEEN 0 AND 100),
    schedule_week VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. curriculum_docs (PDFs de planes de estudio)
CREATE TABLE IF NOT EXISTS curriculum_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
    file_path VARCHAR NOT NULL,
    doc_type VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. bibliography_sources (Referencias APA)
CREATE TABLE IF NOT EXISTS bibliography_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    apa_citation TEXT NOT NULL,
    source_type VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tablas EXISTENTES a modificar

-- 1. syllabi: agregar columnas
ALTER TABLE syllabi
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'exported')),
ADD COLUMN IF NOT EXISTS tutoring_text TEXT,
ADD COLUMN IF NOT EXISTS methodology_json JSONB;

-- 2. courses: agregar columnas
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sumilla TEXT,
ADD COLUMN IF NOT EXISTS competencia TEXT,
ADD COLUMN IF NOT EXISTS capacidad TEXT,
ADD COLUMN IF NOT EXISTS prerequisites VARCHAR;

-- Validaciones e Índices

-- users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_career_id ON users(career_id);

-- study_plans
CREATE INDEX IF NOT EXISTS idx_study_plans_career_id ON study_plans(career_id);

-- performances
CREATE INDEX IF NOT EXISTS idx_performances_course_id ON performances(course_id);

-- syllabi (existing table)
CREATE INDEX IF NOT EXISTS idx_syllabi_user_id ON syllabi(user_id);

-- syllabus_units
CREATE INDEX IF NOT EXISTS idx_syllabus_units_syllabus_id ON syllabus_units(syllabus_id);

-- syllabus_evaluation
CREATE INDEX IF NOT EXISTS idx_syllabus_evaluation_syllabus_id ON syllabus_evaluation(syllabus_id);

-- syllabus_grading
CREATE INDEX IF NOT EXISTS idx_syllabus_grading_syllabus_id ON syllabus_grading(syllabus_id);

-- Historial de versiones del sílabo
CREATE TABLE IF NOT EXISTS syllabus_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id   UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  payload_json  JSONB NOT NULL,
  changed_by    VARCHAR(255),
  change_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_syllabus_versions_syllabus
  ON syllabus_versions(syllabus_id);

-- Tabla de observaciones curriculares
CREATE TABLE IF NOT EXISTS syllabus_observations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id   UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  observer_name VARCHAR(255),
  observation   TEXT NOT NULL,
  status        VARCHAR(50) DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Compatibilidad de workflow para estados actuales y nuevos
ALTER TABLE syllabi
DROP CONSTRAINT IF EXISTS syllabi_status_check;

ALTER TABLE syllabi
ADD CONSTRAINT syllabi_status_check
CHECK (
  status IN (
    'draft',
    'generated',
    'exported',
    'review',
    'approved',
    'published'
  )
);

-- Persistencia MVP: el sílabo puede existir sin curso canónico asignado
ALTER TABLE syllabi
ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE syllabi
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
