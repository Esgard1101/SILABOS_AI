-- UPSERT enriquecido: Educ. Lengua y Literatura — 75 cursos

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
    temas_conocimientos     = '["lectura", "tipos de lectura", "niveles de comprensión lectora", "estudio como proceso", "condiciones del estudio", "planificación del estudio", "estudio y trabajo en equipo", "aprendizaje autónomo", "estrategias de aprendizaje cognitivas y meta cognitivas", "estilos de aprendizaje de Kolb", "tipos de inteligencias según Gardner", "el subrayado: definición, utilidad, análisis de caso", "el esquema: definición, utilidad, clasificación, elaboración de un esquema", "el resumen: definición, clasificación, utilidad, elaboración de un resumen", "Cuadros sinópticos: definición, utilidad, elaboración de un cuadro sinóptico", "mapas conceptuales: definición, utilidad, componentes, elaboración de un mapa conceptual", "mapas mentales: definición, usos, tipos de mapas mentales, elaboración de un mapa mental", "mapa semántico: definición, utilidad, componentes, elaboración de un mapa semántico", "círculo concéntrico: Definición, utilidad, componentes, elaboración de un círculo concéntrico", "cuadro comparativo de doble entrada: definición, utilidad, elaboración del cuadro de doble entrada", "líneas de tiempo: definición, utilidad, elaboración de una línea de tiempo", "esquema CCP: definición, utilidad, elaboración de esquema", "la Chacana: definición, utilidad, componentes, elaboración de la chacana"]'::jsonb,
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
    habilidades_desempenos  = '["reconoce revistas indizadas", "utiliza la estructura básica del artículo científico considerando el perfil de la revista indizada", "reconoce revistas indizadas de acuerdo con el perfil profesional", "caracteriza artículos según el tipo de investigación: de revisión, empíricos, de investigación, cartas al editor, etc.", "reconoce la estructura del artículo científico como: título, resumen, palabras clave, introducción, desarrollo, metodología, discusión de resultados, conclusiones, referencias bibliográficas", "desarrolla el discurso utilizando el lenguaje formal del contexto en el que se encuentra", "utiliza recursos tecnológicos con fines de comunicar resultados reflexivamente", "argumenta con recursos científicos y empíricos durante la exposición", "desarrolla ideas con argumentos científicos y empíricos durante la exposición", "demuestra manejo del lenguaje oral o corporal durante el desarrollo del discurso"]'::jsonb,
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
    temas_conocimientos     = '["La historia del quechua y sus variantes: el nombre quechua", "etimología del vocablo quechua", "origen y expansión del quechua", "panalfabeto quechua de Lambayeque: vocales", "grafías", "préstamos del castellano", "expresiones básicas y las más usuales: (Diálogos)", "A.-Saludos y despedidas", "B.- Expresiones de cortesía", "preguntas frecuentes (Diálogos): A.- Con relación a la persona", "B.-Con relación al tiempo", "C.-Con relación a la procedencia", "los verbos y sustantivos"]'::jsonb,
    habilidades_desempenos  = '["reconoce el quechua como lengua y cultura", "expresa palabras y frases con las vocales y grafías del quechua adecuadamente", "interactúa con sus pares en diálogos con expresiones adecuadas", "hace uso de reglas gramaticales en sus producciones orales y escritas"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1005$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["operaciones lógicas básicas", "inferencia inmediata", "Inferencia mediata", "lógica proposicional", "razonamientos proposicionales", "cuantificadores", "fórmulas cuantificacionales", "alcances de los cuantificadores", "Interpretación de fórmulas cuantificacionales", "validez de inferencias", "operaciones básicas con conjuntos y familias de conjuntos"]'::jsonb,
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
    temas_conocimientos     = '["Fundamentos epistemológicos de la historia de la educación", "Historia y educación: Historicidad y educabilidad", "Evolución de La educación a través de la historia (antigua y medieval", "moderna y contemporánea)", "Historia de los sistemas educativos en sociedades avanzadas. Presente y futuro de la educación mundial", "Desafíos de la educación peruana y latinoamericana", "La educación en el siglo XXI: Educación", "democracia y diversidad cultural", "Investigación en torno a la escuela rural en el Perú"]'::jsonb,
    habilidades_desempenos  = '["define los fundamentos epistemológicos de la historia de la educación", "Identifica la relación entre la historicidad y educabilidad", "Identifica los hitos relevantes en la historia de la evolución de la educación a través de la historia (antigua y medieval", "moderna y contemporánea)", "explica la historia de los sistemas educativos en sociedades avanzadas", "analiza los desafíos de la educación peruana y latinoamericana", "Investiga y caracteriza la escuela rural en la región Lambayeque y el Perú"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["El desarrollo humano multidimensional", "dimensiones del desarrollo humano: desarrollo físico", "desarrollo cognoscitivo", "desarrollo emocional socioafectivo", "desarrollo social", "teoría cognitiva de Piaget", "enfoque cognoscitivo", "teoría del apego", "teoría del desarrollo sociocultural de Vygotski", "teoría de Kohlberg sobre el desarrollo moral", "teorías de aprendizaje: Aprendizaje conductista", "aprendizaje social el constructivismo", "aprendizaje socio cultural", "aprendizaje significativo", "aprendizaje experiencial", "teoría histórico cultural", "teoría cognitiva social", "teoría psicogenética", "teoría conductista y neo conductista", "teoría humanista", "teoría modificabilidad cognitiva"]'::jsonb,
    habilidades_desempenos  = '["describe el planteamiento multidimensional del desarrollo humano", "caracteriza las dimensiones del desarrollo humano", "describe principios de la teoría cognitiva", "explica el planteamiento de la teoría cognitiva", "caracteriza la teoría del apego", "explica los fundamentos de la dimensión emocional", "describe las características de las teoría psicosocial", "sociocultural y moral", "diferencia los aportes de las teorías de carácter psico social", "explica fundamentos de teorías de aprendizaje", "establece semejanzas y diferencias de las teorías de aprendizaje", "caracteriza los aportes de las teorías del aprendizaje"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1002$$;

