# Diagnóstico live en producción — 2026-06-12 (chrome-devtools-mcp)

Sesión de verificación en `silabos.innovasaber.com.pe` con cuenta admin de prueba. Recorrido: login → dashboard → sidebar → F5 → select-context → wizard paso 3. Interrumpido por el tech lead antes de llegar a `/creator/producto` (el modal queda pendiente de verificación live; su causa raíz ya está confirmada por código en SPEC-01).

Consola: limpia en todo el recorrido. Red: sin fallos (login 200, `/api/auth/me` 200, `/api/syllabus/` 200).

---

## Hallazgo 1 — Bug sidebar es DETERMINISTA, no intermitente (eleva SPEC-02)

**Reproducción en vivo:** login correcto (200) → abrir sidebar → menú gris (`opacity-50`, no clickeable) + footer "Inicia sesión para acceder al menú" + sin card de usuario. **Siempre**, recién logueado. Tras **F5** el sidebar revive (card "Admin Supremo / Administrador" aparece).

**Mecanismo preciso (completa el diagnóstico de SPEC-02):** `MasterLayout` envuelve también `/login` (el panel derecho "PASO 1 DE 12" se renderiza en el login). Su instancia de `useAuth` se monta ANTES del login sin token → `isAuthenticated=false`, y su `validateSession` corre **una sola vez** (`useEffect` con deps `[]`). El login actualiza la instancia del Login page; la del layout queda congelada en `false` hasta un remount (F5). La pieza "errores de red borran sesión" sigue siendo cierta y explica recaídas posteriores, pero el repro principal es este.

**Impacto en SPEC-02:** ningún cambio de alcance (el AuthProvider singleton mata ambos mecanismos). Se agrega caso de aceptación: *CA-07 (Post-login inmediato): sin F5, recién logueado, el sidebar está activo.*

## Hallazgo 2 — Tercer sistema de numeración: stepper propio de select-context (amplía SPEC-03)

`/select-context` muestra su PROPIO stepper "Paso 2 de 8" + dots 1-8 + "25% completado", mientras el panel derecho dice "PASO 2 DE 12". Y en `/creator/repositorio` conviven en la misma pantalla: stepper superior "Paso 3 de 12" + header de página "PASO 3 DE 8".

**Impacto en SPEC-03:** agregar al inventario `pages/ContextSelector.tsx` (stepper + porcentaje hardcodeados a 8 pasos). El módulo compartido `wizardSteps.ts` debe cubrir también los pasos 1-2 (login/contexto) que hoy viven fuera de `CreatorLayout`.

## Hallazgo 3 — Card rota en "Sílabos recientes" (amplía SPEC-06)

El dashboard lista un draft como **"Curso sin nombre / Carrera no disponible"** (borrador del 10 jun). Draft con `course_snapshot`/metadata ausente renderiza basura clickeable.

**Impacto en SPEC-06:** nuevo caso de aceptación: *CA-06 (Draft huérfano): sílabos sin metadata de curso se muestran con estado degradado explícito ("Borrador incompleto — datos de curso no disponibles") y acción segura (continuar lo lleva al selector de contexto), o se filtran de recientes.* Investigar en ejecución cómo se creó (posible draft creado antes de elegir contexto — relacionado con hallazgo 6).


## Hallazgo 5 — "Plan de estudios" muerto (vacío nuevo, backlog)

El select "5. PLAN DE ESTUDIOS" permanece deshabilitado con "-- pendiente de programa --" **incluso con programa ya elegido**. Campo aparentemente no implementado (¿sin datos de planes en BD o feature a medias?).

**Decisión pendiente del tech lead:** implementarlo (requiere datos de planes por programa) u ocultarlo este sprint para no confundir. No se crea SPEC hasta decidir; queda registrado como vacío.



## Hallazgo 7 — Metadata de curso incompleta (dato, no bug de código)

"Programación con robótica": créditos carga ("3") pero H. TEORÍA y H. PRÁCTICA quedan "—". Dato faltante del datamining para este curso (y probablemente otros). Revisar la fila en `courses` vía Supabase MCP cuando toque; el selector (SPEC-04) debe tolerar campos vacíos sin mostrar "—" feos (ocultar la celda si no hay dato).

## Hallazgo 8 — Menú admin sin "Crear Sílabo" (nota UX, SPEC-06)

`MANAGEMENT_NAV_ITEMS` no incluye "Crear Sílabo"; el admin solo puede crear desde la card del dashboard. Decisión pendiente: ¿es intencional (admin no crea sílabos) o falta el item? Si es intencional, documentarlo; si no, agregarlo en SPEC-06 es 1 línea.

---

## Pendiente de verificación live (cuando se retome el MCP)

- `ProductDetailModal` con timeline largo (bug original; causa ya confirmada por código).
- Step6 evaluación: nombres largos de evidencias PA en la tabla.
- Responsive móvil (no se llegó a probar `resize_page`).
