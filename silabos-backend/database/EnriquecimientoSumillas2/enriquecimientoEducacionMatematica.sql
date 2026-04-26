-- ─────────────────────────────────────────────────────────────
-- UPSERT enriquecido: Educ. Matemática y computación
-- 72 cursos — identificado por code
-- Columnas: hours_theory, hours_practice, prerequisites,
--   tipo_curso, naturaleza, temas_conocimientos,
--   habilidades_desempenos, actividades_metodo
-- NO toca: sumilla, competencia_egreso, is_common, scope, program_id
-- ─────────────────────────────────────────────────────────────

UPDATE courses SET
    hours_theory            = 1,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["filosofía", "objeto de estudio", "disciplinas y métodos", "su utilidad práctica", "modos de comprensión del mundo: Filosofía", "cosmovisión", "pensamiento e ideología", "el ser humano como problema", "su comprensión en integración multidimensional", "el problema del conocimiento", "su comprensión procesual sistémica", "el quehacer científico", "potencialidades y limitaciones", "ética", "moral", "axiología y filosofía política", "diferenciación", "complementariedad e importancia", "transversalidad en los actos humanos: principios", "valores", "virtudes y normas jurídicas", "derechos humanos", "problematicidad y comprensión", "interacción ciudadana: Prudencia", "Responsabilidad y compromiso social"]'::jsonb,
    habilidades_desempenos  = '["define el objeto de estudio de la filosofía", "sus disciplinas y métodos valorando su utilidad práctica", "diferencia las distintas comprensiones sobre el mundo identificándolas en acontecimientos situados", "analiza las múltiples dimensiones del ser humano comprendiéndolas de manera integral", "comprende la situación de la realidad del conocimiento y del quehacer científico en perspectiva filosófica", "define argumentativa de las nociones implicadas en la filosofía práctica", "comprende los distintos aspectos transversales de los actos humanos clarificándolas desde la ética", "analiza situaciones prácticas problematizadoras en perspectiva ética", "asume un compromiso ético en su actuar personal como futuro profesional"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1003$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["lectura", "tipos de lectura", "niveles de comprensión lectora", "estudio como proceso", "condiciones del estudio", "planificación del estudio", "estudio y trabajo en equipo", "aprendizaje autónomo", "estrategias de aprendizaje cognitivas y meta cognitivas", "estilos de aprendizaje de Kolb", "tipos de inteligencias según Gardner", "el subrayado: definición", "utilidad", "análisis de caso", "el esquema: definición", "utilidad", "clasificación", "elaboración de un esquema", "el resumen: definición", "clasificación", "utilidad", "elaboración de un resumen", "Cuadros sinópticos: definición", "utilidad", "elaboración de un cuadro sinóptico", "mapas conceptuales: definición", "utilidad", "componentes", "elaboración de un mapa conceptual", "mapas mentales: definición", "usos", "tipos de mapas mentales", "elaboración de un mapa mental", "mapa semántico: definición", "utilidad", "componentes", "elaboración de un mapa semántico", "círculo concéntrico: Definición", "utilidad", "componentes", "elaboración de un círculo concéntrico", "cuadro comparativo de doble entrada: definición", "utilidad", "elaboración del cuadro de doble entrada", "líneas de tiempo: definición", "utilidad", "elaboración de una línea de tiempo", "esquema CCP: definición", "utilidad", "elaboración de esquema", "la Chacana: definición", "utilidad", "componentes", "elaboración de la chacana"]'::jsonb,
    habilidades_desempenos  = '["capacidad de investigación básica", "pensamiento crítico y creativo", "identifica sus estilos de aprendizaje", "comprometido con el proceso de enseñanza-aprendizaje", "presenta la información haciendo uso de diferentes organizadores", "demuestra interés y responsabilidad (desempeño y rendimiento)"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1010$$;

UPDATE courses SET
    hours_theory            = hours_theory,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Práctica$$,
    temas_conocimientos     = '["diferencia actividad física", "ejercicio físico", "relaciona actividad física y salud", "estilos de vida y actividad física y riesgos del ejercicio físico"]'::jsonb,
    habilidades_desempenos  = '["ejecuta un programa de entrenamiento de la resistencia aeróbica haciendo uso del método continuo para una vida saludable"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1007$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["estructura básica del artículo científico", "considerando el perfil de la revista indizada", "Literatura: científica", "descriptiva", "histórica y bibliográfica", "atributos del artículo científico: URL", "DOI", "ISSN", "ISBN", "otros", "el artículo científico: análisis del resumen", "de la introducción", "del desarrollo", "metodología", "discusión de resultados", "lenguaje formal en el contexto en el que se encuentra y recursos tecnológicos con fines de comunicar resultados reflexivamente"]'::jsonb,
    habilidades_desempenos  = '["reconoce revistas indizadas", "utiliza la estructura básica del artículo científico considerando el perfil de la revista indizada", "reconoce revistas indizadas de acuerdo con el perfil profesional", "caracteriza artículos según el tipo de investigación: de revisión", "empíricos", "de investigación", "cartas al editor", "etc.", "reconoce la estructura del artículo científico como: título", "resumen", "palabras clave", "introducción", "desarrollo", "metodología", "discusión de resultados", "conclusiones", "referencias bibliográficas", "desarrolla el discurso utilizando el lenguaje formal del contexto en el que se encuentra", "utiliza recursos tecnológicos con fines de comunicar resultados reflexivamente", "argumenta con recursos científicos y empíricos durante la exposición", "desarrolla ideas con argumentos científicos y empíricos durante la exposición", "demuestra manejo del lenguaje oral o corporal durante el desarrollo del discurso"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1002$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["el proceso de formación del Estado peruano", "el origen histórico de Lambayeque: La cultura Lambayeque", "Lambayeque tierra de grandes señores: Chornacap y Sipán", "historia local y regional de Lambayeque", "el mestizaje cultural en Lambayeque", "la economía agroindustrial y de exportación en Lambayeque", "las grandes obras en la Región Lambayeque", "origen histórico de la Universidad Nacional pedro Ruiz Gallo", "Pedro Ruiz Gallo y su aporte a la ciencia y la tecnología", "la investigación científica en la UNPRG y su aporte a la Región Lambayeque", "innovación y transferencia tecnológica para el desarrollo nacional y regional en Lambayeque", "la preservación y difusión de la cultura en la Región Lambayeque", "una mirada desde las políticas Institucionales de la UNPRG", "identidad Local y regional en Lambayeque", "el aporte desde la sociología y la psicología", "la Arqueología y su aporte al conocimiento del pasado en la Región Lambayeque", "la Biodiversidad y su conservación en Lambayeque un aporte desde la Biología", "la lucha contra la desertificación y la sequía la investigación desde la Agronomía", "el arte y la cultura en Lambayeque y una mirada a través de su historia"]'::jsonb,
    habilidades_desempenos  = '["elabora reseña acerca de la cultura Sicán", "valora la presencia de grandes señoríos en Lambayeque", "narra oralmente acerca de la historia local y regional de Lambayeque", "elabora mapa racial en la Región Lambayeque", "localiza en un mapa productivo los productos agroindustriales de exportación en Lambayeque", "debate en torno a la importancia de las grandes obras en Lambayeque", "analiza las condiciones que dieron origen a la UNPRG", "analiza el aporte de Pedro Ruiz Gallo a la ciencia y la tecnología", "busca información en diversas fuentes sobre la Investigación en la UNPRG", "realiza estadísticas sobre la producción científica y tecnológica en la UNPRG", "investiga acerca de la actividad cultural de la UNPRG promovida desde sus políticas institucionales", "elabora infografía acerca de la identidad local y regional en Lambayeque", "valora el aporte de la arqueología regional en el conocimiento del pasado lambayecano", "elabora de un video acerca de la biodiversidad en Lambayeque", "organiza debate acerca de medidas de lucha contra la desertificación y la sequía en Lambayeque", "realiza exposición virtual de arte y cultura en Lambayeque", "organiza de una feria de exposición virtual/presencial en coordinación con otros programas acerca de la promoción y difusión del arte y cultura de Lambayeque en la UNPRG"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["origen y desarrollo de la democracia", "la actualidad de la democracia", "origen", "desarrollo y actualidad de la ciudadanía", "ciudadanía en la evolución de derechos", "perspectivas de la ciudadanía y la polarización de las ideas democráticas", "las relaciones", "organizaciones y movimientos sociales en la construcción de ciudadanía y democracia", "ciudadanía mundial", "medios de comunicación y democracia en la construcción de ciudadanía", "deberes y derechos de los estudiantes universitarios", "la Responsabilidad Social Universitaria", "política y lineamientos de la Responsabilidad Social Universitaria en la UNPRG", "cuatro pasos hacia la responsabilidad social universitaria: compromiso", "autodiagnóstico", "cumplimiento y rendición de cuentas", "proyecto de responsabilidad universitaria: datos específicos", "objetivos /general y específicos", "programación de actividades acciones y cronogramas", "impacto social"]'::jsonb,
    habilidades_desempenos  = '["analiza los acontecimientos de actualidad democrática", "analiza las potencialidades del ser ciudadano en la participación", "identifica y contextualiza problemas sociales como ciudadano mundial", "argumenta los problemas sociales y su relación con la ciudadanía y la democracia", "explica de sus deberes y derechos como estudiante universitario", "analiza la política de Responsabilidad Social Universitaria de la UNPRG", "aplica los cuatro pasos hacia la responsabilidad social universitaria y formula un proyecto de responsabilidad social universitaria"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$SOCG1001$$;

