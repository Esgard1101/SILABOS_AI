# Informe Interno Developer - Deploy, Produccion y Respuesta Rapida

Fecha base: 2026-04-14  
Ultima adenda aprobada con cliente: 2026-04-30  
Proyecto: SIGEISIL / SILABOS.AI

## 0. Fuente de verdad actual

Este documento reemplaza las decisiones temporales tomadas durante la fase de desarrollo. La decision vigente para produccion y fase activa es:

| Componente | Decision vigente |
|---|---|
| Frontend cliente | cPanel del cliente como sitio estatico |
| Frontend preview/dev | Vercel o entorno local, solo para pruebas |
| Backend | VPS CubePath administrado con Coolify |
| Base de datos produccion | Supabase PRO PostgreSQL |
| Base de datos local en VPS | Retirar de produccion |
| Adminer en VPS | Retirar de produccion |
| IA principal | Gemini / OpenAI segun configuracion activa |
| Fallback IA | OpenRouter u otro proveedor configurado |
| Uploads/PDFs | Carpeta local persistente `/uploads` en backend |

Regla clave: en produccion la base de datos NO debe vivir dentro del VPS. El VPS queda enfocado en FastAPI, workers, parseo de PDFs, orquestacion de IA y almacenamiento local de archivos cargados.

## 1. Motivo de la reestructuracion

La base PostgreSQL dentro del VPS fue util para desarrollo y optimizacion de costos, pero no es la opcion mas segura para la fase activa con varios docentes generando silabos en paralelo.

Riesgos detectados del modelo anterior:

- consumo alto de RAM por PostgreSQL + backend en un servidor de 4 GB;
- posibilidad de OOM Killer durante picos de concurrencia;
- mantenimiento manual de backups, indices, memoria y recuperacion;
- Adminer y herramientas de DB compitiendo por recursos del backend;
- objetos `JSONB` complejos en `syllabi.payload_json` y `methodology_json`, costosos cuando se procesan muchas generaciones simultaneas.

Decision aprobada: usar Supabase PRO por 25 USD/mes durante los meses de operacion intensiva. Supabase aporta PostgreSQL administrado, backups, Point-in-Time Recovery y una base mas preparada para busquedas avanzadas o RAG futuro.

## 2. Arquitectura aprobada para fase activa

### 2.1 Frontend

El frontend queda en cPanel del cliente como build estatico.

Debe apuntar al dominio publico del backend autorizado. Antes de subir a cPanel confirmar:

- variable de API correcta en el build;
- dominio backend permitido por CORS;
- rutas SPA soportadas por `.htaccess` si aplica;
- assets generados y cacheados correctamente.

### 2.2 Backend

El backend queda en CubePath `gp.micro` con Coolify.

Plan vigente:

- `gp.micro`;
- 4 vCPU;
- 4 GB RAM;
- costo acordado aproximado: 15.00 USD/mes;
- upgrade suspendido temporalmente mientras la DB este fuera del VPS.

Condicion de upgrade: si en pruebas de estres o produccion la RAM supera 90% de forma sostenida, subir inmediatamente a `gp.starter` de 8 GB RAM.

### 2.3 Base de datos

La base de datos de produccion debe estar en Supabase PRO.

Acciones obligatorias para pasar a produccion:

1. Crear o activar proyecto Supabase PRO.
2. Restaurar/migrar datos actuales a Supabase.
3. Actualizar `DATABASE_URL` del backend en Coolify con la cadena nueva de Supabase.
4. Verificar que el formato de URL sea compatible con SQLAlchemy (`postgresql+psycopg2://` si el backend lo requiere).
5. Redeploy del backend.
6. Probar `/health`, login, catalogos, generacion, guardado y exportacion.
7. Eliminar la base PostgreSQL local de Coolify cuando la migracion este verificada.
8. Eliminar Adminer del VPS para liberar memoria y reducir superficie de riesgo.

No dejar dos bases activas como si ambas fueran produccion. Durante migracion puede existir una ventana temporal, pero al cierre debe quedar una sola fuente de verdad: Supabase PRO.

## 3. Variables criticas de entorno

Revisar en Coolify antes de cada redeploy:

