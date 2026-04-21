# Plan Final Producto: Wizard Progresivo Asistido por IA

Fecha de cierre funcional: 2026-04-20

## 1. Decisiones congeladas
Estas decisiones ya no deben reabrirse salvo pedido explicito del cliente:

- Paradigma final: el wizard deja de ser un disparador de generacion unica y pasa a ser un editor progresivo de silabo.
- Orden final del wizard:
  `Curso -> Bibliografia -> Proposito -> Contenido -> Metodo -> Calificacion -> Confirmacion`
- Regla pedagogica central:
  `Proposito -> Contenido -> Metodo`
- La bibliografia va al inicio para enriquecer el contexto de IA antes de Proposito y Contenido.
- Las llamadas a IA deben ser explicitas.
  Solo corren en acciones tipo `Sugerir`, `Generar`, `Regenerar` o `Recalcular`.
- No se debe ejecutar un mega prompt final para reescribir el silabo completo.
- El paso final debe ensamblar el JSON definitivo usando programacion y validaciones deterministicas.
- Si no existen desempenos oficiales, el docente puede continuar con desempenos sugeridos por IA.
- Si se usan desempenos sugeridos por IA, el silabo queda con estado `pending_academic_validation`.
- La validacion academica la pueden ejecutar `admin`, `director` y `coordinador`, respetando scopes.
- `Conocimientos` y `actitudes` en v1 final:
  - no seran catalogos globales,
  - se generaran por IA,
  - seran editables por el docente,
  - y se guardaran en `payload_json`.
- Las compatibilidades pedagogicas deben ser duras y deterministicas:
  - metodo <-> habilidades
  - metodo <-> evidencias
  - metodo <-> instrumentos
  - metodo <-> secuencia/fases semanales
- La calificacion nace de una plantilla por metodo.
- El docente puede editarla en UI, pero el backend valida coherencia y total 100%.
- Debe haber autosave por step.
- Los silabos legacy quedan solo en modo lectura.

## 1.1 Equivalencia con el flujo funcional consolidado del cliente
Este plan SI respeta el flujo funcional consolidado pedido por el cliente, con una adaptacion controlada:

- el cliente define la secuencia logica:
  `Proposito -> Contenido -> Metodo`
- este plan mantiene exactamente esa dependencia funcional.
- la unica variacion intencional es adelantar `Bibliografia` en el wizard para enriquecer el contexto antes de construir Proposito y Contenido.

Equivalencia operativa:

1. El docente selecciona programa -> plan -> curso
2. El sistema importa sumilla, competencia, capacidad/resultado y desempenos oficiales
3. El sistema detecta si faltan desempenos
4. Si faltan, IA propone desempenos sugeridos
5. El sistema deriva contenido: conocimientos, habilidades y actitudes
6. El docente decide sus fuentes
7. Las fuentes validadas pasan al repositorio activo del curso
8. El sistema consulta la guia metodologica oficial
9. IA sugiere metodo troncal y secuencia didactica
10. El sistema propone actividades, evidencias, instrumentos y bibliografia sugerida
11. El docente revisa y ajusta
12. Corre un validador automatico
13. Corre un auditor IA
14. Revision academica
15. Aprobacion/publicacion

En el wizard esto se refleja asi:

- `Curso`: cubre seleccion de programa/plan/curso y snapshot oficial
- `Bibliografia`: adelanta la decision de fuentes del punto 6 y 7
- `Proposito`: cubre puntos 2, 3 y 4
- `Contenido`: cubre punto 5
- `Metodo`: cubre puntos 8 y 9
- `Calificacion`: cubre parte de 10
- `Confirmacion`: cubre 10, 11, 12, 13, 14 y deja listo 15

Por tanto:

- si, es el mismo flujo funcional,
- pero optimizado para UX, costo de IA y persistencia progresiva.

## 2. Objetivo del producto final
Entregar un flujo donde el docente construye el silabo por bloques, con ayuda puntual de IA, y donde:

