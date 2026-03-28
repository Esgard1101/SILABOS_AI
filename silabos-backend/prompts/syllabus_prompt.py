# Prompt del Agente 1 - Generador de Silabos
# Estructura Markdown para reducir tokens vs. formato anterior en texto plano

ENFOQUE_DESCRIPCION = {
    "competencias": (
        "Orientado al desarrollo de competencias profesionales. "
        "Cada unidad especifica logros en saber (conocimientos), "
        "saber hacer (habilidades) y saber ser (actitudes). "
        "Actividades practicas medibles mediante rubricas."
    ),
    "constructivista": (
        "Enfoque constructivista: aprendizaje desde saberes previos. "
        "Actividades de aprendizaje colaborativo, trabajo en equipo "
        "y resolucion de problemas reales. Logros en terminos de "
        "comprension profunda y transferencia del conocimiento."
    ),
    "tradicional": (
        "Enfoque tradicional basado en contenidos. "
        "Clases magistrales organizadas por temas y subtemas. "
        "Evaluaciones: examenes parciales, finales y practicas calificadas. "
        "Logros en terminos de dominio de contenidos."
    ),
}

# Estructura JSON del output - definida una sola vez para reutilizar
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
  "sumilla": "Parrafo de 3-4 oraciones describiendo el curso.",
  "competencias": ["Competencia 1 en infinitivo y observable", "Competencia 2", "Competencia 3"],
  "capacidad_del_curso": "Texto literal oficial de la capacidad del curso.",
  "unidades_tematicas": [
    {"numero": 1, "titulo": "string", "semanas": "1-4", "temas": ["Tema 1.1", "Tema 1.2", "Tema 1.3", "Tema 1.4"], "logro": "Al finalizar la unidad, el estudiante sera capaz de...", "habilidades_requeridas": "Verbo principal del desempeno\\nSub-habilidad especifica 1\\nSub-habilidad especifica 2"},
    {"numero": 2, "titulo": "string", "semanas": "5-8", "temas": ["Tema 2.1", "Tema 2.2", "Tema 2.3", "Tema 2.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeno\\nSub-habilidad especifica 1\\nSub-habilidad especifica 2"},
    {"numero": 3, "titulo": "string", "semanas": "9-12", "temas": ["Tema 3.1", "Tema 3.2", "Tema 3.3", "Tema 3.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeno\\nSub-habilidad especifica 1\\nSub-habilidad especifica 2"},
    {"numero": 4, "titulo": "string", "semanas": "13-16", "temas": ["Tema 4.1", "Tema 4.2", "Tema 4.3", "Tema 4.4"], "logro": "...", "habilidades_requeridas": "Verbo principal del desempeno\\nSub-habilidad especifica 1\\nSub-habilidad especifica 2"}
  ],
  "cronograma_semanal": [
    {"semana": 1, "tema": "string", "actividad": "string", "producto": "string"},
    {"semana": 2, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 3, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 4, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 5, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 6, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 7, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 8, "tema": "Examen parcial", "actividad": "Evaluacion parcial", "producto": "Examen"},
    {"semana": 9, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 10, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 11, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 12, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 13, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 14, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 15, "tema": "...", "actividad": "...", "producto": "..."},
    {"semana": 16, "tema": "Examen final", "actividad": "Evaluacion final", "producto": "Examen"}
  ],
  "sistema_evaluacion": {
    "criterios": [
      {"nombre": "Examen Parcial", "porcentaje": 25, "descripcion": "Evaluacion escrita semana 8"},
      {"nombre": "Examen Final", "porcentaje": 25, "descripcion": "Evaluacion escrita semana 16"},
      {"nombre": "Practicas y Trabajos", "porcentaje": 30, "descripcion": "Trabajos individuales y grupales"},
      {"nombre": "Participacion", "porcentaje": 20, "descripcion": "Participacion activa en clase"}
    ],
    "nota_aprobatoria": 11,
    "observaciones": "Suma de porcentajes = 100%. Escala vigesimal 0-20."
  },
  "bibliografia": [
    {"tipo": "libro", "referencia": "Autor, A. (ano). Titulo. Editorial. DOI o URL"},
    {"tipo": "libro", "referencia": "Autor, B. y Autor, C. (ano). Titulo. Editorial. DOI o URL"},
    {"tipo": "articulo", "referencia": "Autor, D. (ano). Titulo. Revista, vol(num), pags. DOI"},
    {"tipo": "web", "referencia": "Organizacion (ano). Titulo. Recuperado de URL"}
  ]
}"""


def construir_prompt_silabo(
    datos_curso: dict,
    contexto_curricular: str,
    metodo: dict = None,
) -> str:
    """
    Construye el prompt en Markdown para generar un silabo universitario peruano.
    Adapta el contenido segun el enfoque_didactico y el metodo pedagogico recibido.

    Args:
        datos_curso: dict con nombre_curso, carrera, facultad, sumilla, etc.
        contexto_curricular: texto de documentos RAG (puede ser vacio)
        metodo: dict opcional con {name, secuencia_didactica} del metodo pedagogico
    """
    enfoque = datos_curso.get("enfoque_didactico", "competencias")
    descripcion_enfoque = ENFOQUE_DESCRIPCION.get(
        enfoque,
        ENFOQUE_DESCRIPCION["competencias"],
    )

    # Bloque de documentos curriculares (RAG)
    bloque_curricular = ""
    if contexto_curricular and contexto_curricular.strip():
        bloque_curricular = f"""
## Documentos curriculares de referencia
{contexto_curricular[:3000]}
"""
    else:
        bloque_curricular = """
## Bibliografia
Si no hay documentos de referencia cargados, genera bibliografia academica
actualizada del area del curso usando tu conocimiento de entrenamiento.
Minimo 8 referencias APA con DOI o URL verificable, publicadas desde 2018.
"""

    # Bloque del metodo pedagogico
    bloque_metodo = ""
    if metodo and metodo.get("name"):
        secuencia = metodo.get("secuencia_didactica", "")
        bloque_metodo = f"""
## Metodo Pedagogico Seleccionado
**Metodo:** {metodo["name"]}
**Secuencia didactica:** {secuencia}

INSTRUCCION CRITICA para el cronograma semanal:
Las actividades del cronograma DEBEN seguir esta secuencia en orden:
"{secuencia}"
Distribuye las fases de forma progresiva a lo largo de las 16 semanas.
NO inventes una secuencia diferente al metodo indicado.
"""

    grading_scheme = datos_curso.get("grading_scheme") or []
    grading_requires_midterm_final = bool(
        datos_curso.get("grading_requires_midterm_final")
    )
    bloque_calificacion = ""
    if grading_scheme or grading_requires_midterm_final:
        lineas_calificacion = ["## Sistema de calificacion solicitado"]
        if grading_scheme:
            lineas_calificacion.append(
                "Respeta este esquema si el docente decidio personalizarlo:"
            )
            for item in grading_scheme:
                evidencia = item.get("evidencia", "")
                sigla = item.get("sigla", "")
                porcentaje = item.get("porcentaje", 0)
                cronograma = item.get("cronograma", "")
                lineas_calificacion.append(
                    f'- {evidencia} | sigla: {sigla} | peso: {porcentaje}% | cronograma: {cronograma}'
                )
        if grading_requires_midterm_final:
            lineas_calificacion.append(
                "- Debe incluir explicitamente examen parcial y examen final."
            )
        bloque_calificacion = "\n".join(lineas_calificacion) + "\n"

    # Bloque de contexto del curso desde BD
    bloque_sumilla = ""
    sumilla = datos_curso.get("sumilla", "")
    competencia_egreso = datos_curso.get("competencia_egreso", "")
    resultado_aprendizaje = datos_curso.get("resultado_aprendizaje", "")
    capacidad = datos_curso.get("capacidad", "")

    if sumilla or competencia_egreso or resultado_aprendizaje or capacidad:
        lineas_contexto = ["## Contexto del Curso (usar tal cual, NO modificar)"]
        if sumilla:
            lineas_contexto.append(f"**Sumilla oficial:** {sumilla}")
        if competencia_egreso:
            lineas_contexto.append(f"**Competencia de egreso:** {competencia_egreso}")
        if resultado_aprendizaje:
            lineas_contexto.append(f"**Resultado de aprendizaje:** {resultado_aprendizaje}")
        if capacidad:
            lineas_contexto.append(
                f"**Capacidad oficial del curso (usar textual en la seccion IV):** {capacidad}"
            )
        bloque_sumilla = "\n".join(lineas_contexto) + "\n"

    prompt = f"""# ROL
Eres un experto en diseno curricular universitario peruano.
Generas silabos alineados al sistema educativo superior del Peru (Anexo C UNPRG).

# DATOS DEL CURSO
**Nombre:** {datos_curso.get("nombre_curso")}
**Carrera:** {datos_curso.get("carrera")} | **Facultad:** {datos_curso.get("facultad")}
**Creditos:** {datos_curso.get("creditos")} | **Horas teoria:** {datos_curso.get("horas_teoria")} | **Horas practica:** {datos_curso.get("horas_practica")}
**Semestre:** {datos_curso.get("semestre")} | **Docente:** {datos_curso.get("docente")}
**Modalidad:** {datos_curso.get("modalidad")} | **Enfoque:** {enfoque}
{bloque_sumilla}{bloque_metodo}{bloque_calificacion}{bloque_curricular}
# ENFOQUE DIDACTICO
{descripcion_enfoque}

# PROCESO DE GENERACION (seguir en orden)
PASO PREVIO - Analisis interno (no incluir en JSON):
1. Analiza la sumilla y resultado_aprendizaje para identificar contenidos y habilidades clave
2. Por cada unidad tematica, deriva UN desempeno principal con verbos taxonomicos (Bloom)
   Formato del desempeno: "Verbo accion + objeto + condicion"
   Ejemplo: "Analiza documentos curriculares identificando competencias del perfil de egreso"

PASO PRINCIPAL - Generacion del JSON:
3. Usa los desempenos del paso 2 para completar "logro" y "habilidades_requeridas" por unidad
4. Si se proporciono una capacidad oficial, copia ese texto EXACTAMENTE en "capacidad_del_curso" sin reescribirlo ni resumirlo
5. Genera el cronograma semanal SIGUIENDO la secuencia del metodo pedagogico indicado
6. Alinea los instrumentos de evaluacion a los desempenos generados

# TAREA
Genera el silabo completo en JSON con esta estructura exacta:
```json
{_JSON_OUTPUT}
```

# REGLAS
- Adapta TODOS los contenidos a la carrera y facultad especificadas
- Usa la sumilla oficial como base para la descripcion del curso (campo "sumilla" del JSON)
- Si se proporciono "Capacidad oficial del curso", el campo "capacidad_del_curso" DEBE ser exactamente ese texto
- Si se proporciono un "Sistema de calificacion solicitado", respetalo en el resultado
- Cronograma: exactamente 16 semanas (semana 8 = parcial, semana 16 = final)
- Sistema de evaluacion: los porcentajes DEBEN sumar exactamente 100%
- Bibliografia: minimo 8 referencias APA con DOI o URL verificable
- Idioma: espanol formal peruano
- Habilidades requeridas: verbo en presente + objeto + salto de linea + sub-habilidades. Maximo 3-4 lineas.
- Responde UNICAMENTE con JSON valido, sin texto adicional, sin markdown"""
    return prompt
