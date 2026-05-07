# Knowledge Map Routing

## Purpose

Guide agents working on the new Step 9 of the wizard: `Mapa Semanal de Conocimientos`. This step generates, audits, edits and confirms 16 weekly knowledge entries as the curricular truth. Once confirmed, the progressive unit engine cannot invent or modify the `knowledge` column; it only designs didactica, evidence, phase and technique around the approved knowledge.

## When To Read This

Read this before touching:

- `/creator/mapa-conocimientos`
- knowledge map prompt or audit logic
- weekly knowledge edits, lock/unlock flow on the map
- partial reprompt (`weeks_to_change[]`)
- the immutable knowledge constraint enforced inside `_unit_prompt`
- multi-agent unit memory (`approved_unit_memory`)
- syllabus_knowledge_maps table changes

## Key Files

- `silabos-frontend/src/pages/creator/Step8b_MapaConocimientos.tsx`
- `silabos-frontend/src/pages/creator/CreatorLayout.tsx`
- `silabos-frontend/src/App.tsx`
- `silabos-frontend/src/api/client.ts`
- `silabos-frontend/src/api/types.ts`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/services/supabase_service.py`
- `silabos-backend/database/migration_syllabus_knowledge_maps.sql`

## Endpoints And Contracts

- `GET  /api/syllabi/{id}/progressive/knowledge-map`
- `POST /api/syllabi/{id}/progressive/knowledge-map/suggest`
- `POST /api/syllabi/{id}/progressive/knowledge-map/reprompt`
- `PATCH /api/syllabi/{id}/progressive/knowledge-map/weeks/{week}`
- `POST /api/syllabi/{id}/progressive/knowledge-map/confirm`

Knowledge map week shape:

- `week`
- `unit_number`
- `knowledge` (mandatory, non-empty)
- `subtopics[]`
- `emphasis`
- `source_notes`
- `locked`
- `warnings[]` (`{week, code, message}`)

Audit shape (`audit_json`):

- `overall_signal`: `ok | soft_warnings | hard_block`
- `warnings`: list of soft warnings (REPETITION, VAGUE, EMPTY_KNOWLEDGE, OUT_OF_SCOPE)
- `repeated_pairs`: pairs of weeks flagged as semantically similar

## Data Flow

1. Step7 finishes selecting product. Frontend navigates to `/creator/mapa-conocimientos`.
2. Teacher pastes consolidated NotebookLM research and presses `Generar mapa con IA`.
3. Frontend queues `knowledge-map/suggest` (job `progressive_knowledge_map_suggest`).
4. Engine builds prompt with course, method profile, performances per unit, product, week->unit distribution and notebook context.
5. Engine retries up to 2 attempts across providers. Validates the candidate has 16 weeks with non-empty `knowledge` before accepting.
6. Engine runs heuristic audit (Jaccard >= 0.75 = repetition, very short = vague, empty = hard_block).
7. Backend stores draft via `guardar_knowledge_map_draft` (supersedes previous draft).
8. Teacher edits cards in-place, locks weeks they like, opens reprompt dialog and reescribes only unlocked or manually selected weeks (`weeks_to_change[]`).
9. Reprompt merges new entries into the draft and re-audits.
10. Teacher confirms. Engine validates 16 unique weeks with non-empty `knowledge`. Confirmation sets `status='confirmed'`, supersedes prior confirmed maps and stamps `confirmed_at`.
11. Step Programa (`/creator/programa`) reads `knowledge_map` from the progressive state and redirects to the map if not confirmed.
12. `_generate_or_regenerate_unit` loads the confirmed map, slices it for the unit, passes `mandatory_knowledge_map` to the engine and prompt, and forces `knowledge` field of each generated week.

## Tables / Persistence

- `syllabus_knowledge_maps` (id, syllabus_id, version, status, notebook_context_text, map_json, audit_json, teacher_notes, teacher_instruction, timestamps, confirmed_at)
- Unique partial index: only one `confirmed` map per syllabus.
- RLS owner select/insert/update/delete tied to `syllabi.user_id`.
- `ai_generation_jobs` accepts new `job_type` values: `progressive_knowledge_map_suggest`, `progressive_knowledge_map_audit`, `progressive_knowledge_map_reprompt`.

## Approved Decisions

- The wizard now has 12 steps total. New order: Producto -> Mapa de Conocimientos -> Evaluacion -> Programa -> Cierre.
- Confirmed map is the immovable truth for `knowledge`. The unit engine must not modify, expand or replace it.
- Reprompt parcial uses lock semantics on the cards: the teacher locks weeks they like; unlocked (or manually selected) weeks are sent in `weeks_to_change[]`.
- `Confirmar y continuar` is hard-blocked only if the map has fewer than 16 weeks or any week has empty `knowledge`. Soft warnings (repetition, vague) NEVER block confirmation.
- No determinist filler. If AI fails, surface the error; do not synthesise weeks.
- Multi-agent unit memory (`approved_unit_memory`) is included in `traceability_context` so unit N+1 avoids repeating activities/evidences/redaction of unit N.
- The unit prompt receives `mandatory_knowledge_by_week` as a hard rule; `_normalize_unit_weeks` enforces the mandatory `knowledge` value even if AI tries to override it.
- Existing syllabi without confirmed map are blocked from generating new units until they create and confirm one.

## Known Risks And Anti-Patterns

- Do NOT add fallback knowledge generation (`index % len()`, default texts). If AI produces less than 16 weeks, raise `ProgressiveContentGenerationError` and surface the error in the UI.
- Do NOT reuse `unit_prompt` to "improve" the knowledge. The map is the source of truth.
- Do NOT migrate jobs to a different table; reuse `ai_generation_jobs` with the dedicated `job_type` values.
- The `_queue_ai_generation_job` reuses any active job per user; if a unit job is running, the map suggest will return reused or 429. Surface the message clearly to the teacher.
- The audit is heuristic, not LLM-graded. If repetition detection misfires, the teacher overrides via the `Confirmar y continuar` button.
- The prompt for the map is intentionally focused on disciplinary logic. Do not push the product to dominate the topics.

## Cross-Module Impact

- product/evaluation: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- progressive units: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- traceability/coherence: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)
- final assembly: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- providers/jobs: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Suggested Verification

- `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine`
- `npm run build` from `silabos-frontend`
- Manual: select product, paste NotebookLM consolidated research, generate map, lock 4 weeks, reprompt the rest, confirm, generate Unit 1 and verify `week.knowledge` matches the map exactly. Generate Unit 2 and verify activities do not repeat memory of Unit 1.

## Recursive Update Notes

Update this file when the user accepts:

- changes to the map prompt (extra fields, new constraints)
- new audit codes or signals
- new lock/unlock semantics on the cards
- changes to the immutable-knowledge enforcement inside the unit engine
- changes to the wizard step count or path
