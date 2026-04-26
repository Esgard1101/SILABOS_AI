-- ============================================================
-- MIGRACIÓN: Repositorio metodológico oficial (Manual V3 §15)
-- ALTER teaching_methods + UPDATE 11 métodos con:
--   * phase_rules_json (distribución fase x unidad x semana)
--   * proposito, rol_docente, rol_estudiante, productos_tipicos
--   * phases coherentes con EjemplosDeSilabos
-- Idempotente. Ejecutar manualmente en Adminer.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PASO 1: ALTER TABLE — agregar columnas Manual §15
-- ─────────────────────────────────────────────────────────────
ALTER TABLE teaching_methods
    ADD COLUMN IF NOT EXISTS proposito         TEXT,
    ADD COLUMN IF NOT EXISTS rol_docente       TEXT,
    ADD COLUMN IF NOT EXISTS rol_estudiante    TEXT,
    ADD COLUMN IF NOT EXISTS productos_tipicos JSONB;

-- phase_rules_json y grading_template_json ya existen según schema actual.

-- ─────────────────────────────────────────────────────────────
-- PASO 2: UPDATE 11 métodos
-- WHERE: matchea por code o por name ILIKE para tolerar variaciones
-- ─────────────────────────────────────────────────────────────

-- 1. ABPro — Aprendizaje Basado en Proyectos
UPDATE teaching_methods SET
    phases = '["Exploración y planteamiento del problema","Investigación y planificación","Desarrollo del proyecto","Evaluación y presentación"]'::jsonb,
    proposito = 'Sitúa al estudiante como protagonista del proceso. Organiza el aprendizaje en torno al desarrollo de un proyecto aplicado a un problema relevante del curso.',
    rol_docente = 'Facilitador, orientador y retroalimentador del proceso de proyecto.',
    rol_estudiante = 'Rol activo en la indagación, análisis, producción y exposición del proyecto.',
    productos_tipicos = '["árbol de problemas","plan de proyecto","informe de avance","dossier analítico","prototipo","informe final","exposición"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [2,1,2,3]},
        {"weeks": [2,2,3,3]}
      ],
      "actions_by_week": {
        "1": "presentación del proyecto del curso; formulación del problema guía; lluvia de ideas",
        "2": "revisión documental guiada; organización de equipos; definición de roles del proyecto",
        "3": "análisis de casos; construcción de línea de tiempo; contrastación de interpretaciones",
        "4": "socialización del primer avance del proyecto; retroalimentación docente y coevaluación",
        "5": "delimitación específica del subtema por equipos; definición del producto parcial",
        "6": "contraste de fuentes; elaboración de cuadro comparativo sustentado",
        "7": "producción de recurso explicativo grupal sobre los contenidos clave",
        "8": "exposición de resultados intermedios y retroalimentación",
        "9": "interpretación de fuentes; análisis profundo del bloque temático",
        "10": "trabajo con datos, estadísticas y testimonios del periodo",
        "11": "elaboración de propuesta de capítulo o sección final del proyecto",
        "12": "mesa académica y revisión por pares; examen parcial",
        "13": "organización del producto final del proyecto",
        "14": "elaboración del informe final y del recurso de difusión",
        "15": "defensa del proyecto final ante público académico",
        "16": "autoevaluación, coevaluación y proyección didáctica del proceso"
      }
    }'::jsonb
WHERE code = 'ABPro' OR name ILIKE 'Aprendizaje Basado en Proyectos%';

