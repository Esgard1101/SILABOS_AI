# Router de catálogos institucionales hardcodeados
# Habilidades, Métodos e Instrumentos del Anexo C UNPRG
# Son constantes; no requieren DB.

from fastapi import APIRouter

router = APIRouter(
    prefix="/catalog",
    tags=["Catálogos Institucionales"]
)

METODOS_TRONALES = [
    {
        "id": 1,
        "nombre": "Aprendizaje Basado en Problemas (ABP)",
        "descripcion": "El estudiante enfrenta situaciones problemáticas reales o simuladas que debe resolver aplicando conocimientos.",
        "tipo_actividades": ["Análisis de caso", "Debate", "Investigación grupal"],
        "tipo_evidencias": ["Informe de solución", "Exposición", "Portafolio"],
        "secuencia_didactica": "Presentación del problema → Análisis → Investigación → Solución → Presentación",
    },
    {
        "id": 2,
        "nombre": "Aprendizaje Basado en Proyectos",
        "descripcion": "Los estudiantes desarrollan un proyecto real o simulado a lo largo de la unidad o curso.",
        "tipo_actividades": ["Planificación", "Desarrollo iterativo", "Presentación"],
        "tipo_evidencias": ["Proyecto final", "Avances parciales", "Sustentación"],
        "secuencia_didactica": "Definición → Planificación → Ejecución → Evaluación → Publicación",
    },
    {
        "id": 3,
        "nombre": "Aprendizaje por Retos y Desafíos",
        "descripcion": "Se plantea un reto concreto que los estudiantes deben resolver con creatividad e innovación.",
        "tipo_actividades": ["Brainstorming", "Prototipado", "Iteración"],
        "tipo_evidencias": ["Prototipo", "Informe de reto", "Video demostrativo"],
        "secuencia_didactica": "Reto → Exploración → Ideación → Prototipo → Evaluación",
    },
    {
        "id": 4,
        "nombre": "Método de Casos",
        "descripcion": "Análisis profundo de situaciones reales para extraer conclusiones y principios aplicables.",
        "tipo_actividades": ["Lectura analítica", "Discusión", "Rol de experto"],
        "tipo_evidencias": ["Análisis escrito", "Presentación oral", "Mapa conceptual"],
        "secuencia_didactica": "Lectura → Análisis individual → Debate grupal → Síntesis → Conclusiones",
    },
    {
        "id": 5,
        "nombre": "Aprendizaje Basado en Investigación",
        "descripcion": "El docente enseña usando la lógica del método científico como eje del aprendizaje.",
        "tipo_actividades": ["Formulación de hipótesis", "Recolección de datos", "Análisis"],
        "tipo_evidencias": ["Informe de investigación", "Artículo académico", "Poster"],
        "secuencia_didactica": "Pregunta → Hipótesis → Metodología → Datos → Análisis → Informe",
    },
    {
        "id": 6,
        "nombre": "Aprendizaje por Indagación",
        "descripcion": "Los estudiantes construyen conocimiento mediante preguntas, exploración y descubrimiento.",
        "tipo_actividades": ["Observación", "Experimentación", "Formulación de preguntas"],
        "tipo_evidencias": ["Diario de indagación", "Informe de exploración"],
        "secuencia_didactica": "Pregunta → Exploración → Explicación → Elaboración → Evaluación",
    },
    {
        "id": 7,
        "nombre": "Aprendizaje Experiencial",
        "descripcion": "El aprendizaje ocurre a través de la experiencia directa, la reflexión y la conceptualización.",
        "tipo_actividades": ["Práctica de campo", "Visita", "Simulación", "Rol playing"],
        "tipo_evidencias": ["Diario reflexivo", "Informe de práctica", "Video"],
        "secuencia_didactica": "Experiencia concreta → Reflexión → Conceptualización → Experimentación activa",
    },
    {
        "id": 8,
        "nombre": "Aprendizaje Colaborativo",
        "descripcion": "Los estudiantes aprenden trabajando juntos hacia objetivos comunes con responsabilidad compartida.",
        "tipo_actividades": ["Trabajo en equipo", "Co-evaluación", "Aprendizaje entre pares"],
        "tipo_evidencias": ["Producto grupal", "Rúbrica de colaboración", "Acta de equipo"],
        "secuencia_didactica": "Formación de equipos → Asignación de roles → Trabajo → Revisión → Presentación",
    },
    {
        "id": 9,
        "nombre": "Taller",
        "descripcion": "Espacio práctico donde los estudiantes aplican conocimientos teóricos en ejercicios concretos.",
        "tipo_actividades": ["Ejercicio práctico", "Demostración", "Producción"],
        "tipo_evidencias": ["Producto del taller", "Ficha de trabajo", "Informe"],
        "secuencia_didactica": "Instrucción → Demostración → Práctica guiada → Práctica autónoma → Retroalimentación",
    },
    {
        "id": 10,
        "nombre": "Investigación-Acción Pedagógica",
        "descripcion": "El docente investiga su propia práctica y los estudiantes participan en la mejora del proceso.",
        "tipo_actividades": ["Diagnóstico", "Planificación", "Acción", "Reflexión"],
        "tipo_evidencias": ["Informe de investigación-acción", "Diario docente", "Plan de mejora"],
        "secuencia_didactica": "Diagnóstico → Plan → Acción → Observación → Reflexión → Nuevo ciclo",
    },
    {
        "id": 11,
        "nombre": "Diseño y Producción con Integración Tecnológica",
        "descripcion": "Los estudiantes diseñan y producen artefactos digitales o tecnológicos como evidencia de aprendizaje.",
        "tipo_actividades": ["Diseño", "Programación", "Producción digital", "Testeo"],
        "tipo_evidencias": ["Prototipo digital", "App", "Video", "Sitio web", "Dataset"],
        "secuencia_didactica": "Diseño → Desarrollo → Prueba → Refinamiento → Publicación",
    },
]

