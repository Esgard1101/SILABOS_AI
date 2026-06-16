# SPEC-11 — Roadmap NotebookLM: timeline vertical + paso obligatorio

**Sprint:** Junio 2026 · **Tarea:** T11 · **Tipo:** Redesign UX + gate de flujo
**Routing obligatorio:** `AGENTSROUTING/README.md` → `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` → `AGENTSROUTING/03_PROGRESSIVE_UNIT_GENERATION.md` (NotebookLM dicta el "Cómo") → esta SPEC.
**Depende de:** T2 (`GlassModal`). Comparte limpieza con **T10d** (textos dev). Hacer T10d antes o junto.

---

## 🎯 Objetivo

El roadmap NotebookLM actual confunde al público objetivo (docentes 30-49 años, poco técnicos): 6 tarjetas en 2 filas con código de colores y leyenda de desarrollador. Se rediseña a un **timeline vertical de una sola dirección (arriba→abajo)**, con pasos consolidados y progreso marcable. Además, como los motores de generación de unidades dependen de NotebookLM, el **paso de Fuentes se vuelve obligatorio**.

---

## 📐 Decisiones cerradas (no reabrir)

| Tema | Decisión |
|---|---|
| Orientación | **Timeline vertical** (arriba→abajo), se lee como lista numerada. No 2 filas, no horizontal. |
| Nº de pasos | **Consolidar 6 → 5**. "Carga manual" y "Deep Research" se unen en UN paso "Agregar fuentes" con 2 opciones internas. |
| Progreso | Cada paso es **marcable como completado** (check manual). Guía visual de avance. |
| Card 1 / NotebookLM | El click abre el modal; el botón **"Ir a NotebookLM"** vive **dentro** del modal (NO auto-`window.open` al click de la card). |
| Fuentes obligatorio | Gate en el **Step Fuentes**: quitar "Omitir", bloquear "CONTINUAR" hasta ≥1 fuente en la tabla. |
| Textos dev | Se eliminan (leyenda colores, "Placeholder", "se reemplazará al cloud"). Detalle en SPEC-10 T10d; aquí NO deben re-aparecer en el nuevo layout. |
| Videos | Cloudinary `NOTEBOOK_VIDEOS.*` son **finales**. Se muestran sin badge ni framing de placeholder. |

---

## 🗺️ Estructura del nuevo timeline (5 pasos)

Archivo: `silabos-frontend/src/pages/creator/Step2A_NotebookGuide.tsx` (route `/creator/fuentes/notebook`).

| # | Paso | Acción | Contenido del modal |
|---|---|---|---|
| 1 | **Crear cuaderno** | Abre modal | Video `openNotebook` + **botón "Ir a NotebookLM"** (`https://notebooklm.google.com`, `_blank`) + pasos 1-4. |
| 2 | **Agregar fuentes** | Abre modal con 2 opciones | Opción A "Carga manual" (video `manualUpload`) · Opción B "Deep Research con IA" (prompt `deepResearch` copiable). Tabs o dos sub-bloques dentro del mismo modal. |
| 3 | **Verificar fuentes** | Abre modal/imagen | Confirmar que las fuentes cargaron (imagen guía `step3.png`). |
| 4 | **Ajustar chat** | Abre modal | Video `chatSetup` + prompt `chatSetup` copiable. |
| 5 | **Traer fuentes a SIGEISIL** | Abre modal | Video `sourcesExport` + prompt `sourcesExport` copiable + recordatorio de volver a pegar el bloque en el Step Fuentes. |

> Los prompts (`buildChatSetupPrompt`, `buildSourcesExportPrompt`, `buildDeepResearchPrompt`) y los videos ya existen en el archivo: **reusar**, no reescribir.

### Comportamiento del timeline vertical
- Lista de 5 nodos apilados, conector vertical entre ellos (línea + número en círculo).
- Cada nodo: número, título, descripción corta (1 línea), CTA "Abrir guía →".
- **Check de completado:** cada nodo tiene un control para marcarse hecho (círculo→check verde). Al marcarse, el conector hacia el siguiente se "activa" (color cyan). Estado local del componente (no requiere backend).
- Mobile-first: en pantallas chicas se ve como una columna limpia; en desktop puede centrarse con ancho máx legible (~`max-w-2xl`/`3xl`).
- **Eliminar** la leyenda de colores y los 3 chips "Ver instruccion / Sub-flujo detallado / Mini video + prompt" (texto dev, T10d).

