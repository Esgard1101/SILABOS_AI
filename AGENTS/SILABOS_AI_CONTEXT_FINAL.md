# SILABOS.AI — Context Prompt FINAL (Vibecoding)
# Estado: Fase 0 COMPLETADA — BD con cursos cargados
# Objetivo: Implementar Fases 1, 2 y 3 (backend + frontend)
# Fecha: Marzo 2026

---

## ESTADO ACTUAL DE LA BD (ya hecho, no tocar)

```
✅ Tabla faculties    → FACHSE insertado
✅ Tabla careers      → Educación insertado
✅ Tabla programs     → 9 programas de FACHSE insertados
✅ Tabla courses      → ~66 cursos por programa con sumilla, competencia_egreso,
                        resultado_aprendizaje, scope, is_common, code, cycle
✅ Tabla teaching_methods → existe (vacía hasta que Dr. Carvas entregue catálogo)
✅ ALTER syllabi      → columnas teaching_method_id, semester agregadas
✅ ALTER document_embeddings → columnas scope, program_id agregadas
```

---

## ARQUITECTURA (no cambiar nada de esto)

```
Frontend  → Vercel (React + TS + Vite)
           URL: https://silabos-frontend.vercel.app
Backend   → Coolify CubePath VPS (FastAPI + Uvicorn en Docker)
DB        → Supabase PostgreSQL + pgvector
Repo      → GitHub Esgard1101/SILABOS_AI (rama: main)
IA        → Gemini gemini-3.1-flash-lite-preview
SDK IA    → google-genai==1.66.0  ← FORZAR SIEMPRE
Embeddings→ gemini-embedding-2-preview (768 dims)
```

---

## REGLAS CRÍTICAS — NUNCA ROMPER

```
1. NO supabase SDK — siempre SQLAlchemy + psycopg2
2. NO sintaxis vieja Gemini — SIEMPRE usar client = genai.Client()
3. NO localStorage — SOLO sessionStorage
4. NO tocar: auth/auth_handler.py, auth/auth_bearer.py,
             services/gemini_service.py, services/rag_service.py
5. CORS: FRONTEND_URL debe apuntar al dominio real en Coolify
6. vercel.json con rewrites es OBLIGATORIO para React Router
7. google-genai==1.66.0 fijo en requirements.txt (docxtpl lo pisa si no)
8. course_id en syllabi es NULLABLE — no agregar NOT NULL constraint
```

---

## CONTEXTO DE SESIÓN — DECISIONES CONFIRMADAS

```
- Pantalla de selección aparece POST-LOGIN (no al crear sílabo)
- Se muestra SOLO si no hay contexto guardado para el ciclo actual
- sessionStorage clave: context_{semestre}  ej: context_2025-I
  → enero-junio = YYYY-I  |  julio-diciembre = YYYY-II
  → Al cerrar tab se borra (comportamiento correcto)
  → Al empezar nuevo ciclo la clave no existe → aparece la pantalla
- Docente elige UN solo programa por sesión
- Botón "Cambiar programa" en dashboard → clearContext → /select-context
- Dashboard filtra sílabos por program_id del contexto activo
- Sumilla y datos del curso: SOLO LECTURA (no editables por docente)
- Método pedagógico: IA sugiere, docente puede cambiar libremente
- Bibliografía: sistema guía al docente con prompts para NotebookLM
- Outputs NotebookLM aceptados: PDF y Markdown (backend normaliza ambos)
- RAG: un solo índice con campo scope (common | program_id)
```
---
# Lecciones Aprendidas: Gestión de Bases de Datos y Entornos (.env)

Esta seccion resume las decisiones técnicas, errores comunes y aprendizajes clave obtenidos durante la configuración de la arquitectura de datos y el manejo de variables de entorno en un entorno híbrido (Local + VPS/Coolify).

## 1. Arquitectura de Conectividad y Redes

### Aislamiento de Red Docker (Internal vs. External)
* **URL Interna:** Los hostnames generados por Docker o Coolify (ej. `e8yrc6n76...`) son solo resolubles dentro de la red privada del VPS. El backend en producción debe usar esta URL para comunicarse con la base de datos a alta velocidad y con máxima seguridad.
* **Limitación Local:** Una máquina Windows local no puede resolver nombres de host internos de Docker. Para conectar el backend local a una DB en el VPS, se requiere usar la **IP Pública** del servidor y el **Puerto Expuesto** configurado en el firewall.
* **Recomendación:** Mantener entornos de base de datos separados (Supabase Cloud para local, PostgreSQL interno para producción) para evitar latencias, problemas de firewall y riesgos de corrupción de datos reales durante pruebas.

