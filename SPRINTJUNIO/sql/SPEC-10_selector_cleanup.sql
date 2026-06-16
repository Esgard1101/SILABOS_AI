-- ============================================================================
-- SPEC-10 · T10b — Limpieza del selector: facultades vacías
-- Proyecto Supabase: xmaqkiqigrmohrzgemro (silabos-mvp)
-- Diagnóstico ejecutado 2026-06-16 vía MCP Supabase (read-only).
-- ============================================================================
-- HALLAZGO:
--   El selector arranca por FACULTAD. Hay 3 facultades pero solo 1 tiene data.
--   Las otras 2 están vacías (0 carreras / 0 programas / 0 cursos) y son
--   callejones sin salida en el selector. Los CURSOS están perfectos.
--
--   Facultad                                          carreras prog cursos
--   Ciencias Histórico Sociales y Educación              1       8   466  <- REAL
--   Facultad de Educación                                0       0     0  <- BASURA
--   Facultad de Ingeniería                               0       0     0  <- BASURA
--
--   FK confirmada: solo careers.faculty_id referencia faculties.
--   Las 2 vacías tienen 0 careers -> DELETE seguro, sin huérfanos.
--
-- REGLAS:
--   * `faculties` es tabla protegida (source-of-truth). El OWNER ejecuta esto.
--   * El AGENTE no corre DELETE en prod.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- FASE 1 — VERIFICACIÓN (re-confirmar antes de borrar)
-- ----------------------------------------------------------------------------
SELECT f.id, f.name AS facultad,
       COUNT(DISTINCT c.id) AS n_carreras,
       COUNT(DISTINCT p.id) AS n_programas,
       COUNT(DISTINCT co.id) AS n_cursos
FROM faculties f
LEFT JOIN careers  c ON c.faculty_id = f.id
LEFT JOIN programs p ON p.career_id  = c.id
LEFT JOIN courses  co ON co.program_id = p.id
GROUP BY f.id, f.name
ORDER BY n_cursos DESC, facultad;
-- Esperado: solo "Ciencias Histórico Sociales y Educación" con cursos > 0.


-- ----------------------------------------------------------------------------
-- FASE 2 — LIMPIEZA (LISTO PARA EJECUTAR — owner aprobó el borrado 2026-06-16)
-- ----------------------------------------------------------------------------
-- Borra las 2 facultades vestigiales del inicio (Educación e Ingeniería), vacías.
-- En transacción: debe reportar 2 filas. Si no, hacer ROLLBACK.

BEGIN;

  DELETE FROM faculties
  WHERE id IN (
    'f48204c3-9180-4f9b-b8f8-8266ea3d494a',  -- Facultad de Educación (vacía)
    '920a5901-6e93-4f93-b750-0f4964999638'   -- Facultad de Ingeniería (vacía)
  );

COMMIT;

-- Verificación post-borrado: debe quedar 1 sola facultad.
SELECT id, name FROM faculties ORDER BY name;

-- ----------------------------------------------------------------------------
-- DEFENSA EN FRONTEND (opcional, complementa el borrado):
-- En ContextSelector.tsx, tras cargar facultades, ocultar las que no traen
-- carreras/programas. Así el selector queda blindado aunque vuelva a entrar
-- una facultad vacía en el futuro.
-- ----------------------------------------------------------------------------
