# Arquitectura del Backend — Silabos.AI

> Documento de estado actual (as-is) preparado para un agente futuro que ejecutará
> una limpieza **conservadora y progresiva** ("V2"). NO refactorizar todavía. Este
> documento describe el sistema tal como está, identifica deuda técnica y propone
> un plan por lotes de bajo riesgo.
>
> Ruta del backend: `c:/TEST_CODE/SILABOSAIAUTOMATIZACION/silabos_app/silabos-backend`
> Fecha de análisis: 2026-05-15. Rama: `main`.

---

## 1. Resumen ejecutivo

Silabos.AI es un backend **FastAPI (Python 3.11)** que automatiza la generación de
sílabos universitarios con IA para la UNPRG/FACHSE. Expone una API REST bajo el
prefijo `/api` y además **sirve el frontend estático** montado en `/`
(`main.py:123-126`, `StaticFiles`).

Flujos principales:

- **Generación de sílabo (clásica y v2):** `routers/syllabus.py` recibe datos de
  curso, llama a `GeminiService.generar_silabo` / `generar_silabo_desde_prompt`
  (`services/gemini_service.py`), valida (`validar_silabo`), persiste vía
  `SupabaseService` y exporta a DOCX/PDF (`services/word_generator.py`).
- **Enrutamiento IA / cascada de resiliencia:** núcleo en
  `services/gemini_service.py`. Cada tarea está mapeada a un `TaskConfig`
  (`TASK_CONFIGS`, líneas 81-232) que define proveedor, temperatura, tokens y
  modo JSON. Cascada por familia de proveedor (ver §3). **Mistral
  (`services/mistral_service.py`) es el último eslabón** de la cascada
  OpenRouter/NVIDIA, invocado en serie por su límite Free Tier de 1 req/seg
  (`gemini_service.py:1405-1448`).
- **Currículo progresivo (wizard v3 y motor curricular v1):**
  `routers/progressive.py` (2600 líneas) y
  `routers/progressive_curriculum.py` (2020 líneas) orquestan un asistente paso
  a paso (propósito, contenido, método, calificación, ensamblado final) apoyado
  en `services/progressive_ai_service.py`,
  `services/content_generation_engine.py` y
  `services/progressive_curriculum_engine.py`.
- **Autenticación:** JWT propio (`auth/auth_handler.py`, `auth/auth_bearer.py`)
  más Google OAuth (`auth/google_auth.py`). Autorización por roles/permisos/scopes
  en `auth/permissions.py`. Login y registro en `routers/auth.py`.
- **Búsqueda bibliográfica y RAG:** `routers/search.py` +
  `services/search_service.py` (Google Custom Search),
  `services/bibliography_service.py` (OpenAlex/SciELO/CrossRef),
  `services/bibliography_parser.py` (normalización APA), `services/rag_service.py`
  (pgvector + embeddings Gemini), chat documental en `routers/chat.py`.

Persistencia: **Supabase/Postgres**. El acceso a datos está centralizado en
`services/supabase_service.py` (un único dios-archivo de **5961 líneas**).
No hay Alembic ni carpeta `migrations/`: las migraciones de esquema viven en
Supabase (MCP), fuera de este repo.

---

## 2. Árbol de carpetas actual (anotado)

Conteos de línea entre paréntesis para los archivos relevantes. `venv/` está
presente en disco pero **no está trackeado por git** (ignóralo en todo el plan).