## 2. Gestión de Variables de Entorno (`.env`)

### Prioridad de Carga en Python/FastAPI
* **Nombre por Defecto:** La librería `python-dotenv` busca por defecto un archivo llamado exactamente `.env`. Si existen otros como `.env.local` o `.env.production`, el sistema los ignorará a menos que se fuerce su carga.
* **Comando de Carga:** Se puede especificar el archivo de entorno al arrancar Uvicorn mediante el parámetro `--env-file .env.local`.
* **Limpieza de Deuda Técnica:** En migraciones de SDK (ej. de Supabase SDK a SQLAlchemy directo), variables como `SUPABASE_URL` o `SUPABASE_KEY` pasan a ser obsoletas si el código ya no las consume, dejando a `DATABASE_URL` como la única fuente de verdad para la conexión.

## 3. Estrategia de Persistencia: Borrado Lógico (Soft Delete)

### Implementación de `is_archived`
* **Definición:** En lugar de ejecutar `DELETE` físicos que eliminan filas permanentemente, se utiliza una columna booleana `is_archived`.
* **Importancia:**
    1. **Integridad Referencial:** Evita romper registros históricos que dependen de elementos del catálogo que ya no están vigentes.
    2. **Filtrado de Catálogos:** Permite que el backend (y la IA) consulten solo los elementos activos mediante `WHERE is_archived = false`.
    3. **Recuperación:** Facilita la restauración inmediata de registros eliminados por error simplemente cambiando el valor del booleano.

## 4. Protocolo de Operación y Migraciones

### Regla de "Cero Ejecución Automática"
* **Sincronización Manual:** Los cambios en el código del backend que dependen de nuevas columnas (ej. el filtro de `is_archived`) deben ir precedidos por una actualización manual del esquema de la base de datos vía SQL (`ALTER TABLE`).
* **Flujo de Trabajo:**
    1. Probar el script SQL en el entorno de desarrollo local.
    2. Ejecutar manualmente en producción (vía Adminer o similar).
    3. Desplegar el código actualizado del backend.

### Gestión de Semillas (Seeds)
* Los datos maestros o catálogos (métodos, habilidades, etc.) deben centralizarse en un script `seed.sql`. Este script debe aplicarse tanto en la base de datos local como en la de producción para garantizar que el motor de IA y el Wizard operen con la misma lógica en ambos entornos.

---

## FLUJO COMPLETO POST-LOGIN

```
Login exitoso
  └─ ¿sessionStorage tiene context_2025-I?
       ├─ NO → /select-context
       │    Facultad (select) → Escuela (select) → Programa (select)
       │    Semestre (input, pre-llenado auto)
       │    Botón "Ingresar" → guarda contexto → /dashboard
       │
       └─ SÍ → /dashboard
                 Header: "Programa: {program_name} — {semester}"
                 Lista de sílabos filtrada por program_id
                 Botón "Cambiar programa" → clearContext → /select-context
                 Botón "Nuevo sílabo" → /creator (wizard 4 pasos)

/creator — Wizard de 4 pasos:
  Paso 1: Seleccionar curso del programa
          → GET /api/courses?program_id={id}
          → Al seleccionar: muestra CourseCard (solo lectura: sumilla, créditos, ciclo)
  Paso 2: Cargar bibliografía (OPCIONAL)
          → NotebookLMGuide con prompts generados desde la sumilla
          → Sube PDF o MD → POST /api/documents/upload
  Paso 3: Seleccionar método pedagógico
          → IA sugiere basado en sumilla → GET /api/methods/suggest?course_id={id}
          → Docente puede cambiar → GET /api/methods (lista completa)
  Paso 4: Confirmar y generar
          → POST /api/syllabus/generate { course_id, teaching_method_id, semester }
          → Navega a /editor con el sílabo generado
```

---

## FASE 1 — BACKEND

### Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `routers/programs.py` | CREAR |
| `routers/syllabus.py` | MODIFICAR |
| `prompts/syllabus_prompt.py` | MODIFICAR |
| `services/pdf_parser.py` | CREAR |
| `main.py` | MODIFICAR — registrar nuevo router |
| `models/schemas.py` | MODIFICAR — nuevos schemas Pydantic |

