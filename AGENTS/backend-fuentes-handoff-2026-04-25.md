# Handoff Backend Fuentes - 2026-04-25

## 1. Resumen ejecutivo

El step 4 de `/creator/fuentes` esta migrando a un flujo de demo mas controlado y convincente para cliente. La idea ya no es depender por ahora de un flujo RAG completo ni de carga docente real como fuente principal para poblar referencias. En su lugar, el frontend se esta simplificando alrededor de tres bloques visibles:

- NotebookLM como apoyo externo paralelo para que el docente consiga un consolidado de referencias.
- Curaduria IA para buscar/seleccionar referencias desde el backend.
- Tabla compacta para visualizar y seleccionar referencias de forma mas clara.

El cambio de enfoque responde a que hoy el demo necesita:

- Menos friccion operativa.
- Menos ruido visual.
- Mejor narrativa comercial.
- Menos dependencia de carga documental real.
- Una salida compacta y entendible para la seleccion de fuentes.

La pieza clave para backend es dejar listo `/api/search/bibliography` para alimentar una tabla rica, y dejar el parser de NotebookLM suficientemente robusto para aprovechar PDF/MD exportados sin meter una migracion riesgosa de schema.

## 2. Contexto y decisiones ya tomadas

- En frontend ahora solo hay 3 bloques visibles en el step de fuentes: NotebookLM, Curaduria IA y Tabla.
- Las referencias APA en string deben mostrarse en modal, no en textarea inline.
- El usuario quiere despues una tabla tipo mockup que consuma un endpoint enriquecido.
- La columna `Tipo` de la tabla se decidio como tipo bibliografico principal, no como formato de archivo.
- Etiquetas esperadas para `type`: `articulo`, `libro`, `tesis`, `documentacion`, `web_academica`, `video`.
- La razon de elegir tipo bibliografico es que es mas facil de implementar y mas convincente para demo.
- NotebookLM sigue siendo paralelo/complementario, no reemplazo del flujo de curaduria IA.
- El backend debe mantener compatibilidad con el contrato actual donde ya existe `apa_format`.

## 3. Revision de backend hecha y hallazgos concretos

### `silabos-backend/routers/search.py`

Hallazgo inicial:

- El endpoint `POST /api/search/bibliography` buscaba referencias via `search_bibliography(...)`.
- Luego construia prompt con `construir_prompt_bibliografia_apa(...)`.
- Parseaba el JSON devuelto por IA.
- La respuesta final devolvia solo `apa_format`, `doi`, `url`, `source`, `verified`.
- Si Gemini fallaba, armaba un fallback muy basico con `authors`, `year`, `title` incrustados solo en `apa_format`.

Problema:

- No alcanzaba para pintar tabla porque faltaban `title`, `authors`, `year`, `type` y algun campo display-friendly.
- No habia una capa de normalizacion final para limpiar placeholders o rehidratar metadata desde la fuente cruda.

Estado local actual en esta rama:

- Reescribi el archivo para encapsular helpers internos de enriquecimiento.
- Agregue helpers para:
  - extraer JSON robustamente,
  - matchear filas IA vs referencia cruda por `candidate_index`, DOI, URL o titulo,
  - normalizar filas antes de responder,
  - construir fallback enriquecido si falla el parseo IA.
- El endpoint ahora intenta devolver por fila:
  - `apa_format`
  - `title`
  - `authors`
  - `year`
  - `type`
  - `display_text`
  - `doi`
  - `url`
  - `source`
  - `verified`

Observacion importante:

- No pude validar ejecutando tests porque el Python del `venv` requirio permisos elevados y la corrida fue abortada por el usuario.
- Manana conviene revisar sintaxis y correr pruebas antes de mergear cualquier cambio.

### `silabos-backend/prompts/search_prompt.py`

Hallazgo inicial:

- El prompt solo pedía JSON con `apa_format`, `doi`, `url`, `source`, `verified`.
- No habia reglas explicitas contra placeholders como `autor`, `author`, `unknown`, `n/a`.
- Tampoco exigia preservar `title`, `authors` o `year`.

Estado local actual:

