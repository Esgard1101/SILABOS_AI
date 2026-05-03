# Prompt del Agente 3 - Validador Curricular
# Estructura Markdown para reducir tokens vs. formato anterior

_JSON_VALIDACION = """{
  "score": 0,
  "observaciones": [
    {"criterio": "string", "nivel": "error|advertencia|sugerencia", "mensaje": "string"}
  ],
  "sugerencias": ["string"],
  "aprobado": true,
  "audit_mode": "product_positive_dashboard",
  "dashboard_title": "Verificacion del silabo",
  "target_status_cards": [
    {
      "id": "content_coverage",
      "titulo": "Cobertura de contenidos",
      "objetivo": "Verificar que unidades y temas cubren el curso.",
      "estado": "listo|en_revision|no_verificable",
      "resumen": "string",
      "evidencia": "string",
      "siguiente_accion": "string"
    }
  ]
}"""


def construir_prompt_validacion(silabo: dict, perfil_egreso: str) -> str:
    """
    Construye el prompt en Markdown para validar un silabo contra el perfil de egreso.
    Pasa solo los campos relevantes para reducir tokens.
    """
    perfil_texto = perfil_egreso if perfil_egreso.strip() else "No disponible."

    datos = silabo.get("datos_generales", {})
    nombre_curso = datos.get("nombre_curso", "")
    docente = datos.get("docente", "")
    competencias = silabo.get("competencias", [])
    unidades = silabo.get("unidades_tematicas", [])
    evaluacion = silabo.get("sistema_evaluacion", {})
    cronograma = silabo.get("cronograma_semanal", [])
    bibliografia = silabo.get("bibliografia", [])

    resumen_unidades = ""
    for u in unidades:
        if not isinstance(u, dict):
            continue
        temas = ", ".join(str(t) for t in u.get("temas", [])[:3])
        logro = u.get("logro", "")
        habilidades = u.get("habilidades_requeridas") or u.get("required_skills", "")
        resumen_unidades += (
            f"- Unidad {u.get('numero')}: {u.get('titulo')} | Temas: {temas} | "
            f"Logro: {logro} | Habilidades: {habilidades}\n"
        )

    criterios_eval = ""
    total_pct = 0
    for c in evaluacion.get("criterios", []):
        if not isinstance(c, dict):
            continue
        criterios_eval += (
            f"- {c.get('nombre') or c.get('evidencia')}: {c.get('porcentaje')}% | "
            f"Descripcion: {c.get('descripcion', '')} | Cronograma: {c.get('cronograma', '')}\n"
        )
        try:
            total_pct += int(c.get("porcentaje", 0) or 0)
        except (TypeError, ValueError):
            pass

    resumen_cronograma = ""
    for row in cronograma[:16]:
        if not isinstance(row, dict):
            continue
        resumen_cronograma += (
            f"- Semana {row.get('semana')}: "
            f"{row.get('tema') or row.get('contenido') or row.get('conocimientos', '')} | "
            f"Actividad: {row.get('actividad', '')} | "
            f"Evidencia: {row.get('producto') or row.get('evidencia', '')}\n"
        )

    resumen_bibliografia = ""
    for fuente in bibliografia[:8]:
        if isinstance(fuente, dict):
            resumen_bibliografia += f"- {fuente.get('referencia') or fuente.get('apa_format') or fuente}\n"
        else:
            resumen_bibliografia += f"- {fuente}\n"

    prompt = f"""# ROL
Eres un verificador curricular de SILABOS.AI. Tu trabajo es convertir la auditoria en un dashboard de confianza para el producto: confirma lo que esta listo, senala solo ajustes sustentados y evita sobrediagnosticar desalineaciones.

# SILABO A VERIFICAR
**Curso:** {nombre_curso} | **Docente:** {docente}

## Competencias del curso
{chr(10).join(f"- {c}" for c in competencias)}

## Perfil de egreso de la carrera
{perfil_texto[:1500]}

## Unidades tematicas
{resumen_unidades or "No disponible."}

## Programa de contenidos / cronograma semanal
{resumen_cronograma or "No disponible."}

## Sistema de calificacion
{criterios_eval or "No disponible."}
**Total declarado:** {total_pct}% | **Nota aprobatoria:** {evaluacion.get("nota_aprobatoria", 14)}

## Bibliografia y fuentes
{resumen_bibliografia or "No disponible."}

# CRITERIOS DE EVALUACION (20 pts cada uno = 100 total)
1. **Coherencia interna** - unidades, cronograma y evaluacion se alinean entre si.
2. **Alineacion con perfil de egreso** - competencias contribuyen al perfil declarado.
3. **Secuencia logica** - progresion de menor a mayor complejidad; cronograma cercano a 16 semanas.
4. **Carga horaria y contenidos** - temas proporcionales a creditos; semanas con contenido real.
5. **Sistema de evaluacion** - porcentajes suman 100%; evidencias e instrumentos son pertinentes.

# REGLAS DE INTERPRETACION OBLIGATORIAS
- Distingue entre contenido disciplinar del curso y habilidades transversales de apoyo.
- Habilidades transversales como analizar, comunicar, investigar, usar tecnologia, colaborar o reflexionar NO son incoherencias por si mismas; se consideran beneficiosas para el egresado.
- Si las unidades y temas siguen siendo disciplinares, considera esas habilidades como aporte positivo para aplicar mejor el conocimiento del curso.
- SOLO reporta desalineacion tematica si el contenido central del curso fue reemplazado por otro campo disciplinar distinto.
- Si el perfil de egreso no esta disponible, NO asumas desalineacion; limita tu juicio a "no verificable" y evita penalizar de forma fuerte.
- Un criterio como "Participacion" NO debe marcarse automaticamente como problema si tiene descripcion observable o puede evaluarse con rubrica o lista de cotejo.
- Reporta observacion en evaluacion solo si el criterio es verdaderamente ambiguo, no medible o no guarda relacion con los desempenos del curso.
- Inspecciona especialmente el programa de 16 semanas: cobertura, secuencia, evidencias y cierre. Si hay cronograma suficiente, destacalo como evidencia positiva.
- No conviertas la ausencia de examen parcial/final en error si el esquema usa productos acreditables u otra evaluacion coherente.
- Las observaciones deben ser pocas, accionables y basadas en campos presentes del silabo, no en inferencias fragiles.

# TARJETAS OBLIGATORIAS
Devuelve exactamente 4 `target_status_cards` con estos ids:
- `content_coverage`: cobertura de contenidos y unidades.
- `weekly_sequencing`: secuencia de 16 semanas y progresion.
- `evidence_method_consistency`: consistencia entre actividades, evidencias, metodo y evaluacion.
- `apa_source_readiness`: preparacion de bibliografia/fuentes en formato APA.

Usa `estado`:
- `listo` cuando el punto esta razonablemente cubierto.
- `en_revision` cuando hay un ajuste concreto sin riesgo critico.
- `no_verificable` cuando faltan datos para afirmarlo.

# REGLAS DE NIVEL
- < 14 pts en un criterio -> `"nivel": "error"`
- 14-17 pts -> `"nivel": "advertencia"`
- 18-20 pts -> omitir (satisfactorio, no incluir)
- `aprobado` = true si score >= 70

# OUTPUT en JSON
```json
{_JSON_VALIDACION}
```
Incluye SOLO observaciones donde hay algo que mejorar.
Responde UNICAMENTE con JSON valido, sin texto adicional, sin markdown."""
    return prompt