UPDATE courses SET
    hours_theory            = hours_theory,
    hours_practice          = 2,
    prerequisites           = $$Actividad Física$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Práctica$$,
    temas_conocimientos     = '["El índice de masa corporal para determinar factores que afectan su estado de salud", "aplica el índice cintura cadera", "etc. para determinar factores que afectan su estado de salud"]'::jsonb,
    habilidades_desempenos  = '["ejecuta programas de actividad física aeróbica: step. gimnasia aeróbica", "etc. para mantener y preservar la salud", "con seguridad y responsabilidad"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1008$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Quechua Principiante$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["expresiones útiles (teoría y práctica)", "de persona: partes externas del cuerpo humano", "los cinco sentidos", "vestimenta del poblador andino", "parentesco familiar", "ciclos de la vida", "etapas de la vida", "actitud psicológica de la persona", "costumbres y tradiciones quechuas", "diálogos; los objetos y sus particularidades: wasi", "paisaje", "tiempupi ima saqra kaqkuna", "qirukuna", "kurukuna", "parlukuna (diálogos); presencia de enfermedades. (qishaykuna); sonidos y fonemas (identificando la metátesis)", "sistema consonántico", "el fenómeno de la metátesis", "expresiones matemáticas (Diálogos): yupaykuna", "simbulukuna", "signukuna; operacionkunata rurana. tullpuykunata riqsishun"]'::jsonb,
    habilidades_desempenos  = '["identifica diversas expresiones para nombrar el entorno social y cultural; produce textos sencillos de acuerdo a sus necesidades de comunicación", "discrimina sonidos de los sufijos verbales", "sustantívales y generales en las palabras y frases; domina expresiones matemáticas en la numeración", "operación y resolviendo problemas"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1006$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = hours_practice,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórica$$,
    temas_conocimientos     = '["expresión emocional", "asertividad", "autoestima", "autorrealización", "autonomía", "tolerancia al estrés", "control de impulsos", "empatía", "relaciones interpersonales", "solución de problemas", "trabajo en equipo y plan de Desarrollo Personal"]'::jsonb,
    habilidades_desempenos  = '["valora sus emociones", "evalúa su autoestima", "aplica técnicas de relajación", "argumenta sus estrategias para el control de impulsos", "valora las relaciones interpersonales", "asume roles y funciones del Trabajo en equipo", "elabora su plan de desarrollo personal"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Factores ambientales", "problemas ambientales mundiales", "nacionales", "regionales y locales", "identificación de los espacios naturales del departamento de Lambayeque", "identificación de los problemas ambientales del departamento de Lambayeque", "sostenibilidad de los recursos naturales", "el enfoque ecosistémico", "clases de educación ambiental", "el método científico", "aplicado a la formación científica sobre fenómenos ecológicos y responsabilidad social que se dan en los seres vivos", "el hombre", "y su ambiente abiótico y biótico", "biosfera", "diferencia entre ambiente y ecosistema", "diferencia entre biodiversidad y recursos naturales. Ecorregiones", "Áreas naturales protegidas", "diferencia entre protección", "Conservación y Sostenibilidad de los recursos naturales. Bienes y Servicios ambientales", "diferencia entre valor y precio de los recursos naturales", "calidad ambiental", "residuos sólidos", "reciclaje", "seguridad y salud en el trabajo", "cambio climático en Perú", "desarrollo sostenible y la responsabilidad ambiental: ambiente - sociedad – salud", "educación ambiental", "políticas ambientales en Perú", "acciones ambientales", "ciudades limpias y saludables", "legislación ambiental y derecho ambiental"]'::jsonb,
    habilidades_desempenos  = '["realiza acciones ambientales con tendencia a tener mayor sensibilidad hacia el ambiente", "Selecciona información bibliográfica en libros", "manuales y revistas especializadas sobre factores abióticos y bióticos", "elabora monografías de manera adecuada con relación a la problemática ambiental regional y local", "utiliza el método científico en el desarrollo de monografías", "analiza principales problemas ambientales del departamento de Lambayeque", "selecciona información sobre educación ambiental", "incorpora en su escala de valores la ética ambiental", "participa activamente en solución de problemas ambientales de su universidad", "identifica in situ de algunas ecorregiones del departamento de Lambayeque", "realiza acciones ambientales con tendencia a tener mayor sensibilidad y compromiso hacia el ambiente; plantea solución a problemas ambientales", "en tránsito hacia el desarrollo sostenible"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$BIOG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["repositorios de investigación científica", "gestores de recursos bibliográficos", "normas de referencia", "discos duros virtuales", "compartir archivos y directorios", "configurar permisos", "ordenamiento de datos", "filtros y validación de datos", "resumen de datos", "fórmulas", "gráficos estadísticos", "tablas y gráficos dinámicos", "presentadores digitales", "efectos y animaciones", "insertar elementos multimedia locales o de la web y secuencialización de la presentación"]'::jsonb,
    habilidades_desempenos  = '["recolecta información científica haciendo uso de repositorios digitales", "aplica las normas de referencias en trabajos académicos", "comparte información haciendo uso de herramientas digitales de Internet", "aplica permisos de acceso haciendo uso de discos duros virtuales", "procesa datos haciendo uso de las herramientas de hoja de cálculo", "presenta información relevante haciendo uso de presentadores digitales", "inserta elementos multimedia locales o de la web considerando las herramientas del presentador digital", "realiza la secuencia y tiempo de presentación de la información haciendo uso del presentador digital"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CYEG1001$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Lógica Simbólica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["visión general de los sistemas de números", "ecuaciones polinómicas y racionales", "inecuaciones polinómicas y racionales", "funciones", "representación de funciones", "operaciones con funciones", "modelos lineales y no lineales", "razones y proporciones", "magnitudes proporcionales", "conversiones y escalas", "regla de tres y Porcentajes"]'::jsonb,
    habilidades_desempenos  = '["reconoce los sistemas de números", "resuelve ecuaciones e inecuaciones", "representa gráficamente los diversos tipos de funciones", "elabora modelos matemáticos básicos", "reconoce las magnitudes proporcionales y resuelve problemas de reparto proporcional"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$MATG1002$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Inglés I: A1$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["sustantivos contables e incontables", "expresiones indicar existencia y deseo", "cuantificadores", "Preposiciones de lugar", "adjetivos", "adjetivos comparativos y superlativos", "tiempos gramaticales en pasado y futuro simple y expresiones de tiempo"]'::jsonb,
    habilidades_desempenos  = '["Comprende discursos sencillos y articulados relacionados a los temas gramaticales", "comprende textos orales y escritos sencillos y articulados a los temas gramaticales", "lee textos sencillos y breves", "se expresa haciendo uso de frases sencillas describiendo lugares", "personas y su entorno", "escribe frases y oraciones sencillas siguiendo las estructuras gramaticales y vocabulario adquiridos"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$HUMG1010$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico – práctica$$,
    temas_conocimientos     = '["los fundamentos de la filosofía de la educación", "concepción del mundo y de la vida", "la concepción del hombre", "la concepción de la educación", "fundamentos éticos y valorativos de la educación", "la filosofía de los sistemas pedagógicos actuales", "enfoques actuales de la educación: praxis educativa", "educación", "sociedad y cultura", "educación y diversidad social", "desafíos de la educación actual"]'::jsonb,
    habilidades_desempenos  = '["Identifica el concepto y contenido de la filosofía de la educación", "argumenta una concepción del hombre y la educación", "define los funda fundamentos éticos y valorativos de la educación", "analiza la filosofía de los sistemas pedagógicos actuales", "relaciona los enfoques actuales de la educación y el desarrollo social", "Establece los aportes y las implicancias de la filosofía en la educación"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1003$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Teorías del aprendizaje$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico – práctica$$,
    temas_conocimientos     = '["la psicología cognitiva", "Teorías psicológicas y procesos cognitivos", "la inteligencia social", "la inteligencia emocional", "psicología positiva", "educación emocional", "autoconocimiento emocional", "las inteligencias múltiples", "la teoría de la mente", "las inteligencias múltiples", "la inteligencia social", "la inteligencia emocional", "psicología positiva", "educación emocional", "autoconocimiento emocional"]'::jsonb,
    habilidades_desempenos  = '["discrimina los aportes de las teorías de la psicología cognitiva", "describe fundamentos de las teorías psicológicas", "explica los fundamentos de la psicología cognitiva", "describe características de cada inteligencia múltiple", "describe los principios de la teoría de la mente", "establece diferencias entre las inteligencias múltiples", "analiza los aportes psicopedagógicos de las inteligencias múltiples", "define los planteamientos de las teorías psicológicas", "establece diferencias entre inteligencia social e inteligencia emocional", "explica el aporte de las teorías psicológicas implicadas en los procesos de aprendizaje"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1004$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["unidades fonético-fonológicas segmentales", "Fono", "fonema", "sílaba", "grupo acentual", "grupo fónico", "Pragmática del sonido español", "Unidades fonéticofonológicas suprasegmentales", "Intensidad", "cantidad", "altura", "Pragmática de la prosodia española", "Bases fonológicas del sistema ortográfico"]'::jsonb,
    habilidades_desempenos  = '["definir concepciones básicas de la fonética", "Caracteriza procesos fonéticos segmentales", "Define concepciones básicas de la fonología", "Analiza procesos fonéticos suprasegmentales"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1002$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["modelo semiótico narrativo", "modelo semiótico tensivo", "modelo sociosemiótico", "imaginario social", "proceso semiótico"]'::jsonb,
    habilidades_desempenos  = '["describe lineamientos de modelos semióticos", "Explica el sentido discursivo", "Interpreta fines y transformaciones", "Aplica modelos de análisis semiótico"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1057$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Semántica designativa", "Designación", "Semántica idiomática", "Significado", "Relaciones léxicas", "El análisis del significado", "El cambio semántico", "Estructura lexemática primaria y secundaria"]'::jsonb,
    habilidades_desempenos  = '["identifica bases teóricas caracterizadas en los procesos semánticos designativos", "en contextos de uso real del lenguaje", "Caracteriza los distintos tipos de significado", "Analiza la variación contextual del significado", "Analiza las posibilidades del cambio semántico"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1056$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["teoría literaria", "La crítica literaria", "Géneros literarios", "Métrica", "El verso", "El ritmo", "La estrofa", "Figuras retóricas", "Análisis estilístico", "El comentario de textos poéticos", "El texto dramático: Estructura", "El comentario de textos dramáticos"]'::jsonb,
    habilidades_desempenos  = '["explica las bases teóricas centrales de la teoría y el análisis de textos poéticos", "Explica las bases teóricas centrales de la teoría y el análisis de textos dramáticos", "Aplica las herramientas metodológicas del análisis de textos en obras poéticas y dramáticas diversas", "Valora textos poéticos y dramáticos, a partir del análisis formal y de contenido de las obras, y tomando en cuenta sus contextos de producción, circulación y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1059$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["teatro: trama", "tema personaje", "guion", "género", "Características: vestuario", "escenografía", "escena", "efectos especiales", "convenciones", "Pedagogía: procesos", "principios", "marco conceptual", "Aportes"]'::jsonb,
    habilidades_desempenos  = '["valora el teatro como manifestación sociocultural", "Relaciona los fines formativos de la pedagogía con el teatro", "Elabora una propuesta de representación teatral con fines propedéuticos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1058$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["La narratividad del film", "Historia", "narración y relato", "El relato cinematográfico", "El tratamiento del tiempo en el cine", "Análisis temporal: Orden", "duración y frecuencia", "Analepsis interna", "externa y mixta", "Prolepsis externa", "interna y mixta", "Velocidad narrativa", "Elipsis", "pausa", "escena", "y sumario diegético", "Relato iterativo", "anafórico y repetitivo", "Análisis modal: Focalización cero", "interna", "externa", "Focalización y ocularización", "La enunciación del texto fílmico: Narrador y narratario", "Nivel extradiegético", "intradiegético y metadiegético", "Relato heterodiegético", "homodiegético y autodiegético"]'::jsonb,
    habilidades_desempenos  = '["explica la estructura y elementos del relato cinematográfico", "Elabora el análisis temporal de un texto fílmico", "Elabora el análisis modal de un texto fílmico", "Elabora el análisis de la enunciación narrativa de un texto fílmico"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1055$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Filosofía de la educación$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["aproximación a la pedagogía como ciencia", "el pensamiento pedagógico en la historia", "modelos pedagógicos contemporáneos y sus fundamentos", "problemas pedagógicos actuales", "la pedagogía y su relación con las ciencias de la educación", "ideas pedagógicas en el Perú y América Latina"]'::jsonb,
    habilidades_desempenos  = '["explica fundamentos de la pedagogía como ciencia, su objeto de estudio y sus cualidades", "identifica los problemas pedagógicos actuales y su relación con las ciencias de la educación", "explica los fundamentos filosóficos y epistemológicos de la pedagogía", "identifica los planteamientos de los diferentes modelos pedagógicos", "diferencia los principios de las teorías de aprendizaje conductista, constructivista, aprendizaje significativo, socio cultural y experiencial", "establece la relación entre la pedagogía y las ciencias de la educación", "explica los principios de las corrientes pedagógicas", "discrimina las prácticas pedagógicas a partir de las corrientes pedagógicas actuales y contrasta los aportes pedagógicos de cada corriente en el aula"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1023$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Psicología cognitiva$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["diagnóstico psicopedagógico", "instrumentos para detección y diagnóstico de necesidades tutoriales: test, cuestionarios, encuestas, el diario", "enfoques de la tutoría: vocacional, educativo y de asesoramiento", "enfoques de la orientación: paternalista, basado en la libertad y el dialógico", "tipos de tutoría: formativa, preventiva, personalizada, integral, inclusiva, regeneradora", "instrumentos de intervención tutorial: la observación, el autodiagnóstico, la entrevista", "Áreas de la tutoría: personal-social, académica, vocacional, salud corporal y mental, ayuda social, cultura y actualidad, convivencia y disciplina escolar", "Plan tutorial: características", "elementos del plan tutorial: fundamentación, objetivos, actividades, recursos, evaluación, estrategias de monitoreo y acompañamiento tutorial"]'::jsonb,
    habilidades_desempenos  = '["identifica criterios de análisis en los procesos de diagnóstico", "establece necesidades de atención", "determina casos de atención psicopedagógica", "explica los enfoques de la tutoría y de la orientación tutorial", "compara aportes de los enfoques de la tutoría", "diferencia acciones de intervención y prevención", "caracteriza los enfoques de la tutoría y orientación", "define tipos de tutoría", "explica los tipos de tutoría", "diferencia características de los tipos de tutoría", "reconoce las características de los instrumentos de intervención tutorial", "determina instrumentos de intervención tutorial", "tipifica las principales áreas de la tutoría", "identifica los componentes de un plan de intervención tutorial", "organiza las acciones de acuerdo a los propósitos", "diseña el plan de intervención tutorial"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1022$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Semiótica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["del discurso argumentativo", "La situación argumentativa", "Aristóteles y las técnicas retóricas del discurso: Inventivo, dispositivo y elocutivo", "Schopenhauer y la dialéctica erística", "La nueva retórica", "Estructuras argumentativas", "Argumentos cuasi lógicos", "Argumentos basados en la estructura de lo real", "Las falacias", "Tipos y estrategias", "El modelo de Stephen Toulmin", "Componentes y campos", "El modelo pragamadialéctico"]'::jsonb,
    habilidades_desempenos  = '["explica las bases teóricas y las técnicas argumentativas de la retórica aristotélica y la nueva retórica", "Aplica las técnicas argumentativas de la retórica aristotélica y la nueva retórica en el análisis de los discursos sociales", "Explica las bases teóricas y las técnicas argumentativas de los modelos de Stephen Toulmin y la pragmadialéctica", "Aplica las técnicas argumentativas de los modelos de Stephen Toulmin y la pragmadialéctica en el análisis de los discursos sociales"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1104$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Semántica Española$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Modelo tipológico narrativo", "Modelo tipológico descriptivo", "Modelo tipológico explicativo", "Modelo tipológico argumentativo", "Modelo tipológico conversacional"]'::jsonb,
    habilidades_desempenos  = '["describe modelos psicolingüísticos de la lectura", "desarrolla niveles de comprensión lectora", "Determina los procesos cognitivos de lectura", "describe modelos psicolingüísticos de escritura", "determina los procesos cognitivos de la escritura"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1105$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Fonética y fonología española$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la palabra", "Clasificaciones de las palabras", "Palabra simple y palabra compleja", "Estructura de la palabra: sus constituyentes", "Morfología flexiva", "Palabras variables e invariables", "Morfología nominal", "Las categorías de género y número en el sustantivo, el adjetivo, el pronombre y el artículo", "Morfología flexiva verbal", "Morfemas de tiempo y modo, persona y número", "Clases de verbos", "Conjugación regular, irregular y defectiva", "Morfología léxica", "Los afijos: sus clases en español", "Derivación y parasíntesis", "La prefijación: propiedades y restricciones", "Morfología léxica", "La sufijación: Sufijación apreciativa y superlativa", "Derivados y compuestos: el adverbio en -mente", "Sufijación e interfijación", "La composición", "Clases de compuestos"]'::jsonb,
    habilidades_desempenos  = '["clasifica las unidades propias de la morfología", "Identifica los distintos mecanismos estructurales de formación de palabra", "Explica el proceso de formación léxica seguido en cada palabra", "Analiza procesos de morfología flexiva verbal", "Analiza procesos de morfología léxica", "Analiza procesos de composición de palabras"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1101$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Teoría y Análisis Literario de Textos Poéticos$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Historia, discurso y relato", "Análisis temporal: Orden, duración y frecuencia", "Analepsis interna, externa y mixta", "Prolepsis externa, interna y mixta", "Velocidad narrativa", "Elipsis, pausa, escena, y sumario diegético", "Relato iterativo, anafórico y repetitivo", "Análisis modal: Discurso del personaje", "Discurso narrativizado, transpuesto y restituido", "Focalización cero, interna, externa", "Análisis de la enunciación: Narración subsecuente, predictiva, simultánea e interpolada", "Nivel extradiegético, intradiegético y metadiegético", "Relato heterodiegético, homodiegético y autodiegético"]'::jsonb,
    habilidades_desempenos  = '["explica las bases teóricas y metodológicas de la teoría narrativa estructuralista", "Aplica las herramientas teórico-críticas del estructuralismo al análisis temporal del relato", "Elabora el análisis modal y enunciativo de texto narrativo", "Valora textos literarios, a partir del análisis formal y de contenido de las obras, tomando en cuenta sus contextos de producción, circulación y recepción"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1103$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Electivo 1: Teatro y Pedagogía o Cine y Narración$$,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["relaciones entre lengua, cultura y sociedad", "Relativismo lingüístico", "La lingüística antropológica", "Historia y fundamentos", "De los estudios etnolingüísticos a la etnografía del habla: objeto, unidades, conceptos claves", "El discurso situado", "Herramientas y categorías de análisis", "Contexto y contextualización", "Referencia e indicialidad", "Comunidad de habla", "Texto y ejecución (performance)", "Ideología lingüística: definiciones", "Las ideologías lingüísticas occidentales", "Monolingüismo, purismo y etnocentrismo", "Ideologías lingüísticas y prácticas comunicativas"]'::jsonb,
    habilidades_desempenos  = '["analiza la lengua en su contexto sociocultural", "Relaciona el lenguaje con factores culturales cognitivos en comunidades de habla", "Relaciona el lenguaje con factores simbólicos en comunidades de habla del entorno", "Relaciona lenguaje y cultura, a partir de textos orales del entorno"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1100$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Electivo 1: Teatro y Pedagogía o Cine y Narración$$,
    tipo_curso              = $$Electivo$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Teorías y enfoques sociológicos de la literatura", "Las condiciones sociales de producción de las obras", "La sociología de las obras", "De la sociología de la literatura a la sociocrítica", "Las mediaciones", "Una teoría sociocrítica del texto"]'::jsonb,
    habilidades_desempenos  = '["Caracteriza las bases teóricas y metodológicas de la sociología de la literatura", "Caracteriza las bases teóricas y metodológicas de la sociocrítica", "Analiza textos literarios aplicando las herramientas metodológicas de la sociología de la literatura", "Analiza textos literarios aplicando las herramientas metodológicas de la sociocrítica"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDS1102$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Pedagogía$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Currículo Nacional de Educación Básica Regular", "vinculación estratégica con el currículo departamental", "el PEI", "PAT", "PCI", "de la institución educativa", "definiciones curriculares polisémicas", "historia y alcance conceptual", "tipos de currículos: carácter", "enfoques", "principales actores, (educativos, económicos, políticos y tecnológicos)", "principales teorías curriculares y modelos", "metodología sistémica de elaboración de currículo: elementos, procesos y productos", "el diseño como proceso y sus elementos", "niveles de diversificación y las derivaciones del PCI", "análisis y elaboración propositiva de los componentes curriculares", "lineamientos operativos metodológicos", "como se elabora los componentes curriculares: diagnóstico, perfil etc."]'::jsonb,
    habilidades_desempenos  = '["identifica los puentes curriculares entre el currículo nacional y el currículo departamental", "contrasta como se tributan el PEI, PAT, para el diseño del PCI", "Identifica la concepción y la teoría curricular que maneja un docente", "caracteriza los elementos del diseño curricular", "analiza un componente curricular", "propone la elaboración de los componentes curriculares", "identifica las diferentes metodologías para levantar los componentes curriculares como propuesta", "plantea sugerencias, para elaborar los componentes curriculares"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1005$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["bases epistemológicas de la investigación cuantitativa", "procesos y fases de la investigación con metodología cuantitativa", "problema de investigación", "fuentes para la generación de ideas", "estrategias para desarrollar ideas que detonen en proyectos", "criterios para la selección de un problema", "planteamiento del problema en la ruta cuantitativa", "supuestos epistemológicos", "los objetivos de la investigación", "Justificación de la investigación", "el marco teórico", "formulación de la hipótesis", "elaboración del diseño de investigación", "población y técnicas de muestreo", "técnicas e instrumentos de investigación", "marco administrativo"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el enfoque de investigación cuantitativa", "diferencia los fundamentos de la investigación cuantitativa", "identifica los tipos de investigación cuantitativa", "explica fundamentos de la epistemología para las ciencias sociales", "Identifica problemas de estudio", "delimita problema de investigación en el ámbito educativo", "diferencia los rasgos característicos del tipo de investigación", "define fuentes de generación de ideas", "determina problemas de intervención cualitativa", "describe problemas de ruta cualitativa", "recolecta información", "elabora instrumentos", "determina población y técnicas de muestreo", "valida aplicación de instrumentos", "establece el marco teórico y administrativo"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1006$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = NULL,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Escuela y comunidad", "observación participante y no participante", "construcción de instrumentos de observación", "la encuesta como medio para observar la comunidad", "cuestionario y escala de Likert", "diálogos", "historias y otras miradas entre la escuela y la comunidad", "la entrevista en profundidad", "el documental como estrategia de reflexión sobre la práctica"]'::jsonb,
    habilidades_desempenos  = '["Elabora instrumentos de investigación tales como entrevista", "encuesta y relato etnográfico", "procesa la información recogida", "aplicando técnicas de sistematización"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1008$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Teorías de la argumentación$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Modelos psicolingüísticos de lectura", "Comprensión lectora", "Procesamiento de la información", "Inferencia lectora", "Modelos psicolingüísticos de escritura", "Modelo de procesos cognitivos", "Modelo de procesos sociocognitivos", "Modelo de escritura en las disciplinas"]'::jsonb,
    habilidades_desempenos  = '["describe modelos psicolingüísticos de la lectura", "desarrolla niveles de comprensión lectora", "Determina los procesos cognitivos de lectura", "Describe modelos psicolingüísticos de escritura", "Determina los procesos cognitivos de la escritura"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1154$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Tipología textual$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["cuento", "relato", "novela", "Estructura y elementos del relato", "El cuento: fantástico", "psicológico", "policial", "Estrategias y técnicas para elaborar textos narrativos", "El tiempo", "Formas temporales", "La perspectiva", "Puntos de vista del narrador", "La narración", "Niveles narrativos", "La poesía lírica", "Especies líricas", "Estructura y elementos del texto poético", "Métrica y rítmica del poema", "Estrategias y técnicas para elaborar textos poéticos"]'::jsonb,
    habilidades_desempenos  = '["elaborar materiales y herramientas didácticas que permitan trabajar la creatividad literaria", "Elabora relatos, aplicando técnicas narrativas contemporáneas", "Aplica estrategias y recursos que permitan el desarrollo de la creatividad literaria", "Elabora textos poéticos, aplicando recursos métricos y rítmicos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1151$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Gramática española: Morfología$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["las funciones sintácticas oracionales en español", "Los esquemas sintagmáticos y oracionales en español", "Tipos", "La estructura interna del sintagma", "Clases de sintagmas", "Sintagmas nominales", "Sintagmas adverbiales", "Sintagmas preposicionales y sintagmas adjetivales", "El sintagma verbal", "La oración", "Estructura", "Funciones sintácticas oracionales", "Clases de estructuras oracionales", "La función Sujeto (S) y la estructura de la oración", "Oraciones personales e impersonales", "La función Predicado (P) y la estructura de la oración", "Las modalidades oracionales", "La oración compuesta", "Estructura y clasificación"]'::jsonb,
    habilidades_desempenos  = '["explica las características de las distintas funciones oracionales en español", "Distingue las funciones sintácticas oracionales en español", "Analiza los diferentes esquemas de la oración simple en español", "Analiza los diferentes esquemas de la oración compuesta en español", "Analiza los diversos esquemas de la modalidad oracional"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1152$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Teoría Y Análisis Literario De Textos Narrativos$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura antigua", "Representantes", "Literatura griega: Épica, lírica, prosa y teatro", "Literatura latina: Épica, lírica, prosa y teatro", "Literatura medieval: Épica, lírica, narrativa", "El cuento medieval", "La renovación de la lírica", "Dante y Petrarca"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura clásica", "Explica la literatura antigua, griega y latina, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura clásica, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura medieval", "Explica la literatura medieval, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura medieval, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1153$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Teoría Curricular$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la didáctica como ciencia social", "los modelos didácticos: dialógico, colaborativo, comunicativo interactivo, contextual-ecológico, crítico", "el proceso formativo", "las dimensiones formativas", "el proceso de enseñanza aprendizaje", "los componentes del proceso enseñanza aprendizaje: externos e internos", "la metodología de la programación curricular de corto alcance: unidad, proyecto, módulo, sesión", "la secuencia didáctica en la programación de corto alcance", "las estrategias de enseñanza aprendizaje para la asimilación de conocimientos", "las estrategias de enseñanza aprendizaje para el desarrollo de capacidades", "las estrategias de enseñanza aprendizaje para la formación de valores"]'::jsonb,
    habilidades_desempenos  = '["identifica modelos de la didáctica general", "describe principios de la didáctica", "Explica las dimensiones formativas de la didáctica", "analiza procesos didácticos", "establece componentes didácticos internos y externos", "Identifica la metodología en la programación de corto alcance", "aplica principios didácticos en la programación de corto alcance", "Elabora la programación de corto alcance a la luz de las teorías de la didáctica", "identifica procesos de enseñanza aprendizaje", "organiza estrategias metodológicas", "planifica secuencias metodológicas de enseñanza aprendizaje y secuencia actividades de aprendizaje"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1014$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["paradigma interpretativo de investigación", "enfoques de investigación cualitativa y de Investigación - Acción", "bases epistemológicas de la investigación cualitativa", "proceso y fases de la investigación con metodología cualitativa", "fuentes para la generación de ideas", "estrategias para desarrollar ideas que detonen en proyectos", "criterios para la selección de un problema", "planteamiento del problema en la ruta cualitativa", "supuestos epistemológicos", "los objetivos de la investigación", "Justificación de la investigación", "el marco teórico", "la formulación de la hipótesis", "elaboración del diseño de investigación", "población y técnicas de muestreo", "técnicas e instrumentos de investigación", "marco administrativo"]'::jsonb,
    habilidades_desempenos  = '["justifica la investigación", "demuestra su viabilidad", "evalúa las deficiencias en el conocimiento del problema de investigación", "elabora marco teórico", "formula hipótesis", "elabora el diseño de investigación", "determina población y técnicas de muestreo", "selecciona técnicas e instrumentos de investigación", "establece el marco administrativo", "explica fundamentos del paradigma interpretativo", "describe características de los tipos de investigación", "identifica procesos y fases de la investigación cualitativa", "genera ideas a partir de fuentes y desarrolla ideas que detonan en proyectos", "plantea problemas en la ruta cualitativa"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1007$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional I: Comunidad y Escuela$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la cultura escolar", "componentes y perspectivas teóricas", "tradición estructural funcionalista", "tradición interpretativa", "el cuestionario: utilidad y construcción", "cultura escolar y culturas juveniles en la escuela", "cultura e identidad en los adolescentes", "ritos", "tradiciones y otras prácticas sociales en la escuela", "culturas y contraculturas de los adolescentes", "la etnografía en la investigación educativa: de la observación a la entrevista a profundidad", "el relato etnográfico", "el nuevo rol de los directivos en procesos de gestión y liderazgo", "la historia de vida en la investigación educativa", "actores indirectos que impactan en el proceso educativo"]'::jsonb,
    habilidades_desempenos  = '["caracteriza la cultura escolar", "sus componentes y perspectivas teóricas", "caracteriza las culturas y contraculturas de los adolescentes", "elabora instrumentos de investigación etnográfica tales como encuesta", "entrevista e historias de vida"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1009$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Psicolingüística$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["comunidad lingüística y funcionamiento dialectal", "Comunidades bilingües y multilingües", "Diglosia", "La norma estándar", "Políticas lingüísticas", "Desigualdad lingüística", "Variación lingüística social: sociolectos, registros", "Algunas funciones sociales del discurso", "La variación lingüística como reflejo de las diferencias sociales", "La regularidad de la variación: variante, variable lingüística y variable sociolingüística", "Etnografía del habla", "Evento comunicativo", "Competencia comunicativa", "El estudio de la conversación espontánea", "Conceptos de registro y de sociolecto", "El discurso", "Regularidad en las estrategias del discurso espontáneo", "Estudios de la estructura del discurso", "La narración en la conversación espontánea", "Construcción de lugares enunciativos", "Las formas lingüísticas como reflejo de las intenciones comunicativas", "Representaciones sociales y discurso", "Formaciones ideológicas y formaciones discursivas"]'::jsonb,
    habilidades_desempenos  = '["relaciona el uso del lenguaje con la organización social", "Explica la variación lingüística como reflejo de las diferencias sociales", "Explica las relaciones entre discurso, lenguaje e ideología", "Aplica las categorías sociolingüísticas al análisis de narrativas orales y discursos sociales"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1205$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Creación Literaria$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["enfoques de lectura: lingüístico, psicolingüístico, sociocultural", "didáctica de la enseñanza de la lectura", "literacidad", "tipos de textos", "géneros discursivos"]'::jsonb,
    habilidades_desempenos  = '["detecta situaciones de intervención y atención formativas lectoras, según sus contextos socioculturales", "Elabora planes formativos, tomando en cuenta las limitaciones y deficiencias diagnosticadas", "Aplica planes formativos lectores, evaluando sus resultados"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1202$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Gramática española: Sintaxis$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["saber expresivo", "Sentido", "Lo adecuado e inadecuado", "Modelo etnográfico-comunicativo", "Teoría de los actos de habla", "Análisis de la conversación", "Principios de cooperación", "Teoría de la cortesía", "Principios de cortesía", "Teoría cognitivo--inferencia", "Principio de relevancia"]'::jsonb,
    habilidades_desempenos  = '["caracteriza los actos de habla en el uso del lenguaje", "Explica los principios de cooperación en actos de habla", "Aplica la theory y principios de la cortesía en el análisis de la conversación", "Aplica la theory y el principio de relevancia en el análisis de la conversación"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1204$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura Universal Clásica Y Medieval$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura moderna: Renacimiento y Barroco", "Neoclasicismo", "Novela del siglo XIX", "Romanticismo", "Realismo y Naturalismo", "Poesía simbolista y parnasiana", "La novela del siglo XX", "Las vanguardias literarias", "Literatura de posguerra", "Poesía, narrativa actual"]'::jsonb,
    habilidades_desempenos  = '["Caracterizar el contexto histórico cultural de la literatura universal moderna", "Explica la literatura universal moderna, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura universal moderna, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura universal contemporánea", "Explica la literatura universal contemporánea, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura universal contemporánea, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1203$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica General$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["alcance conceptual del curso", "su relación con la comunidad de aprendizaje y enseñanza y su relación con los modelos de enseñanza como la indagación y otros", "la planificación curricular: niveles, tipos, elementos y características", "la programación curricular anual, su estructura y cualidades", "planificación curricular: Unidades didácticas", "planificación de unidades didácticas: estructuras, características, elementos según el tipo de unidad", "planificación curricular: sesión de aprendizaje", "planificación de sesiones o experiencias de aprendizaje: estructuras, características, elementos según tipo de unidad", "planificación de sesiones o experiencias de aprendizaje: estructuras, características, elementos"]'::jsonb,
    habilidades_desempenos  = '["identifica la estructura de la programación anual", "organiza los aprendizaje de acuerdo a los componentes de la programación anual", "prioriza los propósitos de aprendizaje de acuerdo al nivel de organización", "Identifica la estructura de la unidad didáctica", "organiza los aprendizajes de acuerdo a los componentes de la unidad didáctica", "prioriza los propósitos de aprendizaje de una unidad didáctica", "identifica la estructura de la sesión de aprendizaje", "organiza los aprendizajes de acuerdo a los componentes de la sesión de aprendizaje", "prioriza los propósitos de aprendizaje de una sesión de aprendizaje"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1050$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["recolección de datos en la ruta cuantitativa", "fases para la recolección de datos", "principales técnicas e instrumentos", "cuestionarios y escalas de medición de actitudes", "la entrevista estructurada", "la guía de observación", "fases para la elaboración de instrumentos de recojo de datos con metodología cuantitativa", "construcción de encuestas, entrevistas, guías de observación", "la validez y confiabilidad de los instrumentos"]'::jsonb,
    habilidades_desempenos  = '["aplica pruebas estadísticas", "recolecta datos en la ruta cuantitativa", "aplica técnicas e instrumentos", "recolecta información", "elabora instrumentos y valida aplicación de instrumentos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1016$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional II: Cultura Escolar$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["la planificación micro curricular", "las unidades didácticas", "las sesiones de aprendizaje", "sesiones simuladas", "los modelos e importancia de la Investigación-Acción para mejorar la práctica docente", "diagnóstico: el contexto cultural y las características e intereses de los estudiantes que influyen en el aprendizaje de su disciplina", "diálogo entre la teoría y la práctica: diseño de las planeaciones fundamentadas como hipótesis de acción", "intervención didáctica: conocimiento y reflexión en la acción", "reflexión sobre la práctica docente: planeación-intervención-evaluación"]'::jsonb,
    habilidades_desempenos  = '["Explica la importancia de la investigación-acción para mejorar la práctica pedagógica", "diseña sesiones de aprendizaje fundamentadas, que le permiten desarrollar sesiones pertinentes con el contexto de la institución educativa y las características de los estudiantes", "elabora una reflexión y análisis de su práctica en aula, haciendo uso del registro anecdótico y los diarios de campo", "sustenta su ensayo crítico de reflexión de su práctica, incorporando las mejoras a que hubiere lugar"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1010$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Sociolingüística$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["del lenguaje como práctica social", "El Análisis Crítico del Discurso como perspectiva teórica para desvendar prácticas discursivas que legitiman la desigualdad y exclusión", "Modelo discursivo funcional", "Modelo discursivo sociocognitivo", "Modelo discursivo histórico", "Modelo discursivo crítico"]'::jsonb,
    habilidades_desempenos  = '["explica los modelos funcional y sociocognitivo del análisis crítico del discurso", "Explica los modelos histórico y crítico del análisis crítico del discurso", "Aplica las categorías del modelo funcional para analizar discursos sociales del ámbito nacional y latinoamericano", "Aplica las categorías del modelo sociocognitivo para analizar discursos sociales del ámbito nacional y latinoamericano", "Aplica las categorías del modelo histórico y crítico para analizar discursos sociales del ámbito nacional y latinoamericano"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1245$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica de la lectura$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["enfoques de escritura: lingüístico, psicolingüístico, sociocultural", "Literacidad", "Tipos de textos", "Géneros discursivos"]'::jsonb,
    habilidades_desempenos  = '["detectar situaciones de intervención y atención formativas en escritura, según sus contextos socioculturales", "Elabora planes formativos de escritura, tomando en cuenta las limitaciones y deficiencias diagnosticadas", "Ejecuta planes formativos de escritura, innovadores, transformando situaciones diagnosticadas"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1246$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Pragmática Lingüística$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["diversidad lingüística en el Perú precolonial", "Literatura oral: La lírica quechua colonial", "El manuscrito de Huarochirí", "Literatura oral en la Amazonía", "Literatura Aimara", "Teatro Inca: Ollantay", "Las crónicas", "Inca Garcilaso de la Vega y Guamán Poma", "Barroco: Juan de Espinosa Medrano, Juan del Valle y Caviedes y Pedro de Peralta Barnuevo", "Pablo de Olavide"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura peruana de tradición oral", "Explica la literatura peruana de tradición oral, considerando los principales textos", "Comenta textos literarios de la literatura peruana de tradición oral, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura peruana de la colonia", "Explica la literatura peruana de la colonia, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de literatura peruana de la colonia, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1248$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura Universal Moderna y Contemporánea$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura medieval: Contexto histórico cultural", "Poesía y prosa", "Autores y obras", "Literatura prerrenacentista: Contextos", "Poesía, prosa y teatro", "Autores y obras", "Literatura renacentista: Contextos", "Poesía, teatro y prosa", "Autores y obras", "La novela picaresca", "Representantes", "La literatura barroca: Contextos", "Poesía, novela y teatro", "Representantes"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura medieval española", "Explica la literatura medieval española, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura medieval española, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura española de los siglos de oro", "Explica la literatura española de los siglos de oro, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de literatura española de los siglos de oro, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1247$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Planificación Didáctica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["evaluación del aprendizaje como parte de la evaluación educativa", "alcance conceptual", "ejes epistémicos", "principales definiciones", "supuestos y problemáticas", "la evaluación del aprendizaje", "enfoques", "objeto", "dominio", "niveles", "características", "funciones", "tipos", "clasificación y planeamiento del proceso de evaluación del aprendizaje", "técnicas e instrumentos de evaluación"]'::jsonb,
    habilidades_desempenos  = '["identificar qué concepción y enfoque de evaluación maneja su docente", "diseña un instrumento de evaluación", "aplica el instrumento durante sus prácticas profesionales"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1017$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Seminario de investigación cualitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["recolección de datos con enfoques cualitativos y de investigación acción", "unidades de análisis", "técnicas de observación participante", "la entrevista en profundidad", "grupos de enfoque", "biografías e historias de vida", "los diarios de campo", "criterios de validación de instrumentos", "técnicas para la sistematización de la información", "análisis de los datos cualitativos: codificación abierta", "axial y selectiva", "Generación de conceptos", "categorías", "temas", "descripciones", "diseño cualitativo (etnográfico, fenomenológico, hermenéutico, teoría fundamentada, estudio de caso, narrativo biográfico) a las circunstancias de la investigación (el ambiente, los participantes y el trabajo de campo)"]'::jsonb,
    habilidades_desempenos  = '["aplica instrumentos", "analiza tipos de instrumentos", "determina formas de recolección de información", "aplica técnicas para la sistematización de la información", "analiza datos cualitativos: codificación abierta", "axial y selectiva", "genera conceptos", "categorías", "temas", "descripciones", "adapta diseños cualitativos"]'::jsonb,
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
    hours_practice          = 4,
    prerequisites           = $$Análisis Crítico del Discurso$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["diversidad lingüística en la región y el Perú", "Variación lingüística regional: dialectos", "Problemas lingüísticos regionales y nacionales", "Diversidad lingüística en el mundo", "Variación lingüística social: sociolectos"]'::jsonb,
    habilidades_desempenos  = '["describir la diversidad lingüística dialectal", "Analiza la diversidad lingüística del dialecto regional", "Describe la variación lingüística sociolectal", "Analiza la variación lingüística sociolectal regional"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1290$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica de la escritura$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["enfoques de oralidad: normativa", "discursiva", "Oralidad", "Géneros discursivos orales"]'::jsonb,
    habilidades_desempenos  = '["detectar situaciones de intervención y atención", "Describe lineamientos de enfoques", "Explica fundamentos de la didáctica de oralidad", "Diseña procesos formativos de géneros discursivos orales", "Instrumenta metodologías de formación para la oralidad"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1291$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura peruana oral y colonial$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura de la Emancipación", "Mariano Melgar", "Costumbrismo: Felipe Pardo y Manuel Ascencio Segura", "Romanticismo: Los bohemios", "Carlos Augusto Salaverry y Ricardo Palma", "Realismo: Manuel González Prada y Clorinda Matto de Turner", "Modernismo: Poesía de José Santos Chocano", "Prosa modernista", "Clemente Palma"]'::jsonb,
    habilidades_desempenos  = '["caracterizar el contexto histórico cultural de la literatura peruana costumbrista y romántica", "Explica la literatura peruana costumbrista y romántica, considerando los principales textos", "Comenta textos literarios de literatura peruana costumbrista y romántica, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura peruana realista y modernista", "Explica la literatura peruana realista y modernista, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de literatura peruana realista y modernista, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1293$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura española medieval y del siglo de oro.$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura neoclásica", "Prosa y teatro del siglo XVIII", "El romanticismo", "Poesía y teatro romántico", "La novela realista", "La poesía modernista", "La generación del 98", "La generación del 27", "La literatura de la posguerra civil", "La novela experimental", "Poesía, narrativa y teatro actual"]'::jsonb,
    habilidades_desempenos  = '["caracterizar el contexto histórico cultural de la literatura española moderna", "Explica la literatura española moderna, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura española moderna, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura española contemporánea", "Explica la literatura española contemporánea, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de literatura española contemporánea, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1292$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Evaluación de los Aprendizajes$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["aspectos teóricos de las ciencias administrativas", "los modelos y enfoques de gestión", "las dimensiones de la gestión (Institucional, administrativa, pedagógica)", "el planeamiento (planeamiento estratégico, planeamiento operativo)", "la organización (elementos conceptuales, naturaleza y principio de las organizaciones, ambiente institucional, desarrollo organizacional, estructura y procesos organizacional", "los fundamentos de la administración educativa (ciencias administrativas, los enfoques de la administración, las funciones de la administración pública y administración educativa-Práctica pedagógica: objetivos, funciones, actividades", "el clima organizacional", "Principios", "Dimensiones", "Indicadores", "Condicionantes", "calidad educativa", "indicadores", "el desarrollo de la naturaleza de la dirección", "los roles y competencias directivas", "la gestión de Recursos Humanos", "la gestión de Recursos Administrativos", "la gestión de Recursos Financieros"]'::jsonb,
    habilidades_desempenos  = '["identifica fases de planificación", "identifica dimensiones de planeamiento estratégico", "elabora el plan estratégico", "define capacidades y desempeños de la gestión educativa", "Identifica los procesos de control educativo", "caracteriza los roles de participación democrática", "Identifica los objetivos estratégicos", "Caracteriza al buen clima organizacional", "Analiza acciones de evaluación de procesos", "Propone acciones de evaluación de procesos", "Identifica procesos de gestión", "identifica procesos de acompañamiento", "establece acciones de control", "organiza acciones en función al tipo de recursos", "propone formas y requerimientos del uso de recursos"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1018$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Técnicas e instrumentos de investigación cuantitativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["estadística descriptiva", "conceptos básicos de estadística", "organización y representación gráfica de una variable", "la distribución de frecuencias", "puntuaciones individuales y curva normal", "estudio conjunto de dos variables", "regresión lineal", "SPSS para el análisis de datos", "estadística inferencial", "la teoría de la probabilidad", "variables aleatorias y distribuciones de probabilidad"]'::jsonb,
    habilidades_desempenos  = '["analiza datos", "aplica técnicas y la estadística descriptiva", "comprueba hipótesis", "analiza datos y variables"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDE1019$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Desarrollo Profesional IV: Innovación Didáctica$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Desarrollo de sesiones de aprendizaje", "Materiales didácticos y evaluación del aprendizaje", "gestión educativa", "procesos y etapas de la gestión en instituciones educativas las cuatro funciones básicas de la administración educativa", "ejercicio de la planificación: Se cuenta con el Proyecto Educativo Institucional y el Proyecto Curricular institucional, la Programación Curricular de Aula", "Avances", "ejercicio de la organización", "ejercicio de la dirección: Grado de cumplimiento de los roles directivos básicos", "ejercicio del control: Monitoreo y evaluación"]'::jsonb,
    habilidades_desempenos  = '["Diseña sesiones de aprendizaje fundamentadas, que le permiten desarrollar sesiones pertinentes con el contexto de la institución educativa y las características de los estudiantes"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1012$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Dialectología$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["género discursivo académico", "El artículo de investigación", "La ponencia", "El ensayo académico", "La reseña crítica", "Estructura secuencial, semántica, retórica y pragmática", "Normativa escrita académica", "Normas de estilo"]'::jsonb,
    habilidades_desempenos  = '["caracterizar los diversos formatos del género discursivo académico", "Elabora textos académicos tomando en cuenta su estructura formal y semántica", "Revisa textos académicos en situaciones de producción discursiva disciplinar-profesional", "Edita textos académicos, en situaciones de producción discursiva disciplinar-profesional"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1327$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Didáctica de la oralidad$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["enfoques de literatura: historia literaria, taller literario, comentario literario", "Ficción literaria", "Texto literario", "Discurso literario", "Tópicos literarios"]'::jsonb,
    habilidades_desempenos  = '["detecta situaciones de intervención y atención", "Describe lineamientos de enfoques", "Explica fundamentos de la didáctica de literatura", "Diseña procesos formativos en literatura", "Instrumenta metodologías de formación en didáctica de la literatura"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1326$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura peruana de la emancipación al modernismo$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Posmodernismo: Contexto histórico cultural", "Abraham Valdelomar y José María Eguren", "Vanguardismo: Contextos", "César Vallejo y Martín Adán", "Indigenismo: Contextos", "López Albújar y Alegría", "Neoindigenismo: Arguedas y Scorza", "Narrativa urbana: Vargas Llosa, Ribeyro y Bryce", "Poesía Generacional: Generación del 50, 60, 70, 80, 90 y 2000"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura peruana posmodernista y vanguardista", "Explica la literatura peruana posmodernista y vanguardista, considerando los principales textos", "Comenta textos literarios de la literatura peruana posmodernista y vanguardista, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura peruana indigenista y de narrativa urbana", "Explica la literatura peruana indigenista y de narrativa urbana, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de literatura peruana indigenista y de narrativa urbana, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1329$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura española moderna y contemporánea$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Literatura prehispánica", "Las crónicas de Indias", "Colón, Cortés y Las Casas", "La Araucana", "El Renacimiento", "Contexto histórico cultural", "Sor Juana Inés de la Cruz", "El Barroco hispanoamericano", "Contexto y representantes", "Neoclasicismo", "La conciencia nacional", "El Lazarillo de Carrió de la Vandera", "La Carta de Viscardo", "La poesía cívica de Olmedo", "La narrativa de Joaquín Fernández de Lizardi", "Andrés Bello", "La tradición gauchesca: el Martín Fierro de José Hernández", "Romanticismo", "Echeverría, Mármol y Sarmiento", "La novela paradigmática del romanticismo: María de Jorge Isaacs", "Modernismo: Martí, Nájera, Lugones y Rubén Darío"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura latinoamericana de los siglos XVI-XVIII", "Explica la literatura latinoamericana de los siglos XVI-XVIII, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura latinoamericana de los siglos XVI-XVIII, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura latinoamericana del siglo XIX", "Explica la literatura latinoamericana del siglo XIX, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura latinoamericana del siglo XIX, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1328$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 2,
    prerequisites           = $$Gestión Educativa$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["modelos de intervención participativa", "el desarrollo sostenible", "la promoción sociocultural", "los actores comunitarios", "el proyecto participativo", "el Protocolo de proyecto participativo", "el protocolo de ejecución participativa", "el marco de acción participativo", "la metodología participativa establece redes y sus funciones de intervención", "el Sistema de evaluación de proyectos de intervención social", "los criterios e instrumentos de evaluación de proyectos de intervención", "los procesos de la implementación de proyectos de intervención social", "la metodología participativa", "los Instrumentos de acción participativa"]'::jsonb,
    habilidades_desempenos  = '["Identifica modelos de intervención participativa", "describe los fundamentos de modelos de intervención", "Compara fundamentos teóricos del proyecto participativo comunitario", "Identifica los componentes del proyecto participativo comunitario", "Describe los fundamentos de modelos de intervención", "caracteriza los componentes de desarrollo sostenible", "Identifica situaciones del ámbito educativo", "diferencia hechos de situaciones problemáticas", "diagnóstica situaciones problemáticas de urgente intervención", "determina los protocolos de atención", "explica el marco de acción participativa", "define roles y funciones en el proyecto de intervención", "determina funciones de intervención", "organiza equipos y redes de colaboración", "Identifica criterios e instrumentos de evaluación afines a proyectos de intervención social", "selecciona criterios e instrumentos de evaluación de proyectos de intervención social", "organiza los objetivos del proyecto de intervención", "determina componentes de la organización de un plan de intervención", "elabora el plan de proyecto de intervención social"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
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
    habilidades_desempenos  = '["Elabora el diagnóstico de su práctica pedagógica, mediante el uso de diarios de campo", "elabora el plan de implementación para la intervención didáctica", "ejecuta el plan de implementación didáctica y evalúa sus resultados"]'::jsonb,
    actividades_metodo      = NULL
