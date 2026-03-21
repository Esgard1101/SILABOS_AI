# Informe de Cumplimiento de Requisitos
## Plataforma Inteligente de Elaboración de Sílabos
### UNPRG - Escuela de Educación

Este documento resume el estado actual del MVP entregado y explica, requisito por requisito, el nivel de cumplimiento alcanzado. La idea es que pueda compartirse con el cliente junto con capturas de pantalla del sistema.

Sugerencia: insertar una captura al final de cada bloque usando una imagen de la vista correspondiente.

---

## 1. Resumen ejecutivo

El MVP entregado sí cubre el flujo central solicitado por el cliente:

- inicio de sesión
- creación asistida de sílabos
- edición y revisión del sílabo
- validación curricular
- workflow de estados
- revisión académica
- publicación
- historial de versiones
- observaciones curriculares
- analítica básica
- catálogos institucionales

El sistema ya permite demostrar el proceso de punta a punta. Donde todavía hay simplificaciones, estas corresponden a profundidad de catálogo o nivel de automatización institucional, no al flujo principal del producto.

### Estado general

- Cumplido en MVP: 1, 2, 3, 5, 6, 8, 9, 11, 12
- Cumplido parcialmente en MVP: 4, 7, 10

---

## 2. Cumplimiento requisito por requisito

### 1. Objetivo del sistema
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
Desarrollar una plataforma que permita a docentes elaborar sílabos alineados al plan de estudios vigente y la directiva institucional, con apoyo de IA, verificación curricular, revisión académica, trazabilidad y mejora curricular.

**Cómo se cumple en el MVP**
- El docente puede iniciar sesión y elaborar su sílabo en la plataforma.
- El sistema asiste con IA en la construcción del sílabo.
- Existe validación curricular automática.
- Existe flujo de revisión académica y publicación.
- Existe historial de versiones y observaciones.
- Existe dashboard analítico para seguimiento del sistema.

**Pantallas sugeridas para evidencia**
- Login
- Crear Sílabo
- Editor de Sílabo
- Revisión Académica
- Analítica

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 2. Arquitectura curricular
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
Universidad → Facultad → Escuela Profesional → Programa/Especialidad → Plan de estudios → Curso → Sílabo → Versiones. Piloto en FACHSE / Educación, con capacidad de soportar más escuelas.

**Cómo se cumple en el MVP**
- El piloto está orientado a FACHSE / Educación.
- La estructura de programas y catálogos ya está organizada para crecer.
- El sistema contempla sílabo y versionado.
- Se implementó historial de versiones y observaciones por sílabo.

**Observación honesta**
- En esta versión MVP, la profundidad del árbol curricular está resuelta principalmente para el piloto y preparada para extenderse; todavía no se ha desplegado la expansión total multi-escuela con toda la carga institucional completa.

**Pantallas sugeridas para evidencia**
- Crear Sílabo
- Lista de Sílabos
- Historial de Versiones

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 3. Programas (8)
**Estado:** Cumplido en MVP

**Programas contemplados**
- Educación Inicial
- Educación Primaria
- Ciencias Naturales
- CC.HH.SS. y Filosofía
- Lengua y Literatura
- Idiomas Extranjeros
- Matemática y Computación
- Educación Física

**Cómo se cumple en el MVP**
- Los 8 programas del piloto están contemplados en la selección de programa del creador de sílabos.
- La base del piloto y el frontend consideran explícitamente estos programas.

**Pantallas sugeridas para evidencia**
- Selector de Programa en Crear Sílabo

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 4. Componentes importados automáticamente y no editables por el docente
**Estado:** Cumplido parcialmente en MVP

**Requerimiento del cliente**
Al seleccionar un curso, el sistema debe importar automáticamente:
- Sumilla
- Competencia profesional
- Capacidad del curso
- Desempeños de las unidades didácticas

**Cómo se cumple en el MVP**
- El sistema ya separa claramente los componentes base del sílabo y los muestra en el editor.
- La generación del sílabo utiliza contexto institucional y estructura curricular.
- El editor trata estos bloques como elementos base del documento.

**Alcance actual del MVP**
- La lógica ya está orientada a esta importación automática.
- Sin embargo, la importación exacta y cerrada desde un catálogo institucional completo curso-plan todavía está simplificada en el piloto.

