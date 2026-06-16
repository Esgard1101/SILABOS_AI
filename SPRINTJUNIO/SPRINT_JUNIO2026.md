# SPRINT JUNIO 2026 — Estabilidad + Continuidad + UX Dinámica

**Proyecto:** SIGEISIL (silabos_app)
**Stack:** Frontend React 18 + Vite + TypeScript + Tailwind + lucide-react + motion/react · Backend FastAPI + SQLAlchemy/psycopg2 sobre `DATABASE_URL` (Supabase Postgres) · Auth JWT propio (no Supabase Auth).
**Rol de Capa 2 (ejecución):** Las decisiones de arquitectura ya están tomadas y viven en este SPRINT + cada SPEC. El agente programa; no decide arquitectura. Ante ambigüedad: detener y preguntar.

---

## 🎯 Objetivo del Sprint

Cerrar los 2 bugs estructurales que degradan la confianza del docente (modales sin scroll, sidebar "desactivado" tras login), garantizar que ningún docente pierda su avance (autosave + continuar último sílabo), y modernizar las superficies de selección (cursos, producto acreditable) con el sistema visual **liquid glass** sobre el theme navy existente. Cierra con el nuevo módulo post-wizard "Documento de Proyecto".

---

## 📚 Lecturas obligatorias antes de ejecutar (routing)

El agente de Capa 2, al tomar CUALQUIER tarea, lee en este orden:

1. `AGENTSROUTING/README.md` (reglas globales no negociables)
2. El módulo de `AGENTSROUTING/` que la SPEC indique en su cabecera
3. La SPEC específica de la tarea (esta carpeta)
4. Solo si retoma tarea iniciada: el diff/commits previos de esa tarea

**Reglas heredadas que NINGUNA tarea puede violar:**

- NO ejecutar el refactor V2 de `docs/architecture/` (sin luz verde). Todo se trabaja sobre la estructura actual.
- Datos curriculares oficiales = source-of-truth, la IA no los edita.
- Export DOCX/PDF es el contrato final: cualquier cambio de shape de contenido verifica el mapping de export.
- Sin fallbacks sintéticos de contenido IA: cascada de providers y fallo visible.
- Imágenes/íconos personalizados del user: **nunca** con marco, border ni background.
- Credenciales: NUNCA se escriben en docs, specs, commits ni logs.

---

## 🧭 Glosario del proyecto (§2 — mata ambigüedad)

| Concepto | Valor real en este proyecto |
|---|---|
| Identificador de usuario | `users.id` (UUID). En payloads/funciones backend viaja como `user_id`. |
| Rol | `users.role` string plano: `admin` / `director` / `coordinador` / `docente` (sin tabla de roles). `MANAGEMENT_ROLES = {admin, director, coordinador}`. |
| Tenant/scope | No hay tenant duro. El aislamiento es por propiedad: draft = `course_id + semester + user_id + program_id`. Contexto institucional vive en `useAppContext` (storage del navegador). |
| Draft / sílabo | Fila en `syllabi` modo `v3-progressive`. Todo el avance vive en `payload_json` por bloques: `bibliography`, `purpose`, `content`, `method`, `grading`, `final_syllabus`, `_meta`, `_workflow`, `course_snapshot`. |
| Guardado de paso | `PATCH /api/syllabi/{id}/steps/{key}` → `api.saveProgressiveStep` → `guardar_step_block` (verificar ownership por `user_id`). |
| Sesión frontend | `sessionStorage`: `silabos_token`, `silabos_user`, `sigesil_draft_id` (DRAFT_KEY). Ver SPEC-02 (migra a localStorage). |
| Wizard | 12 pasos canónicos definidos en `CreatorLayout.tsx` → `ROUTE_STEP` (pasos 3-12 son rutas `/creator/*`; 1-2 son login/contexto). |

---

## 🎨 Sistema de diseño "Liquid Glass" (tokens del sprint)

Se aplica SOLO en las superficies nuevas/redisenadas (modales, cards, timeline). Convive con el theme navy actual.

- **Paleta base existente (no cambiar):** fondo `#041A3A` / `#0B192C`, panel `#162A45`, cyan `#00B4CC`/`#00B4D8`/`#6FE9F5`, dorado `#D4A351`/`#D4AF37`, teal `#00A896`.
- **Superficie glass:** `bg-white/[0.06] backdrop-blur-2xl border border-white/12 ring-1 ring-inset ring-white/10`.
- **Superficie glass elevada (modales):** `bg-[#0B192C]/75 backdrop-blur-xl border border-[#00B4D8]/25 shadow-2xl shadow-cyan-950/40`.
- **Radios:** `rounded-2xl` cards, `rounded-3xl` modales. (Los modales actuales del wizard son cuadrados: las superficies migradas a glass adoptan el radio nuevo.)
- **Overlay estándar:** `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm`.
- **Animación:** `motion/react` ya instalado — entrada modal: fade overlay + scale 0.97→1 del panel.
- **Íconos de elaboración propia (`<img>`):** sin marco, sin border, sin bg, tamaño mediano, click abre vista/modal de guía.

---