UPDATE courses SET
    hours_theory            = hours_theory,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Práctica$$,
    temas_conocimientos     = '["los procesos de creación artística", "principios de la producción artística", "los lenguajes artísticos", "dominio del espacio (Artes escénicas y plásticas visuales)", "artes de la actuación (Teatro)", "interpretación del sonido (Música)", "proyectos artísticos integrados", "curaduría y puesta en escena de la producción artística", "identidad institucional"]'::jsonb,
    habilidades_desempenos  = '["demuestra identificación institucional", "ejecuta transformación artística", "desarrolla su percepción visual", "demuestra sentido de la Comunicación", "demuestra organización", "creatividad", "innovación", "pertinencia", "analiza críticamente expresiones artísticas", "trabaja en equipo", "demuestra sentido de la responsabilidad", "desarrolla emprendimiento y creatividad"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1009$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["La historia del quechua y sus variantes: el nombre quechua", "etimología del vocablo quechua", "origen y expansión del quechua", "panalfabeto quechua de Lambayeque: vocales", "grafías", "préstamos del castellano", "expresiones básicas y las más usuales: (Diálogos). A.-Saludos y despedidas. B.- Expresiones de cortesía", "preguntas frecuentes (Diálogos): A.-Con relación a la persona", "B.-Con relación al tiempo", "C.-Con relación a la procedencia", "los verbos y sustantivos"]'::jsonb,
    habilidades_desempenos  = '["reconoce el quechua como lengua y cultura", "expresa palabras y frases con las vocales y grafías del quechua adecuadamente", "interactúa con sus pares en diálogos con expresiones adecuadas", "hace uso de reglas gramaticales en sus producciones orales y escritas"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1005$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["operaciones lógicas básicas", "inferencia inmediata. Inferencia mediata", "lógica proposicional", "razonamientos proposicionales", "cuantificadores", "fórmulas cuantificacionales", "alcances de los cuantificadores. Interpretación de fórmulas cuantificacionales", "validez de inferencias", "operaciones básicas con conjuntos y familias de conjuntos"]'::jsonb,
    habilidades_desempenos  = '["realiza inferencias inmediatas y mediatas", "aplica leyes de la lógica proposicional", "identifica cuantificadores existencial y universal", "interpreta fórmulas cuantificacionales", "discute la diagramación de clases y evaluación de la Validez de inferencias"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["pronombres y sustantivos", "artículos indefinido y definido", "adjetivos demostrativos", "calificativos y posesivos", "expresiones indicar habilidad", "consejo e instrucciones", "tiempos gramaticales en presente simple y continuo", "adverbios de grado", "tiempo y frecuencia"]'::jsonb,
    habilidades_desempenos  = '["Comprende discursos sencillos y articulados relacionados a los temas gramaticales", "comprende textos orales y escritos sencillos y articulados a los temas gramaticales", "lee textos sencillos y breves", "se expresa haciendo uso de frases sencillas describiendo lugares", "personas y su entorno", "escribe frases y oraciones sencillas siguiendo las estructuras gramaticales y vocabulario adquiridos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1009$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los Fundamentos epistemológicos de la historia de la educación", "Historia y educación: Historicidad y educabilidad. Evolución de la educación a través de la historia (antigua y medieval", "moderna y contemporánea). Historia de los sistemas educativos en sociedades avanzadas. Presente y futuro de la educación mundial. Desafíos de la educación peruana y latinoamericana. La educación en el siglo XXI: Educación", "democracia y diversidad cultural. Investigación en torno a la escuela rural en el Perú"]'::jsonb,
    habilidades_desempenos  = '["comprende los fundamentos epistemológicos de la historia de la educación", "Identifica la relación entre la historicidad y educabilidad", "Identifica los hitos relevantes en la historia de la evolución de la educación a través de la historia (antigua y medieval", "moderna y contemporánea)", "explica la historia de los sistemas educativos en sociedades avanzadas", "analiza los desafíos de la educación peruana y latinoamericana", "Investiga y caracteriza la escuela rural en la región Lambayeque y el Perú."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["El desarrollo humano multidimensional", "dimensiones del desarrollo humano: Desarrollo físico", "desarrollo cognoscitivo", "desarrollo emocional socioafectivo", "desarrollo social", "teoría cognitiva de Piaget", "enfoque cognoscitivo", "Teoría del apego", "Teoría del desarrollo sociocultural de Vygotski", "teoría de Kohlberg sobre el desarrollo moral", "Teorías de aprendizaje: Aprendizaje conductista", "aprendizaje social el constructivismo", "aprendizaje socio cultural", "aprendizaje significativo", "aprendizaje experiencial", "Teoría histórico cultural", "Teoría cognitiva social", "Teoría psicogenética", "Teoría conductista y neo conductista", "Teoría humanista", "Teoría modificabilidad cognitiva"]'::jsonb,
    habilidades_desempenos  = '["describe el planteamiento multidimensional del desarrollo humano", "caracteriza las dimensiones del desarrollo humano", "describe principios de la teoría cognitiva", "explica el planteamiento de la teoría cognitiva", "caracteriza la teoría del apego", "explica los fundamentos de la dimensión emocional", "describe las características de las teoría psicosocial", "sociocultural y moral", "diferencia los aportes de las teorías de carácter psico social", "explica fundamentos de teorías de aprendizaje", "establece semejanzas y diferencias de las teorías de aprendizaje", "caracteriza los aportes de las teorías del aprendizaje."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1002$$;

