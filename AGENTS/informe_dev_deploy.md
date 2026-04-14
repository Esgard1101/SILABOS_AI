# Informe Interno Developer - Analisis de Deploy y Pasos Pendientes

Fecha: 2026-04-13

## 1. Resumen ejecutivo

El documento original `AGENTS/informetoDEPLOYFINAL` es util como base comercial, pero hoy mezcla una arquitectura propuesta con otra que ya esta implementada en el repo.

La foto mas consistente entre codigo y contexto del proyecto es esta:

- Frontend preview en Vercel.
- Frontend cliente en cPanel mediante build manual.
- Backend en VPS CubePath administrado con Coolify.
- Base de datos activa en Supabase PostgreSQL.
- IA principal en Gemini.
- Fallback de IA en OpenRouter.
- Busqueda web opcional con Google Custom Search.

## 2. Diferencias entre el documento original y el estado real del proyecto

| Tema | Documento original | Estado real del repo/contexto | Impacto |
|---|---|---|---|
| Frontend | cPanel del cliente | Vercel como preview y cPanel como produccion cliente | El informe final debe distinguir preview y produccion |
| Backend | VPS CubePath | VPS CubePath con Coolify | Correcto, mantener |
| Base de datos | Migrar de Supabase a PostgreSQL propio en VPS | Codigo actual usa `DATABASE_URL` apuntando a Supabase PostgreSQL | Decidir si la migracion sigue vigente o no |
| Almacenamiento de documentos | Se sugiere infraestructura propia o externa | El codigo guarda archivos en `silabos-backend/uploads/` | Hay que asegurar persistencia y backup en VPS |
| IA | APIs de Google | Gemini principal y OpenRouter como fallback | Conviene documentar ambas capas internamente |
| Catalogo de metodos | Tabla `teaching_methods` | El router usa catalogo hardcodeado en `institutional_catalog` | No venderlo como 100% dinamico si aun no lo es |
| Bibliografia | Documento habla de PDF/MD en partes del contexto | `routers/documents.py` hoy acepta solo PDF | Si el flujo comercial promete MD, hay desalineacion |

## 3. Costos confirmados y margen interno

### 3.1 VPS / hosting backend

- Costo real estimado: 9.51 USD/mes
  - VPS gp.micro: 8.00 USD/mes
  - IP flotante: 1.51 USD/mes
- Precio cobrado al cliente: 15.00 USD/mes
- Margen bruto estimado: 5.49 USD/mes
- Margen porcentual aproximado: 57%

Lectura interna:

- El precio de 15 USD no debe verse como solo alquiler de maquina.
- Ese margen cubre administracion, despliegue, monitoreo basico, seguridad, soporte e incidencias.

### 3.2 Presupuesto de IA

- Presupuesto comercial actual propuesto al cliente: 12 USD/mes
- Uso real todavia debe medirse en produccion
- Si el consumo inicial es bajo, funciona como colchon para soporte y operacion
- Si sube el consumo, hay que renegociar o separar claramente costo de uso y fee de soporte

## 4. Gastos ya hechos y por que fueron necesarios

### 4.1 VPS primer mes pagado

- Gasto confirmado: 15 USD
- Necesidad:
  - publicar el backend en un entorno real;
  - probar conectividad, SSL, CORS y disponibilidad publica;
  - permitir integracion real entre frontend y backend.

Sin este servicio el sistema habria quedado solo en desarrollo local y no se podria haber validado como producto utilizable.

### 4.2 Base de datos PostgreSQL/Supabase

Aunque el documento original hablaba de migrar a PostgreSQL propio en VPS, el sistema actual depende de una base PostgreSQL accesible por `DATABASE_URL`.

Necesidad:

- guarda usuarios, cursos, programas, silabos y documentos;
- sostiene el flujo multiusuario;
- soporta `document_embeddings` con pgvector para RAG.

Sin base de datos, no hay producto operable.

### 4.3 Gemini

Necesidad:

- generacion de silabos;
- sugerencia de metodos;
- embeddings para flujos RAG.

Sin IA, el sistema pierde su funcionalidad principal y se convierte en un gestor manual.

### 4.4 OpenRouter como fallback

No es el camino principal, pero si es una capa de resiliencia util.

Necesidad:

- mantener continuidad cuando Gemini tenga errores de cuota o conectividad;
- evitar que se caiga por completo la experiencia central del sistema.