---

## 🔘 Card 1 — botón "Ir a NotebookLM" dentro del modal

### Estado actual (a corregir)
`Step2A_NotebookGuide.tsx` ~L563:
```ts
} else if (card.action.type === 'externalPrompt') {
  window.open(card.action.url, '_blank', 'noopener,noreferrer'); // ← auto-abre al click de la card
  setPromptModal(card.action.promptKey);
}
```
El panel derecho del modal de paso 1 hoy solo muestra "Sigue el video y vuelve al paso Fuentes" (ver captura).

### Cambio
1. El click de la card **solo** abre el modal (no `window.open`).
2. Dentro del `PromptVideoModal`, cuando el paso es "abrir NotebookLM", el panel derecho muestra un **botón primario "Ir a NotebookLM"** que hace el `window.open(url, '_blank', 'noopener,noreferrer')`.
3. Quitar del panel/nota los textos "Esta pantalla queda lista para reemplazar la imagen por tu mini video" y "Este video sera reemplazado por tu mini guia de 6 a 8 segundos cuando lo subas al cloud" (T10d).
4. Pasar el `url` al modal (extender props de `PromptVideoModal` con un `externalUrl?` opcional + `externalLabel?`), o manejarlo por el `promptKey === 'openNotebook'`.

---

## 🚧 Step Fuentes obligatorio (gate)

Archivo: `silabos-frontend/src/pages/creator/Step2_Fuentes.tsx`.

### Por qué
Los motores de generación progresiva de unidades usan las fuentes traídas por NotebookLM (ver `03_PROGRESSIVE_UNIT_GENERATION.md`: NotebookLM aporta la didáctica/"Cómo"). Sin fuentes, la generación se empobrece. → el paso deja de ser opcional.

### Cambios
1. **Quitar** el botón "Omitir" (L1150-1156) y el `handleSkip` asociado a saltar sin fuentes (el flujo "Buscar y continuar" de la curaduría IA sí cuenta como traer fuentes).
2. **Bloquear "CONTINUAR"** hasta que `sourceRows.length >= 1` (hay ≥1 fuente NotebookLM o IA en la tabla). Botón `disabled` + estilo deshabilitado + tooltip "Trae al menos una fuente (NotebookLM o IA) para continuar".
3. Mensaje guía cuando la tabla está vacía (ya existe el empty-state): reforzar que el paso es necesario para que la generación funcione bien (soft, no agresivo).
4. **No** romper el resume/autosave: si un draft viejo llegó sin fuentes, el gate aplica igual al re-entrar; no borrar data existente.

> Decisión de sprint: el gate vive **solo** en el Step Fuentes (no doble gate en Step8).

---

## ⚠️ Reglas duras

- Íconos `<img>` propios: sin marco, sin border, sin bg (regla global).
- Reusar `GlassModal` / `PromptVideoModal` y los assets de video/prompt existentes; no librerías nuevas.
- No tocar datos curriculares oficiales ni la shape de `bibliography` en `payload_json`.
- No re-introducir ningún texto dev/placeholder en el layout nuevo.
- El `window.open` de NotebookLM siempre con `noopener,noreferrer`.

---

## ✅ DoD-Técnico
- `npm run build` verde.
- Roadmap se ve como **un** timeline vertical de 5 pasos, sin leyenda de colores ni chips dev.
- Card "Crear cuaderno" NO abre pestaña al click; el botón "Ir a NotebookLM" abre la pestaña desde dentro del modal.
- Step Fuentes: sin "Omitir"; "CONTINUAR" deshabilitado con tabla vacía, habilitado con ≥1 fuente.
- Sin strings "Placeholder" / "se reemplazará al cloud" en pantalla.

## ✅ DoD-Usuario (valida tech lead)
- Un docente no-técnico entiende el roadmap leyéndolo de arriba a abajo, marca pasos como hechos, abre NotebookLM desde el modal, trae fuentes y solo entonces avanza. Nada en pantalla revela que es un prototipo.

## 🔁 Al cerrar (regla recursiva)
Actualizar `AGENTSROUTING/01_WIZARD_OFFICIAL_DATA.md` (y mencionar en `03_PROGRESSIVE_UNIT_GENERATION.md` si aplica) con:
- Step Fuentes es **obligatorio** (gate ≥1 fuente) por dependencia de los motores de unidades.
- Patrón del roadmap = timeline vertical con progreso; botón externo dentro del modal, nunca auto-open al click.