### routers/programs.py — CREAR completo

```python
# 4 endpoints nuevos, todos sin auth (catálogo público)

GET /api/programs?career_id={id}
  Response: [{ id, name, coordinator }]

GET /api/courses?program_id={id}
  Query: WHERE program_id = :id OR is_common = true
  ORDER BY cycle ASC, name ASC
  Response: [{ id, name, code, credits, cycle, is_common, scope }]

GET /api/courses/{course_id}
  Response: { id, name, code, credits, cycle, is_common, scope,
              sumilla, competencia_egreso, resultado_aprendizaje }

GET /api/methods
  Response: [{ id, name, code, description }]
  # NO incluir phases ni weekly_template (uso interno del prompt)

GET /api/methods/suggest?course_id={id}
  # Llama a Gemini con la sumilla del curso
  # Prompt: "Dado este curso y su sumilla, ¿cuál de estos métodos
  #          pedagógicos es más adecuado? Responde solo con el id."
  # Devuelve: { method_id, method_name, reason }
```

### routers/syllabus.py — MODIFICAR

```python
# GET /api/syllabus/ — agregar filtro opcional por program_id
@router.get('/')
async def list_syllabi(program_id: str = None, user=Depends(auth)):
    base = "SELECT * FROM syllabi WHERE user_id = :uid"
    if program_id:
        base += """ AND course_id IN (
            SELECT id FROM courses
            WHERE program_id = :pid OR is_common = true
        )"""
    # pasar program_id en params si existe

# POST /api/syllabus/generate — nuevo schema de entrada
class SyllabusGenerateRequest(BaseModel):
    course_id: str           # obligatorio
    teaching_method_id: str  # puede ser "" → IA sugiere
    semester: str            # ej: "2025-I"
    # sumilla, competencias, método → se obtienen de BD con los IDs
    # NO vienen del frontend
```

### prompts/syllabus_prompt.py — MODIFICAR (cambio más crítico)

El router obtiene de la BD antes de llamar al prompt:
- `course` → sumilla, competencia_egreso, resultado_aprendizaje
- `method` → name, phases (JSONB), weekly_template

El prompt recibe todo eso y genera EN ESTE ORDEN ESTRICTO:

```
CONTEXTO DEL CURSO (no generar, solo usar):
Nombre: {course.name}
Sumilla: {course.sumilla}
Competencia de egreso: {course.competencia_egreso}
Resultado de aprendizaje: {course.resultado_aprendizaje}

MÉTODO PEDAGÓGICO SELECCIONADO: {method.name}
Fases del método: {method.phases}
Plantilla semanal: {method.weekly_template}

INSTRUCCIONES DE GENERACIÓN (respetar orden):
1. ANALIZAR sumilla + resultado_aprendizaje → identificar contenidos y habilidades
2. GENERAR desempeños por unidad usando verbos taxonómicos derivados de la sumilla
3. GENERAR programación semanal SIGUIENDO las fases del método en orden.
   La secuencia de actividades DEBE reflejar: {method.phases}
   Semana 1-2: fase 1, Semana 3-4: fase 2, etc.
   NO inventar secuencias distintas al método indicado.
4. GENERAR instrumentos de evaluación alineados a los desempeños del paso 2
5. Respetar el esquema oficial del sílabo (Anexo C UNPRG)
```

### services/pdf_parser.py — CREAR

```python
# Normaliza bibliografía subida por el docente desde NotebookLM
# Input:  archivo (PDF o MD) + metadata {course_id, program_id, scope}
# Output: texto limpio → pasa a rag_service (NO modificar rag_service)

# Lógica:
# if archivo.content_type == 'application/pdf':
#     usar pdfplumber → extraer texto página por página
# elif archivo.content_type in ['text/markdown', 'text/plain']:
#     leer directamente como texto
# → llamar rag_service.index_text(texto, metadata)

# Se invoca desde POST /api/documents/upload (ya existe)
# Solo agregar el parsing ANTES de la llamada a rag_service
```

### main.py — MODIFICAR

```python
# Agregar después de los routers existentes:
from routers import programs
app.include_router(programs.router, prefix="/api", tags=["programs"])
```

---

## FASE 2 — FRONTEND

### Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `hooks/useAppContext.ts` | CREAR |
| `pages/ContextSelector.tsx` | CREAR |
| `components/CourseCard.tsx` | CREAR |
| `components/NotebookLMGuide.tsx` | CREAR |
| `components/MethodSelector.tsx` | CREAR |
| `App.tsx` | MODIFICAR |
| `pages/Dashboard.tsx` | MODIFICAR |
| `pages/SyllabusCreator.tsx` | MODIFICAR (wizard) |
| `hooks/useSyllabus.ts` | MODIFICAR |
| `api/client.ts` | MODIFICAR |

### hooks/useAppContext.ts — CREAR

```typescript
interface ActiveContext {
  faculty_id: string;   faculty_name: string;
  school_id: string;    school_name: string;
  program_id: string;   program_name: string;
  semester: string;     // 'YYYY-I' o 'YYYY-II'
}

function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 'I' : 'II';
  return `${year}-${half}`;
}

const STORAGE_KEY = () => `context_${getCurrentSemester()}`;

export function useAppContext() {
  const getContext = (): ActiveContext | null => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY()) || 'null');
    } catch { return null; }
  };
  const setContext = (ctx: ActiveContext) =>
    sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(ctx));
  const clearContext = () =>
    sessionStorage.removeItem(STORAGE_KEY());

  return {
    context: getContext(),
    setContext,
    clearContext,
    isContextSet: getContext() !== null,
  };
}
```

### App.tsx — MODIFICAR

```tsx
// Guard de contexto — va DESPUÉS del guard de auth existente
function ContextGuard({ children }: { children: React.ReactNode }) {
  const { isContextSet } = useAppContext();
  if (!isContextSet) return <Navigate to="/select-context" replace />;
  return <>{children}</>;
}

// Rutas CON ContextGuard: /dashboard /creator /editor /syllabi /analytics /catalog /review
// Rutas SIN ContextGuard:  /login  /select-context

// Nueva ruta a agregar:
<Route path="/select-context" element={<ContextSelector />} />

// Envolver rutas protegidas existentes con ContextGuard:
<Route path="/dashboard" element={
  <ProtectedRoute><ContextGuard><Dashboard /></ContextGuard></ProtectedRoute>
} />
// ... mismo patrón para el resto de rutas protegidas
```

### pages/ContextSelector.tsx — CREAR

```tsx
// Pantalla post-login, aparece una vez por ciclo académico
// UI: 3 selects en cascada + input de semestre + botón Ingresar

// Estado local:
// selectedFaculty, selectedSchool, selectedProgram, semester

// Llamadas API en cascada:
// - GET /api/institutional/faculties           → carga Select 1 al montar
// - GET /api/institutional/careers?faculty_id  → carga Select 2 al elegir facultad
// - GET /api/programs?career_id                → carga Select 3 al elegir escuela

// Reglas de UI:
// - Select 2 disabled mientras !selectedFaculty
// - Select 3 disabled mientras !selectedSchool
// - Al cambiar Select N superior → resetear los inferiores
// - Input semestre: defaultValue = getCurrentSemester(), editable
// - Botón "Ingresar" disabled mientras no estén los 3 selects completos

// Al hacer submit:
// setContext({ faculty_id, faculty_name, school_id, school_name,
//              program_id, program_name, semester })
// navigate('/dashboard')
```

### pages/Dashboard.tsx — MODIFICAR

```tsx
// Cambios requeridos:

// 1. Mostrar contexto activo en el header o navbar:
//    "Programa: {context.program_name} — {context.semester}"

// 2. Agregar botón "Cambiar programa":
//    onClick → clearContext() → navigate('/select-context')

// 3. Filtrar sílabos por programa activo (ver useSyllabus más abajo)
```

### hooks/useSyllabus.ts — MODIFICAR

```typescript
// Cambio: pasar program_id del contexto al fetch
const { context } = useAppContext();
const url = context?.program_id
  ? `/api/syllabus/?program_id=${context.program_id}`
  : '/api/syllabus/';
```

### pages/SyllabusCreator.tsx — MODIFICAR (wizard 4 pasos)

