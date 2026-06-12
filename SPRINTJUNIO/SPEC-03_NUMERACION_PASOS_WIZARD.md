# SPEC-03 — Numeración de pasos del wizard: una sola fuente de verdad

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (wizard `/creator/*`)
**Estado:** LISTO PARA EJECUTAR
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md`

> **Origen:** vacío detectado durante el diagnóstico del sprint (no reportado por el user, pero visible en sus screenshots: header "PASO 9 DE 11 - SISTEMA DE EVALUACION" mientras el stepper dice "Paso 10 de 12").

---

## 1. Resumen y objetivo

El wizard tiene **12 pasos canónicos** (`CreatorLayout.tsx` → `ROUTE_STEP`, `TOTAL_STEPS = 12`), pero cada página de paso imprime su propio header "PASO X DE Y" **hardcodeado**, con denominadores 8, 11 y 12 conviviendo. Resultado: el docente ve dos numeraciones distintas en la misma pantalla.

### Inventario del desorden (grep confirmado)

| Archivo | Línea | Texto hardcodeado | Real (ROUTE_STEP) |
|---|---|---|---|
| `Step1_Repositorio.tsx` | 334 | PASO 3 DE 8 | 3 de 12 ✗ denominador |
| `Step2_Fuentes.tsx` | 764 | PASO 4 DE 8 | 4 de 12 ✗ |
| `Step3_Desempenos.tsx` | 421 | PASO 5 DE 8 | 5 de 12 ✗ |
| `Step5_Metodo.tsx` | 446 | Paso 7 de 8 | 7 de 12 ✗ |
| `Step7_ProductoIntegrador.tsx` | 495 | Paso 8 de 11 | 8 de 12 ✗ |
| `Step6_Cierre.tsx` | 486 | Paso 9 de 11 | **10** de 12 ✗✗ (número y denominador) |
| `Step8b_MapaConocimientos.tsx` | 1043 | Paso 9 de 12 | 9 de 12 ✓ |
| `Step8_ProgramaProgresivo.tsx` | 976 | Paso 11 de 12 | 11 de 12 ✓ |
| `Step9_CierreProgresivo.tsx` | 134 | Paso 12 de 12 | 12 de 12 ✓ |

También verificar `PersistentRightPanel` y `Step4_Contenido.tsx` durante ejecución (el panel derecho muestra "PASO 4 DE 12" en screenshots — confirmar de dónde sale y unificar).

---

## 2. Glosario y datos

- **Fuente de verdad:** `ROUTE_STEP` + `STEP_LABELS` + `TOTAL_STEPS` en `CreatorLayout.tsx`. Nada de DB.
- **Archivos que modifica:** `CreatorLayout.tsx` (exportar helper), los 9 Steps del inventario (solo la línea del header), `PersistentRightPanel` si aplica.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] Extraer a `silabos-frontend/src/pages/creator/wizardSteps.ts`: `ROUTE_STEP`, `STEP_LABELS`, `TOTAL_STEPS` + hook `useWizardStep()` → `{ current, total, label, sectionTitle }` resuelto por `useLocation()`.
- [ ] `CreatorLayout` consume el módulo compartido (cero cambio visual).
- [ ] Cada Step reemplaza su "PASO X DE Y - TÍTULO" por `Paso {current} de {total} - {título de sección}` usando el hook. El título de sección (ej. "Sistema de evaluación") se conserva como está en cada página.
- [ ] Smoke visual de los 10 pasos: header de página == stepper == panel derecho.

### Fuera de alcance

- Reordenar pasos, renombrar rutas, tocar la lógica de navegación o el guardado.

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** NO. Mismo estilo tipográfico actual de cada header; solo el dato se centraliza.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Coherencia):** En cualquier ruta `/creator/*`, el número de paso es idéntico en header de página, stepper superior y contador "Paso X de 12".
- **CA-02 (Ruta nueva):** Si mañana se inserta un paso, solo se edita `wizardSteps.ts` (criterio de aceptación del diseño: un único punto de cambio).
- **CA-03 (Subrutas):** `/creator/fuentes/notebook/*` hereda el paso 4 (como hoy en ROUTE_STEP).

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Recorro los 10 pasos del wizard con el curso de prueba; en evaluación veo "Paso 10 de 12" en TODOS los indicadores (el bug del screenshot muere).

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] Grep final: `PASO \d+ DE \d+|Paso \d+ de \d+` no devuelve ningún literal hardcodeado en `pages/creator/*` (solo el render del hook/CreatorLayout).

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T3 (esta SPEC) | Bugfix UI transversal | NO | — | [ ] |
