# SPEC: Progressive Curriculum Engine v1

## Objetivo

Implementar un flujo de generacion curricular progresiva guiado por
especificaciones, no por intuicion. El motor genera el programa de contenidos
por unidad, con trazabilidad liviana entre unidades, validacion de triple
coherencia y control docente por bloqueo/regeneracion.

Este modulo se agrega al wizard actual. No reemplaza los pasos existentes de
bibliografia, proposito, metodo, contenido ni cierre; los extiende con nuevos
steps de producto integrador, evaluacion anticipada y taller de unidad.

## Pipeline

1. Proposito y desempenos.
2. Metodo pedagogico.
3. Producto integrador.
4. Sistema de evaluacion y PA.
5. Blueprint progresivo de unidades.
6. Generacion por unidad.
7. Validacion, bloqueo y regeneracion HITL.
8. Ensamblaje progresivo final.

## Principio De Memoria

Cada unidad recibe una memoria pequena, no el texto completo anterior.

```json
{
  "completed_weeks": "1-5",
  "covered_knowledge": [
    "Componentes del ecosistema",
    "Relaciones intra e interespecificas"
  ],
  "last_delivered_evidence": "PA1: Informe base del desafio ambiental (Semana 5)"
}
```

Reglas:

- No repetir conocimientos de `covered_knowledge`.
- La nueva unidad debe aumentar complejidad respecto de `last_delivered_evidence`.
- Las semanas bloqueadas se copian exactamente.
- El contexto NotebookLM es disciplinar, no bibliografico.

## Agentes De Servicio

`ProductAdvisorAgent`
: Propone tres productos integradores segun curso, metodo, categoria y PA.

`UnitContextExtractorAgent`
: Extrae conceptos, casos, actividades sugeridas, errores comunes y evidencias
desde el resumen que el docente pega desde NotebookLM.

`ContinuitySkeletonAgent`
: Resume unidades aprobadas anteriores en un JSON ultra-ligero.

`UnitGeneratorAgent`
: Genera una unidad usando contexto estatico, contexto disciplinar,
traceability skeleton, PA y locked weeks.

`TripleCoherenceValidatorAgent`
: Evalua cada semana con puntaje de 0 a 10.

`AssemblyAgent`
: Ensambla unidades aprobadas en `payload_json.final_syllabus` y
`payload_json.progressive_curriculum`.

## Contratos

### Product Option

```json
{
  "category": "Intervencion Educativa / Social",
  "title": "Secuencia didactica para educacion temprana",
  "justification": "Moviliza planificacion, diseno de instrumentos y sustentacion pedagogica.",
  "timeline_json": {
    "PA1": "Semana 8: avance de instrumentos y diagnostico",
    "PA2": "Semana 16: version final y sustentacion"
  }
}
```

### Unit Generation Request

```json
{
  "raw_context_text": "Resumen NotebookLM o texto docente",
  "teacher_instruction": "",
  "locked_weeks": []
}
```

### Week Row

```json
{
  "week": 9,
  "knowledge": "Planificacion semanal",
  "skill": "Organizar secuencias",
  "activity": "Produccion guiada: elaboracion de una planificacion semanal para ninos menores de tres anos. Tecnicas: microtaller de diseno.",
  "evidence": "Esquema de planificacion semanal",
  "locked": false,
  "validation": {
    "total_score": 9,
    "diagnosis": "Coherencia alta"
  }
}
```

### Validation

```json
{
  "methodological_score": 2,
  "cognitive_score": 2,
  "formative_score": 2,
  "technique_score": 2,
  "evidence_score": 1,
  "total_score": 9,
  "diagnosis": "Coherencia alta"
}
```

## Endpoints

```http
GET  /syllabi/{id}/progressive/state
POST /syllabi/{id}/progressive/products/suggest
POST /syllabi/{id}/progressive/products/select
POST /syllabi/{id}/progressive/unit-contexts/{unit}/extract
POST /syllabi/{id}/progressive/units/{unit}/generate
POST /syllabi/{id}/progressive/units/{unit}/regenerate
PATCH /syllabi/{id}/progressive/units/{unit}/weeks/{week}/lock
PATCH /syllabi/{id}/progressive/units/{unit}/weeks/{week}
POST /syllabi/{id}/progressive/units/{unit}/approve
POST /syllabi/{id}/progressive/assemble
```

## Criterios De Aceptacion

1. Unidad independiente: Unidad 2 se genera sin regenerar Unidad 1.
2. Trazabilidad: no repite conocimientos exactos de unidades aprobadas previas.
3. Sin NotebookLM: si `raw_context_text` esta vacio, usa data curricular oficial.
4. Locking: una semana bloqueada sale exactamente igual tras regeneracion.
5. JSON robusto: llamadas IA usan `generate_json` con reintentos y extractor JSON.
6. Versionado: cada regeneracion crea version nueva.
7. Aprobacion unica: solo una generacion aprobada por silabo/unidad.
8. Ensamblaje: solo usa unidades `approved`.