## 📝 Backlog del Sprint (Slices Verticales)

> Cada tarea es end-to-end y testeable sola. Detalle completo en su SPEC.

### ÉPICA 1 — Estabilidad (bugs)

**T1 — AuthProvider singleton: sidebar nunca más "desactivado"** → [SPEC-02](SPEC-02_AUTH_PROVIDER_SINGLETON.md)
Causa raíz confirmada: `useAuth` es hook con estado local; cada componente crea su propia instancia y dispara su propio `validateSession()`; cualquier error de red (no solo 401) borra la sesión. Se convierte en Context Provider único + política de limpieza solo-401/403 + storage multi-pestaña.
- **Depende de:** ninguna. **PRIMERA tarea del sprint** (estabiliza todo lo demás).

**T2 — Componente `GlassModal` + reparación de modales sin scroll** → [SPEC-01](SPEC-01_GLASSMODAL_AUDITORIA.md)
Crea el componente base liquid glass con scroll interno garantizado y repara el `ProductDetailModal` (bug reportado) + auditoría de los ~29 overlays detectados.
- **Depende de:** ninguna. T4/T7 lo consumen.

**T3 — Numeración de pasos: una sola fuente de verdad** → [SPEC-03](SPEC-03_NUMERACION_PASOS_WIZARD.md)
Gap detectado en recon: 9 archivos con "PASO X DE Y" hardcodeado y desincronizado (denominadores 8, 11 y 12 conviviendo). Se centraliza en `ROUTE_STEP` de `CreatorLayout`.
- **Depende de:** ninguna.

### ÉPICA 2 YA ESTA  — Continuidad (nunca perder avance)

**T4 — Autosave reforzado + resume state persistido** → [SPEC-05](SPEC-05_AUTOSAVE_RESUME.md)
`saveStep` ya persiste bloques; se agrega `payload_json._meta.resume` (última ruta, paso, timestamp) + endpoint de "último draft en progreso" + flujo de restauración completa (contexto desde `course_snapshot` + hidratación + navegación al paso exacto).
- **Depende de:** T1 (auth estable).

**T5 — Dashboard dinámico: card "Continuar tu último sílabo" + Mis Sílabos en cards** → [SPEC-06](SPEC-06_DASHBOARD_DINAMICO.md)
Card prominente de resume (curso, paso, % avance, CTA) + rediseño de la vista Mis Sílabos a grid de cards con estado y filtros.
- **Depende de:** T4 (endpoint resume).

### ÉPICA 3 — UX de selección

**T6 YA ESTA — Selector de cursos: modal glass con búsqueda + agrupación por ciclo** → [SPEC-04](SPEC-04_SELECTOR_CURSOS_MODAL.md)
Reemplaza el `<select>` nativo de cursos (40+ items) en `/select-context`.
- **Depende de:** T2 (GlassModal).

**T7 — Selección de producto: 3 cards dashboard + modal timeline liquid glass** → [SPEC-07](SPEC-07_PRODUCT_CARDS_TIMELINE.md) ✅ DONE
Reemplaza por completo las filas/tabla de opciones del Step7. Incluye dedupe de opciones acumuladas (riesgo conocido del módulo 02).
- **Depende de:** T2 (GlassModal).
- **Entregado:** card grid glass + modal timeline vertical; `ProductOptionRow` eliminado; dedupe determinista; payload select intacto; build verde. Bonus: mismo estilo glass aplicado a Step9 WeekCard.

**T8 — Estandarización de evidencias PA en cronograma (cero IA)** → [SPEC-08](SPEC-08_ESTANDARIZACION_EVIDENCIAS.md)
`evidencia = "Producto Acreditable N"` + sigla + semana; el detalle largo del timeline queda como texto secundario de UI y en `selected_product.timeline_json`. Verifica mapping a export (Sistema de Evaluación/Calificación).
- **Depende de:** ninguna (serializar con T7 si tocan utilidades compartidas de timeline).

### ÉPICA 4 — Módulo nuevo

**T9 — "Documento de Proyecto" post-wizard (sub-slices a/b/c)** → [SPEC-09](SPEC-09_DOCUMENTO_PROYECTO.md)
Módulo fuera del wizard: guía redactable para estudiantes del producto acreditable, estructuras precargadas por metodología, APA 7, generación IA por sección con Human-in-the-loop, export DOCX propio (NO toca el DOCX del sílabo).
- **Depende de:** T2 (GlassModal), producto seleccionado existente. Gatillo de degradación real → 3 sub-slices verticales (T9a estructura+editor, T9b IA por sección, T9c export).

### ÉPICA 5 — Ronda QA post-SPEC-08

**T10 — Correcciones QA: ortografía + selector + modal RSU + textos dev (sub-slices a/b/c/d)** → [SPEC-10](SPEC-10_QA_CORRECCIONES.md)
T10a ortografía en strings estáticos de UI (no IA, no payload) · T10b limpieza del selector de cursos vía SQL manual del owner (+ filtro defensivo opcional) · T10c reemplaza el textarea apretado de RSU por `GlassModal` editor amplio en Step Habilidades y SyllabusEditor · T10d barrido global de textos dev/placeholder visibles al usuario (crítico hackathon).
- **Depende de:** T2 (GlassModal). "Matriz de evidencias" del listado QA = ya cerrada (SPEC-08); NO entra aquí. T10d comparte limpieza con T11.