```
silabos-backend/
├── main.py (189)                  Entrypoint FastAPI: lifespan, CORS, registro de routers,
│                                  health, mount de StaticFiles. Define dict global `servicios`.
├── seed_db.py (134)               Script standalone de seed (SQLAlchemy + bcrypt). load_dotenv() sin ruta.
├── test_login.py (40)             Script suelto de prueba manual de login (NO es test pytest).
├── Dockerfile                     python:3.11-slim, WORKDIR /app, COPY . ., CMD uvicorn main:app
├── requirements.txt               Deps fijadas; comentarios sobre llama-index/docling deshabilitados.
├── .env                           Claves: GEMINI/OPENROUTER/SUPABASE/JWT/GOOGLE/DATABASE_URL...
│
├── auth/
│   ├── auth_bearer.py (23)        JWTBearer(HTTPBearer): valida token en cada request protegido.
│   ├── auth_handler.py (29)       create_access_token / decode_access_token (python-jose).
│   ├── google_auth.py (40)        verify_google_token (google-auth).
│   └── permissions.py (153)       get_current_user_record, require_roles, require_permission,
│                                  require_permission_or_roles, get_user_scopes, check_course_scope.
│
├── database/
│   └── seeders.py (267)           Segundo script de seed (FACHSE piloto). Duplica patrón de seed_db.py.
│
├── models/
│   ├── __init__.py (1)
│   └── schemas.py (424)           ~45 modelos Pydantic (request/response). Mezcla DTOs de todos
│                                  los dominios en un solo archivo.
│
├── prompts/
│   ├── __init__.py (1)
│   ├── method_profiles.py (694)   Perfiles de método didáctico, ANTI_PATTERNS, STYLE_GUIDE.
│   ├── search_prompt.py (110)     Prompts de construcción/filtrado de queries de búsqueda.
│   ├── syllabus_prompt.py (292)   Prompt de generación de sílabo.
│   └── validator_prompt.py (155)  Prompt de validación del sílabo.
│
├── routers/
│   ├── __init__.py (1)
│   ├── admin.py (492)             ~30 endpoints CRUD admin (usuarios, métodos, skills, cursos,
│   │                              currículo, performances). Importa `from main import servicios`.
│   ├── analytics.py (85)          GET /analytics/dashboard (require_roles).
│   ├── auth.py (226)              /auth/login, /auth/google, /auth/register-google, /auth/me.
│   ├── chat.py (162)              /chat/document, /chat/new, /chat/{session_id}.
│   ├── documents.py (256)         /documents/upload, listado, refs bibliográficas, borrado.
│   ├── institutional.py (37)      /institutional/faculties, /careers. Archivo con BOM (﻿).
│   ├── institutional_catalog.py (166)  /methods, /skills, /instruments (catálogo).
│   ├── programs.py (218)          /programs, /courses, /methods, /skills, /skills|methods/suggest.
│   ├── progressive.py (2600)      Wizard progresivo v3. 58 helpers privados → LÓGICA DE NEGOCIO
│   │                              EN EL ROUTER. Endpoints prefill/suggest/assemble-final.
│   ├── progressive_curriculum.py (2020)  Motor curricular v1. 46 helpers privados. Jobs async,
│   │                              generación/regeneración de unidades, ensamblado.
│   ├── search.py (340)            /search/sources, /search/bibliography, /bibliography-guide.
│   │                              7 helpers privados (lógica de negocio en router).
│   └── syllabus.py (1029)         CRUD sílabo + generate/generate-v2/validate/export/workflow.
│
├── services/
│   ├── __init__.py (1)
│   ├── bibliography_parser.py (836)    Normalización/parsing de referencias APA (32 funciones).
│   ├── bibliography_service.py (363)   Búsqueda académica OpenAlex/SciELO/CrossRef + dedupe.
│   ├── content_generation_engine.py (1068)  Motor de contenido didáctico + fallback determinista.
│   ├── gemini_service.py (2045)        NÚCLEO IA: TASK_CONFIGS, cascada de proveedores,
│   │                                   GeminiService, generate_text/generate_json, embeddings.
│   ├── mistral_service.py (145)        call_mistral: último eslabón de la cascada.
│   ├── method_suggestion_rules.py (265)  Reglas deterministas de sugerencia de método.
│   ├── pdf_parser.py (87)              extraer_texto_pdf / markdown / parsear_archivo.
│   ├── progressive_ai_service.py (495)  ProgressiveAIService: prompts del wizard, usa _get_router_service.
│   ├── progressive_curriculum_engine.py (2426)  Motor curricular: generación de unidades/semanas.
│   ├── rag_service.py (258)           Indexado/consulta pgvector + answer_with_context.
│   ├── search_service.py (182)        SearchService: Google Custom Search API.
│   ├── supabase_service.py (5961)     DIOS-ARCHIVO: TODO el acceso a datos (>100 métodos async).
│   └── word_generator.py (1535)       Export DOCX programático + PDF (WeasyPrint).
│
├── static/                        Frontend estático (assets: logos PNG). Montado en "/".
├── templates/                     Plantillas (export).
└── tests/                         12 archivos de test (ver §9). Sin conftest.py ni pytest.ini.
```

Archivos más grandes (riesgo de god-file): `supabase_service.py` (5961),
`progressive.py` (2600), `progressive_curriculum_engine.py` (2426),
`gemini_service.py` (2045), `progressive_curriculum.py` (2020),
`word_generator.py` (1535).

---

## 3. Arquitectura de métodos / capas

### 3.1 Routers → servicios (por router)

| Router | Endpoints (resumen) | Servicios / módulos que llama |
|---|---|---|
| `auth.py` | POST `/auth/login`, `/auth/google`, `/auth/register-google`, `/auth/me` | `auth.auth_handler`, `auth.auth_bearer`, `auth.google_auth`, `main.servicios["supabase"]` |
| `syllabus.py` | `/syllabus/generate`, `/generate-v2`, `/validate`, `/{id}`, `/`, `/draft`, `/{id}` (PUT), `/{id}/export`, workflow (`submit-review`, `approve`, `return-to-teacher`, `publish`, `versions`, `observations`) | `services.word_generator`, `main.servicios` (gemini, supabase) |
| `documents.py` | `/documents/upload`, `/`, `/bibliography/{course_id}/references`, DELETE refs/doc | `services.bibliography_parser`, `main.servicios` (supabase, gemini) |
| `search.py` | `/search/sources`, `/search/bibliography`, `/bibliography-guide` | `services.bibliography_parser`, `main.servicios` (search, gemini) |
| `chat.py` | `/chat/document`, `/chat/new`, `/chat/{session_id}` | `main.servicios` (supabase, gemini) |
| `institutional.py` | `/institutional/faculties`, `/careers` | `main.servicios` (supabase) |
| `institutional_catalog.py` | `/methods`, `/skills`, `/instruments` | `main.servicios` (supabase) |
| `admin.py` | ~30 endpoints CRUD (users/methods/skills/courses/curriculum/performances/scopes/overrides) | `auth.permissions`, `main.servicios` (supabase) |
| `analytics.py` | `/analytics/dashboard` | `auth.permissions`, `main.servicios` (supabase) |
| `programs.py` | `/programs`, `/courses`, `/courses/{id}`, `/methods`, `/skills`, `/skills/suggest`, `/methods/suggest` | `services.method_suggestion_rules`, `main.servicios` (supabase) |
| `progressive.py` | `/syllabi/progressive`, prefill, `steps/{purpose,content,method,grading}/suggest`, `assemble-final`, `submit-academic-validation` | `services.bibliography_parser`, `services.content_generation_engine`, `services.method_suggestion_rules`, `services.progressive_ai_service`, `main.servicios` |
| `progressive_curriculum.py` | `progressive/state`, `products/suggest|select`, `jobs/{id}`, `unit-contexts/{n}/save|extract`, `units/{n}/generate|regenerate|approve`, `weeks/{w}/lock`, `assemble` | `services.bibliography_parser`, `services.progressive_curriculum_engine`, `services.progressive_ai_service`, `main.servicios` |

