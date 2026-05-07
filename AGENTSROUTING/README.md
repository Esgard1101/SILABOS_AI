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
- weekly knowledge map (Step 9), immutable curricular truth, audit with soft warnings, partial reprompt: read [07_KNOWLEDGE_MAP.md](07_KNOWLEDGE_MAP.md)

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

This folder intentionally has 8 markdown files total:

1. `README.md`
2. `01_WIZARD_OFFICIAL_DATA.md`
3. `02_PRODUCT_EVALUATION_HORIZON.md`
4. `03_PROGRESSIVE_UNIT_GENERATION.md`
5. `04_TRACEABILITY_COHERENCE_EVOLUTION.md`
6. `05_FINAL_ASSEMBLY_EXPORT.md`
7. `06_AI_PROVIDERS_DB_OPERATIONS.md`
8. `07_KNOWLEDGE_MAP.md`


# ADDENDUM: Arquitectura "Mapa de Conocimientos" y Triple Coherencia (V2)

## 1. Contexto y Problema Resuelto
Se detectó que el motor de generación curricular sufría del **"Síndrome del método vacío"** y repetición cíclica: 
* La IA y el código Python (`index % len()`) repetían el mismo conocimiento en las últimas semanas de una unidad al quedarse sin temas base de la BD (que suele tener solo de 5 a 9 temas macro para 16 semanas).
* Las actividades y evidencias se robotizaban ("PA1: Ficha de grupo"), sin concretizar el aprendizaje de la semana.

**Solución Arquitectónica:** Separar el "Qué" (Contenido) del "Cómo" (Didáctica) mediante la inserción de un nuevo paso obligatorio antes de generar unidades.

---

## 2. Nuevo Step: Mapa Semanal de Conocimientos (Paso 9)
Se crea una pantalla exclusiva donde el docente define el "esqueleto" temático del semestre.
* **Obligatoriedad:** Step obligatorio ubicado después de definir el Producto Acreditable (PA) y antes del Programa Progresivo (ahora Paso 11).
* **Estructura Estricta:** Genera exactamente 16 nodos (1 por semana). Cada nodo contiene un conocimiento principal obligatorio y subtemas opcionales.
* **Input Híbrido:** La IA desglosa el mapa usando Sumilla + Desempeños + Temas Base + PA + Método.
* **Inmutabilidad (Ground Truth):** Una vez que el docente aprueba este mapa, los conocimientos de las 16 semanas se vuelven **inmutables**. El motor de unidades tiene estrictamente prohibido alterarlos, resumirlos o inventar nuevos.

---

## 3. Paradigma UX/UI y "Human-in-the-Loop"
Para mantener el control del docente sin sacrificar fluidez, se implementaron las siguientes reglas de interfaz:
* **Layout Horizontal / Extra Small Cards:** Representación visual en formato línea de tiempo o grid ligero. Las semanas se ven como micro-tarjetas para evaluar la progresión cognitiva de un vistazo.
* **Soft Warnings (Agente Validador):** Si la IA detecta temas semánticamente repetidos, NO bloquea al usuario. Muestra un "warning" visual (ej. borde amarillo) sugiriendo revisión.
* **Confirmación Forzada:** El botón "Confirmar y Continuar" siempre está activo (override docente), excepto si el JSON está incompleto (faltan semanas) o un campo de conocimiento está vacío.
* **Reprompting Parcial (Icono Candado):** Para corregir mapas débiles, el docente usa un ícono de "candado" en las semanas que le gustan. El reprompting solo envía al backend las semanas desbloqueadas (`weeks_to_change[]`), dejando el resto intacto.

---

## 4. Redefinición del Rol de NotebookLM
Dado que el Mapa de Conocimientos ahora dicta el "Qué", NotebookLM se restringe puramente a la **Didáctica (El "Cómo")**.
* **Integración en el Prompt:** La función `buildUnitNotebookPrompt` ahora inyecta el array de `knowledgeMapWeeks` filtrado por la unidad actual bajo la etiqueta *"CONOCIMIENTOS INMUTABLES"*.
* **Tarea Restringida:** Se le prohíbe a NotebookLM inventar temas. Su única tarea es usar la bibliografía cargada para proponer Dinámicas (Operaciones Cognitivas + Actividad + Técnica) y Evidencias para enseñar *exactamente* el tema fijado en el mapa para esa semana.

---

## 5. Corrección del Motor (Evidencias y el PA)
Se corrigió la "obsesión" del LLM por etiquetar todas las evidencias semanales como el Producto Acreditable (ej. `PA1: Mapa conceptual`).
Se agregaron dos `hard_rules` críticas en `progressive_curriculum_engine.py` (`_unit_prompt`):
1. **Regla Formativa:** Prohibido usar prefijos como 'PA1:', 'PA2:' en semanas ordinarias. Deben ser evidencias formativas simples.
2. **Regla Sumativa:** El Producto Acreditable (PA) solo puede aparecer como evidencia en las semanas exactas de presentación/sustentación dictadas por el `timeline_json` del producto seleccionado.

---
**Estado Final:** El pipeline ahora garantiza una **Triple Coherencia real** (Conocimiento exacto -> Actividad procesada -> Evidencia tangible), eliminando repeticiones y alucinaciones de contenido.