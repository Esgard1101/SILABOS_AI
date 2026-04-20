# Informe Interno Developer - Estado Real de Deploy y Decision de Infraestructura

Fecha: 2026-04-14

## 1. Estado actual confirmado

La arquitectura real de despliegue queda asi:

| Componente | Estado actual |
|---|---|
| Frontend preview | Vercel |
| Frontend cliente | cPanel |
| Backend | VPS CubePath administrado con Coolify |
| Base de datos | PostgreSQL dentro del VPS |
| IA principal | Gemini |
| Fallback IA | OpenRouter |

La migracion de la base de datos al VPS ya fue ejecutada. El backend ya esta levantando correctamente con la nueva `DATABASE_URL` interna del VPS.

## 2. Hallazgo clave de la migracion

El backend no dependia realmente de Supabase como plataforma, sino de PostgreSQL por `DATABASE_URL`.

Eso significa que:

- no fue necesario reescribir la logica principal;
- el cambio fue de infraestructura, no de producto;
- la compatibilidad con PostgreSQL propio era alta desde el inicio.

El unico ajuste de codigo necesario fue normalizar `postgres://` hacia `postgresql+psycopg2://` para SQLAlchemy.

## 3. Conclusiones tecnicas sobre la base de datos

### 3.1 PostgreSQL en VPS: decision correcta

Mover la base de datos al mismo VPS del backend fue la mejor decision por estas razones:

- elimina la dependencia de Supabase como costo o riesgo operativo;
- mejora la cercania entre backend y base de datos;
- simplifica la arquitectura;
- permite administrar el entorno de forma centralizada.

### 3.2 PostgreSQL de cPanel: no recomendado

Aunque cPanel muestre un modulo PostgreSQL, no conviene usarlo como base principal del sistema.

Razones:

- menor control sobre configuracion y rendimiento;
- mas dependencia del hosting compartido;
- mayor riesgo de restricciones de acceso, politicas del proveedor o limites del entorno;
- peor separacion entre capa web y capa de datos.

Conclusion interna:

- cPanel solo debe usarse para el frontend;
- backend y base de datos deben quedarse en el VPS.

## 4. Costos y margen interno actualizados

### 4.1 Costo real de infraestructura

| Concepto | Costo real mensual |
|---|---:|
| VPS gp.micro | 8.00 USD |
| IP flotante | 1.51 USD |
| Base de datos PostgreSQL en el mismo VPS | 0 USD adicional |
| Total real base | 9.51 USD |

### 4.2 Precio propuesto al cliente

| Concepto comercial | Precio mensual |
|---|---:|
| Hosting administrado de aplicacion y base de datos | 17.00 USD |
| Presupuesto operativo de IA | 12.00 USD |
| Total mensual estimado al cliente | 29.00 USD |

### 4.3 Margen interno

| Indicador | Valor |
|---|---:|
| Costo real del VPS e IP | 9.51 USD |
| Cobro por aplicacion + base de datos | 17.00 USD |
| Diferencia operativa | 7.49 USD |
| Markup aproximado sobre costo | 78.76% |

Lectura interna:

- el aumento de 2 USD esta justificado porque ahora el VPS sostiene backend y base de datos;
- ese fee no es solo hosting, tambien cubre administracion, soporte, operacion y responsabilidad tecnica.

## 5. Que cambio en el software y que no

### 5.1 Lo que no cambio

- no cambio la logica de negocio;
- no cambio el frontend por la migracion;
- no cambio el flujo principal de generacion de silabos.

### 5.2 Lo que si cambio

- la fuente de datos ya no es Supabase;
- la `DATABASE_URL` ahora apunta al PostgreSQL interno del VPS;
- el backend usa la misma capa de acceso, pero contra la nueva base.

### 5.3 Ajuste tecnico aplicado

Se agrego una normalizacion de URL para aceptar valores tipo `postgres://` y convertirlos a un formato compatible con SQLAlchemy.