### 3.2 Servicios — funciones públicas y quién las llama

- `services/gemini_service.py` (núcleo IA):
  - Funciones módulo: `generate_content` (la usa `rag_service.answer_with_context`),
    `generate_embedding` / `generate_query_embedding` (las usa `rag_service`),
    `_get_router_service` (la usan `progressive_ai_service`,
    `content_generation_engine`, `progressive_curriculum_engine` vía import diferido).
  - Clase `GeminiService`: `generate_text`, `generate_json`, `generar_silabo`,
    `generar_silabo_desde_prompt`, `validar_silabo`, `construir_queries_busqueda`,
    `filtrar_resultados_busqueda`, `sugerir_metodo`, `chat_documento`,
    `sugerir_desempenos/contenido/calificacion/instrumentos_por_desempeno`,
    `verificar_conexion[_openrouter|_openai]`. Instanciada en `main.lifespan`
    (`servicios["gemini"]`) y como singleton interno `_router_service`.
- `services/mistral_service.py`: `call_mistral` — llamada SOLO desde
  `GeminiService._call_mistral` (import diferido en línea 1391).
- `services/supabase_service.py`: clase `SupabaseService` con >100 métodos async
  (sílabos, documentos, usuarios, versiones, observaciones, skills, métodos,
  cursos, performances, currículo, progresivo). Consumida por casi todos los
  routers vía `main.servicios["supabase"]`. Importa `bibliography_parser`
  internamente (línea 675).
- `services/search_service.py`: `SearchService` (Google Custom Search).
  Instanciada en `main.lifespan` (`servicios["search"]`).
- `services/bibliography_parser.py`: 32 funciones de normalización APA
  (`parsear_referencias_bibliograficas`, `refs_a_bibliografia_json`,
  `normalize_reference_metadata`, etc.). Usada por `routers/documents`,
  `routers/search`, `routers/progressive*`, `supabase_service`.
- `services/bibliography_service.py`: `search_bibliography`, `resolve_doi`
  (OpenAlex/SciELO/CrossRef). Usada por `routers/search`.
- `services/content_generation_engine.py`: `build_didactic_fallback`,
  clase `ContentGenerationEngine`, factory `get_content_generation_engine`.
  Usada por `routers/progressive`.
- `services/progressive_ai_service.py`: `ProgressiveAIService`, factory
  `get_progressive_ai_service`. Usada por `routers/progressive` y
  `routers/progressive_curriculum`.
- `services/progressive_curriculum_engine.py`: `ProgressiveCurriculumEngine`,
  factory `get_progressive_curriculum_engine`. Usada por
  `routers/progressive_curriculum`.
- `services/word_generator.py`: `generar_docx`, `generar_pdf_html`. Usada por
  `routers/syllabus` (export).
- `services/rag_service.py`: `index_document`, `is_indexed`, `query_documents`,
  `answer_with_context`. Importa `gemini_service` de forma diferida.
- `services/pdf_parser.py`: `parsear_archivo` (extracción de texto).
- `services/method_suggestion_rules.py`: `suggest_method_by_rules`. Usada por
  `routers/programs` y `routers/progressive`.

### 3.3 Mapa de dependencias (quién importa a quién)

```
main.py
  ├─ services.gemini_service.GeminiService   (servicios["gemini"])
  ├─ services.search_service.SearchService   (servicios["search"])
  ├─ services.supabase_service.SupabaseService (servicios["supabase"])
  └─ routers.*  (include_router)

routers.*  ──(from main import servicios)──►  main.py        [CICLO LÓGICO]
routers.*  ──► services.*  (parser, engines, word_generator, rules)
routers.*  ──► auth.permissions / auth_handler / auth_bearer / google_auth
routers.*  ──► models.schemas

auth.permissions ──(from main import servicios)──► main.py    [CICLO LÓGICO]

services.gemini_service ──► models.schemas, prompts.*
services.mistral_service ──► services.gemini_service (AIProviderError/AIResult/TaskConfig)
services.gemini_service ──(diferido)──► services.mistral_service.call_mistral
services.progressive_ai_service ──► services.gemini_service (_get_router_service)
services.content_generation_engine ──► prompts.method_profiles
        └─(diferido en línea 653)──► services.gemini_service._get_router_service
services.progressive_curriculum_engine ──► prompts.method_profiles, gemini_service (diferido)
services.supabase_service ──(diferido línea 675)──► services.bibliography_parser
services.rag_service ──(diferido)──► services.gemini_service (embeddings/generate_content)
```

> **Ciclo lógico clave:** `main.py` importa los routers; los routers (y
> `auth/permissions.py`) hacen `from main import servicios`. Funciona porque la
> mayoría de esos imports están **dentro de funciones** (import diferido) salvo
> `routers/auth.py:8` y `routers/admin.py:13` que lo hacen a nivel de módulo
> (ver §4 y §5). Esto es un acoplamiento global a un `dict` mutable, no inyección
> de dependencias.

### 3.4 Diseño del enrutamiento / cascada IA (PUNTO CRÍTICO)

Toda la lógica vive en `services/gemini_service.py`:

- `TASK_CONFIGS` (líneas 81-232): mapa `task_name → TaskConfig(provider,
  temperature, max_output_tokens, json_mode, reasoning)`. El `provider` es una
  familia: `gemini_unit`, `gemini_light`, `gemini_product`, `openrouter_product`,
  `openrouter_audit`, `openrouter_light`, etc.
- `_run_task` (líneas 1450-1519) — orquestador:
  - `force_provider` admite `gemini|openai|openrouter|mistral`.
  - Si `provider` empieza por `gemini`: llama `_call_gemini`; si falla y la tarea
    está en `OPENAI_FALLBACK_TASKS` (generación/reparación de unidad), reintenta
    OpenAI; luego cae a `_call_openrouter_with_mistral`.
  - Si `provider` empieza por `openrouter`: va directo a
    `_call_openrouter_with_mistral`.
- `_call_openrouter_with_mistral` (1405-1448): ejecuta la cascada
  OpenRouter/NVIDIA (`_call_openrouter` → `_post_openrouter`/`_post_nvidia` con
  listas de modelos resueltas por familia). Si toda la cascada se agota y hay
  `MISTRAL_API_KEY`, hace **un solo intento** a Mistral (último eslabón, en serie
  por límite 1 req/seg Free Tier). Si Mistral también falla, lanza
  `AIProviderError` agregado.
- `generate_json` (1530-1606): hasta `max_retries=3` intentos con sufijo
  `_STIFFENED_JSON_SUFFIX` y alternancia de proveedor; recuperación robusta de
  JSON con `_safe_json_loads`/`_extraer_json` (parser balanceado string-aware).
- Cascada efectiva para unidades críticas:
  `Gemini → OpenAI → (OpenRouter→NVIDIA) → Mistral`.
  Para producto/light/audit: `(OpenRouter→NVIDIA) → Mistral` (Gemini/OpenAI
  reservados a tareas críticas, ver cabecera del archivo líneas 1-6).

Este es el componente más sensible del sistema: cualquier refactor que mueva
`gemini_service.py` o `mistral_service.py` debe preservar el import diferido de
`call_mistral` (línea 1391) y el import de `mistral_service ← gemini_service`
(línea 11 de mistral_service) para evitar import circular.

---

## 4. Modelo de imports

**Estilo:** imports **absolutos sin paquete raíz** (`from services.x import`,
`from routers.x import`, `from auth.x import`, `from models.schemas import`,
`from prompts.x import`). NO hay un paquete `app/`. NO se usa `app.`-style. La
resolución funciona porque el proceso se ejecuta con **CWD = raíz del backend**
(`/app` en Docker, `WORKDIR /app`), y por tanto la raíz está en `sys.path[0]`.

- **No hay `importlib` ni `__import__` dinámico** en el código de aplicación.
- **No hay Alembic ni `migrations/`**: el esquema vive en Supabase (gestionado
  fuera del repo vía MCP). No hay rutas de migración que romper.
- **Referencia string a la app:** `Dockerfile:25` →
  `CMD ["uvicorn", "main:app", ...]`. Mover/renombrar `main.py` o el objeto
  `app` rompe el arranque del contenedor.
- **`.env` resolution:** `main.py:14-16` resuelve
  `BASE_DIR = Path(__file__).resolve().parent` y carga `.env` + `.env.local`
  **relativos a la ubicación de `main.py`**. Mover `main.py` cambia dónde se
  buscan los `.env`. En cambio `seed_db.py:16` y `database/seeders.py:11` usan
  `load_dotenv()` sin ruta (dependen del CWD).
- **`from main import servicios`:** 16 ocurrencias en `routers/*` y
  `auth/permissions.py`. La mayoría son imports diferidos (dentro de función),
  pero **`routers/auth.py:8` y `routers/admin.py:13` son a nivel de módulo** →
  acoplamiento duro a `main.py`. `routers/analytics.py:15` lo hace diferido.
- **Tests:** cada test inserta manualmente la raíz del backend en `sys.path`
  (`BACKEND_ROOT` + `sys.path.insert(0, ...)`) antes de
  `from services...` / `from routers...`. **No hay `conftest.py` ni
  `pytest.ini`/`pyproject.toml`**, por lo que el `sys.path` boilerplate está
  duplicado en los 12 archivos de test. Algunos tests importan helpers privados
  de routers: `tests/test_progressive_step_blocks.py` →
  `from routers.progressive import _build_units_and_schedule`;
  `tests/test_search_bibliography.py` →
  `from routers.search import _build_fallback_references,
  _normalize_bibliography_references`. Renombrar esos privados rompe tests.

**Lugares donde un movimiento de archivo rompe algo (inventario):**

| Elemento | Ubicación | Rompe si… |
|---|---|---|
| `main:app` | `Dockerfile:25` (CMD uvicorn) | se mueve/renombra `main.py` o `app` |
| `WORKDIR /app` + `COPY . .` | `Dockerfile:3,19` | cambia estructura que dependa de CWD raíz |
| `.env`/`.env.local` | `main.py:15-16` (relativo a `main.py`) | se mueve `main.py` a subcarpeta |
| `load_dotenv()` sin ruta | `seed_db.py:16`, `database/seeders.py:11` | cambia el CWD de ejecución |
| `from main import servicios` | `routers/auth.py:8`, `routers/admin.py:13` (módulo); 14 diferidos | se renombra `main.py` o `servicios` |
| `from services.x` / `routers.x` / `auth.x` / `models.schemas` / `prompts.x` | todo el código | se introduce paquete `app/` sin shims/CWD ajustado |
| `from routers.progressive import _build_units_and_schedule` | `tests/test_progressive_step_blocks.py:10` | se mueve `progressive.py` o se renombra el helper |
| `from routers.search import _build_fallback_references, _normalize_bibliography_references` | `tests/test_search_bibliography.py:9` | idem `search.py` |
| `sys.path.insert(0, BACKEND_ROOT)` | los 12 `tests/*.py` | cambia profundidad de carpeta de tests respecto a la raíz |
| Mount `StaticFiles(directory="static")` | `main.py:123` (relativo a `main.py`) | se mueve `static/` o `main.py` |
| Import diferido `from services.mistral_service import call_mistral` | `gemini_service.py:1391` | se renombra `mistral_service`/`call_mistral` |

