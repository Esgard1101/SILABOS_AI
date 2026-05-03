"""Perfiles didacticos versionados para el motor de contenido.

La tabla teaching_methods queda como catalogo/UI. Estos perfiles son la fuente
pedagogica controlada para redactar actividades y evidencias sin sonar mecanico.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


STYLE_GUIDE = {
    "tone": (
        "Redaccion didactica docente: concreta, natural, observable y lista para "
        "una tabla de silabo. Evita etiquetas administrativas o frases de relleno."
    ),
    "weekly_activity": (
        "Cada actividad debe hacer visible la fase del metodo, la situacion o "
        "tarea concreta y la tecnica didactica. La fase debe funcionar como "
        "titulo pedagogico de la actividad, sin etiquetas administrativas."
    ),
    "evidence": (
        "Cada evidencia debe ser un producto verificable: ficha, matriz, informe "
        "breve, avance, prototipo, dossier, guia, sustentacion o portafolio."
    ),
    "examples": [
        {
            "knowledge": "Tablas de frecuencia. Graficos estadisticos.",
            "activity": (
                "Clasificacion, ordenamiento y representacion inicial de "
                "informacion en tablas y graficos."
            ),
            "evidence": "Tabla de frecuencia y grafico comentado.",
        },
        {
            "knowledge": "Planificacion diaria de acciones.",
            "activity": (
                "Revision de una situacion educativa y organizacion de una "
                "secuencia diaria con proposito, materiales y criterios de observacion."
            ),
            "evidence": "Borrador de planificacion diaria con criterios revisados.",
        },
    ],
}


ANTI_PATTERNS = [
    "Fundamentos conceptuales de",
    "Contexto, alcance y categorias de",
    "Principios y enfoques de",
    "Integracion diagnostica de",
    "Modelos teoricos de",
    "Procedimientos y estrategias de",
    "Analisis comparado de",
    "Producto parcial sobre",
    "Metodos de aplicacion de",
    "Criterios de diseno e intervencion en",
    "Resolucion de situaciones practicas vinculadas con",
    "Evaluacion parcial de resultados sobre",
    "Proyecto integrador aplicado a",
    "Validacion y mejora de propuestas sobre",
    "Sustentacion de evidencias y toma de decisiones en",
    "Cierre integrador y reflexion academica sobre",
]


DEFAULT_PROFILE: dict[str, Any] = {
    "code": "DEFAULT",
    "name": "Metodologia activa docente",
    "use_when": "Cuando no se reconoce un metodo especifico.",
    "work_object": "situacion de aprendizaje",
    "techniques": ["discusion guiada", "trabajo colaborativo", "retroalimentacion docente"],
    "intent": (
        "Organizar el aprendizaje desde comprension inicial, practica guiada, "
        "produccion progresiva, retroalimentacion y cierre integrador."
    ),
    "phases": [
        "Exploracion inicial",
        "Organizacion de saberes",
        "Aplicacion guiada",
        "Produccion y retroalimentacion",
        "Integracion final",
    ],
    "activity_moves": [
        "analizar una situacion o fuente vinculada con el tema",
        "organizar ideas, criterios o procedimientos",
        "aplicar lo aprendido en una tarea breve",
        "revisar avances con retroalimentacion docente",
        "sustentar o mejorar el producto integrador",
    ],
    "deliverable_pattern": (
        "Producto integrador del curso que articula los desempenos oficiales y "
        "evidencia aplicacion progresiva de conocimientos y habilidades."
    ),
    "evidence_ladder": [
        "Ficha de analisis inicial",
        "Organizador de criterios",
        "Producto breve de aplicacion",
        "Avance revisado del producto integrador",
        "Producto final sustentado",
    ],
    "verbs": ["identificar", "organizar", "aplicar", "analizar", "sustentar"],
}


METHOD_PROFILES: dict[str, dict[str, Any]] = {
    "ABDE": {
        "code": "ABDe",
        "name": "Aprendizaje Basado en Desafios",
        "use_when": "Cursos que pueden formular un reto situado y producir una solucion educativa, social o disciplinar.",
        "work_object": "reto o desafio autentico",
        "techniques": [
            "preguntas esenciales",
            "arbol del problema",
            "mapa de actores",
            "entrevista breve a usuarios",
            "design thinking",
            "prototipado rapido",
            "pitch de solucion",
        ],
        "intent": (
            "Convertir el curso en un desafio autentico: comprender la situacion, "
            "formular preguntas, investigar, proponer una solucion, probarla y comunicarla."
        ),
        "phases": [
            "Idea general y preguntas esenciales",
            "Definicion del reto e investigacion",
            "Diseno de solucion",
            "Implementacion y mejora",
            "Evaluacion y difusion",
        ],
        "activity_moves": [
            "delimitar el desafio del curso a partir de una situacion realista",
            "formular preguntas esenciales y criterios de solucion",
            "analizar fuentes, casos o datos para sustentar decisiones",
            "disenar y mejorar una propuesta de solucion",
            "socializar la solucion y recoger retroalimentacion",
        ],
        "deliverable_pattern": "Propuesta de solucion al desafio del curso con evidencias de diseno, validacion y sustentacion.",
        "evidence_ladder": [
            "Ficha de delimitacion del desafio",
            "Matriz de preguntas y criterios de solucion",
            "Borrador de propuesta de solucion",
            "Avance validado con retroalimentacion",
            "Propuesta final sustentada",
        ],
        "verbs": ["delimitar", "formular", "analizar", "disenar", "sustentar"],
    },
    "ABPRO": {
        "code": "ABPro",
        "name": "Aprendizaje Basado en Proyectos",
        "use_when": "Cursos donde el aprendizaje puede organizarse alrededor de un proyecto aplicado.",
        "work_object": "proyecto aplicado",
        "techniques": [
            "arbol de problemas",
            "lluvia de ideas",
            "plan de proyecto",
            "storyboard",
            "prototipado",
            "revision entre pares",
            "exposicion del proyecto",
        ],
        "intent": (
            "Desarrollar un proyecto progresivo: explorar un problema, planificar, "
            "producir avances, probar o revisar resultados y presentar el producto final."
        ),
        "phases": [
            "Exploracion y planteamiento del problema",
            "Investigacion y planificacion",
            "Desarrollo del proyecto",
            "Revision y mejora",
            "Presentacion final",
        ],
        "activity_moves": [
            "identificar el problema o necesidad que orienta el proyecto",
            "organizar criterios, recursos y plan de trabajo",
            "elaborar un avance verificable del proyecto",
            "contrastar el avance con criterios del curso",
            "presentar el producto final y justificar decisiones",
        ],
        "deliverable_pattern": "Proyecto aplicado del curso con avances progresivos y sustentacion final.",
        "evidence_ladder": [
            "Ficha de problema y proposito del proyecto",
            "Plan de proyecto con criterios",
            "Informe o prototipo de avance",
            "Version mejorada del proyecto",
            "Proyecto final sustentado",
        ],
        "verbs": ["identificar", "planificar", "elaborar", "mejorar", "sustentar"],
    },
    "ABI": {
        "code": "ABI",
        "name": "Aprendizaje Basado en Investigacion",
        "use_when": "Cursos que requieren indagacion, revision de fuentes, analisis de datos o construccion de argumentos con evidencia.",
        "work_object": "pregunta o problema de investigacion",
        "techniques": [
            "preguntas orientadoras",
            "revision guiada de fuentes",
            "matriz de antecedentes",
            "tutoria academica",
            "seminario de avance",
            "debate academico",
        ],
        "intent": (
            "Guiar una indagacion formativa: formular preguntas, revisar fuentes, "
            "definir un procedimiento, analizar evidencias y comunicar hallazgos."
        ),
        "phases": [
            "Identificacion del problema de investigacion",
            "Revision de fuentes",
            "Definicion metodologica",
            "Analisis de evidencias",
            "Socializacion de resultados",
        ],
        "activity_moves": [
            "formular preguntas de indagacion vinculadas al curso",
            "seleccionar y comparar fuentes academicas",
            "organizar un procedimiento de recojo o analisis",
            "interpretar evidencias y construir hallazgos",
            "presentar resultados con sustento academico",
        ],
        "deliverable_pattern": "Informe de indagacion formativa con pregunta, evidencia, analisis y conclusiones.",
        "evidence_ladder": [
            "Matriz de preguntas de investigacion",
            "Fichas de lectura comparada",
            "Esquema metodologico",
            "Reporte de hallazgos",
            "Informe de investigacion sustentado",
        ],
        "verbs": ["formular", "seleccionar", "organizar", "interpretar", "comunicar"],
    },
    "ABRP": {
        "code": "ABRP",
        "name": "Aprendizaje Basado en Resolucion de Problemas",
        "use_when": "Cursos centrados en resolver situaciones matematicas, profesionales o pedagogicas con procedimiento justificable.",
        "work_object": "problema disciplinar o contextualizado",
        "techniques": [
            "heuristicas de resolucion",
            "modelacion",
            "ficha de datos y variables",
            "resolucion guiada",
            "contraste de soluciones",
            "metacognicion del proceso",
        ],
        "intent": (
            "Trabajar problemas de manera ordenada: comprender la situacion, "
            "representar datos, elegir estrategias, ejecutar procedimientos y verificar resultados."
        ),
        "phases": [
            "Comprension del problema",
            "Organizacion de datos y relaciones",
            "Formulacion de estrategia",
            "Ejecucion del plan",
            "Verificacion e interpretacion",
        ],
        "activity_moves": [
            "leer y delimitar la situacion problematica",
            "organizar datos, variables o condiciones",
            "elegir procedimientos o modelos pertinentes",
            "resolver el problema explicando el proceso",
            "verificar resultados y comunicar conclusiones",
        ],
        "deliverable_pattern": "Dossier de resolucion de problemas con procedimiento, verificacion e interpretacion.",
        "evidence_ladder": [
            "Ficha de comprension del problema",
            "Tabla o esquema de datos y relaciones",
            "Hoja de estrategia seleccionada",
            "Caso resuelto y comentado",
            "Dossier final de resolucion sustentado",
        ],
        "verbs": ["comprender", "organizar", "formular", "resolver", "verificar"],
    },
    "ABT": {
        "code": "ABT",
        "name": "Aprendizaje Basado en Taller",
        "use_when": (
            "Cursos con produccion pedagogica, tecnica o formativa guiada: instrumentos, "
            "mapeos, sesiones, secuencias, materiales, matrices, planes o propuestas."
        ),
        "work_object": "producto pedagogico o tecnico de taller",
        "techniques": [
            "caso breve",
            "ficha de analisis del contexto",
            "modelado docente",
            "microtaller de diseno",
            "produccion guiada",
            "revision de pares",
            "lista de cotejo tecnica",
            "socializacion de productos",
        ],
        "intent": (
            "Aprender mediante produccion guiada: problematizar una necesidad, revisar "
            "criterios, observar un modelado docente, elaborar productos, ajustarlos con "
            "retroalimentacion y socializarlos con sustento."
        ),
        "phases": [
            "Problematizacion pedagogica",
            "Analisis de referentes y criterios",
            "Modelado docente",
            "Produccion guiada",
            "Revision y ajuste",
            "Socializacion del producto",
            "Cierre reflexivo",
        ],
        "activity_moves": [
            "analizar una situacion de aula o contexto profesional que justifica el producto",
            "revisar criterios, referentes y componentes necesarios para producir con pertinencia",
            "observar un modelado docente y reconocer decisiones de diseno",
            "elaborar un avance del producto con acompanamiento docente",
            "ajustar el producto usando retroalimentacion y criterios de calidad",
            "sustentar el producto y explicar las decisiones tomadas",
        ],
        "deliverable_pattern": "Portafolio de taller con productos pedagogicos revisados, mejora y sustentacion final.",
        "evidence_ladder": [
            "Ficha de analisis del contexto",
            "Matriz de criterios o referentes",
            "Borrador guiado del producto",
            "Producto ajustado con lista de cotejo",
            "Portafolio de taller sustentado",
        ],
        "verbs": ["problematizar", "analizar", "modelar", "elaborar", "ajustar", "sustentar"],
    },
    "AC": {
        "code": "AC",
        "name": "Aprendizaje Cooperativo",
        "use_when": "Cursos que necesitan trabajo en equipos con roles, interdependencia positiva y produccion compartida.",
        "work_object": "producto cooperativo con roles y aportes individuales",
        "techniques": [
            "Puzzle de Aronson",
            "grupo de investigacion",
            "COOP-COOP",
            "1-2-4",
            "cabezas numeradas",
            "contrato de equipo",
            "panel cooperativo",
        ],
        "intent": (
            "Organizar el aprendizaje en equipos: asignar roles, estudiar aportes "
            "individuales, construir acuerdos, producir en grupo y coevaluar."
        ),
        "phases": [
            "Conformacion de equipos y roles",
            "Trabajo individual responsable",
            "Intercambio y construccion grupal",
            "Produccion cooperativa",
            "Coevaluacion y cierre",
        ],
        "activity_moves": [
            "definir roles y metas compartidas",
            "preparar aportes individuales sobre el tema",
            "contrastar aportes para construir una respuesta grupal",
            "elaborar un producto cooperativo",
            "coevaluar el proceso y mejorar el producto",
        ],
        "deliverable_pattern": "Producto cooperativo final con aportes individuales, acuerdos y coevaluacion.",
        "evidence_ladder": [
            "Mapa de roles y metas del equipo",
            "Ficha de aporte individual",
            "Sintesis grupal comentada",
            "Producto cooperativo en revision",
            "Producto cooperativo final coevaluado",
        ],
        "verbs": ["coordinar", "preparar", "contrastar", "elaborar", "coevaluar"],
    },
    "ADI": {
        "code": "ADI",
        "name": "Indagacion Argumentada",
        "use_when": "Cursos que requieren argumentar con fuentes, evidencias, datos o casos.",
        "work_object": "pregunta de indagacion y argumento basado en evidencias",
        "techniques": [
            "protocolo de evidencia",
            "plantilla CER",
            "bitacora de indagacion",
            "debate cientifico",
            "revision por pares",
        ],
        "intent": (
            "Construir argumentos con evidencia: seleccionar informacion, analizarla, "
            "formular una afirmacion, sostenerla con evidencias y discutirla."
        ),
        "phases": [
            "Pregunta o reto argumentativo",
            "Seleccion de evidencias",
            "Analisis dirigido",
            "Construccion del argumento",
            "Discusion y mejora",
        ],
        "activity_moves": [
            "formular una pregunta argumentativa",
            "seleccionar evidencias pertinentes",
            "analizar datos, fuentes o casos",
            "redactar una afirmacion con sustento",
            "defender y mejorar el argumento",
        ],
        "deliverable_pattern": "Argumento academico sustentado con evidencias y revision critica.",
        "evidence_ladder": [
            "Pregunta argumentativa delimitada",
            "Matriz de evidencias",
            "Analisis dirigido de evidencias",
            "Borrador de argumento",
            "Argumento final defendido",
        ],
        "verbs": ["formular", "seleccionar", "analizar", "argumentar", "defender"],
    },
    "AE": {
        "code": "AE",
        "name": "Aprendizaje Experiencial",
        "use_when": "Cursos que parten de experiencias, practica situada, observacion y transferencia.",
        "work_object": "experiencia concreta real o simulada",
        "techniques": [
            "observacion guiada",
            "bitacora reflexiva",
            "incidente critico",
            "simulacion",
            "mapa conceptual",
            "microdiseno pedagogico",
        ],
        "intent": (
            "Aprender desde la experiencia: vivir o analizar una situacion, reflexionar, "
            "conceptualizar y aplicar lo aprendido en un nuevo contexto."
        ),
        "phases": [
            "Experiencia concreta",
            "Observacion reflexiva",
            "Conceptualizacion",
            "Experimentacion activa",
            "Transferencia",
        ],
        "activity_moves": [
            "analizar una experiencia o situacion concreta",
            "registrar observaciones y aprendizajes",
            "relacionar la experiencia con conceptos del curso",
            "aplicar criterios en una nueva tarea",
            "reflexionar sobre la transferencia lograda",
        ],
        "deliverable_pattern": "Portafolio experiencial con registro, reflexion, conceptualizacion y aplicacion.",
        "evidence_ladder": [
            "Registro de experiencia",
            "Bitacora reflexiva",
            "Mapa conceptual aplicado",
            "Plan de aplicacion",
            "Portafolio experiencial final",
        ],
        "verbs": ["experimentar", "observar", "conceptualizar", "aplicar", "reflexionar"],
    },
    "AEC": {
        "code": "AEC",
        "name": "Aprendizaje Basado en Estudio de Casos",
        "use_when": "Cursos con analisis de situaciones reales o simuladas y propuesta de decisiones fundamentadas.",
        "work_object": "caso concreto real o verosimil",
        "techniques": [
            "ficha de analisis de caso",
            "lectura guiada",
            "metodo socratico",
            "1-2-4",
            "debate focalizado",
            "plenaria",
        ],
        "intent": (
            "Aprender desde casos: comprender la situacion, identificar variables, "
            "analizar alternativas, discutir decisiones y proponer una solucion fundamentada."
        ),
        "phases": [
            "Presentacion del caso",
            "Analisis individual y grupal",
            "Discusion de alternativas",
            "Propuesta de solucion",
            "Evaluacion del caso",
        ],
        "activity_moves": [
            "leer el caso e identificar informacion clave",
            "organizar variables, actores o criterios de analisis",
            "contrastar alternativas de respuesta",
            "elaborar una solucion fundamentada",
            "sustentar decisiones y evaluar sus alcances",
        ],
        "deliverable_pattern": "Informe de caso con analisis, alternativas, decision fundamentada y sustentacion.",
        "evidence_ladder": [
            "Ficha de comprension del caso",
            "Matriz de analisis del caso",
            "Cuadro de alternativas",
            "Propuesta de solucion",
            "Informe de caso sustentado",
        ],
        "verbs": ["identificar", "organizar", "contrastar", "proponer", "sustentar"],
    },
    "CER": {
        "code": "CER",
        "name": "Modelo CER",
        "use_when": "Cursos que necesitan explicaciones basadas en afirmacion, evidencia y razonamiento.",
        "work_object": "pregunta investigable con afirmacion, evidencia y razonamiento",
        "techniques": [
            "plantilla CER",
            "analisis de datos",
            "comparacion de argumentos",
            "debate cientifico",
            "revision criterial",
        ],
        "intent": (
            "Construir explicaciones CER: formular afirmaciones, seleccionar evidencias, "
            "relacionarlas mediante razonamiento y mejorar la explicacion."
        ),
        "phases": [
            "Comprension del fenomeno o problema",
            "Formulacion de afirmacion",
            "Seleccion de evidencia",
            "Razonamiento explicativo",
            "Revision de la explicacion",
        ],
        "activity_moves": [
            "comprender el fenomeno o problema de la semana",
            "formular una afirmacion inicial",
            "seleccionar evidencias pertinentes",
            "explicar la relacion entre evidencia y afirmacion",
            "revisar la explicacion con criterios CER",
        ],
        "deliverable_pattern": "Dossier de explicaciones CER con afirmaciones, evidencias y razonamientos revisados.",
        "evidence_ladder": [
            "Ficha de fenomeno o problema",
            "Afirmacion inicial argumentable",
            "Matriz de evidencias",
            "Explicacion CER en borrador",
            "Dossier CER final revisado",
        ],
        "verbs": ["comprender", "afirmar", "seleccionar", "razonar", "revisar"],
    },
    "EMR": {
        "code": "EMR",
        "name": "Educacion Matematica Realista",
        "use_when": "Cursos matematicos que pueden partir de contextos significativos y matematizacion progresiva.",
        "work_object": "contexto significativo matematizable",
        "techniques": [
            "tarea contextualizada",
            "comparacion de estrategias informales",
            "modelo puente",
            "socializacion de estrategias",
            "formalizacion progresiva",
            "reaplicacion contextual",
        ],
        "intent": (
            "Partir de contextos reales o imaginables, matematizar progresivamente, "
            "formalizar procedimientos y transferirlos a nuevas situaciones."
        ),
        "phases": [
            "Contexto significativo",
            "Matematizacion horizontal",
            "Matematizacion vertical",
            "Formalizacion",
            "Aplicacion y reflexion",
        ],
        "activity_moves": [
            "analizar una situacion contextual significativa",
            "representar la situacion con esquemas, datos o modelos iniciales",
            "refinar procedimientos hacia formas matematicas mas generales",
            "formalizar conceptos o relaciones",
            "aplicar y explicar el modelo en nuevos problemas",
        ],
        "deliverable_pattern": "Secuencia de matematizacion con modelos, procedimientos, formalizacion y aplicacion.",
        "evidence_ladder": [
            "Ficha de situacion contextual",
            "Modelo informal o representacion inicial",
            "Procedimiento refinado",
            "Sintesis formal",
            "Secuencia de matematizacion sustentada",
        ],
        "verbs": ["analizar", "representar", "refinar", "formalizar", "aplicar"],
    },
    "ABP": {
        "code": "ABP",
        "name": "Aprendizaje Basado en Problemas",
        "use_when": "Cursos que parten de un problema abierto para activar investigacion, hipotesis, busqueda de informacion y solucion fundamentada.",
        "work_object": "problema abierto de aprendizaje",
        "techniques": [
            "lluvia de hipotesis",
            "lista de saberes previos",
            "plan de busqueda de informacion",
            "tutoria de avance",
            "discusion de alternativas",
            "presentacion de solucion",
        ],
        "intent": (
            "Partir de un problema abierto para identificar saberes previos, "
            "formular hipotesis, buscar informacion pertinente, contrastar alternativas "
            "y sustentar una solucion."
        ),
        "phases": [
            "Presentacion del problema",
            "Identificacion de saberes previos y necesidades de informacion",
            "Formulacion de hipotesis",
            "Busqueda y analisis de informacion",
            "Propuesta de solucion",
            "Reflexion y evaluacion del proceso",
        ],
        "activity_moves": [
            "analizar el problema abierto y delimitar lo que se necesita aprender",
            "organizar saberes previos, dudas e hipotesis de trabajo",
            "buscar informacion y contrastar explicaciones posibles",
            "formular una solucion fundamentada",
            "evaluar el proceso seguido y transferir aprendizajes",
        ],
        "deliverable_pattern": "Solucion fundamentada al problema abierto con evidencias de analisis, busqueda y reflexion.",
        "evidence_ladder": [
            "Ficha de comprension del problema",
            "Matriz de saberes previos e hipotesis",
            "Reporte de busqueda y contraste",
            "Propuesta de solucion fundamentada",
            "Solucion final sustentada y reflexionada",
        ],
        "verbs": ["analizar", "formular", "buscar", "proponer", "evaluar"],
    },
    "ECLECTICO": {
        "code": "ECLECTICO",
        "name": "Metodo Eclectico",
        "use_when": "Cursos que requieren combinar analisis, diseno, discusion, produccion y evaluacion porque un solo metodo resulta insuficiente.",
        "work_object": "producto integrador articulado por varias estrategias",
        "techniques": [
            "matriz de coherencia",
            "estudio de caso",
            "trabajo colaborativo",
            "taller de produccion",
            "debate focalizado",
            "revision por pares",
        ],
        "intent": (
            "Combinar tecnicas de distintas metodologias activas de manera coherente "
            "con el proposito, los contenidos, los desempenos y la evaluacion."
        ),
        "phases": [
            "Analisis de la situacion",
            "Seleccion de estrategias",
            "Diseno o produccion",
            "Discusion y mejora",
            "Evaluacion del proceso y del producto",
        ],
        "activity_moves": [
            "analizar la situacion de aprendizaje y elegir la estrategia mas pertinente",
            "organizar criterios de trabajo segun el desempeno de la unidad",
            "producir un avance con apoyo de tecnicas activas",
            "discutir y mejorar el producto con retroalimentacion",
            "evaluar la coherencia entre proceso, evidencia y logro",
        ],
        "deliverable_pattern": "Producto integrador construido mediante una combinacion coherente de estrategias activas.",
        "evidence_ladder": [
            "Matriz de coherencia metodologica",
            "Plan de trabajo integrado",
            "Avance producido con tecnica seleccionada",
            "Version revisada del producto",
            "Producto final evaluado con reflexion metodologica",
        ],
        "verbs": ["analizar", "seleccionar", "producir", "mejorar", "evaluar"],
    },
}


ALIASES = {
    "APRENDIZAJE BASADO EN DESAFIOS": "ABDE",
    "APRENDIZAJE BASADO EN DESAFÍOS": "ABDE",
    "APRENDIZAJE BASADO EN PROYECTOS": "ABPRO",
    "APRENDIZAJE BASADO EN INVESTIGACION": "ABI",
    "APRENDIZAJE BASADO EN INVESTIGACIÓN": "ABI",
    "APRENDIZAJE BASADO EN RESOLUCION DE PROBLEMAS": "ABRP",
    "APRENDIZAJE BASADO EN RESOLUCIÓN DE PROBLEMAS": "ABRP",
    "APRENDIZAJE BASADO EN PROBLEMAS": "ABP",
    "RESOLUCION DE PROBLEMAS": "ABRP",
    "RESOLUCIÓN DE PROBLEMAS": "ABRP",
    "APRENDIZAJE BASADO EN TALLER": "ABT",
    "APRENDIZAJE COOPERATIVO": "AC",
    "INDAGACION ARGUMENTADA": "ADI",
    "INDAGACIÓN ARGUMENTADA": "ADI",
    "APRENDIZAJE EXPERIENCIAL": "AE",
    "APRENDIZAJE BASADO EN ESTUDIO DE CASOS": "AEC",
    "ESTUDIO DE CASOS": "AEC",
    "MODELO CER": "CER",
    "EDUCACION MATEMATICA REALISTA": "EMR",
    "EDUCACIÓN MATEMÁTICA REALISTA": "EMR",
    "METODO ECLECTICO": "ECLECTICO",
    "MÉTODO ECLÉCTICO": "ECLECTICO",
}


def get_method_profile(code: str | None = None, name: str | None = None) -> dict[str, Any]:
    """Return a defensive copy of the pedagogical profile for a method."""
    normalized_code = (code or "").strip().upper()
    normalized_name = " ".join(str(name or "").strip().upper().split())

    key = ""
    if normalized_code:
        key = normalized_code
    if key not in METHOD_PROFILES and normalized_name:
        key = ALIASES.get(normalized_name, "")

    profile = METHOD_PROFILES.get(key) or DEFAULT_PROFILE
    return deepcopy(profile)
