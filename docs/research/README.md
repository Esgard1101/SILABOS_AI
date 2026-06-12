# Research Kit — Investigación periódica de arquitectura agéntica, proveedores y skills

> Kit reutilizable de **prompt engineering** para pegar en **Gemini Deep Research**
> (agente externo). Pensado para un desarrollador cuyo objetivo es automatizar
> procesos de negocio con IA y que **repite esta investigación cada ~2 meses**
> porque el campo cambia rápido (modelos, precios, patrones agénticos).
>
> Generado en modo solo-lectura. NO modifica código fuente del producto.

---

## 1. Qué contiene el kit

| Archivo | Propósito | Cuándo usarlo |
|---|---|---|
| [`PROMPT_1_PRODUCTO_CURRICULAR.md`](PROMPT_1_PRODUCTO_CURRICULAR.md) | Deep-research **específico de ESTA app** (Silabos.AI: FastAPI + cascada IA Gemini→OpenAI→OpenRouter/NVIDIA→Mistral; React+Vite; automatización del proceso curricular/sílabo universitario). | Cuando quieras revisar si la arquitectura/cascada actual del producto sigue siendo óptima frente a lo último del mercado. |
| [`PROMPT_2_PLANTILLA_GENERICA.md`](PROMPT_2_PLANTILLA_GENERICA.md) | **Plantilla genérica** para CUALQUIER contrato futuro de automatización de procesos de negocio. Todo lo específico es una `{{VARIABLE}}`. | Al iniciar un nuevo proyecto/cliente, o en el ciclo bimestral para dominios distintos al sílabo. |
| [`PROMPT_3_CATALOGO_SKILLS.md`](PROMPT_3_CATALOGO_SKILLS.md) | Deep-research para **catalogar repos/recursos de "skills"** (playbooks, librerías de prompts) de ingenieros y tech leads reconocidos, clasificados por la taxonomía general vs específica. | Cuando quieras refrescar tu guía de skills reusables / al armar un repo central de playbooks. |

### 1.1 Cómo se usan (flujo de 4 pasos)

1. Abre el prompt que corresponda.
2. **Edita SOLO la cabecera de variables** (bloque cercado al inicio, marcado
   `EDITA SOLO ESTA CABECERA`). No toques el cuerpo del prompt.
3. Copia el archivo **completo** (cabecera + cuerpo) y pégalo en Gemini Deep
   Research como un único mensaje. Cada prompt es **autocontenido y pegable**.
4. Deja que el agente genere primero su **plan de investigación**; revísalo;
   pídele luego la **síntesis** con tablas y citas según el formato exigido.

### 1.2 Convención de la cabecera de variables

Todos los prompts empiezan con un bloque cercado tipo YAML-ish:

```
=== EDITA SOLO ESTA CABECERA ===
FECHA_INVESTIGACION: {{ej: 2026-05}}
... más variables ...
=== FIN CABECERA — NO EDITES DEBAJO DE ESTA LÍNEA ===
```

Reglas:

- `{{...}}` = marcador que debes reemplazar antes de pegar.
- `FECHA_INVESTIGACION` es obligatoria en los 3 prompts: ancla al agente a
  "recientes a esa fecha" y evita que cite material viejo.
- Si una variable no aplica, escribe `N/A` (no la borres: el cuerpo la
  referencia).
- **El cuerpo del prompt nunca se edita.** Eso es lo que hace el kit reutilizable
  cada 2 meses: solo cambias la cabecera.

---

## 2. Patrón de repo central — `automation-playbook`

Decisión adoptada: mantener un **repositorio central separado**,
`automation-playbook`, como **única fuente de verdad** para prompts, skills y
lecciones aprendidas — desacoplado de cualquier proyecto cliente concreto. Este
kit (`docs/research/`) es el **semilla** de ese repo.

### 2.1 Bootstrap (3 pasos recomendados)

```bash
# (a) Inicializar el repo central, fuera del proyecto del cliente
mkdir automation-playbook && cd automation-playbook && git init

# (b) Mover el contenido de docs/research/ del proyecto al repo central
#     (queda como /prompts dentro del playbook)
mkdir prompts
git mv ../silabos_app/docs/research/* prompts/   # o copiar si prefieres conservar copia
git add . && git commit -m "chore: seed automation-playbook from silabos research kit"

# (c) En el CLAUDE.md de CADA proyecto, añadir UNA sola línea de puntero:
#     > Playbook: ../automation-playbook (o ruta de git submodule)
#     >   — leer para prompts/skills/lecciones reutilizables
```