- cada step deja un resultado persistido,
- la IA solo interviene en puntos criticos,
- el backend gobierna las reglas institucionales,
- el resultado final es mas exacto, auditable y coherente,
- y la publicacion queda bloqueada si faltan validaciones academicas obligatorias.

## 3. Nuevo modelo mental del sistema
Antes:

- wizard lineal
- una gran llamada de IA
- resultado final mas fragil y menos controlable

Ahora:

- editor progresivo
- mini salidas JSON por bloque
- persistencia incremental
- validaciones deterministicas por compatibilidad
- ensamblaje final por codigo

## 4. Diseno funcional del wizard
### Step 0. Contexto academico
Objetivo:

- resolver el contexto institucional antes del borrador.

Acciones:

- seleccionar `programa`
- seleccionar `plan` si existe mas de un plan vigente o historico para el programa
- seleccionar `curso`

Regla:

- si el sistema solo tiene un plan aplicable para el curso, el `plan` puede resolverse implicitamente y no mostrarse como selector separado.

Datos persistidos:

- `program_id`
- `study_plan_id` o equivalente si aplica
- `course_id`

### Step 1. Curso
Objetivo:

- abrir o crear un borrador progresivo para un curso y contexto de sesion.

Acciones:

- cargar `course_snapshot` oficial en solo lectura.
- crear `syllabi` draft si no existe uno abierto para ese curso/semestre/docente.
- guardar version de flujo `v3-progressive`.

Datos persistidos:

- `course_id`
- `semester`
- `program_id` del contexto activo
- snapshot base del curso

### Step 2. Bibliografia
Objetivo:

- enriquecer el contexto antes de Proposito y Contenido.

Acciones:

- subir PDF o Markdown de NotebookLM.
- permitir `cargar fuentes propias`.
- permitir `busqueda asistida por IA`.
- permitir combinar ambas.
- normalizar y guardar referencias.
- asociar refs al draft actual.
- marcar refs validadas como parte del repositorio activo del curso para el borrador.

Reglas:

- este step no invalida otros bloques.
- no requiere IA adicional.

Datos persistidos:

- `bibliography.doc_ids`
- `bibliography.references`
- `bibliography.source_summary`
- `bibliography.mode`
- `bibliography.validated_refs`

### Step 3. Proposito
Objetivo:

- fijar base academica del curso.

Entradas:

- sumilla
- competencia de egreso
- resultado de aprendizaje
- capacidad
- desempenos oficiales si existen
- bibliografia cargada

Modo A: con desempenos oficiales

- se muestran en solo lectura como referencia oficial.
- el docente puede dejar observaciones por bloque.
- no se reescriben automaticamente.

Modo B: sin desempenos oficiales

- boton `Sugerir desempenos`.
- la IA devuelve una propuesta corta y estructurada.
- cada desempeno queda marcado como:
  - `official`
  - `ai_suggested`
  - `teacher_edited_from_ai`

Reglas:

- el docente puede editar el texto sugerido.
- si el bloque termina usando desempenos no oficiales, el draft queda marcado para validacion academica.

Datos persistidos:

- `purpose.curriculum_snapshot`
- `purpose.performances`
- `purpose.performances_origin`
- `purpose.teacher_notes`
- `purpose.approval_state`

### Step 4. Contenido
Objetivo:

- construir el contenido derivado del Proposito.

Entradas:

- desempenos aprobados del step anterior
- curso
- bibliografia

Salida esperada:

- habilidades
- conocimientos
- actitudes

Reglas:

- `habilidades` deben seleccionarse desde `skills_catalog`.
- `conocimientos` y `actitudes` viven en payload editable.
- la IA puede sugerir los 3 bloques, pero el docente confirma.

Datos persistidos:

- `content.selected_skill_ids`
- `content.knowledge_items`
- `content.attitudes`
- `content.source`
- `content.teacher_notes`
- `content.approval_state`

### Step 5. Metodo
Objetivo:

- elegir el metodo que operativiza Proposito y Contenido.

Entradas:

- curso
- desempenos
- habilidades confirmadas
- conocimientos
- actitudes
- bibliografia