```tsx
// Paso 1 — Selección de curso
// GET /api/courses?program_id={context.program_id}
// Mostrar lista con nombre, ciclo, créditos
// Al seleccionar: GET /api/courses/{id} → renderizar <CourseCard course={course} />
// CourseCard es SOLO LECTURA: nombre, código, créditos, ciclo, sumilla (truncada),
//   competencia_egreso, resultado_aprendizaje
// Botón "Continuar" disabled hasta que haya curso seleccionado

// Paso 2 — Carga bibliográfica (OPCIONAL)
// Mostrar <NotebookLMGuide courseName={course.name} sumilla={course.sumilla} />
// Input file: acepta .pdf y .md
// onChange → POST /api/documents/upload con FormData
//   body: { file, course_id, program_id: context.program_id, scope: course.scope }
// Botón "Omitir este paso" → avanza sin subir nada

// Paso 3 — Selección de método
// Mostrar <MethodSelector courseId={course.id} />
// MethodSelector:
//   - Al montar: GET /api/methods/suggest?course_id={id} → muestra sugerencia IA
//   - Dropdown con lista completa: GET /api/methods
//   - Muestra nombre + descripción + phases del método seleccionado
//   - Expone selectedMethodId al padre

// Paso 4 — Confirmar y generar
// Resumen: nombre curso | método elegido | semestre
// Botón "Generar sílabo"
// onClick → POST /api/syllabus/generate {
//   course_id: course.id,
//   teaching_method_id: selectedMethodId,
//   semester: context.semester
// }
// Loading state mientras genera (puede tardar 10-20s)
// onSuccess → navigate(`/editor?id=${syllabus.id}`)
```

### components/NotebookLMGuide.tsx — CREAR

```tsx
// Props: courseName: string, sumilla: string
// UI: stepper de 3 pasos visuales (A → B → C)

// Paso A: "Abre NotebookLM (notebooklm.google.com) y crea un nuevo cuaderno"
// Paso B: "Carga tus fuentes: libros, artículos, PDFs del curso"
// Paso C: "Copia y pega este prompt en NotebookLM:"
//   Prompt generado dinámicamente:
//   `Basándote en las fuentes cargadas, genera un resumen estructurado de
//    "${courseName}" que incluya:
//    - Principales autores y obras del área
//    - Conceptos clave relacionados con: ${sumilla.slice(0, 200)}...
//    - Enfoques metodológicos relevantes
//    - Bibliografía recomendada en formato APA
//    Devuelve el resultado en formato Markdown estructurado.`
// Botón "Copiar prompt" → clipboard

// Luego del stepper: área de carga de archivo
// label: "Sube el output de NotebookLM (PDF o Markdown)"
// accept: ".pdf,.md,.txt"
```

---

## ORDEN DE IMPLEMENTACIÓN Y VERIFICACIÓN

| # | Qué implementar | Verificar con |
|---|---|---|
| 1 | `routers/programs.py` completo | `GET /api/programs` devuelve 9 programas |
| 2 | `routers/programs.py` — endpoint courses | `GET /api/courses?program_id={id}` devuelve cursos con sumilla |
| 3 | `main.py` — registrar router | `GET /health` sigue en ok, `/docs` muestra nuevos endpoints |
| 4 | `routers/syllabus.py` — filtro program_id | `GET /api/syllabus/?program_id={id}` filtra correctamente |
| 5 | `models/schemas.py` — SyllabusGenerateRequest | No errores de importación en el backend |
| 6 | `services/pdf_parser.py` | Subir PDF de prueba → aparece en document_embeddings |
| 7 | `prompts/syllabus_prompt.py` | Generar sílabo de prueba → incluye nombre del método y sus fases |
| 8 | Deploy backend (Coolify) | `GET /health` → todos los servicios ok |
| 9 | `hooks/useAppContext.ts` | `sessionStorage.getItem('context_2025-I')` guarda el objeto |
| 10 | `pages/ContextSelector.tsx` | Los 3 selects cargan en cascada sin errores |
| 11 | `App.tsx` — guard de contexto | Ir a `/dashboard` sin login redirige a `/login`; con login pero sin contexto redirige a `/select-context` |
| 12 | `pages/Dashboard.tsx` — filtro + botón | Dashboard muestra solo sílabos del programa activo |
| 13 | `pages/SyllabusCreator.tsx` — wizard | Flujo completo: seleccionar curso → omitir biblio → elegir método → generar → editor |
| 14 | Deploy frontend (Vercel) | Recargar `/select-context` no da 404 |
| 15 | Flujo E2E completo | Login → selector → curso → método → generar → exportar PDF |

---

## ESTRUCTURA DE ARCHIVOS BACKEND (referencia)

```
silabos-backend/
├── main.py                      ← MODIFICAR: registrar router programs
├── models/schemas.py            ← MODIFICAR: SyllabusGenerateRequest
├── routers/
│   ├── programs.py              ← CREAR
│   ├── syllabus.py              ← MODIFICAR: filtro + nuevo schema
│   ├── auth.py                  ← NO TOCAR
│   ├── documents.py             ← mínimo: agregar course_id al upload
│   └── ...
├── prompts/
│   └── syllabus_prompt.py       ← MODIFICAR: taxonomía + fases del método
├── services/
│   ├── pdf_parser.py            ← CREAR
│   ├── gemini_service.py        ← NO TOCAR
│   └── rag_service.py           ← NO TOCAR
└── auth/
    ├── auth_handler.py          ← NO TOCAR
    └── auth_bearer.py           ← NO TOCAR
