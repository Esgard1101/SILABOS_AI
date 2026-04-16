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