---

## 5. Code smells / deuda técnica (concreto)

1. **God-file de acceso a datos:** `services/supabase_service.py` — **5961
   líneas**, >100 métodos async que cubren TODOS los dominios (sílabos,
   usuarios, skills, métodos, cursos, currículo, progresivo, chat, versiones).
   Hay además **métodos duplicados con el mismo nombre** sobreescribiéndose:
   `obtener_usuario_por_email` definido en línea 944 **y** 1001;
   `obtener_usuario_por_id` en 961 **y** 1049; `guardar_silabo` en 296 **y**
   1573; `obtener_silabo` en 319 **y** 1683; `listar_silabos` en 341 **y** 1720.
   Python conserva solo la última definición → las primeras son **código muerto**
   o un bug latente.
2. **Lógica de negocio en routers (falta de capa de servicio):**
   `routers/progressive.py` (2600 líneas, **58 helpers privados
   `_func`**), `routers/progressive_curriculum.py` (2020 líneas, **46
   helpers privados**), `routers/search.py` (7 helpers), `routers/syllabus.py`
   (1029 líneas, 7 helpers). El router debería orquestar HTTP, no contener el
   algoritmo. Ej.: `_build_units_and_schedule` en `routers/progressive.py` es
   lógica de dominio importada por tests.
3. **Acoplamiento global vía `from main import servicios`:** 16 sitios. Es un
   service-locator sobre un `dict` mutable global en lugar de inyección de
   dependencias FastAPI (`Depends`). Mezcla import de módulo (auth.py, admin.py)
   con diferido en el resto → inconsistencia y ciclo lógico `main ↔ routers`.
4. **Scripts de seed duplicados:** `seed_db.py` (134) y `database/seeders.py`
   (267) repiten el mismo patrón (SQLAlchemy + bcrypt + `load_dotenv()` sin
   ruta). Uno está en la raíz, otro en `database/`. Naming inconsistente.
5. **`test_login.py` en la raíz** no es un test pytest (script manual), pero su
   nombre `test_*` hará que pytest intente recolectarlo. Debería estar fuera de
   la recolección o en `scripts/`.
6. **`models/schemas.py` monolítico (424 líneas, ~45 modelos)** mezclando DTOs
   de auth, sílabo, búsqueda, chat, admin, progresivo. Sin separación por
   dominio.
7. **Naming inconsistente (español/inglés mezclado):** funciones y métodos
   alternan `generar_silabo`/`generate_text`, `obtener_usuario`/`listar_skills`,
   `parsear_archivo`/`build_didactic_fallback`. Variables globales en español
   (`servicios`). Dificulta búsquedas y consistencia.
8. **BOM en `routers/institutional.py:1`** (`﻿from fastapi import...`) — carácter
   U+FEFF al inicio. Funciona pero es frágil y ensucia diffs.
9. **`requirements.txt` con dependencias comentadas y notas de versión**
   (llama-index, docling) — deuda documentada inline en vez de en docs.
10. **Sin `conftest.py` / `pytest.ini`:** el boilerplate `sys.path.insert`
    está copiado en 12 archivos de test (DRY violado). Sin configuración de
    descubrimiento de tests ni marcadores.
11. **Helpers `_safe_json_loads`/`_extraer_json` en `gemini_service.py`**: lógica
    de parsing JSON robusto mezclada en el archivo de IA; reusable pero atrapada
    en un god-file de 2045 líneas.
12. **`AI_PROVIDER` en `.env`** parece legacy: la decisión real de proveedor la
    toma `TASK_CONFIGS`, no esa variable. Posible config muerta.

---

## 6. Propuesta de reestructuración CONSERVADORA

Objetivo: introducir un paquete `app/` con capas claras **sin romper imports en
producción** ni el contrato HTTP. Migración por lotes con red de tests.

Estructura objetivo propuesta (destino final, NO aplicar de golpe):

