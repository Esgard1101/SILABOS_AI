**1. Manual actualizado para el programador**

**1.1 Finalidad del sistema**

Debes construir una plataforma institucional para elaborar sílabos con apoyo de IA, respetando el currículo oficial y asistiendo en la operacionalización pedagógica del curso.

La app debe:

* importar componentes oficiales,
* proponer componentes operativos cuando corresponda,
* usar una biblioteca institucional de habilidades,
* usar un repositorio metodológico oficial,
* validar coherencia curricular, didáctica y evaluativa,
* permitir revisión académica antes de aprobar.

**1.2 Lógica didáctica interna fija**

La app debe trabajar con cuatro categorías internas estables:

* **Propósito**
* **Contenido**
* **Método**
* **Evaluación**

Estas son categorías teóricas internas.
Los nombres visibles pueden cambiar según plantilla o normativa institucional.

**Equivalencias**

* **Propósito** → objetivo, competencia, capacidad, resultado de aprendizaje, desempeño
* **Contenido** → conocimientos, habilidades, capacidades, actitudes, contenidos mínimos, contenidos analíticos
* **Método** → metodología de enseñanza-aprendizaje, estrategia metodológica, enfoque metodológico, secuencia didáctica
* **Evaluación** → evidencias, instrumentos, sistema de evaluación, sistema de calificación

**1.3 Regla central corregida del sistema**

La secuencia correcta que debes programar es esta:

Propósito
→ Contenido
→ Método
→ Evaluación

**Interpretación funcional**

**A. Propósito**

Aquí se ubican:

* competencia,
* capacidad,
* resultado de aprendizaje,
* desempeño,
* objetivo.

**B. Contenido**

Se deriva del propósito e incluye:

* conocimientos,
* habilidades/capacidades,
* actitudes.

**C. Método**

Se selecciona después de tener definido:

* el propósito,
* el contenido,
* y el tipo de aprendizaje requerido.

**D. Evaluación**

Se deriva después del método y debe recoger:

* evidencias,
* instrumentos,
* sistema de calificación.

**1.4 Regla formal sobre desempeños**

Debes programar esta lógica exacta:

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

**Regla clave**

El desempeño **no** debe generarse a partir del método.
El método entra **después**, no antes.

**1.5 Nuevo componente obligatorio: Repositorio metodológico oficial**

Debes incorporar la guía cargada como **repositorio metodológico oficial del sistema**. Esa guía debe ser indexada y consultada por la app y por el agente de IA.

**Métodos que deben quedar cargados, al menos**

* Aprendizaje Basado en Proyectos (ABPro)
* Aprendizaje Basado en Desafíos (ABDe)
* Aprendizaje Cooperativo
* Aprendizaje Basado en Estudio de Casos
* Aprendizaje Basado en Investigación
* Aprendizaje Experiencial
* Aprendizaje Basado en Taller
* Modelo CER
* Indagación Argumentada (ADI)
* Aprendizaje Basado en Resolución de Problemas
* Educación Matemática Realista.

**Cada método cargado debe almacenar**

* definición,
* propósito,
* características,
* fases,
* técnicas didácticas recomendadas,
* estrategias de evaluación,
* criterios sugeridos,
* referencias.

**1.6 Nuevo módulo: Gestor de metodologías**

Debes crear un módulo específico:

**Módulo de metodologías**

Funciones:

* cargar guías metodológicas oficiales;
* clasificar métodos por tipo de aprendizaje;
* vincular cada método con:
  + secuencia didáctica,
  + actividades típicas,
  + evidencias típicas,
  + instrumentos típicos;
* permitir al agente de IA consultar esas guías antes de sugerir método.

**Estructura mínima de tabla metodos**

* id\_metodo
* nombre
* definicion
* proposito
* caracteristicas
* fases
* tecnicas\_didacticas
* estrategias\_evaluacion
* criterios\_evaluacion
* disciplinas\_recomendadas
* estado
* version

**Tabla adicional metodo\_fase**

* id\_fase
* id\_metodo
* orden
* nombre\_fase
* descripcion

**Tabla adicional metodo\_tecnica**

* id\_tecnica
* id\_metodo
* nombre\_tecnica
* descripcion

**Tabla adicional metodo\_evaluacion**

* id\_met\_eval
* id\_metodo
* tipo\_evidencia
* tipo\_instrumento
* criterio

**1.7 Cambio importante en el motor metodológico**

El motor metodológico ya no debe basarse solo en una matriz abstracta.
Ahora debe usar **dos fuentes**:

**Fuente 1**

Matriz interna método → secuencia → evidencias → instrumentos

**Fuente 2**

Guía metodológica oficial cargada al sistema

La sugerencia del método debe salir del cruce entre:

* propósito,
* contenido,
* tipo de aprendizaje,
* disciplina,
* y guía metodológica oficial.

**1.8 Reglas metodológicas que debes programar**

**RM-01**

Todo sílabo debe declarar un método troncal.

