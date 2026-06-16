# SPEC-13 — Producto Acreditable con Human-in-the-Loop (cuestionario antes de generar)

**Sprint:** Junio 2026 · **Tarea:** T13 · **Tipo:** Feature HITL (gemela de T10c RSU)
**Routing obligatorio:** `AGENTSROUTING/README.md` → `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` → `AGENTSROUTING/03_PROGRESSIVE_UNIT_GENERATION.md` (notebook = "Cómo") → esta SPEC.
**Depende de:** T2 (`GlassModal`), Step7 ya estabilizado (SPEC-07 DONE), Fuentes obligatorio (SPEC-11, garantiza `notebook_context_text`).

> Mismo patrón que el RSU HITL (SPEC-10 T10c): el docente **diseña** (responde un cuestionario a medida) y la IA **ejecuta** (genera las opciones de producto). Reusar la arquitectura de cuestionarios. Productos va en spec aparte (decisión cerrada) para no desestabilizar el Step7 recién cerrado.

---

## 🎯 Objetivo

Hoy la IA propone 3 opciones de Producto Acreditable casi a ciegas (solo `category` genérica + contexto). Se intercala un **cuestionario HITL** antes de generar: el docente fija el rumbo del producto con 4 inputs + 3-4 preguntas generadas a medida del curso (con sus fuentes NotebookLM), y recién entonces la IA genera las 3 opciones. Resultado: productos menos genéricos, alineados a la intención real del docente.

---

## 📐 Decisiones cerradas (no reabrir)

| Tema | Decisión |
|---|---|
| Empaquetado | SPEC-13 propia (productos), separada de SPEC-10. NO se mete en Step7 sin este cuestionario. |
| Inputs fijos del docente | (1) Tipo de producto preferido · (2) Vínculo con el problema/contexto · (3) Alcance/complejidad · (4) Formato de evidencia/entrega. |
| Motor de preguntas | Endpoint backend que toma curso + método + grading + **`notebook_context_text` (fuentes ya guardadas)** + los 4 inputs → genera 3-4 preguntas a medida. NO se embebe en el prompt externo de NotebookLM. |
| Formato pregunta | Opciones cerradas (3-4, contextualizadas al curso) + campo "mi propia idea". |
| Nº preguntas | 3-4 dirigidas (form corto, público 30-49). |
| Flujo | Inputs → preguntas → IA genera las 3 opciones (las cards/timeline existentes de Step7) → docente elige. El humano arquitecto, la IA ejecuta. |
| Productos final | Sigue siendo la selección de 1 de las 3 opciones vía el flujo actual (`products/select`). El HITL solo mejora la **generación** previa. |

---

## 🧩 Estado actual (reusar, no reescribir)

- **Frontend:** `silabos-frontend/src/pages/creator/Step7_ProductoIntegrador.tsx` (SPEC-07: 3 cards glass + modal timeline vertical). El botón que dispara `products/suggest` es el punto de inserción del cuestionario.
- **Backend:**
  - `POST /api/syllabi/{id}/progressive/products/suggest` ([progressive_curriculum.py:1340]) — job async `progressive_product_suggest`, llama `_suggest_product_options` → `engine.suggest_products(...)`.
  - `POST /api/syllabi/{id}/progressive/products/select` ([progressive_curriculum.py:1391]).
  - Engine `suggest_products(curso, method, grading_rows, category, notebook_context_text, total_units, ai_service, force_provider)` ([progressive_curriculum_engine.py:634]) → hasta 3 opciones normalizadas. Task IA `progressive_product_suggest`.
  - Ya recibe `category` ("Libre de proponer por IA") y `notebook_context_text`: el HITL **enriquece** estos, no los reemplaza.

---

## 🔌 Backend — endpoints

**1. NUEVO `POST /api/syllabi/{syllabus_id}/progressive/products/questions`**
- Body: `{ tipo_producto, vinculo_problema, alcance, formato_evidencia }` (los 4 inputs; pueden venir parciales).
- Handler arma contexto del draft: `curso`, `method` (de `payload.method`), `grading_rows` (de `payload.grading`), **`notebook_context_text`** desde `payload.bibliography.references`.
- Nuevo método engine/servicio `generar_preguntas_producto(curso, method, grading_rows, notebook_context_text, inputs)`:
  - Prompt → JSON estricto: 3-4 preguntas a medida. Cada una `{ id, pregunta, opciones: [3-4 concretas y contextualizadas al curso/método], permite_idea_propia: true }`.
  - Task IA nueva `progressive_product_questions` en `gemini_service.py` (perfil ligero, igual que `progressive_product_suggest` pero más barato; OpenRouter, **sin env nuevo**).
