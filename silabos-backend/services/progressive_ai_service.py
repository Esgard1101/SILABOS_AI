import json
import logging
import os
import re
from typing import Any

from services.gemini_service import (
    DEFAULT_OPENROUTER_AUDIT_MODEL,
    _get_router_service,
)

logger = logging.getLogger(__name__)

_service: "ProgressiveAIService | None" = None

TERRITORIAL_CONTEXT_BLOCK = (
    "CONTEXTO TERRITORIAL Y ÁREA DE INFLUENCIA: La Universidad Nacional Pedro Ruiz Gallo (UNPRG) "
    "tiene su sede en Lambayeque. Su zona de influencia directa abarca Chiclayo (capital y eje "
    "comercial/urbano con distritos densos como José Leonardo Ortiz y La Victoria), balnearios y "
    "zonas costeras (Pimentel, Puerto Eten), zonas agrícolas e históricas (Ferreñafe, Monsefú, "
    "Chongoyape, Saña, Cayaltí, Tumán y Huaca Rajada). REGLA: Elige orgánicamente UN SOLO lugar "
    "o distrito de esta lista que tenga total sentido semántico con el tema del curso para situar "
    "el objeto de trabajo o proyecto."
)


def _join_context_items(items: list[Any], limit: int = 8) -> str:
    lines: list[str] = []
    for item in (items or [])[:limit]:
        if isinstance(item, dict):
            text = item.get("descripcion") or item.get("statement") or item.get("ra_unidad") or item.get("titulo") or ""
        else:
            text = str(item or "")
        text = re.sub(r"\s+", " ", str(text).strip())
        if text:
            lines.append(f"- {text}")
    return "\n".join(lines) or "- No especificado"


