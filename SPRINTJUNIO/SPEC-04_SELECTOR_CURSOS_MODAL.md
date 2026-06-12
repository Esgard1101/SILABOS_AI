# SPEC-04 — Selector de cursos: modal glass con búsqueda y agrupación por ciclo

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (`/select-context`)
**Estado:** LISTO PARA EJECUTAR (mockup pendiente de aprobación)
**Routing previo:** `AGENTSROUTING/README.md` + `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md`

---

## 1. Resumen y objetivo

En el paso "Contexto institucional y curso", el campo **6. Curso** es un `<select>` nativo que despliega 40+ cursos en una lista plana gigante (screenshot del user: opciones desbordando la pantalla). Para programas grandes la UX es mala y propensa a error.

Se reemplaza por un **modal liquid glass**: buscador instantáneo + cursos agrupados por ciclo en grid de cards compactas. Un click selecciona y cierra.

---

## 2. Glosario y datos

- **Entidad principal:** `courses` (lectura vía `GET /api/courses?program_id=...`, endpoint existente — backend NO se toca).
- **Campo de ciclo:** verificar en `api/types.ts` si `Course` expone `cycle`/`ciclo`; el render actual muestra "(Ciclo N)" en el label. Si el dato viene embebido en `name`, parsearlo con regex `\(Ciclo\s+(\d+)\)`; si existe campo dedicado, usarlo. **Decisión a confirmar en ejecución, documentar cuál fue.**
- **Archivos que modifica:** `pages/ContextSelector.tsx` (campo curso → trigger del modal). Nuevo: `components/CourseSelectModal.tsx` (o subcomponente local), consume `GlassModal` (SPEC-01).
- **Tablas:** ninguna nueva.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] El campo "6. Curso" se convierte en botón-input (mismo estilo visual de los selects vecinos) que muestra el curso elegido o "Seleccione…"; click abre el modal. Deshabilitado hasta elegir programa (cascada actual intacta).
- [ ] Modal (GlassModal `xl`):
  - input de búsqueda autofocus, filtro instantáneo con normalización de acentos (reutilizar patrón `normalizeText` del Dashboard);
  - cursos agrupados por ciclo ("Ciclo 1", "Ciclo 2", …) con sticky header por grupo, grid 2-3 columnas de cards compactas (nombre + código/créditos si existen);
  - durante búsqueda activa: vista plana de resultados con su badge de ciclo;
  - click en card → setea `selectedCourse`, cierra modal (resto del flow `CONTINUAR` intacto);
  - estado vacío ("No hay cursos para '<query>'") y estado cargando.
- [ ] Curso actualmente seleccionado resaltado al reabrir el modal.
- [ ] Limpiar selección de curso cuando cambia el programa (comportamiento cascada actual se conserva).

### Fuera de alcance

- Cambiar selects de Facultad/Escuela/Programa (listas cortas, siguen nativos).
- Tocar endpoints o el shape de `AppContext`.

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** SÍ → `resources/mockups/course-select-modal.html` — Estado: PENDIENTE.
- **Prompt para el agente de mockup (chat aparte):**
  > Mockup HTML+Tailwind standalone de un modal "liquid glass" sobre fondo navy #041A3A para seleccionar curso universitario. Panel rounded-3xl bg-[#0B192C]/75 backdrop-blur border cyan suave, max-h 88vh. Header: título "Seleccionar curso" + X. Debajo: input de búsqueda grande con ícono lupa. Cuerpo scrolleable: grupos "CICLO 1", "CICLO 2"… (sticky headers dorado #D4AF37 tracking amplio), cada grupo con grid de 3 columnas de cards compactas (nombre del curso 12-13px blanco, código gris). Hover: borde cyan #00B4D8. Una card marcada como seleccionada (fondo cyan/10 + check). Footer fijo: texto "32 cursos · Educ. Matemática y Computación". Incluir 14 cursos de ejemplo reales de educación matemática. Estética sobria universitaria, sin emojis.
- **Distribución:** trigger en la grilla del formulario actual (posición del select 6) → modal centrado.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Cascada):** Sin programa elegido, el trigger está deshabilitado con hint "Primero elige programa".
- **CA-02 (Búsqueda):** "robo" (sin tilde) encuentra "Programación con Robótica". Búsqueda matchea nombre y código.
- **CA-03 (Sin ciclo):** Cursos sin ciclo identificable van a grupo "Otros" al final (no se ocultan).
- **CA-04 (Continuidad):** Tras seleccionar, `CONTINUAR` arma el contexto idéntico a hoy (`course_id`, `course_name`, créditos, horas, prerequisito). Cero cambio en `useAppContext`.
- **CA-05 (Teclado):** ESC cierra; Enter con un único resultado lo selecciona.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] En `/select-context` elijo FACHSE → Educ. Matemática y Computación → abro modal de curso: veo ciclos agrupados y busco "robótica" → 1 click y queda seteado.
- [ ] El mockup aprobado y la implementación coinciden visualmente.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] El payload de contexto guardado (storage) es byte-equivalente al flujo anterior para el mismo curso.
- [ ] (Si hay chrome-devtools-mcp) screenshot del modal con búsqueda activa.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T6 (esta SPEC) | Feature UI E2E | SÍ | T2 (GlassModal) | [ ] |