Esto evito el error:

`Can't load plugin: sqlalchemy.dialects:postgres`

## 6. RAG y estado del sistema

El subsistema RAG sigue presente en el codigo, pero ya no es un requisito para justificar la migracion de la base al VPS.

Hallazgos:

- el flujo principal `generate-v2` no depende de RAG;
- el RAG esta concentrado sobre todo en el chat con documentos;
- el paso satelite de NotebookLM puede convivir sin que el RAG sea el centro del producto.

Recomendacion:

- no tocar RAG ahora si no estorba el deploy;
- si luego quieres simplificar el producto, se puede retirar en una fase separada.

## 7. Tareas pendientes de alta prioridad

| Tarea | Prioridad | Motivo |
|---|---|---|
| Probar `GET /health` | Alta | Confirmar estado real de servicios con la nueva base |
| Probar login | Alta | Validar usuarios y autenticacion sobre la nueva DB |
| Probar listado de programas y cursos | Alta | Confirmar integridad de catalogos migrados |
| Probar generacion de silabo | Alta | Validar flujo principal del producto |
| Probar guardado y lectura de silabos | Alta | Confirmar persistencia correcta |
| Probar exportacion | Alta | Confirmar que el flujo final del usuario funciona |
| Revisar persistencia de `uploads/` | Alta | Los archivos siguen en disco local |
| Configurar backups del PostgreSQL del VPS | Alta | Ya no existe respaldo externo por Supabase |

## 8. Tareas recomendadas de orden y limpieza

| Tarea | Prioridad | Comentario |
|---|---|---|
| Renombrar `SupabaseService` a `DatabaseService` | Media | El nombre ya no representa la arquitectura real |
| Actualizar `main.py` para que `/health` deje de decir `supabase` | Media | Es solo deuda tecnica de naming |
| Actualizar README del frontend | Media | Sigue desalineado del deploy real |
| Alinear upload de bibliografia con PDF/MD/TXT | Media | El frontend y backend aun no coinciden del todo |

## 9. Riesgos actuales

### 9.1 Password expuesta en conversacion

La credencial de la nueva base fue compartida en el chat.

Accion recomendada inmediata:

- rotar la contraseña de PostgreSQL;
- actualizar la `DATABASE_URL` en Coolify;
- redeployar una vez mas.

### 9.2 Backups

Antes parte del riesgo operativo quedaba amortiguado por el proveedor externo. Ahora todo el control es tuyo, lo cual es mejor, pero exige disciplina de backup.

### 9.3 Uploads locales

La base de datos ya esta dentro del VPS, pero los documentos siguen guardandose en disco local del contenedor o del entorno montado. Si no hay persistencia clara, puedes perder archivos aunque la DB este bien.

## 10. Verificaciones realizadas

| Verificacion | Resultado |
|---|---|
| `npm run lint` en frontend | OK |
| `npm run build` en frontend | OK |
| Redeploy backend tras migracion DB | OK |
| Inicializacion de GeminiService | OK |
| Inicializacion de SearchService | OK |
| Inicializacion de acceso a PostgreSQL en VPS | OK |

## 11. Recomendacion final

La documentacion comercial ya debe dejar de hablar de Supabase como estado actual. La narrativa correcta es:

- frontend en cPanel del cliente;
- backend y base de datos PostgreSQL en VPS administrado;
- IA como servicio operativo complementario.

Tambien es correcto subir el fee del entorno administrado a 17 USD mensuales, porque ahora ese mismo servicio sostiene tanto la aplicacion como la base de datos. Eso mejora el argumento comercial y refleja mejor la responsabilidad tecnica asumida.
---
### ANALISIS DE LA DB AL 18/04/2026

## 1. Visión General de Tablas y Volumetría
Base de datos relacional migrada a PostgreSQL. A continuación, el estado actual de registros:

* `courses`: ~ 317 registros
* `skills_catalog`: ~ 300 registros
* `teaching_methods`: 11 registros
* `syllabi`: ~ 10 registros
* `programs`: ~ 8 registros
* `users`: ~ 4 registros
* `faculties`: ~ 3 registros
* `careers`: ~ 1 registro
* `performances`: 0 registros (vacía actualmente)
* `course_bibliography_refs`: Activa (contiene referencias parseadas)

---

## 2. Diccionario de Datos (Tablas Core del Flujo)

### Tabla: `courses`
Almacena el catálogo de cursos. Es de solo lectura para el flujo de generación, pero editable desde el módulo Admin.
* **id**: `uuid` (PK)
* **career_id** / **program_id**: `uuid` (Relaciones)
* **name**: `varchar(200)`
* **code**: `varchar(30)`
* **credits**: `integer`
* **cycle**: `integer`
* **is_common**: `boolean` (indica si es de formación general)
* **scope**: `varchar(100)`
* **sumilla**: `text`
* **competencia_egreso**: `text`
* **resultado_aprendizaje**: `text`

### Tabla: `performances`
Almacena los desempeños oficiales desglosados por curso. (Actualmente vacía, dispara el fallback de IA).
* **id**: `uuid` (PK)
* **course_id**: `uuid` (FK a `courses`)
* **code**: `varchar` (ej. "D1", "D2")
* **statement**: `text` (el texto del desempeño)
* **display_order**: `integer` (secuencia)

### Tabla: `skills_catalog`
Catálogo estático de habilidades (~300 registros en 7 categorías).
* **id**: `uuid` (PK)
* **id_habilidad**: `varchar(20)` (ej. "HAB-COG-001")
* **nombre**: `varchar(300)` (ej. "Identificar conceptos clave")
* **descripcion**: `text`
* **categoria**: `varchar(100)` (ej. "Cognitiva")
* **subcategoria**: `varchar(150)` (ej. "Comprensión conceptual")
* **nivel_cognitivo**: `varchar(50)` (ej. "Comprender")
* **verbo_principal**: `varchar(100)` (ej. "identificar")
* **evidencias_sugeridas**: `text` (ej. "mapa conceptual, glosario")
* **instrumentos_sugeridos**: `text` (ej. "lista de cotejo")

### Tabla: `teaching_methods`
Metodologías pedagógicas institucionales (11 registros). Controla la generación de la metodología y cronograma.
* **id**: `uuid` (PK)
* **name**: `varchar(200)`
* **code**: `varchar(20)`
* **description**: `text`
* **phases**: `jsonb` (ej. `["Fase 1", "Fase 2"]`)
* **weekly_template**: `text` (ej. "Semanas 1-4: Fase 1 | Semanas 5-8: Fase 2")
* **tecnicas_didacticas**: `jsonb`
* **estrategias_evaluacion**: `text`
* **instrumentos_evaluacion**: `jsonb`

### Tabla: `course_bibliography_refs`
Almacena las referencias extraídas vía NotebookLM/PDFs.
* **id**: `uuid` (PK)
* **course_id**: `varchar`
* **doc_id**: `varchar`
* **ref_text**: `text` (la cita en formato APA)
* **ref_order**: `integer` (orden de aparición)

### Tabla: `syllabi`
Guarda el sílabo final generado y su metadata.
* **id**: `uuid` (PK)
* **course_id**: `uuid` (FK a `courses`)
* **user_id**: `uuid` (FK a `users`)
* **teaching_method_id**: `uuid` (FK a `teaching_methods`)
* **semester**: `varchar(20)`
* **teacher_name**: `varchar(200)`
* **status**: `varchar(20)` (default: draft)
* **payload_json**: `jsonb` (Almacena la estructura completa del sílabo, debe incluir skills confirmados y flag de origen de desempeños)
* **methodology_json**: `jsonb`

