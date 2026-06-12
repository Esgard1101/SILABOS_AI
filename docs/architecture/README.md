# Arquitectura — Documentación de Estado Actual y Plan V2

Carpeta generada por análisis multi-agente (read-only). Ningún archivo de código fue modificado.
Objetivo: limpieza de arquitectura **progresiva y de bajo riesgo** ejecutada por agentes cuando se dé luz verde a la V2.

## Documentos

| Doc | Alcance | Contenido |
|-----|---------|-----------|
| [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) | `silabos-backend` (FastAPI) | Árbol anotado, mapa de dependencias, modelo de imports, code smells, estructura objetivo, plan de 11 lotes, mapa de riesgos, checklist V2 |
| [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) | `silabos-frontend` (React+Vite+TS) | Árbol anotado, mapa de componentes, modelo de imports/alias, code smells, estructura objetivo, plan de 10 lotes, mapa de riesgos, checklist V2 |

## Por qué mover archivos rompe código (resumen)

Mover un archivo cambia su **ruta de módulo / ruta de string**. Rompe en silencio:

- **Backend**: `from app.services.x import y` falla → `ModuleNotFoundError`. También: imports relativos, ciclo `main ↔ routers`, helpers privados importados por tests, Dockerfile `main:app`, paths de migraciones, `sys.path` duplicado.
- **Frontend**: imports relativos + alias `@`, assets servidos por string path absoluto (mover = 404 en runtime **sin error de build**), `vite.config`, `tsconfig` paths, refs en `index.html`/`index.css`.

Regla de oro: **red de tests primero → lotes chicos → actualizar imports → validar → commit → siguiente lote**. Nunca mover masivo.

## Hallazgos críticos (no tocar sin red de seguridad)

- Backend: `services/supabase_service.py` (5961 ln) con **métodos duplicados** (bug latente / código muerto). Cascada IA frágil en `gemini_service.py` con imports diferidos/inversos que evitan ciclos. Cero tests HTTP de routers.
- Frontend: estado fragmentado en 3 mecanismos (Context + `sessionStorage` + helpers), god components >1000 ln con prompts IA inline, 20 PNG sueltos en `public/` con nombres frágiles, cero tests/ESLint, `tsconfig` sin `strict`.

## Skills para agentes V2

Playbooks ejecutables en [`.claude/skills/`](../../.claude/skills/):

- `v2-backend-refactor` — agente que ejecuta el plan por lotes del backend con guardas de seguridad.
- `v2-frontend-refactor` — ídem para el frontend.

Cada skill obliga: leer el doc de arquitectura → ejecutar **un solo lote** → validar → parar y reportar. No autoriza saltar lotes ni mover masivo.

## Flujo recomendado para V2

1. Luz verde V2.
2. Ejecutar **Lote 0** de cada doc: crear red de tests de caracterización (`conftest.py` backend; ESLint + `tsc --noEmit` baseline frontend). **No avanzar sin esto.**
3. Invocar skill correspondiente por lote, en orden ascendente de riesgo.
4. Un commit por lote con el mensaje sugerido en el doc; `git revert` como rollback.
