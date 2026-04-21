# Silabos.AI — Checklist de Despliegue y Smoke Test

## Pre-requisitos

- [ ] Acceso a Adminer (panel de BD en Coolify)
- [ ] Variables de entorno configuradas en Coolify (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_ID`)
- [ ] Al menos un usuario `admin` existente en la tabla `users`

---

## 1. SQL Manual — Ejecutar en Adminer

Abrir Adminer → base de datos del proyecto → pestaña **"Comando SQL"**  
Pegar y ejecutar el contenido completo de `migration_iter1.sql`.

### Verificación post-SQL

```sql
-- Confirmar tablas creadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Debe incluir:
- `courses_curriculum_history`
- `performances_history`
- `permissions_catalog`
- `role_permission_templates`
- `skills_catalog_history`
- `teaching_method_skill_links`
- `teaching_methods_history`
- `user_permission_overrides`
- `user_scope_assignments`

```sql
-- Confirmar permisos base sembrados
SELECT role, permission_key FROM role_permission_templates ORDER BY role, permission_key;
```

Debe tener 11 filas (6 admin + 3 director + 2 coordinador).

```sql
-- Confirmar columnas de archivado
SELECT column_name FROM information_schema.columns
WHERE table_name = 'performances' AND column_name = 'is_archived';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'teaching_methods' AND column_name = 'is_archived';
```

---

## 2. Deploy de Backend (Coolify)

- [ ] Hacer push/merge a `main`
- [ ] Coolify detecta cambio y reconstruye imagen Docker
- [ ] Verificar que el build termina sin errores
- [ ] Verificar que el contenedor arranca (logs: `Uvicorn running`)

---

## 3. Deploy de Frontend (Coolify / Vite build)

- [ ] Build estático generado sin errores TypeScript
- [ ] Variables `VITE_API_URL` apunta al backend en producción
- [ ] Archivos estáticos publicados correctamente

---

## 4. Smoke Test Post-Deploy

### 4.1 Salud del sistema

```
GET /api/health
```
Esperar `{"api":"ok","supabase":"ok",...}`. Si `gemini` o `openrouter` aparecen como `error`, verificar API keys.

### 4.2 Autenticación

- [ ] Login con email/password devuelve token JWT
- [ ] Login con Google OAuth completa flujo y regresa token
- [ ] Token expirado da 401

### 4.3 Flujo docente — Wizard de sílabo

- [ ] Seleccionar curso → se carga detalle con sumilla
- [ ] Paso 2 (Bibliografía) → subir PDF → aparece `ref_count`
- [ ] Paso 3 (Método) → carga lista de métodos activos (no archivados)
- [ ] Paso 4 (Habilidades) → carga habilidades compatibles con el método seleccionado; badge "Recomendada" visible
- [ ] Cambiar método en paso 3 y volver a paso 4 → aviso de habilidades removidas si las había
- [ ] Paso 5 (Calificación) → total 100% con filas manuales
- [ ] Paso 6 → clic "Generar" → navega a editor con sílabo creado
- [ ] Sílabo generado tiene `status = 'generated'` y `payload_json` no nulo

### 4.4 Admin — Catálogos

- [ ] `/admin/methods` → lista métodos, crear uno, editar, archivar; archivado no aparece en wizard
- [ ] `/admin/skills` → lista skills, paginación, filtro por categoría, crear, editar, archivar
- [ ] `/admin/methods` → expandir método → agregar skill link → aparece en listado
- [ ] `/admin/curriculum` → buscar curso, editar sumilla → guardar → "Ver historial de cambios" muestra entrada

### 4.5 Admin — Usuarios y Permisos

- [ ] `/admin/users` → lista usuarios con roles
- [ ] Cambiar rol de usuario → refleja inmediatamente
- [ ] Agregar scope a usuario → aparece en panel
- [ ] Eliminar scope → desaparece
- [ ] Agregar override `allow` → verificar que usuario obtiene permiso
- [ ] Agregar override `deny` → verificar que usuario pierde permiso aunque lo tenga por rol

### 4.6 Desempeños

- [ ] `/admin/curriculum` → expandir curso → agregar desempeño → aparece con código `D1`
- [ ] Editar desempeño → se guarda
- [ ] Archivar desempeño → desaparece de lista activa
- [ ] Generar sílabo para ese curso → `_meta.performances_origin` = `'db'`
- [ ] Generar sílabo para curso sin desempeños → `_meta.performances_origin` = `'ai_fallback'`

### 4.7 Sílabos legacy

- [ ] Abrir sílabo creado antes de la migración → editor carga sin errores
- [ ] Campos opcionales (`desempenos`, `unidades_tematicas`) presentes o vacíos — no crash

### 4.8 Seguridad por rol

- [ ] Usuario `docente` → endpoints `/api/admin/*` devuelven 403
- [ ] Usuario `coordinador` → puede acceder a curriculum pero no a users/permissions
- [ ] Usuario `director` → puede aprobar sílabos (`syllabus.review`)
- [ ] Token inválido → 401 en todos los endpoints protegidos

---

## 5. Rollback

Si algo falla post-deploy:

1. Revertir imagen en Coolify al tag anterior
2. Las tablas nuevas son aditivas — no requieren rollback de BD salvo error grave
3. Si rollback de BD es necesario: las columnas `is_archived` pueden dejarse sin efecto; las tablas nuevas pueden eliminarse en este orden:

```sql
DROP TABLE IF EXISTS performances_history;
DROP TABLE IF EXISTS courses_curriculum_history;
DROP TABLE IF EXISTS skills_catalog_history;
DROP TABLE IF EXISTS teaching_methods_history;
DROP TABLE IF EXISTS teaching_method_skill_links;
DROP TABLE IF EXISTS user_permission_overrides;
DROP TABLE IF EXISTS role_permission_templates;
DROP TABLE IF EXISTS permissions_catalog;
DROP TABLE IF EXISTS user_scope_assignments;
ALTER TABLE performances DROP COLUMN IF EXISTS is_archived;
ALTER TABLE teaching_methods DROP COLUMN IF EXISTS is_archived;
```

---

## 6. Criterio de Aceptación Final

- [ ] Todos los smoke tests pasan
- [ ] No hay errores 500 en los logs de producción
- [ ] Al menos un sílabo completo generado y visible en el editor
- [ ] El admin puede gestionar catálogos, usuarios y permisos sin acceso a BD

**El sistema está listo para UAT.**