-- 2. ABDe — Aprendizaje Basado en Desafíos
UPDATE teaching_methods SET
    phases = '["Idea general y preguntas esenciales","Definición del reto e investigación","Implementación de la solución","Evaluación y difusión"]'::jsonb,
    proposito = 'Aborda problemas abiertos de impacto real. Promueve investigación, creatividad, pensamiento crítico y compromiso con la comunidad.',
    rol_docente = 'Mediador y orientador del reto.',
    rol_estudiante = 'Protagonismo en formulación de preguntas, investigación, soluciones y difusión.',
    productos_tipicos = '["lista de preguntas esenciales","redacción del reto","prototipo de solución","video o pitch","recurso didáctico final","informe reflexivo"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,1,3]},
        {"weeks": [1,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [1,2,3,3]}
      ],
      "actions_by_week": {
        "1": "presentación del gran desafío del curso; formulación de preguntas esenciales",
        "2": "revisión de fuentes; construcción del reto de unidad",
        "3": "consulta de bibliografía y materiales digitales; discusión guiada",
        "4": "presentación del desafío de unidad; pitch breve y retroalimentación",
        "5": "precisión y delimitación del reto interpretativo",
        "6": "comparación de fuentes; organización del trabajo por equipos",
        "7": "diseño de recurso o propuesta explicativa para el desafío",
        "8": "presentación pública del recurso; reflexión crítica del impacto",
        "9": "identificación de tensiones y problema de la nueva unidad",
        "10": "trabajo con textos, datos y debates",
        "11": "creación de la propuesta explicativa para el desafío",
        "12": "sustentación y coevaluación; examen parcial",
        "13": "análisis documental y construcción del desafío final",
        "14": "diseño del recurso final de difusión",
        "15": "presentación pública del producto final",
        "16": "autoevaluación, coevaluación y reflexión sobre impacto"
      }
    }'::jsonb
WHERE code = 'ABDe' OR name ILIKE 'Aprendizaje Basado en Desafíos%' OR name ILIKE 'Aprendizaje Basado en Desafios%';

-- 3. Aprendizaje Cooperativo
UPDATE teaching_methods SET
    phases = '["Conformación de grupos y roles","Investigación individual","Reunión de expertos","Consolidación grupal y evaluación"]'::jsonb,
    proposito = 'Aprendizaje en grupos heterogéneos con interdependencia positiva, donde cada miembro aporta y aprende de los demás.',
    rol_docente = 'Diseñador de tareas cooperativas, monitor de grupos y evaluador de procesos.',
    rol_estudiante = 'Miembro activo del grupo, responsable de su rol y de los aprendizajes colectivos.',
    productos_tipicos = '["mapa de roles del equipo","ficha de investigación individual","síntesis de expertos","producto cooperativo final","autoevaluación y coevaluación"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [1,2,3,3]}
      ],
      "actions_by_week": {
        "1": "conformación de equipos heterogéneos; asignación de roles cooperativos",
        "2": "investigación individual sobre subtema asignado",
        "3": "reunión de expertos; intercambio de hallazgos entre equipos",
        "4": "consolidación grupal y evaluación cooperativa",
        "5": "redefinición de roles y tareas cooperativas",
        "6": "investigación individual de profundización",
        "7": "reunión de expertos para integración del aprendizaje",
        "8": "presentación grupal y coevaluación",
        "9": "trabajo cooperativo de aplicación",
        "10": "investigación individual con fuentes especializadas",
        "11": "reunión de expertos y debate académico",
        "12": "evaluación cooperativa y examen parcial",
        "13": "investigación cooperativa final",
        "14": "consolidación del producto final",
        "15": "presentación pública del producto cooperativo",
        "16": "autoevaluación, coevaluación y cierre"
      }
    }'::jsonb
WHERE code IN ('AC','APC') OR name ILIKE 'Aprendizaje Cooperativo%';

-- 4. Estudio de Casos
UPDATE teaching_methods SET
    phases = '["Presentación del caso","Análisis individual y grupal","Discusión y debate","Resolución y evaluación"]'::jsonb,
    proposito = 'Análisis profundo de situaciones reales o simuladas que articulan teoría y práctica para construir aprendizajes situados.',
    rol_docente = 'Selecciona casos pertinentes, modera la discusión y orienta la construcción de soluciones.',
    rol_estudiante = 'Analiza, argumenta, contrasta perspectivas y propone resoluciones fundamentadas.',
    productos_tipicos = '["ficha de caso","matriz de análisis","ensayo argumentativo","propuesta de resolución","rúbrica de discusión"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [1,2,3,3]}
      ],
      "actions_by_week": {
        "1": "presentación del caso central de la unidad; lectura inicial",
        "2": "análisis individual con guía de preguntas",
        "3": "discusión grupal y debate guiado",
        "4": "resolución argumentada y evaluación del caso",
        "5": "presentación de un nuevo caso de mayor complejidad",
        "6": "análisis comparativo entre casos",
        "7": "debate académico moderado",
        "8": "informe de resolución y coevaluación",
        "9": "estudio de caso con datos primarios",
        "10": "análisis multidimensional del caso",
        "11": "panel de discusión académica",
        "12": "resolución integradora y examen parcial",
        "13": "caso final integrador del curso",
        "14": "análisis sistemático del caso final",
        "15": "exposición pública de la resolución",
        "16": "metacognición y cierre del proceso de análisis"
      }
    }'::jsonb