### 4.5 Frontend publicado

Necesidad:

- exponer la interfaz del sistema a usuarios reales;
- permitir acceso desde navegador y flujo completo de login a generacion.

Sin frontend publicado no hay operacion cliente, aunque el backend exista.

## 5. Lo que debes hacer ahora para subirlo

### 5.1 Decision de arquitectura que debes cerrar primero

Debes confirmar una de estas dos rutas:

1. Mantener base de datos en Supabase por ahora.
2. Migrar ya a PostgreSQL propio dentro del VPS.

Hoy el repo y el contexto operativo apuntan a Supabase. Si no vas a migrar de inmediato, no conviene prometer en la documentacion que la BD ya vive en el VPS.

### 5.2 Checklist tecnico inmediato

1. Confirmar variables de entorno del backend en Coolify:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
   - `FRONTEND_URL`
   - `JWT_SECRET`
   - `GOOGLE_SEARCH_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`
   - `AI_PROVIDER`
   - `OPENROUTER_API_KEY` si usaras fallback

2. Confirmar variable del frontend:
   - `VITE_API_URL=https://api.innovasaber.com.pe`

3. Verificar que el backend tenga persistencia para `silabos-backend/uploads/`.
   - Hoy los documentos se guardan en disco local.
   - Si el contenedor se recrea sin volumen persistente, puedes perder archivos.

4. Definir respaldo de base de datos y archivos.
   - Backup de PostgreSQL/Supabase
   - Backup de carpeta `uploads/`

5. Validar la plantilla de exportacion.
   - `silabos-backend/templates/anexo_c_template.docx` aun no esta en repo.
   - Sin esa plantilla, el endpoint de exportacion puede devolver error 503.

6. Ejecutar build final del frontend y publicarlo.
   - `npm run build`
   - comprimir el contenido de `dist/`
   - subir ZIP al cPanel del cliente
   - extraer en `public_html` o carpeta asignada
   - dejar `.htaccess` con rewrite para SPA

7. Hacer prueba funcional minima en produccion:
   - login
   - selector de contexto
   - listado de silabos
   - creacion de silabo
   - carga de documento
   - exportacion
   - `GET /health`

### 5.3 Si decides migrar la base de datos al VPS

Ademas del checklist anterior, debes:

1. Exportar dump SQL desde Supabase.
2. Instalar PostgreSQL en el VPS o provisionar servicio administrado.
3. Restaurar esquema y datos.
4. Verificar extensiones necesarias como `pgvector` si el flujo RAG sigue activo.
5. Cambiar `DATABASE_URL`.
6. Reprobar generacion, documentos, dashboard y consultas.

## 6. Hallazgos tecnicos que te conviene corregir o al menos documentar

### 6.1 El README del frontend esta desalineado

`silabos-frontend/README.md` todavia habla de AI Studio y no del deploy real del proyecto. No bloquea el despliegue, pero si genera confusion.

### 6.2 Uploads locales requieren persistencia real

`services/supabase_service.py` indica que los PDFs se guardan en disco local. Si Coolify no monta volumen persistente, ese punto es un riesgo de perdida de archivos.

### 6.3 El flujo de bibliografia no esta alineado al 100%

Hay contexto del proyecto que habla de PDF y Markdown, pero `routers/documents.py` hoy valida solo PDF.

### 6.4 El documento comercial no debe prometer una arquitectura distinta a la actual

Si vas a vender "PostgreSQL en el VPS" pero el sistema sigue en Supabase, dejalo como ruta objetivo o fase siguiente, no como hecho consumado.

## 7. Verificaciones realizadas en esta revision

- `npm run lint` en frontend: OK
- `npm run build` en frontend: OK al reintentarlo fuera del sandbox; se genero `silabos-frontend/dist/`
- Verificacion del backend por Python: no se pudo ejecutar porque en esta sesion no hay `python` ni `py` disponibles en PATH

## 8. Preguntas que debes responder para cerrar la documentacion final

1. La base de datos final se queda en Supabase o la migras ahora al VPS?
2. El cliente usara cPanel como frontend definitivo o solo quieres manejar Vercel?
3. Ademas del VPS, ya pagaste algo mas que quieras recuperar en la cotizacion?
   - dominio
   - hosting extra
   - plan pago de Supabase
   - consumo real de Gemini
   - configuracion de Coolify