```

## ESTRUCTURA DE ARCHIVOS FRONTEND (referencia)

```
silabos-frontend/src/
├── App.tsx                      ← MODIFICAR: ContextGuard + nueva ruta
├── hooks/
│   ├── useAppContext.ts         ← CREAR
│   ├── useSyllabus.ts           ← MODIFICAR: filtro por program_id
│   └── ...
├── pages/
│   ├── ContextSelector.tsx      ← CREAR
│   ├── Dashboard.tsx            ← MODIFICAR: header contexto + btn cambiar
│   ├── SyllabusCreator.tsx      ← MODIFICAR: wizard 4 pasos
│   └── ...
└── components/
    ├── CourseCard.tsx           ← CREAR
    ├── NotebookLMGuide.tsx      ← CREAR
    ├── MethodSelector.tsx       ← CREAR
    └── ...
```

---

## VARIABLES DE ENTORNO (sin cambios)

```bash
# Backend Coolify — ya configuradas
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.1-flash-lite-preview
DATABASE_URL=postgresql://...supabase...
FRONTEND_URL=https://silabos-frontend.vercel.app
JWT_SECRET=...

# Frontend Vercel — ya configurada
VITE_API_URL=https://[URL-COOLIFY]
```

---

## NOTAS PARA EL IMPLEMENTADOR

```
1. La tabla courses YA TIENE datos. Los endpoints solo leen, no escriben.
2. El campo is_common=true significa que el curso aparece en TODOS los programas.
   El endpoint GET /api/courses?program_id={id} debe hacer:
   WHERE program_id = :id OR is_common = true
   Esto es crítico — sin esa condición los cursos generales no aparecen.

3. teaching_methods está vacía hasta que llegue el catálogo del Dr. Carvas.
   El wizard Paso 3 debe manejar el caso de tabla vacía sin romper.
   Solución simple: si no hay métodos → mostrar input de texto libre.

4. El endpoint /api/methods/suggest llama a Gemini.
   Si falla → devolver el primer método de la tabla como fallback.
   No bloquear el wizard por un error de IA.

5. Para el deploy: hacer push a GitHub rama main.
   Backend → Coolify redeploya automático.
   Frontend → vercel --prod o push si está conectado.
   Verificar /health antes de probar el flujo completo.