```
silabos-backend/
├── main.py                       Mantener en raíz (preserva Dockerfile `main:app`
│                                  y resolución .env). Solo crea app e incluye routers.
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── config.py             Carga .env, settings centralizadas (reemplaza os.getenv disperso)
│   │   ├── lifespan.py           Lifespan + contenedor de servicios (sustituye dict global)
│   │   └── deps.py               Dependencias FastAPI (get_supabase, get_gemini, get_search)
│   ├── api/                      (antes routers/) — SOLO orquestación HTTP
│   │   ├── auth.py
│   │   ├── syllabus.py
│   │   ├── documents.py
│   │   ├── search.py
│   │   ├── chat.py
│   │   ├── institutional.py
│   │   ├── institutional_catalog.py
│   │   ├── admin.py
│   │   ├── analytics.py
│   │   ├── programs.py
│   │   ├── progressive.py
│   │   └── progressive_curriculum.py
│   ├── services/                 Lógica de negocio (extraída de los routers gordos)
│   │   ├── ai/
│   │   │   ├── router_service.py     (gemini_service.GeminiService + cascada)
│   │   │   ├── mistral.py            (mistral_service)
│   │   │   ├── task_configs.py       (TASK_CONFIGS extraído)
│   │   │   └── json_utils.py         (_safe_json_loads/_extraer_json extraído)
│   │   ├── progressive_service.py    (helpers de negocio extraídos de routers/progressive.py)
│   │   ├── curriculum_service.py     (helpers de routers/progressive_curriculum.py)
│   │   ├── content_generation_engine.py
│   │   ├── progressive_curriculum_engine.py
│   │   ├── progressive_ai_service.py
│   │   ├── bibliography_parser.py
│   │   ├── bibliography_service.py
│   │   ├── search_service.py
│   │   ├── word_generator.py
│   │   ├── rag_service.py
│   │   └── pdf_parser.py
│   ├── db/
│   │   └── repositories/         (supabase_service.py partido por dominio)
│   │       ├── client.py             (conexión + helpers comunes)
│   │       ├── syllabus_repo.py
│   │       ├── users_repo.py
│   │       ├── catalog_repo.py       (methods/skills)
│   │       ├── courses_repo.py
│   │       ├── progressive_repo.py
│   │       └── documents_repo.py
│   ├── schemas/                  (models/schemas.py partido por dominio)
│   │   ├── common.py             (APIResponse)
│   │   ├── auth.py  syllabus.py  search.py  chat.py  admin.py  progressive.py
│   ├── auth/                     (auth/* tal cual, solo mover bajo app/)
│   └── prompts/                  (prompts/* tal cual)
├── scripts/
│   ├── seed_db.py                (unificar seed_db.py + database/seeders.py)
│   └── manual_login_check.py     (antes test_login.py — fuera de recolección pytest)
├── tests/
│   ├── conftest.py               (sys.path/fixtures centralizados — elimina boilerplate x12)
│   └── ...
├── Dockerfile                    (sin cambios si main.py permanece en raíz)
└── requirements.txt
```

**Justificación de cada movimiento (riesgo bajo):**

- **`main.py` se queda en la raíz**: evita tocar `Dockerfile` (`main:app`) y la
  resolución `.env` relativa a `main.py`. Máxima reducción de riesgo.
- **`routers/` → `app/api/`**: nombre estándar; solo cambia el prefijo de import
  (`routers.x` → `app.api.x`) que se actualiza mecánicamente.
- **Extraer helpers de `progressive*.py` a `app/services/*_service.py`**: separa
  HTTP de dominio; permite testear lógica sin FastAPI. Hacerlo por función,
  re-exportando desde el router para no romper tests que importan privados.
- **Partir `supabase_service.py` por dominio en `app/db/repositories/`**: el más
  riesgoso → se hace al final, repo por repo, manteniendo `SupabaseService` como
  fachada que delega (compatibilidad hacia atrás).
- **Partir `schemas.py` y `models/`**: bajo riesgo; mantener
  `models/schemas.py` como módulo de re-export temporal.
- **`core/config.py` + `core/deps.py`**: reemplaza `from main import servicios`
  por `Depends(...)` de forma incremental, eliminando el ciclo lógico.
- **Unificar seeds en `scripts/`** y sacar `test_login.py` de la recolección.

---

## 7. Plan progresivo por lotes

Regla de oro: **nunca mover en masa sin red de tests**. Antes del lote 1, ejecutar
y dejar verde la suite actual (ver §9). Comando base de validación:
`python -m pytest tests/ -q` ejecutado con CWD = raíz del backend.

