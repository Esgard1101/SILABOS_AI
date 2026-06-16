# SPEC-08 — Sistema de evaluación: naming PA, matriz por unidad y catálogo de items

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (Step6 `/creator/evaluacion`) + backend admin/engine + verificación de export
**Estado:** LISTO PARA EJECUTAR (sub-slices 8a→8d)
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` + `AGENTSROUTING/03_PROGRESSIVE_UNIT_GENERATION.md` (engine) + `AGENTSROUTING/05_FINAL_ASSEMBLY_EXPORT.md` (grading→DOCX)

---

## 0. Decisiones del tech lead (cerradas en interrogatorio 2026-06-14)

Estas decisiones son source-of-truth; el agente de Capa 2 no las re-discute.

1. **Nombre PA = sigla bloqueada + etiqueta editable.** El prefijo `PAn:` es fijo (garantiza export limpio); el docente solo edita el texto después de los dos puntos. Default = `Producto Acreditable N`. Esto **revierte parcialmente** la versión anterior de la SPEC-08 (que prohibía editar): ahora SÍ se nombra, pero el formato queda blindado.
2. **Botón "Ver producto acreditable"** bajo la tabla → abre el detalle del producto seleccionado (timeline de hitos PA) como referencia para que el docente nombre con criterio. Read-only, reusa el modal de Step7.
3. **Modelo de evaluación con toggle Global ↔ Por Unidad.** Global = tabla plana actual (suma 100). Por Unidad = una sub-tabla por cada perfomance + peso de unidad. Ambos paradigmas conviven.
4. **Unidades = nro de perfomances** del datamining (`draftPerformances.length`). Matriz dinámica, no hardcodear 2/3.
5. **Peso de unidad: equitativo auto (100/N), editable.** Debe sumar 100 entre unidades.
6. **Toggle conserva data best-effort** (no reinicia): al pasar a Por Unidad se distribuyen las filas PA a su unidad por semana y las globales (TA/EP) quedan transversales; al volver a Global se aplana.
7. **Selector de items preestablecidos** al agregar fila (no texto libre crudo): el docente elige de un catálogo y completa.
8. **Catálogo con CRUD por programa/facultad.** Tabla nueva `evaluation_item_presets` con `program_id` nullable (null = global). Gestión: `admin` administra globales y cualquiera; `director`/`coordinador` administran los de su scope (mirror de `check_course_scope`). **No existe rol "superadmin"**: el rol máximo real es `admin`.
9. **Coherencia: la matriz manda → el engine se ajusta.** Las semanas PA y los límites de unidad de la matriz de evaluación son restricción dura para `progressive_curriculum_engine`. El engine respeta sí o sí las semanas sumativas de la matriz.

---

## 1. Resumen y objetivo

El Step6 evolucionó de "normalizar nombres PA" a **rediseño del sistema de evaluación** con tres capacidades nuevas:

- **(A) Naming Human-in-the-Loop blindado:** el docente da un nombre con sentido a cada PA (`PA1: PRESENTACIÓN INICIAL`) sin poder romper el formato; el detalle largo del hito vive en `selected_product.timeline_json` y se consulta con un botón, nunca ensucia el dato guardado.
- **(B) Matriz por unidad:** soporte para el patrón real de muchos docentes (promedio por unidad → ponderación entre unidades), con N = nro de perfomances oficiales.
- **(C) Catálogo administrable de items** (Examen Parcial, Práctica Calificada, Examen Final, …) por programa, para estandarizar las cuentas propias y dejar de depender de texto libre.

Y un **contrato de coherencia**: lo que el docente fija en la matriz (semanas PA, fronteras de unidad) restringe la generación de unidades y el cronograma.

---

## 2. Glosario y datos

- **Entidad principal:** bloque `grading` de `payload_json`. Shape actual (`api/types.ts:725` `GradingBlock`):
  `{ template_origin, rows: GradingRow[], total_percent, teacher_notes, approval_state }`
  con `GradingRow { evidencia, sigla, porcentaje, cronograma }`.
- **Shape ampliado (retro-compatible):**
  ```ts
  GradingBlock {
    ...campos actuales,
    mode: 'global' | 'per_unit';        // default 'global' (drafts viejos = global)
    units?: GradingUnit[];               // presente solo si mode==='per_unit'
  }
  GradingUnit {
    unit_index: number;                  // 1..N
    unit_label: string;                  // "Unidad 1" o nombre del perfomance
    performance_id?: string;             // enlace al desempeño oficial (si existe)
    weight_pct: number;                  // peso de la unidad (suman 100 entre unidades)
    rows: GradingRow[];                  // evidencias internas (suman 100 dentro de la unidad)
  }
  GradingRow {
    ...campos actuales,
    preset_id?: string;                  // catálogo elegido (null = fila libre)
  }
  ```
  En `mode='global'` se ignora `units` y manda `rows` (cero cambio para drafts existentes).
- **Unidades:** `draftPerformances` (de `useSyllabus`). `N = draftPerformances.length`.
- **Catálogo:** tabla nueva `evaluation_item_presets` (ver §7). Selector del frontend = presets globales (`program_id IS NULL`) + presets del `program_id` del draft.
- **Detalle del hito (qué entrega cada PA):** sigue en `selected_product.timeline_json`; el botón "Ver producto acreditable" lo lee, no lo copia al grading.
- **Flujo:** Step6 → `PATCH /steps/grading` → final assembly → `word_generator` (Sistema de Evaluación / Calificación). En `per_unit`, el assembly/export aplana a la tabla de calificación (ver 8d).

---

## 3. Sub-slices (cada uno end-to-end y testeable solo)

> Orden sugerido 8a → 8b → 8c → 8d. 8c puede ir en paralelo a 8a/8b (es data/admin). 8a entrega el selector con un catálogo temporal constante; 8c lo cambia por el API. 8d cierra coherencia y depende del shape de 8b + presets de 8c.

### 8a — Naming PA blindado + botón "Ver producto" + selector de items (frontend + payload)

**Incluye**
- [ ] Celda evidencia de filas PA: prefijo `PAn:` renderizado **no editable** + input editable para la etiqueta. Persistir `evidencia = "PAn: <label>"`; si label vacío → `"Producto Acreditable N"`. La normalización al cargar/guardar **garantiza** que toda fila con `sigla` `^PA\d+$` empiece por su `PAn:` (reemplaza `evidenceFromTimeline`/`rowsWithSelectedProductTimeline` que hoy meten el detalle largo).
- [ ] El timeline del producto solo aporta la **semana** (`cronograma = "Semana X"`), nunca el nombre largo.
- [ ] Botón **"Ver producto acreditable"** bajo la tabla → abre GlassModal con el timeline vertical de hitos PA del producto seleccionado (reusar el `ProductDetailModal`/contenido de Step7, SPEC-07). Si no hay producto seleccionado, el botón se deshabilita con tooltip.
- [ ] **Selector al agregar fila:** "Agregar evidencia" abre un dropdown/menú de presets (sigla + nombre + % sugerido) en vez de crear `{evidencia:'Nueva evidencia', sigla:'EV'}` crudo. Elegir un preset autocompleta `evidencia`, `sigla`, `porcentaje` (sugerido, editable) y setea `preset_id`. Sigue existiendo opción "Item personalizado" (texto libre, como le gusta al user).
- [ ] **Fuente de presets temporal:** constante en frontend (`EP/Examen Parcial`, `PC/Práctica Calificada`, `EF/Examen Final`) marcada con `// TODO 8c: reemplazar por API`.
- [ ] Filas no-PA (TA, EP, custom) jamás se renombran ni reciben prefijo.