WHERE code = $$CEDE1013$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura peruana contemporánea$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Epígonos del siglo XIX", "Emiliano Niño Pastor", "La poesía José Eufemio Lora y Lora", "La narrativa lambayecana en sus orígenes", "Vanguardismo", "Juan José Lora", "León Barandiarán", "Mario A. Puga", "La generación Yunga", "Alejandro Lora Risco", "Alfredo Delgado Bravo", "Andrés Díaz Núñez", "José Ramírez Ruiz y Hora Cero", "Panorama actual de la poesía lambayecana", "Narrativa lambayecana contemporánea"]'::jsonb,
    habilidades_desempenos  = '["caracteriza el contexto histórico cultural de la literatura regional lambayecana del siglo XIX", "Explica la literatura regional lambayecana del siglo XIX, considerando los principales autores y obras", "Comenta textos literarios de la literatura regional lambayecana del siglo XIX, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura regional lambayecana contemporánea", "Explica la literatura regional lambayecana contemporánea, considerando sus principales representantes y obras", "Comenta textos literarios de la literatura regional lambayecana contemporánea, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1351$$;

UPDATE courses SET
    hours_theory            = 2,
    hours_practice          = 4,
    prerequisites           = $$Literatura Latinoamericana del siglo XVI al XIX$$,
    tipo_curso              = $$Obligatorio$$,
    naturaleza              = $$Teórico - práctica$$,
    temas_conocimientos     = '["Posmodernismo: Mistral y Storni", "Realismo social: Quiroga, Azuela, Rivera, Güiraldes y Rómulo Gallegos", "Vanguardismo y posvanguardismo", "Neruda, Paz y Cardenal", "Realismos imaginarios: Asturias, Carpentier y Borges", "El boom latinoamericano", "Representantes y obras", "Narrativa actual"]'::jsonb,
    habilidades_desempenos  = '["caracterizar los contextos histórico culturales del postmodernismo, realismo social, vanguardismo y posvanguardismo", "Explica la literatura latinoamericana del postmodernismo, realismo social, vanguardismo y postvanguardismo, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura latinoamericana del posmodernismo, el realismo social, vanguardismo y postvanguardismo, considerando sus contextos de producción y recepción", "Caracteriza el contexto histórico cultural de la literatura latinoamericana de los realismos imaginarios, el boom latinoamericano y la narrativa actual", "Explica la literatura latinoamericana de los realismos imaginarios, el boom latinoamericano y la narrativa actual, considerando sus principales escuelas literarias y representantes", "Comenta textos literarios de la literatura latinoamericana de los realismos imaginarios, el boom latinoamericano y la narrativa actual, considerando sus contextos de producción y recepción"]'::jsonb,
    actividades_metodo      = '["exposiciones", "debates", "foros", "estudio de casos", "trabajo cooperativo", "análisis de lecturas"]'::jsonb
