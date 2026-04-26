**MANUAL ACTUALIZADO PARA EL PROGRAMADOR**

**Sistema de Gestión Inteligente de Sílabos**

**1. Finalidad del sistema**

Debes construir y actualizar una **plataforma institucional para elaborar sílabos universitarios con apoyo de IA**, respetando el currículo oficial y asistiendo al docente en la operacionalización pedagógica del curso. El sistema debe:

* importar componentes curriculares oficiales,
* proponer componentes operativos cuando falten,
* trabajar con una **biblioteca institucional de habilidades**,
* trabajar con un **repositorio metodológico oficial**,
* trabajar con un sistema híbrido de **fuentes documentales**,
* validar coherencia curricular, didáctica, metodológica y evaluativa,
* mantener trazabilidad,
* permitir revisión y aprobación académica.

**2. Principio rector del sistema**

La plataforma debe operar siempre con esta **lógica didáctica interna fija**:

**Propósito → Contenido → Método → Evaluación**.

**Interpretación operativa**

**2.1 Propósito**

Responde al **para qué** del proceso formativo.
Aquí se ubican:

* competencia,
* capacidad,
* resultado de aprendizaje,
* desempeño,
* objetivo.

**2.2 Contenido**

Responde al **qué aprende** el estudiante para lograr el propósito.
Incluye:

* conocimientos,
* habilidades/capacidades,
* actitudes.

**2.3 Método**

Responde al **cómo se aborda** el contenido para alcanzar el propósito.
El método se selecciona **solo después** de haber definido Propósito y Contenido.

**2.4 Evaluación**

Responde a **cómo se verificará** el logro del propósito, mediante:

* evidencias,
* instrumentos,
* sistema de evaluación,
* sistema de calificación.

**3. Dos capas del sistema**

El sistema debe implementar dos capas claramente diferenciadas.

**3.1 Capa didáctica interna fija**

Debe contener estas cuatro categorías estables:

* Propósito
* Contenido
* Método
* Evaluación

Estas categorías son internas y no dependen del nombre visible usado por la institución.

**3.2 Capa visible institucional**

Es la que se muestra al usuario conforme a la plantilla oficial del sílabo. Debe contener:

* Información general
* Sumilla
* Resultado de aprendizaje del curso
* Resultados de aprendizaje de las unidades didácticas
* Programación académica
* Sistema de evaluación
* Sistema de calificación
* Metodología y actividades de investigación formativa
* Actividades de tutoría: área académica
* Responsabilidad social
* Referencias.

**4. Regla formal sobre desempeños**

Debes programar exactamente esta lógica:

**4.1 Si existen desempeños oficiales**

* importarlos,
* usarlos como referencia oficial,
* validar su alineamiento curricular,
* permitir observación o propuesta de ajuste,
* no reemplazarlos sin aprobación institucional.

**4.2 Si no existen desempeños oficiales o están incompletos**

* generar **desempeños sugeridos**,
* construirlos únicamente con base en:
  + sumilla,
  + competencia,
  + capacidad o resultado de aprendizaje,
* marcarlos claramente como sugeridos por el sistema,
* exigir validación académica antes de aprobar el sílabo.

**4.3 Regla crítica**

**El desempeño no debe generarse a partir del método.**
El método entra después, porque el desempeño pertenece al plano del **Propósito**.

**5. Regla sobre el número de unidades didácticas**

**Regla institucional base**

Toda asignatura debe tener como mínimo **dos unidades didácticas**. Esto se desprende de la lógica de la directiva y de la organización del formato evaluado institucionalmente.

**Regla operativa del sistema**

Para cursos de **16 semanas**, el sistema debe proponer por defecto:

* Unidad I: semanas 1–4
* Unidad II: semanas 5–8
* Unidad III: semanas 9–12
* Unidad IV: semanas 13–16.

**Regla de flexibilidad**

Las 4 unidades **no son obligatorias para todos los cursos**.
El sistema debe permitir 2, 3, 4 o más unidades, siempre que:

* cada unidad tenga su RA de unidad,
* exista coherencia con el RA del curso,
* la programación cubra las 16 semanas,
* y la secuencia metodológica y evaluativa sea consistente.

**6. Arquitectura general del sistema**

La arquitectura lógica debe ser:

**Universidad → Facultad → Escuela Profesional → Programa/Especialidad → Plan de estudios (versión) → Curso → Sílabo → Versiones del sílabo**.

**7. Módulos obligatorios del sistema**

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

Debe contener la **biblioteca institucional de habilidades** y permitir búsqueda por:

* verbo,
* nivel cognitivo,
* disciplina,
* categoría,
* palabras clave.

**Regla de uso**

La biblioteca de habilidades es una fuente prioritaria del sistema.
No sustituye el desempeño; lo operacionaliza y ayuda a derivar contenido, evidencias e instrumentos.