HABILIDADES_INSTITUCIONALES = [
    {"id": 1, "nombre": "Analiza información", "categoria": "cognitiva", "nivel": "Análisis", "verbo": "Analiza", "descripcion": "Descompone información compleja en partes para entender su estructura y relaciones."},
    {"id": 2, "nombre": "Evalúa críticamente", "categoria": "cognitiva", "nivel": "Evaluación", "verbo": "Evalúa", "descripcion": "Emite juicios fundamentados sobre la calidad, relevancia o validez de información."},
    {"id": 3, "nombre": "Sintetiza conceptos", "categoria": "cognitiva", "nivel": "Síntesis", "verbo": "Sintetiza", "descripcion": "Integra información diversa para construir nuevos conocimientos o productos."},
    {"id": 4, "nombre": "Argumenta posiciones", "categoria": "cognitiva", "nivel": "Evaluación", "verbo": "Argumenta", "descripcion": "Defiende ideas con evidencias y razonamiento lógico."},
    {"id": 5, "nombre": "Interpreta datos", "categoria": "cognitiva", "nivel": "Comprensión", "verbo": "Interpreta", "descripcion": "Extrae significado de datos, gráficos, textos o situaciones complejas."},
    {"id": 6, "nombre": "Formula problemas de investigación", "categoria": "investigativa", "nivel": "Análisis", "verbo": "Formula", "descripcion": "Identifica y define problemas susceptibles de investigación científica."},
    {"id": 7, "nombre": "Diseña metodología", "categoria": "investigativa", "nivel": "Síntesis", "verbo": "Diseña", "descripcion": "Planifica el proceso de recolección y análisis de datos de forma sistemática."},
    {"id": 8, "nombre": "Elabora informes académicos", "categoria": "investigativa", "nivel": "Síntesis", "verbo": "Elabora", "descripcion": "Redacta documentos académicos siguiendo normas APA y estructura científica."},
    {"id": 9, "nombre": "Planifica secuencias didácticas", "categoria": "pedagogica", "nivel": "Síntesis", "verbo": "Planifica", "descripcion": "Organiza actividades de aprendizaje coherentes con los objetivos curriculares."},
    {"id": 10, "nombre": "Aplica estrategias didácticas", "categoria": "pedagogica", "nivel": "Aplicación", "verbo": "Aplica", "descripcion": "Utiliza metodologías activas adecuadas al contexto y los estudiantes."},
    {"id": 11, "nombre": "Expone resultados con claridad", "categoria": "comunicativa", "nivel": "Aplicación", "verbo": "Expone", "descripcion": "Presenta información de forma clara, ordenada y pertinente ante audiencias."},
    {"id": 12, "nombre": "Redacta textos académicos", "categoria": "comunicativa", "nivel": "Síntesis", "verbo": "Redacta", "descripcion": "Produce textos formales con coherencia, cohesión y normas académicas."},
    {"id": 13, "nombre": "Usa herramientas digitales", "categoria": "tecnologica", "nivel": "Aplicación", "verbo": "Usa", "descripcion": "Emplea software y plataformas digitales para resolver tareas académicas."},
    {"id": 14, "nombre": "Analiza datos digitales", "categoria": "tecnologica", "nivel": "Análisis", "verbo": "Analiza", "descripcion": "Procesa e interpreta conjuntos de datos usando herramientas computacionales."},
    {"id": 15, "nombre": "Trabaja en equipo con responsabilidad", "categoria": "socioemocional", "nivel": "Aplicación", "verbo": "Colabora", "descripcion": "Contribuye activamente en equipos respetando roles y compromisos."},
]

INSTRUMENTOS_EVALUACION = [
    {"id": 1, "nombre": "Rúbrica analítica", "tipo": "cuantitativo", "descripcion": "Criterios detallados con niveles de desempeño para evaluar productos complejos."},
    {"id": 2, "nombre": "Lista de cotejo", "tipo": "cualitativo", "descripcion": "Verificación de presencia o ausencia de elementos en un producto o desempeño."},
    {"id": 3, "nombre": "Prueba escrita", "tipo": "cuantitativo", "descripcion": "Evaluación formal de conocimientos mediante preguntas estructuradas."},
    {"id": 4, "nombre": "Portafolio", "tipo": "cualitativo", "descripcion": "Colección de trabajos del estudiante que evidencia su progreso."},
    {"id": 5, "nombre": "Escala de valoración", "tipo": "cuantitativo", "descripcion": "Escala numérica o descriptiva para evaluar el nivel de logro."},
    {"id": 6, "nombre": "Guía de observación", "tipo": "cualitativo", "descripcion": "Registro sistemático de comportamientos y desempeños observados."},
]


@router.get("/methods")
async def listar_metodos():
    """Catálogo de 11 métodos troncales institucionales."""
    return {"methods": METODOS_TRONALES, "total": len(METODOS_TRONALES)}


@router.get("/skills")
async def listar_habilidades(categoria: str = ""):
    """Biblioteca institucional de habilidades."""
    habilidades = HABILIDADES_INSTITUCIONALES
    if categoria:
        habilidades = [
            h for h in habilidades
            if h["categoria"] == categoria
        ]
    return {
        "skills": habilidades,
        "total": len(habilidades),
        "categorias": list({
            h["categoria"]
            for h in HABILIDADES_INSTITUCIONALES
        }),
    }


@router.get("/instruments")
async def listar_instrumentos():
    """Catálogo de instrumentos de evaluación."""
    return {
        "instruments": INSTRUMENTOS_EVALUACION,
        "total": len(INSTRUMENTOS_EVALUACION),
    }
