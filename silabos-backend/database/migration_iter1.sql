-- ============================================================
-- MIGRACIÓN ITERACIÓN 1: Seguridad, Scopes y Admin Core
-- Ejecutar manualmente en Adminer (pestaña "Comando SQL")
-- Todas las instrucciones son idempotentes (IF NOT EXISTS / DO NOTHING)
-- ============================================================

-- 1. Archivado lógico en performances (si no existe la columna)
ALTER TABLE performances
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 2. Archivado lógico en teaching_methods (si no existe)
ALTER TABLE teaching_methods
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 3. user_scope_assignments — scopes por usuario (carrera o programa)
CREATE TABLE IF NOT EXISTS user_scope_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_type  VARCHAR(20) NOT NULL CHECK (scope_type IN ('career', 'program')),
    scope_id    UUID NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, scope_type, scope_id)
);
CREATE INDEX IF NOT EXISTS idx_user_scope_user_id ON user_scope_assignments(user_id);

-- 4. permissions_catalog — claves de permiso conocidas
CREATE TABLE IF NOT EXISTS permissions_catalog (
    key         VARCHAR(100) PRIMARY KEY,
    description TEXT
);
INSERT INTO permissions_catalog (key, description) VALUES
    ('catalog.methods.manage',          'CRUD de metodologías pedagógicas'),
    ('catalog.skills.manage',           'CRUD de habilidades del catálogo'),
    ('courses.curriculum.manage',       'Editar sumilla, competencia, resultado y capacidad'),
    ('courses.performances.manage',     'CRUD de desempeños por curso'),
    ('users.permissions.manage',        'Gestionar roles, scopes y overrides de usuarios'),
    ('syllabus.review',                 'Aprobar, rechazar y publicar sílabos')
ON CONFLICT (key) DO NOTHING;

-- 5. role_permission_templates — permisos base por rol
CREATE TABLE IF NOT EXISTS role_permission_templates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role           VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL REFERENCES permissions_catalog(key),
    UNIQUE (role, permission_key)
);
INSERT INTO role_permission_templates (role, permission_key) VALUES
    ('admin',        'catalog.methods.manage'),
    ('admin',        'catalog.skills.manage'),
    ('admin',        'courses.curriculum.manage'),
    ('admin',        'courses.performances.manage'),
    ('admin',        'users.permissions.manage'),
    ('admin',        'syllabus.review'),
    ('director',     'courses.curriculum.manage'),
    ('director',     'courses.performances.manage'),
    ('director',     'syllabus.review'),
    ('coordinador',  'courses.curriculum.manage'),
    ('coordinador',  'courses.performances.manage')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 6. user_permission_overrides — allow / deny por usuario
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL REFERENCES permissions_catalog(key),
    effect         VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
    granted_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user_id ON user_permission_overrides(user_id);

-- 7. teaching_method_skill_links — compatibilidad método↔habilidad
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

-- 8. Tablas de historial
CREATE TABLE IF NOT EXISTS teaching_methods_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_method_id  UUID NOT NULL,
    action              VARCHAR(20) NOT NULL,   -- 'create' | 'update' | 'archive'
    payload_before      JSONB,
    payload_after       JSONB,
    changed_by          UUID REFERENCES users(id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tm_history_method ON teaching_methods_history(teaching_method_id);

CREATE TABLE IF NOT EXISTS skills_catalog_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id    UUID NOT NULL,
    action      VARCHAR(20) NOT NULL,
    payload_before JSONB,
    payload_after  JSONB,
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sc_history_skill ON skills_catalog_history(skill_id);

CREATE TABLE IF NOT EXISTS courses_curriculum_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    action      VARCHAR(20) NOT NULL DEFAULT 'update',
    payload_before JSONB,
    payload_after  JSONB,
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cc_history_course ON courses_curriculum_history(course_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS performances_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performance_id  UUID NOT NULL,
    course_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL,
    payload_before  JSONB,
    payload_after   JSONB,
    changed_by      UUID REFERENCES users(id),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_history_course ON performances_history(course_id, changed_at DESC);

-- ============================================================
-- FIN DE MIGRACIÓN — verificar con: \dt en psql o listar tablas en Adminer
-- ============================================================
