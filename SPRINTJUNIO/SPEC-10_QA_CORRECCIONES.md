# SPEC-10 — Correcciones QA (Ortografía + Selector + Modal RSU)

**Sprint:** Junio 2026 · **Tarea:** T10 (sub-slices a/b/c/d) · **Tipo:** Lote QA post-SPEC-08
**Routing obligatorio antes de tocar:** `AGENTSROUTING/README.md` → `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` → esta SPEC.
**Depende de:** T2 (`GlassModal` ya existe en `src/components/ui/GlassModal.tsx`).

> El roadmap NotebookLM y la "matriz de evidencias" del listado QA **NO** van aquí:
> - Matriz de evidencias → ya cerrada en el sprint (commit `feat:MATRIZ DE EVALUACION` / SPEC-08).
> - Roadmap NotebookLM → es su propia **SPEC-11** (slice grande, pendiente de capturas del tech lead).

---

## 🎯 Objetivo

Cerrar tres correcciones de QA que degradan la percepción de calidad, sin redesigns:

1. **T10a — Ortografía:** corregir errores ortográficos en strings estáticos de UI (labels, botones, placeholders, títulos hardcodeados en `.tsx`). **No** toca salida generada por IA ni prompts del backend.
2. **T10b — Selector limpio desde la DB:** el selector de cursos/programas muestra basura/datos fuera de Educación. Se entrega **script SQL de limpieza** que el owner ejecuta manual en Supabase (los agentes no corren DDL/DML en prod). Opcional: filtro defensivo en frontend.limpieza de selector desde la db es mas q sufciente
3. **T10c — Módulo RSU con Human-in-the-Loop:** el RSU deja de ser "texto que la IA suelta y el docente edita en una caja apretada". Pasa a un flujo HITL donde **el docente es arquitecto del proceso**: llena 2 inputs + responde 3-4 preguntas generadas a medida del curso (con sus fuentes NotebookLM), y solo entonces la IA redacta el RSU, aún editable. Todo dentro de un `GlassModal`. En SyllabusEditor queda el editor amplio (sin motor de preguntas).
4. **T10d — Barrido de textos dev:** eliminar de toda la UI el texto interno de desarrollo visible al docente (leyendas de colores, badges "Placeholder", notas "se reemplazará al subir al cloud"). Crítico para la demo de hackathon.

---

## 📐 Decisiones cerradas (no reabrir)

| Tema | Decisión |
|---|---|
| Alcance ortografía | Solo strings estáticos de UI en `.tsx`. NO prompts backend, NO salida IA. |
| Entrega ortografía | Barrido + fixes aplicados (no solo lista). |
| Limpieza selector | Es limpieza de **datos en DB** → agente **propone SQL**, owner lo ejecuta en Supabase SQL Editor. Nunca correr DDL/DML prod desde el agente. |
| Modal RSU | Botón "Editar RSU" abre `GlassModal`. En la card queda preview corto. |
| RSU = HITL | Flujo: 2 inputs fijos (ámbito/comunidad + evidencia/entregable) → **motor de preguntas** genera 3-4 preguntas a medida del curso (opciones cerradas + campo "mi propia idea") → IA redacta el RSU → docente lo edita antes de guardar. El humano diseña, la IA ejecuta. |
| Motor de preguntas | Endpoint backend que toma curso (sumilla/desempeños/conocimientos/habilidades) **+ las referencias NotebookLM ya guardadas** en `payload.bibliography`. NO se embebe en el prompt externo de NotebookLM. |
| Endpoints RSU | **Dos**: `POST /steps/rsu/questions` (genera preguntas) y `POST /steps/rsu/suggest` (genera RSU desde inputs+respuestas). OpenRouter ligero, sin env nuevo. |
| Alcance RSU | HITL completo en Step Habilidades (`Step4_Contenido.tsx`). Editor amplio simple (sin motor) en `SyllabusEditor.tsx`. |
| Productos HITL | El mismo patrón aplicado a la propuesta de productos = **SPEC-13 aparte** (no toca Step7 aquí). |

---

## 🧩 T10a — Ortografía (strings estáticos UI)

### Qué corregir
Errores ortográficos/tildes en texto hardcodeado visible al docente: labels, headings, placeholders, botones, toasts. Ejemplos detectados en recon (no exhaustivo):
- "Guia" → "Guía", "guia" → "guía"
- "silabo" → "sílabo", "Silabo" → "Sílabo" (en strings de UI, **no** en claves/IDs/`payload_json`)
- "pestana" → "pestaña"
- "configuracion" → "configuración", "instruccion" → "instrucción", "importacion" → "importación"
- "academica" → "académica", "Busqueda" → "Búsqueda"
- "proposito" → "propósito", "metodo" → "método" (solo en texto visible)

