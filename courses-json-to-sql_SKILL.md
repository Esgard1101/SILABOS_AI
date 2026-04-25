---
name: courses-json-to-sql
description: >
  Convierte un JSON de cursos universitarios UNPRG/FACHSE/SILABOS.AI a un bloque
  SQL INSERT listo para ejecutar en Supabase SQL Editor, respetando el esquema
  exacto de la tabla courses y la lógica de deduplicado por is_common.
  Usar SIEMPRE que el usuario diga "dame el SQL de estos cursos", "inserta estos
  cursos en la BD", "genera el INSERT para el programa X", o suba un JSON de
  cursos y pida convertirlo a query. También aplica cuando diga "me falta insertar
  unos cursos" o "genera el bloque 9 para este programa".
---

# SILABOS.AI — Skill: JSON de cursos → SQL INSERT

## Esquema exacto de la tabla courses

```sql
courses (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id             UUID REFERENCES careers(id),       -- NO incluir (null)
    name                  VARCHAR(200) NOT NULL,
    code                  VARCHAR(30),
    credits               INTEGER DEFAULT 3,
    hours_theory          INTEGER DEFAULT 2,
    hours_practice        INTEGER DEFAULT 2,
    cycle                 INTEGER,
    modality              VARCHAR(20) DEFAULT 'presencial',
    created_at            TIMESTAMPTZ DEFAULT now(),
    study_plan_id         UUID,                              -- NO incluir (null)
    sumilla               TEXT,
    competencia           TEXT,                              -- campo viejo MVP
    capacidad             TEXT,                              -- generado automático
    prerequisites         VARCHAR,
    program_id            UUID REFERENCES programs(id),      -- FK principal
    is_common             BOOLEAN DEFAULT false,
    scope                 VARCHAR(100) DEFAULT 'specialty',
    competencia_egreso    TEXT,
    resultado_aprendizaje TEXT
)
```

## Input requerido del usuario

El usuario debe proporcionar:

1. **JSON de cursos** — array de objetos. Campos esperados:
```json
[
  {
    "name": "Nombre del curso",
    "code": "CODIGO123",
    "credits": 3,
    "cycle": 4,
    "is_common": false,
    "scope": "specialty",
    "sumilla": "Texto completo...",
    "competencia_egreso": "Texto...",
    "resultado_aprendizaje": "Texto..."
  }
]
```

2. **UUID del programa** — extraído de la tabla `programs` en Supabase.
   Si no lo proporciona, pedirlo ANTES de generar el SQL.

3. **Nombre exacto del programa** — tal como está en la tabla `programs`.
   Si no lo proporciona, pedirlo ANTES de generar el SQL.

Si el JSON tiene múltiples arrays pegados (procesados por ciclos), el script
los unifica automáticamente con el decoder iterativo.

## Reglas críticas de deduplicado

| is_common | Deduplicado SQL | Razón |
|---|---|---|
| `true` | `WHERE NOT EXISTS (SELECT 1 FROM courses WHERE code = X)` | Una sola fila global compartida |
| `false` | `WHERE NOT EXISTS (SELECT 1 FROM courses WHERE program_id = v_program_id AND code = X)` | Mismo código, contenido distinto por programa |

**NUNCA usar solo `code` para cursos `is_common=false`** — cursos como
"Historia de la educación" (CEDE1001) existen en múltiples programas con
`resultado_aprendizaje` diferente.

## Generación de la columna `capacidad`

Transformación determinista, sin IA:
```
resultado_aprendizaje: "Analiza las etapas de evolución..."
capacidad:             "Tiene la capacidad de analizar las etapas de evolución..."
```
Fórmula: `"Tiene la capacidad de " + primer_char.lower() + resto`

Si `resultado_aprendizaje` es null → `capacidad` también es NULL.

## Script Python a ejecutar con bash_tool