| Variable | Uso | Riesgo si falla |
|---|---|---|
| `DATABASE_URL` | Conexion PostgreSQL Supabase | Backend cae o guarda en DB equivocada |
| `GEMINI_API_KEY` / proveedor IA | Generacion de contenido | Error en generacion |
| `OPENAI_API_KEY` / fallback | Fallback o funciones futuras | Sin respaldo ante falla IA |
| `FRONTEND_URL` / CORS | Permitir cPanel | Login o requests bloqueados |
| `UPLOAD_DIR` | PDFs y archivos locales | Perdida o no lectura de documentos |
| `SECRET_KEY` / JWT | Sesiones | Login invalido o inseguro |

Regla: no cambiar variables en produccion sin anotar fecha, valor anterior conceptual y motivo. Nunca pegar secretos reales en chats o documentos.

## 4. Checklist de deploy a produccion

### 4.1 Antes del deploy

- Confirmar que Supabase PRO esta activo.
- Confirmar backups de la DB anterior.
- Confirmar copia de `/uploads`.
- Confirmar `DATABASE_URL` nueva.
- Confirmar CORS con dominio de cPanel.
- Confirmar build frontend con URL del backend productivo.
- Confirmar que el contenedor PostgreSQL local y Adminer no son necesarios.

### 4.2 Deploy backend

1. Actualizar variables en Coolify.
2. Redeploy backend.
3. Revisar logs de arranque.
4. Confirmar inicializacion de servicios IA.
5. Confirmar conexion a Supabase.
6. Ejecutar pruebas funcionales basicas.

### 4.3 Deploy frontend en cPanel

1. Generar build estatico.
2. Subir contenido del build a cPanel.
3. Verificar `.htaccess` para SPA si corresponde.
4. Abrir dominio cliente.
5. Probar login y flujo de generacion desde navegador real.

### 4.4 Despues del deploy

- Eliminar contenedor PostgreSQL local en Coolify.
- Eliminar Adminer.
- Confirmar RAM libre del VPS.
- Confirmar que no existen conexiones productivas a la DB vieja.
- Documentar fecha y responsable del cambio.

## 5. Pruebas minimas obligatorias

| Prueba | Resultado esperado |
|---|---|
| `GET /health` | Backend responde OK y DB conectada |
| Login docente | Token/session valida |
| Login admin/coordinador | Acceso por rol correcto |
| Listado de programas | Catalogos cargan desde Supabase |
| Listado de cursos | Cursos visibles y filtrados |
| Generacion de silabo | IA responde y estructura completa |
| Guardado de silabo | Registro aparece en `syllabi` |
| Lectura posterior | El silabo guardado se recupera igual |
| Exportacion | Documento final se genera |
| Upload PDF | Archivo queda en `/uploads` persistente |

## 6. Guia rapida para incidentes en produccion

Objetivo: resolver rapido cuando hay varios docentes en paralelo. Primero identificar si el cuello es frontend, backend, DB, IA o archivos.

### 6.1 Sintoma: todos los usuarios ven error o pantalla vacia

Prioridad de revision:

1. Verificar si el dominio frontend de cPanel carga.
2. Abrir DevTools y confirmar si falla la API.
3. Probar `/health` del backend.
4. Revisar logs de Coolify.
5. Confirmar que Supabase no este pausado, saturado o con credenciales cambiadas.

Accion rapida:

- si frontend carga pero API falla, el problema esta en backend/CORS/API;
- si `/health` falla, redeploy backend y revisar `DATABASE_URL`;
- si `/health` responde pero login falla, revisar auth, DB y roles.

### 6.2 Sintoma: login falla para todos

Revisar:

- `DATABASE_URL`;
- tabla `users`;
- roles y `status`;
- `SECRET_KEY` o configuracion JWT;
- CORS si el navegador bloquea la respuesta.

Accion rapida:

- validar un usuario desde Supabase;
- probar login con cuenta admin;
- revisar logs del endpoint de autenticacion.

### 6.3 Sintoma: algunos docentes generan, otros no

Probables causas:

- curso sin data suficiente;
- usuario sin `career_id` o rol correcto;
- timeout por PDF pesado;
- error de proveedor IA;
- payload demasiado grande.

Accion rapida:

- pedir email del docente y curso exacto;
- revisar el ultimo error en logs por timestamp;
- probar el mismo curso con admin;
- si falla solo un curso, revisar `courses`, `performances`, `course_bibliography_refs` y metadata asociada.

### 6.4 Sintoma: generacion lenta o timeouts con muchos docentes

