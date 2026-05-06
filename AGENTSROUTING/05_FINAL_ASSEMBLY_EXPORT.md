# Final Assembly And Export Routing

## Purpose

Guide agents working on final syllabus assembly, `final_syllabus`, DOCX/PDF export, `cronograma_semanal`, unit titles, and the `Semana (Fecha)` column.

Export is the final contract. If the DOCX is wrong, the system is wrong from the user's perspective.

## When To Read This

Read this before touching:

- `word_generator.py`
- `/api/syllabus/{id}/export`
- `/progressive/assemble`
- `/assemble-final`
- `final_syllabus`
- `cronograma_semanal`
- `unidades_tematicas`
- Word/PDF rendering
- date/week mapping

## Key Files

- `silabos-backend/services/word_generator.py`
- `silabos-backend/routers/syllabus.py`
- `silabos-backend/routers/progressive.py`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/services/supabase_service.py`
- `silabos-backend/tests/test_word_generator_dates.py`
- `silabos-frontend/src/pages/creator/Step9_CierreProgresivo.tsx`
- `silabos-frontend/src/pages/SyllabusFinalDelivery.tsx`
- `silabos-frontend/src/pages/SyllabusEditor.tsx`

## Endpoints And Contracts

- `GET /api/syllabus/{id}/export?format=docx|pdf`
- `POST /api/syllabi/{id}/assemble-final`
- `POST /api/syllabi/{id}/progressive/assemble`

Normalized schedule row contract:

- `semana`
- `fecha`
- `unit_number`
- `desempeno`
- `habilidades_requeridas`
- `conocimientos`
- `actividad`
- `evidencia`

Unit contract:

- `unit_number`
- `numero`
- `titulo`
- `weeks`
- `semanas`
- `logro` / `ra_unidad` / `desempeno`
- `required_skills` / `habilidades_requeridas`
- `temas`

Never add a third schedule schema. Normalize into this shape.

## Data Flow

1. Step9 calls `/progressive/assemble` after units are approved.
2. `progressive_curriculum_engine.assemble_units()` creates `unidades_tematicas` and `cronograma_semanal`.
3. `progressive_curriculum.py` enriches assembly with previous wizard steps.
4. `supabase_service.guardar_progressive_assembly()` writes `payload_json.final_syllabus` and top-level export fields.
5. Export endpoint loads `payload_json`.
6. `word_generator._prepare_export_payload()` overlays `final_syllabus`, then normalizes progressive content.
7. `_build_context()` builds DOCX/PDF context.
8. `_generar_docx_programatico()` renders Word.

## Approved Decisions

- The template generator was removed from the expected path; programmatic generator is the stable export route.
- DOCX must preserve corrected progressive content from new engine.
- Unit titles must come from content/unit knowledge, not generic `Unidad 1` unless no data exists.
- `Semana (Fecha)` must be calculated from `datos_generales.fecha_inicio` if row date is missing.
- Existing explicit row `fecha`, `date_range`, or `date` must be preserved.
- `fecha_fin` may be derived from `fecha_inicio` when missing.
- Do not create a new Roman-numbered Word section for Producto Acreditable. It must be visible transversally in Programa de Contenidos, Sistema de Evaluacion, Sistema de Calificacion, and Metodologia/Investigacion Formativa.
- Step9 `/progressive/assemble` must call AI for both `redactar_metodologia` and `redactar_tutoria`. Static fallback text is forbidden; if all providers fail or return empty text, fail visibly and do not save final_syllabus.
- Final assembly must preserve approved Step8 weeks; it may enrich PA evidence names and evaluation/calification metadata but must not regenerate approved units.

## Known Risks And Anti-Patterns

- Two assembly paths exist: `/assemble-final` and `/progressive/assemble`.
- `final_syllabus` overlay can hide stale top-level fields.
- Frontend editor may rebuild schedule without rebuilding units.
- If a module changes week shape and does not update `word_generator.py`, DOCX silently degrades.
- Encoding artifacts exist in older text; avoid adding new ones.
- `selected_product.work_object` is required for final assembly. Legacy products without it should be regenerated or reselected before Step9.

## Cross-Module Impact

Export depends on:

- official wizard blocks: read [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md)
- product/evaluation: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- generated units: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- coherence fields: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)

## Suggested Verification

- `python -m unittest silabos-backend.tests.test_word_generator_dates`
- `python -m py_compile silabos-backend/services/word_generator.py`
- Export a real DOCX after assembly and inspect:
  - Informacion General
  - Sumilla
  - Competencia
  - Capacidad
  - Programa de Contenidos
  - Semana (Fecha)
  - Metodologia
  - Tutoria
  - Referencias

## Recursive Update Notes

Update this file when user accepts:

- new export payload shape
- new DOCX section mapping
- new date/week calculation behavior
- new final assembly route behavior
- new fields from product or unit engines that must appear in Word/PDF
