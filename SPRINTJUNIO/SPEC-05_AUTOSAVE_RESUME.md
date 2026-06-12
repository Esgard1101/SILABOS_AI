# SPEC-05 — Autosave reforzado + resume: "continuar tu último sílabo"

**Proyecto:** SIGEISIL · **Sobre:** frontend + backend (drafts progresivos)
**Estado:** LISTO PARA EJECUTAR
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` (draft payload, DRAFT_KEY, ownership) + `AGENTSROUTING/06_AI_PROVIDERS_DB_OPERATIONS.md` (persistencia)

---

## 1. Resumen y objetivo

Problema real del docente: cierra la ventana, se le cae el internet o lo llaman a otra cosa a mitad del sílabo. Hoy el avance por bloques SÍ se guarda (`saveStep` → `PATCH /steps/{key}`), pero **no hay camino de regreso**: el `draft_id` vive en `sessionStorage` (muere con la pestaña), nada registra en qué paso quedó, y el dashboard no ofrece retomar.

Entregable: cada avance persiste su "posición" en el draft, y existe un endpoint para recuperar el último draft en progreso + un flujo de restauración completa (contexto institucional → hidratación → navegación al paso exacto). La card visual del dashboard es SPEC-06; esta SPEC entrega la mecánica E2E con un punto de entrada provisional.

---

## 2. Glosario y datos

- **Entidad principal:** `syllabi` (draft `v3-progressive`), bloque nuevo dentro de `payload_json._meta`.
- **Identificador de acceso:** `user_id` del JWT — el endpoint nuevo SOLO devuelve drafts del usuario autenticado (riesgo conocido: hay lecturas sin filtro de user en el backend; aquí el filtro es obligatorio).
- **Shape nuevo (en `payload_json._meta.resume`):**
  ```json
  {
    "last_route": "/creator/evaluacion",
    "last_step": 10,
    "step_label": "Evaluacion",
    "updated_at": "2026-06-12T15:04:05Z"
  }
  ```
- **Archivos que modifica:** backend `routers/progressive.py` (+`services/supabase_service.py`), frontend `context/SyllabusContext.tsx`, `pages/creator/CreatorLayout.tsx`, `api/client.ts`, `hooks/useAppContext.ts` (solo lectura para rebuild).
- **Tablas:** ninguna nueva (todo en `payload_json`). Verificar columnas reales con Supabase MCP antes de asumir índices.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] **Persistir posición:** `CreatorLayout` (efecto sobre `pathname`) llama `api.saveResumeState(draftId, {last_route, last_step, step_label})` con debounce; backend lo escribe en `payload_json._meta.resume` + `updated_at`.
  - **Decisión (REC):** endpoint dedicado `PATCH /api/syllabi/{id}/resume-state` (payload mínimo, no pasa por la allowlist de bloques de `steps/{key}` y no ensucia `_workflow`). Alternativa descartada: abusar de `steps/meta` (mezcla semántica de bloques curriculares con telemetría de navegación).
- [ ] **Endpoint de recuperación:** `GET /api/syllabi/progressive/latest` → draft más reciente del user con `status` borrador y `_meta.resume` presente. Respuesta resumen: `{id, course_id, course_name, semester, program_id, last_route, step_label, progress_pct, updated_at}`. `progress_pct` derivado de `_workflow` (bloques con status ≠ vacío / total de bloques) — cálculo server-side simple, sin IA.
- [ ] **Flujo de restauración (frontend):** función `resumeDraft(summary)`:
  1. reconstruye el contexto institucional desde `course_snapshot`/datos del draft (cubre el caso DRAFT_KEY/contexto perdidos — riesgo documentado en routing 01),
  2. setea `DRAFT_KEY`,
  3. navega a `last_route` (ContextGuard pasa porque el contexto ya fue reconstruido),
  4. `SyllabusProvider.createOrLoadDraft()` hidrata los bloques como hoy.
- [ ] **Punto de entrada provisional:** botón "Continuar último sílabo" simple en el Dashboard (lo embellece SPEC-06).
- [ ] **DRAFT_KEY a localStorage** (coherente con SPEC-02) para sobrevivir cierre de pestaña.

### Fuera de alcance

- Lista multi-draft "todos mis borradores con resume" (SPEC-06 muestra el más reciente; lista completa ya existe en Mis Sílabos).
- Warning `beforeunload` (stretch del sprint, solo si sobra tiempo en esta tarea).
- Conflictos multi-dispositivo (last-write-wins implícito; documentar).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** NO (entrada provisional; el diseño final es de SPEC-06).
- **Contrato API (walkthrough estilo Postman):**
  - `PATCH /api/syllabi/{id}/resume-state` + JWT → 200 `{success:true}`; 401 sin token; 403/404 si el draft no es del user.
  - `GET /api/syllabi/progressive/latest` + JWT → 200 con summary o `{data:null}` si no hay borradores; NUNCA devuelve drafts de otro user.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Cierre brutal):** Docente avanza hasta `/creator/evaluacion`, mata la pestaña sin "guardar" → al volver a loguearse, `latest` devuelve ese draft con `last_route=/creator/evaluacion` y el resume lo deja exactamente ahí con sus datos hidratados.
- **CA-02 (Aislamiento):** El endpoint `latest` jamás devuelve drafts de otro `user_id` (test obligatorio).
- **CA-03 (Draft completado):** Drafts con `final_syllabus` ensamblado/aprobado no aparecen en `latest`.
- **CA-04 (Contexto divergente):** Si el user tiene contexto activo de OTRO curso y pulsa continuar → el contexto se reemplaza por el del draft (sin merge silencioso).
- **CA-05 (Sin red al guardar posición):** El fallo de `resume-state` es no-crítico: no bloquea la navegación (catch silencioso, igual que `saveStep` hoy).
- **CA-06 (Draft legacy):** Draft sin `_meta.resume` (creado antes del sprint) → `latest` cae al primer paso con datos (`/creator/repositorio`) en vez de excluirlo.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Avanzo el sílabo de prueba hasta evaluación, cierro la ventana, reabro la app, login → "Continuar último sílabo" me deja en evaluación con mis filas de calificación intactas.
- [ ] Repito cerrando en `producto` → vuelve a `producto`.

**🤖 DoD-Técnico (agente, automático):**
- [ ] Tests backend nuevos: `resume-state` ownership (401/403/404/200) + `latest` aislamiento por user + draft legacy sin resume. Suite: `python -m unittest silabos-backend.tests.test_progressive_resume` (nueva).
- [ ] `python -m unittest silabos-backend.tests.test_progressive_step_blocks` sigue verde (no se rompió la allowlist de bloques).
- [ ] `npm run build` en verde.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T4 (esta SPEC) | Feature E2E (API+UI) | NO | T1 (auth estable) | [ ] |
