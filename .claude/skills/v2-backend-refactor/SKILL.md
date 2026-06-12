---
name: v2-backend-refactor
description: Ejecuta UN lote del plan progresivo de reestructuración del backend FastAPI (silabos-backend) con guardas de seguridad. Usar SOLO cuando V2 esté con luz verde y el usuario pida ejecutar un lote concreto del plan de arquitectura backend. No mueve archivos sin red de tests.
---

# V2 Backend Refactor — Ejecutor de Lote

Reestructuración **progresiva y de bajo riesgo** del backend. Un lote por invocación.

## Precondición OBLIGATORIA

1. Leer `docs/architecture/BACKEND_ARCHITECTURE.md` completo antes de actuar.
2. Confirmar luz verde V2 explícita del usuario.
3. Verificar que el **Lote 0 (red de tests de caracterización)** está hecho: existe `conftest.py`/`pytest.ini`, tests pasan en verde. Si no → ejecutar solo Lote 0 y parar.

Si cualquier precondición falla → NO mover nada. Reportar qué falta y parar.

## Procedimiento por lote

1. Identificar el lote pedido en la sección "Plan progresivo por lotes" del doc. Ejecutar **solo ese lote**.
2. Antes de mover: `git status` limpio o stash. Confirmar tests verdes baseline.
3. Aplicar los movimientos del lote. Por cada archivo movido:
   - Actualizar todos los imports que lo referencian (absolutos, relativos, diferidos).
   - Mantener shims/re-export temporales si el doc lo indica (evitar romper imports externos/tests).
   - No tocar: `main:app` en Dockerfile, rutas en `.env`, paths de migraciones, salvo que el lote lo especifique.
4. Validar:
   - `pytest` (toda la suite) verde.
   - Levantar app: import de `main` sin error (`python -c "import main"` o equivalente).
   - Revisar imports diferidos/inversos de la cascada IA (`gemini_service` ↔ `mistral_service`) si el lote los toca.
5. Si verde → commit con el mensaje sugerido del doc para ese lote.
6. Si rojo → `git revert`/reset al baseline. Reportar causa exacta. NO improvisar arreglos fuera del lote.

## Reglas duras

- **Un lote por invocación.** No encadenar lotes.
- **Nunca mover masivo** sin tests verdes antes y después.
- No partir `supabase_service.py` (god-file con métodos duplicados) salvo en su lote aislado dedicado, con tests de caracterización específicos previos.
- No mover `main.py` salvo lote final explícitamente autorizado (rompe Dockerfile/ciclo).
- Preservar imports diferidos que rompen ciclos — no "limpiarlos" a imports de nivel módulo.
- Code style: igualar el del código circundante.

## Salida

Reportar: lote ejecutado, archivos movidos, imports actualizados, resultado de validación (pegar salida de pytest), commit hash o motivo de rollback, y el siguiente lote sugerido.