WHERE code = $$CEDS1350$$;

-- VERIFICACIÓN
SELECT COUNT(*) AS total, COUNT(hours_theory) AS con_horas,
       COUNT(prerequisites) AS con_prerequisitos, COUNT(temas_conocimientos) AS con_temas
FROM courses WHERE code IN ($$HUMG1003$$, $$CEDG1010$$, $$CEDG1007$$, $$HUMG1002$$, $$HUMG1001$$, $$SOCG1001$$, $$CEDG1009$$, $$HUMG1005$$, $$MATG1001$$, $$HUMG1009$$, $$CEDE1001$$, $$CEDE1002$$, $$CEDG1008$$, $$HUMG1006$$, $$CEDG1001$$, $$BIOG1001$$, $$CYEG1001$$, $$MATG1002$$, $$HUMG1010$$, $$CEDE1003$$, $$CEDE1004$$, $$CEDS1002$$, $$CEDS1057$$, $$CEDS1056$$, $$CEDS1059$$, $$CEDS1058$$, $$CEDS1055$$, $$CEDE1023$$, $$CEDE1022$$, $$CEDS1104$$, $$CEDS1105$$, $$CEDS1101$$, $$CEDS1103$$, $$CEDS1100$$, $$CEDS1102$$, $$CEDE1005$$, $$CEDE1006$$, $$CEDE1008$$, $$CEDS1154$$, $$CEDS1151$$, $$CEDS1152$$, $$CEDS1153$$, $$CEDE1014$$, $$CEDE1007$$, $$CEDE1009$$, $$CEDS1205$$, $$CEDS1202$$, $$CEDS1204$$, $$CEDS1203$$, $$CEDE1050$$, $$CEDE1016$$, $$CEDE1010$$, $$CEDS1245$$, $$CEDS1246$$, $$CEDS1248$$, $$CEDS1247$$, $$CEDE1017$$, $$CEDE1015$$, $$CEDE1011$$, $$CEDS1290$$, $$CEDS1291$$, $$CEDS1293$$, $$CEDS1292$$, $$CEDE1018$$, $$CEDE1019$$, $$CEDE1012$$, $$CEDS1327$$, $$CEDS1326$$, $$CEDS1329$$, $$CEDS1328$$, $$CEDE1020$$, $$CEDE1021$$, $$CEDE1013$$, $$CEDS1351$$, $$CEDS1350$$);