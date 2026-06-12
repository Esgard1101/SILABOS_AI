# PROMPT 1 — Deep Research específico del producto (Silabos.AI / proceso curricular)

> Pega este archivo COMPLETO en Gemini Deep Research como un único mensaje.
> Edita únicamente la cabecera. El cuerpo es autocontenido y no se modifica.

```
=== EDITA SOLO ESTA CABECERA ===
FECHA_INVESTIGACION: {{ej: 2026-05}}
DOMINIO: automatización de proceso curricular universitario (sílabos)
STACK_ACTUAL: FastAPI (Python 3.11) + cascada IA Gemini→OpenAI→OpenRouter/NVIDIA→Mistral; React 19 + Vite 6 + TypeScript; persistencia Supabase/Postgres (pgvector para RAG)
RESTRICCIONES: {{ej: presupuesto bajo; varios proveedores en free tier; Mistral free tier limitado a 1 req/seg; no se puede entrenar/fine-tunear modelos propios; datos académicos institucionales (UNPRG/FACHSE); despliegue en contenedor Docker único que también sirve el frontend estático}}
SENSIBILIDAD_COSTO: alta
=== FIN CABECERA — NO EDITES DEBAJO DE ESTA LÍNEA ===
```

---

## Rol e instrucción al agente

Actúa como **investigador senior de arquitectura de sistemas de IA** especializado
en aplicaciones agénticas de generación de documentos largos y estructurados.
Tu cliente es un desarrollador que mantiene **Silabos.AI**, un sistema en
producción que automatiza la generación de **sílabos universitarios** (documento
curricular académico con propósito, desempeños, contenidos, método didáctico,
producto integrador, programación semanal, evaluación y cierre), mediante un
**asistente progresivo paso a paso** apoyado en LLMs.

Contexto técnico real del sistema (úsalo como base; NO lo investigues, ya es
conocido — investiga lo de afuera para compararlo):

- Backend **FastAPI**. Núcleo de IA en un servicio de enrutamiento con un mapa
  `tarea → configuración` (proveedor, temperatura, tokens, modo JSON).
- **Cascada de resiliencia de proveedores**: para unidades críticas
  `Gemini → OpenAI → (OpenRouter → NVIDIA) → Mistral`; para tareas
  producto/light/audit `(OpenRouter → NVIDIA) → Mistral`. Mistral es el **último
  eslabón** (free tier, ~1 req/seg, un solo intento en serie).
- Recuperación robusta de JSON con reintentos y parser balanceado.
- Generación multi-paso de un documento curricular completo (wizard de ~12
  pasos), con jobs asíncronos y polling desde un frontend React+Vite.
- RAG con pgvector + embeddings para bibliografía/documentos de apoyo.
- Restricción dominante: **costo** (varios proveedores en free/low tier).

Considera "reciente" todo lo publicado/actualizado hasta `FECHA_INVESTIGACION` y
prioriza lo de los últimos ~6 meses respecto a esa fecha. Para todo dato de
precios, límites de tasa o capacidades de modelos, **incluye la fecha de la
fuente** y advierte explícitamente si puede estar desactualizado.

## Fase 1 — Plan de investigación (entrégalo PRIMERO, antes de investigar)

Antes de cualquier síntesis, devuelve un **plan de investigación** numerado que
cubra, como mínimo:

1. Patrones de arquitectura agéntica recientes aplicables a generación multi-paso
   de documentos/currículos largos y estructurados.
2. Comparación de proveedores LLM (costo + límites de tasa + capacidad) frente a
   la cascada actual, incluyendo alternativas más baratas o mejores.
3. Recomendaciones de migración concretas y de bajo riesgo.
4. Fuentes que consultarás (tipo y por qué).

Pausa conceptualmente tras el plan: preséntalo de forma que el usuario pueda
aprobarlo o ajustarlo. Luego procede a la Fase 2.

## Fase 2 — Síntesis (formato de salida EXIGIDO)

Entrega exactamente estas secciones, en este orden, en español:

### A. Patrones de arquitectura agéntica recientes (a `FECHA_INVESTIGACION`)

Patrones aplicables a **generación multi-paso de documentos/currículo**:
orquestación (planner-executor, grafos de estado), enrutamiento de modelos por
tarea, memoria/contexto entre pasos, multi-agente vs agente único con
herramientas, evals y verificación de salida estructurada, manejo de jobs
asíncronos y reintentos. Para cada patrón: en qué consiste, cuándo conviene, y
**cómo encaja o no con la cascada y el wizard actuales de Silabos.AI**
(qué reemplazaría, qué añadiría, qué riesgo introduce).

### B. Comparación de proveedores — tabla de decisión

Tabla obligatoria con columnas:

| Proveedor / modelo | Capacidad relevante (JSON, contexto, calidad doc largo) | Precio (in/out, con fecha de la fuente) | Límite de tasa / free tier | Vs. cascada actual (¿reemplaza/añade/descarta?) | Riesgo de adopción |
|---|---|---|---|---|---|

Incluye al menos los proveedores de la cascada actual
(Gemini, OpenAI, OpenRouter, NVIDIA, Mistral) **y** alternativas más baratas o
mejores no usadas todavía. Cierra con un **veredicto**: ¿la cascada actual sigue
siendo razonable a `FECHA_INVESTIGACION`, o hay un reordenamiento/sustitución
recomendable bajo `SENSIBILIDAD_COSTO: alta`?

### C. Recomendaciones de migración concretas y de bajo riesgo

Lista priorizada (máximo 7). Para cada una: cambio propuesto, beneficio esperado
(costo/calidad/resiliencia), **riesgo y mitigación**, y esfuerzo aproximado.
Distingue claramente "quick win sin riesgo" de "cambio estructural". Respeta
`RESTRICCIONES` y la naturaleza de cascada/fallback existente (no propongas algo
que rompa la resiliencia ni que exija fine-tuning si las restricciones lo impiden).

### D. Fuentes citadas

Lista numerada de TODAS las fuentes con URL y fecha. Marca cuáles son oficiales
(docs/pricing del proveedor) vs secundarias. Señala explícitamente cualquier
dato cuya frescura no puedas garantizar a `FECHA_INVESTIGACION`.

## Requisitos de calidad

- Todo en **español**.
- Cada afirmación de precio/límite/capacidad va **con cita y fecha**.
- Usa tablas donde se piden; no las sustituyas por prosa.
- Sé concreto y accionable: el lector va a tomar decisiones de migración con esto.
- Si algún dato no es verificable a `FECHA_INVESTIGACION`, dilo explícitamente en
  vez de inventarlo.