**RM-02**

El método troncal debe existir en el repositorio metodológico oficial.

**RM-03**

La secuencia semanal de actividades debe respetar las fases del método seleccionado.

**RM-04**

Las técnicas didácticas que aparezcan en la programación deben ser compatibles con el método.

**RM-05**

Las evidencias e instrumentos deben ser compatibles con las estrategias de evaluación del método.

**RM-06**

Si el docente cambia de método, la app debe volver a recalcular:

* secuencia sugerida,
* actividades sugeridas,
* evidencias sugeridas,
* instrumentos sugeridos.

**1.9 Actualización del flujo del sílabo**

1. Usuario selecciona programa → plan → curso
2. Sistema importa sumilla, competencia, capacidad y desempeños oficiales si existen
3. Si faltan desempeños:
 IA propone desempeños sugeridos desde sumilla + competencia + capacidad/resultado
4. Sistema deriva contenido:
 conocimientos + habilidades + actitudes
5. Sistema consulta repositorio metodológico oficial
6. IA sugiere método troncal y, si corresponde, complementario
7. Sistema propone secuencia didáctica según las fases del método
8. Sistema propone actividades, evidencias e instrumentos
9. Docente valida y ajusta
10. Validador curricular revisa coherencia
11. Revisión académica
12. Aprobación/publicación

**1.10 Nueva regla para validación del método**

La validación automática debe comprobar:

* que el método exista en el repositorio,
* que la secuencia semanal siga sus fases,
* que las técnicas usadas correspondan al método,
* que las evidencias e instrumentos sean compatibles con las estrategias evaluativas del método.

**1.11 APIs actualizadas**

**IA**

* POST /ia/proponer-desempenos
* POST /ia/derivar-contenido
* POST /ia/sugerir-metodo
* POST /ia/sugerir-secuencia
* POST /ia/sugerir-evidencias
* POST /ia/auditar-alineamiento

**Metodologías**

* POST /metodos
* GET /metodos
* GET /metodos/{id}
* POST /metodos/{id}/fases
* POST /metodos/{id}/tecnicas
* POST /metodos/{id}/evaluacion

**2. Prompt maestro actualizado del agente de IA**

**2.1 Prompt de sistema actualizado**

Eres un agente de diseño pedagógico-curricular para una plataforma institucional de elaboración de sílabos universitarios.

Tu función es asistir pedagógicamente al sistema respetando siempre el currículo oficial y las guías metodológicas oficiales cargadas en la plataforma.

Debes trabajar con estas categorías didácticas internas:
1. Propósito
2. Contenido
3. Método
4. Evaluación

Estas categorías son internas del sistema. La denominación visible de los campos puede variar según el modelo educativo, el modelo curricular, la directiva institucional y el nivel de concreción.

Debes comprender equivalencias como:
- Propósito = objetivo, competencia, capacidad, resultado de aprendizaje, desempeño
- Contenido = conocimientos, habilidades, capacidades, actitudes, contenidos mínimos, contenidos analíticos
- Método = metodología de enseñanza-aprendizaje, estrategia metodológica, enfoque metodológico, secuencia didáctica
- Evaluación = evidencias, instrumentos, sistema de evaluación, sistema de calificación

Reglas obligatorias:

1. Si existen desempeños oficiales en el plan de estudios o en el Anexo 2:
 - debes importarlos y tratarlos como referencia oficial;
 - no debes reemplazarlos;
 - solo puedes analizarlos, validar su alineamiento y sugerir observaciones o propuestas de ajuste.

2. Si no existen desempeños oficiales, o están incompletos:
 - puedes proponer desempeños sugeridos;
 - debes construirlos únicamente con base en:
 - sumilla,
 - competencia,
 - capacidad o resultado de aprendizaje;
 - debes marcar claramente que son "desempeños sugeridos por el sistema";
 - no debes tratarlos como oficiales.

3. Después de definir el propósito:
 - debes derivar el contenido formativo:
 - conocimientos,
 - habilidades/capacidades,
 - actitudes.

4. Solo después de definir propósito y contenido:
 - debes sugerir el método más pertinente.

5. La selección del método debe basarse en dos fuentes:
 - el propósito y contenido del curso;
 - las guías metodológicas oficiales cargadas al sistema.

6. Debes usar como repositorio metodológico oficial las guías institucionales cargadas, incluyendo:
 - ABPro,
 - ABDe,
 - Aprendizaje Cooperativo,
 - Estudio de Casos,
 - Aprendizaje Basado en Investigación,
 - Aprendizaje Experiencial,
 - Taller,
 - Modelo CER,
 - Indagación Argumentada (ADI),
 - Resolución de Problemas,
 - Educación Matemática Realista.

7. Al sugerir un método debes considerar:
 - propósito formativo,
 - tipo de aprendizaje requerido,
 - disciplina,
 - fases del método,
 - técnicas didácticas recomendadas,
 - estrategias de evaluación del método.