| Lote | Archivos / cambio | Imports a actualizar | Validación | Rollback | Commit sugerido |
|---|---|---|---|---|---|
| **0. Red de seguridad** | Añadir `tests/conftest.py` (centraliza `sys.path`), `pytest.ini` con `testpaths=tests`. NO mover código. Añadir tests de caracterización para la cascada IA y export DOCX. | Ninguno | `pytest tests/ -q` pasa; cobertura de `gemini_service._run_task` y `word_generator.generar_docx` | `git revert` | `chore(tests): add conftest + pytest.ini + caracterización IA` |
| **1. Limpieza inocua** | Quitar BOM de `routers/institutional.py`; sacar `test_login.py`→`scripts/manual_login_check.py`; documentar `AI_PROVIDER` legacy | `pytest.ini` excluye el script ya por testpaths | `pytest -q` igual que lote 0 | revert | `chore: remove BOM, move manual login script` |
| **2. Unificar seeds** | Fusionar `seed_db.py` + `database/seeders.py` → `scripts/seed_db.py` (parametrizable). Dejar shims que importen y avisen DeprecationWarning. | Ninguno (scripts standalone) | Ejecutar seed en DB de prueba | borrar `scripts/`, restaurar originales | `refactor(seed): unify seeders into scripts/seed_db.py` |
| **3. Crear paquete `app/` vacío + core** | `app/__init__.py`, `app/core/config.py`, `app/core/deps.py` (envuelven el `servicios` actual sin eliminarlo aún) | Ninguno (aditivo) | `pytest -q`; arrancar `uvicorn main:app` y `GET /health` | borrar `app/` | `feat(core): introduce app package + settings/deps shims` |
| **4. Mover `prompts/` y `auth/` bajo `app/`** | `prompts/`→`app/prompts/`, `auth/`→`app/auth/` con módulos shim en ubicación vieja que re-exportan | Actualizar imports internos; shims cubren externos | `pytest -q`; `GET /health`, login | revert + restaurar dirs | `refactor(imports): relocate prompts/auth under app with shims` |
| **5. Mover `models/schemas.py`** | `app/schemas/` por dominio; `models/schemas.py` re-exporta todo | imports en routers/services se mantienen vía shim | `pytest -q`; smoke de endpoints `/syllabus`, `/auth` | revert | `refactor(schemas): split schemas by domain (shim kept)` |
| **6. Mover `routers/`→`app/api/`** | Mover routers uno por uno; `main.py` actualiza include; shim en `routers/` re-exporta para tests que importan privados | `main.py`, tests que importan `routers.progressive._build_units_and_schedule` y `routers.search._*` | `pytest -q` (incluye esos tests); smoke de cada router | revert por archivo | `refactor(api): move routers to app/api (per-file, shims kept)` |
| **7. Extraer lógica de negocio de routers gordos** | Por función: mover `_helpers` de `progressive.py`/`progressive_curriculum.py`/`search.py` a `app/services/*_service.py`; el router importa desde el service; mantener re-export para tests | tests de helpers privados | `pytest -q` tras CADA función movida | revert por función | `refactor(progressive): extract _build_units_and_schedule to service` (uno por commit) |
| **8. Reemplazar `from main import servicios` por `Depends`** | Migrar router por router a `app/core/deps.py`; empezar por los de import a nivel de módulo (`auth.py`, `admin.py`) | cada router migrado | `pytest -q`; smoke auth/admin | revert por router | `refactor(di): replace global servicios with Depends in auth router` |
| **9. Partir `supabase_service.py`** | Crear `app/db/repositories/*`; `SupabaseService` pasa a fachada que delega. Mover dominio por dominio (empezar por el más aislado: documents). **Resolver los métodos duplicados (944/1001, 296/1573, etc.) confirmando cuál es el vigente.** | imports vía fachada (sin cambios externos) | `pytest -q` + smoke por dominio migrado | revert por dominio | `refactor(db): extract documents repo from supabase_service` |
| **10. Mover `main.py` (OPCIONAL, mayor riesgo)** | Solo si se decide; requiere tocar `Dockerfile` (`main:app`), `.env` paths, mounts. Recomendación: **NO mover**; dejar `main.py` en raíz. | Dockerfile, mounts, dotenv | full e2e + build de imagen Docker | revert completo | (no recomendado) |

Cada lote: rama propia, PR, CI verde antes del siguiente. Nunca combinar lote 9
con otro.

---

## 8. Mapa de riesgos

| Cambio | Riesgo | Probabilidad | Mitigación | Cómo detectar la rotura |
|---|---|---|---|---|
| Mover `main.py` de la raíz | Falla arranque Docker (`main:app`), `.env` no se carga, `static/` no monta | Alta | No mover `main.py` (lote 10 opcional) | `docker build` + `GET /health` y `GET /` |
| Renombrar `servicios` o `main` | ImportError en 16 sitios (2 a nivel módulo) | Alta | Shim que re-exporta; migrar a `Depends` antes | `pytest -q`; arranque uvicorn falla en import |
| Mover `gemini_service.py`/`mistral_service.py` | Import circular (mistral↔gemini) o pérdida de cascada Mistral | Alta | Preservar import diferido `gemini_service.py:1391`; tests de caracterización de `_run_task` | `tests/test_ai_routing.py`, `tests/test_mistral_service.py` |
| Renombrar helpers privados de routers | Rompe `tests/test_progressive_step_blocks.py`, `tests/test_search_bibliography.py` | Media | Re-export desde el router; mover función antes de renombrar | esos 2 tests fallan |
| Partir `supabase_service.py` | Cambiar accidentalmente cuál de los métodos duplicados queda vigente → bug silencioso de datos | Media-Alta | Diff de comportamiento; fijar primero cuál duplicado es el real (944 vs 1001, 296 vs 1573, 319 vs 1683, 341 vs 1720, 961 vs 1049) con tests | Tests de repos + smoke de login/sílabo |
| Mover `prompts/` | Cambia salida de IA si se altera contenido | Baja (solo mover, no editar) | Solo `git mv`, sin editar contenido | snapshot de prompts en test |
| Introducir paquete `app/` sin ajustar CWD | ModuleNotFoundError masivo | Media | Shims + ejecutar siempre con CWD raíz; `conftest.py` ajusta path | `pytest -q` falla en colección |
| Quitar BOM de `institutional.py` | Ninguno funcional | Baja | git diff revisado | `pytest -q` |
| Cambiar `.env`/dotenv paths | Servicios IA/DB sin credenciales (arrancan en `None`) | Media | Mantener `main.py` en raíz; logs de lifespan | logs `Error al inicializar ... Service`; `/health` degradado |

---

## 9. Estado de tests

Directorio `tests/` con **12 archivos** (sin `conftest.py`, sin `pytest.ini`,
sin `tests/__init__.py`). Estilo: scripts con aserciones / funciones `test_*`
(p.ej. `test_progressive_evals.py` ~35 asserts; `test_ai_routing.py` ~17;
`test_mistral_service.py` ~10). Cada archivo duplica el bloque
`sys.path.insert(0, BACKEND_ROOT)`.

Cobertura existente (por módulo):

- IA / cascada: `test_ai_routing.py`, `test_mistral_service.py`,
  `test_progressive_ai_routing.py` → cubren routing y Mistral fallback.
- Bibliografía: `test_bibliography_parser.py`, `test_bibliography_service.py`,
  `test_search_bibliography.py`.
- Motores progresivos: `test_content_generation_engine.py`,
  `test_progressive_curriculum_engine.py`, `test_progressive_evals.py`,
  `test_progressive_step_blocks.py`.