**No incluye:** toggle por unidad, tabla nueva, engine.

### 8b — Toggle Global ↔ Por Unidad + matriz dinámica (frontend + payload + SyllabusContext)

**Incluye**
- [ ] Selector de modo arriba de la tabla (`Global` | `Por Unidad`). Persistir `grading.mode`.
- [ ] **Modo Por Unidad:** renderiza N sub-tablas (N = `draftPerformances.length`), cada una con su `weight_pct` editable (default `100/N`, redondeo cuadrando a 100) y sus `rows` (suman 100 dentro de la unidad). Más una sección "Transversales" para filas sin unidad (TA, etc.).
- [ ] **Validación:** pesos de unidad suman 100 **y** cada unidad suma 100 internamente. Checklist y `total_percent` se recalculan: nota final = Σ(weight_unidad × promedio_interno). El DonutChart muestra distribución por unidad.
- [ ] **Toggle best-effort (decisión 6):** Global→PorUnidad distribuye cada PA a su unidad por semana (PA cuya semana cae en el rango de la unidad), TA/EP a transversales; PorUnidad→Global aplana ponderando. Nunca borra trabajo silenciosamente.
- [ ] `SyllabusContext`: estado `gradingMode` + `gradingUnits`, defaults coherentes con `buildAccreditableRows` (única fuente, exportada y consumida por context y Step6 — corrige la divergencia `DEFAULT_GRADING_ROWS` 8/16 vs context 4/8/16).