UPDATE courses SET
    hours_theory            = hours_theory,
    hours_practice          = 2,
    prerequisites           = $$Actividad Física$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Práctica$$,
    temas_conocimientos     = '["aplica el índice de masa corporal", "para determinar factores que afectan su estado de salud", "aplica el índice cintura cadera", "etc. para determinar factores que afectan su estado de salud"]'::jsonb,
    habilidades_desempenos  = '["ejecuta programas de actividad física aeróbica: step. gimnasia aeróbica", "etc. para mantener y preservar la salud", "con seguridad y responsabilidad."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1008$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Quechua Principiante$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["expresiones útiles (teoría y práctica)", "de persona: partes externas del cuerpo humano", "los cinco sentidos", "vestimenta del poblador andino", "parentesco familiar", "ciclos de la vida", "etapas de la vida", "actitud psicológica de la persona", "costumbres y tradiciones quechuas", "diálogos; los objetos y sus particularidades: wasi", "paisaje", "tiempupi ima saqra kaqkuna", "qirukuna", "kurukuna", "parlukuna (diálogos); presencia de enfermedades. (qishaykuna); sonidos y fonemas (identificando la metátesis)", "sistema consonántico", "el fenómeno de la metátesis", "expresiones matemáticas (Diálogos): yupaykuna", "simbulukuna", "signukuna; operacionkunata rurana. tullpuykunata riqsishun"]'::jsonb,
    habilidades_desempenos  = '["identifica diversas expresiones para nombrar el entorno social y cultural; produce textos sencillos de acuerdo a sus necesidades de comunicación", "discrimina sonidos de los sufijos verbales", "sustantívales y generales en las palabras y frases; domina expresiones matemáticas en la numeración", "operación y resolviendo problemas."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1006$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = hours_practice,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórica$$,
    temas_conocimientos     = '["expresión emocional", "asertividad", "autoestima", "autorrealización", "autonomía", "tolerancia al estrés", "control de impulsos", "empatía", "relaciones interpersonales", "solución de problemas", "trabajo en equipo y plan de Desarrollo Personal"]'::jsonb,
    habilidades_desempenos  = '["valora sus emociones", "evalúa su autoestima", "aplica técnicas de relajación", "argumenta sus estrategias para el control de impulsos", "valora las relaciones interpersonales", "asume roles y funciones del Trabajo en equipo", "elabora su plan de desarrollo personal."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Factores ambientales", "problemas ambientales mundiales", "nacionales", "regionales y locales", "identificación de los espacios naturales del departamento de Lambayeque", "identificación de los problemas ambientales del departamento de Lambayeque", "sostenibilidad de los recursos naturales", "el enfoque ecosistémico", "clases de educación ambiental", "el método científico", "aplicado a la formación científica sobre fenómenos ecológicos y responsabilidad social que se dan en los seres vivos", "el hombre", "y su ambiente abiótico y biótico", "biosfera", "diferencia entre ambiente y ecosistema", "diferencia entre biodiversidad y recursos naturales. Ecorregiones", "Áreas naturales protegidas", "diferencia entre protección", "Conservación y Sostenibilidad de los recursos naturales. Bienes y Servicios ambientales", "diferencia entre valor y precio de los recursos naturales", "calidad ambiental", "residuos sólidos", "reciclaje", "seguridad y salud en el trabajo", "cambio climático en Perú", "desarrollo sostenible y la responsabilidad ambiental: ambiente - sociedad – salud", "educación ambiental", "políticas ambientales en Perú", "acciones ambientales", "ciudades limpias y saludables", "legislación ambiental y derecho ambiental"]'::jsonb,
    habilidades_desempenos  = '["realiza acciones ambientales con tendencia a tener mayor sensibilidad hacia el ambiente", "Selecciona información bibliográfica en libros", "manuales y revistas especializadas sobre factores abióticos y bióticos", "elabora monografías de manera adecuada con relación a la problemática ambiental regional y local", "utiliza el método científico en el desarrollo de monografías", "analiza principales problemas ambientales del departamento de Lambayeque", "selecciona información sobre educación ambiental", "incorpora en su escala de valores la ética ambiental", "participa activamente en solución de problemas ambientales de su universidad", "identifica in situ de algunas ecorregiones del departamento de Lambayeque", "realiza acciones ambientales con tendencia a tener mayor sensibilidad y compromiso hacia el ambiente; plantea solución a problemas ambientales", "en tránsito hacia el desarrollo sostenible."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$BIOG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["repositorios de investigación científica", "gestores de recursos bibliográficos", "normas de referencia", "discos duros virtuales", "compartir archivos y directorios", "configurar permisos", "ordenamiento de datos", "filtros y validación de datos", "resumen de datos", "fórmulas", "gráficos estadísticos", "tablas y gráficos dinámicos", "presentadores digitales", "efectos y animaciones", "insertar elementos multimedia locales o de la web y secuencialización de la presentación"]'::jsonb,
    habilidades_desempenos  = '["recolecta información científica haciendo uso de repositorios digitales", "aplica las normas de referencias en trabajos académicos", "comparte información haciendo uso de herramientas digitales de Internet", "aplica permisos de acceso haciendo uso de discos duros virtuales", "procesa datos haciendo uso de las herramientas de hoja de cálculo", "presenta información relevante haciendo uso de presentadores digitales", "inserta elementos multimedia locales o de la web considerando las herramientas del presentador digital", "realiza la secuencia y tiempo de presentación de la información haciendo uso del presentador digital."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CYEG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Lógica Simbólica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["visión general de los sistemas de números", "ecuaciones polinómicas y racionales", "inecuaciones polinómicas y racionales", "funciones", "representación de funciones", "operaciones con funciones", "modelos lineales y no lineales", "razones y proporciones", "magnitudes proporcionales", "conversiones y escalas", "regla de tres y Porcentajes"]'::jsonb,
    habilidades_desempenos  = '["reconoce los sistemas de números", "resuelve ecuaciones e inecuaciones", "representa gráficamente los diversos tipos de funciones", "elabora modelos matemáticos básicos", "reconoce las magnitudes proporcionales y resuelve problemas de reparto proporcional."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATG1002$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Inglés I: A1$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Sustantivos contables e incontables", "expresiones indicar existencia y deseo", "cuantificadores", "Preposiciones de lugar", "adjetivos", "adjetivos comparativos y superlativos", "tiempos gramaticales en pasado y futuro simple y expresiones de tiempo"]'::jsonb,
    habilidades_desempenos  = '["Comprende discursos sencillos y articulados relacionados a los temas gramaticales", "comprende textos orales y escritos sencillos y articulados a los temas gramaticales", "lee textos sencillos y breves", "se expresa haciendo uso de frases sencillas describiendo lugares", "personas y su entorno", "escribe frases y oraciones sencillas siguiendo las estructuras gramaticales y vocabulario adquiridos."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1010$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los fundamentos de la filosofía de la educación", "Concepción del mundo y de la vida. La concepción del hombre. La concepción de la educación. Fundamentos éticos y valorativos de la educación. La filosofía de los sistemas pedagógicos actuales. Enfoques actuales de la educación: praxis educativa. Educación", "sociedad y cultura. Educación y diversidad social. Desafíos de la educación actual"]'::jsonb,
    habilidades_desempenos  = '["Identifica el concepto y contenido de la filosofía de la educación", "argumenta una concepción del hombre y la educación", "Define los fundamentos éticos y valorativos de la educación", "Analiza la filosofía de los sistemas pedagógicos actuales", "Relaciona los enfoques actuales de la educación y el desarrollo social y Establece los aportes y las implicancias de la filosofía en la educación."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1003$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Teorías del aprendizaje$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["de la psicología cognitiva", "Teorías psicológicas y procesos cognitivos", "la inteligencia social", "la inteligencia emocional", "psicología positiva", "educación emocional", "autoconocimiento emocional", "las inteligencias múltiples", "la Teoría de la mente", "las inteligencias múltiples", "la inteligencia social", "la inteligencia emocional", "psicología positiva", "educación emocional", "autoconocimiento emocional"]'::jsonb,
    habilidades_desempenos  = '["discrimina los aportes de las teorías de la psicología cognitiva", "describe fundamentos de las teorías psicológicas", "explica los fundamentos de la psicología cognitiva", "describe características de cada inteligencia múltiple", "describe los principios de la teoría de la mente", "establece diferencias entre las inteligencias múltiples", "analiza los aportes psicopedagógicos de las inteligencias múltiples", "define los planteamientos de las teorías psicológicas", "establece diferencias entre inteligencia social e inteligencia emocional", "explica el aporte de las teorías psicológicas implicadas en los procesos de aprendizaje."]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1004$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Fundamentos Matemáticos$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las funciones reales y sus operaciones", "la determinación de límites y el análisis de la continuidad de una función"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATS1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los conjuntos", "la inclusión", "operaciones con conjuntos", "cardinalidad", "sistemas de los números naturales y enteros", "inducción matemática", "múltiplos y divisores", "MCM y MCD", "números primos", "divisibilidad", "división entera y ecuaciones diofánticas"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1060$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los segmentos", "ángulos", "triángulos", "congruencia de triángulos", "cuadriláteros", "proporcionalidad", "semejanza de triángulos", "circunferencias", "relaciones métricas y áreas de regiones planas"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1063$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Herramientas digitales$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la historia de la computación", "hardware", "software", "sistemas operativos", "redes e internet", "mantenimiento de computadoras", "procesadores de texto", "hojas de cálculo", "presentaciones de diapositivas", "bases de datos", "diseño gráfico y edición de audio y video"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1061$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los lenguajes de programación", "resolución de problemas", "datos", "representación de algoritmos", "diagramas de flujo y Nassi- Schneiderman", "pseudocódigo", "estructura general de un programa", "programación estructurada", "subprogramas", "procedimientos y funciones", "estructuras de datos", "cadenas de caracteres", "archivos", "ordenación", "búsqueda e intercalación", "búsqueda", "ordenación y función externas", "estructuras dinámicas", "estructuras de datos no lineales", "recursividad", "programación orientada a objetos y relaciones"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1062$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Filosofía de la educación$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Aproximación a la pedagogía como ciencia", "el pensamiento pedagógico en la historia", "modelos pedagógicos contemporáneos y sus fundamentos", "problemas pedagógicos actuales", "la pedagogía y su relación con las ciencias de la educación", "Las ideas pedagógicas en el Perú y América Latina"]'::jsonb,
    habilidades_desempenos  = '["Explica los componentes y leyes de la pedagogía como ciencia", "Comprende el desarrollo de las ideas pedagógicas en la historia", "analiza los modelos pedagógicos contemporáneos y sus fundamentos", "Identifica los problemas pedagógicos actuales", "explica la relación entre la pedagogía y las ciencias de la educación", "comprende las ideas pedagógicas en el Perú y América Latina"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1023$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Psicología cognitiva$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["enfoques de acción tutorial", "áreas de intervención", "técnicas e instrumentos de intervención tutorial", "estrategias", "planes y programas de acción tutorial", "técnicas e instrumentos de evaluación de la acción tutorial"]'::jsonb,
    habilidades_desempenos  = NULL,
    actividades_metodo      = '["analizar los diversos enfoques para intervenir preventivamente en los conflictos que se presenten en el aula", "Determinar las características de la tutoría", "diseñar los instrumentos a utilizar para intervenir preventivamente en las diferentes áreas de la tutoría que se presenten en el aula", "desarrolla estrategias para la aplicación del plan de orientación y acción tutorial grupal", "maneja técnicas e instrumentos para la evaluación del plan de orientación y acción tutorial a nivel individual, grupal y familiar"]'::jsonb
