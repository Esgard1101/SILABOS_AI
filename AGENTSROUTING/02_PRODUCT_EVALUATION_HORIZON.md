# Product And Evaluation Horizon Routing

## Purpose

Guide agents working on product acreditable suggestions, PA timeline, product selection, and the evaluation system that grounds progressive content generation.

The product acreditable is the course horizon. PA1, PA2, PA3 are advances of the same product, not disconnected products.

## When To Read This

Read this before touching:

- `/creator/producto`
- `/creator/evaluacion`
- product option generation
- product selection
- grading rows and PA timeline
- any rule about concrete case/problem/project/challenge/research-question/CER evolution

## Key Files

- `silabos-frontend/src/pages/creator/Step7_ProductoIntegrador.tsx`
- `silabos-frontend/src/pages/creator/Step6_Cierre.tsx`
- `silabos-frontend/src/api/client.ts`
- `silabos-frontend/src/api/types.ts`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/services/supabase_service.py`
- `silabos-backend/database/migration_progressive_curriculum_engine_v1.sql`
- `silabos-backend/docs/progressive_curriculum_engine_v1.md`

## Endpoints And Contracts

- `GET /api/syllabi/{id}/progressive/state`
- `POST /api/syllabi/{id}/progressive/products/suggest`
- `GET /api/jobs/{job_id}`
- `POST /api/syllabi/{id}/progressive/products/select`
- `PATCH /api/syllabi/{id}/steps/grading`

Product option shape:

- `category`
- `title`
- `justification`
- `work_object`
- `work_object_type`
- `timeline_json`
- `selected`

The selected product must include a concrete `work_object` before Step8/Step9 can safely generate or assemble final content. `work_object_type` is nullable/compatibility metadata, but new AI suggestions should populate it from the method profile.

Do not add DB columns without checking live schema through Supabase MCP or approved SQL.

## Data Flow

1. Step7 loads progressive state and existing product options.
2. Teacher selects category and optionally pastes global NotebookLM product context.
3. Frontend calls `/products/suggest`, receives a `job_id`, and polls `/api/jobs/{job_id}`.
4. Backend builds product prompt from course, method, grading rows, category, and NotebookLM context.
5. Engine calls AI task `progressive_product_suggest`.
6. Options are stored in `curricular_product_options`.
7. Selecting an option sets exactly one selected option and writes a snapshot to `syllabi.payload_json.progressive_curriculum.selected_product`.
8. Step8 reads selected product through `_course_context` and should use it as a static horizon for unit generation.

## Tables / Persistence

- `curricular_product_options`
- `syllabi.payload_json.progressive_curriculum.selected_product`
- `syllabus_ai_suggestions`
- `ai_generation_jobs`
- `syllabi.payload_json.grading`

Use Supabase MCP to inspect actual table columns, indexes, constraints, and policies before schema changes.

## Approved Decisions

- Product must be concrete, university-level, and tied to the course method.
- Product suggestions may use NotebookLM consolidated research context.
- PA rows represent advances of one product, not multiple unrelated products.
- Product timeline must align with number of units/official performances.
- The concrete object of work must appear explicitly in activities and evolve into the product acreditable.
- Product cards must expose three visible areas: Producto Acreditable (`title`), Objeto de Trabajo (`work_object`) contextualized to UNPRG/Lambayeque, and PA timeline (`timeline_json`).
- Step9 must block final assembly when the selected product lacks `work_object`.

## Concrete Object Rule

It is not enough to say the course uses "a case", "a problem", "a project", "a challenge", "a research question", or "CER".

The object must be explicit and concrete.

Examples:

- Case: `Caso de un nino de 3 anos con signos de anemia y habitos alimenticios deficientes`.
- Problem: `Como interpretar un conjunto de datos escolares para tomar decisiones pedagogicas?`
- Project: `Diseno de una aplicacion movil para orientar habitos de estudio`.
- Challenge: `Como reducir residuos solidos en un aula de educacion inicial?`
- Research question: `Que caracteristicas tiene la percepcion docente sobre la evaluacion formativa en estudiantes de secundaria?`
- CER: `Que explicacion puede sostenerse sobre el fenomeno X a partir de los datos observados?`

This object must reappear through the weekly activities and be materialized in PA evidence.

## Known Risks And Anti-Patterns

- Step7 currently runs before Step6 evaluation, so product suggestions may see stale/default grading rows.
- Product options can accumulate after repeated suggestions.
- Selected product is stored both in table state and JSON snapshot; drift is possible.
- Current validator does not yet enforce product evolution explicitly.
- Avoid generic titles like `Portafolio integrador` without a concrete professional object.

## Cross-Module Impact

Product changes affect:

- unit generation: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- coherence/product evolution: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)
- final assembly/export: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- providers/jobs: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Suggested Verification

- `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine`
- `python -m unittest silabos-backend.tests.test_ai_routing`
- `npm run build` from `silabos-frontend`
- Manual flow: generate product, select it, define grading, generate a unit, verify activities mention the same concrete object.

## Recursive Update Notes

Update this file when the user accepts:

- new product option JSON fields
- new PA timeline logic
- new rules for product evolution
- changes to Step7/Step6 order
- validator penalties for generic product output
