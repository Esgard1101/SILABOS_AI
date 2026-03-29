# Prompt del Agente 3 — Validador Curricular
# Estructura Markdown para reducir tokens vs. formato anterior

_JSON_VALIDACION = """{
  "score": 0,
  "observaciones": [
    {"criterio": "string", "nivel": "error|advertencia|sugerencia", "mensaje": "string"}
  ],
  "sugerencias": ["string"],
  "aprobado": true
}"""


def construir_prompt_validacion(silabo: dict, perfil_egreso: str) -> str:
    """
    Construye el prompt en Markdown para validar un sílabo contra el perfil de egreso.
    Pasa solo los campos relevantes para reducir tokens.
    """
    perfil_texto = perfil_egreso if perfil_egreso.strip() else "No disponible."

    # Extraer solo los campos relevantes para la validación
    datos = silabo.get("datos_generales", {})
    nombre_curso = datos.get("nombre_curso", "")
    docente = datos.get("docente", "")
    competencias = silabo.get("competencias", [])
    unidades = silabo.get("unidades_tematicas", [])
    evaluacion = silabo.get("sistema_evaluacion", {})

    # Resumen compacto de unidades (solo títulos y primeros temas)
    resumen_unidades = ""
    for u in unidades:
        temas = ", ".join(u.get("temas", [])[:3])
        logro = u.get("logro", "")
        habilidades = u.get("habilidades_requeridas", "")
        resumen_unidades += (
            f"- Unidad {u.get('numero')}: {u.get('titulo')} | Temas: {temas} | "
            f"Logro: {logro} | Habilidades: {habilidades}\n"
        )

    # Resumen de evaluación
    criterios_eval = ""
    total_pct = 0
    for c in evaluacion.get("criterios", []):
        criterios_eval += (
            f"- {c.get('nombre')}: {c.get('porcentaje')}% | "
            f"Descripcion: {c.get('descripcion', '')}\n"
        )
        total_pct += c.get("porcentaje", 0)

    prompt = f"""# ROL
Eres un auditor curricular que verifica coherencia del sílabo universitario peruano.

# SÍLABO A AUDITAR
**Curso:** {nombre_curso} | **Docente:** {docente}

## Competencias del curso
{chr(10).join(f"- {c}" for c in competencias)}

## Perfil de egreso de la carrera
{perfil_texto[:1500]}

## Unidades temáticas
{resumen_unidades}
## Sistema de calificación
{criterios_eval}**Total declarado:** {total_pct}% | **Nota aprobatoria:** {evaluacion.get("nota_aprobatoria", 14)}

# CRITERIOS DE EVALUACIÓN (20 pts cada uno = 100 total)
1. **Coherencia interna** — unidades, cronograma y evaluación se alinean entre sí
2. **Alineación con perfil de egreso** — competencias contribuyen al perfil declarado
3. **Secuencia lógica** — progresión de menor a mayor complejidad; semanas 8 y 16 con exámenes
4. **Carga horaria** — temas proporcionales a créditos; 16 semanas con contenido real
5. **Sistema de evaluación** — porcentajes suman 100%; escala vigesimal; instrumentos pertinentes

# REGLAS DE INTERPRETACION OBLIGATORIAS
- Distingue entre contenido disciplinar del curso y habilidades transversales de apoyo.
- Habilidades transversales como analizar, comunicar, investigar, usar tecnologia, colaborar o reflexionar NO son incoherencias por si mismas se considera algo beneficioso para el egresado en la competencia laboral.
- Si las unidades y temas siguen siendo disciplinares, considera esas habilidades como un aporte positivo para que el estudiante aplique mejor el conocimiento del curso.
- SOLO reporta desalineacion tematica si el contenido central del curso fue reemplazado por otro campo disciplinar distinto.
- Si el perfil de egreso no esta disponible, NO asumas desalineacion; limita tu juicio a "no verificable" y evita penalizar de forma fuerte.
- Un criterio como "Participacion" NO debe marcarse automaticamente como problema si tiene descripcion observable o puede evaluarse con rubrica o lista de cotejo.
- Reporta observacion en evaluacion solo si el criterio es verdaderamente ambiguo, no medible o no guarda relacion con los desempenos del curso.
- Si identificas un uso adecuado de habilidades transversales, consideralo satisfactorio y NO lo conviertas en observacion.

# REGLAS DE NIVEL
- < 14 pts en un criterio → `"nivel": "error"`
- 14–17 pts → `"nivel": "advertencia"`
- 18–20 pts → omitir (satisfactorio, no incluir)
- `aprobado` = true si score >= 70

# OUTPUT en JSON
```json
{_JSON_VALIDACION}
```
Incluye SOLO observaciones donde hay algo que mejorar.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown."""
    return prompt