WHERE code = $$CEDE1022$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Análisis Matemático I: Funciones y Límites$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la derivada de una función", "reglas de derivación", "aplicaciones de las derivadas", "integral definida", "cálculo de áreas y volúmenes y otras aplicaciones", "integrales de funciones reales y métodos de integración"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATS1003$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Álgebra I: Teoría de conjuntos y números enteros$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Sistemas de números racionales y reales", "exponentes y radicales", "productos notables", "factorización", "fracciones algebraicas", "binomio de Newton", "ecuaciones", "inecuaciones", "logaritmos"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1106$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Geometría I: Planimetría$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Rectas y planos en el espacio", "ángulos poliedros", "poliedros", "poliedros regulares", "prisma y pirámide", "sólidos de revolución", "cilindros", "conos", "esferas"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1108$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["diseño web", "tipos de páginas web y de sitios web", "estructura de una página web", "versiones de HTML", "navegadores web y sus diferencias", "software para diseño web", "construyendo una página web con HTML 5", "las etiquetas de HTML 5 y sus atributos", "dar formato a un texto web", "enlaces y navegación", "imágenes", "audio y video", "manejo de tablas", "manejo de formularios", "hojas de estilos en cascada CSS3", "incluir hojas de estilo en HTML 5", "dar formatos de estilo con CSS3", "aplicar estilos a selectores", "agregar funcionalidades con Javascript", "publicación de un sitio web. Dominio y Hosting", "diseño web de páginas y sitios web con WiX y diseño web de páginas y sitios web con Wordpress"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas", "elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1107$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Fundamentos de programación$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["programación estructurada", "algoritmos", "diagramas de flujo y programas en C", "estructuras algorítmicas", "funciones", "arreglos", "caracteres y cadenas de caracteres", "estructuras y uniones", "archivos de datos", "programación orientada a objetos", "el lenguaje Java", "sintaxis del lenguaje", "objetos y clases", "interfaces", "excepciones y paquetes", "aplicaciones java", "interfaces de usuario", "applets de java y procesos", "canales y sockets"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas", "elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1109$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Pedagogía$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Currículo Nacional de Educación Básica Regular", "vinculación estratégica con el currículo departamental", "el PEI, PAT, PCI, de la institución educativa", "definiciones curriculares polisémicas", "historia y alcance conceptual", "tipos de currículos: carácter, enfoques, principales actores,(educativos, económicos, políticos y tecnológicos)", "principales teorías curriculares y modelos", "metodología sistémica de elaboración de currículo: elementos, procesos y productos", "el diseño como proceso y sus elementos", "niveles de diversificación y las derivaciones del PCI", "análisis y elaboración propositiva de los componentes curriculares", "lineamientos operativos metodológicos", "como se elabora los componentes curriculares: diagnóstico, perfil etc."]'::jsonb,
    habilidades_desempenos  = '["identificar los puentes curriculares entre el currículo nacional y el currículo departamental", "contrasta como se tributan el PEI, PAT, para el diseño del PCI", "Identifica la concepción y la teoría curricular que maneja un docente", "caracteriza los elementos del diseño curricular", "analiza un componente curricular", "propone la elaboración de los componentes curriculares", "identifica las diferentes metodologías para levantar los componentes curriculares como propuesta", "plantea sugerencias, para elaborar los componentes curriculares"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo y análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1005$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["bases epistemológicas de la investigación cuantitativa", "procesos y fases de la investigación con metodología cuantitativa", "problema de investigación", "fuentes para la generación de ideas", "estrategias para desarrollar ideas que detonen en proyectos", "criterios para la selección de un problema", "planteamiento del problema en la ruta cuantitativa", "supuestos epistemológicos", "los objetivos de la investigación", "Justificación de la investigación", "el marco teórico", "formulación de la hipótesis", "elaboración del diseño de investigación", "población y técnicas de muestreo", "técnicas e instrumentos de investigación", "marco administrativo"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el enfoque de investigación cuantitativa", "diferencia los fundamentos de la investigación cuantitativa", "identifica los tipos de investigación cuantitativa", "explica fundamentos de la epistemología para las ciencias sociales", "Identifica problemas de estudio", "delimita problema de investigación en el ámbito educativo", "diferencia los rasgos característicos del tipo de investigación", "define fuentes de generación de ideas", "determina problemas de intervención cualitativa", "describe problemas de ruta cualitativa", "recolecta información", "elabora instrumentos", "determina población y técnicas de muestreo", "valida aplicación de instrumentos", "establece el marco teórico y administrativo"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo y análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1006$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Escuela y comunidad", "observación participante y no participante", "construcción de instrumentos de observación", "la encuesta como medio para observar la comunidad", "cuestionario y escala de Likert", "diálogos", "historias y otras miradas entre la escuela y la comunidad", "la entrevista en profundidad", "el documental como estrategia de reflexión sobre la práctica"]'::jsonb,
    habilidades_desempenos  = '["Elabora instrumentos de investigación tales como entrevista, encuesta y relato etnográfico", "procesa la información recogida", "aplicando técnicas de sistematización"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1008$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Análisis Matemático II: Cálculo diferencial e integral$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las ecuaciones diferenciales", "modelación con ecuaciones diferenciales", "la transformada de Laplace y las series de Fourier"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATS1005$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Geometría II: Estereometría$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los sistemas de coordenadas", "distancia entre dos puntos", "la recta", "ecuaciones de la recta", "las ecuaciones de la circunferencia", "parábola", "elipse e hipérbola", "ecuación general de segundo grado", "ecuaciones paramétricas", "puntos y segmentos en el espacio", "ecuación del plano y ecuación de la recta"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1155$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Fundamentos de computación$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las redes de computadoras", "hardware de redes", "software de redes", "los modelos OSI y TCP/IP", "estándares en redes", "la capa física de las redes", "la capa de enlaces de datos", "la subcapa de control de acceso al medio", "la capa de red", "la capa de transporte", "la capa de aplicación y seguridad en redes"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1157$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Diseño web$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la historia de PHP y MySQL", "instalar PHP y MySQL", "software para desarrollo con PHP y MySQL", "XAMPP vs WAMP", "etiquetas PHP", "variables", "constantes y tipos de datos", "operadores", "estructuras de control", "funciones", "cadenas de caracteres y expresiones regulares", "conjuntos de datos tipo array", "formularios", "programación orientada a objetos", "ficheros y almacenamiento de datos", "bases de datos", "PHP y MySQL", "sesiones y cookies", "archivos XML", "gráficos con PHP", "gestión de errores", "conexiones", "creación de archivos y publicación web"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1156$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Teoría Curricular$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la didáctica como ciencia social", "el proceso formativo", "sus dimensiones", "el proceso de enseñanza aprendizaje", "sus componentes internos y externos", "los enfoques sistémico", "analítico", "holístico dialéctico que sustentan el proceso de enseñanza aprendizaje y las principales estrategias para la asimilación de conocimientos", "el desarrollo de capacidades y la formación de valores"]'::jsonb,
    habilidades_desempenos  = '["la capacidad para planificar", "diseñar y ejecutar los procesos didácticos", "diseña estrategias de enseñanza aprendizaje para la asimilación de conocimiento", "diseña estrategias de enseñanza aprendizaje para el desarrollo de capacidades", "diseña estrategias de enseñanza aprendizaje para la formación de valores"]'::jsonb,
    actividades_metodo      = '["análisis y comentario de textos seleccionados", "promoviendo la investigación y la elaboración del conocimiento con pensamiento crítico y creativo"]'::jsonb
