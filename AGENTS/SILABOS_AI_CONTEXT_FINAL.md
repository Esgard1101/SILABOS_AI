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