Estructura objetivo mínima del repo central:

```
automation-playbook/
├── prompts/      # los 3 prompts de este kit (PROMPT_1/2/3 + este README)
├── skills/       # skills generales (minadas) y específicas (destiladas) — ver §3
└── lessons/      # lecciones por proyecto/cliente (qué funcionó, qué no, costos reales)
```

### 2.2 Cómo lo consume el agente: puntero vs submódulo

| Opción | Cómo | Pro | Contra |
|---|---|---|---|
| **Línea de puntero** en `CLAUDE.md` (recomendada) | `> Playbook: ../automation-playbook — leer para prompts/skills/lecciones` | Cero ceremonia git. El agente lo lee si está clonado al lado. Edición libre del playbook. | Sincronización **manual** (`git pull` periódico del playbook). El agente puede no encontrarlo si no está clonado en la ruta esperada. |
| **`git submodule`** | `git submodule add <url-playbook> vendor/automation-playbook` y commitear el `.gitmodules` | El agente lo lee sin que pases rutas; queda **anclado y versionado** con el proyecto; reproducible en CI. | Ceremonia extra (`git submodule update --init --recursive`, gestión de SHA pinneado, actualizaciones manuales del puntero del submódulo). |

**Recomendación: línea de puntero + sincronización manual periódica.** Para un
desarrollador solo, el costo de ceremonia del submódulo no compensa; basta con
clonar `automation-playbook` junto a los proyectos, añadir la línea de puntero al
`CLAUDE.md`, y hacer `git pull` del playbook al inicio de cada ciclo bimestral.
El submódulo solo conviene si necesitas reproducibilidad estricta en CI o
anclar una versión exacta del playbook por proyecto.

Línea de puntero exacta a pegar en `CLAUDE.md` de cada proyecto:

```
> Playbook: ../automation-playbook (o ruta de git submodule) — leer para prompts/skills/lecciones reutilizables
```

---

## 3. Taxonomía de skills (hipótesis de trabajo a validar)

El kit asume dos clases de skills. **Esto es una hipótesis de trabajo: la
investigación (sobre todo `PROMPT_3`) debe validarla o refinarla**, no darla por
cerrada.

### 3.1 Skills generales

- **Definición:** capacidades amplias, reutilizables en casi cualquier proyecto
  de automatización (p. ej. "extraer JSON robusto de salida de LLM", "diseñar una
  cascada de proveedores con fallback", "evals de regresión de prompts",
  "orquestación multi-paso de documentos").
- **Origen:** se **minan** de repos de tech leads / ingenieros reconocidos
  (librerías de prompts, playbooks públicos, repos de skills de agentes).
- **Salida esperada de la investigación:** shortlist con URL del repo + "qué
  robar" concretamente.

### 3.2 Skills específicas

- **Definición:** capacidades atadas a un subproceso de negocio concreto de un
  cliente (p. ej. "generar la unidad N del sílabo respetando el método didáctico
  X y la rúbrica institucional Y").
- **Origen — flujo de destilación (iterar-con-chat-N-veces):**
  1. El humano tiene un **subproceso** de negocio real.
  2. **Chatea** con el modelo resolviéndolo manualmente.
  3. **Itera N veces** sobre ese subproceso (ajusta prompt, formato, restricciones,
     ejemplos) hasta que la salida es consistentemente buena.
  4. **Solo entonces** el agente construye la skill, **destilando** todo lo
     aprendido en esas N iteraciones (prompt final, ejemplos few-shot, guardas,
     formato de salida, casos borde).
- **Salida esperada de la investigación:** la **metodología de destilación** como
  un SOP repetible (no la skill en sí).

> Regla: una skill específica **no se escribe antes** de iterar N veces el
> subproceso a mano. Escribirla antes produce skills frágiles que no capturan los
> casos borde reales. La investigación debe confirmar o refinar este umbral
> (¿cuántas iteraciones?, ¿qué señales indican que ya se puede destilar?).

---

## 4. Mantenimiento

- Reejecuta el ciclo cada **~2 meses** (modelos y precios cambian rápido).
- Antes de cada ciclo: `git pull` del `automation-playbook`.
- En cada prompt **solo** actualiza `FECHA_INVESTIGACION` (y las variables del
  proyecto en curso). El cuerpo no se toca.
- Tras cada investigación, vuelca conclusiones accionables en
  `automation-playbook/lessons/` (costos reales medidos, qué proveedor migraste,
  qué skill destilaste).
