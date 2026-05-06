# AGENTSROUTING

This folder is for AI agents only. It is an operational routing map, not user-facing documentation.

Before editing any module, read this index, then read the specific module file listed below. If a change touches several modules, read all linked files first.

## Recursive Update Rule

Every agent must update the relevant AGENTSROUTING file when a work loop reaches an accepted stopping point. Treat phrases like these as signals:

- "ya quedo"
- "ya terminamos casi"
- "esta perfecto"
- "asi queda"
- "aprobado"
- "solo falta cerrar"
- "listo para produccion"

When that happens, update the relevant MD with:

- new approved architecture decisions
- new anti-patterns discovered
- files/endpoints/tables that became part of the module
- tests or verification commands that caught regressions
- user-approved wording/rules that future agents must not forget

Do not update routing docs for speculative work, failed experiments, or ideas the user has not accepted.

## Read-First Routing

If you need to touch...

- wizard steps, context selector, official curriculum data, datamining-derived fields: read [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md)
- product acreditable, PA timeline, evaluation system, product selection: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- NotebookLM context, unit generation UI, progressive unit endpoints, locks/regeneration/jobs: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- triple coherence, traceability, product evolution, non-generic activity rules: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)
- final assembly, Word/PDF export, `final_syllabus`, `cronograma_semanal`, DOCX: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- AI provider routing, costs, fallbacks, Supabase/Postgres persistence, auth/security: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Global Non-Negotiable Decisions

- Do not use synthetic filler fallbacks for syllabus content. If AI generation fails, use provider fallback/cascade and fail visibly if all providers fail.
- Official curriculum data is not editable by AI. Official performances, official knowledge, official skills, method catalog data, sumilla, competence, capacity, and course result must be treated as source-of-truth.
- The progressive unit engine must produce useful university-level didactic content, not generic schedule text.
- Activities must be written in prose, not with rigid labels such as `Fase:`, `Momento:`, `Proposito:`, `Tecnicas:`, or `Evidencia:`.
- A concrete object of work must be explicit: case, problem, project, challenge, research question, or CER claim-evidence-reasoning object.
- That object must evolve into the product acreditable; it cannot disappear after product selection.
- Step8 does not write the final syllabus. It creates approved unit generations. Step9/assembly writes the final export payload.
- DOCX/PDF export is the final contract. Any module that changes content shape must verify export mapping.

## Standard MD Structure

Each module file follows this shape:

- Purpose
- When To Read This
- Key Files
- Endpoints And Contracts
- Data Flow
- Tables / Persistence
- Approved Decisions
- Known Risks And Anti-Patterns
- Cross-Module Impact
- Suggested Verification
- Recursive Update Notes

If you create a new module file later, keep this structure unless there is a strong reason not to.

## Current Module Count

This folder intentionally has 7 markdown files total:

1. `README.md`
2. `01_WIZARD_OFFICIAL_DATA.md`
3. `02_PRODUCT_EVALUATION_HORIZON.md`
4. `03_PROGRESSIVE_UNIT_GENERATION.md`
5. `04_TRACEABILITY_COHERENCE_EVOLUTION.md`
6. `05_FINAL_ASSEMBLY_EXPORT.md`
7. `06_AI_PROVIDERS_DB_OPERATIONS.md`
