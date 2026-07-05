# Progressive Unit Generation Routing

## Purpose

Guide agents working on unit-by-unit content generation: NotebookLM unit context, async job flow, unit generation/regeneration, locked weeks, approval, and Step8 UI.

## When To Read This

Read this before touching:

- `/creator/programa`
- NotebookLM unit prompt
- unit context extraction
- progressive unit generate/regenerate endpoints
- locked weeks
- unit approval
- async `job_id + polling`

## Key Files

- `silabos-frontend/src/pages/creator/Step8_ProgramaProgresivo.tsx`
- `silabos-frontend/src/api/client.ts`
- `silabos-frontend/src/api/types.ts`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/services/supabase_service.py`
- `silabos-backend/database/migration_progressive_curriculum_engine_v1.sql`
- `silabos-backend/database/migration_ai_generation_jobs.sql`
- `silabos-backend/prompts/method_profiles.py`

## Endpoints And Contracts

- `GET /api/syllabi/{id}/progressive/state`
- `GET /api/jobs/{job_id}`
- `POST /api/syllabi/{id}/progressive/unit-contexts/{unit}/extract`
- `POST /api/syllabi/{id}/progressive/units/{unit}/generate`
- `POST /api/syllabi/{id}/progressive/units/{unit}/regenerate`
- `PATCH /api/syllabi/{id}/progressive/units/{unit}/weeks/{week}/lock`
- `PATCH /api/syllabi/{id}/progressive/units/{unit}/weeks/{week}`
- `POST /api/syllabi/{id}/progressive/units/{unit}/approve`

Generated week output must stay compatible with:

- `week`
- `unit_number`
- `performance`
- `required_skills`
- `skill`
- `knowledge`
- `activity`
- `evidence`
- `phase`
- `locked`
- `validation`

## Data Flow

1. Step8 builds a NotebookLM prompt for one unit and a strict week range.
2. Teacher pastes the unit context from NotebookLM or own notes.
3. Frontend queues `unit-contexts/{unit}/extract` and polls `/api/jobs/{job_id}`.
4. Backend stores raw context and extracted JSON in `syllabus_unit_contexts`.
5. Frontend queues `units/{unit}/generate` or `regenerate`.
6. Backend loads draft, official performances, content block, method, grading, selected product, saved unit context, and approved prior units.
7. Engine builds lightweight traceability context from approved previous units.
8. Engine calls `progressive_unit_generate`.
9. Engine validates expected weeks, phase/content/skill/evidence alignment, and robotic label rules.
10. If needed, engine attempts one repair through `progressive_unit_repair`.
11. Backend saves generation version and week validations.
12. Teacher can lock weeks, edit weeks manually, regenerate with instruction, or approve.

## Tables / Persistence

- `syllabus_unit_contexts`
- `syllabus_unit_generations`
- `syllabus_week_validations`
- `ai_generation_jobs`
- `curricular_product_options`
- `syllabi.payload_json`

## Approved Decisions

- Unit context is mandatory in UI to reduce generic output.
- NotebookLM provides inputs and weekly suggestions, not final syllabus text.
- (SPEC-11) Because unit engines depend on NotebookLM-sourced didactics, the wizard's Step Fuentes is mandatory upstream (gate: >=1 source before CONTINUAR). See [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md).
- Unit generation must be specialized and didactic, not generic.
- Activity phase and technique must be integrated naturally in prose.
- Do not show `Momento` or `Proposito` labels in final activity text.
- `Tecnicas:` as a literal label should not appear; technique should be in prose.
- Activities should be two sentences maximum when possible.
- Locked weeks must be preserved exactly during regeneration.
- Generation and regeneration must use async jobs and polling.

## Known Risks And Anti-Patterns

- `BackgroundTasks` are process-local; jobs can get stuck if the process restarts.
- Job reuse is per active user, not a full durable queue.
- Backend still allows empty context in some paths; UI enforces minimum context.
- Locked weeks can preserve old weak text.
- Unit week ranges must stay in sync between frontend and backend.
- Do not patch old `content_generation_engine.py` if the issue is in the new progressive unit flow, unless the old route is explicitly in scope.

## Cross-Module Impact

Unit generation depends on:

- official data: read [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md)
- product/evaluation: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- coherence/evolution: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)
- export: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- providers/jobs: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Suggested Verification

- `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine`
- `python -m unittest silabos-backend.tests.test_ai_routing`
- `npm run build`
- Manual: generate Unit 1, approve it, generate Unit 2, verify no repeated topics and product continuity.

## Recursive Update Notes

Update this file when user accepts:

- new NotebookLM prompt structure
- new unit JSON contract
- new regeneration/locking behavior
- new async job behavior
- new Step8 UX rules
