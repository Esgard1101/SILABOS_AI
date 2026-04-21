**MANUAL DEL PROGRAMADOR**

**Plataforma Inteligente para Elaboración de Sílabos**

**1. Finalidad del sistema**

Debes construir una plataforma institucional para elaborar sílabos universitarios con apoyo de IA, respetando el currículo oficial y asistiendo al docente en la operacionalización pedagógica del curso.

La app debe permitir:

* importar componentes curriculares oficiales;
* proponer componentes operativos cuando falten;
* trabajar con una biblioteca institucional de habilidades;
* trabajar con un repositorio metodológico oficial;
* trabajar con un sistema híbrido de fuentes documentales;
* validar coherencia curricular, didáctica, metodológica y evaluativa;
* mantener trazabilidad;
* permitir revisión y aprobación académica.

**2. Lógica didáctica interna fija del sistema**

La app debe tener una **capa teórica interna** con cuatro categorías estables:

* **Propósito**
* **Contenido**
* **Método**
* **Evaluación**

Estas categorías son internas.
Los nombres visibles dependen del modelo curricular y de la plantilla institucional.

**Equivalencias funcionales**

**Propósito** puede mostrarse como:

* competencia,
* capacidad,
* resultado de aprendizaje,
* desempeño,
* objetivo.

**Contenido** puede mostrarse como:

* conocimientos,
* habilidades,
* capacidades,
* actitudes,
* contenidos mínimos,
* contenidos analíticos.

**Método** puede mostrarse como:

* metodología de enseñanza-aprendizaje,
* estrategia metodológica,
* enfoque metodológico,
* secuencia didáctica.

**Evaluación** puede mostrarse como:

* evidencias,
* instrumentos,
* sistema de evaluación,
* sistema de calificación.

**3. Regla didáctica central**

La secuencia correcta del sistema es:

Propósito
→ Contenido
→ Método
→ Evaluación

**Interpretación**

**3.1 Propósito**

Responde al **para qué** del proceso formativo.
Aquí se ubican:

* competencia,
* capacidad,
* resultado de aprendizaje,
* desempeño,
* objetivo.

**3.2 Contenido**

Responde al **qué aprende el estudiante para lograr el propósito**.
Incluye:

* conocimientos,
* habilidades/capacidades,
* actitudes.

**3.3 Método**

Responde al **cómo se aborda el contenido para alcanzar el propósito**.
Se selecciona solo después de haber definido propósito y contenido.

**3.4 Evaluación**

Responde a **cómo se verificará el logro del propósito**, mediante:

* evidencias,
* instrumentos,
* calificación.

**4. Regla formal sobre desempeños**

Debes programar exactamente esta lógica:

si existen desempeños oficiales:
 importar desempeños
 usarlos como referencia oficial
 validar alineamiento curricular
 permitir observación/propuesta de ajuste
 no reemplazarlos sin aprobación institucional

si no existen desempeños oficiales o están incompletos:
 generar desempeños sugeridos
 hacerlo con base en:
 sumilla
 competencia
 capacidad/resultado
 marcar esos desempeños como "sugeridos por el sistema"
 exigir validación académica antes de aprobar el sílabo

después:
 derivar contenido formativo:
 conocimientos
 habilidades/capacidades
 actitudes

luego:
 seleccionar método según:
 propósito
 contenido
 tipo de aprendizaje requerido

**Regla crítica**

El sistema **no debe generar el desempeño a partir del método**.
El método entra después, porque el desempeño pertenece al plano del **Propósito**.

**5. Arquitectura general**

Universidad
→ Facultad
→ Escuela Profesional
→ Programa / Especialidad
→ Plan de estudios (versión)
→ Curso
→ Sílabo
→ Versiones del sílabo

**6. Módulos del sistema**

**Módulo 1. Configuración institucional**

Debe administrar:

* facultades,
* escuelas,
* programas,
* planes,
* versiones,
* periodos.

**Módulo 2. Repositorio curricular**

Debe cargar:

