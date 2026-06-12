# SPEC-07 — Selección de producto: 3 cards dashboard + modal timeline liquid glass

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (Step7 `/creator/producto`)
**Estado:** LISTO PARA EJECUTAR (mockup pendiente de aprobación)
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` (OBLIGATORIO: contrato de product options, regla del objeto concreto, riesgo de opciones acumuladas)

---

## 1. Resumen y objetivo

Hoy las opciones de producto acreditable se muestran como filas de tabla densas (`ProductOptionRow`) difíciles de leer. Decisión del user: **reemplazo total** por 3 cards estilo dashboard (una por opción generada con conocimiento NotebookLM), cada una abre un modal liquid glass con la **desagregación del producto en timeline** legible (PA1 → PA2 → PA3) para que el docente lea con comodidad antes de decidir.

---

## 2. Glosario y datos

- **Entidad principal:** `curricular_product_options` vía API existente (cero cambios de backend):
  - `GET /api/syllabi/{id}/progressive/state`, `POST .../products/suggest` (job async + poll `GET /api/jobs/{job_id}`), `POST .../products/select`.
  - Shape opción: `category`, `title`, `justification`, `work_object`, `work_object_type`, `timeline_json`, `selected`.
- **Regla de oro (routing 02):** la card DEBE exponer las 3 áreas: Producto Acreditable (`title`+`justification`), Objeto de Trabajo (`work_object`, contextualizado UNPRG/Lambayeque) y timeline PA (`timeline_json`). El objeto de trabajo no puede desaparecer del redesign.
- **Archivos que modifica:** `pages/creator/Step7_ProductoIntegrador.tsx` (muere `ProductOptionRow`; `ProductDetailModal` se rehace sobre `GlassModal`). Se conservan: selector de categoría, textarea de contexto NotebookLM, flujo suggest/poll.
- **Tablas:** ninguna nueva.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] **Grid de 3 cards glass** (responsive 1→3 columnas), una por opción visible:
  - badge de categoría (dorado), título del producto, teaser del `work_object` (2-3 líneas, line-clamp), mini-indicador de hitos (chips PA1·PA2·PA3 con semana si `timeline_json` la trae),
  - CTA primario "Ver desagregación" (abre modal) + acción secundaria "Seleccionar" directa,
  - card de opción seleccionada: ring cyan + badge "Seleccionado".
- [ ] **Dedupe de opciones acumuladas** (riesgo documentado routing 02): mostrar solo las 3 más recientes no-seleccionadas + la seleccionada si existe (regla visible y determinista, sin tocar la BD).
- [ ] **Modal timeline (GlassModal `lg`):**
  - encabezado: categoría + título;
  - panel "Objeto de trabajo" destacado (tipo + texto completo);
  - "Justificación" en prosa completa;
  - **timeline vertical** PA1 → PA2 → PA3: nodo glass por avance con chip de semana ("Semana 6") y descripción completa scrolleable — adiós a las 3 columnas truncadas;
  - footer: Cerrar + "Seleccionar producto" (estados busy/selected actuales).
- [ ] Estados: sin opciones aún (CTA generar), job corriendo (loader actual), error de job visible (sin fallback sintético).
- [ ] Regenerar opciones conserva el flujo actual (nuevo job → reemplaza las 3 cards visibles).

### Fuera de alcance

- Cambios al prompt/engine de generación de producto, al endpoint select o al snapshot `selected_product` (shape intacto).
- Edición manual del producto (no existe hoy; no se agrega).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** SÍ → `resources/mockups/product-cards-timeline.html` — Estado: PENDIENTE.
- **Prompt para el agente de mockup (chat aparte):**
  > Mockup HTML+Tailwind dark navy (#0B192C fondo) de selección de "Producto Acreditable" universitario. Sección con 3 cards glass (rounded-3xl, bg-white/[0.06], backdrop-blur, borde white/12, hover borde cyan #00B4D8): cada card con badge categoría dorado #D4AF37 uppercase ("PROYECTO"), título 2 líneas ("Prototipo Robótico Educativo con Guía de Mediación Matemática"), párrafo gris 3 líneas con line-clamp del objeto de trabajo, fila de chips "PA1 · S6", "PA2 · S11", "PA3 · S16", y dos botones: "Ver desagregación" (outline cyan) y "Seleccionar" (teal #00A896). Una card con ring cyan y badge "Seleccionado". Al lado, segunda vista: modal glass abierto con timeline VERTICAL de 3 nodos conectados por línea cyan: cada nodo con círculo glass "PA1", chip "Semana 6" y párrafo descriptivo completo; header con título del producto y panel destacado "Objeto de trabajo"; footer con botones Cerrar y Seleccionar producto. Estética universitaria sobria, sin emojis.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Tres áreas):** Toda card muestra título, objeto de trabajo y referencia de timeline. Si `work_object` falta (opción legacy), la card lo marca "Objeto de trabajo pendiente — regenerar sugerencias" y deshabilita Seleccionar (consistente con el bloqueo de Step9 documentado).
- **CA-02 (Timeline largo):** Descripciones de 200+ palabras por PA scrollean dentro del modal (hereda fix SPEC-01); nunca texto cortado sin acceso.
- **CA-03 (Selección única):** Seleccionar desde card o modal marca exactamente una opción (server-side ya lo garantiza; la UI refleja el estado del response, no asume).
- **CA-04 (Sin IA en render):** Dedupe y chips de semana se derivan de `timeline_json` localmente — cero llamadas IA nuevas.
- **CA-05 (Job en curso):** Mientras el job corre, las cards previas quedan deshabilitadas visualmente (no clickeables) para evitar seleccionar una opción a punto de ser reemplazada.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Genero sugerencias para el curso de prueba → veo 3 cards legibles; abro desagregación → leo el timeline completo cómodo; selecciono → la card queda marcada y puedo avanzar al mapa de conocimientos.
- [ ] La implementación coincide con el mockup aprobado.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] El POST de select envía exactamente el mismo payload que antes (diff de request manual o test de cliente).
- [ ] `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine` sigue verde (sanity: no se tocó backend).
- [ ] (Si hay chrome-devtools-mcp) screenshots: grid de cards + modal timeline abierto.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T7 (esta SPEC) | Redesign UI E2E | SÍ | T2 (GlassModal) | [ ] |
