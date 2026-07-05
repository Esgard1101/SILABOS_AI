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
- `POST /api/syllabi/{id}/progressive/products/questions` (SPEC-13, async job `progressive_product_questions`)
- `POST /api/syllabi/{id}/progressive/products/suggest` (accepts optional `hitl` block since SPEC-13)
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
- Step7 UI (SPEC-07, approved): product options render as a responsive glass card grid (1->2->3 cols), not table rows. `ProductOptionRow` was deleted. Each card: badge categoria dorado, titulo, teaser `work_object` line-clamp, chips `PAn · Sn`, CTAs "Ver desagregacion" + "Seleccionar", ring cyan + badge when selected.
- `ProductDetailModal` is a GlassModal `lg` with a VERTICAL PA timeline (PA1->PA2->PA3 nodes + cyan rail), a highlighted "Objeto de trabajo" panel, and full justification prose. No more 3 truncated columns.
- Accumulated-options dedupe is UI-only and deterministic: show the 3 most recent non-selected options (by `created_at` desc; missing `created_at` = freshly generated = newest) plus the selected one if any. No DB writes.
- Week chips ("S6", "Semana 6") are derived locally via regex `/semana\s+(\d+)/i` over `timeline_json` values. No new AI calls in render (CA-04).
- Card/modal "Seleccionar" is disabled when `work_object` is missing/pendiente (CA-01) and while a suggest job runs (CA-05). Select payload unchanged: `selectProgressiveProduct(draftId, option.id)`.
- (SPEC-13) Product HITL pattern (twin of RSU HITL): before generating options the teacher DESIGNS via `ProductDesignModal.tsx` (GlassModal lg cyan, 2 stages). Stage 1 = 4 fixed inputs (tipo_producto, vinculo_problema, alcance, formato_evidencia) + optional NotebookLM block (copiable prompt + paste box, shared with Step7's `notebookProductContext`). Stage 2 = 3-4 AI-tailored questions (chips + "mi propia idea"). "Generar 3 opciones" in Step7 opens this modal; a discreet "Generar sin cuestionario" link keeps the legacy no-hitl flow.
- (SPEC-13) `products/questions` is an async job (job_type `progressive_product_questions`, AI task `progressive_product_questions` on `gemini_light`). Engine method `suggest_product_questions` grounds questions in curso + method profile + grading/PA schedule + `payload.bibliography.references` + pasted notebook text; it must NOT re-ask what teacher_inputs already answered. No synthetic fallback: visible failure if AI fails.
- (SPEC-13) `products/suggest` accepts optional `hitl: {inputs, respuestas, notebook_context_text}`. `tipo_producto` maps to `category` (non-catalog values canonicalize to "Libre de proponer por IA" — the real constraint travels in the prompt's `teacher_design` hard block). Without `hitl` the legacy behavior is byte-identical. `selected_product`/`timeline_json` shapes unchanged.
- (SPEC-13) On suggest-with-hitl the backend persists `payload_json.progressive_curriculum.product_hitl` (via `supabase.guardar_product_hitl`); `/progressive/state` returns it inside `progressive_curriculum`, and Step7 prefills the questionnaire from it on regenerate (answers re-matched by question id/text).

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