- Respuesta: `{ preguntas: [...] }`.

**2. EXTENDER `POST /.../products/suggest`**
- Aceptar body opcional `hitl: { inputs: {tipo_producto, vinculo_problema, alcance, formato_evidencia}, respuestas: [{id, pregunta, eleccion}] }`.
- Pasar ese `hitl` a `suggest_products(...)` como contexto duro del prompt (las 3 opciones DEBEN respetar tipo/alcance/formato/vínculo y las respuestas del docente). Se puede mapear el `tipo_producto` al `category` existente y volcar el resto en el bloque de contexto del `_product_prompt`.
- Sin `hitl` → comportamiento actual intacto (no romper Step7 existente).
- Mantener cascada de providers; sin fallbacks sintéticos (fallo visible si todos caen).

**Reglas backend**
- Ownership por `user_id` en el endpoint nuevo (patrón del router).
- No cambiar la shape de `selected_product` ni del `timeline_json` (contrato de export y de SPEC-08).
- Opcional/traza: guardar `payload.product_hitl = { inputs, respuestas }` para reproducibilidad. No toca export.

---

## 🎛️ Frontend — cuestionario HITL en Step7

Antes de generar las 3 opciones, abrir un `GlassModal` (`size="lg"`, accent `cyan`) con 2 etapas, y recién al final disparar `products/suggest` con el `hitl`:

1. **Etapa Inputs:** 4 controles —
   - "Tipo de producto preferido" (select/chips: proyecto, informe, prototipo, app, campaña, material didáctico, …)
   - "Vínculo con el problema/contexto" (texto guiado)
   - "Alcance/complejidad" (individual/grupal + nivel)
   - "Formato de evidencia/entrega" (documento, exposición, repo digital, maqueta, video, portafolio)
   - Botón **"Generar preguntas"** → `api.generateProductQuestions(draftId, inputs)`.
2. **Etapa Preguntas:** 3-4 preguntas generadas; cada una = opciones (chips/radios) + input "Mi propia idea". Botón **"Generar productos"** → `api.suggestProducts(draftId, { hitl })` (el flujo job async existente; reusar el polling/overlay actual de Step7).
3. Al volver el job: se pintan las 3 cards/timeline **ya existentes** (sin cambios de UI ahí). El docente elige una → `products/select` (flujo actual).

- Estados de carga con el patrón existente de Step7 (overlay/job). GlassModal con scroll interno.
- Nuevos métodos en `src/api/client.ts`: `generateProductQuestions`, y extender `suggestProducts` para aceptar `hitl`. Tipos en `src/api/types.ts`.
- "Saltar cuestionario" opcional → llama `suggest` sin `hitl` (comportamiento actual), por si el docente quiere lo de antes. (Confirmar con tech lead si se permite saltar; por defecto se ofrece pero se recomienda completarlo.)

---

## ⚠️ Reglas duras
- Reusar `GlassModal` y el flujo job/cards de Step7; NO rediseñar Step7 (estable, SPEC-07).
- Íconos propios sin marco/border/bg.
- No fallbacks sintéticos de contenido IA.
- No alterar `selected_product`/`timeline_json` (contrato export + SPEC-08).
- Motor de preguntas server-side; no embebido en el prompt externo de NotebookLM.

---

## ✅ DoD-Técnico
- `npm run build` verde + tests backend de productos (la suite que cubra `products/suggest`).
- `products/questions` devuelve 3-4 preguntas contextualizadas al curso/método.
- `products/suggest` con `hitl` genera 3 opciones que reflejan tipo/alcance/formato/vínculo + respuestas; sin `hitl` mantiene el comportamiento actual.
- Ownership verificado.

## ✅ DoD-Usuario (valida tech lead)
- El docente fija qué tipo de producto quiere, responde preguntas a medida de su curso, y las 3 opciones generadas se sienten suyas, no genéricas. Puede elegir y continuar como hoy.

## 🔁 Al cerrar (regla recursiva)
Actualizar `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md`: patrón HITL de productos (cuestionario antes de generar), nuevos endpoints y task IA, y que `suggest` acepta `hitl` opcional sin romper el flujo legacy.