- Reescribi el archivo completo en ASCII para evitar problemas de encoding.
- El prompt ahora:
  - incluye `candidate_index`,
  - pide `title`, `authors`, `year`, `type`, `display_text`,
  - restringe `type` a las seis etiquetas acordadas,
  - prohíbe placeholders,
  - instruye a devolver `null` o `[]` cuando falte informacion.

### `silabos-backend/services/bibliography_parser.py`

Hallazgo inicial:

- Solo extraia `list[str]` desde la seccion `REFERENCIAS BIBLIOGRAFICAS`.
- El parser era muy dependiente de ese encabezado exacto.
- `detectar_tipo_referencia(...)` solo distinguia `video`, `articulo`, `web` y `libro`.
- No habia una forma reusable de convertir `ref_text` a metadata estructurada.

Estado local actual:

- Reescribi el archivo para centralizar normalizacion y heuristicas.
- Agregue:
  - limpieza de placeholders,
  - normalizacion de DOI, URL, anio, autores y textos,
  - heuristica de tipo bibliografico: `articulo`, `libro`, `tesis`, `documentacion`, `web_academica`, `video`,
  - `referencia_a_metadata(...)`,
  - `refs_a_rows(...)`,
  - `normalize_reference_metadata(...)`,
  - `build_fallback_apa(...)`,
  - `build_reference_display(...)`.
- El parser ahora intenta:
  - reconocer encabezados mas amplios como `Fuentes consultadas`, `Bibliografia`, `References`,
  - tolerar bullets/Markdown,
  - reconstruir referencias separadas en PDF con saltos rotos,
  - usar el texto completo como fallback si parece bibliografia aunque falte encabezado.

Decision de compatibilidad:

- `refs_a_bibliografia_json(...)` se mantuvo compatible con el formato legacy `{tipo, referencia}`.
- Para no romper consumidores legacy del silabo, `web_academica` se mapea a `web` en ese helper legacy.
- Para el endpoint enriquecido nuevo, la idea es usar `type` con taxonomia nueva completa.

### `silabos-backend/routers/documents.py`

Solo inspeccionado, no modificado.

Hallazgos:

- `POST /api/documents/upload` sigue llamando `parsear_referencias_bibliograficas(texto)` y luego `guardar_referencias_curso(... refs=list[str])`.
- El contrato actual sigue almacenando solo texto, asi que cualquier enriquecimiento estructurado debe derivarse en lectura o en helpers, no en schema por ahora.
- Este router hoy es el punto de entrada natural para NotebookLM PDF/MD/TXT.

### `silabos-backend/services/supabase_service.py`

Hallazgos iniciales:

- `course_bibliography_refs` ya guarda `doc_id`, `ref_text`, `ref_order`, `created_at`.
- `obtener_referencias_curso(...)` devuelve solo `list[str]`.
- `_coerce_bibliography_refs(...)` al aplanar bloques aceptaba `apa_format`, `ref_text`, `reference`, `text`, `title`.

Estado local actual:

- Agregue `obtener_referencias_curso_rows(course_id)` y su sync counterpart para exponer filas estructuradas sin migrar schema.
- Esa lectura usa `referencia_a_metadata(...)` y preserva:
  - `doc_id`
  - `course_id`
  - `ref_order`
  - `created_at`
  - metadatos derivados desde `ref_text`
- Extendi `_coerce_bibliography_refs(...)` para que tambien entienda:
  - `display_text`
  - `display`
  - `label`

Esto es util si manana el frontend empieza a round-trippear objetos enriquecidos y luego vuelve a necesitar aplanarlos.

### Otros archivos inspeccionados

#### `silabos-backend/services/bibliography_service.py`

- Inspeccionado para confirmar shape crudo.
- Hoy devuelve dicts con:
  - `title`
  - `authors`
  - `year`
  - `source`
  - `doi`
  - `url`
  - `abstract`
  - `verified`
- OpenAlex, SciELO y Crossref ya entregan suficiente metadata cruda para enriquecer respuesta sin depender ciegamente de la IA.

#### `silabos-backend/routers/progressive.py`

