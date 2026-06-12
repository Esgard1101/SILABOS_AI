# PROMPT 3 — Deep Research: catálogo de repos/recursos de "skills" para agentes

> Prompt dedicado a que Gemini Deep Research catalogue repos y recursos de
> ingenieros/tech leads reconocidos sobre "skills" de agentes, playbooks y
> librerías de prompts, y los clasifique en la taxonomía general vs específica.
> Pega el archivo COMPLETO. Edita solo la cabecera.

```
=== EDITA SOLO ESTA CABECERA ===
FECHA_INVESTIGACION: {{ej: 2026-05}}
ENFOQUE: {{ej: skills para agentes de automatización de procesos de negocio con LLM; o acota: "skills de generación de documentos estructurados" / "skills de orquestación multi-agente"}}
=== FIN CABECERA — NO EDITES DEBAJO DE ESTA LÍNEA ===
```

---

## Rol e instrucción al agente

Actúa como **investigador técnico especializado en ingeniería de agentes LLM**.
Tu cliente es un desarrollador que mantiene un **repo central de playbooks**
(`automation-playbook`) y necesita una guía curada de "skills" reutilizables para
agentes, alineada con `ENFOQUE`.

Una "skill" aquí = una capacidad empaquetada y reutilizable para un agente:
prompt(s) + ejemplos + guardas + formato de salida + criterios de uso (incluye lo
que distintos ecosistemas llaman skills, tools, playbooks, prompt libraries,
recipes, cookbooks o agent patterns).

Considera "reciente/vigente" lo actualizado hasta `FECHA_INVESTIGACION`,
priorizando repos con actividad en los últimos ~6 meses respecto a esa fecha.
Penaliza repos abandonados (sin commits recientes) e indícalo.

## Taxonomía a usar (clasifica TODO hallazgo en una de estas dos clases)

- **General:** capacidad amplia, reutilizable en casi cualquier proyecto de
  automatización (p. ej. extracción robusta de JSON de LLM, diseño de cascada de
  proveedores con fallback, evals de regresión de prompts, orquestación
  multi-paso, manejo de contexto/memoria). Se **minan** de repos públicos de
  tech leads.
- **Específica:** capacidad atada a un subproceso de negocio concreto de un
  cliente. NO se mina lista para usar: se **destila** tras iterar el subproceso a
  mano N veces (humano tiene subproceso → chatea resolviéndolo → itera N veces →
  solo entonces se construye la skill con todo lo aprendido).

Trata esta taxonomía como **hipótesis de trabajo**: si la evidencia sugiere una
clasificación mejor (p. ej. una tercera categoría, o un criterio de corte
distinto entre general y específica), **propón el refinamiento explícitamente**
con su justificación y fuentes.

## Fase 1 — Plan de investigación (entrégalo PRIMERO)

Plan numerado para aprobación: qué fuentes (GitHub, blogs de ingeniería,
cookbooks oficiales de proveedores, repos de tech leads reconocidos), qué
criterios de ranking (relevancia a `ENFOQUE`, autoría/credibilidad, actividad
reciente, adopción/estrellas/forks como señal secundaria), y cómo verificarás la
vigencia a `FECHA_INVESTIGACION`.

## Fase 2 — Síntesis (formato de salida EXIGIDO)

En español, exactamente estas secciones:

### A. Repos/recursos rankeados (tabla)

| # | Nombre / repo | URL | Autor/organización (y por qué es reconocido) | Clase (general/específica) | Última actividad (con fecha) | Relevancia a ENFOQUE (alta/media/baja) |
|---|---|---|---|---|---|---|

Mínimo 10 entradas si las hay; ordénalas por relevancia a `ENFOQUE`. Excluye
fuentes de autoría dudosa o repos abandonados (o márcalos como descartados con
motivo).

### B. Skills GENERALES — shortlist con fuente y "qué robar"

Para cada skill general recomendada:

| Skill general | Repo URL de origen | Qué robar concretamente (prompt/patrón/estructura) | Cómo adaptarla al repo central |
|---|---|---|---|

Sé específico en "qué robar": nombra el archivo/patrón/técnica, no generalidades.

### C. Skills ESPECÍFICAS — metodología de destilación (SOP repetible)

NO produzcas skills específicas (dependen del cliente). En su lugar, entrega la
**metodología de destilación recomendada como SOP repetible**, basada en lo que
hagan los mejores practicantes. Estructura el SOP en pasos numerados que incluyan,
como mínimo: (1) aislar el subproceso, (2) resolverlo por chat manual,
(3) iterar N veces — **recomienda un criterio de corte de N** (qué señales
indican que ya se puede destilar: estabilidad de salida, cobertura de casos
borde, etc.), (4) destilar la skill (prompt final, few-shot, guardas, formato,
casos borde) y (5) registrar la lección. Cita las fuentes que respaldan cada
recomendación del SOP.

### D. Cadencia de mantenimiento

Dado el ritmo de cambio de modelos y precios, recomienda una **cadencia de
revisión** del catálogo y del repo central de skills (cada cuánto re-minar
generales, cada cuánto revisar las específicas destiladas, señales que disparan
una revisión anticipada). Justifica con evidencia de la velocidad de cambio
observada a `FECHA_INVESTIGACION`.

### E. Fuentes citadas

Lista numerada con URL y fecha; oficiales vs secundarias; vigencia no
garantizable señalada explícitamente.

## Requisitos de calidad

- Todo en **español**.
- Cada repo/recurso con **URL real y fecha de última actividad**; no inventes
  repos ni cites material que no puedas verificar.
- Usa las tablas pedidas.
- Distingue siempre general vs específica; si refinas la taxonomía, justifícalo.
- Si la actividad/vigencia de un repo no es verificable a `FECHA_INVESTIGACION`,
  decláralo en vez de asumir.
