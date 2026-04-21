-- ============================================================
-- SEED UAT FINAL: cuentas demo para presentacion y smoke test
-- Ejecutar manualmente en Adminer (pestana "Comando SQL")
--
-- Password demo compartida:
--   Silabos2026!
--
-- Comportamiento:
-- - admin@silabos.ai:
--     * se inserta si no existe
--     * si ya existe, conserva su password actual
-- - director/coordinador/docentes demo:
--     * se insertan o actualizan
--     * quedan con password demo comun
--     * quedan con scopes activos y consistentes
-- ============================================================

DO $$
DECLARE
    v_demo_hash TEXT := '$2b$12$.j6HP4MT98KH.K0HDB6tNuQUFTuXgNGOdwnMDhnlSapunPg2bBoFK';
    v_career_edu_id UUID;
    v_program_inicial_id UUID;
    v_program_mate_id UUID;
    v_admin_id UUID;
    v_director_id UUID;
    v_coordinador_id UUID;
    v_docente_inicial_id UUID;
    v_docente_mate_id UUID;
BEGIN
    -- Carrera base para scopes de director y usuarios UAT.
    SELECT id
    INTO v_career_edu_id
    FROM careers
    WHERE code = 'EDU'
    ORDER BY created_at NULLS LAST, name ASC
    LIMIT 1;

    IF v_career_edu_id IS NULL THEN
        SELECT id
        INTO v_career_edu_id
        FROM careers
        WHERE name ILIKE 'Educa%'
        ORDER BY
            CASE WHEN lower(name) = 'educacion' THEN 0 ELSE 1 END,
            name ASC
        LIMIT 1;
    END IF;

    IF v_career_edu_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro la carrera base EDUCACION (code=EDU).';
    END IF;

    -- Programa Educacion Inicial.
    SELECT id
    INTO v_program_inicial_id
    FROM programs
    WHERE career_id = v_career_edu_id
      AND name ILIKE '%Inicial%'
    ORDER BY name ASC
    LIMIT 1;

    IF v_program_inicial_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro el programa Educacion Inicial.';
    END IF;

    -- Programa Matematica y Computacion.
    SELECT id
    INTO v_program_mate_id
    FROM programs
    WHERE career_id = v_career_edu_id
      AND (name ILIKE '%Matem%' OR name ILIKE '%Comput%')
    ORDER BY
        CASE WHEN name ILIKE '%Matem%' AND name ILIKE '%Comput%' THEN 0 ELSE 1 END,
        name ASC
    LIMIT 1;

    IF v_program_mate_id IS NULL THEN
        RAISE EXCEPTION 'No se encontro el programa Matematica y Computacion.';
    END IF;

    -- 1) Admin global.
    INSERT INTO users AS target (
        id,
        email,
        password_hash,
        full_name,
        role,
        career_id,
        status,
        auth_provider,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'admin@silabos.ai',
        v_demo_hash,
        'Administrador General',
        'admin',
        NULL,
        'active',
        'local',
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        role = 'admin',
        career_id = NULL,
        status = 'active',
        auth_provider = COALESCE(target.auth_provider, 'local');

    SELECT id
    INTO v_admin_id
    FROM users
    WHERE lower(email) = lower('admin@silabos.ai')
    LIMIT 1;

    -- 2) Director de escuela.
    INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        role,
        career_id,
        status,
        auth_provider,
        approved_by,
        approved_at,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'director@silabos.ai',
        v_demo_hash,
        'Director de Escuela',
        'director',
        v_career_edu_id,
        'active',
        'local',
        v_admin_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        career_id = EXCLUDED.career_id,
        status = 'active',
        auth_provider = 'local',
        google_sub = NULL,
        approved_by = v_admin_id,
        approved_at = NOW();

    SELECT id
    INTO v_director_id
    FROM users
    WHERE lower(email) = lower('director@silabos.ai')
    LIMIT 1;

    -- 3) Coordinador de programa.
    INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        role,
        career_id,
        status,
        auth_provider,
        approved_by,
        approved_at,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'coordinador@silabos.ai',
        v_demo_hash,
        'Coordinador de Programa',
        'coordinador',
        v_career_edu_id,
        'active',
        'local',
        v_admin_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        career_id = EXCLUDED.career_id,
        status = 'active',
        auth_provider = 'local',
        google_sub = NULL,
        approved_by = v_admin_id,
        approved_at = NOW();

    SELECT id
    INTO v_coordinador_id
    FROM users
    WHERE lower(email) = lower('coordinador@silabos.ai')
    LIMIT 1;

    -- 4) Docente Educacion Inicial.
    INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        role,
        career_id,
        status,
        auth_provider,
        approved_by,
        approved_at,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'docente.inicial@silabos.ai',
        v_demo_hash,
        'Docente Educacion Inicial',
        'docente',
        v_career_edu_id,
        'active',
        'local',
        v_admin_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        career_id = EXCLUDED.career_id,
        status = 'active',
        auth_provider = 'local',
        google_sub = NULL,
        approved_by = v_admin_id,
        approved_at = NOW();

    SELECT id
    INTO v_docente_inicial_id
    FROM users
    WHERE lower(email) = lower('docente.inicial@silabos.ai')
    LIMIT 1;

    -- 5) Docente Matematica.
    INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        role,
        career_id,
        status,
        auth_provider,
        approved_by,
        approved_at,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'docente.mate@silabos.ai',
        v_demo_hash,
        'Docente Matematica y Computacion',
        'docente',
        v_career_edu_id,
        'active',
        'local',
        v_admin_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        career_id = EXCLUDED.career_id,
        status = 'active',
        auth_provider = 'local',
        google_sub = NULL,
        approved_by = v_admin_id,
        approved_at = NOW();

    SELECT id
    INTO v_docente_mate_id
    FROM users
    WHERE lower(email) = lower('docente.mate@silabos.ai')
    LIMIT 1;

    -- Deja scopes exactos para las cuentas demo.
    UPDATE user_scope_assignments SET active = false WHERE user_id = v_director_id;
    UPDATE user_scope_assignments SET active = false WHERE user_id = v_coordinador_id;
    UPDATE user_scope_assignments SET active = false WHERE user_id = v_docente_inicial_id;
    UPDATE user_scope_assignments SET active = false WHERE user_id = v_docente_mate_id;

    INSERT INTO user_scope_assignments (
        id, user_id, scope_type, scope_id, active, assigned_by, created_at
    )
    VALUES (
        gen_random_uuid(), v_director_id, 'career', v_career_edu_id, true, v_admin_id, NOW()
    )
    ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE
    SET active = true, assigned_by = EXCLUDED.assigned_by;

    INSERT INTO user_scope_assignments (
        id, user_id, scope_type, scope_id, active, assigned_by, created_at
    )
    VALUES (
        gen_random_uuid(), v_coordinador_id, 'program', v_program_inicial_id, true, v_admin_id, NOW()
    )
    ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE
    SET active = true, assigned_by = EXCLUDED.assigned_by;

    INSERT INTO user_scope_assignments (
        id, user_id, scope_type, scope_id, active, assigned_by, created_at
    )
    VALUES (
        gen_random_uuid(), v_docente_inicial_id, 'program', v_program_inicial_id, true, v_admin_id, NOW()
    )
    ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE
    SET active = true, assigned_by = EXCLUDED.assigned_by;

    INSERT INTO user_scope_assignments (
        id, user_id, scope_type, scope_id, active, assigned_by, created_at
    )
    VALUES (
        gen_random_uuid(), v_docente_mate_id, 'program', v_program_mate_id, true, v_admin_id, NOW()
    )
    ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE
    SET active = true, assigned_by = EXCLUDED.assigned_by;