- Inspeccionado para entender como se mezcla bibliografia en el draft progresivo.
- El bloque `bibliography` sigue operando sobre listas de textos.
- No fue necesario tocarlo para este objetivo.

#### `silabos-backend/routers/syllabus.py`

- Inspeccionado para entender mezcla de refs IA + NotebookLM.
- Sigue usando `refs_a_bibliografia_json(refs_precargadas)` y mezcla textos con tipo heuristico.
- No fue modificado.

#### `silabos-backend/tests/test_progressive_step_blocks.py`

- Modificado.
- Se agrego un caso para que `_coerce_bibliography_refs(...)` preserve tambien `display_text`.

## 4. Shape observado de `/api/search/bibliography` y por que no alcanza

Shape observado originalmente en backend:

```json
{
  "success": true,
  "data": {
    "references": [
      {
        "apa_format": "Perez, J. (2024). ...",
        "doi": "10.xxxx/....",
        "url": "https://...",
        "source": "crossref",
        "verified": true
      }
    ],
    "total": 1,
    "sources_consulted": ["crossref", "openalex"]
  },
  "error": null
}
```

Por que no alcanza para la tabla final:

- `title` no viene separado.
- `authors` no viene separado.
- `year` no viene separado.
- `type` no existe.
- No hay `display_text` o equivalente para render rapido.
- El frontend tendria que parsear `apa_format` para construir columnas, lo cual es fragil.
- Tampoco habia limpieza robusta de placeholders devueltos por IA.

## 5. Shape recomendado para la tabla final

Recomendacion por fila dentro de `data.references`:

```json
{
  "apa_format": "Perez, J., & Lopez, A. (2024). Advanced Data Mining. https://doi.org/10.1234/abc",
  "title": "Advanced Data Mining",
  "authors": ["Perez, J.", "Lopez, A."],
  "year": 2024,
  "type": "articulo",
  "display_text": "Perez, J. et al. (2024). Advanced Data Mining",
  "doi": "10.1234/abc",
  "url": "https://doi.org/10.1234/abc",
  "source": "crossref",
  "verified": true
}
```

Campos recomendados:

- `apa_format`: mantenerlo por compatibilidad y para modal detalle.
- `title`: titulo limpio para columna principal.
- `authors`: arreglo limpio, sin placeholders.
- `year`: entero o `null`.
- `type`: una de las seis etiquetas acordadas.
- `display_text`: string corto para render rapido o fallback.
- `doi`: string o `null`.
- `url`: string o `null`.
- `source`: `openalex`, `scielo`, `crossref` o similar.
- `verified`: booleano derivado de DOI/URL.

Opcionales utiles si despues se quiere trazabilidad:

- `candidate_index`
- `ref_order`
- `created_at`
- `doc_id`

Pero para demo de tabla no son imprescindibles.

## 6. Hallazgos sobre el parser de NotebookLM

Problemas observados en el parser original:

- Dependencia fuerte del heading `REFERENCIAS BIBLIOGRAFICAS`.
- Poca tolerancia a headings alternos como `Fuentes consultadas`.
- Tipificacion muy basica.
- Sin helpers de metadata.
- Riesgo de arrastrar basura si un campo llega como placeholder.

Basura/placeholder que hay que limpiar:

- `autor`
- `author`
- `autores`
- `unknown`
- `n/a`
- `title`
- `titulo`
- `none`
- `null`
- similares

Lo ideal en parser y posprocesado:

- convertir placeholders a `null` o `[]`,
- no propagar placeholders a `display_text`,
- no confiar ciegamente en lo que devuelva la IA si ya hay metadata cruda mejor.

## 7. Plan tecnico propuesto

### Fase A - Quick wins para demo

- Enriquecer `/api/search/bibliography` con `title`, `authors`, `year`, `type`, `display_text`.
- Mantener `apa_format`.
- Limpiar placeholders al final del pipeline, no solo en prompt.
- Si la IA falla, responder con fallback enriquecido desde metadata cruda.

### Fase B - Cambios de endpoint