### Reglas duras
- **NO** tocar: claves de `payload_json` (`bibliography`, `purpose`, `method`, `responsabilidad_social`, etc.), nombres de variables, IDs de rutas/steps, `localStorage` keys, valores enviados a la API.
- **NO** tocar prompts en `silabos-backend/prompts/` ni strings que viajan a la IA.
- **NO** tocar datos curriculares oficiales (vienen de DB, son source-of-truth).
- Solo literales de UI dentro de JSX/atributos `title`/`placeholder`/`label`/toasts.

### Cómo trabajar
1. Barrido por `silabos-frontend/src` (pages, components). Priorizar el wizard (`pages/creator/*`), dashboard, contexto.
2. Aplicar fixes con `Edit` literal por literal (evitar `replace_all` ciego que toque claves).
3. Registrar en el PR/commit la lista de archivos tocados.

### DoD-Técnico
- `npm run build` verde (sin TS rotos por comillas/acentos).
- Diff contiene **solo** literales de UI; ninguna clave/identificador alterado.

### DoD-Usuario
- Recorrer wizard completo + dashboard: no se ve ningún error ortográfico evidente en los textos fijos.

---

## 🧩 T10b — Selector limpio: facultades vacías

### Hallazgo (diagnóstico real ejecutado 2026-06-16 vía MCP Supabase, proyecto `silabos-mvp`)
La basura **NO** está en cursos (están perfectos) ni en programas. Está en **`faculties`**: el selector arranca por facultad y hay 3, pero solo 1 tiene data.

| Facultad | carreras | programas | cursos | |
|---|---|---|---|---|
| Ciencias Histórico Sociales y Educación | 1 | 8 | 466 | ✅ real |
| Facultad de Educación | 0 | 0 | 0 | ❌ vacía (`f48204c3-9180-4f9b-b8f8-8266ea3d494a`) |
| Facultad de Ingeniería | 0 | 0 | 0 | ❌ vacía (`920a5901-6e93-4f93-b750-0f4964999638`) |

- FK confirmada: solo `careers.faculty_id` referencia `faculties`. Las 2 vacías tienen 0 carreras → **DELETE seguro, sin huérfanos**.
- El selector vive en `silabos-frontend/src/pages/ContextSelector.tsx` (carga facultades → carreras → programas → cursos).
- `faculties` es tabla **protegida / source-of-truth**: el borrado lo ejecuta el **owner**.

### Entregable: `SPRINTJUNIO/sql/SPEC-10_selector_cleanup.sql`
Ya escrito y específico al hallazgo:
- **Fase 1** — re-verificación (SELECT de facultades con conteos).
- **Fase 2** — `DELETE FROM faculties WHERE NOT EXISTS (carrera)` (borra solo las vacías), dentro de transacción, comentado. Incluye variante por IDs explícitos.

### Reglas duras
- El agente **no ejecuta** `DELETE` en prod; el `.sql` va comentado en la fase destructiva.
- No tocar la facultad con data ni sus cursos/programas.

limpieza de selector desde la db es mas q sufciente
### DoD-Técnico
- `.sql` entregado (hecho).
- Filtro frontend aplicado: `npm run build` verde, facultad real intacta.

### DoD-Usuario (lo valida el owner)
- Tras correr el `.sql` en Supabase, el selector de facultad muestra **solo** "Ciencias Histórico Sociales y Educación". Sin facultades vacías/callejón.

---

## 🧩 T10c — Módulo RSU con Human-in-the-Loop (motor de preguntas + generación)

> Filosofía: el valor de automatizar no es que la IA decida, sino que **el docente diseñe** y la IA ejecute. El RSU se vuelve un mini-flujo HITL donde el docente es arquitecto.

### Estado actual
- **Step Habilidades** = `silabos-frontend/src/pages/creator/Step4_Contenido.tsx`.
  - RSU = `<textarea>` apretado (~L759), estado `responsabilidadSocial`/`setResponsabilidadSocial`.
  - Texto nace de `api.suggestContent(draftId)` → `d.responsabilidad_social` (~L581). Se persiste en `saveStep('content', { responsabilidad_social, ... })` (~L616).