### Tabla: `users`
Maneja la autenticación y autorización (combina data transaccional con metadata de auth). Columnas de negocio clave:
* **id**: `uuid` (PK)
* **email**: `varchar`
* **full_name**: `varchar`
* **role**: `varchar` (Define el nivel de acceso: Admin, Coordinador, Docente)
* **career_id**: `uuid` (Define el alcance institucional del usuario)
* **status**: `varchar`

---
### ADMIN DB 17/04/26

Contexto General: La base de datos fue migrada exitosamente de la plataforma en la nube de Supabase a un contenedor PostgreSQL auto-alojado dentro del VPS principal (CubePath), gestionado a través de Coolify. Esto centraliza la arquitectura y mejora el margen operativo.

1. Herramientas de Administración Aprobadas
Visualización y CRUD Rápido (UI): Se utiliza Adminer (adminer:latest) desplegado como un contenedor dentro de Coolify. Esta es la herramienta principal para inspeccionar tablas, verificar registros y hacer ajustes manuales rápidos.

Operaciones de Bajo Nivel: Se utiliza la Terminal (SSH) directa al servidor root para configuraciones de sistema operativo, reinicios de Docker o gestión de firewall.

2. Protocolo de Migraciones y Cambios de Esquema (Para Agentes de IA)
Cualquier futuro agente de IA debe adherirse a esta regla estricta sobre las migraciones:

Cero Ejecución Automática: Los agentes nunca deben intentar ejecutar scripts de migración automática de DDL directamente desde el código del backend en producción. No se debe asumir que existe automatización para esto.

Propuesta de SQL Crudo: Cualquier cambio estructural (crear tablas, alterar columnas, modificar índices) debe ser propuesto por la IA como un script de SQL puro (Raw SQL).

Ejecución Manual: El desarrollador (dueño) tomará ese script SQL y lo ejecutará manualmente utilizando la interfaz de Adminer (en la pestaña "Comando SQL") o por consola.

3. Lecciones Aprendidas de Infraestructura (CubePath y Coolify)
Seguridad y Firewall (El peligro de la política DROP): Modificar el firewall externo de CubePath es altamente riesgoso. La política por defecto es DROP (bloqueo total). Un error al abrir un puerto nuevo (como olvidar incluir el puerto 22 o el 8000) resultará en el bloqueo completo del acceso al servidor y a Coolify.

Conexiones Seguras (Infiltración vs. Exposición): Intentar exponer puertos de bases de datos al exterior (ej. puerto 3000) genera problemas de timeout. La estrategia más segura es la comunicación interna de Docker. Al instalar Adminer dentro de Coolify, la app visual y la base de datos se comunican por la red interna usando el nombre del contenedor (ej. postgresql-database-...), saltándose completamente la muralla del firewall de CubePath.

Manejo del SSL Local: PostgreSQL suele rechazar conexiones locales si el cliente intenta forzar protocolos SSL (prefer) de manera inesperada. Las herramientas internas dentro de la misma red no requieren SSL (disable).

Proxy y Puertos Internos en Coolify: Cuando se despliegan herramientas de terceros (como Adminer) en Coolify, es vital asegurarse de que el proxy inverso sepa a qué puerto interno apuntar (ej. cambiar el puerto expuesto al 8080 si la imagen de Docker así lo exige) para evitar errores de Bad Gateway.

4. Gestión de Recursos y Prevención de Caídas
Restricción de RAM: El servidor es una instancia gp.micro. Los recursos (RAM y CPU) son limitados y deben ser protegidos celosamente para asegurar que el backend de FastAPI no sufra caídas.

Prohibición de Contenedores Pesados: Queda terminantemente prohibido instalar gestores de base de datos pesados como pgAdmin 4 o el ecosistema completo de Supabase Studio. Estas herramientas consumen demasiada memoria y pueden provocar que el sistema operativo mate procesos vitales (OOM Killer). Adminer fue elegido por ser un único archivo ligero que consume recursos insignificantes.

