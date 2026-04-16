# SILABOS.AI - Project Context

Last updated: 2026-03-29
Workspace root: `C:\TEST_CODE\SILABOSAIAUTOMATIZACION\silabos_app`

This document is the operational context for future agents working on SILABOS.AI.
It replaces the old planning-oriented context file with a project-wide reference focused on architecture, deployment, business rules, data sources, and implementation constraints.

Do not store or copy real secrets into this file.
Only document variable names, purposes, and environment behavior.

## Product Summary

SILABOS.AI is a syllabus generation and editing platform for university use in Peru.
It helps docentes generate coherent syllabi aligned with institutional curriculum data stored in the database.

Current major capabilities:
- login and session handling
- context selection by academic program
- dashboard and syllabus listing
- syllabus generation wizard
- syllabus editor and review flow
- catalog browsing for methods, skills, and instruments
- automatic audit/validation of syllabus coherence
- bibliography support and RAG groundwork

## Current Architecture

Current production architecture:
- Frontend preview: Vercel
- Frontend client production: static deployment on client cPanel
- Backend production: FastAPI on personal Coolify-managed VPS
- Database: Supabase PostgreSQL
- Vector store: `document_embeddings` in Supabase with pgvector
- AI provider: Gemini
- AI fallback provider: OpenRouter
- Repository: monorepo with frontend and backend in the same repo

