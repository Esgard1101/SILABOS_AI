import json
import logging
import os
import re
from typing import Any

from services.gemini_service import (
    DEFAULT_OPENROUTER_AUDIT_MODEL,
    generate_content,
)

logger = logging.getLogger(__name__)

_service: "ProgressiveAIService | None" = None


def _extract_json(text: str) -> str:
    text = re.sub(r"```(?:json)?\s*", "", text or "")
    text = re.sub(r"```", "", text)
    text = text.strip()
    starts = [(text.find("["), "["), (text.find("{"), "{")]
    starts = [(idx, ch) for idx, ch in starts if idx != -1]
    if starts:
        first_idx, first_char = min(starts, key=lambda item: item[0])
        end_char = "]" if first_char == "[" else "}"
        end_idx = text.rfind(end_char)
        if end_idx != -1 and end_idx > first_idx:
            return text[first_idx : end_idx + 1]
    return text


def _parse_json_text(text: str) -> Any:
    cleaned = _extract_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        starts = [idx for idx in (cleaned.find("["), cleaned.find("{")) if idx != -1]
        if not starts:
            raise
        start_idx = min(starts)
        obj, _end = decoder.raw_decode(cleaned[start_idx:])
        return obj


class ProgressiveAIService:
    """
    Servicio IA especifico para el wizard progresivo.

    Todas las sugerencias intermedias se enrutan por OpenRouter para
    reservar Gemini solo para la generacion final critica del silabo.
    """

    def __init__(self) -> None:
        legacy_openrouter_model = os.getenv("OPENROUTER_MODEL", "").strip()
        audit_model = (
            os.getenv("OPENROUTER_AUDIT_MODEL", "").strip()
            or legacy_openrouter_model
            or DEFAULT_OPENROUTER_AUDIT_MODEL
        )
        self.light_model = (
            os.getenv("OPENROUTER_LIGHT_MODEL", "").strip()
            or audit_model
        )

    async def _generate_json(
        self,
        *,
        task: str,
        prompt: str,
        force_provider: str | None = None,
    ) -> Any:
        raw_text = await generate_content(prompt, task=task, force_provider=force_provider)
        try:
            return _parse_json_text(raw_text)
        except json.JSONDecodeError:
            logger.warning("No se pudo parsear JSON del step progresivo | raw=%r", raw_text[:800])
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
Genera entre 3 y 5 desempenos de aprendizaje para el curso indicado, derivados de la sumilla, competencia y capacidad.

REGLAS:
- Cada desempeno inicia con un verbo en infinitivo.
- Deben ser observables y medibles.
- Deben derivarse del proposito del curso.
- No inventes contenido ajeno a la sumilla.
- Responde UNICAMENTE con JSON valido, sin markdown.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:500]}
COMPETENCIA DE EGRESO: {str(curso.get("competencia_egreso", ""))[:300]}
RESULTADO DE APRENDIZAJE: {str(curso.get("resultado_aprendizaje", ""))[:300]}
CAPACIDAD: {str(curso.get("capacidad", ""))[:250]}
{biblio_ctx}

Responde exactamente este formato:
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
            f"- {d.get('statement', d.get('code', ''))}" for d in desempenos[:5]
        )
        biblio_ctx = ""
        if bibliografia:
            biblio_ctx = "\nREFERENCIAS:\n" + "\n".join(f"- {r}" for r in bibliografia[:4])
        temas_ctx = "\n".join(f"- {t}" for t in (curso.get("temas_conocimientos") or [])[:12])
        habilidades_ctx = "\n".join(f"- {h}" for h in (curso.get("habilidades_desempenos") or [])[:12])
        skills_ctx = "\n".join(
            f"- {s.get('id_habilidad') or s.get('id')}: {s.get('nombre')} | verbo={s.get('verbo_principal', '')} | nivel={s.get('nivel_cognitivo', '')}"
            for s in (skills_context or [])[:20]
        )

        prompt = f"""Eres un experto en diseno curricular universitario peruano.
Dado el proposito del curso, deriva los tres componentes del contenido formativo.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:450]}
DATOS OFICIALES DEL CURSO - TEMAS/CONOCIMIENTOS:
{temas_ctx or "- Sin enriquecimiento de temas"}
DATOS OFICIALES DEL CURSO - HABILIDADES/DESEMPENOS:
{habilidades_ctx or "- Sin enriquecimiento de habilidades"}
BIBLIOTECA INSTITUCIONAL DE HABILIDADES PRIORIZADA:
{skills_ctx or "- Sin skills consultadas"}
DESEMPENOS:
{desempenos_texto}
{biblio_ctx}

Responde exactamente este JSON:
{{
  "conocimientos": ["Tema 1", "Tema 2", "Tema 3", "Tema 4"],
  "actitudes": ["Actitud 1", "Actitud 2", "Actitud 3"],
  "habilidades_sugeridas": ["Habilidad 1", "Habilidad 2"]
}}

REGLAS:
- conocimientos: 4 a 6 temas especificos en forma de sustantivos/temas. Nunca empieces con verbo.
- actitudes: 3 a 4 disposiciones valorativas que se forman.
- habilidades_sugeridas: 4 a 6 habilidades con verbo infinitivo + objeto. Prioriza la biblioteca y datos oficiales.
- Diferencia ontologica: conocimientos se asimilan, habilidades se desarrollan, actitudes se forman.
- Deben derivarse de RA/desempenos, no ser lista arbitraria.
- Responde SOLO JSON, sin texto adicional"""

        payload = await self._generate_json(
            task="progressive_content_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        if isinstance(payload, dict):
            return payload
        return {"conocimientos": [], "actitudes": [], "habilidades_sugeridas": []}

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
- Las siglas deben ser cortas.
- Responde SOLO JSON valido.

Formato exacto:
[
  {{"evidencia": "Tareas", "sigla": "TA", "porcentaje": 40, "cronograma": "Permanente"}},
  {{"evidencia": "Producto 1", "sigla": "P1", "porcentaje": 30, "cronograma": "Semana 8"}},
  {{"evidencia": "Producto 2", "sigla": "P2", "porcentaje": 30, "cronograma": "Semana 15"}}
]"""

        payload = await self._generate_json(
            task="progressive_grading_suggest",
            prompt=prompt,
            force_provider=force_provider,
        )
        return payload if isinstance(payload, list) else []


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
