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
                "Step progresivo agoto reintentos JSON | tarea=%s | error=%s",
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
CONTEXTO TERRITORIAL: Universidad Nacional Pedro Ruiz Gallo, ubicada en el departamento de Lambayeque, Peru.
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
- Cada semana debe tener un tema de knowledge unico, secuencial y de complejidad creciente. Prohibido repetir o fragmentar el mismo concepto.
- Unidad 1 introductoria; unidades 2 y 3 de profundizacion; unidad 4 de aplicacion/integracion.
- responsabilidad_social: 4 a 5 lineas. Debe plantear una actividad concreta del mundo real vinculada al proposito del curso o a la aplicacion social del aprendizaje en el departamento de Lambayeque. No debe ser decorativa ni aislada: debe incluir contexto local, accion estudiantil, aplicacion de conocimientos/habilidades y evidencia verificable.
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

    async def sugerir_responsabilidad_social(
        self,
        curso: dict,
        desempenos: list[dict],
        conocimientos: list[str] | None = None,
        habilidades: list[str] | None = None,
        force_provider: str | None = None,
    ) -> str:
        desempenos_texto = "\n".join(
            f"- [{d.get('code') or d.get('codigo') or f'D{i + 1}'}] {d.get('statement') or d.get('descripcion') or ''}"
            for i, d in enumerate((desempenos or [])[:5])
        )
        conocimientos_ctx = "\n".join(f"- {item}" for item in (conocimientos or [])[:10])
        habilidades_ctx = "\n".join(f"- {item}" for item in (habilidades or [])[:10])

        prompt = f"""Eres especialista en diseno curricular universitario y responsabilidad social universitaria en Peru.
Redacta una actividad de Responsabilidad Social Universitaria para un silabo de la Universidad Nacional Pedro Ruiz Gallo.

CONTEXTO TERRITORIAL OBLIGATORIO:
- La universidad se ubica en el departamento de Lambayeque, Peru.
- La actividad debe aterrizarse a una necesidad realista del entorno universitario, comunitario, educativo, cultural, ambiental, ciudadano o productivo de Lambayeque.
- No menciones lugares especificos si no son necesarios; no inventes instituciones aliadas.

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

REGLAS:
- Escribe 4 a 5 lineas, en tono institucional y natural.
- Propón una actividad concreta del mundo real, vinculada al proposito del curso o a la aplicacion social del aprendizaje.
- Debe incluir: necesidad/contexto local en Lambayeque, accion de los estudiantes, aplicacion de conocimientos/habilidades y evidencia verificable.
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
- Incluir entre 3 y 5 evidencias.
- Cada evidencia debe ser coherente con el metodo pedagogico.
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
        force_provider: str | None = None,
    ) -> str:
        prompt = f"""Asume el rol de especialista en didactica universitaria y diseno curricular por competencias.
Vas a redactar exclusivamente el componente del silabo denominado: "Metodologia y actividades de investigacion formativa".

Debes construir este componente de manera coherente con: la sumilla, la competencia oficial, el resultado de aprendizaje del curso, los resultados de las unidades, los desempenos, los contenidos y el metodo seleccionado ({metodo}).

SUMILLA: {str(curso.get("sumilla", ""))[:900]}
COMPETENCIA OFICIAL: {str(curso.get("competencia_egreso", ""))[:500]}
RESULTADO DE APRENDIZAJE DEL CURSO: {ra_curso}
RESULTADOS DE UNIDAD:
{_join_context_items(ra_unidades, 4)}
DESEMPENOS:
{_join_context_items(desempenos, 6)}
CONTENIDOS:
{_join_context_items(contenidos, 10)}

OBJETIVO:
Redacta una explicacion academica, clara y bien articulada, desarrollando:
1. Por que el metodo es pertinente para este curso.
2. Como se concreta en el desarrollo del curso.
3. El rol del docente.
4. El rol del estudiante.
5. Como se desarrollara la investigacion formativa.

INSTRUCCIONES OBLIGATORIAS:
- No redactes una definicion generica del metodo. Explica como operara en este curso.
- Justifica la pertinencia del metodo en funcion del proposito del curso.
- No uses vinetas ni numeracion. Redacta en prosa continua, organizada en parrafos.
- La redaccion debe quedar lista para el silabo, estilo academico.

ESTRUCTURA:
Parrafo 1: Presenta el metodo y explica su pertinencia para el curso.
Parrafo 2: Explica como se desarrollara concretamente y relacionalo con las actividades.
Parrafo 3: Explica el rol del docente y del estudiante.
Parrafo 4: Explica la investigacion formativa y cierra mostrando coherencia general.

SALIDA ESPERADA:
Devuelve la respuesta estrictamente en formato JSON valido, utilizando una unica clave llamada "metodologia_texto". El valor debe ser toda la prosa continua requerida, usando \\n\\n para separar los 4 parrafos. NO uses vinetas."""

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
        force_provider: str | None = None,
    ) -> str:
        prompt = f"""Asume el rol de especialista en tutoria universitaria y diseno curricular.
Vas a redactar exclusivamente el componente: "Actividades de tutoria: area academica".

Debes construir este componente de manera coherente con la sumilla, resultados de aprendizaje, desempenos, contenidos y el metodo del curso.

SUMILLA: {str(curso.get("sumilla", ""))[:900]}
RESULTADO DE APRENDIZAJE DEL CURSO: {ra_curso}
METODO DEL CURSO: {metodo}
DESEMPENOS:
{_join_context_items(desempenos, 6)}
CONTENIDOS:
{_join_context_items(contenidos, 10)}

OBJETIVO:
Redacta un texto academico que explique la tutoria, desarrollando:
1. El sentido de la tutoria en este curso.
2. Acciones del docente.
3. Que la tutoria se desarrollara segun las necesidades que vayan surgiendo.
4. Tecnicas a utilizar.
5. Relaciona la tutoria con dificultades reales del curso, como comprension, productos, oralidad, analisis, argumentacion o aplicacion.

INSTRUCCIONES OBLIGATORIAS:
- No la redactes como lista administrativa ni frase generica.
- Explica explicitamente que sera flexible a necesidades emergentes.
- Menciona tecnicas concretas, por ejemplo entrevistas, revision de avances y retroalimentacion focalizada.
- No uses vinetas ni numeracion. Prosa continua.

ESTRUCTURA:
Parrafo 1: Finalidad de la tutoria academica dentro del curso.
Parrafo 2: Acciones concretas de tutoria que realizara el docente.
Parrafo 3: Tecnicas a emplear y declaracion explicita de que la tutoria se ajustara a las necesidades que surjan.

SALIDA ESPERADA:
Devuelve la respuesta estrictamente en formato JSON valido, utilizando una unica clave llamada "tutoria_texto". El valor debe ser toda la prosa continua requerida, usando \\n\\n para separar los 3 parrafos. NO uses vinetas."""

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