Fuente institucional obligatoria:

- `teaching_methods`
- compatibilidades y reglas estructuradas de metodo

Acciones:

- la IA rankea metodos y explica por que.
- el docente selecciona uno.
- el backend valida compatibilidad dura.

Reglas:

- si cambia el metodo, se invalida Calificacion.
- si hay incompatibilidades duras, no se puede aprobar el step.
- las sugerencias de IA no sustituyen la validacion deterministica.

Datos persistidos:

- `method.suggested_method_id`
- `method.suggestion_reason`
- `method.selected_method_id`
- `method.compatibility_snapshot`
- `method.teacher_notes`
- `method.approval_state`

### Step 6. Calificacion
Objetivo:

- construir la tabla de evaluacion compatible con el metodo.

Entradas:

- desempenos
- habilidades
- metodo
- evidencias e instrumentos compatibles

Acciones:

- cargar plantilla por metodo.
- permitir edicion en UI tipo rows.
- guardar internamente como JSON.
- validar que sume 100%.
- proponer actividades, evidencias, instrumentos y bibliografia sugerida segun el metodo elegido y el contenido aprobado.

Reglas:

- no permitir evidencias incompatibles con el metodo.
- no permitir instrumentos incompatibles con el metodo.
- si el metodo cambia, este bloque queda dirty.

Datos persistidos:

- `grading.template_origin`
- `grading.rows`
- `grading.evidence_ids`
- `grading.instrument_ids`
- `grading.total_percent`
- `grading.teacher_notes`
- `grading.approval_state`

### Step 7. Confirmacion
Objetivo:

- ensamblar el silabo final sin mega prompt.

Acciones:

- validar integridad total.
- compilar payload final.
- guardar snapshot final compatible con editor/export.
- si corresponde, dejar estado `pending_academic_validation`.
- ejecutar `validador automatico`.
- ejecutar `auditor IA`.
- consolidar observaciones previas a revision academica.

Reglas:

- no reescribir bloques ya aprobados.
- no ejecutar una generacion completa del silabo.
- como maximo, permitir una validacion IA corta si se desea.
- la revision academica ocurre despues del validador automatico y del auditor IA.

## 5. Politica de llamadas a IA
La IA solo participa en estos puntos:

- `Proposito`: sugerir desempenos cuando no existan oficiales.
- `Contenido`: sugerir conocimientos, habilidades y actitudes.
- `Metodo`: rankear y explicar metodos recomendados.
- `Calificacion`: sugerir tabla compatible inicial.

No usar IA para:

- autosave
- cambios de UI
- validaciones matematicas
- compatibilidades duras
- ensamblaje final

Regla de costo:

- no mas de 4 llamadas IA por silabo completo en flujo normal.
- cualquier regeneracion adicional debe ser explicita.

## 6. Regla de invalidacion entre steps
Esta regla debe implementarse en backend y reflejarse en frontend:

- Si cambia `Bibliografia`, no invalida automaticamente otros bloques, pero puede ofrecer `Recalcular` Proposito y Contenido.
- Si cambia `Proposito`, se invalidan `Contenido`, `Metodo` y `Calificacion`.
- Si cambia `Contenido`, se invalidan `Metodo` y `Calificacion`.
- Si cambia `Metodo`, se invalida `Calificacion`.
- `Confirmacion` solo se habilita cuando todos los bloques requeridos esten consistentes.

Estados recomendados por bloque:

- `empty`
- `suggested`
- `edited`
- `approved`
- `dirty`
- `needs_review`

## 7. Modelo de datos final recomendado
### 7.1 Reutilizar tablas actuales
- `courses`
- `performances`
- `skills_catalog`
- `teaching_methods`
- `course_bibliography_refs`
- `syllabi`
- `users`
- tablas de permisos/scopes ya planificadas

### 7.2 Alteraciones recomendadas sobre `syllabi`
Agregar columnas:

