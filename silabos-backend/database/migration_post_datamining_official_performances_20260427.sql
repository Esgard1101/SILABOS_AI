-- Migracion post-datamining de desempenos oficiales y contenido curricular.
-- Agrega required_skills a syllabus_units porque las habilidades requeridas
-- pertenecen a la unidad/desempeno, no a cada semana.

BEGIN;

DO $$
DECLARE
    missing_columns text[];
BEGIN
    SELECT array_agg(label)
    INTO missing_columns
    FROM (
        VALUES
            ('courses.competencia', 'courses', 'competencia'),
            ('courses.competencia_egreso', 'courses', 'competencia_egreso'),
            ('courses.capacidad', 'courses', 'capacidad'),
            ('courses.temas_conocimientos', 'courses', 'temas_conocimientos'),
            ('courses.habilidades_desempenos', 'courses', 'habilidades_desempenos'),
            ('courses.hours_theory', 'courses', 'hours_theory'),
            ('courses.hours_practice', 'courses', 'hours_practice'),
            ('performances.course_id', 'performances', 'course_id'),
            ('performances.code', 'performances', 'code'),
            ('performances.statement', 'performances', 'statement'),
            ('performances.display_order', 'performances', 'display_order')
    ) AS expected(label, table_name, column_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = expected.table_name
          AND c.column_name = expected.column_name
    );

    IF missing_columns IS NOT NULL THEN
        RAISE EXCEPTION 'Faltan columnas requeridas para datamining oficial: %', missing_columns;
    END IF;
END $$;

ALTER TABLE IF EXISTS syllabus_units
    ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN courses.competencia IS
    'Competencia oficial del curso minada desde el JSON maestro/anexo vigente.';
COMMENT ON COLUMN courses.capacidad IS
    'Capacidad oficial del curso minada desde el JSON maestro/anexo vigente.';
COMMENT ON COLUMN courses.temas_conocimientos IS
    'JSONB con conocimientos oficiales; recomendado: [{"codigo":"D1","items":[...]}].';
COMMENT ON COLUMN courses.habilidades_desempenos IS
    'JSONB con habilidades oficiales; recomendado: [{"codigo":"D1","items":[...]}].';
COMMENT ON TABLE performances IS
    'Desempenos oficiales por curso. La cantidad de filas define la cantidad de unidades didacticas.';
COMMENT ON COLUMN syllabus_units.required_skills IS
    'Habilidades requeridas de la unidad/desempeno. Array JSONB con 1..N habilidades oficiales y/o agregadas por el docente.';