WHERE code = $$CEDE1014$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["paradigma interpretativo de investigación", "enfoques de investigación cualitativa y de Investigación - Acción", "bases epistemológicas de la investigación cualitativa", "proceso y fases de la investigación con metodología cualitativa", "fuentes para la generación de ideas", "estrategias para desarrollar ideas que detonen en proyectos", "criterios para la selección de un problema", "planteamiento del problema en la ruta cualitativa", "supuestos epistemológicos", "los objetivos de la investigación", "Justificación de la investigación", "el marco teórico", "la formulación de la hipótesis", "elaboración del diseño de investigación", "población y técnicas de muestreo", "técnicas e instrumentos de investigación", "marco administrativo"]'::jsonb,
    habilidades_desempenos  = '["justifica la investigación", "demuestra su viabilidad", "evalúa las deficiencias en el conocimiento del problema de investigación", "elabora marco teórico", "formula hipótesis", "elabora el diseño de investigación", "determina población y técnicas de muestreo", "selecciona técnicas e instrumentos de investigación", "establece el marco administrativo", "explica fundamentos del paradigma interpretativo", "describe características de los tipos de investigación", "identifica procesos y fases de la investigación cualitativa", "genera ideas a partir de fuentes y desarrolla ideas que detonan en proyectos", "plantea problemas en la ruta cualitativa"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo y análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1007$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional I: Comunidad y Escuela$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la cultura escolar", "componentes y perspectivas teóricas", "tradición estructural funcionalista", "tradición interpretativa", "el cuestionario: utilidad y construcción; cultura escolar y culturas juveniles en la escuela", "cultura e identidad en los adolescentes; ritos", "tradiciones y otras prácticas sociales en la escuela", "culturas y contraculturas de los adolescentes", "la etnografía en la investigación educativa: de la observación a la entrevista a profundidad", "el relato etnográfico", "el nuevo rol de los directivos en procesos de gestión y liderazgo", "la historia de vida en la investigación educativa", "actores indirectos que impactan en el proceso educativo"]'::jsonb,
    habilidades_desempenos  = '["caracteriza la cultura escolar", "sus componentes y perspectivas teóricas", "caracteriza las culturas y contraculturas de los adolescentes", "elabora instrumentos de investigación etnográfica tales como encuesta", "entrevista e historias de vida"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1009$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Álgebra II: Números racionales y reales$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las ecuaciones lineales", "sistemas de ecuaciones lineales", "matrices", "operaciones con matrices", "determinante de una matriz", "vectores", "operaciones con vectores y espacios vectoriales"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATS1009$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Geometría analítica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los sistemas de medición angular", "longitud de arco", "área de un sector circular", "razones trigonométricas", "resolución de triángulos", "identidades trigonométricas", "funciones trigonométricas", "funciones trigonométricas inversas y ecuaciones trigonométricas"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1208$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la naturaleza de la didáctica de la matemática", "teorías psicológicas y psicopedagógicas", "El valor formativo y cultural de las matemáticas", "procesos cognitivos y metacognitivos en las matemáticas", "lenguaje y matemáticas", "las representaciones en matemáticas", "las competencias matemáticas", "uso didáctico de la historia en las matemáticas", "el aprendizaje de las matemáticas", "estrategias de aprendizaje en matemáticas", "el trabajo colaborativo en el aprendizaje de las matemáticas", "el aula invertida aplicada al aprendizaje de las matemáticas", "la gamificación para el aprendizaje de la matemática", "aprendizaje Basado en Problemas en matemáticas", "aprendizaje Basado en Proyectos en matemáticas", "dificultades de aprendizaje en las matemáticas", "el error en el aprendizaje de las matemáticas", "la intuición y la matemática", "la neurodidáctica de las matemáticas y la resolución de problemas en matemáticas"]'::jsonb,
    habilidades_desempenos  = '["explica principios de las teorías", "argumenta y contrargumenta respecto a una tesis", "formula estrategias de abordaje de los principios", "aplica los principios a situaciones de aprendizaje", "redacta artículos y comunica según el formato de estilo APA"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1206$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la introducción al pensamiento computacional", "introducción a Scratch", "secuencias y loops", "paralelismos", "eventos", "condicionales", "operadores y datos", "problemas de matemática abordables con Scratch", "descomposición del problema", "reconocimiento de patrones", "abstracción y algoritmos e implementación de algoritmos en Scratch"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1207$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica General$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["alcance conceptual del curso", "su relación con la comunidad de aprendizaje y enseñanza y su relación con los modelos de enseñanza como la indagación y otros", "la planificación curricular: niveles", "tipos", "elementos y características", "la programación curricular anual", "su estructura y cualidades", "planificación curricular: Unidades didácticas", "planificación de unidades didácticas: estructuras", "características", "elementos según el tipo de unidad", "planificación curricular: sesión de aprendizaje", "planificación de sesiones o experiencias de aprendizaje: estructuras", "características", "elementos según tipo de unidad", "planificación curricular: sesión de aprendizaje", "planificación de sesiones o experiencias de aprendizaje: estructuras", "características", "elementos"]'::jsonb,
    habilidades_desempenos  = '["identifica la estructura de la programación anual", "organiza los aprendizaje de acuerdo a los componentes de la programación anual", "prioriza los propósitos de aprendizaje de acuerdo al nivel de organización", "Identifica la estructura de la unidad didáctica", "organiza los aprendizajes de acuerdo a los componentes de la unidad didáctica", "prioriza los propósitos de aprendizaje de una unidad didáctica", "identifica la estructura de la sesión de aprendizaje", "organiza los aprendizajes de acuerdo a los componentes de la sesión de aprendizaje y prioriza los propósitos de aprendizaje de una sesión de aprendizaje"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1051$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["recolección de datos en la ruta cuantitativa", "fases para la recolección de datos", "principales técnicas e instrumentos", "cuestionarios y escalas de medición de actitudes", "la entrevista estructurada", "la guía de observación", "fases para la elaboración de instrumentos de recojo de datos con metodología cuantitativa", "construcción de encuestas", "entrevistas", "guías de observación", "la validez y confiabilidad de los instrumentos"]'::jsonb,
    habilidades_desempenos  = '["aplica pruebas estadísticas", "recolecta datos en la ruta cuantitativa", "aplica técnicas e instrumentos", "recolecta información", "elabora instrumentos y valida aplicación de instrumentos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1016$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional II: Cultura Escolar$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la planificación micro curricular", "las unidades didácticas", "las sesiones de aprendizaje", "sesiones simuladas", "los modelos e importancia de la Investigación-Acción para mejorar la práctica docente; diagnóstico: el contexto cultural y las características e intereses de los estudiantes que influyen en el aprendizaje de su disciplina", "diálogo entre la teoría y la práctica: diseño de las planeaciones fundamentadas como hipótesis de acción", "intervención didáctica: conocimiento y reflexión en la acción", "reflexión sobre la práctica docente: planeación-intervención-evaluación"]'::jsonb,
    habilidades_desempenos  = '["Explica la importancia de la investigación-acción para mejorar la práctica pedagógica", "diseña sesiones de aprendizaje fundamentadas", "que le permiten desarrollar sesiones pertinentes con el contexto de la institución educativa y las características de los estudiantes", "elabora una reflexión y análisis de su práctica en aula", "haciendo uso del registro anecdótico y los diarios de campo", "sustenta su ensayo crítico de reflexión de su práctica", "incorporando las mejoras a que hubiere lugar"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1010$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la estadística", "variables", "tablas de frecuencia", "gráficos estadísticos", "medidas de tendencia central", "dispersión", "posición y de forma", "coeficiente de correlación", "experimentos", "espacio muestral", "eventos", "probabilidad", "principio de conteo", "probabilidad condicional", "teorema de Bayes", "distribuciones de probabilidad y esperanza matemática"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1250$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las progresiones y series aritméticas y geométricas", "porcentajes", "interés y descuento simple", "interés y descuento compuesto", "anualidades y amortizaciones", "rentas", "bonos y seguros de vida"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATS1015$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Fundamentos de la didáctica de la matemática$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["el sentido numérico y su desarrollo", "la construcción de los sistemas de numeración", "nociones y formalización de los números naturales y enteros", "la resolución de problemas numéricos", "pensamiento algorítmico y heurístico", "operaciones con números naturales y enteros y su naturaleza", "el aprendizaje situado de los sistemas numéricos", "noción y formalización de las fracciones y los racionales", "operaciones con números racionales y su naturaleza", "noción y formalización de los números reales", "operaciones con números reales y su naturaleza", "de la situaciones concretas a su formalización simbólica", "la generalización de los números", "sus relaciones y operaciones", "abordaje de relaciones de igualdad y de orden", "aprendizaje situado y aprendizaje del álgebra", "dificultades en el aprendizaje de los números", "errores en el aprendizaje de los números y estrategias didácticas para el aprendizaje los números"]'::jsonb,
    habilidades_desempenos  = '["explica principios de las teorías", "argumenta y contrargumenta respecto a una tesis", "formula estrategias de abordaje de los principios", "aplica los principios a situaciones de aprendizaje", "redacta artículos y comunica según el formato de estilo APA"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1249$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Fundamentos de pensamiento computacional$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la introducción a APP Inventor MIT", "pensamiento computacional a través de la programación para móviles", "desarrollo de un video juego con APP Inventor", "proyectos con APP Inventor y desarrollo de video juegos con Python"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1251$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Planificación Didáctica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Evaluación del aprendizaje como parte de la evaluación Educativa", "Alcance conceptual", "ejes epistémicos", "principales definiciones", "supuestos y problemáticas", "La evaluación del aprendizaje: enfoques", "objeto", "dominio", "niveles", "características", "funciones", "tipos", "clasificación y planeamiento del proceso de evaluación del aprendizaje", "Técnicas e instrumentos de evaluación"]'::jsonb,
    habilidades_desempenos  = '["identifica que concepción y enfoque de evaluación maneja su docente", "Diseña un instrumento de evaluación", "Aplica el instrumento durante sus prácticas profesionales"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1017$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cualitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["recolección de datos con enfoques cualitativos y de investigación acción", "unidades de análisis", "técnicas de observación participante", "la entrevista en profundidad", "grupos de enfoque", "biografías e historias de vida", "los diarios de campo", "criterios de validación de instrumentos", "técnicas para la sistematización de la información", "análisis de los datos cualitativos: codificación abierta", "axial y selectiva", "Generación de conceptos", "categorías", "temas", "descripciones", "diseño cualitativo (etnográfico, fenomenológico, hermenéutico, teoría fundamentada, estudio de caso, narrativo biográfico) a las circunstancias de la investigación (el ambiente, los participantes y el trabajo de campo)"]'::jsonb,
    habilidades_desempenos  = '["aplica instrumentos", "analiza tipos de instrumentos", "determina formas de recolección de información", "aplica técnicas para la sistematización de la información", "analiza datos cualitativos: codificación abierta", "axial y selectiva", "genera conceptos", "categorías", "temas", "descripciones y adapta diseños cualitativos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1015$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional III: Reflexión de la práctica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["principios educativos de la enseñanza situada", "estrategias para desarrollar el aprendizaje situado", "diagnóstico: el contexto cultural y las características e intereses de los estudiantes de secundaria", "diseño de planeaciones fundamentadas", "intervención didáctica: Conocimiento en la acción y reflexión en la acción", "recuperación de las evidencias de su desempeño docente", "clasificación y análisis de las evidencias", "propuestas de mejora de su práctica docente futura"]'::jsonb,
    habilidades_desempenos  = NULL,
    actividades_metodo      = NULL