- `wizard_version` VARCHAR default `'v3-progressive'`
- `current_step` VARCHAR
- `program_id` UUID NULL
- `requires_academic_validation` BOOLEAN default false
- `academic_validation_status` VARCHAR default `'not_required'`
- `submitted_for_validation_at` TIMESTAMPTZ NULL
- `validated_at` TIMESTAMPTZ NULL
- `validated_by` UUID NULL
- `autosaved_at` TIMESTAMPTZ NULL

Checks sugeridos para `academic_validation_status`:

- `not_required`
- `pending`
- `approved`
- `returned`

### 7.3 Tabla de observaciones por bloque
`syllabus_step_reviews`

Campos minimos:

- `id`
- `syllabus_id`
- `step_key`
- `block_key`
- `review_action`
- `observation`
- `status`
- `created_by`
- `created_at`

Uso:

- comentarios precisos por bloque
- devoluciones de revision
- aprobaciones parciales

Valores sugeridos:

- `step_key`: `bibliography`, `purpose`, `content`, `method`, `grading`
- `review_action`: `comment`, `approve`, `return`

### 7.4 Tabla de cache / auditoria de sugerencias IA
`syllabus_ai_suggestions`

Campos minimos:

- `id`
- `syllabus_id`
- `step_key`
- `request_hash`
- `input_json`
- `output_json`
- `accepted`
- `created_by`
- `created_at`

Uso:

- reducir costo
- evitar recalcular si no cambio la entrada
- trazabilidad de sugerencias

### 7.5 Catalogo de evidencias
`evaluation_evidence_catalog`

Campos minimos:

- `id`
- `code`
- `name`
- `description`
- `active`
- `created_at`

### 7.6 Catalogo de instrumentos
`evaluation_instruments_catalog`

Campos minimos:

- `id`
- `code`
- `name`
- `description`
- `active`
- `created_at`

### 7.7 Compatibilidad metodo <-> habilidad
`teaching_method_skill_links`

Ya definido y obligatorio.

### 7.8 Compatibilidad metodo <-> evidencia
`teaching_method_evidence_links`

Campos minimos:

- `id`
- `teaching_method_id`
- `evidence_id`
- `priority`
- `is_recommended`
- `created_at`

### 7.9 Compatibilidad metodo <-> instrumento
`teaching_method_instrument_links`

Campos minimos:

- `id`
- `teaching_method_id`
- `instrument_id`
- `priority`
- `is_recommended`
- `created_at`

### 7.10 Plantilla de calificacion por metodo
Opcion recomendada:

- agregar `grading_template_json JSONB` a `teaching_methods`

Contenido esperado:

- rows base
- pesos sugeridos
- siglas
- cronograma sugerido
- flags como `requires_midterm_final`

Razon:

- el usuario quiere editar rows en UI,
- pero guardar internamente como JSON es suficiente y mas simple que otra tabla de rows.

### 7.11 Reglas estructuradas de fases por metodo
Para que RM-03 sea deterministico, no basta confiar en `weekly_template` como texto libre.

Opcion recomendada:

- agregar `phase_rules_json JSONB` a `teaching_methods`

Ejemplo de estructura:

- orden de fases
- semana minima por fase
- semana maxima por fase
- fases obligatorias
- reglas de distribucion

Con esto el backend puede validar la secuencia semanal sin depender de texto.

### 7.12 Settings configurables del sistema
`system_settings`

Campos minimos:

- `key`
- `value_json`
- `updated_at`

Uso:

- `wizard.max_skills`
- limites por bloque
- flags de rollout

## 8. Estructura recomendada de `payload_json`
El `payload_json` del draft progresivo debe contener bloques claros:

```json
{
  "_meta": {
    "wizard_version": "v3-progressive",
    "current_step": "content",
    "requires_academic_validation": true,
    "academic_validation_status": "pending"
  },
  "_workflow": {
    "bibliography": { "status": "approved" },
    "purpose": { "status": "approved", "dirty": false },
    "content": { "status": "edited", "dirty": false },
    "method": { "status": "approved", "dirty": false },
    "grading": { "status": "dirty", "dirty": true }
  },
  "course_snapshot": {},
  "bibliography": {},
  "purpose": {},
  "content": {},
  "method": {},
  "grading": {},
  "final_syllabus": {}
}
```