/*
POST-DATAMINING

Formato esperado del JSON maestro:
[
  {
    "curso": "Catedra Pedro Ruiz Gallo",
    "is_common": true,
    "competencias": [{"competencia_texto": "...", "capacidad_texto": "..."}],
    "creditos_teoria": 32,
    "creditos_practica": 32,
    "desempenos": [
      {
        "codigo": "D1",
        "texto": "Texto oficial literal del desempeno",
        "conocimientos": ["Conocimiento 1", "Conocimiento 2"],
        "habilidades": ["Habilidad 1", "Habilidad 2"]
      }
    ]
  }
]

Patron de carga:

WITH source AS (
    SELECT *
    FROM jsonb_to_recordset($JSON_MAESTRO$[]$JSON_MAESTRO$::jsonb) AS x(
        curso text,
        is_common boolean,
        competencias jsonb,
        creditos_teoria int,
        creditos_practica int,
        desempenos jsonb
    )
),
updated_courses AS (
    UPDATE courses c
    SET
        competencia = (
            SELECT string_agg(item->>'competencia_texto', ' / ')
            FROM jsonb_array_elements(source.competencias) item
            WHERE nullif(item->>'competencia_texto', '') IS NOT NULL
        ),
        competencia_egreso = (
            SELECT string_agg(item->>'competencia_texto', ' / ')
            FROM jsonb_array_elements(source.competencias) item
            WHERE nullif(item->>'competencia_texto', '') IS NOT NULL
        ),
        capacidad = (
            SELECT string_agg(item->>'capacidad_texto', ' / ')
            FROM jsonb_array_elements(source.competencias) item
            WHERE nullif(item->>'capacidad_texto', '') IS NOT NULL
        ),
        hours_theory = source.creditos_teoria,
        hours_practice = source.creditos_practica,
        temas_conocimientos = (
            SELECT jsonb_agg(jsonb_build_object(
                'codigo', d->>'codigo',
                'items', coalesce(d->'conocimientos', '[]'::jsonb)
            ))
            FROM jsonb_array_elements(source.desempenos) d
        ),
        habilidades_desempenos = (
            SELECT jsonb_agg(jsonb_build_object(
                'codigo', d->>'codigo',
                'items', coalesce(d->'habilidades', '[]'::jsonb)
            ))
            FROM jsonb_array_elements(source.desempenos) d
        )
    FROM source
    WHERE c.name ILIKE '%' || source.curso || '%'
      AND c.is_common = coalesce(source.is_common, c.is_common)
    RETURNING c.id, source.desempenos
),
deleted_old AS (
    DELETE FROM performances p
    USING updated_courses uc
    WHERE p.course_id = uc.id
),
expanded_performances AS (
    SELECT
        uc.id AS course_id,
        d->>'codigo' AS code,
        d->>'texto' AS statement,
        row_number() OVER (PARTITION BY uc.id ORDER BY ordinality)::int AS display_order
    FROM updated_courses uc
    CROSS JOIN LATERAL jsonb_array_elements(uc.desempenos) WITH ORDINALITY AS perf(d, ordinality)
)
INSERT INTO performances (course_id, code, statement, display_order)
SELECT course_id, code, statement, display_order
FROM expanded_performances
WHERE nullif(statement, '') IS NOT NULL;
*/

COMMIT;

-- QUERY DE VERIFICACION PRE-MIGRACION
-- Ejecutar ANTES del UPDATE para ver qué cursos del JSON van a hacer match en la BD
-- y cuáles se van a quedar sin match (NO_MATCH)

WITH json_cursos(curso, is_common) AS (
    VALUES
    -- COMUNES
    ('Cátedra Pedro Ruiz Gallo',          true),
    ('Desarrollo personal',               true),
    ('Actividad física',                  true),
    ('Actividad física y salud',          true),
    ('Taller de expresiones artísticas',  true),
    ('Ciudadanía y Democracia',           true),
    ('Ambiente y desarrollo sostenible',  true),
    ('Lógica Simbólica',                  true),
    ('Fundamentos Matemáticos',           true),
    ('Herramientas digitales',            true),
    -- ESPECÍFICOS Ed. Física
    ('Comunicación',                      false),
    ('Quechua',                           false),
    ('Quechua Elemental',                 false),
    ('Inglés I: A1',                      false),
    ('Inglés II: A1+',                    false),
    ('Estrategias de aprendizaje',        false),
    ('Pensamiento Filosófico',            false),
    ('Teorías del Aprendizaje',           false),
    ('Psicología Cognitiva',              false),
    ('Pedagogía',                         false),
    ('Historia de la Educación',          false),
    ('Filosofía de la Educación',         false),
    ('Teoría Curricular',                 false),
    ('Planificación Didáctica',           false),
    ('Didáctica General',                 false),
    ('Evaluación de los Aprendizajes',    false),
    ('Tutoría',                           false),
    ('Gestión Educativa',                 false),
    ('Proyectos de Promoción Educativa',  false)
)
SELECT
    j.curso                         AS json_nombre,
    j.is_common                     AS json_is_common,
    c.id                            AS course_id,
    c.name                          AS db_nombre,
    c.is_common                     AS db_is_common,
    c.career_id,
    CASE
        WHEN c.id IS NULL THEN '❌ NO_MATCH'
        WHEN count(*) OVER (PARTITION BY j.curso) > 1 THEN '⚠️  MULTI_MATCH (' || count(*) OVER (PARTITION BY j.curso)::text || ' filas)'
        ELSE '✅ OK'
    END AS estado
FROM json_cursos j
LEFT JOIN courses c
    ON c.name ILIKE '%' || j.curso || '%'
   AND c.is_common = j.is_common
ORDER BY estado DESC, j.curso;