```

---

## IMPLEMENTACIONES COMPLETADAS — POST FASE 0 (Abril 2026)

Esta sección documenta los cambios reales ya desplegados. Todo lo que sigue
está en rama `main` y funcionando en producción.

---

### A. NotebookLMGuide — Rediseño completo

**Archivo:** `silabos-frontend/src/components/NotebookLMGuide.tsx`

El componente fue reescrito completamente. El flujo ya NO es un stepper lineal,
sino **cards expandibles con modales** que muestran imágenes paso a paso.

**Diseño:**
- Cards con gradiente futurista inline:
  `background: linear-gradient(345deg, rgba(63,94,251,1) 0%, rgba(156,82,180,1) 50%, rgba(252,70,107,1) 93%)`
- Card completa es clickeable (`cursor-pointer`) → abre modal con imagen de referencia
- Imágenes en `/public/images/notebooklm_steps/` (`step1.png` … `step7.png`, `step2a.png`…`step2d5.png`)
- Modal con imagen grande (max-w-4xl) + prompt copiable cuando aplica
- Paso 2 tiene **tabs** internos: Tab A (subir archivos) y Tab B (Deep Research agent)

**Props actuales:**
```typescript
interface NotebookLMGuideProps {
  courseName: string;
  sumilla: string;
  metodologias?: string;            // nombre del método pedagógico seleccionado
  onFileSelected?: (file: File) => void;
  uploading?: boolean;
  uploadedBiblio?: { docId: string; fileName: string; refCount: number } | null;
  onRemoveBiblio?: () => void;
  removingBiblio?: boolean;
}
```

**Zona de upload bifurcada:**
- Si `uploadedBiblio` existe: muestra nombre de archivo + conteo de refs + botón "✕ Quitar archivo"
- Si no: uploader normal con nota "Solo un archivo por sílabo"
- Restricción de un único archivo se aplica también en backend (HTTP 409)

---

### B. Pipeline de Bibliografía NotebookLM → Sílabo

Este es el flujo más importante implementado. El objetivo es eliminar las
alucinaciones de Gemini en la sección de bibliografía y usar refs reales.

#### B.1 Nueva tabla: `course_bibliography_refs`

Creada automáticamente en `_ensure_runtime_schema_sync` (NO requiere migración manual):

```sql
CREATE TABLE IF NOT EXISTS course_bibliography_refs (
    id          UUID PRIMARY KEY,
    course_id   VARCHAR NOT NULL,
    doc_id      VARCHAR NOT NULL,
    ref_text    TEXT NOT NULL,
    ref_order   INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Índices en `course_id` y `doc_id`
- Semántica REPLACE: al guardar refs nuevas se eliminan las anteriores del mismo `course_id`

#### B.2 Nuevo servicio: `services/bibliography_parser.py`

Parsea texto extraído de PDF (PyPDF2) o Markdown para encontrar la sección
`REFERENCIAS BIBLIOGRÁFICAS` y devolver una lista limpia de strings APA.

**Problema resuelto:** PyPDF2 extrae PDFs con word-wrap (`\n`) pero SIN líneas
en blanco entre referencias. Las refs van pegadas:
`...Editorial Areces.Cerrada Somolinos, J. A., y Collado...`

**Solución — `_insertar_saltos_entre_refs(texto)`:**
1. **Paso 1**: Colapsar saltos de línea PDF en espacios (de-wrap)
2. **Paso 2a**: `.Apellido [Compuesto], I.` → split (cubre apellidos simples, compuestos y con guión como `García-Bermejo`)
3. **Paso 2b**: `.SIGLA. (año)` → split para instituciones tipo `UNED. (2025)`
4. **Paso 2c**: `dígitos+Apellido, I.` → split post-DOI (`13030113Insuasti, J.`)
5. **Paso 2d**: `.Nombre Propio Multi-Palabra. (año)` → split para `La Salle Campus Barcelona. (2026)`

Funciones exportadas:
```python
parsear_referencias_bibliograficas(texto: str) -> list[str]
detectar_tipo_referencia(ref_text: str) -> 'libro' | 'articulo' | 'video' | 'web'
refs_a_bibliografia_json(refs: list[str]) -> list[dict]  # [{tipo, referencia}]
```

#### B.3 `services/supabase_service.py` — 4 métodos nuevos

```python
await supabase.guardar_referencias_curso(course_id, doc_id, refs)
    # DELETE old refs by course_id, INSERT new ones with ref_order

await supabase.obtener_referencias_curso(course_id) -> list[str]
    # SELECT ref_text ORDER BY ref_order ASC

await supabase.eliminar_referencias_doc(doc_id)
    # Llamado desde eliminar_documento (cascade)

await supabase.obtener_doc_id_refs_curso(course_id) -> str | None
    # Verifica si el curso ya tiene un doc de refs (para bloquear segundo upload)
```

`eliminar_documento` ahora hace cascade: borra refs antes de borrar el doc.

#### B.4 `routers/documents.py` — Upload con parseo automático

El endpoint `POST /api/documents/upload` ahora recibe:
- `course_id` (Form, opcional)
- `doc_type` (Form, opcional — si es `"bibliografia"` activa el parseo)
- `program_id`, `scope`, `name` (Form, opcionales)

Flujo cuando `doc_type == "bibliografia"` y hay `course_id`:
1. Verifica que el curso no tenga ya refs → HTTP 409 si existe (mensaje claro al docente)
2. Extrae texto del PDF/MD
3. Llama `parsear_referencias_bibliograficas(texto)`
4. Guarda en `course_bibliography_refs`
5. Devuelve `ref_count` en el data de respuesta

#### B.5 `routers/syllabus.py` — Merge bibliografía en generación

Helper `_mezclar_bibliografia(silabo, refs_precargadas)`:
- Toma las refs IA de `silabo["bibliografia"]` (generadas por Gemini, ~6-8 items)
- Agrega las refs parseadas del PDF (~10 items), deduplicando por primeros 60 chars
- Resultado: ~16 refs combinadas en el sílabo

**Inyectado en AMBOS endpoints de generación:**
- `/api/syllabus/generate` (v1)
- `/api/syllabus/generate-v2` (wizard — el que usa el frontend)

El docente ve todas las refs en el editor y elige cuáles incluir al exportar DOCX.

#### B.6 `api/client.ts` — método `deleteDocument`

```typescript
deleteDocument: (docId: string) =>
  request<APIResponse>(`/api/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  }),
