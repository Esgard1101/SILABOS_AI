# AI Providers, Jobs, DB, And Auth Routing

## Purpose

Guide agents working on AI provider routing, cost/resilience, async jobs, usage logs, Supabase/Postgres persistence, migrations, RLS, and auth/ownership.

This is the operational safety layer of the app.

## When To Read This

Read this before touching:

- `gemini_service.py`
- provider env vars
- OpenRouter/OpenAI/Google/NVIDIA routing
- usage logs
- async `ai_generation_jobs`
- `supabase_service.py`
- migrations
- auth/permissions
- DB schema or RLS

## Key Files

- `silabos-backend/services/gemini_service.py`
- `silabos-backend/services/progressive_ai_service.py`
- `silabos-backend/services/progressive_curriculum_engine.py`
- `silabos-backend/routers/progressive_curriculum.py`
- `silabos-backend/services/supabase_service.py`
- `silabos-backend/auth/permissions.py`
- `silabos-backend/auth/auth_bearer.py`
- `silabos-backend/auth/auth_handler.py`
- `silabos-backend/auth/google_auth.py`
- `silabos-backend/database/migrations_v2.sql`
- `silabos-backend/database/migration_iter1.sql`
- `silabos-backend/database/migration_iter2_progressive.sql`
- `silabos-backend/database/migration_progressive_curriculum_engine_v1.sql`
- `silabos-backend/database/migration_ai_generation_jobs.sql`
- `silabos-backend/tests/test_ai_routing.py`

## Provider Routing Contract

The app routes by task family, not by a global provider switch.

Important tasks:

- `progressive_product_suggest`
- `progressive_unit_context_extract`
- `progressive_unit_generate`
- `progressive_unit_repair`
- `content_engine_generate`
- `progressive_grading_suggest`
- `progressive_methodology_text`
- `syllabus_validate`

Approved hierarchy:

- Unit generation and unit repair: Google -> OpenAI -> OpenRouter/NVIDIA cascade.
- Product, light tasks, context extraction, audit: Google -> OpenRouter/NVIDIA cascade.
- OpenAI is intentionally reserved for critical unit generation/repair unless explicitly expanded.

Use family env vars instead of hardcoding model names:

- `GEMINI_PRODUCT_MODEL`
- `GEMINI_UNIT_MODEL`
- `GEMINI_LIGHT_MODEL`
- `GEMINI_AUDIT_MODEL`
- `OPENAI_UNIT_MODEL`
- `OPENROUTER_PRODUCT_MODELS`
- `OPENROUTER_UNIT_MODELS`
- `OPENROUTER_LIGHT_MODELS`
- `OPENROUTER_AUDIT_MODELS`
- `NVIDIA_PRODUCT_MODELS`
- `NVIDIA_UNIT_MODELS`
- `NVIDIA_LIGHT_MODELS`
- `NVIDIA_AUDIT_MODELS`
- `AI_USAGE_LOG_PATH`

Never print or document API keys.

## Async Jobs Contract

Long-running AI endpoints must return `job_id` and be polled.

Current queued tasks:

- `progressive_product_suggest`
- `progressive_unit_context_extract`
- `progressive_unit_generate`
- `progressive_unit_regenerate`

Job states:

- `pending`
- `running`
- `done`
- `error`

Poll endpoint:

- `GET /api/jobs/{job_id}`

Current implementation uses FastAPI `BackgroundTasks`, which is process-local. For heavy production scaling, a durable worker such as Celery/RQ/queue service can replace the runner without changing frontend polling contract.

## Tables / Persistence

Core:

- `users`
- `syllabi`
- `syllabus_units`
- `syllabus_versions`
- `curriculum_docs`
- `course_bibliography_refs`

Progressive:

- `syllabus_ai_suggestions`
- `curricular_product_options`
- `syllabus_unit_contexts`
- `syllabus_unit_generations`
- `syllabus_week_validations`
- `ai_generation_jobs`

Security/admin:

- `permissions_catalog`
- `role_permission_templates`
- `user_permission_overrides`
- `user_scope_assignments`

## Supabase And DB Rules

Despite the service name, the backend currently uses direct SQLAlchemy + psycopg2 over `DATABASE_URL`, not Supabase SDK.

Before changing DB/auth/RLS:

1. Prefer Supabase MCP if available.
2. Inspect tables/columns/indexes through `information_schema`.
3. Inspect RLS through `pg_policies`.
4. Verify constraints and indexes before changing SQL.
5. If MCP is unavailable, state that and use repo SQL only as an approximation.

Do not assume `auth.uid()` equals the app `users.id`. The app uses custom JWT auth; verify live auth architecture before relying on Supabase Auth policies.

## Approved Decisions

- No synthetic filler fallback content. Use provider cascade. If all providers fail, return a controlled error.
- Do not add a global provider switch. Add task-level routing through `TASK_CONFIGS`.
- Final Step9 methodology and tutoring text are mandatory AI tasks (`progressive_methodology_text`, `progressive_tutoria_text`). Do not fall back to static prose; use provider cascade and fail visibly if exhausted.
- NVIDIA uses OpenAI-compatible API semantics but must not receive OpenAI-only payload fields.
- OpenRouter models may reject native JSON mode; service may retry without `response_format`.
- Usage logs should stay lightweight JSONL/file-based unless a central telemetry system is approved.
- Server writes own job records; frontend never sees provider/model details.

## Known Risks And Anti-Patterns

- Live-looking secrets may exist in local `.env` files. Never copy them into docs.
- Startup schema mutations in `_ensure_runtime_schema_sync` can drift from migrations.
- RLS policies in repo may only cover direct authenticated SELECT and may not reflect backend connection behavior.
- `BackgroundTasks` can leave jobs stuck if the process dies.
- Some endpoints may call draft reads without user filtering; verify before security-sensitive changes.
- `force_provider` in routers is narrower than underlying service capabilities.

## Cross-Module Impact

Provider/DB changes can affect every engine:

- product: read [02_PRODUCT_EVALUATION_HORIZON.md](02_PRODUCT_EVALUATION_HORIZON.md)
- unit generation: read [03_PROGRESSIVE_UNIT_GENERATION.md](03_PROGRESSIVE_UNIT_GENERATION.md)
- coherence: read [04_TRACEABILITY_COHERENCE_EVOLUTION.md](04_TRACEABILITY_COHERENCE_EVOLUTION.md)
- export persistence: read [05_FINAL_ASSEMBLY_EXPORT.md](05_FINAL_ASSEMBLY_EXPORT.md)
- wizard auth/draft ownership: read [01_WIZARD_OFFICIAL_DATA.md](01_WIZARD_OFFICIAL_DATA.md)

## Suggested Verification

- `python -m unittest silabos-backend.tests.test_ai_routing`
- `python -m unittest silabos-backend.tests.test_progressive_curriculum_engine`
- read `logs/ai_usage.jsonl` if `AI_USAGE_LOG_PATH` is configured
- use Supabase MCP or safe SQL to verify job rows and policy behavior
- confirm frontend never exposes provider/model to teachers

## Recursive Update Notes

Update this file when user accepts:

- new provider hierarchy
- new model env var family
- new async job contract
- new DB table/migration
- new auth/RLS rule
- new logging or cost-analysis mechanism