* sumillas,
* competencias,
* capacidades/resultados,
* desempeños oficiales,
* Anexo 2,
* Anexo 3,
* plantilla oficial del sílabo.

**Módulo 3. Generador de sílabo**

Debe:

* importar lo oficial,
* proponer lo operativo,
* guardar versiones,
* bloquear aprobación si falla validación.

**Módulo 4. Biblioteca de habilidades**

Debe contener las **300 habilidades activas** y permitir búsqueda por:

* verbo,
* nivel cognitivo,
* disciplina,
* categoría,
* palabras clave.

**Módulo 5. Repositorio metodológico oficial**

Debe cargar y estructurar las guías metodológicas institucionales. La guía uniformizada debe ser una fuente oficial del sistema.

**Módulo 6. Motor metodológico**

Debe sugerir método troncal y complementario usando:

* propósito,
* contenido,
* disciplina,
* guía metodológica oficial.

**Módulo 7. Motor evaluativo**

Debe proponer:

* evidencias,
* instrumentos,
* sistema de evaluación,
* sistema de calificación.

**Módulo 8. Módulo de fuentes documentales**

Debe gestionar las dos vías:

* carga docente,
* búsqueda asistida por IA.

**Módulo 9. Validador curricular automático**

Debe ejecutar las reglas de validación antes de aprobar.

**Módulo 10. Auditor IA**

Debe hacer revisión semántica adicional.

**Módulo 11. Revisión académica**

Debe permitir:

* observar,
* devolver,
* aprobar,
* publicar.

**Módulo 12. Observación curricular**

Debe permitir:

* observar sumillas,
* observar desempeños,
* registrar propuesta de ajuste,
* escalar a Dirección de Escuela.

**7. Repositorio metodológico oficial**

Debes cargar al sistema, como mínimo, las metodologías que aparecen en la guía uniformizada:

* ABPro
* ABDe
* Aprendizaje Cooperativo
* Estudio de Casos
* Aprendizaje Basado en Investigación
* Aprendizaje Experiencial
* Taller
* Modelo CER
* Indagación Argumentada (ADI)
* Resolución de Problemas
* Educación Matemática Realista.

**Cada método debe guardar:**

* definición,
* propósito,
* características,
* fases,
* técnicas didácticas recomendadas,
* estrategias de evaluación,
* criterios sugeridos,
* referencias.

**Tablas mínimas**

* metodos
* metodo\_fases
* metodo\_tecnicas
* metodo\_evidencias
* metodo\_instrumentos
* metodo\_criterios\_evaluacion

**8. Módulo híbrido de alimentación documental**

El sistema debe admitir dos vías complementarias.

**8.1 Vía A. Carga docente**

El docente puede cargar:

* libros,
* artículos,
* capítulos,
* videos,
* presentaciones,
* documentos normativos,
* enlaces,
* recursos propios.

**8.2 Vía B. Curaduría asistida por IA**

La IA puede:

* buscar fuentes relacionadas con el curso,
* sugerir bibliografía básica,
* sugerir bibliografía complementaria,
* sugerir recursos audiovisuales,
* detectar literatura pertinente.

**Regla de uso**

Ambas vías pueden usarse:

* por separado,
* o juntas.

**Regla de validación**

Las fuentes sugeridas por IA **no entran automáticamente** al repositorio activo del curso.
Deben pasar por validación docente o académica.

**9. NotebookLM dentro de la arquitectura**

NotebookLM puede ser utilizado como:

* cuaderno documental del curso,
* espacio de organización de fuentes,
* entorno de consulta grounded,
* apoyo para síntesis y comparación de materiales.

**Regla técnica**

NotebookLM **no sustituye**:

* el motor curricular,
* el validador del sílabo,
* la plantilla oficial,
* el flujo de aprobación institucional.

Debe funcionar como **capa documental de apoyo**, no como núcleo único de la plataforma.

**10. Prioridad de consulta de fuentes**

La app debe consultar las fuentes en este orden:

