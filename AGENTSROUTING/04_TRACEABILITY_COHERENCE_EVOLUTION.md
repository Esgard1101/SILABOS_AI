# Traceability, Coherence, And Product Evolution Routing

## Purpose

Guide agents working on the core didactic quality engine: triple coherence, memory windowing, non-generic activity generation, and product evolution from a concrete object into PA evidence.

This is the most important quality module. Read it whenever generated syllabus content feels generic, vague, or disconnected from the product acreditable.

## When To Read This

Read this before touching:

- activity generation prompts
- validation scoring
- repair prompts
- traceability context
- product evolution rules
- method phase mapping
- anti-robotic wording rules

## Key Files

- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/services/content_generation_engine.py`
- `silabos-backend/prompts/method_profiles.py`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/tests/test_progressive_curriculum_engine.py`
- `silabos-backend/tests/test_content_generation_engine.py`
- `silabos-backend/docs/progressive_curriculum_engine_v1.md`

## Core Formula

Weekly activity must satisfy triple coherence:

- methodological coherence: activity belongs to the method phase
- cognitive coherence: student performs an operation on the weekly knowledge
- formative coherence: official skill is mobilized and observable in evidence

Expanded formula:

`method phase + operation on knowledge + official skill + technique + verifiable evidence + concrete object continuity`

Concrete object continuity is enforced through `selected_product.work_object` and weekly validation metadata such as `work_object_score`.

## Product Evolution Rule

The course cannot merely mention a generic case, problem, project, challenge, research question, or CER.

The object must be explicit in activities and must evolve into the product acreditable.

Bad:

- `Students analyze a case and prepare a report.`
- `Students develop the project through collaborative work.`
- `The activity contributes to the integrative product.`

Good:

- `A partir del caso de un nino de 3 anos con signos de anemia y habitos alimenticios deficientes, los estudiantes contrastan indicadores nutricionales con registros familiares mediante ficha de analisis comparativo. La evidencia es una matriz diagnostica que alimenta el PA1 del protocolo de intervencion alimentaria.`

The object should be available to the engine as structured metadata, not only as prompt prose, when this is implemented.

## Traceability Model

Use memory windowing, not full previous-unit dumping.

Current lightweight context should contain:

- completed weeks
- covered knowledge
- last delivered evidence

Future recommended additions:

- central concrete object
- product evolution stage
- next PA target
- unresolved decisions or assumptions

Never regenerate approved previous units just to build continuity.

## Approved Decisions

- Do not use cyclic modulo phase mapping when closing a unit. Closing weeks must map to review/socialization/evaluation phases.
- Do not inject method phases by brute-force string concatenation.
- Do not use literal labels: `Fase:`, `Momento:`, `Proposito:`, `Tecnicas:`, `Evidencia:`.
- Phase and technique must be integrated in prose.
- If literal robotic labels appear, validator should cap score near 6 and diagnose prose failure.
- Autorepair can be attempted once; do not loop forever.
- No synthetic filler fallback content. Provider fallback is allowed; filler text is not.
- Official performances must not be rewritten.

## Known Risks And Anti-Patterns

- Validator is heuristic. It catches visible patterns, not full semantic product continuity.
- Product selected in Step7 is not currently rich enough to force concrete object evolution.
- `timeline_json` may drift from final grading rows if Step6 changes after Step7.
- Repair can fix labels but may not fix generic content.
- Locked weeks preserve content even if later rules improve.
- Old content engine may have better object-of-work wording than new progressive engine; avoid copying old failures blindly.
- Generic mentions such as `analisis del caso`, `desarrollo del proyecto`, or `resolucion del problema` are insufficient unless the concrete case/project/problem is named in the activity or evidence.
- The visible phase belongs inside activity prose or Step8 review chips; do not add a Word column for method phase.

## Cross-Module Impact

Changes here affect:

- product selection: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- unit generation: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- export: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- providers: read [06_AI_PROVIDERS_DB_OPERATIONS.md](06_AI_PROVIDERS_DB_OPERATIONS.md)

## Suggested Verification

- Add tests in `test_progressive_curriculum_engine.py` for product continuity.
- Test that activities explicitly mention the concrete object.
- Test that PA evidence names the same object progression.
- Test that robotic labels cap validation score.
- Run `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine`.

## Recursive Update Notes

Update this file whenever the user accepts:

- a new concrete-object schema
- a new validation dimension
- a new product evolution rule
- a new anti-generic prompt rule
- new examples of acceptable or unacceptable activity prose
