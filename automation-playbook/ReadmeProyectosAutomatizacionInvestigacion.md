# Proyectos de Automatización + Investigación — Playbook personal

Repo central, fuente única de **prompts de investigación, skills y lecciones aprendidas** para todos mis proyectos de automatización de procesos empresariales con IA.

**Developer goal:** automatizar procesos de empresas con IA (ej. proceso curricular universitario ya automatizado). Este playbook es el activo que se acumula y compone entre clientes/proyectos — no se reinventa cada vez.

---

## La idea (aterrizada)

El conocimiento de un dev agentic senior no vive en la cabeza ni en un proyecto: vive en un **playbook componible** que se retroalimenta solo al final de cada feature/sesión. Tres módulos:

| Módulo | Qué es | Dónde vive | Quién lo nutre |
|--------|--------|-----------|----------------|
| `investigacion/` | Prompts reutilizables para deep-research externo (Gemini). Se reusan cada ~2 meses editando solo cabecera. | Central (este repo) | Manual: editas cabecera, lanzas, pegas resultado |
| `skills/` | Skills clasificadas: **generales** (minadas de repos de tech leads) y **específicas** (destiladas del flujo iterar-con-chat-N-veces) | Central (este repo) | Semi-auto: ciclo de vida propone crearlas |
| `lecciones/` | Lecciones aprendidas. Dependen del **contexto del proyecto** → viven en cada proyecto; aquí solo el **índice central** de patrones transversales | Por-proyecto + índice central aquí | Auto: hook al cerrar feat/sesión |

Regla mental: **investigación y skills se comparten; lecciones se localizan y solo lo transversal sube al índice central.**

---

## Cómo se conecta a cada proyecto (sin arrastrar carpetas)

No copies carpetas ni pases rutas a mano. En el `CLAUDE.md` de **cada proyecto** una sola línea:

```
> Playbook: ../automation-playbook — leer investigacion/ y skills/ para prompts/skills reutilizables; las lecciones de ESTE proyecto van en su propio LECCIONES.md (ver automation-playbook/lecciones/TEMPLATE_LECCIONES_PROYECTO.md).
```

El agente lee esa línea sola. Sync: `git pull` del playbook al inicio de cada ciclo bimestral. Submódulo solo si necesitas reproducibilidad estricta en CI (más ceremonia git).

### Bootstrap del repo (3 pasos)

1. Mover esta carpeta fuera del proyecto cliente: `mv automation-playbook ../automation-playbook`
2. `cd ../automation-playbook && git init && git add . && git commit -m "seed: playbook investigacion+skills+lecciones"`
3. Añadir la línea puntero al `CLAUDE.md` de cada proyecto. (Crear repo remoto privado opcional para sync entre máquinas.)

---

## Módulo: investigación

Ver [`investigacion/README.md`](investigacion/README.md). 3 prompts pegables en Gemini Deep Research (producto específico, plantilla genérica, catálogo de repos de skills). Reuso bimestral: **editas solo la cabecera de variables**, el cuerpo nunca. Justificación del ciclo de 2 meses: providers/arquitecturas cambian rápido y el costo es el limitante más grande — re-investigar mantiene el stack barato y vigente.

## Módulo: skills

Ver [`skills/README.md`](skills/README.md). Hipótesis de trabajo: **2 tipos**:
- **Generales** (`skills/generales/`): patrones amplios minados de repos de tech leads. Reutilizables entre proyectos casi sin cambio.
- **Específicas** (`skills/especificas/`): destiladas del flujo correcto → *humano tiene subproceso → habla con chat → itera N veces hasta resultado perfecto → recién ahí el agente arma la skill con todo lo aprendido*. No se escriben a priori; se cosechan al final.

## Módulo: ciclo de vida de feature

Ver [`ciclo-vida-feature/README.md`](ciclo-vida-feature/README.md). Al completar una feat o al cerrar sesión, el agente:
1. Resume qué se aprendió.
2. **Umbral por tamaño/reuso:** lección puntual → addendum a `LECCIONES.md` del proyecto. Patrón reutilizable (>N usos esperados o flujo completo destilable) → propone convertirlo en **skill específica** en el playbook.
3. Lo transversal (sirve a otros proyectos) → entra al [`lecciones/_INDICE_CENTRAL.md`](lecciones/_INDICE_CENTRAL.md).

### Activar la auto-mejora (hook — NO activado aún)

La auto-mejora al cerrar sesión es **automatización real**: la ejecuta el harness vía hook, no una instrucción en memoria. Para activarla en un proyecto, añadir a su `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [
      { "hooks": [ { "type": "command", "command": "echo 'Recordatorio: si esta sesión completó una feat o algo que te gustó, actualiza LECCIONES.md (umbral tamaño/reuso → addendum o proponer skill). Ver automation-playbook/ciclo-vida-feature/README.md' } ] }
    ]
  }
}
```

`SessionEnd` recuerda al cerrar. Alternativa: hook `Stop` para recordar al terminar cada feat grande. Dejado **documentado, no cableado** a propósito — actívalo cuando muevas el repo y por proyecto. El hook solo *recuerda*; el agente hace el resumen/decisión de umbral leyendo el módulo ciclo-vida.

---

## Estructura

```
automation-playbook/
├── ReadmeProyectosAutomatizacionInvestigacion.md   ← este archivo
├── investigacion/        3 prompts deep-research + README
├── skills/
│   ├── README.md         taxonomía + SOP destilación
│   ├── generales/        skills minadas de tech leads
│   └── especificas/      skills destiladas por proyecto
├── lecciones/
│   ├── README.md         patrón por-proyecto + índice central
│   ├── _INDICE_CENTRAL.md   patrones transversales
│   └── TEMPLATE_LECCIONES_PROYECTO.md
└── ciclo-vida-feature/
    └── README.md         flujo feat→addendum/skill + hook
```