1. Documentos curriculares oficiales
2. Fuentes cargadas por el docente
3. Fuentes sugeridas por IA y ya validadas
4. Fuentes nuevas sugeridas no validadas, solo como apoyo secundario

**11. Flujo funcional consolidado**

1. El docente selecciona programa → plan → curso
2. El sistema importa:
 - sumilla
 - competencia
 - capacidad/resultado
 - desempeños oficiales, si existen
3. El sistema detecta si faltan desempeños
4. Si faltan:
 - IA propone desempeños sugeridos desde:
 sumilla + competencia + capacidad/resultado
5. El sistema deriva contenido:
 - conocimientos
 - habilidades
 - actitudes
6. El docente decide:
 a) cargar fuentes propias
 b) usar búsqueda asistida por IA
 c) usar ambas
7. Las fuentes validadas pasan al repositorio activo del curso
8. El sistema consulta la guía metodológica oficial
9. IA sugiere método troncal y secuencia didáctica
10. El sistema propone:
 - actividades
 - evidencias
 - instrumentos
 - bibliografía sugerida
11. El docente revisa y ajusta
12. El validador automático corre
13. El auditor IA corre
14. Revisión académica
15. Aprobación/publicación

**12. Reglas de negocio obligatorias**

1. La sumilla oficial no es editable por el docente.
2. La competencia/capacidad oficial no es editable por el docente.
3. Si existen desempeños oficiales, se importan.
4. Si no existen, se proponen desempeños sugeridos.
5. Los desempeños sugeridos no son oficiales hasta validación.
6. El contenido se deriva después del propósito.
7. El método se selecciona después del contenido.
8. El método debe existir en el repositorio metodológico oficial.
9. La secuencia semanal debe respetar las fases del método.
10. Cada desempeño debe vincularse con habilidades.
11. Cada habilidad debe vincularse con evidencias.
12. Cada evidencia debe vincularse con instrumentos.
13. Toda evidencia calificada debe tener sigla, peso y cronograma.
14. La suma de ponderaciones debe ser 100%.
15. Toda modificación debe quedar trazada.

**13. Estructura mínima de base de datos**

**Institucional**

* facultades
* escuelas
* programas
* planes\_estudio
* versiones\_plan
* periodos
* usuarios
* roles

**Curricular**

* cursos
* sumillas
* competencias
* capacidades
* desempenos\_oficiales
* desempenos\_sugeridos
* observaciones\_curriculares

**Pedagógica**

* habilidades
* matrices\_desempeno\_habilidad
* matrices\_habilidad\_evidencia
* matrices\_habilidad\_instrumento

**Metodológica**

* metodos
* metodo\_fases
* metodo\_tecnicas
* metodo\_evidencias
* metodo\_instrumentos

**Documental**

* fuentes\_curso
* fuentes\_sugeridas\_ia
* notebooks\_curso

**Sílabo**

* silabos
* silabo\_versiones
* silabo\_unidades
* silabo\_contenidos
* silabo\_habilidades
* silabo\_actividades
* silabo\_evidencias
* silabo\_instrumentos
* silabo\_calificacion
* silabo\_bibliografia

**14. APIs sugeridas**

**Currículo**

* POST /planes
* POST /planes/{id}/cursos
* POST /cursos/{id}/sumilla
* POST /cursos/{id}/desempenos-oficiales

**IA curricular**

* POST /ia/proponer-desempenos
* POST /ia/derivar-contenido
* POST /ia/sugerir-habilidades
* POST /ia/sugerir-metodo
* POST /ia/sugerir-evidencias
* POST /ia/auditar-alineamiento

**Metodologías**

* POST /metodos
* GET /metodos
* GET /metodos/{id}

**Documental**

* POST /fuentes
* POST /ia/sugerir-fuentes
* POST /fuentes/{id}/validar
* POST /notebooks

**Sílabos**

* POST /silabos
* PUT /silabos/{id}
* POST /silabos/{id}/validar
* POST /silabos/{id}/aprobar