**No incluye:** engine, export per_unit (se verifica/ajusta en 8d).

### 8c — Catálogo `evaluation_item_presets` + CRUD admin (backend + frontend admin)

**Incluye**
- [ ] Migración SQL: tabla `evaluation_item_presets` (§7) + seed global (`EP`, `PC`, `EF`, opcional `TA`). Crear vía Supabase MCP/SQL aprobado tras inspeccionar el schema vivo (`list_tables`).
- [ ] Backend en `routers/admin.py` (prefix `/admin`): `GET/POST/PUT/DELETE /admin/evaluation-presets`. Gating: `admin` → todo; `director`/`coordinador` → solo `program_id` dentro de su scope (mirror `check_course_scope` + `get_user_scopes`). Schemas en `models/schemas.py` (`EvaluationPresetCreate/Update`).
- [ ] Endpoint de lectura para el wizard: presets efectivos del draft = globales + del `program_id` del curso. Reusar uno existente o `GET /admin/evaluation-presets?program_id=...` (lectura permitida a `docente` en su programa).
- [ ] Frontend `AdminEvaluationPresets.tsx` espejando `AdminTeachingMethods.tsx`/`AdminSkills.tsx` (tabla + alta/edición/baja, glass). Entrada en la navegación admin existente.
- [ ] 8a cambia su constante temporal por este API.

**No incluye:** engine, export.

### 8d — Coherencia "matriz manda" en engine + verificación/ajuste de export