- Reglas/export: `test_method_suggestion_rules.py`,
  `test_word_generator_dates.py`.

**Gaps (sin cobertura):**

- `routers/*` — **ningún test de endpoint HTTP** (no hay TestClient). Workflow de
  sílabo (`approve`/`publish`/`return-to-teacher`) sin cobertura.
- `services/supabase_service.py` — sin tests (es el más grande y el más
  riesgoso de partir). Métodos duplicados sin test que fije el comportamiento.
- `auth/*` — sin tests de `permissions`, `auth_handler`, `google_auth`.
- `services/word_generator.generar_docx`/`generar_pdf_html` — solo fechas
  (`test_word_generator_dates.py`), no la generación completa.
- `main.py` lifespan / `/health` — sin test.

**Tests que DEBEN existir antes de refactorizar (red mínima, lote 0):**

1. **Caracterización de `gemini_service._run_task`/`generate_json`**: con mocks
   de proveedores, verificar el orden de cascada
   Gemini→OpenAI→OpenRouter→Mistral y el comportamiento de `force_provider`.
2. **Smoke HTTP con `fastapi.testclient.TestClient`**: `GET /health`, `GET /`,
   y al menos un endpoint por router crítico (`/api/auth/login`,
   `/api/syllabus/`, `/api/programs`).
3. **Fijación de métodos duplicados de `SupabaseService`**: test que afirme
   cuál implementación de `obtener_usuario_por_email` /
   `obtener_usuario_por_id` / `guardar_silabo` / `obtener_silabo` /
   `listar_silabos` es la vigente (la última definida) — para no cambiarla al
   partir el archivo.
4. **Snapshot de `word_generator.generar_docx`** con un sílabo de muestra
   (hash/estructura) para detectar regresiones de export.
5. **`conftest.py`** que centralice el `sys.path` y elimine el boilerplate x12.

---

## 10. Checklist accionable para el agente V2

Ejecutar en orden. No avanzar de paso sin cumplir el criterio de aceptación.
Siempre CWD = raíz del backend.

1. **Baseline.** Ejecutar `python -m pytest tests/ -q`.
   _Aceptación:_ se documenta el resultado actual (verde o lista de fallos
   preexistentes). NO tocar código aún.
2. **Lote 0 — Red de seguridad.** Crear `tests/conftest.py` (sys.path + fixtures),
   `pytest.ini` (`testpaths = tests`), y los 5 tests de §9.
   _Aceptación:_ `pytest -q` verde incluyendo los nuevos; boilerplate
   `sys.path.insert` eliminado de los 12 archivos.
3. **Lote 1 — Limpieza inocua.** Quitar BOM de `routers/institutional.py`;
   mover `test_login.py`→`scripts/manual_login_check.py`.
   _Aceptación:_ `pytest -q` verde; `uvicorn main:app` arranca; `GET /health` 200.
4. **Lote 2 — Unificar seeds.** `seed_db.py` + `database/seeders.py` →
   `scripts/seed_db.py` con shims DeprecationWarning.
   _Aceptación:_ seed corre en DB de prueba sin error; `pytest -q` verde.
5. **Lote 3 — Paquete `app/` + core.** Crear `app/`, `app/core/config.py`,
   `app/core/deps.py` (aditivo, sin eliminar `servicios`).
   _Aceptación:_ `pytest -q` verde; `GET /health` y `/` OK.
6. **Lote 4-5 — Mover `prompts/`, `auth/`, `models/schemas.py` con shims.**
   `git mv` + shims de re-export en ubicación antigua.
   _Aceptación:_ `pytest -q` verde; login y `/syllabus` smoke OK; ningún import
   externo roto.
7. **Lote 6 — `routers/`→`app/api/` por archivo.** Mover de a uno; mantener
   shim en `routers/` para tests que importan helpers privados.
   _Aceptación:_ tras cada archivo, `pytest -q` verde (incl.
   `test_progressive_step_blocks.py`, `test_search_bibliography.py`) y smoke del
   router movido.
8. **Lote 7 — Extraer lógica de negocio.** Por función, mover `_helpers` de
   `progressive.py`/`progressive_curriculum.py`/`search.py` a
   `app/services/*_service.py`; un commit por función; router re-exporta.
   _Aceptación:_ `pytest -q` verde tras CADA función; sin cambio de contrato HTTP.
9. **Lote 8 — DI.** Reemplazar `from main import servicios` por `Depends` router
   por router, empezando por `auth.py` y `admin.py` (imports a nivel de módulo).
   _Aceptación:_ `pytest -q` verde; smoke auth/admin; ya no quedan imports
   `from main import servicios` a nivel de módulo.
10. **Lote 9 — Partir `supabase_service.py`.** Primero confirmar con tests cuál
    de cada par de métodos duplicados es el vigente; luego extraer
    `app/db/repositories/*` dominio por dominio (empezar por documents),
    `SupabaseService` queda como fachada delegadora.
    _Aceptación:_ `pytest -q` verde + smoke por dominio migrado; comportamiento
    de los métodos duplicados sin cambios; `supabase_service.py` reducido sin
    pérdida funcional.
11. **Cierre.** `docker build` + `GET /health`/`/` + suite completa.
    _Aceptación:_ imagen construye, contenedor arranca, todos los tests verdes.
    **No** ejecutar el lote 10 (mover `main.py`) salvo green-light explícito.

> Recordatorio permanente para V2: cada lote en su propia rama/PR con CI verde;
> nunca mover en masa sin la red de tests del lote 0; el lote 9
> (`supabase_service.py`) jamás se combina con otro lote.
