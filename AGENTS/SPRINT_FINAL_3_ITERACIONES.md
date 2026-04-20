# Sprint Final de Entrega: 3 Iteraciones

## Objetivo del sprint
Cerrar el producto en 3 iteraciones compactas, unificando los dos planes vigentes:

- `PLANv219042026.md`: base de datos, seguridad, admin curricular, flujo oficial de datos y persistencia.
- `PLANV2PARTE2.md`: orden final del wizard con `metodo -> habilidades`, filtro deterministico por compatibilidad y gestion administrable de vinculos metodo-habilidad.

La meta no es abrir mas frentes, sino convertir ambos planes en una ruta corta de entrega final, con dependencias claras y sin ampliar alcance.

## Decision de integracion entre ambos planes
Orden final confirmado para cierre de producto:

`Curso -> Bibliografia -> Metodo -> Habilidades -> Calificacion -> Confirmacion`

Regla de compatibilizacion para integrar el resto del alcance:

- los desempenos se resuelven antes del paso de habilidades, en backend;
- la IA puede sugerir habilidades exactas a partir de curso + desempenos;
- pero la experiencia final de seleccion se gobierna por el metodo elegido;
- la lista visible en el paso Habilidades sera la interseccion entre:
  - sugerencias IA,
  - catalogo compatible del metodo,
  - y catalogo activo disponible;
- si un metodo no tiene compatibilidades cargadas, entra `fallback_mode` y se muestra el catalogo completo activo con advertencia.

Asi se conserva lo mejor de ambos planes sin contradiccion funcional ni ambiguedad sobre el wizard.

## Alcance congelado para entrega
Incluido en este sprint:

- permisos y scopes base;
- CRUD admin de metodos, habilidades, curriculo y desempenos;
- compatibilidad `teaching_method_skill_links`;
- wizard final v2;
- generacion con `teaching_method_id` + `selected_skill_ids`;
- persistencia completa de snapshots en `syllabi`;
- archivado logico;
- historial minimo viable;
- compatibilidad de lectura con silabos antiguos;
- pruebas funcionales y de seguridad.

Fuera de alcance:

- importacion masiva;
- exportacion masiva;
- automatizacion de migraciones DDL;
- UI avanzada de auditoria para todos los catalogos si el backend ya deja el historial listo.

## Iteracion 1: Fundacion de datos, seguridad y admin core
### Objetivo
Dejar lista la base estructural para que el wizard final no dependa de hardcodes ni de permisos improvisados.

### Entregables
- Script SQL manual para cambios de esquema:
  - `user_scope_assignments`
  - `permissions_catalog`
  - `role_permission_templates`
  - `user_permission_overrides`
  - `teaching_method_skill_links`
  - campos de archivado/estado/version si faltan
  - tablas de historial para metodos, skills, curriculo y desempenos
- Backend de autorizacion centralizada:
  - permisos efectivos = rol + overrides
  - resolucion de scopes activos
  - validacion por `career` y `program`
- Admin API minimo viable:
  - `GET/POST/PUT/DELETE logico` de metodologias
  - `GET/POST/PUT/DELETE logico` de habilidades
  - `PUT /api/admin/courses/{course_id}/curriculum`
  - CRUD de desempenos por curso
  - CRUD de compatibilidades metodo-habilidad
- Reglas de negocio cerradas:
  - `admin` = admin supremo v1
  - `director` edita dentro de `career`
  - `coordinador` edita dentro de `program`
  - `docente` sin modulo admin
  - `deny override` prevalece
  - cursos comunes solo `director` o `admin`
- Admin UI basica pero usable:
  - Metodologias
  - Habilidades
  - Cursos/curriculo
  - Desempenos
  - Vinculos metodo-habilidad desde metodologias

### Criterio de salida
- Ya no existen fuentes hardcodeadas para metodos/habilidades nuevas.
- El admin puede mantener catalogos y vinculos sin tocar BD manualmente.
- Los permisos bloquean correctamente accesos fuera de scope.
- Todo cambio sensible queda archivado o historizado.

### Riesgos a controlar
- No intentar cerrar en esta iteracion toda la UI de gestion de usuarios.
- No mezclar aun wizard nuevo con reglas incompletas de permisos.

## Iteracion 2: Wizard v2 y generacion end-to-end
### Objetivo
Entregar el flujo real de creacion de silabo usando datos oficiales, compatibilidad por metodo y persistencia completa.

### Entregables
- Orden final del wizard:
  - `Curso -> Bibliografia -> Metodo -> Habilidades -> Calificacion -> Confirmacion`
- Resolucion de desempenos:
  - usar oficiales activos si existen
  - si no existen, fallback IA desde `sumilla + resultado_aprendizaje`
  - persistir origen `official` o `ai_fallback`
- APIs del wizard:
  - `GET /api/methods`
  - `GET /api/methods/{method_id}/skills`
  - endpoint de resolucion de desempenos/sugerencias si aplica
  - `POST /api/syllabus/generate-v2`
