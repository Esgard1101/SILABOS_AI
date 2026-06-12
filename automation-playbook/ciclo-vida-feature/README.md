# Módulo Ciclo de Vida de Feature

Convierte trabajo terminado en activo reutilizable. Se dispara al **completar una feat** o al **cerrar sesión** (cuando el user terminó algo o algo le gustó).

## Flujo

```
feat completa / cierre de sesión
  → agente resume qué se aprendió (1 párrafo)
    → aplica UMBRAL tamaño/reuso
        ├─ lección puntual ........... addendum a <proyecto>/LECCIONES.md
        └─ patrón reutilizable ....... propone skill específica en playbook/skills/especificas/
    → ¿transversal (sirve a otros proyectos)?
        └─ sí → además línea en playbook/lecciones/_INDICE_CENTRAL.md
```

## Umbral tamaño/reuso (decisión)

| Señal | Acción |
|-------|--------|
| Fix/insight aislado, improbable repetir | Addendum en `LECCIONES.md` (puntual) |
| Patrón que se espera usar **>N veces** (regla: N≥3) o aplica a otro dominio | Addendum + **proponer skill específica** |
| Flujo completo dominado tras iterar con chat N veces | **Proponer skill específica** (destilación SOP, ver `../skills/README.md`) |
| Sirve a ≥2 proyectos | Lo anterior + línea en `_INDICE_CENTRAL.md` |

"Proponer" = el agente sugiere y muestra el draft; **la creación de skill la confirma el user** (no se crea sola).

## Qué hace el agente al disparar (checklist)

1. Resumir: qué feat, qué se aprendió, qué falló/funcionó (concreto, con file:line).
2. Clasificar con la tabla de umbral.
3. Escribir el addendum usando la plantilla de `TEMPLATE_LECCIONES_PROYECTO.md`.
4. Si supera umbral skill: mostrar draft `SKILL.md` (frontmatter `name`/`description`) y pedir confirmación.
5. Si transversal: añadir línea a `_INDICE_CENTRAL.md` (más reciente arriba).
6. No inventar lecciones: si la sesión no produjo nada destilable, decirlo y no escribir ruido.

## Activación (hook)

La auto-mejora la dispara el harness vía hook, no una instrucción en memoria. Ver sección "Activar la auto-mejora" en el README principal del playbook. Estado: **documentado, no cableado** — se activa por proyecto al mover el repo.
