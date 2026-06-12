# bitacoradev.md — Bitácora de Ejecución

> Memoria técnica del proyecto. Acá van los cierres de tarea, fixes, detalles de implementación y comandos. Es el archivo que un agente lee SOLO cuando necesita el detalle de cómo se ejecutó algo.
>
> Las decisiones de arquitectura LIMPIAS van en `context.md §11`. Acá va el CÓMO, no el QUÉ.

---

## Convención de entradas

Cada cierre de tarea agrega una entrada. Cada fix relevante agrega una línea. Formato:

```markdown
## <ID-Tarea> — <Nombre> — Cerrada AAAA-MM-DD
- ✅ [lo implementado, en checklist]
- 🔧 [fix técnico relevante / solución de compatibilidad]
- 📌 [decisión sincronizada a context.md, si la hubo]
- 🟡 [pendiente derivado que NO bloquea el cierre]
```

Iconos:
- ✅ hecho y validado
- 🔧 fix técnico / workaround
- 📌 decisión que también se escribió en context.md
- 🟡 pendiente derivado (no bloqueante)
- 🔴 cancelado / postergado (con razón)

---

## Registro

<!-- Las entradas más recientes arriba. Ejemplo: -->

## T0.1 — Cimientos (setup + auth + layout) — Cerrada AAAA-MM-DD
- ✅ Laravel + PostgreSQL levanta con `php artisan serve`.
- ✅ Login funcional, dashboard vacío, sidebar con seed de menús.
- 🔧 [ej: reseteo `!important` de height/line-height heredados de Materialize en `<nav>`].
- 📌 Sistema de diseño aprobado → sincronizado a context.md §8.