- Pedir a la IA que preserve `candidate_index`, `title`, `authors`, `year`, `source`, `doi`, `url`.
- Matchear respuesta IA con referencia cruda.
- Rehidratar metadata usando fuente cruda como prioridad.
- Aplicar heuristica de tipo bibliografico al final.

### Fase C - Mejoras parser NotebookLM

- Reconocer headings alternativos.
- Tolerar bullets y Markdown.
- Mejorar corte entre referencias concatenadas en PDFs.
- Agregar `referencia_a_metadata(...)` y `refs_a_rows(...)`.
- Exponer lectura estructurada desde Supabase sin cambiar schema.

### Fase D - Normalizacion y limpieza

- Centralizar limpieza en helpers compartidos.
- Normalizar DOI.
- Normalizar URL.
- Normalizar anio.
- Normalizar autores.
- Rechazar placeholders exactos y compuestos.
- Generar `display_text` a partir de datos limpios.

### Fase E - Pruebas

- Test del parser de NotebookLM con Markdown/PDF-like text.
- Test de limpieza de placeholders.
- Test de tipificacion bibliografica.
- Test del enriquecimiento de `/api/search/bibliography`.
- Test de compatibilidad de `_coerce_bibliography_refs(...)`.

## 8. Cambios reales hechos en codigo y pendientes

### Cambios reales hechos

Archivos modificados o creados localmente en esta rama:

- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\routers\search.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\prompts\search_prompt.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\services\bibliography_parser.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\services\supabase_service.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\tests\test_progressive_step_blocks.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\tests\test_bibliography_parser.py`
- `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app\silabos-backend\tests\test_search_bibliography.py`

### Pendiente critico

- No se ejecutaron pruebas exitosamente.
- La corrida con el Python del `venv` requirio permisos elevados y fue abortada.
- Manana hay que correr al menos:
  - `tests.test_progressive_step_blocks`
  - `tests.test_bibliography_parser`
  - `tests.test_search_bibliography`
- Conviene hacer tambien una revision manual del diff porque:
  - `search.py` fue reescrito completo,
  - `search_prompt.py` fue reescrito completo,
  - `bibliography_parser.py` fue reescrito completo.

### Si mañana se decide no continuar con estos cambios

- Revisar antes de revertir, porque el usuario pidio no pisar trabajo ajeno y el arbol puede tener cambios paralelos.
- Usar `git -c safe.directory=C:/TEST_CODE/SILABOSAIAUTOMATIZACION/silabos_app status` si `git status` vuelve a fallar por dubious ownership.

## 9. Riesgos, supuestos y siguiente paso recomendado

### Riesgos

- Riesgo de error de sintaxis o import al no haber corrido tests.
- Riesgo de alguna heuristica demasiado agresiva limpiando texto valido.
- Riesgo de que algun consumidor legacy espere `web` en vez de `web_academica` si se usa el nuevo `type` fuera del endpoint enriquecido.
- Riesgo de encoding si alguien mezcla versiones viejas y nuevas de archivos que fueron reescritos.

### Supuestos

- El frontend seguira tolerando `apa_format` como campo existente.
- `authors` como arreglo y `year` como entero/null es aceptable para la tabla.
- Por ahora no hace falta migracion de `course_bibliography_refs`.
- El tipo bibliografico principal es suficiente para demo.

### Siguiente paso recomendado para mañana

1. Correr pruebas y corregir cualquier error de sintaxis/import.
2. Probar manualmente `POST /api/search/bibliography` con 2 o 3 keywords reales.
3. Confirmar que la respuesta final sale con shape enriquecido.
4. Revisar si `display_text` satisface la tabla o si conviene agregar `authors_text`.
5. Si la parte de búsqueda queda estable, evaluar si conviene exponer un endpoint de lectura estructurada para refs NotebookLM usando `obtener_referencias_curso_rows(...)`.

## Nota final

Este handoff refleja el estado real al cierre de hoy:

- se inspecciono el flujo completo relevante,
- se hicieron cambios locales de backend,
- no se validaron aun por ejecucion de tests.

Si manana otro agente retoma, la prioridad numero uno debe ser validar estos cambios antes de seguir refinando UI o consumo frontend.
