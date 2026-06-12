# PROMPT 2 — Plantilla genérica de Deep Research (cualquier proceso de negocio)

> Plantilla reutilizable para CUALQUIER contrato/proyecto futuro de automatización
> de procesos de negocio con IA. Todo lo específico de proyecto es una
> `{{VARIABLE}}`. Pega el archivo COMPLETO en Gemini Deep Research.
>
> **Cómo reutilizar cada 2 meses:** edita SOLO la cabecera de variables. El cuerpo
> del prompt nunca cambia — esa es la razón de que esta plantilla sea reusable.

```
=== EDITA SOLO ESTA CABECERA ===
FECHA_INVESTIGACION: {{ej: 2026-05}}
DOMINIO: {{ej: legal / salud / educación / logística / finanzas}}
PROCESO: {{describe el proceso de negocio a automatizar, en 2-4 frases concretas: entradas, pasos, salidas, quién lo hace hoy}}
CLIENTE: {{tipo de cliente / sector / tamaño; o N/A}}
RESTRICCIONES: {{ej: presupuesto bajo; sin fine-tuning; datos sensibles/PII; on-prem o nube X; latencia máxima; idioma}}
SENSIBILIDAD_COSTO: {{alta / media / baja — por defecto: alta}}
STACK_ACTUAL: {{ej: FastAPI + Postgres + React; o "greenfield, sin stack aún"}}
OBJETIVO_NEGOCIO: {{el resultado de negocio medible que se busca: ej. reducir tiempo de elaboración de X de 5h a 30min con calidad equivalente}}
=== FIN CABECERA — NO EDITES DEBAJO DE ESTA LÍNEA ===
```

---

## Rol e instrucción al agente

Actúa como **investigador senior y arquitecto de soluciones de IA aplicada a
automatización de procesos de negocio**. Tu cliente es un desarrollador que
construye soluciones de automatización con IA para distintos contratos. Quiere,
para el `PROCESO` y `DOMINIO` indicados en la cabecera, una investigación
**reciente a `FECHA_INVESTIGACION`** que le permita decidir arquitectura y
proveedores con **costo como principal limitante**.

Considera "reciente" lo publicado/actualizado hasta `FECHA_INVESTIGACION`,
priorizando los últimos ~6 meses respecto a esa fecha. Para precios, límites de
tasa y capacidades de modelos, **cita la fuente con su fecha** y advierte si
puede estar desactualizado a `FECHA_INVESTIGACION`.

Trata absolutamente todo lo específico como variable: razona a partir de
`PROCESO`, `DOMINIO`, `CLIENTE`, `RESTRICCIONES`, `SENSIBILIDAD_COSTO`,
`STACK_ACTUAL` y `OBJETIVO_NEGOCIO`. No asumas un dominio concreto fuera de lo que
diga la cabecera.

## Fase 1 — Plan de investigación (entrégalo PRIMERO)

Devuelve un plan numerado, para aprobación previa, que cubra:

1. Mapeo del `PROCESO` descrito a arquitecturas agénticas candidatas.
2. Patrones de buenas prácticas agénticas recientes a `FECHA_INVESTIGACION`.
3. Panorama de proveedores (costo/capacidad) con foco en opciones más baratas o
   mejores.
4. Riesgos y plan de adopción por fases.
5. Fuentes a consultar y por qué.

## Fase 2 — Síntesis (formato de salida EXIGIDO)

En español, exactamente estas secciones y en este orden:

### A. Mapeo PROCESO → arquitecturas agénticas candidatas

Descompón el `PROCESO` en pasos/subprocesos. Para cada uno, propón 1-3
arquitecturas agénticas candidatas (agente único con herramientas,
planner-executor, grafo de estados, multi-agente, pipeline RAG, humano-en-el-bucle,
etc.), indicando idoneidad respecto a `OBJETIVO_NEGOCIO`, `RESTRICCIONES` y
`STACK_ACTUAL`. Tabla resumen:

| Subproceso | Arquitectura candidata | Por qué encaja | Encaje con STACK_ACTUAL | Riesgo |
|---|---|---|---|---|

### B. Patrones de buenas prácticas agénticas recientes (a `FECHA_INVESTIGACION`)

Cubre: orquestación, enrutamiento de modelos por tarea/costo, memoria y manejo de
contexto, multi-agente vs agente único, y **evals/verificación** de salidas. Para
cada patrón: qué es, cuándo aplica al `PROCESO`, y trade-offs. Cita fuentes
recientes.

### C. Panorama de proveedores — opciones más baratas o mejores (énfasis en costo)

**El costo es el mayor limitante del cliente: enfatízalo.** Tabla obligatoria:

| Proveedor / modelo | Capacidad relevante al PROCESO | Precio (in/out, con fecha) | Límite de tasa / free tier | ¿Más barato/mejor que la opción obvia? | Riesgo |
|---|---|---|---|---|---|

Incluye opciones de bajo costo (free tiers, modelos abiertos vía routers,
modelos pequeños suficientes para subprocesos simples) y una recomendación de
**cascada/enrutamiento por costo** acorde a `SENSIBILIDAD_COSTO`. Indica dónde un
modelo más barato basta y dónde se justifica uno premium.

### D. Riesgos y adopción por fases

Lista de riesgos (técnico, costo, calidad, cumplimiento/datos según
`RESTRICCIONES`) con mitigación. Luego un **plan de adopción por fases** (fase 0
red de seguridad/evals → fase 1 quick wins → fase N cambios estructurales), cada
fase con criterio de éxito medible ligado a `OBJETIVO_NEGOCIO`.

### E. Fuentes citadas

Lista numerada con URL y fecha; marca oficiales vs secundarias; señala datos no
verificables a `FECHA_INVESTIGACION`.

## Requisitos de calidad

- Todo en **español**.
- Todo precio/límite/capacidad **con cita y fecha**.
- Usa las tablas pedidas; nada de sustituirlas por prosa.
- Cada recomendación debe ser accionable y respetar `RESTRICCIONES`.
- Si un dato no es verificable a `FECHA_INVESTIGACION`, decláralo; no inventes.

---

> **Nota de reutilización (cada ~2 meses):** no edites nada bajo la línea de la
> cabecera. Solo actualiza la cabecera (como mínimo `FECHA_INVESTIGACION`, y las
> variables del contrato en curso) y vuelve a pegar el archivo completo.