`final_syllabus` sera el ensamblado final compatible con editor y exportacion.

## 9. Endpoints backend recomendados
### Creacion / carga de draft progresivo
- `POST /api/syllabi/progressive`
- `GET /api/syllabi/{id}/progressive`

### Autosave generico por bloque
- `PATCH /api/syllabi/{id}/steps/{step_key}`

### Bibliografia
- reusar endpoints existentes de upload/delete/listado
- asociar al `syllabus_id` actual cuando corresponda

### Proposito
- `POST /api/syllabi/{id}/steps/purpose/suggest-performances`
- `PATCH /api/syllabi/{id}/steps/purpose`

### Contenido
- `POST /api/syllabi/{id}/steps/content/suggest`
- `PATCH /api/syllabi/{id}/steps/content`

### Metodo
- `POST /api/syllabi/{id}/steps/method/suggest`
- `GET /api/methods/{id}/skills`
- `GET /api/methods/{id}/evidences`
- `GET /api/methods/{id}/instruments`
- `PATCH /api/syllabi/{id}/steps/method`

### Calificacion
- `POST /api/syllabi/{id}/steps/grading/suggest`
- `PATCH /api/syllabi/{id}/steps/grading`

### Confirmacion / ensamblaje final
- `POST /api/syllabi/{id}/assemble-final`
- `POST /api/syllabi/{id}/run-validator`
- `POST /api/syllabi/{id}/run-ai-audit`
- `POST /api/syllabi/{id}/submit-academic-validation`

### Revision academica por bloque
- `POST /api/syllabi/{id}/reviews`
- `GET /api/syllabi/{id}/reviews`
- `POST /api/syllabi/{id}/reviews/{review_id}/resolve`

## 10. Reglas de backend que deben ser deterministicas
Estas reglas no deben quedar a criterio de IA:

- validacion de scope de usuario
- permisos efectivos por rol + override
- total de calificacion = 100
- metodo seleccionado existe y esta activo
- skill seleccionada existe y esta activa
- evidencia seleccionada existe y esta activa
- instrumento seleccionado existe y esta activo
- skill es compatible con metodo
- evidencia es compatible con metodo
- instrumento es compatible con metodo
- fases semanales respetan `phase_rules_json`
- publicacion bloqueada si `academic_validation_status = pending`

## 11. Frontend final recomendado
### Filosofia UI
- wizard = editor progresivo
- autosave silencioso
- botones claros de `Sugerir`, `Regenerar`, `Aceptar`, `Editar`, `Recalcular`
- feedback por bloque, no mensajes globales vagos

### Cambios de UI por step
Bibliografia:

- mantener experiencia NotebookLM actual
- mostrar refs cargadas y resumen corto

Proposito:

- tarjetas de curriculum oficial en solo lectura
- lista de desempenos
- editor inline si vienen de IA
- badge de origen
- caja de observaciones

Contenido:

- tres subbloques:
  - habilidades
  - conocimientos
  - actitudes
- habilidades desde catalogo institucional
- conocimientos y actitudes como chips o rows editables

Metodo:

- suggestion card IA
- selector oficial
- tablero de compatibilidades
- warnings duros y blandos

Calificacion:

- tabla editable de rows agradable
- selector de evidencia
- selector de instrumento
- suma visible en tiempo real
- bloquear guardar si total != 100 o si hay incompatibilidades

Confirmacion:

- resumen por bloques
- estado de validacion
- boton ensamblar
- boton enviar a revision

## 12. Estado y permisos del workflow
### Estados del silabo
Sugerencia:

- `draft`
- `pending_academic_validation`
- `returned`
- `approved`
- `published`

### Quien puede hacer que
- `docente`
  - crea y edita su draft
  - envia a validacion
  - responde observaciones
- `coordinador`
  - revisa dentro de scope `program`
  - aprueba o devuelve bloques
- `director`
  - revisa dentro de scope `career`
  - aprueba o devuelve bloques
