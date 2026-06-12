# SPEC-XXXX — [Nombre del Módulo o Feature]

> Contrato visual y funcional de UNA feature. Se genera por módulo, antes de picar código. Si la feature necesita mockup, se itera el HTML en `resources/mockups/` ANTES de cerrar este SPEC.
> Si este SPEC es parte de un lote (varias feats), lo coordina el `SPRINT.md`.

**Proyecto:** [Nombre] · **Sobre:** [proyecto existente / módulo X]
**Estado:** [BORRADOR / LISTO PARA EJECUTAR]

---

## 1. Resumen y objetivo

[Qué es y para qué sirve, desde la perspectiva del usuario final. El valor agregado.]

---

## 2. Glosario y datos (hereda context.md §2)

> Solo lo que esta feature toca. Evita que Capa 2 aluciné la nomenclatura.

- **Entidad principal:** [...]
- **Identificador de acceso usado:** [`perfil_id` / `rol_id` / `usuario_id` — el real, no el supuesto]
- **Tenant scope:** [`empresa_id` / `parroquia_id` / etc. — y de dónde sale en runtime]
- **Tablas que toca:** [existentes que lee/modifica + nuevas que crea]

---

## 3. Alcance (Features E2E)

### Incluye (entregable core)
- [ ] [Feature concreta 1]
- [ ] [Feature concreta 2]

### Fuera de alcance
- [ ] [Postergado para evitar sobreingeniería]

---

## 4. Contrato de interfaz / flujo visual

> Mockup SOLO si es feature compleja de explicar. La mayoría de CRUDs NO lo necesitan.

- **¿Requiere mockup?** [SÍ / NO]
- **Si SÍ → Mockup:** `resources/mockups/<archivo>.html` — Estado: [PENDIENTE / APROBADO]
  - El prompt para generarlo (agente de mockup aparte) lo entrega Capa 1.
- **Distribución de la vista:** [descripción en texto plano de los elementos obligatorios de la pantalla, o del contrato si es API].

---

## 5. Reglas de negocio y casos límite

- **CA-01 (Validación):** Si [acción] con [condición errónea] → [error esperado].
- **CA-02 (Permisos):** Si el identificador de acceso no es [rol/perfil] → se deniega.
- **CA-03 (Aislamiento):** Un usuario nunca ve registros con [tenant] distinto al de su sesión.
- **CA-04 (...):** [...]

---

## 6. Definition of Done

> Usa la estructura de dos niveles de `_COMUNES/02_DOD_ESTANDAR.md`.
> Si es API sin frontend: tests Feature (red de seguridad) + walkthrough Postman escrito.

**🧑‍💻 DoD-Usuario (yo, manual):**
- [ ] [navegador o Postman: qué abro/ejecuto y qué espero ver]

**🤖 DoD-Técnico (agente, automático):**
- [ ] migrate/tinker sin error · Tests Feature en verde.
- [ ] Capas correctas (Service + FormRequest), sin lógica en controller.
- [ ] [Si API: JSON no expone campos prohibidos; contrato documentado.]
- [ ] Decisión estructural (si la hubo) → context.md + bitacoradev.md.

---

## 7. Tabla resumen (para asignación manual)

| Tarea | Tipo | Mockup | Depende de | Asignado a |
|---|---|---|---|---|
| Esta SPEC | [CRUD / API / feature] | [SÍ/NO] | [tablas/rutas previas] | [ ] |