**Módulo 5. Repositorio metodológico oficial**

Debe cargar y estructurar las **guías metodológicas institucionales**. La **guía metodológica uniformizada** debe ser una fuente oficial del sistema.

**Módulo 6. Motor metodológico**

Debe sugerir método principal y, si corresponde, complementario usando:

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

Debe ejecutar reglas de validación antes de aprobar el sílabo.

**Módulo 10. Auditor IA**

Debe hacer una revisión semántica adicional de coherencia curricular y textual.

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

**8. Fuentes oficiales del sistema**

El sistema debe trabajar con cinco fuentes obligatorias:

1. **Plan de estudios y base curricular oficial**
2. **Plantilla oficial del sílabo**
3. **Biblioteca institucional de habilidades**
4. **Guía metodológica uniformizada**
5. **Fuentes documentales activas del curso**.

**9. Secuencia obligatoria del flujo backend**

El backend debe ejecutar esta secuencia, sin saltos:

1. Importar datos oficiales del curso
2. Validar completitud mínima
3. Generar o ajustar RA del curso
4. Generar o ajustar RA de unidades
5. Importar o sugerir desempeños
6. Derivar contenidos:
 - conocimientos
 - habilidades
 - actitudes
7. Consultar biblioteca de habilidades
8. Seleccionar método desde la guía metodológica
9. Generar programación académica en matriz
10. Generar sistema de evaluación
11. Generar sistema de calificación
12. Generar metodología
13. Generar tutoría, RSU y referencias
14. Ejecutar validadores
15. Emitir alertas
16. Guardar versión
17. Enviar a revisión académica

Esta secuencia es la traducción técnica directa de la guía operativa.

**10. Reglas de negocio obligatorias**

**RN-01**

No generar sílabo sin datos oficiales mínimos del curso.

**RN-02**

No permitir seleccionar método antes de definir Propósito y Contenido.

**RN-03**

No permitir generar programación si no existen RA de unidad.

**RN-04**

No permitir actividades sin evidencia asociada.

**RN-05**

No permitir evidencia sin instrumento asociado.

**RN-06**

No permitir sistema de calificación con suma distinta de 100%.

**RN-07**

No permitir edición directa de un desempeño oficial.

**RN-08**

Todo desempeño sugerido debe quedar marcado como:

* sugerido\_por\_sistema = true
* requiere\_validacion\_academica = true

**RN-09**

La programación debe generarse en **matriz institucional**, no en texto libre.

**RN-10**

El sistema de evaluación debe construirse siempre en la relación:
**RA → desempeño → evidencia → instrumento**.

**11. Programación académica: formato obligatorio**

La programación debe renderizarse siempre en una tabla/matriz con estos campos:

* Resultado de Aprendizaje de la unidad
* Desempeños
* Semana
* Fecha
* Conocimientos
* Habilidades
* Actitudes
* Actividades de Aprendizaje
* Evidencias de Aprendizaje.

**Regla crítica**

La programación debe seguir la lógica real del método seleccionado.
No se aceptan actividades genéricas que no reflejen la secuencia metodológica.

**12. Sistema de evaluación: formato obligatorio**

Debe generarse automáticamente como tabla con columnas:

* Resultado de Aprendizaje
* Desempeños
* Evidencias de Aprendizaje
* Instrumentos.

**Regla**

La tabla de evaluación no se redacta libremente.
Debe derivarse de la programación académica.

**13. Sistema de calificación: formato obligatorio**

Debe generarse automáticamente como tabla con columnas:

* Evidencias de aprendizaje
* Sigla
* Peso
* Cronograma.

**Regla**

* La suma de pesos debe ser 100%.
* Las evidencias deben coincidir con el sistema de evaluación.
* El cronograma debe corresponder a la programación.

**14. Integración de la biblioteca institucional de habilidades**

La biblioteca debe operar así:

**Entradas**

* disciplina,
* curso,
* RA del curso,
* RA de unidad,
* desempeño,
* método.

**Salidas**

* habilidades sugeridas,
* evidencias sugeridas,
* instrumentos sugeridos.

**Regla funcional**

El sistema debe consultar la biblioteca de habilidades **antes** de cerrar contenidos y evidencias.

**15. Integración de la guía metodológica uniformizada**

La guía metodológica uniformizada debe ser tratada como **repositorio oficial de métodos**.

Cada método debe registrarse con:

* definición,
* propósito,
* rol docente,
* rol del estudiante,
* fases,
* productos,
* evaluación recomendada,
* instrumentos recomendados.

**Métodos mínimos cargados**

* ABPro
* ABDe
* Aprendizaje Cooperativo
* Estudio de Casos
* ABI
* Aprendizaje Experiencial
* Taller
* CER
* ADI
* Resolución de Problemas
* Educación Matemática Realista.

