---
name: minado-anexo2-unprg
description: >
  Skill para minar datos del ANEXO 2 (Sustento del Plan de Estudios por Competencia) de programas
  académicos de la UNPRG. El colaborador pega texto copiado directamente del PDF (sucio, con columnas
  mezcladas) y Claude lo parsea a JSON limpio agrupado por asignatura, listo para el JSON maestro del programa.
  Usar SIEMPRE que el usuario pegue texto de tablas de plan de estudios, mencione "Anexo 2",
  "competencias generales", "desempeños esperados", "capacidades profesionales", "plan de estudios UNPRG",
  o cuando pegue bloques de texto con patrones como "N.N.N. [texto de desempeño]" o
  "Conocimientos / Habilidades requeridas". También activar cuando el usuario envíe una imagen
  de una tabla del plan de estudios para parsear.
---

# Skill: Minado de Anexo 2 — Plan de Estudios UNPRG

## Propósito
Transformar texto copy-paste sucio del PDF del Anexo 2 de la UNPRG en JSON estructurado,
agrupado por asignatura, listo para el JSON maestro. Colaborador semi-técnico (entiende JSON básico).
Una sesión = un solo programa/especialidad.

---

## FLUJO DE TRABAJO

### PASO 1 — Inicio de sesión
Al primer mensaje preguntar solo:
> **¿Qué programa y especialidad estás minando?** (ej: "Educación — Educación Física")

Guardar en contexto como `programa` y `especialidad`. La competencia se detecta automáticamente del texto.

---

### PASO 2 — Parsear el fragmento pegado

Aplicar las **Reglas de Parseo** (sección abajo) y generar el JSON.

#### Formato de salida — UN OBJETO POR ASIGNATURA

```json
[
  {
    "programa": "Educación",
    "especialidad": "Educación Física",
    "asignatura": "Cátedra Pedro Ruiz Gallo",
    "creditos_teoria": 2,
    "creditos_practica": 1,
    "horas_teoria": 32,
    "horas_practica": 32,
    "competencias": [
      {
        "competencia_codigo": "1",
        "competencia_texto": "Fortalece su desarrollo personal y cultural...",
        "capacidad_codigo": "1.1",
        "capacidad_texto": "Proyecta el desarrollo del Perú y de la UNPRG..."
      }
    ],
    "desempenos": [
      {
        "codigo": "1.1.1",
        "texto": "Valora el proceso histórico cultural...",
        "conocimientos": [
          "El proceso de formación del Estado peruano.",
          "El origen histórico de Lambayeque: La cultura Lambayeque."
        ],
        "habilidades": [
          "Elabora la reseña acerca de la cultura Sicán.",
          "Narra oralmente la historia local y regional de Lambayeque."
        ]
      }
    ]
  }
]
```

Caso especial — asignatura con múltiples capacidades (ej: Herramientas digitales = cap. 4.1 y 4.2):
```json
{
  "asignatura": "Herramientas digitales",
  "competencias": [
    { "competencia_codigo": "4", "competencia_texto": "...", "capacidad_codigo": "4.1", "capacidad_texto": "..." },
    { "competencia_codigo": "4", "competencia_texto": "...", "capacidad_codigo": "4.2", "capacidad_texto": "..." }
  ],
  "desempenos": [
    { "codigo": "4.1.1", "texto": "...", "conocimientos": ["..."], "habilidades": ["..."] },
    { "codigo": "4.1.2", "texto": "...", "conocimientos": ["..."], "habilidades": ["..."] },
    { "codigo": "4.2.1", "texto": "...", "conocimientos": ["..."], "habilidades": ["..."] },
    { "codigo": "4.2.2", "texto": "...", "conocimientos": ["..."], "habilidades": ["..."] }
  ]
}
```

> ⚠️ **Aviso al colaborador:** Si la asignatura ya existe en tu JSON maestro,
> NO crees un objeto nuevo — agrega los desempeños dentro del objeto existente.

---

### PASO 3 — Resumen de control

```
✅ Fragmento parseado — Competencia [N]
   Asignaturas: Cátedra Pedro Ruiz Gallo | Desarrollo personal | Actividad física
   Desempeños: 1.1.1 · 1.1.2 · 1.1.3 · 1.2.1 · 1.2.2 · 1.3.1 · 1.3.2
   ⚠️  Herencias: 1.3.2 heredó conocimientos/habilidades de 1.3.1

📊 Sesión — [Especialidad]
   Comp. 1 | Asignaturas: 5 | Desempeños: 10
   Comp. 2 | Asignaturas: 2 | Desempeños: 4
   TOTAL   | Asignaturas: 7 | Desempeños: 14
```

---

### PASO 4 — Instrucción al colaborador

> **👉 Copia el JSON de arriba y pégalo al final del array en `maestro_[especialidad].json`.**
> Cuando estés listo, pega el siguiente fragmento.

---

## REGLAS DE PARSEO

