---
name: v2-frontend-refactor
description: Ejecuta UN lote del plan progresivo de reestructuración del frontend React+Vite+TS (silabos-frontend) con guardas de seguridad. Usar SOLO cuando V2 esté con luz verde y el usuario pida ejecutar un lote concreto del plan de arquitectura frontend. No mueve assets/archivos sin validar build.
---

# V2 Frontend Refactor — Ejecutor de Lote

Reestructuración **progresiva y de bajo riesgo** del frontend. Un lote por invocación.

## Precondición OBLIGATORIA

1. Leer `docs/architecture/FRONTEND_ARCHITECTURE.md` completo antes de actuar.
2. Confirmar luz verde V2 explícita del usuario.
3. Verificar baseline de seguridad (Lote 0): `tsc --noEmit` pasa y `vite build` pasa. Capturar baseline. Si falla → arreglar baseline o parar; no refactorizar sobre build roto.

Si cualquier precondición falla → NO mover nada. Reportar y parar.

## Procedimiento por lote

1. Identificar el lote pedido en "Plan progresivo por lotes" del doc. Ejecutar **solo ese lote**.
2. `git status` limpio o stash. Capturar baseline: `npx tsc --noEmit` y `npm run build` verdes.
3. Aplicar movimientos. Por cada archivo/componente movido:
   - Actualizar imports relativos y alias `@`.
   - Mantener re-export shims si el doc lo indica.
4. **Assets (alto riesgo silencioso):** mover un asset de `public/` NO da error de build, da 404 en runtime. Si el lote toca assets: actualizar TODA referencia string (componentes, `index.css`, `index.html`, `metadata.json`). Preservar la regla: iconos personalizados sin borde/fondo/marco. Grep exhaustivo del nombre de archivo antes de mover.
5. Validar: `npx tsc --noEmit` verde + `npm run build` verde. Si el lote toca assets, además: smoke check de que las rutas referenciadas existen (grep de paths vs archivos reales).
6. Verde → commit con el mensaje sugerido del doc. Rojo → `git revert`/reset, reportar causa.

## Reglas duras

- **Un lote por invocación.** No encadenar.
- **Nunca mover masivo** sin `tsc`+`build` verdes antes y después.
- Mover, **no reescribir**: no refactorizar lógica de god components en el lote de movimiento; eso es un lote separado.
- No tocar el alias `@` ni `vite.config`/`tsconfig` salvo en su lote dedicado.
- Assets: ningún movimiento sin grep previo de todas las referencias string.
- Code style: igualar el del código circundante.

## Salida

Reportar: lote ejecutado, archivos/assets movidos, imports/refs actualizados, salida de `tsc --noEmit` y `build`, commit hash o motivo de rollback, siguiente lote sugerido.
