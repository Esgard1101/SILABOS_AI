# SPEC-09 — Módulo "Documento de Proyecto" post-wizard (guía del estudiante para el PA)

**Proyecto:** SIGEISIL · **Sobre:** módulo NUEVO frontend + backend (fuera del wizard)
**Estado:** LISTO PARA EJECUTAR (mockup pendiente; sub-slices declarados)
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` (producto/objeto de trabajo) + `AGENTSROUTING/06_AI_PROVIDERS_DB_OPERATIONS.md` (OBLIGATORIO: routing de providers, jobs async, FinOps) + `AGENTSROUTING/05_FINAL_ASSEMBLY_EXPORT.md` (para NO tocar su contrato)

---

## 1. Resumen y objetivo

Idea del user aterrizada: los docentes tienen el producto acreditable generado con Human-in-the-loop, pero los **estudiantes** no reciben un documento-guía de qué redactar/entregar. Este módulo genera ese documento: la guía del proyecto que los alumnos seguirán para construir el PA, con **estructura precargada según la metodología del curso** (ABP/proyecto, estudio de caso, CER, pregunta de investigación…), **formato APA 7**, generación IA **por sección** y edición Human-in-the-loop del docente. Exporta su **propio DOCX**, separado del sílabo (decisión del user: módulo post-wizard; el contrato de export del sílabo NO se toca).

Acceso: desde Dashboard/Mis Sílabos, acción "Generar guía de proyecto" disponible para sílabos con `selected_product` (con `work_object` válido).

---

## 2. Glosario y datos

- **Entidad principal (nueva tabla):** `syllabus_project_docs`
  - `id` UUID PK · `syllabus_id` FK → `syllabi` (único: 1 guía viva por sílabo este sprint) · `user_id` FK → `users` (ownership) · `status` (`draft|ready`) · `content_json` (secciones) · `method_profile` (slug de plantilla usada) · `created_at` / `updated_at`.
  - **Antes de crear la migración: inspeccionar schema vivo vía Supabase MCP** (regla del routing 06). Migración SQL en `silabos-backend/database/`.
- **`content_json` shape:**
  ```json
  {
    "sections": [
      { "key": "caratula", "title": "Carátula", "body": "...", "origin": "template|ai|teacher", "locked": false }
    ],
    "apa": { "citation_style": "APA 7" }
  }
  ```
- **Inputs de generación (todos existentes, solo lectura):** `selected_product` (title, work_object, timeline_json), método (`payload_json.method`), sumilla/curso (`course_snapshot`), mapa de conocimientos si existe, bibliografía del draft (para referencias APA reales — **prohibido inventar referencias**: solo las del bloque `bibliography`).
- **Identificador de acceso:** `user_id` del JWT en todos los endpoints (ownership del sílabo).
- **Archivos nuevos:** backend `routers/project_docs.py`, `services/project_doc_service.py`, `services/project_doc_generator.py` (DOCX propio — NO tocar `word_generator.py`), migración SQL, tests. Frontend: `pages/ProjectDocEditor.tsx` (+ruta `/project-doc/:syllabusId`), entrada en SyllabusList/Dashboard.

---

## 3. Alcance — degradado en 3 sub-slices verticales (gatillo real: multi-pantalla + IA + export)

### T9a — Estructura + persistencia + editor SIN IA (testeable solo)
- [ ] Tabla + migración + CRUD: `POST /api/syllabi/{id}/project-doc` (crea desde plantilla), `GET`, `PATCH .../sections/{key}` (guardar edición docente, autosave con debounce).
- [ ] **Plantillas precargadas por metodología** (estático en backend, sin IA): mapeo `method_profile → secciones`. Base común: Carátula · Presentación del proyecto · Objeto de trabajo · Objetivos · Cronograma de avances (PA1/PA2/PA3 desde `timeline_json`) · Estructura del informe · Criterios de evaluación (desde `grading`) · Formato y citación APA 7 · Referencias. Variantes: proyecto/ABP (+Plan de trabajo, +Prototipo), caso (+Análisis del caso), CER (+Afirmación-Evidencia-Razonamiento), investigación (+Pregunta y antecedentes).
- [ ] Editor 2 paneles: índice de secciones (estado: plantilla/IA/editado + candado por sección) | editor de texto de la sección activa. Header con curso + producto. Todo glass sobre navy.
- **DoD T9a:** abro la página desde un sílabo con producto, veo estructura según metodología con datos reales precargados (cronograma PA, criterios), edito y persiste tras F5. `python -m unittest silabos-backend.tests.test_project_docs` (CRUD + ownership) verde.

### T9b — Generación IA por sección con Human-in-the-loop
- [ ] Task nueva `project_doc_generate` en `TASK_CONFIGS`. **Routing (REC, regla FinOps):** familia `openrouter_light` → cascada OpenRouter/NVIDIA → Mistral final. NO Google/OpenAI (no es del set crítico ni feeder del DOCX del sílabo; el HITL compensa). Si el user decide subir calidad, el cambio es 1 línea de config — dejar comentario señalándolo.
- [ ] `POST /api/syllabi/{id}/project-doc/generate` (todo el doc) y `POST .../sections/{key}/generate` (una sección) → **job async** (`ai_generation_jobs`, contrato `pending|running|done|error` + poll `GET /api/jobs/{job_id}` — mismo patrón existente).
- [ ] Reglas de prompt: redactar PARA el estudiante (segunda persona), prosa sin etiquetas rígidas, el `work_object` concreto aparece explícito, cronograma respeta `timeline_json`, referencias SOLO de la bibliografía del draft. Secciones con `locked=true` jamás se regeneran (patrón candado del Mapa de Conocimientos).
- [ ] Sin fallback sintético: si la cascada se agota, error visible en la sección y el texto previo queda intacto.
- **DoD T9b:** genero borrador completo del doc del curso de prueba; regenero UNA sección desbloqueada y las bloqueadas no cambian. `test_ai_routing` extendido con la task nueva, verde.

### T9c — Export DOCX APA 7
- [ ] `GET /api/syllabi/{id}/project-doc/export?format=docx` con `project_doc_generator.py` propio: carátula institucional (UNPRG/FACHSE, curso, docente, periodo), cuerpo por secciones con estilos (títulos jerárquicos, interlineado legible), bloque Referencias en formato APA 7 (hanging indent).
- [ ] Botón "Descargar guía (DOCX)" en el editor; deshabilitado si hay secciones vacías obligatorias (carátula, presentación, cronograma).
- **DoD T9c:** descargo el DOCX y las secciones/referencias se ven correctas. `python -m py_compile` del generator + test de export con doc mínimo. `test_word_generator_dates` sigue verde (sanity: el export del sílabo no fue tocado).

### Fuera de alcance (todo el módulo)
- PDF de la guía, versionado/historial, compartir link público a estudiantes, detección de plagio, edición colaborativa, inyección de la guía dentro del DOCX del sílabo.

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** SÍ → `resources/mockups/project-doc-editor.html` — Estado: PENDIENTE.
- **Prompt para el agente de mockup (chat aparte):**
  > Mockup HTML+Tailwind dark navy (#041A3A/#0B192C) de un editor de documento académico en 2 paneles glass. Izquierda (260px): índice "Estructura de la guía" con 9 secciones, cada item con título, badge pequeño de origen (Plantilla gris / IA cyan / Editado dorado) e ícono candado en 2 de ellas; botón inferior "Generar borrador con IA" (teal #00A896). Derecha: editor de la sección activa "Cronograma de avances": título editable, textarea grande estilo documento con texto académico de ejemplo sobre PA1 semana 6 / PA2 semana 11 / PA3 semana 16, toolbar mínima (Regenerar sección · Bloquear · Guardado hace 5 s). Header superior: "Guía de Proyecto — Programación con Robótica", subtítulo del producto acreditable, botón outline "Descargar DOCX". Sobrio universitario, sin emojis.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Precondición):** Sílabo sin `selected_product` o sin `work_object` → la acción no aparece / endpoint responde 409 con mensaje claro ("Selecciona un producto acreditable con objeto de trabajo en el wizard").
- **CA-02 (Ownership):** Solo el dueño del sílabo (o rol de gestión) accede a su guía — 403 en caso contrario; test obligatorio.
- **CA-03 (HITL):** Texto editado por el docente nunca es sobrescrito por una generación global salvo que la sección esté desbloqueada Y el docente confirme (modal de confirmación listando qué secciones se regenerarán).
- **CA-04 (Referencias):** La sección Referencias solo contiene entradas de `bibliography.references` del draft. Si está vacía → placeholder instructivo, NUNCA referencias inventadas.
- **CA-05 (Unicidad):** Segundo `POST` de creación para el mismo sílabo devuelve la guía existente (idempotente), no duplica.
- **CA-06 (Job muerto):** Si el proceso muere con job `running` (riesgo conocido de BackgroundTasks), la UI ofrece reintentar tras timeout de poll — sin bloquear el editor.

---

## 6. Definition of Done (módulo completo)

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Desde Mis Sílabos del curso de prueba: "Generar guía de proyecto" → estructura por metodología → genero con IA → edito 2 secciones, bloqueo 1, regenero el resto (la bloqueada intacta) → descargo DOCX APA 7 presentable para alumnos.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `silabos-backend.tests.test_project_docs` (CRUD, ownership, idempotencia, 409 sin producto) + `test_ai_routing` con task nueva: verdes.
- [ ] `npm run build` verde · py_compile del router/servicios/generator.
- [ ] Verificación Supabase MCP del schema creado (tabla, FK, índice único `syllabus_id`).
- [ ] Al aceptar el módulo: crear/actualizar MD de routing (candidato: `08_PROJECT_DOC.md`) según la regla recursiva.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T9a | Módulo nuevo: estructura+editor (E2E sin IA) | SÍ (compartido) | T2 (GlassModal) | [ ] |
| T9b | IA por sección + jobs (E2E) | NO | T9a | [ ] |
| T9c | Export DOCX APA 7 (E2E) | NO | T9a (T9b no bloquea) | [ ] |
