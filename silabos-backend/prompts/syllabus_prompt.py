# Prompt del Agente 1 — Generador de Sílabos
# Estructura Markdown para reducir tokens vs. formato anterior en texto plano

ENFOQUE_DESCRIPCION = {
    "competencias": (
        "Orientado al desarrollo de competencias profesionales. "
        "Cada unidad especifica logros en saber (conocimientos), "
        "saber hacer (habilidades) y saber ser (actitudes). "
        "Actividades prácticas medibles mediante rúbricas."
    ),
    "constructivista": (
        "Enfoque constructivista: aprendizaje desde saberes previos. "
        "Actividades de aprendizaje colaborativo, trabajo en equipo "
        "y resolución de problemas reales. Logros en términos de "
        "comprensión profunda y transferencia del conocimiento."
    ),
    "tradicional": (
        "Enfoque tradicional basado en contenidos. "
        "Clases magistrales organizadas por temas y subtemas. "
        "Evaluaciones: exámenes parciales, finales y prácticas calificadas. "
        "Logros en términos de dominio de contenidos."
    ),
}

# Estructura JSON del output — definida una sola vez para reutilizar
_JSON_OUTPUT = """{
  "datos_generales": {
    "nombre_curso": "string",
    "carrera": "string",
    "facultad": "string",
    "creditos": numero,
    "horas_teoria": numero,
    "horas_practica": numero,
    "semestre": "string",
    "docente": "string",
    "modalidad": "string"
  },
  "sumilla": "Párrafo de 3-4 oraciones describiendo el curso.",
  "competencias": ["Competencia 1 en infinitivo y observable", "Competencia 2", "Competencia 3"],
  "unidades_tematicas": [
    {"numero": 1, "titulo": "string", "semanas": "1-4", "temas": ["Tema 1.1", "Tema 1.2", "Tema 1.3", "Tema 1.4"], "logro": "Al finalizar la unidad, el estudiante será capaz de...", "habilidades_requeridas": "Verbo principal del desempeño\nSub-habilidad específica 1\nSub-habilidad específica 2"},
    {"numero": 2, "titulo": "string", "semanas": "5-8", "temas": ["Tema 2.1", "Tema 2.2", "Tema 2.3", "Tema 2.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeño\nSub-habilidad específica 1\nSub-habilidad específica 2"},
    {"numero": 3, "titulo": "string", "semanas": "9-12", "temas": ["Tema 3.1", "Tema 3.2", "Tema 3.3", "Tema 3.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeño\nSub-habilidad específica 1\nSub-habilidad específica 2"},
    {"numero": 4, "titulo": "string", "semanas": "13-16", "temas": ["Tema 4.1", "Tema 4.2", "Tema 4.3", "Tema 4.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeño\nSub-habilidad específica 1\nSub-habilidad específica 2"}
  ],
  "cronograma_semanal": [
    {"semana": 1, "tema": "string", "actividad": "string", "producto": "string"},
    {"semana": 2, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 3, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 4, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 5, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 6, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 7, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 8, "tema": "Examen parcial", "actividad": "Evaluación parcial", "producto": "Examen"},
    {"semana": 9, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 10, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 11, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 12, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 13, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 14, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 15, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 16, "tema": "Examen final", "actividad": "Evaluación final", "producto": "Examen"}
  ],
  "sistema_evaluacion": {
    "criterios": [
      {"nombre": "Examen Parcial", "porcentaje": 25, "descripcion": "Evaluación escrita semana 8"},
      {"nombre": "Examen Final", "porcentaje": 25, "descripcion": "Evaluación escrita semana 16"},
      {"nombre": "Prácticas y Trabajos", "porcentaje": 30, "descripcion": "Trabajos individuales y grupales"},
      {"nombre": "Participación", "porcentaje": 20, "descripcion": "Participación activa en clase"}
    ],
    "nota_aprobatoria": 11,
    "observaciones": "Suma de porcentajes = 100%. Escala vigesimal 0-20."
  },
  "bibliografia": [
    {"tipo": "libro", "referencia": "Autor, A. (año). Título. Editorial. DOI o URL"},
    {"tipo": "libro", "referencia": "Autor, B. y Autor, C. (año). Título. Editorial. DOI o URL"},
    {"tipo": "articulo", "referencia": "Autor, D. (año). Título. Revista, vol(num), págs. DOI"},
    {"tipo": "web", "referencia": "Organización (año). Título. Recuperado de URL"}
  ]
}"""


def construir_prompt_silabo(datos_curso: dict, contexto_curricular: str) -> str:
    """
    Construye el prompt en Markdown para generar un sílabo universitario peruano.
    Adapta el contenido según el enfoque_didactico recibido.
    """
    enfoque = datos_curso.get("enfoque_didactico", "competencias")
    descripcion_enfoque = ENFOQUE_DESCRIPCION.get(enfoque, ENFOQUE_DESCRIPCION["competencias"])

    bloque_curricular = ""
    if contexto_curricular and contexto_curricular.strip():
        bloque_curricular = f"""
## Documentos curriculares de referencia
{contexto_curricular[:3000]}
"""

    prompt = f"""# ROL
Eres un experto en diseño curricular universitario peruano.
Generas sílabos alineados al sistema educativo superior del Perú.

# DATOS DEL CURSO
**Nombre:** {datos_curso.get("nombre_curso")}
**Carrera:** {datos_curso.get("carrera")} | **Facultad:** {datos_curso.get("facultad")}
**Créditos:** {datos_curso.get("creditos")} | **Horas teoría:** {datos_curso.get("horas_teoria")} | **Horas práctica:** {datos_curso.get("horas_practica")}
**Semestre:** {datos_curso.get("semestre")} | **Docente:** {datos_curso.get("docente")}
**Modalidad:** {datos_curso.get("modalidad")} | **Enfoque:** {enfoque}
{bloque_curricular}
# ENFOQUE DIDÁCTICO
{descripcion_enfoque}

# TAREA
Genera el sílabo completo en JSON con esta estructura exacta:
```json
{_JSON_OUTPUT}
```

# REGLAS
- Adapta TODOS los contenidos a la carrera y facultad especificadas
- Cronograma: exactamente 16 semanas (semana 8 = parcial, semana 16 = final)
- Sistema de evaluación: los porcentajes DEBEN sumar exactamente 100%
- Bibliografía: mínimo 8 referencias APA con DOI o URL verificable
- Idioma: español formal peruano
- Habilidades requeridas: cada unidad didáctica tiene UNA habilidad requerida que corresponde al desempeño. Formato: verbo en presente + objeto + salto de línea + sub-habilidades específicas derivadas del desempeño. Ejemplo: "Analiza documentos curriculares\nIdentifica competencias del perfil de egreso\nExtrae desempeños del Anexo 2". Máximo 3-4 líneas por habilidad.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown"""
    return prompt