def _flatten_text_items(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = re.sub(r"\s+", " ", value.strip())
        return [text] if text else []
    if isinstance(value, (int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        flattened: list[str] = []
        for item in value:
            flattened.extend(_flatten_text_items(item))
        return flattened
    if isinstance(value, dict):
        if isinstance(value.get("items"), list):
            return _flatten_text_items(value.get("items"))
        flattened: list[str] = []
        for item in value.values():
            flattened.extend(_flatten_text_items(item))
        return flattened
    return []


def _normalize_prose_paragraphs(value: Any, expected: int) -> str:
    text = re.sub(r"^\s*[-*]\s+", "", str(value or "").strip(), flags=re.MULTILINE)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[a-z0-9])\.([A-ZÁÉÍÓÚÑ])", r". \1", text)
    parts = [part.strip() for part in re.split(r"\n\s*\n", str(value or "").strip()) if part.strip()]
    if len(parts) < expected:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        if sentences:
            chunk = max(1, len(sentences) // expected)
            rebuilt: list[str] = []
            cursor = 0
            for idx in range(expected):
                take = chunk if idx < expected - 1 else len(sentences) - cursor
                rebuilt.append(" ".join(sentences[cursor : cursor + take]).strip())
                cursor += take
            parts = [p for p in rebuilt if p]
    parts = parts[:expected]
    return "\n\n".join(parts)


class ProgressiveAIService:
    """IA especializada para el wizard progresivo."""

    def __init__(self) -> None:
        legacy_openrouter_model = os.getenv("OPENROUTER_MODEL", "").strip()
        audit_model = (
            os.getenv("OPENROUTER_AUDIT_MODEL", "").strip()
            or legacy_openrouter_model
            or DEFAULT_OPENROUTER_AUDIT_MODEL
        )
        self.light_model = os.getenv("OPENROUTER_LIGHT_MODEL", "").strip() or audit_model

    async def _generate_json(
        self,
        *,
        task: str,
        prompt: str,
        force_provider: str | None = None,
    ) -> Any:
        service = _get_router_service()
        try:
            return await service.generate_json(
                task,
                prompt,
                force_provider=force_provider,
                max_retries=3,
            )
        except json.JSONDecodeError as exc:
            logger.error(
                "Step progresivo agotó reintentos JSON | tarea=%s | error=%s",
                task,
                exc,
            )
            raise

    async def sugerir_desempenos(
        self,
        curso: dict,
        bibliografia: list[str] | None = None,
        force_provider: str | None = None,
    ) -> list[dict]:
        biblio_ctx = ""
        if bibliografia:
            biblio_ctx = (
                "\nREFERENCIAS BIBLIOGRAFICAS DISPONIBLES:\n"
                + "\n".join(f"- {r}" for r in bibliografia[:5])
            )

        prompt = f"""Eres un experto en diseno curricular universitario peruano.
Genera entre 3 y 5 desempenos de aprendizaje para el curso indicado.

REGLAS:
- Cada desempeno inicia con un verbo en infinitivo.
- Deben ser observables, medibles y derivados de la sumilla.
- No inventes contenido ajeno al curso.
- Responde UNICAMENTE JSON valido, sin markdown.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:500]}
COMPETENCIA DE EGRESO: {str(curso.get("competencia_egreso", ""))[:300]}
RESULTADO DE APRENDIZAJE: {str(curso.get("resultado_aprendizaje", ""))[:300]}
CAPACIDAD: {str(curso.get("capacidad", ""))[:250]}
{biblio_ctx}

Formato:
[
  {{"code": "D1", "statement": "Verbo + objeto + condicion"}},
  {{"code": "D2", "statement": "Verbo + objeto + condicion"}}
]"""

        payload = await self._generate_json(
            task="progressive_purpose_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        return payload if isinstance(payload, list) else []

    async def sugerir_contenido(
        self,
        curso: dict,
        desempenos: list[dict],
        bibliografia: list[str] | None = None,
        skills_context: list[dict] | None = None,
        force_provider: str | None = None,
    ) -> dict:
        desempenos_texto = "\n".join(
            f"- [{d.get('code', f'D{i + 1}')}] {d.get('statement', '')}"
            for i, d in enumerate((desempenos or [])[:5])
        )
        biblio_ctx = ""
        if bibliografia:
            biblio_ctx = "\nREFERENCIAS:\n" + "\n".join(f"- {r}" for r in bibliografia[:4])
        temas_ctx = "\n".join(f"- {t}" for t in _flatten_text_items(curso.get("temas_conocimientos"))[:12])
        habilidades_ctx = "\n".join(f"- {h}" for h in _flatten_text_items(curso.get("habilidades_desempenos"))[:12])
        skills_ctx = "\n".join(
            f"- {s.get('id_habilidad') or s.get('id')}: {s.get('nombre')} | verbo={s.get('verbo_principal', '')} | nivel={s.get('nivel_cognitivo', '')}"
            for s in (skills_context or [])[:20]
        )

        prompt = f"""Eres un experto en diseno curricular universitario peruano.
Deriva contenido formativo y un plan semanal de 16 semanas para el curso.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:450]}
{TERRITORIAL_CONTEXT_BLOCK}
TEMAS OFICIALES:
{temas_ctx or "- Sin enriquecimiento de temas"}
HABILIDADES OFICIALES:
{habilidades_ctx or "- Sin enriquecimiento de habilidades"}
BIBLIOTECA DE HABILIDADES:
{skills_ctx or "- Sin skills consultadas"}
DESEMPENOS:
{desempenos_texto}
{biblio_ctx}

Responde exactamente este JSON:
{{
  "conocimientos": ["Tema 1", "Tema 2"],
  "habilidades_sugeridas": ["Analizar objeto", "Aplicar procedimiento"],
  "responsabilidad_social": "Actividad RSU en 4 a 5 lineas, vinculada al proposito del curso y a la aplicacion social del aprendizaje.",
  "content_plan": {{
    "units": [
      {{
        "unit_number": 1,
        "ra_unidad": "Resultado de aprendizaje de la unidad 1",
        "weeks": [
          {{
            "week": 1,
            "unit_number": 1,
            "performance_code": "D1",
            "knowledge": ["Tema unico y secuencial de la semana 1"],
            "skills": [{{"skill_id": null, "name": "Analizar fundamentos del tema"}}]
          }}
        ]
      }}
    ]
  }}
}}

REGLAS:
- conocimientos: 8 a 12 temas especificos. Nunca empieces con verbo.
- habilidades_sugeridas: 4 a 8 habilidades; todas deben iniciar con verbo en infinitivo terminado en -ar, -er o -ir.
- content_plan: una unidad por desempeno oficial. Distribuye exactamente 16 semanas entre las unidades.
- No incluyas actitudes ni resultados de aprendizaje; la plantilla vigente no los usa en el programa de contenidos.
- Cada semana debe tener un tema de knowledge unico, secuencial y de complejidad creciente. Redactalo como tema didactico breve, natural y entendible por un docente.
- Evita formulas roboticas como "Fundamentos conceptuales de...", "Integracion diagnostica de..." o "Producto parcial sobre..."; usa nombres de clase/taller concretos.
- Unidad 1 introductoria; unidades intermedias de practica y profundizacion; unidad final de aplicacion/integracion.
- responsabilidad_social: 4 a 5 lineas. Debe plantear una actividad concreta del mundo real vinculada al proposito del curso o a la aplicacion social del aprendizaje en UN SOLO lugar elegido del contexto territorial. No debe ser decorativa ni aislada: debe incluir contexto local, accion estudiantil, aplicacion de conocimientos/habilidades y evidencia verificable.
- Responde SOLO JSON, sin texto adicional."""

        payload = await self._generate_json(
            task="progressive_content_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        if isinstance(payload, dict):
            payload["responsabilidad_social"] = str(payload.get("responsabilidad_social") or "").strip()
            return payload
        return {
            "conocimientos": [],
            "habilidades_sugeridas": [],
            "responsabilidad_social": "",
            "content_plan": {"units": []},
        }

    async def generar_preguntas_rsu(
        self,
        curso: dict,
        desempenos: list[dict],
        conocimientos: list[str] | None = None,
        habilidades: list[str] | None = None,
        bibliografia_refs: list[str] | None = None,
        ambito: str = "",
        evidencia: str = "",
        force_provider: str | None = None,
    ) -> list[dict]:
        """Motor HITL: genera 3-4 preguntas a medida del curso para que el docente
        diseñe la actividad de RSU eligiendo opciones concretas o aportando su idea."""
        desempenos_texto = "\n".join(
            f"- [{d.get('code') or d.get('codigo') or f'D{i + 1}'}] {d.get('statement') or d.get('descripcion') or ''}"
            for i, d in enumerate((desempenos or [])[:5])
        )
        conocimientos_ctx = "\n".join(f"- {item}" for item in (conocimientos or [])[:10])
        habilidades_ctx = "\n".join(f"- {item}" for item in (habilidades or [])[:10])
        biblio_ctx = "\n".join(f"- {r}" for r in (bibliografia_refs or [])[:6])
        docente_inputs = ""
        if str(ambito or "").strip() or str(evidencia or "").strip():
            docente_inputs = (
                "\nINTENCION DEL DOCENTE (usala para afinar las preguntas):\n"
                f"- Ambito / comunidad objetivo: {str(ambito or '').strip() or 'no definido aun'}\n"
                f"- Evidencia / entregable esperado: {str(evidencia or '').strip() or 'no definido aun'}"
            )

        prompt = f"""Eres especialista en diseno curricular y responsabilidad social universitaria en Peru.
El docente va a DISENAR la actividad de RSU de su curso. Tu tarea NO es decidir por el,
sino generar 3 a 4 preguntas concretas que lo ayuden a tomar decisiones a medida de SU curso.

{TERRITORIAL_CONTEXT_BLOCK}

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:550]}
COMPETENCIA: {str(curso.get("competencia_egreso") or curso.get("competencia") or "")[:350]}
CAPACIDAD: {str(curso.get("capacidad") or "")[:350]}

DESEMPENOS OFICIALES:
{desempenos_texto or "- No especificados"}

CONOCIMIENTOS:
{conocimientos_ctx or "- No especificados"}

HABILIDADES:
{habilidades_ctx or "- No especificadas"}

FUENTES / REFERENCIAS DEL CURSO:
{biblio_ctx or "- No especificadas"}
{docente_inputs}

REGLAS:
- Genera entre 3 y 4 preguntas. Cada pregunta aborda una decision distinta del diseno de la RSU
  (por ejemplo: lugar/comunidad concreta, problema o necesidad real, accion estudiantil, evidencia/entregable).
- Cada pregunta trae 3 a 4 opciones CONCRETAS y LOCALES, contextualizadas al tema del curso y al area de influencia de la UNPRG.
  Nunca opciones genericas ni de relleno; deben nombrar lugares, actores o entregables reales y verificables.
- Las opciones deben apoyarse en el contexto territorial: elige distritos/lugares con sentido semantico con el curso.
- PROHIBIDO inventar nombres propios de colegios, instituciones, empresas u organizaciones especificas
  (ej. "I.E. San Jose de Monsefu"): no tienes forma de verificar que existan. Los UNICOS nombres propios
  permitidos son los distritos/lugares del contexto territorial. Para instituciones usa referencias
  genericas: "colegios publicos de primaria del distrito", "una institucion educativa rural de la zona",
  "asociaciones de productores locales".
- Cada pregunta permite que el docente escriba su propia idea (permite_idea_propia siempre true).
- Responde SOLO JSON valido con esta forma exacta:
{{"preguntas": [
  {{"id": "q1", "pregunta": "...", "opciones": ["...", "...", "..."], "permite_idea_propia": true}}
]}}"""

        payload = await self._generate_json(
            task="progressive_rsu_questions",
            prompt=prompt,
            force_provider=force_provider,
        )
        preguntas_raw = payload.get("preguntas") if isinstance(payload, dict) else payload
        if not isinstance(preguntas_raw, list):
            return []
        preguntas: list[dict] = []
        for i, item in enumerate(preguntas_raw[:4]):
            if not isinstance(item, dict):
                continue
            texto = str(item.get("pregunta") or "").strip()
            opciones = [str(o).strip() for o in (item.get("opciones") or []) if str(o).strip()]
            if not texto or not opciones:
                continue
            preguntas.append({
                "id": str(item.get("id") or f"q{i + 1}").strip() or f"q{i + 1}",
                "pregunta": texto,
                "opciones": opciones[:4],
                "permite_idea_propia": True,
            })
        return preguntas

    async def sugerir_responsabilidad_social(
        self,
        curso: dict,
        desempenos: list[dict],
        conocimientos: list[str] | None = None,
        habilidades: list[str] | None = None,
        bibliografia_refs: list[str] | None = None,
        ambito: str = "",
        evidencia: str = "",
        respuestas: list[dict] | None = None,
        force_provider: str | None = None,
    ) -> str:
        desempenos_texto = "\n".join(
            f"- [{d.get('code') or d.get('codigo') or f'D{i + 1}'}] {d.get('statement') or d.get('descripcion') or ''}"
            for i, d in enumerate((desempenos or [])[:5])
        )
        conocimientos_ctx = "\n".join(f"- {item}" for item in (conocimientos or [])[:10])
        habilidades_ctx = "\n".join(f"- {item}" for item in (habilidades or [])[:10])
        biblio_ctx = "\n".join(f"- {r}" for r in (bibliografia_refs or [])[:6])

        # Restricciones HITL: el RSU DEBE reflejar las decisiones del docente.
        restricciones = ""
        ambito_s = str(ambito or "").strip()
        evidencia_s = str(evidencia or "").strip()
        respuestas_lines = [
            f"- {str(r.get('pregunta') or '').strip()} -> {str(r.get('eleccion') or '').strip()}"
            for r in (respuestas or [])
            if isinstance(r, dict) and str(r.get("eleccion") or "").strip()
        ]
        if ambito_s or evidencia_s or respuestas_lines:
            partes = ["\nDECISIONES DEL DOCENTE (restricciones duras, el RSU DEBE reflejarlas):"]
            if ambito_s:
                partes.append(f"- Ambito / comunidad objetivo: {ambito_s}")
            if evidencia_s:
                partes.append(f"- Evidencia / entregable esperado: {evidencia_s}")
            if respuestas_lines:
                partes.append("- Respuestas del docente:")
                partes.extend(f"  {line[2:]}" for line in respuestas_lines)
            restricciones = "\n".join(partes)

        prompt = f"""Eres especialista en diseno curricular universitario y responsabilidad social universitaria en Peru.
Redacta una actividad de Responsabilidad Social Universitaria para un silabo de la Universidad Nacional Pedro Ruiz Gallo.

{TERRITORIAL_CONTEXT_BLOCK}

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:550]}
COMPETENCIA: {str(curso.get("competencia_egreso") or curso.get("competencia") or "")[:350]}
CAPACIDAD: {str(curso.get("capacidad") or "")[:350]}

DESEMPENOS OFICIALES:
{desempenos_texto or "- No especificados"}

CONOCIMIENTOS:
{conocimientos_ctx or "- No especificados"}

HABILIDADES:
{habilidades_ctx or "- No especificadas"}

FUENTES / REFERENCIAS DEL CURSO:
{biblio_ctx or "- No especificadas"}
{restricciones}

REGLAS:
- Escribe 4 a 5 lineas, en tono institucional y natural.
- Propón una actividad concreta del mundo real, vinculada al proposito del curso o a la aplicacion social del aprendizaje.
- Si el docente definio ambito, evidencia o respuestas, el texto DEBE respetarlos exactamente (no los reinterpretes ni los ignores).
- Debe incluir: necesidad/contexto local en UN SOLO lugar elegido del contexto territorial, accion de los estudiantes, aplicacion de conocimientos/habilidades y evidencia verificable.
- PROHIBIDO inventar nombres propios de colegios, instituciones u organizaciones especificas: usa referencias genericas ("colegios publicos de primaria del distrito", "una institucion educativa rural"). Solo los distritos/lugares del contexto territorial pueden nombrarse.
- No debe sonar decorativa, ceremonial ni aislada.
- No uses bullets ni numeracion.
- Responde SOLO JSON valido: {{"responsabilidad_social": "texto"}}"""

        payload = await self._generate_json(
            task="progressive_rsu_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        if isinstance(payload, dict):
            return str(payload.get("responsabilidad_social") or "").strip()
        return ""

    async def sugerir_calificacion(
        self,
        metodo: dict,
        curso: dict,
        desempenos: list[dict] | None = None,
        force_provider: str | None = None,
    ) -> list[dict]:
        desempenos_texto = ""
        if desempenos:
            desempenos_texto = "\nDESEMPENOS:\n" + "\n".join(
                f"- {d.get('statement', '')}" for d in desempenos[:3]
            )

        prompt = f"""Eres un experto en evaluacion educativa universitaria peruana.
Propone una tabla de calificacion compatible con el metodo pedagogico indicado.

METODO PEDAGOGICO: {metodo.get("name", "")}
CURSO: {curso.get("name", "")}
{desempenos_texto}

REGLAS:
- La suma de porcentajes debe ser exactamente 100.
- Mantener los Productos Acreditables como hitos graduales de un mismo producto integrador: PA1 es primer avance, PA2 es avance desarrollado y PA3 es presentacion/sustentacion final.
- No reemplazar PA1, PA2 ni PA3 por productos distintos segun el metodo.
- Las tareas semanales pertenecen al Programa de Contenidos; no las mezcles con los Productos Acreditables del sistema de calificacion.
- Incluir entre 3 y 5 evidencias de evaluacion.
- Responde SOLO JSON valido.

Formato:
[
  {{"evidencia": "Tareas", "sigla": "TA", "porcentaje": 15, "cronograma": "Permanente"}},
  {{"evidencia": "Producto Acreditable 1", "sigla": "PA1", "porcentaje": 15, "cronograma": "Semana 4"}}
]"""

        payload = await self._generate_json(
            task="progressive_grading_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        return payload if isinstance(payload, list) else []

    async def redactar_metodologia(
        self,
        *,
        curso: dict,
        metodo: str,
        ra_curso: str,
        ra_unidades: list[dict],
        desempenos: list[dict],
        contenidos: list[dict],
        producto_acreditable: str = "",
        work_object: str = "",
        timeline_json: dict | None = None,
        force_provider: str | None = None,
    ) -> str:
        timeline_text = _join_context_items(
            [{"titulo": f"{key}: {value}"} for key, value in (timeline_json or {}).items()],
            6,
        )
        prompt = f"""Asume el rol de especialista en didáctica universitaria y diseño curricular por competencias.
Vas a redactar exclusivamente el componente del sílabo denominado: "Metodología y actividades de investigación formativa".

Debes construir este componente de manera coherente con: la sumilla, la competencia oficial, el resultado de aprendizaje del curso, los resultados de las unidades, los desempeños, los contenidos y el método seleccionado ({metodo}).

SUMILLA: {str(curso.get("sumilla", ""))[:900]}
COMPETENCIA OFICIAL: {str(curso.get("competencia_egreso", ""))[:500]}
RESULTADO DE APRENDIZAJE DEL CURSO: {ra_curso}
PRODUCTO ACREDITABLE DEL CURSO: {producto_acreditable or "No especificado"}
OBJETO DE TRABAJO CENTRAL: {work_object or "No especificado"}
LINEA DE TIEMPO PA:
{timeline_text}
RESULTADOS DE UNIDAD:
{_join_context_items(ra_unidades, 4)}
DESEMPEÑOS:
{_join_context_items(desempenos, 6)}
CONTENIDOS:
{_join_context_items(contenidos, 10)}

OBJETIVO:
Redacta una explicación académica, clara y bien articulada, desarrollando:
1. Por qué el método es pertinente para este curso.
2. Cómo se concreta en el desarrollo del curso.
3. El rol del docente.
4. El rol del estudiante.
5. Cómo se desarrollará la investigación formativa.

INSTRUCCIONES OBLIGATORIAS:
- No redactes una definición genérica del método. Explica cómo operará en este curso.
- Justifica la pertinencia del método en función del propósito del curso.
- No uses viñetas ni numeración. Redacta en prosa continua, organizada en párrafos.
- La redacción debe quedar lista para el sílabo, estilo académico.

ESTRUCTURA:
Párrafo 1: Presenta el método y explica su pertinencia para el curso.
Párrafo 2: Explica cómo se desarrollará concretamente y relaciónalo con las actividades.
Párrafo 3: Explica el rol del docente y del estudiante.
Párrafo 4: Explica la investigación formativa y cierra mostrando coherencia general.

SALIDA ESPERADA:
Devuelve la respuesta estrictamente en formato JSON válido, utilizando una única clave llamada "metodologia_texto". El valor debe ser toda la prosa continua requerida, usando \\n\\n para separar los 4 párrafos. NO uses viñetas."""

        prompt += f"""

CONTEXTO OBLIGATORIO DE TRAZABILIDAD:
El texto debe mencionar explicitamente el objeto de trabajo central "{work_object or 'No especificado'}" y el producto acreditable "{producto_acreditable or 'No especificado'}". Debe explicar como los hitos PA convierten ese objeto en evidencia evaluable:
{timeline_text}
"""

        payload = await self._generate_json(
            task="progressive_methodology_text",
            prompt=prompt,
            force_provider=force_provider,
        )
        if isinstance(payload, dict):
            return _normalize_prose_paragraphs(payload.get("metodologia_texto", ""), 4)
        return ""

    async def redactar_tutoria(
        self,
        *,
        curso: dict,
        metodo: str,
        ra_curso: str,
        desempenos: list[dict],
        contenidos: list[dict],
        producto_acreditable: str = "",
        work_object: str = "",
        timeline_json: dict | None = None,
        force_provider: str | None = None,
    ) -> str:
        timeline_text = _join_context_items(
            [{"titulo": f"{key}: {value}"} for key, value in (timeline_json or {}).items()],
            6,
        )
        prompt = f"""Asume el rol de especialista en tutoría universitaria y diseño curricular.
Vas a redactar exclusivamente el componente: "Actividades de tutoría: área académica".

Debes construir este componente de manera coherente con la sumilla, resultados de aprendizaje, desempeños, contenidos y el método del curso.

SUMILLA: {str(curso.get("sumilla", ""))[:900]}
RESULTADO DE APRENDIZAJE DEL CURSO: {ra_curso}
MÉTODO DEL CURSO: {metodo}
DESEMPEÑOS:
{_join_context_items(desempenos, 6)}
CONTENIDOS:
{_join_context_items(contenidos, 10)}

OBJETIVO:
Redacta un texto académico que explique la tutoría, desarrollando:
1. El sentido de la tutoría en este curso.
2. Acciones del docente.
3. Que la tutoría se desarrollará según las necesidades que vayan surgiendo.
4. Técnicas a utilizar.
5. Relaciona la tutoría con dificultades reales del curso, como comprensión, productos, oralidad, análisis, argumentación o aplicación.

INSTRUCCIONES OBLIGATORIAS:
- No la redactes como lista administrativa ni frase genérica.
- Explica explícitamente que será flexible a necesidades emergentes.
- Menciona técnicas concretas, por ejemplo entrevistas, revisión de avances y retroalimentación focalizada.
- No uses viñetas ni numeración. Prosa continua.

ESTRUCTURA:
Párrafo 1: Finalidad de la tutoría académica dentro del curso.
Párrafo 2: Acciones concretas de tutoría que realizará el docente.
Párrafo 3: Técnicas a emplear y declaración explícita de que la tutoría se ajustará a las necesidades que surjan.

SALIDA ESPERADA:
Devuelve la respuesta estrictamente en formato JSON válido, utilizando una única clave llamada "tutoria_texto". El valor debe ser toda la prosa continua requerida, usando \\n\\n para separar los 3 párrafos. NO uses viñetas."""

        prompt += f"""

CONTEXTO OBLIGATORIO DE TUTORIA:
El texto debe mencionar como la tutoria acompanara el objeto de trabajo central "{work_object or 'No especificado'}", el producto acreditable "{producto_acreditable or 'No especificado'}" y sus hitos PA:
{timeline_text}
"""

        payload = await self._generate_json(
            task="progressive_tutoria_text",
            prompt=prompt,
            force_provider=force_provider,
        )
        if isinstance(payload, dict):
            return _normalize_prose_paragraphs(payload.get("tutoria_texto", ""), 3)
        return ""


def get_progressive_ai_service() -> ProgressiveAIService:
    global _service
    if _service is None:
        _service = ProgressiveAIService()
        logger.info(
            "ProgressiveAIService inicializado | purpose=openrouter_light(%s) | content=openrouter_light(%s) | grading=openrouter_light(%s)",
            _service.light_model,
            _service.light_model,
            _service.light_model,
        )
    return _service