Revisar en este orden:

1. RAM del VPS.
2. CPU del VPS.
3. logs de workers Uvicorn/FastAPI.
4. latencia/respuestas del proveedor IA.
5. Supabase dashboard: conexiones, CPU, queries lentas.

Acciones rapidas:

- bajar temporalmente concurrencia si existe control interno;
- aumentar workers solo si queda RAM disponible;
- si RAM supera 90%, ejecutar upgrade a `gp.starter`;
- si IA esta lenta, activar fallback o cambiar proveedor/modelo configurado;
- revisar si algun PDF pesado esta bloqueando procesos.

### 6.5 Sintoma: guardado falla despues de generar

Revisar:

- conexion a Supabase;
- permisos/constraints de `syllabi`;
- tamano de `payload_json`;
- errores de serializacion JSON;
- migraciones pendientes.

Accion rapida:

- probar guardar un silabo minimo;
- revisar el error SQL exacto;
- no ejecutar DDL automatico desde el backend en produccion;
- preparar SQL crudo si se requiere ajuste de esquema.

### 6.6 Sintoma: exportacion falla

Revisar:

- que el silabo exista en `syllabi`;
- estructura de `payload_json`;
- permisos de escritura temporales;
- libreria o servicio que genera el documento;
- logs del endpoint de exportacion.

Accion rapida:

- intentar exportar otro silabo conocido;
- si solo falla uno, revisar campos faltantes en payload;
- si fallan todos, revisar dependencia de exportacion o storage temporal.

### 6.7 Sintoma: PDFs o bibliografia no aparecen

Revisar:

- carpeta `/uploads`;
- volumen persistente en Coolify;
- permisos de lectura/escritura;
- tabla `course_bibliography_refs`;
- ruta configurada en `UPLOAD_DIR`.

Accion rapida:

- confirmar si el archivo existe fisicamente;
- si la DB apunta a archivo inexistente, restaurar desde backup de uploads;
- si el archivo existe pero no se lee, revisar permisos/ruta dentro del contenedor.

## 7. Monitoreo durante fase activa

Durante el mes de inicio de ciclo revisar al menos una vez al dia:

| Recurso | Umbral de alerta | Accion |
|---|---:|---|
| RAM VPS | > 80% sostenido | Vigilar workers y procesos |
| RAM VPS | > 90% sostenido | Upgrade a `gp.starter` |
| CPU VPS | > 85% sostenido | Revisar PDFs, workers y loops |
| Disco VPS | > 80% | Limpiar temporales y revisar uploads |
| Errores 5xx | Cualquier pico | Revisar logs Coolify |
| Supabase conexiones | Cerca del limite | Revisar pool/concurrencia |
| IA timeouts | Repetidos | Activar fallback o bajar carga |

Comandos utiles en VPS:

```bash
free -h
df -h
docker ps
docker stats
docker logs <backend-container> --tail 200
```

Usarlos con cuidado en produccion. No reiniciar servicios sin revisar logs inmediatos.

## 8. Modelo operativo y financiero aprobado

### 8.1 Fase activa

Durante el inicio de semestre:

- VPS activo;
- Supabase PRO activo;
- API de IA activa;
- monitoreo diario;
- backups frecuentes;
- soporte rapido a docentes.

### 8.2 Fase de reposo

Durante el resto del anio:

- generar backup completo `.sql` desde Supabase;
- descargar copia de `/uploads`;
- reducir o apagar servicios costosos cuando sea viable;
- mantener retencion de IP si aplica, aprox. 2.00 USD/mes;
- si no se retiene IP, asumir ajuste manual de DNS en cPanel durante la siguiente activacion.

### 8.3 Cobro por IA

Decision comercial: estandarizar IA como paquete fijo.

Referencia aprobada:

- cuota IA cliente: 20.00 USD/mes;
- fundamento: el costo real por silabo usando modelos eficientes es bajo, pero el paquete cubre operacion, margen, fallback y presupuesto predecible.

## 9. Modelo de datos relevante para soporte

Tablas core actuales:

| Tabla | Uso en produccion |
|---|---|
| `users` | Login, roles, alcance por carrera |
| `programs` | Programas academicos |
| `careers` | Carreras |
| `courses` | Catalogo de cursos |
| `performances` | Desempenos oficiales por curso; si esta vacia puede disparar fallback IA |
| `skills_catalog` | Catalogo de habilidades |
| `teaching_methods` | Metodologias institucionales |
| `course_bibliography_refs` | Bibliografia parseada desde NotebookLM/PDFs |
| `syllabi` | Silabos generados y payload final |

Campos criticos:

- `users.email`, `users.role`, `users.career_id`, `users.status`;
- `courses.id`, `courses.name`, `courses.code`, `courses.sumilla`;
- `syllabi.payload_json`, `syllabi.methodology_json`;
- `course_bibliography_refs.course_id`, `ref_text`, `ref_order`.

Si un docente reporta falla, pedir siempre:

- email del usuario;
- curso;
- hora aproximada;
- accion exacta;
- captura o mensaje de error;
- si subio PDF, nombre del archivo.

## 10. Politica de cambios de esquema

Regla estricta para agentes de IA y desarrolladores:

- no ejecutar migraciones DDL automaticas desde el backend en produccion;
- no asumir que Alembic u otro runner esta habilitado para produccion;
- todo cambio estructural debe proponerse como SQL crudo;
- el desarrollador responsable ejecuta manualmente el SQL en Supabase SQL Editor;
- antes de ejecutar DDL, tomar backup o confirmar Point-in-Time Recovery.

Ejemplos de DDL:

- crear tabla;
- alterar columna;
- crear indice;
- cambiar constraints;
- modificar tipos JSONB.

## 11. Seguridad y secretos

Reglas:

- no pegar credenciales reales en chats, issues ni documentos;
- si una credencial fue compartida, rotarla;
- actualizar Coolify despues de rotar;
- redeploy inmediato;
- confirmar que el backend usa la nueva credencial.

Secretos sensibles:

- `DATABASE_URL`;
- claves Gemini/OpenAI/OpenRouter;
- `SECRET_KEY`;
- credenciales cPanel;
- credenciales Supabase.

## 12. Backups

Durante fase activa:

- backup Supabase antes de cambios importantes;
- verificar PITR disponible en plan PRO;
- copia regular de `/uploads`;
- documentar fecha de cada backup.

Durante fase de reposo:

- export `.sql`;
- descarga completa de `/uploads`;
- guardar build frontend estable;
- documentar versiones de backend/frontend usadas en el ciclo.

Recordatorio: Supabase protege la base de datos, pero no protege automaticamente los PDFs locales del VPS.

## 13. Lecciones aprendidas de CubePath y Coolify

- No tocar firewall externo de CubePath sin plan de rollback. La politica DROP puede bloquear SSH, Coolify o backend.
- Evitar exponer puertos de base de datos al exterior.
- Preferir comunicacion interna segura y variables controladas.
- No instalar pgAdmin, Supabase Studio ni herramientas pesadas en el VPS.
- Mantener el VPS limpio: backend, volumen de uploads y servicios estrictamente necesarios.
- Si se usa una herramienta temporal de DB durante migracion, retirarla al terminar.

## 14. Criterios de escalamiento

Escalar VPS a `gp.starter` si ocurre cualquiera:

- RAM > 90% sostenida;
- OOM Killer detectado;
- backend reinicia durante generacion concurrente;
- timeouts frecuentes no atribuibles a IA ni Supabase;
- `docker stats` muestra contenedor backend al limite.

Escalar revision de base/Supabase si ocurre:

- queries lentas repetidas;
- limite de conexiones cercano;
- errores SQL concurrentes;
- guardados lentos de `payload_json`;
- necesidad de indices adicionales.

Escalar proveedor IA/fallback si ocurre:

- timeouts de modelo;
- rate limit;
- respuestas incompletas;
- costo anormal;
- degradacion del proveedor principal.

## 15. Recomendacion final vigente

La narrativa tecnica y comercial actual debe ser:

- frontend en cPanel del cliente;
- backend FastAPI en VPS administrado con Coolify;
- base de datos PostgreSQL administrada en Supabase PRO durante fase activa;
- PDFs y uploads en volumen persistente del VPS;
- IA como paquete operativo fijo;
- operacion elastica: subir servicios en fase activa y reducir costos en fase de reposo.

Esta decision prioriza estabilidad y velocidad de respuesta durante produccion con varios docentes en paralelo. El ahorro extremo queda subordinado a continuidad operativa, backups y soporte rapido.
