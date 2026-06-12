# SPEC-08 — Estandarización de evidencias PA en el cronograma de evaluación (cero IA)

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (Step6 `/creator/evaluacion`) + verificación de export
**Estado:** LISTO PARA EJECUTAR
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` + `AGENTSROUTING/05_FINAL_ASSEMBLY_EXPORT.md` (el shape de grading fluye al DOCX)

---

## 1. Resumen y objetivo

Bug de UX reportado: en "Cronología de evaluación" las filas PA heredan el nombre completo del hito del timeline ("PA1: Presentación del diseño lógico (diagra…") — textos truncados, ilegibles, y los docentes terminan escribiendo nombres simbólicos a mano. Decisión del user: **estandarizar sin gastar IA** a "Producto Acreditable N", guardándolo en el flow para que llegue limpio a la sección correspondiente del sílabo final.

El código ya tiene la maquinaria (`buildAccreditableRows` genera "Producto Acreditable N"; el problema es que `rowsWithSelectedProductTimeline`/`evidenceFromTimeline` la **sobreescriben** con el detalle largo del timeline al aplicar el producto seleccionado).

---

## 2. Glosario y datos

- **Entidad principal:** bloque `grading` de `payload_json` — filas `GradingRow { evidencia, sigla, porcentaje, cronograma }`.
- **Flujo del dato:** Step6 → `PATCH /steps/grading` → final assembly enriquece evaluación/calificación → `word_generator` lo pinta en Sistema de Evaluación / Sistema de Calificación del DOCX. El PA es transversal (decisión aprobada: sin sección Word propia).
- **Detalle del hito (qué entrega el alumno cada PA):** vive y SIGUE viviendo en `selected_product.timeline_json` + en las evidencias semanales del `cronograma_semanal` (hard rules del engine intactas).
- **Archivos que modifica:** `pages/creator/Step6_Cierre.tsx` (`evidenceFromTimeline`, `rowsWithSelectedProductTimeline`, `compactPaEvidenceRows`), `context/SyllabusContext.tsx` (DEFAULT de gradingRows), verificación read-only de `services/word_generator.py`.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] **Regla de normalización (determinista, cero IA):** toda fila cuya `sigla` matchee `^PA\d+$` persiste `evidencia = "Producto Acreditable {N}"`. El timeline del producto solo aporta la **semana** (`cronograma = "Semana X"`), nunca el nombre.
- [ ] **Detalle visible sin ensuciar el dato:** en la tabla del Step6, las filas PA muestran debajo del nombre estándar una línea secundaria de UI (texto corto del hito desde `timeline_json`, line-clamp 1 con tooltip/expand). Esta línea NO se guarda en `grading.rows`.
- [ ] **Unificar defaults:** `SyllabusContext` (PA en semanas 4/8/16) y `Step6` (`DEFAULT_GRADING_ROWS`, semanas 8/16) divergen — sub-bug detectado. Única fuente: `buildAccreditableRows(productCount)` exportada y consumida por ambos.
- [ ] **Filas manuales intactas:** "Agregar evidencia" (al user le gusta como está) y filas no-PA (TA, EP, u otras siglas custom) jamás se renombran.
- [ ] **Normalización al cargar:** drafts existentes con nombres largos en filas PA se normalizan al entrar a Step6 y quedan limpios al siguiente guardado (migración suave, sin script de BD).
- [ ] **Verificación de export (read-only):** exportar DOCX de un sílabo ensamblado y confirmar que Sistema de Evaluación/Calificación muestra "Producto Acreditable N" + sigla + semana, y que las semanas PA del Programa de Contenidos siguen mostrando la evidencia concreta del producto (no debe degradarse a texto genérico — regla sumativa del engine).

### Fuera de alcance

- Tocar `progressive_curriculum_engine.py`, sus hard rules de evidencias semanales, o `word_generator.py` (solo se verifica).
- Editor libre del nombre PA (la estandarización es justamente quitar esa fricción; el detalle vive en el producto).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** NO. La tabla actual se conserva; solo cambia el contenido de la celda evidencia (nombre estándar + subtítulo UI).

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Estándar):** Aplicar producto seleccionado con timeline de 3 hitos → filas quedan "Producto Acreditable 1/2/3" con semanas del timeline y pesos editables intactos.
- **CA-02 (Suma 100):** La normalización jamás altera porcentajes; el checklist "Ponderación total = 100%" se comporta igual.
- **CA-03 (Sigla custom):** Fila agregada a mano con sigla "EXPO" y nombre libre → intocada.
- **CA-04 (productCount variable):** Productos con 2 o 4 PA generan "Producto Acreditable 1..N" coherentes (sin asumir 3).
- **CA-05 (Draft legacy):** Draft guardado con "PA1: Presentación del diseño lógico…" → al abrir Step6 se ve normalizado; al guardar, persiste normalizado.
- **CA-06 (Export):** En el DOCX, ninguna celda de evaluación muestra texto truncado tipo "(diagra…".

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] En el curso de prueba aplico el producto al cronograma → leo "Producto Acreditable 1 — Semana 6" etc., con el detalle del hito como subtítulo.
- [ ] Agrego una evidencia manual → nadie la toca.
- [ ] Exporto el DOCX final → sección de evaluación limpia y estándar.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] Test unitario frontend ligero (o assert en código compartido) de la función de normalización: PA match, custom no-match, N variable, legacy largo → estándar. (Si no hay runner de tests frontend configurado, documentar la verificación manual equivalente en el cierre — no introducir un framework de test nuevo solo para esto.)
- [ ] `python -m unittest silabos-backend.tests.test_word_generator_dates` verde (sanity export).
- [ ] Decisión registrada en `AGENTSROUTING/02_PRODUCT_EVALUATION_HORIZON.md` al aceptarse (regla: evidencia PA estandarizada, detalle vive en timeline_json).

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T8 (esta SPEC) | Normalización E2E (UI→payload→export) | NO | Serializar con T7 (ambas tocan utils de timeline en Step6/Step7) | [ ] |