END $$;

-- ============================================================
-- Verificacion rapida post-seed
-- ============================================================

SELECT
    email,
    full_name,
    role,
    status,
    auth_provider
FROM users
WHERE lower(email) IN (
    'admin@silabos.ai',
    'director@silabos.ai',
    'coordinador@silabos.ai',
    'docente.inicial@silabos.ai',
    'docente.mate@silabos.ai'
)
ORDER BY email ASC;

SELECT
    u.email,
    usa.scope_type,
    usa.active,
    COALESCE(p.name, c.name) AS scope_name
FROM user_scope_assignments usa
JOIN users u ON u.id = usa.user_id
LEFT JOIN programs p ON usa.scope_type = 'program' AND p.id = usa.scope_id
LEFT JOIN careers c ON usa.scope_type = 'career' AND c.id = usa.scope_id
WHERE lower(u.email) IN (
    'director@silabos.ai',
    'coordinador@silabos.ai',
    'docente.inicial@silabos.ai',
    'docente.mate@silabos.ai'
)
ORDER BY u.email ASC, usa.scope_type ASC, scope_name ASC;

-- ============================================================
-- Opcional: si quieres que admin@silabos.ai tambien use la
-- password demo compartida, ejecuta luego este bloque:
--
-- UPDATE users
-- SET
--     password_hash = crypt('Silabos2026!', gen_salt('bf', 10)),
--     status = 'active'
-- WHERE lower(email) = lower('admin@silabos.ai');
-- ============================================================