**Conclusión recomendada para cliente**
El requerimiento está encaminado y visible en el MVP, pero la automatización institucional completa de importación por curso/plan debe considerarse una ampliación de datos y reglas, no una ausencia del flujo.

**Pantallas sugeridas para evidencia**
- Crear Sílabo
- Editor del Sílabo mostrando Sumilla, Competencia, Capacidad y Desempeños

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 5. Componentes que construye el docente con ayuda de IA
**Estado:** Cumplido en MVP

**Componentes**
- Contenidos analíticos
- Habilidades requeridas
- Actividades de aprendizaje
- Evidencias de aprendizaje
- Sistema de evaluación
- Sistema de calificación
- Metodología
- Tutoría
- Referencias

**Cómo se cumple en el MVP**
- El sistema genera y presenta estas secciones en el sílabo.
- El docente puede revisar, completar y ajustar información en el editor.
- La IA apoya la construcción del contenido académico y la bibliografía.

**Pantallas sugeridas para evidencia**
- Creador de Sílabo
- Editor de Sílabo

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 6. Flujo del sistema en 10 pasos
**Estado:** Cumplido en MVP

**Cómo se cumple paso a paso**

1. Login  
Sí existe pantalla de inicio de sesión.

2. Selección de programa / curso / periodo  
Sí existe selección de contexto académico en el creador.

3. Importación automática  
Visible en la estructura del sílabo generado, con simplificación propia del MVP.

4. Método didáctico  
Existe catálogo institucional de métodos y base para selección pedagógica.

5. IA sugiere contenidos y demás componentes  
Sí, el sistema genera el sílabo con apoyo de IA.

6. Docente revisa y edita  
Sí, existe editor de sílabo.

7. Validación de coherencia curricular  
Sí, existe validación curricular automática.

8. Envío a revisión  
Sí, existe cambio de estado a revisión.

9. Revisión académica  
Sí, existe módulo de revisión académica con observaciones y aprobación.

10. Publicación  
Sí, existe publicación del sílabo aprobado.

**Pantallas sugeridas para evidencia**
- Login
- Crear Sílabo
- Editor
- Lista de Sílabos
- Revisión Académica

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 7. Biblioteca institucional de habilidades (~300 registros)
**Estado:** Cumplido parcialmente en MVP

**Requerimiento del cliente**
Contar con una biblioteca institucional amplia, cercana a 300 registros, con estructura completa por categoría, subcategoría, nivel cognitivo, verbo, evidencias sugeridas e instrumentos sugeridos.

**Cómo se cumple en el MVP**
- Ya existe un módulo de Catálogos.
- Existe catálogo institucional de habilidades navegable por categorías.
- La plataforma ya tiene la vista, filtros y estructura funcional para esta biblioteca.

**Alcance actual del MVP**
- El MVP expone una versión inicial reducida y hardcodeada del catálogo.
- No se ha cargado todavía la biblioteca completa de aproximadamente 300 registros.

**Conclusión recomendada para cliente**
La funcionalidad ya existe y está lista para escalar; lo pendiente aquí es carga masiva y enriquecimiento de datos institucionales, no desarrollo del módulo.

**Pantallas sugeridas para evidencia**
- Catálogos > Habilidades

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 8. Catálogo de métodos troncales (11 registros)
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
11 métodos con:
- id
- nombre
- descripción
- secuencia_didáctica
- tipo_actividades
- tipo_evidencias

**Cómo se cumple en el MVP**
- El sistema incluye el catálogo institucional de métodos.
- La vista muestra nombre, descripción, actividades, evidencias y secuencia didáctica.
- El módulo ya es navegable desde la interfaz.

**Pantallas sugeridas para evidencia**
- Catálogos > Métodos

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 9. Motor de evaluación
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
Generar evidencias, instrumentos, pesos y cronograma, con regla obligatoria de suma de pesos igual a 100%.

**Cómo se cumple en el MVP**
- El sistema estructura sistema de evaluación y sistema de calificación.
- El creador contempla pesos y cronograma.
- Se valida la regla de suma de pesos = 100%.
- El editor presenta la estructura de evaluación y calificación del sílabo.

