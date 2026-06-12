# Módulo Skills

Hipótesis de trabajo (a validar/refinar con `investigacion/PROMPT_3_CATALOGO_SKILLS.md`): existen **2 tipos de skills**.

## 1. Skills generales — `generales/`

Patrones amplios, reutilizables casi sin cambio entre proyectos. Origen: **minadas** de repos públicos de ingenieros / tech leads (prompt libraries, agent playbooks, SOPs).

- Se obtienen ejecutando PROMPT_3 contra Gemini Deep Research → catálogo rankeado de repos → "qué robar" de cada uno.
- Criterio de entrada: aplica a ≥2 dominios distintos, no depende de un cliente/proceso concreto.
- Ejemplos típicos: revisión de PR, scaffolding de tests, refactor progresivo, generación de docs, triage de bugs.

## 2. Skills específicas — `especificas/`

Destiladas de un proceso real, tras dominarlo. **No se escriben a priori.** Flujo correcto:

```
humano tiene un subproceso
  → habla con un chat
    → itera … itera … (N veces)
      → consigue el resultado perfecto
        → RECIÉN AHÍ: el agente arma la skill con todo lo aprendido
```

Escribir la skill antes de las N iteraciones produce skills frágiles que asumen lo que no se sabía. La skill captura: el prompt/decisiones que finalmente funcionaron, los callejones evitados, los criterios de aceptación reales.

- Criterio de entrada: el flujo se repetirá (>N usos esperados) o es un proceso completo destilable.
- Origen: lo propone el módulo `ciclo-vida-feature` cuando una lección supera el umbral de tamaño/reuso.

## SOP de destilación (skill específica)

1. Trabajar el subproceso con el chat hasta resultado perfecto. **No documentar aún.**
2. Al cerrar la feat, si supera umbral → el agente extrae: objetivo, entradas, pasos que funcionaron, anti-patrones encontrados, criterios de aceptación.
3. Generar `especificas/<slug>/SKILL.md` con frontmatter `name` + `description` (cuándo dispararla).
4. Registrar en `../lecciones/_INDICE_CENTRAL.md` si es transversal.
5. Revisar vigencia cada ciclo bimestral (modelos/providers cambian).

## Mantenimiento

Field churn alto → revisar skills cada ~2 meses junto con la re-investigación. Marcar `revisado: YYYY-MM` en el frontmatter. Skill no revisada en 2 ciclos = candidata a auditoría.
