"""Reglas deterministicas para proteger la seleccion metodologica.

La IA puede rankear metodos, pero algunas senales curriculares son demasiado
claras para dejarlas al azar. Este modulo concentra esas reglas para que los
routers no dependan de heuristicas dispersas.
"""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any


TALLER_STRONG_TERMS = [
    "planificacion curricular",
    "programacion curricular",
    "programa curricular",
    "planificacion semanal",
    "planificacion diaria",
    "sesion de aprendizaje",
    "sesiones de aprendizaje",
    "secuencia didactica",
    "secuencias didacticas",
    "lista de cotejo",
    "entrevista a padres",
    "entrevista a familias",
    "instrumentos de observacion",
    "instrumentos de evaluacion",
    "mapeo curricular",
    "componentes curriculares",
    "procesos didacticos",
    "educacion temprana",
    "educacion inicial",
    "ninos menores de tres",
    "menores de tres anos",
    "cunas",
    "materiales para la educacion temprana",
]


TALLER_SUPPORT_TERMS = [
    "produccion pedagogica",
    "produccion didactica",
    "producto pedagogico",
    "productos pedagogicos",
    "producto didactico",
    "productos didacticos",
    "diseno de instrumentos",
    "disenar instrumentos",
    "disena instrumentos",
    "diseno de sesiones",
    "disenar sesiones",
    "disena sesiones",
    "elabora recursos",
    "elaborar recursos",
    "elabora material",
    "elaborar material",
    "matriz",
    "plan",
    "planes",
    "propuesta pedagogica",
    "recursos didacticos",
    "aula",
    "docente",
    "pedagogica",
    "didactica",
    "curricular",
    "infante",
]


DIGITAL_PROJECT_TERMS = [
    "aplicacion movil",
    "aplicaciones moviles",
    "app inventor",
    "videojuego",
    "software",
    "python",
    "prototipo funcional",
    "programacion para moviles",
]


def _clean_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _as_text_list(values: Any) -> list[str]:
    if values is None:
        return []
    if isinstance(values, str):
        text = _clean_text(values)
        return [text] if text else []
    if isinstance(values, dict):
        values = [values]
    if not isinstance(values, list):
        text = _clean_text(values)
        return [text] if text else []

    result: list[str] = []
    for value in values:
        if isinstance(value, dict):
            if isinstance(value.get("items"), list):
                result.extend(_as_text_list(value.get("items")))
                continue
            text = _clean_text(
                value.get("name")
                or value.get("nombre")
                or value.get("title")
                or value.get("label")
                or value.get("descripcion")
                or value.get("statement")
                or value.get("code")
            )
        else:
            text = _clean_text(value)
        if text:
            result.append(text)
    return result


def _normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _jsonish_text(value: Any) -> str:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return _clean_text(value)


def _matches(context: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in context]


def _find_method(metodos_base: list[dict[str, Any]], code: str, name_terms: list[str]) -> dict[str, Any] | None:
    target_code = _normalize(code)
    for method in metodos_base:
        if _normalize(method.get("code")) == target_code:
            return method

    for method in metodos_base:
        method_text = _normalize(f"{method.get('code', '')} {method.get('name', '')}")
        if any(term in method_text for term in name_terms):
            return method
    return None


def _build_context(
    curso: dict[str, Any] | None,
    content_block: dict[str, Any] | None,
    performances: list[Any] | None,
    skill_context: str | None,
) -> str:
    curso = curso or {}
    content_block = content_block or {}
    parts: list[str] = []

    for key in (
        "name",
        "sumilla",
        "competencia",
        "competencia_egreso",
        "capacidad",
        "resultado_aprendizaje",
        "tipo_curso",
        "naturaleza",
        "scope",
        "temas_conocimientos",
        "habilidades_desempenos",
        "actividades_metodo",
    ):
        parts.append(_jsonish_text(curso.get(key)))

    for key in ("knowledge_items", "habilidades_sugeridas", "content_plan"):
        parts.append(_jsonish_text(content_block.get(key)))

    parts.extend(_as_text_list(performances))
    parts.append(_clean_text(skill_context))
    return _normalize(" ".join(part for part in parts if part))


def _suggest_taller_for_pedagogical_production(
    curso: dict[str, Any] | None,
    metodos_base: list[dict[str, Any]],
    content_block: dict[str, Any] | None,
    performances: list[Any] | None,
    skill_context: str | None,
) -> dict[str, Any] | None:
    taller = _find_method(metodos_base, "ABT", ["taller"])
    if not taller:
        return None

    context = _build_context(curso, content_block, performances, skill_context)
    strong_matches = _matches(context, TALLER_STRONG_TERMS)
    support_matches = _matches(context, TALLER_SUPPORT_TERMS)
    digital_matches = _matches(context, DIGITAL_PROJECT_TERMS)

    strong_score = len(strong_matches)
    support_score = len(support_matches)
    digital_project_score = len(digital_matches)

    if digital_project_score >= 2 and strong_score < 2:
        return None

    should_prefer_taller = (
        strong_score >= 2
        or (strong_score >= 1 and support_score >= 3)
        or (
            support_score >= 5
            and any(anchor in context for anchor in ("pedagog", "didactic", "curricular", "aula"))
        )
    )
    if not should_prefer_taller:
        return None

    return {
        "method_id": taller.get("id"),
        "method_name": taller.get("name", "Aprendizaje Basado en Taller"),
        "method_code": taller.get("code", "ABT"),
        "phases": taller.get("phases", []),
        "reason": (
            "Se prioriza Taller porque el curso exige produccion pedagogica guiada "
            "de instrumentos, planificaciones, materiales o secuencias verificables."
        ),
        "reason_items": [
            "Los desempenos y conocimientos apuntan a construir productos pedagogicos concretos, no solo a resolver un reto abierto.",
            "La logica de Taller permite problematizar, modelar, producir, revisar y socializar evidencias con acompanamiento docente.",
            "La seleccion evita forzar fases de desafio cuando el eje real del curso es la produccion didactica aplicada.",
        ],
        "complementario": None,
        "origin": "rule_pedagogical_production",
        "matched_terms": {
            "strong": strong_matches[:8],
            "support": support_matches[:8],
        },
    }


def suggest_method_by_rules(
    *,
    curso: dict[str, Any] | None,
    metodos_base: list[dict[str, Any]],
    content_block: dict[str, Any] | None = None,
    performances: list[Any] | None = None,
    skill_context: str | None = None,
) -> dict[str, Any] | None:
    """Return a deterministic method suggestion when curriculum signals are clear."""

    return _suggest_taller_for_pedagogical_production(
        curso=curso,
        metodos_base=metodos_base,
        content_block=content_block,
        performances=performances,
        skill_context=skill_context,
    )