WHERE code = $$CEDE1011$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Estadística descriptiva y probabilidades$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la población y muestra", "inferencia estadística", "muestreo", "parámetros poblacionales y estadísticos muestrales", "intervalos de confianza", "hipótesis estadísticas", "significancia", "errores tipo I y II", "potencia de una prueba", "pruebas de hipótesis", "análisis de varianza", "regresiones y pruebas no paramétricas"]'::jsonb,
    habilidades_desempenos  = '["Matematiza situaciones contextualizadas", "construye representaciones gráficas", "representa simbólicamente", "formular y aplica estrategias de resolución", "comunica matemáticamente y utiliza la tecnología"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$ESTS1016$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Didáctica de los números y el álgebra$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["el origen de la geometría y su naturaleza", "finalidades del aprendizaje de la geometría", "abordaje histórico del aprendizaje de la geometría", "conexiones de la geometría con la naturaleza y el arte", "formas y figuras", "razonamiento inductivo y deductivo", "la visualización en el aprendizaje de la geometría", "las representaciones gráficas", "el lenguaje simbólico en la geometría y trigonometría", "la teoría de Van Hiele", "la resolución de problemas en geometría", "el papel de la geometría dinámica", "generalización de relaciones geométricas y trigonometría", "algebrización de relaciones geométricas y trigonometría", "aprendizaje situado en geometría y trigonometría", "dificultades en el aprendizaje de la geometría y trigonometría", "errores en el aprendizaje de la geometría y trigonometría", "estrategias didácticas en geometría y trigonometría"]'::jsonb,
    habilidades_desempenos  = '["explica principios de las teorías", "argumenta y contrargumenta respecto a una tesis", "formula estrategias de abordaje de los principios", "aplica los principios a situaciones de aprendizaje", "redacta artículos y comunica según el formato de estilo APA"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1295$$;