**16. Validadores automáticos**

**16.1 Validador de alineamiento curricular**

Debe verificar:

* sumilla ↔ RA del curso,
* RA del curso ↔ RA de unidades,
* RA de unidades ↔ desempeños,
* desempeños ↔ contenidos.

**16.2 Validador metodológico**

Debe verificar:

* método seleccionado ↔ actividades,
* método ↔ evidencias,
* metodología redactada ↔ secuencia semanal.

**16.3 Validador evaluativo**

Debe verificar:

* RA → desempeño → evidencia → instrumento.

**16.4 Validador de calificación**

Debe verificar:

* suma de pesos = 100,
* cronograma consistente,
* evidencias evaluadas = evidencias calificadas.

**16.5 Validador temporal**

Debe verificar:

* cobertura completa de semanas,
* ausencia de semanas vacías o duplicadas,
* coherencia con el número de unidades definido.

**17. Estructuras JSON recomendadas**

**17.1 Curso oficial**

{
 "course\_id": "CEDS1135",
 "programa": "Educación Especialidad de Ciencias Histórico Sociales y Filosofía",
 "asignatura": "Historia independencia y república en el Perú",
 "creditos": 4,
 "horas\_teoria": 3,
 "horas\_practica": 2,
 "prerrequisito": "Historia del Perú antiguo y colonial",
 "sumilla\_oficial": "...",
 "competencia\_oficial": "...",
 "capacidad\_oficial": "...",
 "desempenos\_oficiales": []
}

**17.2 Desempeño**

{
 "performance\_id": "DES-001",
 "text": "...",
 "status": "official\_imported",
 "source": "plan\_or\_system",
 "requires\_academic\_validation": false
}

**17.3 Contenido**

{
 "knowledge": ["..."],
 "skills": [
 {
 "skill\_id": "HAB-COG-001",
 "name": "Identificar conceptos clave"
 }
 ],
 "attitudes": ["..."]
}

**17.4 Método**

{
 "main\_method": "ABPro",
 "justification": "...",
 "source": "method\_repository",
 "phases": [
 "exploracion",
 "investigacion\_planificacion",
 "desarrollo",
 "evaluacion\_presentacion"
 ]
}

**17.5 Programación académica**

{
 "unit\_number": 1,
 "unit\_outcome": "...",
 "rows": [
 {
 "week": 1,
 "date": "---",
 "performance": "...",
 "knowledge": "...",
 "skills": "...",
 "attitudes": "...",
 "learning\_activities": "...",
 "learning\_evidence": "..."
 }
 ]
}

**18. Salida obligatoria del agente de IA**

El agente debe devolver:

**A. Salida visible**

El sílabo institucional completo.

**B. Salida técnica interna**

{
 "selected\_method": "ABPro",
 "reason\_for\_method\_selection": "...",
 "official\_fields": ["sumilla", "creditos", "horas"],
 "system\_generated\_fields": ["RA\_curso", "RA\_unidades", "desempenos\_sugeridos"],
 "alignment\_checks": {
 "sumilla\_to\_course\_outcome": true,
 "course\_outcome\_to\_unit\_outcomes": true,
 "unit\_outcomes\_to\_performances": true,
 "method\_to\_activities": true,
 "evidence\_to\_instrument": true,
 "weights\_total\_100": true
 },
 "warnings": []
}

Esto se desprende del prompt maestro y de la necesidad de trazabilidad.

**19. Alertas que debe emitir el sistema**

**Alertas curriculares**

* “El RA de unidad no deriva claramente del RA del curso.”
* “El desempeño no se sostiene en el RA de unidad.”
* “Los contenidos no cubren suficientemente el desempeño.”

**Alertas metodológicas**

* “Las actividades no reflejan la secuencia del método seleccionado.”
* “La metodología redactada no coincide con la programación.”

**Alertas evaluativas**

* “Existe evidencia sin instrumento.”
* “Existe instrumento sin evidencia.”
* “La calificación no suma 100%.”

**Alertas de gobernanza**

* “Desempeño sugerido pendiente de validación académica.”
* “Campo oficial observado por el docente.”
* “Versión pendiente de revisión.”

**20. Prioridades de implementación**

**Prioridad 1**

* secuencia curricular,
* importación oficial,
* regla de desempeños,
* programación en matriz.

**Prioridad 2**

* integración de biblioteca de habilidades,
* integración de guía metodológica,
* evaluación y calificación automáticas.

**Prioridad 3**

* validadores,
* alertas,
* trazabilidad,
* panel de revisión académica.

**21. Cierre**

La fórmula que debe implementar el programador es esta:

**Base oficial del curso + lógica didáctica fija + biblioteca institucional de habilidades + guía metodológica uniformizada + validación automática + trazabilidad académica = sílabo institucional correcto.**