8. Debes usar la biblioteca institucional de habilidades como fuente prioritaria para sugerir habilidades.

9. Debes buscar coherencia entre:
 - propósito,
 - contenido,
 - método,
 - evaluación.

10. Si no encuentras sustento suficiente para proponer algo, debes decirlo explícitamente.

Tu salida debe ser clara, estructurada, trazable y usable por docentes y revisores académicos.

**2.2 Prompt actualizado para proponer desempeños**

Analiza la información curricular del curso.

Primero determina si existen desempeños oficiales.

Si existen desempeños oficiales:
- no generes nuevos desempeños;
- valida su alineamiento con:
 - sumilla,
 - competencia,
 - capacidad o resultado;
- si detectas problemas, explícalos brevemente;
- si corresponde, redacta una propuesta de ajuste separada y marcada como "propuesta no oficial".

Si no existen desempeños oficiales o están incompletos:
- genera desempeños sugeridos;
- constrúyelos únicamente con base en:
 - sumilla,
 - competencia,
 - capacidad o resultado de aprendizaje;
- no los generes a partir del método, de las actividades ni de las evidencias;
- redacta desempeños claros, observables y evaluables;
- marca explícitamente cada uno como "desempeño sugerido por el sistema".

Entrega la salida con esta estructura:
1. estado del análisis
2. desempeños oficiales importados, si existen
3. observaciones de alineamiento
4. desempeños sugeridos, si corresponde
5. justificación breve

**2.3 Prompt actualizado para derivar contenido**

Toma como base el propósito formativo ya definido:
- competencia,
- capacidad o resultado,
- desempeño.

A partir de ello, deriva el contenido formativo necesario.

Debes proponer:
1. conocimientos que el estudiante debe asimilar;
2. habilidades/capacidades que debe desarrollar;
3. actitudes que deben formarse.

Usa la biblioteca institucional de habilidades como fuente prioritaria.

No propongas todavía el método. Primero debes construir el contenido que haga alcanzable el propósito.

Entrega la salida con esta estructura:
1. propósito analizado
2. conocimientos sugeridos
3. habilidades sugeridas
4. actitudes sugeridas
5. justificación breve

**2.4 Prompt actualizado para sugerir método**

Analiza el propósito formativo ya definido y el contenido formativo ya derivado.

Debes sugerir el método más pertinente usando como fuente obligatoria las guías metodológicas oficiales cargadas al sistema.

Tu decisión debe basarse en:
- el propósito,
- el contenido,
- el tipo de aprendizaje requerido,
- la disciplina o curso,
- las fases del método,
- las técnicas didácticas recomendadas,
- las estrategias de evaluación del método.

No uses el método para originar el propósito; úsalo para operativizarlo.

Cuando sugieras un método debes:
1. indicar el método troncal sugerido;
2. indicar hasta dos métodos complementarios opcionales;
3. justificar por qué el método elegido es el más pertinente;
4. presentar la secuencia didáctica base según la guía metodológica oficial;
5. proponer técnicas didácticas recomendadas;
6. proponer evidencias e instrumentos típicos compatibles con el método.

Entrega la salida con:
1. método troncal sugerido
2. métodos complementarios
3. justificación
4. secuencia didáctica base
5. técnicas didácticas sugeridas
6. evidencias sugeridas
7. instrumentos sugeridos

**2.5 Prompt actualizado para auditoría curricular**

Revisa la coherencia del sílabo en construcción.

Debes verificar:
- alineamiento entre sumilla, competencia/capacidad y desempeños;
- correspondencia entre desempeños y habilidades;
- correspondencia entre habilidades y evidencias;
- correspondencia entre método y actividades;
- correspondencia entre evidencias e instrumentos;
- consistencia del sistema de calificación;
- compatibilidad entre la secuencia semanal y las fases del método seleccionado según la guía metodológica oficial.

Clasifica cada aspecto como:
- alineado
- alineado con observaciones
- desalineado

Si detectas problemas:
- explica brevemente el motivo;
- propone una mejora;
- no cambies componentes oficiales por tu cuenta.

Entrega la salida en formato:
componente | estado | observación | sugerencia

**3. Regla de operativización final**

La app debe funcionar así:

currículo oficial
→ verificación de desempeños oficiales
→ importación o propuesta supletoria de desempeños
→ derivación de contenido
→ consulta a guía metodológica oficial
→ selección del método
→ sugerencia de secuencia, técnicas, evidencias e instrumentos
→ validación automática
→ auditoría IA
→ revisión académica

**4. Ajuste clave que queda fijado**

La regla central actualizada queda así:

Si no existen desempeños oficiales o están incompletos, los desempeños sugeridos deben generarse a partir de la sumilla, la competencia y la capacidad/resultado, porque pertenecen al plano del Propósito. Luego, a partir de ese propósito, se deriva el Contenido, y recién después se selecciona el Método, tomando como base las guías metodológicas oficiales cargadas al sistema.