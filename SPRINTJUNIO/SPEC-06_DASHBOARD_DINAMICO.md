# SPEC-06 — Dashboard dinámico: card "Continuar último sílabo" + Mis Sílabos en cards

**Proyecto:** SIGEISIL · **Sobre:** frontend `silabos-frontend` (`/dashboard`, `/syllabi`)
**Estado:** LISTO PARA EJECUTAR (mockup pendiente de aprobación)
**Routing previo:** `AGENTSROUTING/README.md` (este módulo no tiene MD propio; si el sprint lo consolida, evaluar crear `08_DASHBOARD_NAVIGATION.md` al cierre)

---

## 1. Resumen y objetivo

El dashboard actual ya tiene métricas, quick actions y "Sílabos recientes", pero no responde a la pregunta más frecuente del docente interrumpido: **"¿dónde me quedé?"**. Se agrega una card hero de resume (consume SPEC-05) y se rediseña "Mis Sílabos" a grid de cards con estado y filtros, para una navegación estilo dashboard escalable.

---

## 2. Glosario y datos

- **Entidad principal:** `syllabi` (lectura). Endpoints: `GET /api/syllabi/progressive/latest` (SPEC-05) + `GET /api/syllabus/` (`listSyllabiAll`, existente).
- **Estados de sílabo:** reutilizar `resolveSyllabusStatus` de `utils/syllabusStorage.ts` (NO inventar un mapeo paralelo). Etiquetas visibles: Borrador / En progreso / En revisión / Aprobado (las que ese util ya soporte).
- **Archivos que modifica:** `pages/Dashboard.tsx`, `pages/SyllabusList.tsx`. Nuevos componentes locales: `ResumeHeroCard`, `SyllabusCard`.
- **Tablas/backend:** cero cambios.

---

## 3. Alcance (Features E2E)

### Incluye

- [ ] **ResumeHeroCard (dashboard):** card glass prominente arriba del fold:
  - curso + programa, badge "Paso {last_step} de 12 — {step_label}", barra de progreso con `progress_pct`, "actualizado hace X" y CTA primario **Continuar** → `resumeDraft()` de SPEC-05;
  - estado vacío (sin borradores): CTA "Crear nuevo sílabo" → `/select-context`;
  - skeleton de carga.
- [ ] **Mis Sílabos (`/syllabi`) rediseño:** grid responsive de `SyllabusCard` (curso, programa, periodo, badge de estado, fecha de actualización) con acciones por estado: Continuar (borrador/en progreso) / Ver / Exportar (aprobado, si la acción ya existe). Filtros: búsqueda por nombre (normalización de acentos existente) + filtro por periodo + filtro por estado. Vista lista actual puede conservarse como toggle SOLO si el costo es trivial; si no, cards reemplazan.
- [ ] "Sílabos recientes" del dashboard enlaza cada item al mismo flujo (Continuar/Ver) que las cards.
- [ ] Roles: docente ve solo lo suyo (comportamiento actual de la API se respeta); admin/gestión conserva su dashboard de métricas — la ResumeHeroCard solo aparece si el user tiene borradores propios.

### Fuera de alcance

- Mini analítica docente y accesos rápidos por rol (descartados por el user en el interrogatorio).
- Paginación server-side de sílabos (volumen actual no lo exige; documentar si la lista supera ~100).

---

## 4. Contrato de interfaz / flujo visual

- **¿Requiere mockup?** SÍ → `resources/mockups/dashboard-resume.html` — Estado: PENDIENTE.
- **Prompt para el agente de mockup (chat aparte):**
  > Mockup HTML+Tailwind de un dashboard académico dark navy (#041A3A fondo, paneles #0B192C). Hero card glass (rounded-3xl, bg-white/[0.06], backdrop-blur, borde cyan suave) titulada "Continuar tu último sílabo": nombre de curso "Programación con Robótica", subtítulo programa, badge dorado "Paso 10 de 12 — Evaluación", barra de progreso cyan al 78%, texto "actualizado hace 2 horas", botón teal #00A896 "Continuar →". Debajo, sección "Mis sílabos" con grid de 3 cards: cada una con nombre de curso, periodo 2026-I, badge de estado (Borrador ámbar / En revisión cyan / Aprobado verde), fecha, y acciones. Arriba de la grid: input búsqueda + 2 selects de filtro (periodo, estado). Tipografía sobria universitaria, sin emojis.
- **Distribución dashboard:** saludo → ResumeHeroCard → contexto activo (existente) → métricas → recientes.

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Sin borradores):** Docente nuevo → hero card en estado vacío con CTA de creación (no card rota ni oculta).
- **CA-02 (Resume coherente):** El % y paso de la hero card provienen del endpoint `latest` — nunca calculados con otra fórmula en el cliente (una sola fuente).
- **CA-03 (Estados):** Un sílabo aprobado nunca muestra CTA "Continuar"; uno en borrador nunca muestra "Exportar".
- **CA-04 (Filtros):** Búsqueda "robó"/"robo" encuentra el curso; filtros combinables; estado de filtros no persiste entre sesiones (simple).
- **CA-05 (Error de carga):** Si `latest` falla, la hero card colapsa al estado vacío con toast discreto — el resto del dashboard vive.

---

## 6. Definition of Done

**🧑‍💻 DoD-Usuario (manual, navegador):**
- [ ] Con un borrador a medias: el dashboard me muestra la hero card con curso/paso/% correctos y "Continuar" me deja en el paso exacto.
- [ ] `/syllabi`: veo cards con estados correctos, filtro por estado "Borrador" y búsqueda por nombre.
- [ ] Sin borradores (cuenta limpia): estado vacío correcto.

**🤖 DoD-Técnico (agente, automático):**
- [ ] `npm run build` en verde.
- [ ] Grep: `resolveSyllabusStatus` es la única fuente de estado en las vistas nuevas.
- [ ] (Si hay chrome-devtools-mcp) screenshots: hero card con datos + estado vacío.

---

## 7. Tabla resumen

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| T5 (esta SPEC) | Feature UI E2E | SÍ | T4 (endpoint latest + resumeDraft) | [ ] |