**Conclusión**
Para el alcance del MVP, el motor de evaluación ya es demostrable y funcional.

**Pantallas sugeridas para evidencia**
- Crear Sílabo > Estructura Académica
- Editor > Sistema de Evaluación / Sistema de Calificación

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 10. Sistema bibliográfico
**Estado:** Cumplido parcialmente en MVP

**Requerimiento del cliente**
Repositorio interno + recomendación por IA + uso de APIs como Crossref, OpenAlex, Semantic Scholar y YouTube Data API.

**Cómo se cumple en el MVP**
- Existe módulo bibliográfico asistido.
- El sistema ya integra búsqueda bibliográfica con OpenAlex, SciELO y Crossref.
- Existe guía bibliográfica y apoyo de IA para referencias.
- El editor ya incorpora sección de referencias.

**Alcance actual del MVP**
- La recomendación bibliográfica ya existe en el flujo.
- La capa de fuentes ya es útil para demostración.
- Aún puede crecer hacia un repositorio institucional más robusto y ampliar conectores externos adicionales.

**Conclusión recomendada para cliente**
El requisito está cumplido a nivel funcional MVP, con margen natural de ampliación en volumen de fuentes y repositorio interno.

**Pantallas sugeridas para evidencia**
- Editor > BibliographyGuide / Referencias
- Flujo bibliográfico

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 11. Motor de validación curricular
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
Verificar:
- coherencia desempeño-contenido
- coherencia desempeño-evaluación
- coherencia método-actividades
- coherencia evidencias-instrumentos
- suma de calificación = 100%

**Cómo se cumple en el MVP**
- El sistema ejecuta validación curricular sobre el sílabo.
- El editor muestra observaciones de validación.
- El flujo ya contempla alertas cuando hay algo por corregir.
- La regla de pesos también se valida en el proceso.

**Pantallas sugeridas para evidencia**
- Editor > Auditoría de Coherencia

**Espacio para screenshot**
- [Agregar captura aquí]

---

### 12. Módulo de observación curricular
**Estado:** Cumplido en MVP

**Requerimiento del cliente**
Registrar observaciones curriculares, proponer redacción alternativa, mantener desempeño oficial y dejar aprobación en manos de la Dirección de Escuela.

**Cómo se cumple en el MVP**
- Existe registro de observaciones por sílabo.
- Existe listado de observaciones.
- Existe panel de revisión académica.
- La Dirección de Escuela puede revisar, observar, aprobar y devolver.
- Existe trazabilidad del sílabo con historial y workflow.

**Observación importante**
- El MVP ya representa correctamente el flujo de observación y aprobación.
- El control fino de gobierno curricular sobre cambios al texto oficial puede profundizarse en una siguiente iteración, pero la lógica institucional de revisión ya está presente.

**Pantallas sugeridas para evidencia**
- Mis Sílabos > Agregar observación
- Revisión Académica > Drawer de revisión

**Espacio para screenshot**
- [Agregar captura aquí]

---

## 3. Conclusión para presentar al cliente

La plataforma sí cumple el objetivo del proyecto a nivel MVP funcional. El cliente ya puede ver un sistema operativo que:

- permite login y uso real por docente
- genera sílabos con asistencia de IA
- permite revisión y edición
- valida coherencia curricular
- maneja workflow académico
- registra observaciones y versiones
- publica sílabos
- ofrece catálogos institucionales
- muestra analítica del sistema

Las diferencias que aún existen no están en el flujo principal, sino en profundidad de carga institucional:

- importación completamente automatizada desde catálogo curso-plan
- biblioteca ampliada de habilidades
- expansión del repositorio bibliográfico institucional

Esto significa que el sistema ya está listo para ser presentado como MVP funcional y demostrable, dejando una segunda etapa enfocada en ampliación de datos, reglas institucionales finas y escalamiento.

---

## 4. Frase corta sugerida para acompañar la entrega

Se presenta el MVP funcional de la Plataforma Inteligente de Elaboración de Sílabos, donde se evidencia el cumplimiento del flujo principal solicitado por la Escuela de Educación de la UNPRG, incluyendo generación asistida por IA, validación curricular, revisión académica, versionado, observaciones, publicación y módulos de soporte institucional.