WHERE code IN ('EC','ABEC') OR name ILIKE 'Estudio de Casos%' OR name ILIKE '%Estudio de Caso%';

-- 5. ABI — Aprendizaje Basado en Investigación
UPDATE teaching_methods SET
    phases = '["Identificación de la problemática","Revisión de literatura","Definición metodológica","Implementación del proceso investigativo","Socialización de resultados"]'::jsonb,
    proposito = 'Construcción del conocimiento mediante un proceso investigativo riguroso, formulando preguntas y construyendo respuestas con evidencia.',
    rol_docente = 'Tutor de la indagación, orienta el rigor metodológico y el uso de fuentes.',
    rol_estudiante = 'Investigador activo: formula problemas, revisa literatura, recoge y analiza datos.',
    productos_tipicos = '["matriz de preguntas","fichas de lectura","marco metodológico","instrumento de recojo","informe de investigación","ponencia"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,4]},
        {"weeks": [0,1,3,4]},
        {"weeks": [0,2,3,4]},
        {"weeks": [3,3,4,4]}
      ],
      "actions_by_week": {
        "1": "identificación de la problemática; lluvia de ideas y formulación de preguntas orientadoras",
        "2": "revisión de literatura; lectura guiada y fichaje académico",
        "3": "definición de estrategias metodológicas; organización de categorías de análisis",
        "4": "socialización y cierre parcial; informe analítico de la unidad",
        "5": "formulación de la pregunta de investigación específica",
        "6": "revisión de literatura especializada; matriz comparativa",
        "7": "implementación del proceso investigativo; aplicación de categorías",
        "8": "seminario de avance; documentación de hallazgos",
        "9": "identificación del problema aplicado; diagnóstico",
        "10": "definición metodológica fina; análisis de pertinencia",
        "11": "implementación con instrumentos de recojo",
        "12": "discusión de resultados parciales y examen parcial",
        "13": "ejecución de la fase final de investigación",
        "14": "análisis e interpretación de resultados",
        "15": "ponencia final del informe de investigación",
        "16": "metacognición y reflexión sobre el proceso investigativo"
      }
    }'::jsonb
WHERE code = 'ABI' OR name ILIKE 'Aprendizaje Basado en Investigación%' OR name ILIKE 'Aprendizaje Basado en Investigacion%';

-- 6. Aprendizaje Experiencial
UPDATE teaching_methods SET
    phases = '["Experiencia concreta","Observación reflexiva","Conceptualización abstracta","Experimentación activa"]'::jsonb,
    proposito = 'Aprender haciendo, partiendo de experiencias concretas que se reflexionan, conceptualizan y aplican en nuevos contextos.',
    rol_docente = 'Diseñador de experiencias, facilitador de la reflexión y guía de la aplicación.',
    rol_estudiante = 'Sujeto activo de la experiencia, reflexiona críticamente y transfiere lo aprendido.',
    productos_tipicos = '["bitácora de experiencia","informe reflexivo","mapa conceptual","plan de aplicación","portafolio"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]}
      ],
      "actions_by_week": {
        "1": "vivencia de una experiencia concreta vinculada al contenido",
        "2": "observación reflexiva guiada por preguntas",
        "3": "conceptualización abstracta a partir de la experiencia",
        "4": "experimentación activa en nuevo contexto",
        "5": "nueva experiencia de mayor complejidad",
        "6": "reflexión crítica y bitácora",
        "7": "construcción conceptual con apoyo bibliográfico",
        "8": "aplicación práctica y coevaluación",
        "9": "experiencia situada en contexto real",
        "10": "observación documentada de la experiencia",
        "11": "conceptualización mediante mapas y modelos",
        "12": "aplicación en nuevo contexto; examen parcial",
        "13": "experiencia integradora final",
        "14": "reflexión crítica integradora",
        "15": "presentación del portafolio experiencial",
        "16": "metacognición y cierre del ciclo experiencial"
      }
    }'::jsonb
WHERE code IN ('AE','EXP') OR name ILIKE 'Aprendizaje Experiencial%';

