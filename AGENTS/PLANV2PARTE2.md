# Plan: Método Primero -> Habilidades Filtradas por `teaching_methods`

## Resumen
- Cambiar el wizard a este orden: `Curso -> Bibliografía -> Método -> Habilidades -> Calificación -> Confirmación`.
- La selección de habilidades dejará de basarse en categorías manuales y pasará a depender de la elección previa de `teaching_method`.
- El filtro será de tipo `priorizar + ver todas`:
  - el sistema muestra primero una shortlist recomendada para el método,
  - pero el docente podrá abrir el catálogo compatible completo y elegir más.
- La compatibilidad método-habilidad se resolverá desde una tabla explícita en BD, no por heurísticas ni por IA dinámica.
- Si el docente cambia de método, el sistema recalcula:
  - conserva habilidades todavía compatibles,
  - desmarca las incompatibles,
  - vuelve a sugerir una nueva shortlist.

## Cambios de Datos y Backend
- Agregar una tabla puente manual y administrable:
  - `teaching_method_skill_links`
  - campos mínimos: `id`, `teaching_method_id`, `skill_id`, `priority`, `is_recommended`, `created_at`
  - `UNIQUE(teaching_method_id, skill_id)`
- Mantener `teaching_methods` y `skills_catalog` como fuentes maestras; la nueva tabla solo expresa compatibilidad.
- Reemplazar el flujo actual basado en `selected_skill_categories` por `selected_skill_ids`.
- Endpoints de lectura para wizard:
  - `GET /api/methods`
  - `GET /api/methods/{method_id}/skills?course_id={id}&q=&page=&page_size=`
  - respuesta esperada:
    - `recommended_skills`
    - `compatible_skills`
    - `total`
    - `fallback_mode`
- Regla de ranking:
  - ordenar primero por `is_recommended`,
  - luego por `priority`,
  - luego por nombre.
- Regla de fallback:
  - si un método no tiene compatibilidades cargadas, devolver `fallback_mode=true` y mostrar catálogo completo activo con advertencia clara; no bloquear el wizard.
- Cambios en generación:
  - `POST /api/syllabus/generate-v2` debe recibir `teaching_method_id` y `selected_skill_ids`.
  - el prompt debe usar habilidades exactas seleccionadas, no categorías.

## Cambios de Frontend
- En [silabos-frontend/src/pages/SyllabusCreator.tsx](C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-frontend\src\pages\SyllabusCreator.tsx):
  - invertir los pasos de Método y Habilidades.
  - al confirmar método, cargar habilidades compatibles desde backend.
  - eliminar el paso actual de chips por categorías como selector principal.
- Nuevo comportamiento del paso Habilidades:
  - bloque superior: “Sugeridas para este método”.
  - bloque secundario: catálogo compatible filtrado con búsqueda.
  - selección múltiple con contador visible.
  - aviso si el método cambió y algunas habilidades fueron removidas por incompatibilidad.
- Si el usuario vuelve atrás y cambia el método:
  - mantener solo `selected_skill_ids` compatibles con el nuevo método,
  - refrescar shortlist y catálogo.

## Admin y Mantenibilidad
- En el módulo admin de metodologías, agregar gestión de compatibilidades:
  - ver skills vinculadas a un método,
  - agregar/quitar skills,
  - marcar `is_recommended`,
  - definir `priority`.
- La administración de estas compatibilidades debe quedar centralizada en `admin supremo` en v1.
- No incluir importación masiva en esta iteración; primero CRUD seguro y usable.
- Los cambios de esquema se preparan como SQL manual antes de tocar código.

## Pruebas
- Método con compatibilidades cargadas:
  - muestra shortlist recomendada y catálogo compatible completo.
- Método sin compatibilidades:
  - no rompe el wizard,
  - activa `fallback_mode`,
  - muestra advertencia y catálogo completo activo.
- Cambio de método:
  - conserva skills compatibles,
  - elimina incompatibles,
  - recalcula sugerencias.
- Skills archivadas:
  - no aparecen en wizard aunque sigan vinculadas en histórico.
- Generación de sílabo:
  - usa `selected_skill_ids` reales y el `teaching_method_id` elegido.
- Compatibilidad admin:
  - un cambio en vínculos método-skill se refleja inmediatamente en el wizard.

## Supuestos y Defaults
- La compatibilidad se define por skill exacta, no por categoría, para que el filtro sea determinístico y administrable.
- La shortlist inicial recomendada será corta y operable, por defecto 6 a 10 habilidades.
- El catálogo compatible seguirá siendo explorable; no se ocultará completamente al docente.
- El sistema mantiene compatibilidad con sílabos viejos que todavía tengan `selected_skill_categories`; solo los nuevos usarán `selected_skill_ids`.
