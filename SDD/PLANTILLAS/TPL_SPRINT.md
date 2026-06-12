# SPRINT X — [Nombre del Sprint]

**Proyecto:** [Nombre]
**Stack:** [Framework + librerías + assets locales (FontAwesome local, fuentes locales, etc.)]
**Rol de Capa 2 (ejecución):** Las decisiones de arquitectura ya están tomadas y viven en `documentations/context.md`. El agente programa; no decide arquitectura. Ante ambigüedad: detener y preguntar.

---

## 🎯 Objetivo del Sprint

[Meta de negocio clara y testeable del sprint.]

---

## 📚 Lecturas obligatorias antes de ejecutar (routing)

El agente de Capa 2, al tomar CUALQUIER tarea, lee en este orden:
1. `documentations/context.md` (single source of truth)
2. Este `SPRINT.md` (la tarea específica)
3. Las skills aplicables (`laravel-backend-arquitectura`, `laravel-blade-arquitectura`)
4. `bitacoradev.md` SOLO si retoma una tarea ya iniciada

---

## 📝 Backlog del Sprint (Slices Verticales)

> Cada tarea es end-to-end: DB + lógica + interfaz (o contrato) en UNA tarea testeable.
> Default = 1 tarea por CRUD/módulo completo. Se degrada solo con gatillo (ver `_COMUNES/01`).

### ÉPICA 0 — Cimientos
> Única excepción horizontal aceptada. En el 70% de casos entrega flujo navegable, no solo migraciones.

**T0.1 — Setup + migraciones núcleo + auth + login funcional + dashboard vacío + sidebar con menús**
[Inicializar proyecto, esquema base, autenticación, layout maestro, sidebar con seed de opciones de menú.]
- **Alcance técnico integrado:** [setup entorno, migraciones núcleo, seeders base, layout Blade, sistema de diseño según context.md §8].
- **🧑‍💻 DoD-Usuario (yo, navegador):**
  - [ ] Hago login con usuario sembrado y entro al panel.
  - [ ] Navego el sidebar; los módulos vacíos cargan sin romper.
  - [ ] El sistema de diseño (colores, fuente, sidebar) coincide con el mockup aprobado.
- **🤖 DoD-Técnico (agente, automático):**
  - [ ] `php artisan migrate:fresh --seed` corre limpio.
  - [ ] `.env.example` documenta variables necesarias.
  - [ ] Assets locales cargados (no CDN).
- **Depende de:** ninguna.

---

### ÉPICA 1 — [Módulo Funcional]

**T1.1 — [Módulo CRUD completo] (End-to-End)**
Implementación completa de DB→lógica→UI basándose en [`SPEC-XXXX.md` si existe / este sprint].
- **Alcance técnico integrado:** migración(es), modelo, Service (DataBaseTrait), FormRequest, Controller delgado, ruta, vista Blade (lista + formulario/modal).
- **🧑‍💻 DoD-Usuario (yo, navegador):**
  - [ ] Abro [ruta] y opero el CRUD completo desde la UI.
  - [ ] Las validaciones de error se activan visualmente.
  - [ ] El filtro por [tenant/perfil del glosario] solo muestra mis datos de sesión.
- **🤖 DoD-Técnico (agente, automático):**
  - [ ] migrate + tinker de relaciones clave sin error.
  - [ ] Tests Feature de la tarea en verde.
  - [ ] Cero lógica en controller; Service + FormRequest correctos.
  - [ ] Decisión estructural (si la hubo) → context.md + bitacoradev.md.
- **Depende de:** T0.1.

**T1.2 — [Siguiente módulo / mutación] (End-to-End)**
[...]

---

## ⚠️ Limitaciones y Guías para Capa 2

- **Slices verticales obligatorios:** prohibido dejar controladores sin su vista funcional o viceversa. La tarea se cierra cuando es interactuable (navegador) o testeable (API + tests).
- **No sobreingeniería:** soluciones modulares y directas. Nada de colas/eventos/microservicios salvo decisión explícita en context.md.
- **Paradigma de capas obligatorio:** Controller delgado → Service (DataBaseTrait) → DB. FormRequest para validación.
- **Nomenclatura:** usar exclusivamente los términos de `context.md §2`. Nunca inventar `usuario_id`/`perfil_id`/tenant.
- **Assets locales, nunca CDN.**

### REGLA OBLIGATORIA DE MEMORIA Y AUTO-MEJORA
Si el agente identifica una decisión que simplifica el diseño, resuelve sobreingeniería o un conflicto de compatibilidad (ej. FontAwesome local), DEBE antes de cerrar la tarea:
1. Registrar la decisión limpia en `context.md §11`.
2. Registrar el detalle técnico en `bitacoradev.md`.
3. Si contradice el context.md vigente: DETENER y resolver con el user.

---

## 🗂️ Tabla resumen para asignación manual

> La lleno YO al final. Capa 1 deja la tabla armada; yo asigno el dev.

| Tarea | Módulo | Tipo | Depende de | Toca archivos compartidos | Asignado a |
|---|---|---|---|---|---|
| T0.1 | Cimientos | Épica 0 | — | layout, rutas | [ ] |
| T1.1 | [módulo] | CRUD E2E | T0.1 | — | [ ] |
| T1.2 | [módulo] | CRUD E2E | T0.1 | — | [ ] |