```

(Se eliminó la versión duplicada que existía antes.)

---

### C. Dashboard — Reemplazo del repositorio RAG inseguro

**Problema:** La pantalla "Base de Conocimiento" usaba el hook `useDocuments`
que llama `GET /api/documents/` → devuelve documentos de TODOS los usuarios
(sin filtro por `user_id`). Vulnerabilidad de privacidad antes del deploy.

**Solución:** Dashboard reescrito completamente como "Panel Principal".

**Archivo:** `silabos-frontend/src/pages/Dashboard.tsx`

Qué se eliminó:
- `useDocuments` hook (y su llamada al endpoint inseguro)
- Grid de documentos compartidos, filtro de tipos, botón "Subir documento"
- Widget "Agentes Activos" (decorativo, sin funcionalidad real)
- Campo de búsqueda

Qué se agregó:
- **Métricas** (3 cards): Total Sílabos / En Progreso / Publicados
  — datos obtenidos de `api.listSyllabiAll()` (sílabos propios del usuario)
- **Sílabos recientes** (grid de 4): muestra los últimos actualizados con
  badge de estado color-coded, nombre del curso y semestre
- Estado vacío con CTA "Crear primer sílabo"
- Header simplificado: solo botón "Nuevo Sílabo"

**NavSidebar:** label `/dashboard` cambiado de `"Base de Conocimiento"` a
`"Panel Principal"`, icono `Folder` → `Home`.

---

### D. Estado de seguridad RAG (pendiente para post-demo)

El endpoint `GET /api/documents/` y la tabla `curriculum_docs` NO tienen
filtro por `user_id`. El componente de UI fue deshabilitado (solución de
presentación), pero el endpoint sigue expuesto.

**Cuando se reactive el RAG:**
1. Agregar columna `user_id UUID` a `curriculum_docs`
2. En `listar_documentos()`: agregar `WHERE user_id = :uid`
3. En `subir_pdf()`: pasar `user_id` al INSERT
4. El chat RAG (`routers/chat.py`) tampoco verifica ownership de `doc_ids`

---

### E. Tabla de estado actual por archivo

| Archivo | Estado | Notas |
|---|---|---|
| `services/bibliography_parser.py` | ✅ Nuevo | Parser APA para PDF+MD |
| `services/supabase_service.py` | ✅ Modificado | Tabla + 4 métodos nuevos |
| `routers/documents.py` | ✅ Modificado | Parseo en upload |
| `routers/syllabus.py` | ✅ Modificado | `_mezclar_bibliografia` en v1+v2 |
| `components/NotebookLMGuide.tsx` | ✅ Reescrito | Cards gradiente + modales |
| `pages/SyllabusCreator.tsx` | ✅ Modificado | Estado `uploadedBiblio`, handlers |
| `pages/Dashboard.tsx` | ✅ Reescrito | Panel métricas, sin RAG |
| `components/NavSidebar.tsx` | ✅ Modificado | Label + icono dashboard |
| `api/client.ts` | ✅ Modificado | `deleteDocument` deduplicado |
| `routers/chat.py` | ⚠️ Sin tocar | RAG chat — stand by, no wired en UI |
| `hooks/useDocuments.ts` | ⚠️ Sin tocar | Solo accesible desde admin/docs |