UPDATE courses SET
    hours_theory            = 3,
    hours_practice          = 2,
    prerequisites           = $$Pensamiento computacional: aplicado$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["el pensamiento computacional para resolver situaciones o problemas matemáticos", "Scratch para resolver situaciones o problemas matemáticos", "aplicaciones en Scratch", "aplicaciones móviles en APP Inventor para resolver situaciones o problemas matemáticos y uso de otras aplicaciones tecnológicas para desarrollar software aplicado a resolver situaciones o problemas matemáticos"]'::jsonb,
    habilidades_desempenos  = '["explica los fundamentos", "determina la pertinencia de uso de recursos", "identifica necesidades que se pueden abordar con tecnologías", "planifica proyectos educativos", "diseña soluciones con uso de recursos tecnológicos", "ejecuta y monitorea el desarrollo de proyectos", "evalúa la pertinencia de las soluciones desarrolladas y elabora diseños metodológico y guías"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1296$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las teorías psicopedagógicas que sustentan el uso de las tecnología para el aprendizaje: constructivismo", "conectivismo", "construccionismo", "procesamiento de información", "pensamiento computacional", "tipos de herramientas tecnológicas que se integran al proceso de aprendizaje", "la resolución de problemas en relación al uso de la tecnología", "los nuevos retos y desafíos del uso de la tecnología", "estrategias didácticas con el uso de tecnología para el aprendizaje de los sistemas numéricos y el álgebra", "estrategias didácticas con el uso de tecnología para el aprendizaje de la geometría y trigonometría y estrategias didácticas con el uso de tecnología para el aprendizaje de la estadística y probabilidad"]'::jsonb,
    habilidades_desempenos  = '["explica principios de las teorías", "argumenta y contrargumenta respecto a una tesis", "formula estrategias de abordaje de los principios", "aplica los principios a situaciones de aprendizaje", "redacta artículos y comunica según el formato de estilo APA"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1294$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Evaluación de los Aprendizajes$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["aspectos teóricos de las Ciencia administrativa la organización y administración educativa", "los modelos", "enfoques así como las dimensiones de la gestión institucional, pedagógica, administrativa, comunal", "el planeamiento estratégico y operativo", "la capacidad de liderazgo y los estilos de dirección"]'::jsonb,
    habilidades_desempenos  = '["identificar las fases de la planificación", "los lineamientos de las dimensiones del planeamiento", "capacidad de organización de acciones de gestión institucional"]'::jsonb,
    actividades_metodo      = '["análisis y comentario de textos seleccionados"]'::jsonb
WHERE code = $$CEDE1018$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Técnicas e instrumentos de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la estadística descriptiva", "conceptos básicos de estadística", "organización y representación gráfica de una variable", "distribución de frecuencias", "puntuaciones individuales y curva normal", "estudio conjunto de dos variables", "regresión lineal", "SPSS para el análisis de datos", "estadística inferencial", "la teoría de la probabilidad", "variables aleatorias y distribuciones de probabilidad"]'::jsonb,
    habilidades_desempenos  = '["Analiza datos", "variables", "comprueba hipótesis", "aplica técnicas de la estadística descriptiva"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1019$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional IV: Innovación Didáctica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Desarrollo de sesiones de aprendizaje", "Materiales didácticos y evaluación del aprendizaje", "gestión educativa", "procesos y etapas de la gestión en instituciones educativas", "las cuatro funciones básicas de la administración educativa", "ejercicio de la planificación: Se cuenta con el Proyecto Educativo Institucional y el Proyecto Curricular institucional, la Programación Curricular de Aula", "Avances", "ejercicio de la organización", "ejercicio de la dirección: Grado de cumplimiento de los roles directivos básicos", "ejercicio del control: Monitoreo y evaluación"]'::jsonb,
    habilidades_desempenos  = '["Diseña sesiones de aprendizaje fundamentadas", "que le permiten desarrollar sesiones pertinentes con el contexto de la institución educativa y las características de los estudiantes"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1012$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica de la geometría y trigonometría$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la estadística y su naturaleza", "los tipos de variables y su relación con la estadística", "la importancia de los gráficos estadísticos", "azar y lenguaje", "el azar y la realidad", "experimentos y eventos", "los tipos de probabilidad", "la naturaleza de los resultados estadísticos y probabilísticos", "interpretación de resultados estadísticos y probabilísticos", "relevancia del estudio de la estadística y probabilidad", "el proceso de pensamiento estadístico", "la naturaleza de la inferencia estadística", "aprendizaje situado en estadística y probabilidad", "dificultades en el aprendizaje de la estadística y probabilidad", "errores en el aprendizaje de la estadística y probabilidad", "estrategias didácticas en estadística y probabilidad y diseños metodológicos para el aprendizaje"]'::jsonb,
    habilidades_desempenos  = '["explica principios de las teorías", "argumenta y contrargumenta respecto a una tesis", "formula estrategias de abordaje de los principios", "aplica los principios a situaciones de aprendizaje", "redacta artículos y comunica según el formato de estilo APA"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1330$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la instalación de Rstudio y registro en Rstudio Cloud", "introducción a la programación con R", "Variables", "funciones", "variables y funciones en Rstudio", "estadística descriptiva con R", "probabilidades con R", "distribuciones de probabilidad con R", "correlación con R", "regresión lineal con R", "pruebas de significación estadística paramétrica y no paramétrica con R"]'::jsonb,
    habilidades_desempenos  = '["analiza datos", "construye representaciones gráficas", "interpreta resultados", "formula y aplica estrategias de resolución", "comunica matemáticamente", "utiliza la tecnología", "formula diseños metodológicos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1331$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["los fundamentos pedagógicos de la robótica educativa", "robots: tipos y elementos", "técnicas Do it yourself (DIY)", "modelos de aprendizaje de robótica educativa", "la robótica como elemento motivador", "recursos para robótica educativa", "construyendo un robot básico", "construcción de máquinas simples y mecanismos", "construcción de máquinas simples y programación básica de un robot"]'::jsonb,
    habilidades_desempenos  = '["analiza datos", "construye representaciones gráficas", "interpreta resultados", "formula y aplica estrategias de resolución", "comunica matemáticamente", "utiliza la tecnología", "formula diseños metodológicos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1332$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Gestión Educativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Modelos de intervención participativa", "Desarrollo local, regional, nacional", "Desarrollo sostenible", "Pertinencia social promoción sociocultural", "proyectos participativos"]'::jsonb,
    habilidades_desempenos  = '["detectar situaciones problemáticas de urgente intervención", "diseñando proyectos de intervención con la metodología y el protocolo de intervención para la ejecución participativa de proyectos mediante la organización pertinente del recurso humano contribuyendo a la solución de la problemática socio educativa", "reconoce consideraciones del protocolo participativo", "organiza recursos humanos", "propone acciones de intervención para transformación socioeducativa"]'::jsonb,
    actividades_metodo      = '["análisis y comentario de textos seleccionados"]'::jsonb