Current canonical public URLs:
- Backend: [api.innovasaber.com.pe](https://api.innovasaber.com.pe)
- Frontend preview: [silabos-frontend.vercel.app](https://silabos-frontend.vercel.app/)
- Frontend client production: [silabos.innovasaber.com.pe/login](https://silabos.innovasaber.com.pe/login)

## Repo Layout

- `silabos-backend/`: FastAPI backend
- `silabos-frontend/`: React + TypeScript + Vite frontend
- `AGENTS/`: project context for future agents

Important backend directories:
- `routers/`
- `services/`
- `prompts/`
- `models/`
- `database/`

Important frontend directories:
- `src/pages/`
- `src/components/`
- `src/api/`
- `src/hooks/`

## Environments

Current environments:
- `local`
- `preview/vercel`
- `produccion-cliente`

There is currently no staging environment.

## Deploy Model

### Preview Frontend

- Deploy target: Vercel
- Branch: `main`
- Vercel root directory: `silabos-frontend`
- Purpose: preview/live frontend deployment connected to GitHub

### Client Production Frontend

- Deploy target: client cPanel
- Deploy type: manual ZIP upload
- Backend consumed by client frontend: same shared backend at `https://api.innovasaber.com.pe`

Exact manual checklist for client production deployment:
1. Ensure local `.env.production` or `.env` contains `VITE_API_URL=https://api.innovasaber.com.pe`
2. Run `npm run build` inside `silabos-frontend`
3. Go to generated `dist/`
4. Compress all contents of `dist/` into a `.zip`
5. Compress the contents, not the parent folder
6. Upload and extract that `.zip` manually into `public_html` or the assigned cPanel folder
7. Because this is a React Router SPA, ensure cPanel has a `.htaccess` that redirects all traffic to `index.html`
8. Without SPA rewrite rules, direct refreshes can produce 404 errors

### Backend Production

- Deploy target: Coolify on owner-managed VPS
- Backend is not currently deployed in the client cPanel
- If backend hosting changes in the future, update this file

## Local Development

Backend local command:

```powershell
venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Frontend local command:

```powershell
npm run dev
```

Current local API behavior:
- frontend local env usually points to `http://localhost:8001`
- backend local runs on port `8001`

## Environment Variables

Do not write real keys in repo docs.
Use placeholders in examples and keep production secrets outside source control.

### Backend Variables

Core backend variables:
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `DATABASE_URL`
- `GOOGLE_SEARCH_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`
- `FRONTEND_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_HOURS`
- `AI_PROVIDER`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_EMBEDDING_DIMENSIONS`
- `GEMINI_MODEL`

Fallback backend variables:
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_AUDIT_MODEL`
- `OPENROUTER_LIGHT_MODEL`
- `OPENROUTER_FALLBACK_MODEL`
- `OPENROUTER_AUDIT_REASONING`
- `OPENROUTER_MODEL`

Notes:
- Treat declared backend env vars as required for the feature they support
- `AI_PROVIDER` is legacy-only; task routing now happens inside `services/gemini_service.py`
- `OPENROUTER_MODEL` is a legacy alias used only when `OPENROUTER_AUDIT_MODEL` is absent
- If a new backend feature requires a new env var, the agent must ask the owner to add it manually in VPS/Coolify environments

### Frontend Variables

Frontend variable used today:
- `VITE_API_URL`

Expected values:
- local: `http://localhost:8001`
- preview/production: `https://api.innovasaber.com.pe`

## Current AI Configuration

Primary AI setup:
- critical provider: Gemini
- critical model: `gemini-3.1-flash-lite-preview`

Fallback AI setup:
- non-critical provider: OpenRouter
- audit model default: `google/gemma-4-26b-a4b-it:free`
- light model: configurable; if unset, reuses the audit model
- optional fallback model: configurable paid/cheap model for retries on 429/timeout

Current policy:
- Gemini is reserved for generation critica del silabo y embeddings
- OpenRouter atiende auditoria, chat documental, sugerencia de metodo y utilidades ligeras
- No se hace fallback automatico de tareas no criticas hacia Gemini

## Database Strategy

Database engine:
- Supabase PostgreSQL

Connection approach:
- always SQLAlchemy + psycopg2
- do not use Supabase SDK for main app logic

Schema migration rule:
- any schema change must first be proposed as raw SQL
- the owner executes schema SQL manually in Supabase SQL Editor
- agents must never attempt to run production DDL directly
- agents should not assume migration automation exists

## Core Business Tables

These are the tables future agents should always understand first.

- `faculties`: university faculty catalog
- `careers`: careers/schools linked to faculties
- `programs`: academic programs linked to careers
- `courses`: course catalog and institutional curriculum source data
- `skills_catalog`: institutional skills catalog used by prompting and catalog UI
- `syllabi`: generated and edited syllabi, stored as `payload_json`
- `users`: authenticated users and current role source
- `curriculum_docs`: uploaded curriculum documents
- `document_embeddings`: vector chunks for RAG/search scope
- `teaching_methods`: DB table for methods, though current product still uses hardcoded institutional method catalogs in parts of the app

## Full Table Inventory

All known tables at the time of writing:
- `bibliography_sources`
- `careers`
- `chat_sessions`
- `courses`
- `curriculum_docs`
- `document_embeddings`
- `faculties`
- `performances`
- `programs`
- `skills_catalog`
- `study_plans`
- `syllabi`
- `syllabus_contents`
- `syllabus_evaluation`
- `syllabus_grading`
- `syllabus_observations`
- `syllabus_units`
- `syllabus_versions`
- `teaching_methods`
- `users`

## Tables and Data That Must Be Treated Carefully

Do not modify structure or production data in these tables without explicit owner approval:
- `faculties`
- `careers`
- `programs`
- `courses`
- `skills_catalog`
- `users`

In practice, treat all production schema changes as owner-approved-only.

## Curriculum Source of Truth

Institutional curriculum data already stored in the DB must be treated as source-of-truth content from the university.
The AI must not freely rewrite or reinterpret these fields when generating the final syllabus.

Source-of-truth curriculum fields include:
- `courses.sumilla`
- `courses.competencia`
- `courses.competencia_egreso`
- `courses.resultado_aprendizaje`
- `courses.capacidad`

General rule:
- if a value comes from institutional DB curriculum data, preserve it
- generation should align to it, not replace it

## Current Product Flows

### Post-Login Context Flow

Confirmed behavior:
- context selection appears after login
- it is shown only when there is no active session context for the current academic cycle
- selected context is stored in `sessionStorage`
- current session key pattern: `context_{semestre}`
- semester naming convention:
  - January to June: `YYYY-I`
  - July to December: `YYYY-II`
- one docente chooses one program per session
- dashboard filters by active context

Storage rule:
- use `sessionStorage`
- do not switch to `localStorage`

### Syllabus Generation Wizard

This UX is considered stable and should not be redesigned without explicit request.

Current step sequence:
1. Curso
2. Bibliografia
3. Metodo
4. Habilidades
5. Calificacion
6. Confirmacion

### Skills Flow

Current behavior:
- docente can select 1 to 3 skill categories
- selection is optional
- backend resolves selected categories against `skills_catalog`
- prompt enrichment currently uses:
  - allowed verbs
  - suggested instruments
  - representative skills with cognitive level and evidence hints

Important interpretation:
- skills are meant to enrich disciplinary learning
- they should be treated as transversal support, not as topic replacement

### Grading Flow

Current grading UX is accepted for now and should be documented as-is.

Current controls:
- checkbox: use AI-suggested grading system
- checkbox: require partial and final exams
- editable grading table when AI grading is disabled

Current editable default examples include products like:
- `Producto Acreditable 1`
- `Producto Acreditable 2`
- `Producto Acreditable 3`

Current business reality:
- many docentes usually work with partial exams and accredited products
- exact institutional rule for counts and combinations still needs client confirmation
- do not redesign this yet unless explicitly requested

Document current state as flexible, not final policy.

### Audit / Validation Flow

The audit agent validates syllabus coherence.
It should not over-penalize transversal skills if the disciplinary content remains intact.

Desired interpretation:
- transversal skills are positive when they help students apply disciplinary knowledge
- lack of `perfil de egreso` should not automatically be treated as strong misalignment
- grading items like participation should only be flagged when truly ambiguous or unmeasurable

## Business Rules

Definition of a correct syllabus:
- coherent with institutional curriculum data
- formally aligned with uploaded and stored university data
- internally coherent across units, achievements, weekly plan, and evaluation

Current evaluation rules:
- exact long-term policy is not fully closed with client yet
- current implementation allows AI suggestion or custom grading
- there is a specific option to require partial and final exams
- future UX may let docentes choose counts of partials/products, but that is not implemented yet

## Authentication, Roles, and Operation

Current real roles:
- `docente`
- `admin`
- `coordinador`

Current intended behavior:
- `docente`: create and work on syllabi
- `coordinador`: review and approve syllabi, broad visibility
- `admin`: full access

Important caveat:
- role permissions are not fully optimized/enforced yet
- registration UI does not exist yet
- user creation is currently handled manually by the owner inserting credentials into the DB

Session/auth notes:
- JWT is used
- current session expiration target is 24 hours
- there is no refresh-token flow documented
- active academic context is stored in `sessionStorage`

## RAG and Retrieval Rules

RAG is currently a partially developed area and should be treated carefully.

Current design intent:
- one index with scope-aware retrieval
- `document_embeddings` contains:
  - `scope`
  - `program_id`
- retrieval should remain limited by academic/program context

Role-sensitive direction:
- role restrictions should also influence access scope in the future
- do not broaden RAG access casually
- if an agent proposes RAG changes, it should explicitly state role and context implications

## Stable UX Areas vs Open Refactor Area

Stable screens:
- Login
- Dashboard
- ContextSelector
- Catalog
- SyllabusCreator

Do not redesign those UX/UI flows without explicit request.

Open to deeper refactor:
- `SyllabusEditor.tsx`

Why:
- it still needs UX improvements
- it needs more teacher interactivity
- inline editing can be improved
- in the future it may be split into cleaner subviews/components

## Sensitive Modules / No-Touch Zones

Unless explicitly required, avoid changing these modules casually:
- `silabos-backend/auth/auth_handler.py`
- `silabos-backend/auth/auth_bearer.py`
- `silabos-backend/services/gemini_service.py`
- `silabos-backend/services/rag_service.py`
- `silabos-backend/services/supabase_service.py`

Note on `supabase_service.py`:
- it is central and often necessary
- touch it carefully and only with clear reason
- any DB access pattern change there can ripple through the whole app

## Frontend and Backend Implementation Notes

Frontend:
- Vercel root is `silabos-frontend`
- React Router requires SPA rewrites
- keep environment switching simple through `VITE_API_URL`

Backend:
- local runs on port `8001`
- production runs behind the public backend domain
- CORS must reflect the real frontend domain in backend config

## Agent Working Rules

Future agents should follow these rules:
- do not expose real API keys, DB URLs, JWT secrets, or provider secrets in docs or commits
- do not run production schema changes
- propose SQL scripts first when schema changes are needed
- ask the owner to execute schema changes manually in Supabase SQL Editor
- preserve institutional curriculum fields from DB
- do not redesign stable UX screens without explicit instruction
- treat transversal skills as support to disciplinary learning, not as disciplinary replacement
- be cautious with `supabase_service.py`, `gemini_service.py`, and `rag_service.py`
- when adding new backend env vars, ask the owner to add them manually in VPS environments

## Legacy Reference

The old file `AGENTS/SILABOS_AI_CONTEXT_FINAL.md` was plan-oriented and phase-oriented.
Keep it as historical reference only.
This `CONTEXT.md` is the current operational source for future agents.
