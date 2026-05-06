# Wizard Official Data Routing

## Purpose

Guide agents working on the creator wizard before the progressive product/unit engine. This area owns context selection, official course data, bibliography ingestion, official performances, official content, method selection, and grading block persistence.

## When To Read This

Read this before touching:

- `/creator/*` wizard steps before product/program
- `ContextSelector`
- `SyllabusContext`
- official performances/content/method data
- `saveStep` or draft payload shape
- datamining-derived course fields

## Key Files

- `silabos-frontend/src/pages/ContextSelector.tsx`
- `silabos-frontend/src/hooks/useAppContext.ts`
- `silabos-frontend/src/pages/creator/CreatorLayout.tsx`
- `silabos-frontend/src/context/SyllabusContext.tsx`
- `silabos-frontend/src/pages/creator/Step1_Repositorio.tsx`
- `silabos-frontend/src/pages/creator/Step2_Fuentes.tsx`
- `silabos-frontend/src/pages/creator/Step2A_NotebookGuide.tsx`
- `silabos-frontend/src/pages/creator/Step2A_1_ManualUpload.tsx`
- `silabos-frontend/src/pages/creator/Step2A_2_DeepResearch.tsx`
- `silabos-frontend/src/pages/creator/Step3_Desempenos.tsx`
- `silabos-frontend/src/pages/creator/Step4_Contenido.tsx`
- `silabos-frontend/src/pages/creator/Step5_Metodo.tsx`
- `silabos-frontend/src/pages/creator/Step6_Cierre.tsx`
- `silabos-frontend/src/api/client.ts`
- `silabos-backend/routers/progressive.py`
- `silabos-backend/routers/programs.py`
- `silabos-backend/routers/institutional.py`
- `silabos-backend/routers/documents.py`
- `silabos-backend/services/supabase_service.py`

## Endpoints And Contracts

Main wizard endpoints:

- `GET /api/institutional/faculties`
- `GET /api/institutional/careers?faculty_id=...`
- `GET /api/programs?career_id=...`
- `GET /api/courses?program_id=...`
- `GET /api/courses/{course_id}`
- `POST /api/syllabi/progressive`
- `GET /api/syllabi/{id}/progressive`
- `PATCH /api/syllabi/{id}/steps/{bibliography|purpose|content|method|grading}`
- `GET /api/syllabi/{id}/course-data`
- `GET /api/courses/{course_id}/performances`
- `POST /api/syllabi/{id}/steps/content/suggest`
- `GET /api/skills/suggest`
- `GET /api/methods`
- `POST /api/syllabi/{id}/steps/method/suggest`
- `POST /api/syllabi/{id}/steps/grading/suggest`
- document upload/reference endpoints in `routers/documents.py`

Saved draft payload blocks:

- `bibliography`
- `purpose`
- `content`
- `method`
- `grading`
- `final_syllabus`
- `_meta`
- `_workflow`
- `course_snapshot`

## Data Flow

1. `ContextSelector` stores institutional context in session storage through `useAppContext`.
2. `ContextGuard` blocks `/creator/*` without context.
3. `SyllabusContext.createOrLoadDraft()` creates or loads a `v3-progressive` draft for `course_id + semester + user_id + program_id`, including `fecha_inicio` and `fecha_fin`.
4. Step2 saves bibliography.
5. Step3 loads official performances and saves them in `purpose`.
6. Step4 merges official knowledge/skills with AI or catalog suggestions and saves `content`.
7. Step5 stores selected teaching method in `method`.
8. Step6 saves grading rows in `grading`.
9. Step7 and Step8 must preserve these blocks.

## Tables / Persistence

The backend uses `SupabaseService` with SQLAlchemy over `DATABASE_URL`. Do not assume Supabase SDK.

Important tables include:

- `users`
- `syllabi`
- `courses`
- `performances`
- `teaching_methods`
- `skills`
- `curriculum_docs`
- `course_bibliography_refs`
- `syllabus_ai_suggestions`

Use Supabase MCP or direct read-only SQL to verify actual production schema before DB changes.

## Approved Decisions

- Official curriculum rows from datamining are source-of-truth and must not be rewritten by AI.
- One unit generally maps to one official performance.
- Official performances are official data and must be respected as non-manipulable curriculum data.
- Earlier wizard steps already work; avoid broad refactors unless the user explicitly asks.
- Product/program steps are additional steps, not replacements for the previous wizard blocks.

## Known Risks And Anti-Patterns

- Some official-data endpoints are public by design. Be careful before changing auth behavior because frontend context loading may depend on it.
- `DRAFT_KEY = sigesil_draft_id` is session-level and can become stale after context changes.
- `guardar_step_block` receives `user_id`; verify ownership enforcement before security-sensitive edits.
- Step3 confirmation state can be UX-only; check saved payload, not UI assumptions.
- Step4 protects official chips in UI, but saved JSON does not deeply lock official vs teacher-added content.

## Cross-Module Impact

Any change here can affect:

- product suggestions: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- unit generation: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- DOCX export: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- DB/auth: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Suggested Verification

- Frontend build after TS changes: `npm run build` from `silabos-frontend`.
- Backend tests related to progressive blocks: `python -m unittest silabos-backend.tests.test_progressive_step_blocks`.
- Manually verify Step1 creates/loads the expected draft and Step6 persists grading before Step8.

## Recursive Update Notes

Update this file when the user accepts changes to:

- wizard step order
- official data handling
- draft payload block shape
- context selector date/program/course behavior
- auth ownership for draft reads/writes