-- 7. Taller
UPDATE teaching_methods SET
    phases = '["Demostración del docente","Ejercitación guiada","Producción autónoma","Socialización y evaluación"]'::jsonb,
    proposito = 'Espacio práctico de producción donde se aprende haciendo bajo guía del docente, con énfasis en la elaboración de productos concretos.',
    rol_docente = 'Demuestra técnicas, acompaña la ejercitación y evalúa productos.',
    rol_estudiante = 'Practica activamente, produce y socializa sus elaboraciones.',
    productos_tipicos = '["ejercicio modelo","ejercicio autónomo","prototipo","portafolio de producciones","exposición de productos"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [1,2,2,3]}
      ],
      "actions_by_week": {
        "1": "demostración inicial del docente sobre la técnica clave",
        "2": "ejercitación guiada paso a paso",
        "3": "producción autónoma del estudiante",
        "4": "socialización y evaluación de productos",
        "5": "demostración avanzada con nueva técnica",
        "6": "ejercitación con mayor autonomía",
        "7": "producción de mayor complejidad",
        "8": "exposición de productos y coevaluación",
        "9": "demostración integradora",
        "10": "ejercitación contextualizada",
        "11": "producción aplicada a contexto real",
        "12": "evaluación de productos; examen parcial",
        "13": "ejercitación final integradora",
        "14": "producción del portafolio final",
        "15": "exposición pública de productos",
        "16": "autoevaluación y cierre del taller"
      }
    }'::jsonb
WHERE code IN ('TAL','TALLER') OR name ILIKE 'Taller%';

-- 8. CER — Concepto Ejercicio Reflexión
UPDATE teaching_methods SET
    phases = '["Presentación del concepto","Ejercitación","Reflexión metacognitiva","Aplicación contextual"]'::jsonb,
    proposito = 'Articula la presentación de conceptos con su ejercitación, reflexión metacognitiva y aplicación a contextos reales.',
    rol_docente = 'Expone conceptos, propone ejercicios, modera la reflexión y plantea aplicaciones.',
    rol_estudiante = 'Comprende conceptos, ejercita procedimientos, reflexiona sobre su aprendizaje y los aplica.',
    productos_tipicos = '["mapa conceptual","cuaderno de ejercicios","informe metacognitivo","aplicación contextualizada"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]}
      ],
      "actions_by_week": {
        "1": "presentación del concepto central de la unidad",
        "2": "ejercitación guiada del concepto",
        "3": "reflexión metacognitiva sobre el proceso",
        "4": "aplicación contextual del concepto",
        "5": "presentación de concepto de mayor complejidad",
        "6": "ejercitación con problemas variados",
        "7": "reflexión metacognitiva grupal",
        "8": "aplicación a caso real; coevaluación",
        "9": "presentación de concepto integrador",
        "10": "ejercitación analítica",
        "11": "reflexión sobre transferencia",
        "12": "aplicación contextual; examen parcial",
        "13": "concepto final del curso",
        "14": "ejercitación sintética",
        "15": "aplicación final contextualizada",
        "16": "reflexión metacognitiva del curso"
      }
    }'::jsonb
WHERE code = 'CER' OR name ILIKE 'CER%' OR name ILIKE 'Concepto%';

-- 9. ADI — Análisis Dirigido de Información
UPDATE teaching_methods SET
    phases = '["Selección de fuentes","Análisis dirigido","Sistematización","Comunicación de hallazgos"]'::jsonb,
    proposito = 'Desarrolla la capacidad de buscar, seleccionar, analizar y comunicar información de fuentes diversas con rigor crítico.',
    rol_docente = 'Orienta la selección de fuentes confiables, guía el análisis y modela la comunicación académica.',
    rol_estudiante = 'Selecciona fuentes, aplica criterios de análisis, sistematiza información y comunica hallazgos.',
    productos_tipicos = '["ficha de fuentes","matriz de análisis","síntesis sistemática","ensayo o ponencia"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [1,2,3,3]}
      ],
      "actions_by_week": {
        "1": "selección de fuentes confiables sobre el tema",
        "2": "análisis dirigido con criterios académicos",
        "3": "sistematización en organizadores gráficos",
        "4": "comunicación de hallazgos parciales",
        "5": "selección de fuentes especializadas",
        "6": "análisis comparativo de fuentes",
        "7": "sistematización con matrices analíticas",
        "8": "ponencia académica de hallazgos; coevaluación",
        "9": "selección de fuentes primarias y secundarias",
        "10": "análisis crítico de fuentes",
        "11": "sistematización integradora",
        "12": "comunicación académica; examen parcial",
        "13": "selección de fuentes para producto final",
        "14": "análisis final sistemático",
        "15": "exposición pública de hallazgos",
        "16": "metacognición sobre el proceso de análisis"
      }
    }'::jsonb
