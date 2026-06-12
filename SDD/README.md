# SDD-KIT — Spec-Driven Development para GarzaSoft

Kit modular de MDs para que tus **Agentes de Capa 1 (planeadores)** generen sprints y specs con **slices verticales testeables**, nomenclatura sin ambigüedad y documentación en árbol que mejora el routing de los agentes.

> **Principio:** Capa 1 nunca programa. Escribe contexto, prompts y te ayuda a decidir arquitectura. Capa 2 (Claude Code) programa leyendo lo que Capa 1 escribió.

---

## 🌳 El árbol del kit

```
SDD-KIT/
├── README.md                          ← este archivo
│
├── _COMUNES/                          ← reusable entre TODOS los proyectos (tu ADN)
│   ├── 00_GLOSARIO_GARZASOFT.md       ← nomenclatura, capas, convenciones fijas
│   ├── 01_REGLAS_VERTICALIZACION.md   ← qué es un slice atómico + el punto óptimo
│   ├── 02_DOD_ESTANDAR.md             ← DoD de 2 niveles (yo manual / agente auto)
│   └── 03_REGLA_AUTOMEJORA.md         ← dónde va cada decisión (context vs bitácora)
│
├── _PLANTILLAS/                       ← se copian a documentations/ por proyecto
│   ├── TPL_context.md                 ← single source of truth (LIMPIO)
│   ├── TPL_bitacoradev.md             ← tecnicismos y cierres de tarea
│   ├── TPL_SPRINT.md                  ← proyecto desde 0 (slices verticales)
│   └── TPL_SPEC.md                    ← feature puntual
│
└── _AGENTES_CAPA1/                    ← los 3 prompts maestros (el motor)
    ├── AGENTCONTEXTCAPA1SPRINTS.md    ← proyecto de 0
    ├── AGENTCONTEXTCAPA1FEATS.md      ← lote (>2 feats o >2 módulos)
    └── AGENTCONTEXTCAPA1SPECS.md      ← feat puntual (1–2, quirúrgico)
```

---

## 🧭 Qué agente uso (matriz de decisión)

| Situación | Agente | Genera |
|---|---|---|
| Proyecto **desde 0** | `AGENTCONTEXTCAPA1SPRINTS` | context.md + bitacoradev.md + SPRINT.md |
| Proyecto avanzado, **lote** de feats (>2 feats **o** >2 módulos) | `AGENTCONTEXTCAPA1FEATS` | SPRINT.md (de feats) + varios SPEC + filas de context.md |
| Proyecto avanzado, **feat puntual** (1–2, específica) | `AGENTCONTEXTCAPA1SPECS` | 1–2 SPEC + filas de context.md |

Regla rápida: **¿de cero?** → SPRINTS. **¿muchas cosas a la vez?** → FEATS. **¿algo quirúrgico?** → SPECS.

---

## 🔄 El flujo completo (Capa 1 → mockup → Capa 2)

```
1. Elijo el agente según la matriz y pego su prompt en un chat nuevo de planificación.
   Adjunto: _COMUNES/, el context.md vigente (si el proyecto existe),
   transcripciones, imágenes, y los archivos que el agente me pida.

2. El agente Capa 1 me INTERROGA una pregunta a la vez (glosario, modelo, alcance,
   verticalización). No escribe nada hasta cerrar el cuestionario.
   → Si le falta algo, me lo pide: "ejecuta esta query", "pásame este file".

3. El agente escribe los .md (context / sprint / spec) con:
   - Slices verticales (1 CRUD = 1 tarea testeable, default 70%).
   - DoD de 2 niveles (yo navegador-Postman / agente migrate-tinker-tests).
   - Tabla resumen al final para que YO asigne devs manualmente.

4. ¿Hay mockup? (solo proyecto de 0 o feat compleja)
   → El agente me da SOLO el prompt para mi agente de mockup APARTE.
   → Lo llevo a otro chat, itero el HTML hasta que quede moderno (human-in-the-loop).
   → Guardo el HTML aprobado en resources/mockups/ y marco el SPEC como APROBADO.

5. Llevo el SPRINT.md / SPEC.md a Capa 2 (Claude Code).
   → Capa 2 lee context.md + la tarea + skills, y programa el slice.
   → Antes de cerrar: corre su DoD-Técnico (tests Feature, migrate) y actualiza
     context.md (decisión limpia) + bitacoradev.md (detalle).

6. Yo valido el DoD-Usuario (navegador, o walkthrough Postman si es API).
   → No gasto tokens en testeo agéntico. Una tarea = una sesión limpia.
```

---

## 📐 Las reglas que sostienen todo

0. **Evaluar el scope ANTES de verticalizar (lo más importante de Capa 1).** El agente lee `context.md` + `bitacoradev.md` y pregunta para evaluar 4 dimensiones: encaje en el sistema (incluido si es **proyecto satélite** que consume/expone), valor agregado, decisiones de arquitectura **con recomendación** (propone opción + trade-off para que vos, tech lead, decidas) y diagnósticos que necesita ("ejecutá esta query", "pasame este file"). Verticalizar es el paso 2. → `_COMUNES/01 §5`

1. **Slice vertical, punto óptimo.** 1 tarea = 1 CRUD/módulo end-to-end (testeable por vos sin depender de la siguiente). Se degrada en sub-slices verticales solo con gatillo real (crítico / multi-pantalla / muy grande). Nunca división horizontal por capas. → `_COMUNES/01`

2. **Glosario de ubicuidad.** Identificador de usuario/rol/tenant definidos explícitamente por proyecto en `context.md §2`, heredando los defaults de `_COMUNES/00`. Mata el bug de `usuario_id` vs `perfil_id` vs tenant.

3. **Documentación en árbol + auto-mejora.** `context.md` limpio (QUÉ/POR QUÉ) ≠ `bitacoradev.md` (CÓMO). El agente actualiza ambos al cerrar tarea. Cada archivo tiene un lector objetivo → mejor routing. → `_COMUNES/03`

---

## 🧪 Testeo: cómo se reparte el esfuerzo

- **🤖 Agente (automático, sus tokens):** migrate, tinker, **tests Feature de Laravel** generados desde el SPEC. Para APIs, los tests son la **red de seguridad**.
- **🧑‍💻 Vos (manual, cero tokens):** navegador para módulos con UI; **walkthrough de Postman escrito por el agente** para APIs. Si no podés alcanzar el endpoint (sin acceso al server), confiás en los tests code.

> Para backends que son solo API (sin frontend en tu scope): el agente escribe el walkthrough de Postman pero **no** automatiza la colección. La aceptación real recae en los tests Feature.

---

## 🚀 Quickstart

```bash
# 1. Arranco un proyecto nuevo:
#    - copio _PLANTILLAS/TPL_context.md      → mi-proyecto/documentations/context.md
#    - copio _PLANTILLAS/TPL_bitacoradev.md  → mi-proyecto/documentations/bitacoradev.md
#    - abro chat nuevo, pego _AGENTES_CAPA1/AGENTCONTEXTCAPA1SPRINTS.md
#    - adjunto los _COMUNES/ y respondo el cuestionario una pregunta a la vez.

# 2. Feature puntual sobre proyecto existente:
#    - abro chat nuevo, pego _AGENTES_CAPA1/AGENTCONTEXTCAPA1SPECS.md
#    - adjunto context.md vigente + archivos del módulo + _COMUNES/
```

Mantené los `_COMUNES/` versionados: cuando mejorás una regla ahí, mejoran todos los proyectos futuros.