```python
import json

def escape(s):
    """Escapa valores para delimitador $$ en PostgreSQL.
    Reemplaza $$ internos con '$ $' para evitar conflicto con DO $body$."""
    if s is None or str(s).strip() == '':
        return 'NULL'
    return '$$' + str(s).strip().replace('$$', '$ $') + '$$'

def b(v):
    return 'TRUE' if v else 'FALSE'

# ── CONFIGURAR ────────────────────────────────────────────────
PROGRAM_ID   = 'UUID-DEL-PROGRAMA'       # UUID exacto de tabla programs
PROGRAM_NAME = 'Nombre exacto programa'  # Nombre exacto de tabla programs
INPUT_FILE   = 'cursos.json'             # Archivo JSON de entrada
OUTPUT_FILE  = 'insert_cursos.sql'
# ─────────────────────────────────────────────────────────────

with open(INPUT_FILE, encoding='utf-8') as f:
    content = f.read()

# Unificar múltiples arrays pegados (JSONs procesados por ciclos)
decoder = json.JSONDecoder()
arrays, pos = [], 0
while pos < len(content):
    pos = content.find('[', pos)
    if pos == -1:
        break
    try:
        obj, end = decoder.raw_decode(content, pos)
        arrays.append(obj)
        pos = end
    except:
        pos += 1

courses = [c for arr in arrays for c in arr]
common     = [c for c in courses if c.get('is_common')]
non_common = [c for c in courses if not c.get('is_common')]
print(f'Comunes: {len(common)} | No comunes: {len(non_common)} | Total: {len(courses)}')

lines = [f"""-- ─────────────────────────────────────────────────────────────
-- INSERT cursos: {PROGRAM_NAME}
-- program_id: {PROGRAM_ID}
-- Total: {len(courses)} cursos ({len(common)} comunes, {len(non_common)} propios)
-- Deduplicado: common → por code | no-common → por code+program_id
-- Columna capacidad generada automáticamente
-- ─────────────────────────────────────────────────────────────
DO $body$
DECLARE
    v_program_id UUID := '{PROGRAM_ID}';
BEGIN"""]

for c in courses:
    code    = escape(c.get('code'))
    is_comm = c.get('is_common', False)
    res_ap  = (c.get('resultado_aprendizaje') or '').strip()
    cap     = ('Tiene la capacidad de ' + res_ap[0].lower() + res_ap[1:]) if res_ap else None

    # Lógica de deduplicado diferenciada por is_common
    if is_comm:
        dedup = f"SELECT 1 FROM courses WHERE code = {code}"
    else:
        dedup = f"SELECT 1 FROM courses WHERE program_id = v_program_id AND code = {code}"

    lines.append(f"""
    INSERT INTO courses
        (program_id, name, code, credits, cycle, is_common, scope,
         sumilla, competencia_egreso, resultado_aprendizaje, capacidad)
    SELECT
        v_program_id, {escape(c.get('name'))}, {code},
        {c.get('credits') or 'NULL'}, {c.get('cycle') or 'NULL'},
        {b(is_comm)}, {escape(c.get('scope', 'specialty'))},
        {escape(c.get('sumilla'))},
        {escape(c.get('competencia_egreso'))},
        {escape(c.get('resultado_aprendizaje'))},
        {escape(cap)}
    WHERE NOT EXISTS ({dedup});""")

lines.append(f"""
END $body$;

-- VERIFICACIÓN
SELECT p.name,
  COUNT(c.id)                                              AS total,
  SUM(CASE WHEN c.is_common         THEN 1 ELSE 0 END)    AS comunes,
  SUM(CASE WHEN c.scope='specific'  THEN 1 ELSE 0 END)    AS especificos,
  SUM(CASE WHEN c.scope='specialty' THEN 1 ELSE 0 END)    AS especialidad,
  SUM(CASE WHEN c.capacidad IS NOT NULL THEN 1 ELSE 0 END) AS con_capacidad
FROM programs p
LEFT JOIN courses c ON c.program_id = p.id
GROUP BY p.name ORDER BY p.name;""")

sql = '\n'.join(lines)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(sql)
print(f'Script generado: {OUTPUT_FILE} ({len(sql):,} chars)')
```

## Por qué DO $body$ y no DO $$

El bloque DO usa `$body$` como delimitador porque los valores de texto
dentro de los INSERTs usan `$$texto$$`. Si el delimitador del bloque
fuera también `$$`, PostgreSQL cerraría el bloque al encontrar el primer
`$$` de un valor y generaría error de sintaxis.

```sql
-- MAL → error:
DO $$
BEGIN
  INSERT ... SELECT $$Pensamiento filosófico$$  ← PostgreSQL cree que $$ cierra el DO
END $$;

-- BIEN:
DO $body$
BEGIN
  INSERT ... SELECT $$Pensamiento filosófico$$  ← $body$ ≠ $$, no hay conflicto
END $body$;
```

## Resultado esperado en la verificación

Después de ejecutar:
- `total` = cursos no-comunes del programa (los comunes no tienen este `program_id`)
- `comunes` = 0 siempre (los comunes no se vinculan a un program_id específico)
- `especificos + especialidad` = total
- `con_capacidad` = igual que total

Los cursos comunes aparecen via `OR is_common = true` en el frontend —
no necesitan `program_id` de cada programa.

## UUIDs de programas FACHSE/UNPRG (referencia)

```
Educ. Matemática y computación  → 7c95ee73-9d4a-4757-a57c-ba622db85bf4
EducacionPrimaria               → 7ec3b77c-9499-4c8a-9d44-70e0c214a301
EducacionCienciasNaturales      → 8fd6b360-3034-49ac-8076-4f09f2a2a735
Educ. Idiomas Extranjeros       → 9b96f511-afcd-42e2-8ad4-87a467d7e148
Educ. Lengua y Literatura       → b3dd0e07-611c-415c-bd5a-f98b61a92084
Educ. CC. HH. SS y Filosofía   → c41b986e-bd8c-48bd-8aa7-d03481fcaea0
EducacionInicial                → c5d1d840-4ca7-4391-af8c-24fb6c073a79
Educación Física                → fa97faff-475a-49d6-9375-c3fb8a1a7f7b
```

## Checklist antes de entregar el SQL

- [ ] `$body$` aparece exactamente 2 veces (apertura y cierre del DO)
- [ ] El `PROGRAM_ID` es el UUID exacto de la tabla `programs`
- [ ] Cursos `is_common=true` → deduplicado por `code` solo
- [ ] Cursos `is_common=false` → deduplicado por `code + program_id`
- [ ] Columna `capacidad` incluida en cada INSERT
- [ ] Query de verificación al final del script
- [ ] Si el JSON tenía múltiples arrays → fueron unificados correctamente
