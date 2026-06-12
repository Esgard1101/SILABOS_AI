# 00 — Glosario de Ubicuidad GarzaSoft (COMÚN)

> **Qué es esto:** El ADN de nomenclatura de todos los proyectos GarzaSoft. Los 3 agentes de Capa 1 leen este archivo SIEMPRE. Su función es matar la ambigüedad que hace que un agente de Capa 2, en sesión limpia, aluciné `usuario_id` cuando el filtro real es `perfil_id`, o `rol_id` cuando es tenant.
>
> **Regla de oro:** Cada proyecto define su propio scope en `context.md §2 (Glosario del proyecto)`. Este archivo es el DEFAULT. Si el `context.md` del proyecto contradice algo de acá, **gana el `context.md` del proyecto** — pero el agente debe avisar la diferencia, no asumirla en silencio.

---

## 1. Convención de capas (arquitectura obligatoria)

```
Controller (delgado) → Service (con DataBaseTrait) → DB
                     ↘ FormRequest (validación)
```

- **Controller:** sin lógica de negocio, sin queries crudas. Solo orquesta.
- **Service:** toda la lógica. Acceso a datos vía `DataBaseTrait`.
- **FormRequest:** toda validación de entrada. Nunca validar en el controller.
- **Separación de superficies HTTP:**
  - `Http/Controllers/Admin/*` → panel con sesión.
  - `Http/Controllers/Api/*` → API (read-only salvo excepción explícita) + API key.
  - No mezclar superficies en un mismo controller.

> Las skills `laravel-backend-arquitectura` y `laravel-blade-arquitectura` son la fuente canónica del CÓMO programar esto. Capa 1 las referencia pero NO las reescribe; solo define el QUÉ.

---

## 2. Vocabulario de identidad y scope (LA TABLA QUE EVITA ALUCINACIONES)

> El agente Capa 1 DEBE forzar al proyecto a elegir un valor concreto para cada fila. Si el proyecto no lo define, Capa 1 **pregunta antes de escribir el SPRINT/SPEC**.

| Concepto | Significado | Valores posibles | Pregunta que Capa 1 hace si falta |
|---|---|---|---|
| **Identificador de usuario** | A quién pertenece la sesión | `user_id` / `usuario_id` | "¿La PK de la tabla de usuarios es `id` (con `user_id` como FK) o `usuario_id`?" |
| **Identificador de rol** | Nivel de permiso | `rol_id` / `perfil_id` / "rol único sin tabla" | "¿Hay tabla de roles con `rol_id`, perfiles con `perfil_id`, o rol único hardcodeado?" |
| **Tenant Scope** | Por qué se aísla la data | `empresa_id` / `sucursal_id` / `parroquia_id` / `branch_uuid` / "sin tenant (mono-entidad)" | "¿Qué columna filtra la data por sesión? ¿Es FK activa o solo existe en BD para escalabilidad futura?" |
| **Origen del scope en runtime** | De dónde sale el valor del tenant | `session('X')` / middleware / token | "¿El tenant viene de `session('tenant_id')`, de un middleware, o del header de API?" |

**Antipatrón documentado (caso real Diócesis):** un agente sin este glosario filtró por `usuario_id` en lugar de `parroquia_id`. Resultado: un usuario veía data de otra parroquia. Esta tabla existe para que eso nunca se repita.

---

## 3. Convención de nombres (Context Engineering — tip Google)

Aprovechar las convenciones nativas de Laravel para que la IA no invente estructuras:

- **Tablas:** plural snake_case (`card_categories`, `parroquias`, `complement_categories`).
- **Modelos:** singular PascalCase (`CardCategory`, `Parroquia`, `Complement`).
- **Pivotes:** singular_singular alfabético (`parroquia_usuario`, `rol_menu`).
- **FK:** `<modelo_singular>_id` (`empresa_id`, `category_id`, `sacerdote_id`).
- **Migraciones:** orden estricto por dependencia de FK (las referenciadas primero).
- **Índices únicos compuestos:** declararlos explícitos cuando hay unicidad de negocio (ej. `(parroquia_id, libro, folio, numero)`).

> Las decisiones predeterminadas del framework evitan que la IA aluciné. Si el proyecto se desvía de la convención Laravel, **debe documentarse en `context.md` con su motivo**.

---

## 4. Compatibilidad de entorno (regla recurrente)

- **PHP producción vs local:** declarar ambos en `context.md §Compatibilidad`. Verificar que todo paquete Composer soporte el target de PRODUCCIÓN (no el local).
- **No usar sintaxis exclusiva** de una versión superior a producción (ej. `readonly class`, typed constants) salvo decisión explícita.
- **Assets locales, nunca CDN** por default (Font Awesome, fuentes): coherencia visual y disponibilidad offline. Es el problema #1 que Capa 2 no resuelve solo → declararlo siempre en el bloque Stack.

---

## 5. Glosario de términos del método (para que hablemos igual)

| Término | Definición |
|---|---|
| **Capa 1** | Agente PLANEADOR. Nunca programa. Escribe `context.md`, `SPRINT.md`, `SPEC.md`, prompts. Toma decisiones de arquitectura conmigo. Input: texto, transcripción de reuniones, imágenes. Pide los files/queries que le falten. |
| **Capa 2** | Agente EJECUTOR (Claude Code u otro). Programa leyendo los `.md` de Capa 1. No decide arquitectura; si encuentra ambigüedad, detiene y pregunta. |
| **Slice vertical** | Tarea que entrega una feature completa de DB→lógica→UI, testeable de punta a punta sin depender de la siguiente tarea. |
| **Épica 0 / Cimientos** | La única excepción horizontal aceptada: setup base no-verticalizable (migraciones núcleo, auth, layout). |
| **DoD-Usuario** | Lo que YO valido manualmente (navegador o Postman). El agente NO lo ejecuta (ahorro de tokens). |
| **DoD-Técnico** | Lo que el agente verifica solo y automáticamente (migrate, tinker, tests Feature). |
| **Single Source of Truth** | `context.md` del proyecto. Si el código lo contradice, gana el documento: detener y resolver conmigo. |