### COMPETENCIA GENERAL
- Bloque antes de la tabla: `COMPETENCIA N (GENERAL): [texto]`
- Si no aparece en el fragmento, inferir del número de capacidades/desempeños
- Campos: `competencia_codigo` (número) y `competencia_texto` (texto completo)

### CAPACIDAD PROFESIONAL
- Patrón: `N.N.` + texto partido en líneas
- Reconstruir uniendo líneas hasta el siguiente `N.N.N.`

### DESEMPEÑOS ESPERADOS
- Patrón: `N.N.N.` + texto partido
- Reconstruir hasta `Conocimientos` o siguiente `N.N.N.`

### ASIGNATURA
- Texto corto (1-5 palabras) en columna derecha, seguido de 4 números: `[cred_teo] [cred_prac] [h_teo] [h_prac]`
- Aparece UNA SOLA VEZ por grupo de desempeños de la misma capacidad
- Puede estar partido: `Ambiente y\ndesarrollo\nsostenible` → `Ambiente y desarrollo sostenible`
- Puede tener errores tipográficos del PDF: `Fundamento s Matemáticos` → `Fundamentos Matemáticos`

### CONOCIMIENTOS
- Bloque que empieza con `Conocimientos`
- Ítems con guion: `- [texto]`
- Puede estar partido entre páginas — capturar todo hasta `Habilidades requeridas`

### HABILIDADES
- Bloque que empieza con `Habilidades requeridas`
- Ítems con guion: `- [texto]`
- Capturar hasta el siguiente `N.N.N.` o fin del fragmento

### IGNORAR — ruido del PDF
- `UNIVERSIDAD NACIONAL PEDRO RUIZ GALLO`
- `PLAN DE ESTUDIOS PROGRAMA DE EDUCACIÓN`
- `ESPECIALIDAD DE [nombre]` / `Versión: N.N` / `Página NNN de NNN` / `Fecha de actualización: [fecha]`
- Encabezados de columna: `CAPACIDADES PROFESIONALES`, `DESEMPEÑOS ESPERADOS`, `CONTENIDOS`, `ASIGNATURA`, `CRÉDITOS`, `HORAS`, `PERFIL DOCENTE`
- Perfil docente: `Licenciado en...`, `con grado de Maestro...`, `cinco años en el ejercicio...`, `capacitación en Docencia Universitaria...`
- `MÉTODOS DE ENSEÑANZA TEÓRICO PRÁCTICOS:...`
- `MÉTODOS DE EVALUACIÓN DE LOGRO DE LAS CAPACIDADES:...`

---

## REGLAS DE HERENCIA

### Regla 1 — Herencia de asignatura
Desempeño sin asignatura visible → hereda la asignatura de los otros desempeños de la misma capacidad `N.X`.

### Regla 2 — Herencia de conocimientos/habilidades (CRÍTICA — NO dejar arrays vacíos)
Desempeño SIN bloque propio de `Conocimientos`/`Habilidades requeridas` →
**copia los arrays completos del desempeño anterior de la misma capacidad**.

Ejemplo canónico:
- `1.3.1` tiene su bloque → se puebla con sus datos
- `1.3.2` aparece solo con código y texto → hereda `conocimientos` y `habilidades` de `1.3.1`

Notificar siempre en el resumen con ⚠️ cuando se aplica herencia.

### Regla 3 — Créditos y horas
`[Asignatura] N N N N` → `creditos_teoria · creditos_practica · horas_teoria · horas_practica`
Si no aparecen, heredar del objeto de esa misma asignatura ya procesado.

---

## MANEJO DE AMBIGÜEDADES — PEDIR IMAGEN

Si no se puede reconstruir con certeza alguno de estos casos:
- Nombre de asignatura ambiguo o muy partido
- Texto de desempeño cortado sin cierre claro
- Duda sobre a qué desempeño pertenece un bloque de contenidos
- Números de crédito/horas ilegibles

→ Mostrar este mensaje:

> ⚠️ **No pude identificar bien este fragmento:**
> `[copiar aquí el texto problemático]`
>
> **¿Me envías una captura de pantalla de esa sección del PDF?**
> Al verlo como imagen puedo extraer los datos con certeza.

---

## NOTAS PARA EL DESARROLLADOR — Mapeo a Supabase

| Campo JSON | Tabla.Columna |
|---|---|
| `asignatura` | `courses.name` (join ILIKE) |
| `competencias[].competencia_texto` | `courses.competencia` |
| `competencias[].capacidad_texto` | `courses.capacidad` |
| `creditos_teoria` | `courses.hours_theory` |
| `creditos_practica` | `courses.hours_practice` |
| `desempenos[].codigo` | `performances.code` |
| `desempenos[].texto` | `performances.statement` |
| `desempenos[].conocimientos` | `courses.temas_conocimientos` (jsonb[]) |
| `desempenos[].habilidades` | `courses.habilidades_desempenos` (jsonb[]) |

Join de migración: `courses.name ILIKE '%' || asignatura || '%'`
Cursos comunes (`is_common = true`): un solo `course_id` compartido entre especialidades → múltiples `performances`.