**Incluye**
- [ ] El bloque `grading` se convierte en restricción dura para `progressive_curriculum_engine.py`: pasar por `_course_context`/`_unit_prompt` un `grading_constraints` derivado = `{ pa_weeks: {PAn: semana}, unit_boundaries?: [{unit_index, week_from, week_to}] }`.
- [ ] Hard rule sumativa del engine usa **estas** semanas (matriz) como autoritativas para ubicar evidencias PA, por encima del `timeline_json` si difieren (la matriz es la verdad del docente). Las reglas formativas (prohibir `PAn:` en semanas ordinarias) quedan intactas.
- [ ] En `mode='per_unit'`: el engine respeta las fronteras de unidad (qué semanas pertenecen a qué unidad) para no mezclar evidencias sumativas entre unidades.
- [ ] **Export:** `word_generator.py` deja de ser solo-verificación: debe renderizar `mode='per_unit'` en Sistema de Calificación (aplanado legible: unidad + peso + evidencias). En `mode='global'` el render no cambia. Verificar que las semanas PA del Programa de Contenidos sigan mostrando la evidencia concreta (no degradar a genérico — regla sumativa).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** Parcial. 8a/8c conservan layout (solo cambia contenido de celda + dropdown + página admin estándar). **8b SÍ** necesita acuerdo visual de la matriz por unidad (sub-tablas + barra de pesos de unidad). Antes de codear 8b, el agente propone un mockup ASCII/screenshot del layout Por Unidad y lo valida con el tech lead.
- Estilo: liquid glass del sprint (cards `rounded-2xl bg-white/[0.06] backdrop-blur`, modales `rounded-3xl`). El botón "Ver producto" reusa el modal glass de Step7.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Naming blindado):** editar la etiqueta de PA1 a "PRESENTACIÓN INICIAL" → persiste `"PA1: PRESENTACIÓN INICIAL"`; borrar todo → vuelve a `"Producto Acreditable 1"`. El prefijo `PA1:` nunca se puede borrar.
- **CA-02 (Suma 100 global):** modo Global se comporta como hoy (checklist "Ponderación total = 100%").
- **CA-03 (Suma 100 por unidad):** modo Por Unidad → pesos de unidad suman 100 Y cada unidad suma 100; si no, checklist en rojo y botón Continuar bloqueado.
- **CA-04 (N variable):** 2/3/4 perfomances → 2/3/4 unidades con pesos `100/N` cuadrados; sin asumir 3.
- **CA-05 (Preset por scope):** docente del programa X solo ve presets globales + de X; admin ve/edita todos.
- **CA-06 (Toggle sin pérdida):** Global→PorUnidad→Global mantiene las evidencias (best-effort), no quedan filas vacías ni duplicadas.
- **CA-07 (Matriz manda):** matriz fija PA2 en Semana 14 ≠ timeline (Semana 16) → el engine ubica la evidencia sumativa PA2 en Semana 14.
- **CA-08 (Export limpio):** ninguna celda de evaluación muestra texto truncado "(diagra…"; per_unit se exporta legible.
- **CA-09 (Draft legacy):** draft sin `mode` se trata como `global`; filas PA con nombre largo previo se normalizan al prefijo `PAn:` al abrir Step6.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Nombro PA1 como "PRESENTACIÓN INICIAL" y veo `PA1: PRESENTACIÓN INICIAL`; abro "Ver producto acreditable" y leo el hito real del timeline.
- [ ] Agrego evidencia desde el selector (Examen Parcial autocompleta sigla/%); agrego una personalizada y nadie la toca.
- [ ] Cambio a "Matriz por unidad": veo N unidades = nro de perfomances, ajusto 50/50, las cuentas cuadran a 100.
- [ ] (admin) Creo/edito un item del catálogo para mi programa y aparece en el selector del wizard.
- [ ] Genero una unidad y la evidencia sumativa PA cae en la semana que fijé en la matriz.
- [ ] Exporto DOCX → sección de evaluación limpia y estándar (global y por unidad).

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` (frontend) en verde por sub-slice.
- [ ] Assert/test ligero de: normalización naming (PA match / custom no-match / N variable / legacy largo→prefijo), reparto `100/N` cuadrado, aplanado per_unit→global. (Sin introducir framework de test nuevo; si no hay runner, documentar verificación manual equivalente.)
- [ ] `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine` verde (8d).
- [ ] `python -m unittest silabos-backend.tests.test_word_generator_dates` verde (sanity export, 8d).
- [ ] Migración revisada contra schema vivo (Supabase MCP) antes de aplicar (8c).
- [ ] Al aceptarse: registrar en `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` (naming blindado, modos global/per_unit, catálogo presets, matriz-manda) y en `03_PROGRESSIVE_UNIT_GENERATION.md` (grading_constraints como input duro del engine).

---

## 7. Esquema de tabla nueva (8c)

> Inspeccionar schema vivo antes de aplicar. Tipos finales según convención del proyecto.

```sql
CREATE TABLE evaluation_item_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla         text NOT NULL,              -- 'EP','PC','EF'
  nombre        text NOT NULL,              -- 'Examen Parcial'
  pct_sugerido  int,                        -- nullable
  program_id    uuid REFERENCES programs(id), -- NULL = global
  activo        boolean NOT NULL DEFAULT true,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- seed global: EP/Examen Parcial, PC/Práctica Calificada, EF/Examen Final
```

---

## 8. Tabla resumen

| Sub-slice | Tipo | Mockup | Depende de | Toca |
|---|---|---|---|---|
| 8a | UI + payload | NO | T7 (modal Step7) | Step6_Cierre, SyllabusContext, types |
| 8b | UI + payload | **SÍ (matriz)** | 8a | Step6_Cierre, SyllabusContext, types |
| 8c | Backend + admin UI | NO | — (paralelo) | migración, routers/admin.py, schemas.py, AdminEvaluationPresets |
| 8d | Engine + export | NO | 8b, 8c | progressive_curriculum_engine.py, word_generator.py |