- `admin`
  - acceso total

### Regla de validacion final
Si el silabo contiene desempenos no oficiales:

- puede guardarse
- puede ensamblarse
- puede enviarse a revision
- no puede publicarse sin aprobacion academica

### Pipeline final antes de publicar
Orden obligatorio:

1. Ensamblaje final
2. Validador automatico
3. Auditor IA
4. Revision academica
5. Aprobacion/publicacion

## 13. Migraciones SQL recomendadas
### Migracion A. Base del wizard progresivo
- alterar `syllabi`
- crear `syllabus_step_reviews`
- crear `syllabus_ai_suggestions`
- crear `system_settings`

### Migracion B. Compatibilidades pedagogicas
- crear `evaluation_evidence_catalog`
- crear `evaluation_instruments_catalog`
- crear `teaching_method_evidence_links`
- crear `teaching_method_instrument_links`
- asegurar `teaching_method_skill_links`

### Migracion C. Enriquecimiento de `teaching_methods`
- agregar `grading_template_json`
- agregar `phase_rules_json`

### Migracion D. Indices y constraints
- uniques de pivotes
- indices por `syllabus_id`
- checks de estados

### Migracion E. Historial y auditoria extra si hace falta
- opcional si se quiere auditar mas a fondo cada cambio por bloque

## 14. Roadmap de implementacion
### Fase 0. Saneamiento tecnico
- corregir contratos actuales del wizard
- unificar `selected_skill_ids`
- eliminar dependencias legadas innecesarias en `generate-v2`
- congelar legacy como read-only

### Fase 1. Esquema y backend base
- ejecutar migraciones A, B y C
- exponer endpoints nuevos
- implementar validaciones duras

### Fase 2. Wizard progresivo frontend
- reordenar steps
- implementar autosave
- persistencia por bloque
- invalidacion visual entre steps

### Fase 3. IA por bloque
- sugerencia de desempenos
- sugerencia de contenido
- sugerencia/ranking de metodo
- sugerencia de calificacion

### Fase 4. Ensamblaje final
- compilar `final_syllabus`
- conectar editor/exportacion
- bloquear publicacion si falta validacion

### Fase 5. Revision academica y cierre
- observaciones por bloque
- aprobacion por scope
- UAT
- hardening

## 15. Definition of Done del producto final
- El docente puede construir un silabo completo por bloques sin perder progreso.
- Las llamadas IA son pocas, explicitas y utiles.
- Proposito, Contenido, Metodo y Calificacion quedan persistidos por separado.
- El backend valida compatibilidades pedagogicas de forma dura.
- La calificacion se edita en tabla UI, pero se guarda como JSON.
- El sistema ensambla el silabo final por codigo, no por mega prompt.
- El sistema corre validador automatico y auditor IA antes de revision academica.
- Si se usaron desempenos sugeridos por IA, el silabo queda en `pending_academic_validation`.
- `admin`, `director` y `coordinador` pueden revisar por bloque segun scope.
- Los legacy quedan en solo lectura.

## 16. Priorizacion real para cerrar sin desbordarse
### Must Have
- nuevo orden del wizard
- autosave
- proposito con desempenos oficiales o IA
- contenido con habilidades + conocimientos + actitudes
- compatibilidades duras de metodo
- calificacion por metodo con tabla editable
- ensamblaje final por codigo
- revision academica por bloque

### Should Have
- cache de sugerencias IA
- `phase_rules_json`
- settings configurables

### Could Have
- analitica fina por bloque
- duplicar un silabo como plantilla

### No hacer en este cierre
- catalogo global de conocimientos
- catalogo global de actitudes
- migracion automatica de legacy al nuevo flujo

## 17. Recomendacion ejecutiva final
La arquitectura correcta ya no es `wizard que genera`.
La arquitectura correcta es:

- `draft progresivo + IA puntual + reglas duras + ensamblaje final`

Ese paradigma:

- cumple mucho mejor el manual del cliente,
- reduce alucinacion de IA,
- protege el costo de API,
- y deja al docente con participacion real en el resultado.