- **Backend ya existente (reusar):**
  - `progressive_ai_service.sugerir_responsabilidad_social(curso, desempenos, conocimientos, habilidades, force_provider)` ([progressive_ai_service.py:248]).
  - Fallback determinista `_build_responsabilidad_social_activity(...)` en `routers/progressive.py`.
  - Endpoint `POST /api/syllabi/{id}/steps/content/suggest` ([progressive.py:1948]) ya llama al servicio RSU.
  - Routing IA por task en `gemini_service.py` (`progressive_rsu_suggest`). Tarea ligera → OpenRouter. **No requiere env nuevo.**
- **SyllabusEditor** (`SyllabusEditor.tsx` ~L1260): sección RSU es solo lectura.

### Backend — 2 endpoints nuevos

**1. `POST /api/syllabi/{syllabus_id}/steps/rsu/questions`**
- Body: `{ ambito: string, evidencia: string }` (los 2 inputs fijos del docente; pueden ir vacíos en una primera pasada).
- El handler arma contexto desde el draft: `curso` (sumilla/competencia/capacidad), desempeños de `payload.purpose`, conocimientos/habilidades de `payload.content`, **y las referencias de `payload.bibliography.references`** (fuentes NotebookLM/IA ya traídas).
- Nuevo método servicio `progressive_ai.generar_preguntas_rsu(curso, desempenos, conocimientos, habilidades, bibliografia_refs, ambito, evidencia)`:
  - Prompt pide JSON estricto: 3-4 preguntas a medida del curso. Cada pregunta = `{ id, pregunta, opciones: [3-4 strings concretas y contextualizadas al curso], permite_idea_propia: true }`.
  - Las opciones deben ser concretas y locales (apoyarse en `TERRITORIAL_CONTEXT_BLOCK` que ya usa el servicio RSU), no genéricas.
  - Task IA nueva `progressive_rsu_questions` en `gemini_service.py` (mismo perfil ligero que `progressive_rsu_suggest`).
- Respuesta: `{ preguntas: [...] }`.

**2. `POST /api/syllabi/{syllabus_id}/steps/rsu/suggest`**
- Body: `{ ambito, evidencia, respuestas: [{ id, pregunta, eleccion }] }` donde `eleccion` = opción elegida **o** la idea propia escrita por el docente.
- Extiende/usa `sugerir_responsabilidad_social` añadiendo al prompt los 2 inputs + las respuestas como restricciones duras (el RSU DEBE reflejar ámbito, evidencia y las decisiones del docente).
- Respuesta: `{ responsabilidad_social: string }` (4-5 líneas, mismas reglas actuales).
- Mantener el fallback determinista si la IA falla (sin fallbacks sintéticos de relleno: si todos los providers fallan, error visible).

**Reglas backend**
- Verificar ownership por `user_id` (patrón de los otros endpoints del router).
- No alterar la shape de `responsabilidad_social` en `payload_json` (sigue siendo string).
- Opcional/traza: guardar `payload.content.rsu_meta = { ambito, evidencia, respuestas }` para reproducibilidad. No rompe export.

### Frontend — GlassModal HITL en Step Habilidades
Reemplazar el textarea apretado por **card/preview corto + botón "Diseñar RSU"** que abre un `GlassModal` (`size="lg"`, accent `cyan`) con 3 etapas internas:

1. **Etapa Inputs:** 2 campos — "Ámbito / comunidad objetivo" y "Evidencia / entregable esperado" — + botón **"Generar preguntas"** → `api.generateRsuQuestions(draftId, { ambito, evidencia })`.
2. **Etapa Preguntas:** render de las 3-4 preguntas. Cada una: opciones como chips/radios seleccionables **+** input "Mi propia idea" (al escribir, anula la opción elegida). Botón **"Generar RSU"** → `api.suggestRsu(draftId, { ambito, evidencia, respuestas })`.
3. **Etapa Redacción:** `<textarea>` amplio con el RSU generado, **editable** (human-in-the-loop final). Botones "Regenerar" (vuelve a /suggest con las mismas respuestas) y "Guardar" (aplica al estado `responsabilidadSocial`).

- Estados de carga con `OverlayLoader` o spinner inline; el GlassModal garantiza scroll interno.
- El guardado real sigue en `saveStep('content', { responsabilidad_social, ... })` al continuar el step. El modal solo edita estado local.
- Sinergia: como **Fuentes es obligatorio** (SPEC-11), al llegar a Habilidades ya hay referencias para que las preguntas sean a medida. Si por algún draft viejo no hay fuentes, el motor degrada con solo curso+desempeños (no bloquea).
- Nuevos métodos en `src/api/client.ts`: `generateRsuQuestions`, `suggestRsu`. Tipos en `src/api/types.ts`.