**T11 — Roadmap NotebookLM: timeline vertical + botón "Ir a NotebookLM" + paso obligatorio** → [SPEC-11](SPEC-11_ROADMAP_NOTEBOOK.md)
Rediseño del roadmap a **timeline vertical de 1 dirección** (público 30-49), 6 cards → 5 pasos consolidados, progreso marcable. La card "Crear cuaderno" deja de auto-abrir la pestaña; el botón "Ir a NotebookLM" vive dentro del `PromptVideoModal`. Step Fuentes se vuelve **obligatorio** (gate: quitar "Omitir", bloquear "CONTINUAR" hasta ≥1 fuente) porque los motores de generación de unidades dependen de NotebookLM.
- **Depende de:** T2, Step2_Fuentes + Step2A_NotebookGuide. Hacer T10d antes/junto.

**T13 — Producto Acreditable con HITL: cuestionario antes de generar** → [SPEC-13](SPEC-13_PRODUCTOS_HITL.md)
Gemela del RSU HITL (T10c) aplicada a productos. Antes de que la IA proponga las 3 opciones, un `GlassModal` con 4 inputs (tipo/vínculo/alcance/formato) + 3-4 preguntas a medida (opciones cerradas + idea propia) generadas desde curso+método+grading+fuentes NotebookLM. Endpoint nuevo `products/questions` + `products/suggest` extendido con `hitl` opcional (sin romper el flujo legacy). NO rediseña el Step7 estable.
- **Depende de:** T2, Step7 (SPEC-07 DONE), Fuentes obligatorio (SPEC-11). No hay SPEC-12 (el RSU HITL vive en SPEC-10 T10c por decisión).

---

## ⚠️ Limitaciones y guías para Capa 2

- **Slices verticales obligatorios:** la tarea cierra cuando es interactuable en navegador. Prohibido cerrar "solo backend" o "solo UI" salvo sub-slices declarados (T9).
- **No sobreingeniería:** nada de librerías nuevas de UI/estado. Tailwind + motion/react + lucide ya cubren el liquid glass.
- **Entorno:** desarrollo y DoD-Técnico en local; verificación final del DoD-Usuario en prod (curso "Programación con Robótica", programa Educ. Matemática y Computación) la hace el tech lead.
- **chrome-devtools-mcp:** disponible reiniciando sesión; cada sesión de tarea puede usarlo para verificar visualmente su slice (screenshot del modal/card). No es excusa para testeo E2E agéntico masivo.
- **Verificaciones estándar:** `npm run build` (frontend) · `python -m unittest silabos-backend.tests.<suite>` (backend) · si se toca shape exportable: `python -m unittest silabos-backend.tests.test_word_generator_dates`.
- **Al cerrar tarea aceptada por el user:** actualizar el MD correspondiente de `AGENTSROUTING/` (regla recursiva del README).

---

## 🗂️ Tabla resumen para asignación manual

| Tarea | Módulo | Tipo | SPEC | Depende de | Toca archivos compartidos | Asignado a |
|---|---|---|---|---|---|---|
| T1 | Auth/Layout | Bugfix estructural | SPEC-02 | — | useAuth, App, MasterLayout, ProtectedRoute | [ ] |
| T2 | UI base | Componente + bugfix | SPEC-01 | — | components/ui, Step7 | [ ] |
| T3 | Wizard | Bugfix UI | SPEC-03 | — | CreatorLayout + 9 Steps (solo headers) | [ ] |
| T4 | Drafts | Feature E2E | SPEC-05 | T1 | SyllabusContext, progressive.py | [ ] |
| T5 | Dashboard | Feature E2E | SPEC-06 | T4 | Dashboard, SyllabusList | [ ] |
| T6 | Contexto | Feature UI E2E | SPEC-04 | T2 | ContextSelector | [ ] |
| T7 | Producto | Redesign E2E | SPEC-07 | T2 | Step7_ProductoIntegrador | [x] DONE |
| T8 | Evaluación | Normalización | SPEC-08 | — (serializar c/ T7) | Step6_Cierre, SyllabusContext | [ ] |
| T9a/b/c | Doc Proyecto | Módulo nuevo | SPEC-09 | T2 | router nuevo, tabla nueva, página nueva | [ ] |
| T10b | QA selector | Limpieza DB | SPEC-10 | — | faculties (owner ejecutó SQL) | [x] DONE |
| T10a/c/d | QA | Correcciones | SPEC-10 | T2 | Step4_Contenido, SyllabusEditor, barrido global | [ ] |
| T11 | Notebook | Redesign E2E | SPEC-11 | T2 (+T10d) | Step2_Fuentes, Step2A_NotebookGuide | [ ] |
| T13 | Producto HITL | Feature E2E | SPEC-13 | T2, SPEC-07, SPEC-11 | Step7_ProductoIntegrador, progressive_curriculum(.py/_engine), gemini_service | [ ] |