- Logica de habilidades:
  - abandono definitivo de `selected_skill_categories` para nuevos silabos
  - uso de `selected_skill_ids`
  - ranking por `is_recommended`, `priority`, nombre
  - shortlist recomendada + catalogo compatible
  - busqueda y seleccion multiple
  - aviso cuando cambiar metodo remueve habilidades incompatibles
  - `fallback_mode` si faltan compatibilidades
- Logica del metodo:
  - el metodo seleccionado gobierna cronograma, metodologia, tecnicas didacticas, estrategias e instrumentos
  - las sugerencias IA de habilidades se acoplan al metodo, no lo contradicen
- Persistencia nueva en `syllabi`:
  - snapshot del metodo elegido
  - habilidades confirmadas
  - desempenos usados
  - origen de desempenos
  - `methodology_json` y `payload_json` completos
- Compatibilidad:
  - silabos antiguos siguen abriendo en modo legado de lectura

### Criterio de salida
- Un docente puede generar un silabo v2 completo sin depender de catalogos quemados ni categorias manuales.
- El backend recibe y usa `teaching_method_id` + `selected_skill_ids`.
- La seccion metodologia sale del metodo real de BD y ya no cae al texto generico para silabos nuevos.
- Cambiar metodo recalcula habilidades de forma consistente.

### Riesgos a controlar
- Evitar doble fuente de verdad entre frontend y backend para skills sugeridas.
- Asegurar que el fallback por falta de compatibilidades no rompa la generacion.

## Iteracion 3: Cierre operativo, usuarios/permisos y release hardening
### Objetivo
Cerrar el producto para entrega estable, administrable y verificable en entorno real.

### Entregables
- Modulo admin de usuarios y permisos:
  - cambio de rol
  - asignacion multiple de scopes
  - overrides allow/deny
  - acceso exclusivo para `admin`
- Historial visible al menos para:
  - curriculo de cursos
  - desempenos
- Ajustes de archivado:
  - metodos archivados no aparecen en wizard
  - skills archivadas no aparecen en wizard
  - pero siguen visibles en silabos historicos
- QA integral:
  - seguridad por rol/scope
  - CRUD y archivado de catalogos
  - reordenamiento de desempenos con `D1..Dn`
  - flujo con desempenos oficiales
  - flujo con fallback IA
  - cambio de metodo y conservacion parcial de skills compatibles
  - lectura de silabos legacy
- Estabilizacion final:
  - correccion de bugs
  - limpieza de estados intermedios
  - validacion de payloads
  - revision de mensajes, warnings y bordes UX
- Preparacion de release:
  - checklist de despliegue
  - SQL manual consolidado para ejecucion por Adminer
  - smoke test post-deploy

### Criterio de salida
- El sistema queda administrable por el `admin supremo`.
- El flujo academico funciona con datos oficiales y fallback controlado.
- Los permisos ya no son decorativos: gobiernan UI y endpoints.
- El producto queda listo para UAT final o salida a produccion controlada.

## Orden recomendado de ejecucion real
1. Esquema SQL y contratos backend.
2. Admin CRUD y compatibilidades metodo-habilidad.
3. Wizard v2 y persistencia.
4. Permisos UI, historial visible y hardening.

## Priorizacion MoSCoW dentro del sprint
### Must Have
- tabla `teaching_method_skill_links`
- `selected_skill_ids`
- wizard final con `Metodo -> Habilidades`
- fallback de desempenos oficiales / IA
- CRUD admin de metodos, skills, curriculo y desempenos
- permisos por rol/scope en backend
- archivado logico
- persistencia snapshot en `syllabi`

### Should Have
- UI de usuarios/permisos
- historial visible de cursos y desempenos
- warning UX por cambio de metodo y remocion de skills incompatibles

### Could Have
- historial visible para catalogos globales en UI
- refinamientos visuales del admin

### Won't Have en este cierre
- importacion/exportacion masiva
- motor de migraciones automaticas

## Definition of Done del producto final
- El admin mantiene catalogos, vinculos y curriculo desde UI.
- El docente genera silabos con metodo real, habilidades exactas y desempenos oficiales o fallback controlado.
- Los silabos nuevos guardan snapshot suficiente para editor y exportacion sin dependencia de hardcodes.
- Los silabos antiguos siguen siendo legibles.
- La seguridad por rol, scope y override pasa pruebas.
- Todo lo estructural nuevo se entrega como SQL manual ejecutable por Adminer.

## Recomendacion de gestion
Cada iteracion debe cerrarse como corte funcional, no como capa tecnica aislada:

- Iteracion 1: admin y datos confiables
- Iteracion 2: generacion real de silabo
- Iteracion 3: control, endurecimiento y salida

Si algo aprieta en tiempo, no se recorta el flujo v2 ni la seguridad backend; se recorta primero la UI avanzada de historial catalogo y cualquier refinamiento no critico.