### Frontend — SyllabusEditor (acotado)
Botón "Editar" en la sección RSU abre un `GlassModal` con **solo el editor amplio** (textarea + Guardar/Cancelar), sin motor de preguntas. Guardar por el path de persistencia que ya usa el editor para otras secciones. No inventar persistencia nueva.

### Reglas duras
- Reusar `GlassModal`; no modal nuevo desde cero.
- Íconos propios: sin marco/border/bg.
- No fallbacks sintéticos de contenido IA (cascada de providers + fallo visible).
- No cambiar shape de `responsabilidad_social` (string) en `payload_json`.
- El motor de preguntas NO se embebe en el prompt externo de NotebookLM (decisión cerrada): se genera server-side desde data ya guardada.

### DoD-Técnico
- `npm run build` (frontend) verde + tests backend relevantes (`python -m unittest silabos-backend.tests.test_progressive_step_blocks`).
- `POST /steps/rsu/questions` devuelve 3-4 preguntas con opciones contextualizadas al curso.
- `POST /steps/rsu/suggest` devuelve RSU que refleja ámbito + evidencia + respuestas.
- Ownership verificado en ambos endpoints.

### DoD-Usuario
- El docente llena ámbito/evidencia, responde preguntas a medida de SU curso (elige o escribe su idea), genera el RSU, lo retoca y guarda. Se siente arquitecto, no espectador. Texto persiste tras recargar.

---

## 🧩 T10d — Barrido global de textos dev/placeholder visibles al usuario

### Problema (crítico para hackathon)
Hay texto interno de desarrollo renderizado al docente. Ejemplo fatal en el roadmap NotebookLM (`Step2A_NotebookGuide.tsx`):
> "Las tarjetas con borde cyan abren un sub-flujo con pasos detallados. Las tarjetas verdes incluyen mini video, instrucciones y prompt listo para copiar. Las demas tarjetas muestran una imagen de guia."

Y en el modal de paso: badge **"Placeholder"**, "Esta pantalla queda lista para reemplazar la imagen por tu mini video cuando lo subas al cloud", "Este video sera reemplazado por tu mini guia de 6 a 8 segundos cuando lo subas al cloud".

### Qué hacer
Barrido **global** en `silabos-frontend/src`: localizar y **eliminar/comentar** todo texto que solo sirve al equipo de desarrollo y no debe ver el usuario final:
- Leyendas que explican el código de colores/tipos de tarjeta.
- Badges y notas "Placeholder", "se reemplazará cuando subas al cloud", "esta pantalla queda lista para...".
- Cualquier `note`/comentario de scaffolding visible (TODO de UI, "mini video de 6-8s", referencias a "cloud", etc.).

### Reglas
- Preferir **eliminar** el render (no dejar el string en pantalla). Si el bloque puede volver a usarse, comentarlo en JSX (`{/* ... */}`), no mostrarlo.
- Los videos Cloudinary del roadmap **ya son reales** (`NOTEBOOK_VIDEOS.*`): quitar todo framing de "placeholder/se reemplazará". El `<video>` se muestra como contenido final, sin badge "Placeholder".
- No borrar texto funcional que el docente sí necesita (instrucciones de pasos, prompts, labels).

### DoD-Técnico
- `grep` sin resultados visibles de: "Placeholder", "reemplaza", "cloud", "sub-flujo", "borde cyan", "mini video de 6" en strings renderizados de UI.
- `npm run build` verde.

### DoD-Usuario
- Ninguna pantalla muestra texto que delate que es un prototipo o que hable al desarrollador. Listo para demo de hackathon.

> Nota: el rediseño visual del roadmap (timeline vertical) va en **SPEC-11**. Aquí T10d solo **borra** el texto dev; SPEC-11 reconstruye el layout.

---

## ✅ Verificaciones del slice
- Frontend: `npm run build` desde `silabos-frontend`.
- Si T10b aplica filtro: revisar que cursos oficiales válidos sigan apareciendo.
- Screenshot del GlassModal RSU (chrome-devtools-mcp) para evidencia visual.

## 🔁 Al cerrar (regla recursiva)
Actualizar `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` con:
- el patrón "RSU se edita por GlassModal, no textarea inline";
- nota de que la limpieza del selector se gobierna por SQL manual del owner (no agente);
- la convención de ortografía (solo UI estática, nunca claves/payload).
