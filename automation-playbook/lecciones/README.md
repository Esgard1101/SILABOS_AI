# Módulo Lecciones Aprendidas

Las lecciones **dependen del contexto del proyecto** → viven en cada proyecto, no aquí. Aquí solo el **índice central** de patrones transversales.

## Modelo: por-proyecto + índice central

| Capa | Archivo | Contenido |
|------|---------|-----------|
| Local | `<proyecto>/LECCIONES.md` | Lecciones específicas de ese proyecto (su stack, su cliente, sus bugs). Plantilla: [`TEMPLATE_LECCIONES_PROYECTO.md`](TEMPLATE_LECCIONES_PROYECTO.md) |
| Central | [`_INDICE_CENTRAL.md`](_INDICE_CENTRAL.md) | Solo patrones que sirven a ≥2 proyectos. Una línea por patrón + puntero al proyecto origen |

Regla: una lección sube al índice central **solo si es transversal** (no asume cliente/proceso concreto). Si no, se queda local.

## Flujo de escritura

Lo dispara `../ciclo-vida-feature/README.md` al cerrar feat/sesión:

1. Agente resume qué se aprendió en la feat.
2. Umbral tamaño/reuso:
   - Puntual → addendum a `<proyecto>/LECCIONES.md`.
   - Reutilizable / flujo completo → propone **skill específica** (ver `../skills/`).
3. Si la lección es transversal → además, línea nueva en `_INDICE_CENTRAL.md`.

## Arranque en un proyecto nuevo

1. Copiar `TEMPLATE_LECCIONES_PROYECTO.md` → `<proyecto>/LECCIONES.md`.
2. Añadir la línea puntero al playbook en el `CLAUDE.md` del proyecto.
3. (Opcional) Activar el hook `SessionEnd` (ver README principal del playbook).