WHERE code = 'ADI' OR name ILIKE 'ADI%' OR name ILIKE 'Análisis Dirigido%' OR name ILIKE 'Analisis Dirigido%';

-- 10. Resolución de Problemas
UPDATE teaching_methods SET
    phases = '["Comprensión del problema","Diseño de plan","Ejecución del plan","Verificación y reflexión"]'::jsonb,
    proposito = 'Desarrolla la capacidad de comprender, planificar, resolver y verificar la solución de problemas auténticos del campo disciplinar.',
    rol_docente = 'Plantea problemas pertinentes, orienta estrategias y retroalimenta procesos.',
    rol_estudiante = 'Comprende, planifica, ejecuta soluciones y verifica resultados con sentido crítico.',
    productos_tipicos = '["enunciado del problema","plan de resolución","solución argumentada","informe de verificación"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]}
      ],
      "actions_by_week": {
        "1": "comprensión del problema central de la unidad",
        "2": "diseño del plan de resolución",
        "3": "ejecución del plan diseñado",
        "4": "verificación y reflexión sobre la solución",
        "5": "comprensión de problema más complejo",
        "6": "diseño de estrategias alternativas",
        "7": "ejecución con uso de herramientas",
        "8": "verificación argumentada; coevaluación",
        "9": "comprensión de problema contextual",
        "10": "diseño multietapa del plan",
        "11": "ejecución sistemática",
        "12": "verificación con criterios; examen parcial",
        "13": "comprensión del problema integrador final",
        "14": "diseño y ejecución del plan final",
        "15": "presentación de la solución final",
        "16": "reflexión metacognitiva sobre el proceso resolutivo"
      }
    }'::jsonb
WHERE code = 'RP' OR name ILIKE 'Resolución de Problemas%' OR name ILIKE 'Resolucion de Problemas%';

-- 11. EMR — Educación Matemática Realista
UPDATE teaching_methods SET
    phases = '["Contexto significativo","Matematización progresiva","Formalización","Aplicación y reflexión"]'::jsonb,
    proposito = 'Aprendizaje de la matemática desde contextos significativos, mediante procesos de matematización progresiva hacia la formalización.',
    rol_docente = 'Diseña contextos significativos, guía la matematización y formaliza con rigor.',
    rol_estudiante = 'Matematiza desde la experiencia, construye modelos y aplica el conocimiento formalizado.',
    productos_tipicos = '["situación contextual","modelo matemático","síntesis formal","aplicación a problemas reales"]'::jsonb,
    phase_rules_json = '{
      "by_unit": [
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]},
        {"weeks": [0,1,2,3]}
      ],
      "actions_by_week": {
        "1": "exploración de un contexto significativo del tema",
        "2": "matematización progresiva del contexto",
        "3": "formalización de modelos y notaciones",
        "4": "aplicación a problemas reales y reflexión",
        "5": "nuevo contexto significativo de mayor complejidad",
        "6": "matematización progresiva con representaciones",
        "7": "formalización con lenguaje matemático preciso",
        "8": "aplicación contextual; coevaluación",
        "9": "contexto integrador de la unidad",
        "10": "matematización con múltiples representaciones",
        "11": "formalización articulada con teoría",
        "12": "aplicación a problemas reales; examen parcial",
        "13": "contexto final integrador del curso",
        "14": "matematización sintética del curso",
        "15": "formalización y comunicación de resultados",
        "16": "reflexión metacognitiva sobre la matematización"
      }
    }'::jsonb
WHERE code = 'EMR' OR name ILIKE 'Educación Matemática Realista%' OR name ILIKE 'Educacion Matematica Realista%';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT
    name,
    code,
    jsonb_array_length(phases) AS n_fases,
    (phase_rules_json IS NOT NULL) AS tiene_reglas,
    (proposito IS NOT NULL) AS tiene_proposito,
    (rol_docente IS NOT NULL) AS tiene_rol_docente,
    (productos_tipicos IS NOT NULL) AS tiene_productos
FROM teaching_methods
WHERE is_archived = false
ORDER BY name;