WHERE code = $$CEDE1020$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Estadística aplicada a la investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["informe final de la investigación", "protocolos nacionales y/o internacionales", "normas de escritura académica del estilo APA vigente", "normativa académica y de investigación", "publicación del informe final de investigación", "el artículo científico"]'::jsonb,
    habilidades_desempenos  = '["organiza la información", "establece la coherencia y la cohesión del texto", "aplica normas APA", "redacta el informe final del proyecto de investigación", "establece posturas", "comprueba hipótesis", "fundamenta el informe final", "maneja recursos de expresión oral", "argumenta el informe final", "Identifica los componentes de la estructura de un artículo de opinión", "revisa coherencia y cohesión del informe", "revisa el empleo de normas APA", "publica el informe final"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1021$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional V: Gestión docente y administrativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Desarrollo de sesiones de aprendizaje", "deconstrucción y reconstrucción de la práctica docente", "plan de mejora de la práctica", "diseño y aplicación del diagnóstico", "determinación y explicación del problema", "diseño del proyecto de intervención", "implementación del proyecto de intervención", "reflexión y evaluación", "presentación de resultados"]'::jsonb,
    habilidades_desempenos  = '["Elabora el diagnóstico de su práctica pedagógica", "mediante el uso de diarios de campo", "elabora el plan de implementación para la intervención didáctica", "ejecuta el plan de implementación didáctica", "evalúa sus resultados"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1013$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["introducción a la ciencia de datos", "funcionamiento del Big Data", "características del Big Data", "fuentes y tipos de datos: volumen y volatilidad", "tipos de análisis de datos", "aplicaciones para Big Data", "el ciclo de la ciencia de datos", "importación de datos", "análisis de datos", "ética y ciencia de datos"]'::jsonb,
    habilidades_desempenos  = '["analiza datos", "construye representaciones gráficas", "interpreta resultados", "formula y aplica estrategias de resolución", "comunica matemáticamente", "utiliza la tecnología", "formula diseños metodológicos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1352$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["fundamentos de programación de robots", "sensores y actuadores", "lenguajes de programación de robots", "aplicaciones para la programación de robots", "control remoto de robots", "construcción de robots programables"]'::jsonb,
    habilidades_desempenos  = '["analiza datos", "construye representaciones gráficas", "interpreta resultados", "formula y aplica estrategias de resolución", "comunica matemáticamente", "utiliza la tecnología", "formula diseños metodológicos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1353$$;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT code, name, hours_theory, hours_practice, prerequisites,
       tipo_curso, naturaleza,
       jsonb_array_length(temas_conocimientos)     AS num_temas,
       jsonb_array_length(habilidades_desempenos)  AS num_habilidades,
       jsonb_array_length(actividades_metodo)      AS num_actividades
FROM courses
WHERE code IN ($$HUMG1003$$, $$CEDG1010$$, $$CEDG1007$$, $$HUMG1002$$, $$HUMG1001$$, $$SOCG1001$$, $$CEDG1009$$, $$HUMG1005$$, $$MATG1001$$, $$HUMG1009$$)
ORDER BY code;

SELECT
    COUNT(*)                    AS total,
    COUNT(hours_theory)         AS con_horas,
    COUNT(prerequisites)        AS con_prerequisitos,
    COUNT(naturaleza)           AS con_naturaleza,
    COUNT(temas_conocimientos)  AS con_temas
FROM courses
WHERE code IN ($$HUMG1003$$, $$CEDG1010$$, $$CEDG1007$$, $$HUMG1002$$, $$HUMG1001$$, $$SOCG1001$$, $$CEDG1009$$, $$HUMG1005$$, $$MATG1001$$, $$HUMG1009$$, $$CEDE1001$$, $$CEDE1002$$, $$CEDG1008$$, $$HUMG1006$$, $$CEDG1001$$, $$BIOG1001$$, $$CYEG1001$$, $$MATG1002$$, $$HUMG1010$$, $$CEDE1003$$, $$CEDE1004$$, $$MATS1001$$, $$CEDS1060$$, $$CEDS1063$$, $$CEDS1061$$, $$CEDS1062$$, $$CEDE1023$$, $$CEDE1022$$, $$MATS1003$$, $$CEDS1106$$, $$CEDS1108$$, $$CEDS1107$$, $$CEDS1109$$, $$CEDE1005$$, $$CEDE1006$$, $$CEDE1008$$, $$MATS1005$$, $$CEDS1155$$, $$CEDS1157$$, $$CEDS1156$$, $$CEDE1014$$, $$CEDE1007$$, $$CEDE1009$$, $$MATS1009$$, $$CEDS1208$$, $$CEDS1206$$, $$CEDS1207$$, $$CEDE1051$$, $$CEDE1016$$, $$CEDE1010$$, $$CEDS1250$$, $$MATS1015$$, $$CEDS1249$$, $$CEDS1251$$, $$CEDE1017$$, $$CEDE1015$$, $$CEDE1011$$, $$ESTS1016$$, $$CEDS1295$$, $$CEDS1296$$, $$CEDS1294$$, $$CEDE1018$$, $$CEDE1019$$, $$CEDE1012$$, $$CEDS1330$$, $$CEDS1331$$, $$CEDS1332$$, $$CEDE1020$$, $$CEDE1021$$, $$CEDE1013$$, $$CEDS1352$$, $$CEDS1353$$);