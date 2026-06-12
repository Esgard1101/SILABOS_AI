# SPEC-01 — Componente `GlassModal` + auditoría de modales sin scroll

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (UI base + wizard)
**Estado:** LISTO PARA EJECUTAR
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` (por tocar Step7)

---

## 1. Resumen y objetivo

Bug reportado: el modal de detalle del producto acreditable se ve "horrible" — el contenido (timeline PA con textos largos) desborda la pantalla y **no aparece scroll**. Causa raíz confirmada en `ProductDetailModal` ([Step7_ProductoIntegrador.tsx:168](../silabos-frontend/src/pages/creator/Step7_ProductoIntegrador.tsx)): el panel no tiene `max-height` ni cuerpo scrolleable.

El mismo patrón frágil (`fixed inset-0 ... flex items-center justify-center` + panel sin límite de altura) se repite en ~29 overlays del proyecto. Solución: **un componente base `GlassModal`** con scroll interno garantizado y estética liquid glass, + reparación inmediata de los modales rotos.

---

## 2. Glosario y datos

- **Entidad principal:** ninguna (UI pura, sin DB).
- **Archivos nuevos:** `silabos-frontend/src/components/ui/GlassModal.tsx`.
- **Archivos que modifica:** `Step7_ProductoIntegrador.tsx` (ProductDetailModal y NotebookHelpModal) + los modales rotos que la auditoría confirme.

---

## 3. Alcance (Features E2E)

### Incluye (entregable core)

- [ ] `GlassModal`: overlay + panel glass con estructura de 3 zonas:
  - panel: `flex max-h-[88vh] w-full flex-col rounded-3xl` + superficie glass elevada (tokens del SPRINT §design).
  - header y footer: `shrink-0`.
  - body: `min-h-0 flex-1 overflow-y-auto` ← **esta línea es el fix del bug**.
  - props: `size` (`sm|md|lg|xl` → max-w-md/2xl/3xl/5xl), `title?`, `onClose`, `footer?`, `children`.
  - cierre por ESC y click en overlay; `role="dialog"` + `aria-modal="true"`; animación motion (fade + scale 0.97→1).
- [ ] Migrar `ProductDetailModal` y `NotebookHelpModal` (Step7) a `GlassModal`. Mismo contenido, ahora scrolleable.
- [ ] Auditoría de la lista de abajo: por cada overlay, verificar en código si el panel puede crecer sin límite; si sí, migrar a `GlassModal` o aplicar el trío `max-h + min-h-0 + overflow-y-auto`.

### Inventario de overlays a auditar (grep `fixed inset-0 z-`)

| Archivo | Líneas | Nota |
|---|---|---|
| `creator/Step7_ProductoIntegrador.tsx` | 71, 168 | 168 = bug reportado. PRIORIDAD |
| `creator/Step8b_MapaConocimientos.tsx` | 162, 192, 233, 447, 620 | contenido IA largo, alto riesgo |
| `creator/Step8_ProgramaProgresivo.tsx` | 489, 554, 600, 641 | ídem |
| `creator/Step2_Fuentes.tsx` | 294, 368 | |
| `creator/Step2A_NotebookGuide.tsx` | 79, 170 | 79 ya tiene `overflow-y-auto` interno (línea 89) — verificar |
| `creator/Step2A_1_ManualUpload.tsx` | 15 | |
| `creator/Step2A_2_DeepResearch.tsx` | 135 | |
| `creator/Step1_Repositorio.tsx` | 67 | |
| `creator/Step4_Contenido.tsx` | 296 | |
| `components/NotebookLMGuide.tsx` | 210 | |
| `pages/SyllabusList.tsx` | 591 | |

**Exentos:** BlockingLoaders compactos (`z-[80]`, Step6:179, Step7:54, Step8:665, Step8b:145, Step2A_2:65), overlay del sidebar (OffcanvasSidebar:108), push-side-panel:109 y drawer de Review:337 (no son modales centrados).

### Fuera de alcance

- Rediseñar el contenido interno de cada modal (solo contenedor/scroll; el redesign de producto es SPEC-07).
- Focus-trap completo (stretch; ESC + overlay-click es suficiente este sprint).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** NO (patrón de contenedor; la estética sale de los tokens del SPRINT).
- **Distribución:** overlay oscuro blur → panel glass centrado, nunca más alto que 88vh, header fijo con título + botón X, cuerpo scrolleable, footer fijo con acciones. En móvil (`px-4 py-6`) el panel ocupa el ancho disponible.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Scroll):** Con un producto cuyo timeline PA tenga textos de 200+ palabras por hito (caso real del curso Programación con Robótica), el modal muestra scroll interno y el footer "Seleccionar producto" permanece visible y clickeable.
- **CA-02 (Viewport bajo):** En altura 720px o menor, ningún modal corta contenido sin scroll.
- **CA-03 (No regresión):** Los modales migrados conservan exactamente sus props/acciones (onSelect, onClose, estados busy/selected).
- **CA-04 (Z-index):** GlassModal usa `z-50`; los BlockingLoaders permanecen en `z-[80]` por encima.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Abro `/creator/producto` con el curso de prueba, clic en "Ver detalle" de una opción con timeline largo → el modal scrollea, los botones del footer siempre visibles.
- [ ] Reduzco la ventana a ~700px de alto → sigue usable.
- [ ] ESC y click fuera cierran el modal.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] Grep de verificación: ningún modal centrado del inventario queda sin `max-h` + `overflow-y-auto` en su cuerpo.
- [ ] (Si la sesión tiene chrome-devtools-mcp) screenshot del ProductDetailModal abierto con contenido largo como evidencia.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T2 (esta SPEC) | Componente UI + bugfix | NO | — | [ ] |
