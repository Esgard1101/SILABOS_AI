"""Motor unico para generar el programa de contenidos del silabo.

Este modulo reemplaza el ensamblado por moldes. Usa perfiles didacticos
versionados y una sola tarea IA para producir unidades, semanas, actividades y
evidencias con estilo docente.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from prompts.method_profiles import ANTI_PATTERNS, STYLE_GUIDE, get_method_profile

logger = logging.getLogger(__name__)

_service: "ContentGenerationEngine | None" = None


def _clean_text(value: Any, fallback: str = "") -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    return text or fallback


def _as_text_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = _clean_text(value)
        return [text] if text else []
    if isinstance(value, (int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(_as_text_list(item))
        return out
    if isinstance(value, dict):
        if isinstance(value.get("items"), list):
            return _as_text_list(value.get("items"))
        for key in ("name", "nombre", "title", "titulo", "label", "descripcion", "statement"):
            text = _clean_text(value.get(key))
            if text:
                return [text]
        out: list[str] = []
        for item in value.values():
            out.extend(_as_text_list(item))
        return out
    return []


def _merge_unique(*groups: Any, limit: int | None = None) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for item in _as_text_list(group):
            text = _clean_text(item).strip(" .;,\n\t")
            key = text.lower()
            if not text or key in seen:
                continue
            seen.add(key)
            merged.append(text)
            if limit and len(merged) >= limit:
                return merged
    return merged


def _normalize_match_text(value: str) -> str:
    text = str(value or "").lower()
    replacements = str.maketrans("áéíóúüñ", "aeiouun")
    return re.sub(r"\s+", " ", text.translate(replacements)).strip()


def _strip_robotic_prefix(value: Any) -> str:
    text = _clean_text(value).strip(" .;,\n\t")
    if not text:
        return ""
    patterns = [
        r"^fundamentos conceptuales de\s+",
        r"^contexto, alcance y categor[ií]as de\s+",
        r"^principios y enfoques de\s+",
        r"^integraci[oó]n diagn[oó]stica de\s+",
        r"^modelos te[oó]ricos de\s+",
        r"^procedimientos y estrategias de\s+",
        r"^an[aá]lisis comparado de\s+",
        r"^producto parcial sobre\s+",
        r"^m[eé]todos de aplicaci[oó]n de\s+",
        r"^criterios de dise[nñ]o e intervenci[oó]n en\s+",
        r"^resoluci[oó]n de situaciones pr[aá]cticas vinculadas con\s+",
        r"^evaluaci[oó]n parcial de resultados sobre\s+",
        r"^proyecto integrador aplicado a\s+",
        r"^validaci[oó]n y mejora de propuestas sobre\s+",
        r"^sustentaci[oó]n de evidencias y toma de decisiones en\s+",
        r"^cierre integrador y reflexi[oó]n acad[eé]mica sobre\s+",
    ]
    previous = None
    while previous != text:
        previous = text
        for pattern in patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE).strip(" .;,\n\t")
    return text[0].upper() + text[1:] if text else ""


def _clean_activity(value: Any, fallback: str) -> str:
    text = _clean_text(value)
    text = re.sub(r"\*\*[^*]{1,80}-\s*[^*]{1,120}:\*\*\s*", "", text).strip()
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"^\s*[A-ZÁÉÍÓÚÑ]{2,8}\s*-\s*[^:]{3,80}:\s*", "", text).strip()
    text = re.sub(r"\s+", " ", text)
    text = text or fallback
    if text and text[-1] not in ".!?":
        text += "."
    return text[0].upper() + text[1:] if text else ""


def _phase_named(profile: dict[str, Any], *needles: str) -> str | None:
    phases = _merge_unique(profile.get("phases"), limit=12)
    for phase in phases:
        normalized = _normalize_match_text(phase)
        if any(needle in normalized for needle in needles):
            return phase
    return None


def _phase_from_text(profile: dict[str, Any], text: str) -> str | None:
    context = _normalize_match_text(text)
    if not context:
        return None

    for phase in _merge_unique(profile.get("phases"), limit=12):
        phase_norm = _normalize_match_text(phase)
        if phase_norm and phase_norm in context:
            return phase

    if any(token in context for token in ("sustentacion", "socializacion", "presentacion final", "exposicion", "producto final")):
        return _phase_named(profile, "socializacion", "presentacion", "difusion", "evaluacion")
    if any(token in context for token in ("cierre", "sintesis", "reflexion final", "reflexivo")):
        return _phase_named(profile, "cierre", "sistematizacion", "reflexion")
    if any(token in context for token in ("revision", "ajuste", "retroalimentacion", "validacion", "mejora", "correccion")):
        return _phase_named(profile, "revision", "ajuste", "retroalimentacion", "validacion", "mejora")
    if any(token in context for token in ("produccion guiada", "elaboracion", "construccion", "diseno", "microtaller")):
        return _phase_named(profile, "produccion", "desarrollo", "implementacion")
    if any(token in context for token in ("modelado", "demostracion", "ejemplo docente")):
        return _phase_named(profile, "modelado", "demostracion")
    if any(token in context for token in ("analisis", "referentes", "criterios", "mapeo", "componentes", "curricular")):
        return _phase_named(profile, "analisis", "referentes", "criterios", "organizacion")
    if any(token in context for token in ("problematizacion", "situacion de aula", "necesidad pedagogica", "conflicto cognitivo")):
        return _phase_named(profile, "problematizacion", "exploracion", "preparacion", "idea general")
    return None


def _phase_for(
    profile: dict[str, Any],
    index: int,
    unit_week_count: int | None = None,
    *,
    activity: str = "",
    evidence: str = "",
) -> str:
    phases = _merge_unique(profile.get("phases"), limit=12)
    if not phases:
        return "desarrollo del aprendizaje"

    activity_phase = _phase_from_text(profile, activity)
    if activity_phase:
        return activity_phase

    evidence_norm = _normalize_match_text(evidence)
    if any(
        token in evidence_norm
        for token in ("sustentacion", "producto final", "version final", "cierre", "revision", "ajuste", "validacion")
    ):
        evidence_phase = _phase_from_text(profile, evidence)
        if evidence_phase:
            return evidence_phase

    if unit_week_count and unit_week_count > 1:
        bounded_index = max(0, min(index, unit_week_count - 1))
        phase_index = round((bounded_index / (unit_week_count - 1)) * (len(phases) - 1))
        return phases[min(phase_index, len(phases) - 1)]

    return phases[min(max(index, 0), len(phases) - 1)]


def _technique_for(profile: dict[str, Any], index: int) -> str:
    techniques = _merge_unique(profile.get("techniques"), limit=12)
    return techniques[index % len(techniques)] if techniques else "discusion guiada"


def _strip_activity_labels(value: str) -> str:
    text = _clean_text(value)
    text = re.split(r"(?i)\b(T[eÃ©]cnicas?|Prop[oÃ³]sito)\s*:", text, maxsplit=1)[0]
    text = re.sub(r"(?i)\b(Momento|Fase|Actividad|T[eé]cnicas?|Prop[oó]sito)\s*:\s*", "", text)
    text = re.sub(r"^\s*[^:]{3,80}:\s*", "", text)
    text = re.sub(r"(?i)^en\s+la\s+fase\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"(?i)^fase\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"(?i)^en\s+el\s+momento\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip(" .;,\n\t")
    return text


def _strip_activity_core(value: str) -> str:
    text = _clean_text(value)
    text = re.split(r"(?i)\b(T[e\xE9]cnicas?|Prop[o\xF3]sito)\s*:", text, maxsplit=1)[0]
    text = re.sub(r"(?i)\b(Momento|Fase|Actividad|T[e\xE9]cnicas?|Prop[o\xF3]sito)\s*:\s*", "", text)
    text = re.sub(r"^\s*[^:]{3,80}:\s*", "", text)
    text = re.sub(r"(?i)^en\s+la\s+fase\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"(?i)^fase\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"(?i)^en\s+el\s+momento\s+de\s+[^,.;:]{3,90}[:,;.]?\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip(" .;,\n\t")
    return text


def _drop_phase_prefix(text: str, phase: str) -> str:
    text = _clean_text(text)
    phase_words = _clean_text(phase).split()
    if not text or not phase_words:
        return text

    words = text.split()
    prefix = " ".join(words[: len(phase_words)])
    if _normalize_match_text(prefix) != _normalize_match_text(phase):
        return text

    remainder = " ".join(words[len(phase_words):]).strip(" .;,:-")
    if not remainder:
        return text

    remainder_norm = _normalize_match_text(remainder)
    phase_norm = _normalize_match_text(phase)
    if remainder_norm.startswith(("de ", "del ", "de la ", "de una ", "de un ")):
        if "produccion" in phase_norm:
            remainder = f"elaboracion {remainder}"
        elif "modelado" in phase_norm:
            remainder = f"observacion guiada {remainder}"
        elif "revision" in phase_norm or "ajuste" in phase_norm:
            remainder = f"ajuste {remainder}"
        elif "socializacion" in phase_norm:
            remainder = f"sustentacion {remainder}"
        elif "analisis" in phase_norm:
            remainder = f"revision {remainder}"
        elif "problematizacion" in phase_norm:
            remainder = f"analisis {remainder}"

    return remainder


def _format_activity_block(
    activity: str,
    profile: dict[str, Any],
    topic: str,
    week_in_unit: int,
    deliverable_name: str,
    unit_week_count: int | None = None,
    evidence: str = "",
    phase_override: str = "",
) -> str:
    phase = _clean_text(phase_override) or _phase_for(
        profile,
        week_in_unit,
        unit_week_count,
        activity=activity,
        evidence=evidence,
    )
    technique = _technique_for(profile, week_in_unit)
    work_object = _clean_text(profile.get("work_object"), "objeto de trabajo del metodo")
    core = _strip_activity_core(activity)
    core = _drop_phase_prefix(core, phase)
    if not core:
        core = (
            f"Analisis guiado de {topic.lower()} a partir de un {work_object.lower()} "
            "vinculado con el desempeno de la unidad"
        )
    if len(core.split()) > 34:
        core = " ".join(core.split()[:34]).rstrip(" ,.;") + "."
    return f"{phase}: {_clean_activity(core, core)} Tecnicas: {technique}."


def _overlap_tokens(left: str, right: str) -> bool:
    left_tokens = set(re.findall(r"[a-záéíóúñ]{5,}", _normalize_match_text(left)))
    right_tokens = set(re.findall(r"[a-záéíóúñ]{5,}", _normalize_match_text(right)))
    return bool(left_tokens & right_tokens)


def _clean_evidence(value: Any, fallback: str) -> str:
    text = _strip_robotic_prefix(value)
    text = re.sub(r"\s+", " ", text).strip(" .;,\n\t")
    text = text or fallback
    return text[0].upper() + text[1:] if text else ""


def _unit_week_ranges(unit_count: int, total_weeks: int = 16) -> list[tuple[int, int]]:
    count = max(1, int(unit_count or 1))
    base = total_weeks // count
    extra = total_weeks % count
    ranges: list[tuple[int, int]] = []
    start = 1
    for index in range(count):
        length = base + (1 if index < extra else 0)
        end = start + length - 1
        ranges.append((start, end))
        start = end + 1
    return ranges


def _normalize_performances(performances: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(performances or []):
        if isinstance(item, dict):
            code = _clean_text(item.get("code") or item.get("codigo"), f"D{index + 1}")
            statement = _clean_text(
                item.get("statement") or item.get("descripcion") or item.get("logro"),
                f"Desempeno {index + 1}",
            )
            normalized.append(
                {
                    "code": code,
                    "codigo": code,
                    "statement": statement,
                    "descripcion": statement,
                    "conocimientos": _merge_unique(item.get("conocimientos"), limit=12),
                    "habilidades": _merge_unique(item.get("habilidades"), limit=10),
                }
            )
        else:
            statement = _clean_text(item, f"Desempeno {index + 1}")
            normalized.append(
                {
                    "code": f"D{index + 1}",
                    "codigo": f"D{index + 1}",
                    "statement": statement,
                    "descripcion": statement,
                    "conocimientos": [],
                    "habilidades": [],
                }
            )
    return normalized or [
        {
            "code": "D1",
            "codigo": "D1",
            "statement": "Desempeno pendiente de validacion",
            "descripcion": "Desempeno pendiente de validacion",
            "conocimientos": [],
            "habilidades": [],
        }
    ]


def _checkpoint_ladder(profile: dict[str, Any], unit_count: int, deliverable_name: str) -> list[dict[str, Any]]:
    count = max(1, unit_count)
    ladder = _merge_unique(profile.get("evidence_ladder"), limit=max(5, count))
    checkpoints: list[dict[str, Any]] = []
    for index in range(count):
        sigla = f"PA{index + 1}"
        if count == 1:
            label = f"{sigla}: producto final sustentado"
        elif index == 0:
            label = f"{sigla}: primer avance del producto integrador"
        elif index == count - 1:
            label = f"{sigla}: version final y sustentacion del producto integrador"
        else:
            label = f"{sigla}: avance desarrollado del producto integrador"
        detail = ladder[min(index, len(ladder) - 1)] if ladder else deliverable_name
        checkpoints.append(
            {
                "unidad": index + 1,
                "sigla": sigla,
                "descripcion": label,
                "evidencia": f"{label} ({detail})",
                "is_final": index == count - 1,
            }
        )
    return checkpoints


def _fallback_ra_unidad(unit_index: int, topic: str, performance: dict[str, Any], profile: dict[str, Any]) -> str:
    verb = (_merge_unique(profile.get("verbs"), limit=1) or ["articular"])[0]
    statement = _clean_text(performance.get("statement"), "el desempeno oficial de la unidad")
    return (
        f"{verb.capitalize()} {topic.lower()} en coherencia con el desempeno oficial: "
        f"{statement}."
    )


def _fallback_taller_core(topic: str, phase: str, move: str) -> str:
    topic_text = topic.lower()
    phase_text = _normalize_match_text(phase)
    if "problematizacion" in phase_text:
        return (
            f"Analisis de una situacion de aula o contexto formativo relacionada con {topic_text}, "
            "para reconocer la necesidad pedagogica que orienta el producto."
        )
    if "referentes" in phase_text or "criterios" in phase_text:
        return (
            f"Revision de criterios y referentes sobre {topic_text}, identificando componentes "
            "que deben incorporarse al producto de taller."
        )
    if "modelado" in phase_text:
        return (
            f"Observacion de un modelado docente para elaborar {topic_text} con criterios de "
            "pertinencia, edad, proposito y contexto."
        )
    if "produccion" in phase_text:
        return (
            f"Elaboracion guiada de un avance sobre {topic_text}, con acompanamiento docente "
            "y contraste de criterios."
        )
    if "revision" in phase_text or "ajuste" in phase_text:
        return (
            f"Ajuste del producto vinculado con {topic_text}, usando retroalimentacion de pares "
            "y lista de cotejo tecnica."
        )
    if "socializacion" in phase_text:
        return (
            f"Sustentacion breve del producto relacionado con {topic_text}, explicando decisiones "
            "pedagogicas y mejoras realizadas."
        )
    if "cierre" in phase_text:
        return (
            f"Sistematizacion del proceso seguido en {topic_text}, valorando avances, dificultades "
            "y criterios de mejora."
        )
    return f"{move.capitalize()} en torno a {topic_text}, con produccion guiada y retroalimentacion docente."


def _fallback_activity(
    profile: dict[str, Any],
    topic: str,
    week_in_unit: int,
    deliverable_name: str,
    unit_week_count: int | None = None,
    evidence: str = "",
) -> str:
    moves = _merge_unique(profile.get("activity_moves"), limit=8) or [
        "analizar el tema de la semana",
        "aplicar lo aprendido en una tarea breve",
    ]
    phase = _phase_for(profile, week_in_unit, unit_week_count, evidence=evidence)
    technique = _technique_for(profile, week_in_unit)
    work_object = _clean_text(profile.get("work_object"), "objeto de trabajo del metodo")
    move = moves[week_in_unit % len(moves)]
    if _normalize_match_text(profile.get("code")) == "abt" or "taller" in _normalize_match_text(profile.get("name")):
        core = _fallback_taller_core(topic, phase, move)
    else:
        core = (
            f"{move.capitalize()} a partir de {topic.lower()}, tomando como objeto de trabajo "
            f"el {work_object.lower()}."
        )
    return _format_activity_block(
        core,
        profile,
        topic,
        week_in_unit,
        deliverable_name,
        unit_week_count,
        evidence,
        phase,
    )


def _fallback_evidence(profile: dict[str, Any], topic: str, week_in_unit: int) -> str:
    ladder = _merge_unique(profile.get("evidence_ladder"), limit=8) or ["Producto breve de aplicacion"]
    base = ladder[week_in_unit % len(ladder)]
    topic_short = " ".join(topic.split()[:8]).strip(" .;,:")
    return f"{base}: {topic_short}" if topic_short else base


def build_didactic_fallback(
    *,
    curso: dict[str, Any],
    performances: list[Any],
    method_raw: dict[str, Any] | None,
    knowledge_items: list[str] | None = None,
    skill_names: list[str] | None = None,
    habilidades_por_desempeno: list[dict[str, Any]] | None = None,
    week_dates: list[str] | None = None,
) -> dict[str, Any]:
    method_raw = method_raw or {}
    profile = get_method_profile(method_raw.get("code"), method_raw.get("name"))
    desempenos = _normalize_performances(performances)
    unit_count = len(desempenos)
    ranges = _unit_week_ranges(unit_count)
    dates = week_dates if week_dates and len(week_dates) >= 16 else ["---"] * 16

    official_knowledge = _merge_unique(
        knowledge_items,
        [p.get("conocimientos", []) for p in desempenos],
        curso.get("temas_conocimientos"),
        [curso.get("name")],
        limit=40,
    )
    official_skills = _merge_unique(
        skill_names,
        [p.get("habilidades", []) for p in desempenos],
        curso.get("habilidades_desempenos"),
        limit=30,
    )
    if not official_skills:
        official_skills = _merge_unique(profile.get("verbs"), limit=5)

    deliverable_name = _clean_text(
        profile.get("deliverable_pattern"),
        "Producto integrador del curso",
    )
    checkpoints = _checkpoint_ladder(profile, unit_count, deliverable_name)
    hab_by_code = {
        _clean_text(item.get("desempeno_code") or item.get("code")): _merge_unique(item.get("habilidades"), limit=8)
        for item in (habilidades_por_desempeno or [])
        if isinstance(item, dict)
    }

    units: list[dict[str, Any]] = []
    schedule: list[dict[str, Any]] = []
    content_plan_units: list[dict[str, Any]] = []

    for unit_index, performance in enumerate(desempenos):
        start, end = ranges[unit_index]
        week_count = end - start + 1
        perf_code = performance["code"]
        perf_skills = (
            hab_by_code.get(perf_code)
            or _merge_unique(performance.get("habilidades"), official_skills, limit=6)
        )
        unit_topics = []
        for offset in range(week_count):
            seed_index = min(len(official_knowledge) - 1, (start + offset - 1) % max(len(official_knowledge), 1))
            topic = _strip_robotic_prefix(official_knowledge[seed_index] if official_knowledge else curso.get("name", "Tema del curso"))
            if topic and topic not in unit_topics:
                unit_topics.append(topic)
        title = unit_topics[0] if unit_topics else f"Unidad {unit_index + 1}"
        ra_unidad = _fallback_ra_unidad(unit_index, title, performance, profile)
        plan_weeks: list[dict[str, Any]] = []

        for offset, week in enumerate(range(start, end + 1)):
            topic = unit_topics[min(offset, len(unit_topics) - 1)] if unit_topics else title
            evidence = _fallback_evidence(profile, topic, offset)
            if week == end:
                evidence = checkpoints[unit_index]["evidencia"]
            activity = _fallback_activity(
                profile,
                topic,
                offset,
                deliverable_name,
                week_count,
                evidence,
            )
            row_skills = perf_skills[:2] or official_skills[:2]
            plan_weeks.append(
                {
                    "week": week,
                    "unit_number": unit_index + 1,
                    "performance_code": perf_code,
                    "knowledge": [topic],
                    "skills": [{"skill_id": None, "name": skill} for skill in row_skills],
                    "activity": activity,
                    "evidence": evidence,
                }
            )
            schedule.append(
                {
                    "semana": week,
                    "fecha": dates[week - 1],
                    "desempeno": performance["statement"],
                    "desempeno_code": perf_code,
                    "tema": topic,
                    "conocimientos": [topic],
                    "habilidades": row_skills,
                    "actividad": activity,
                    "producto": evidence,
                    "evidencia": evidence,
                }
            )

        units.append(
            {
                "numero": unit_index + 1,
                "titulo": title,
                "semanas": f"{start}-{end}",
                "temas": unit_topics[:week_count],
                "logro": performance["statement"],
                "ra_unidad": ra_unidad,
                "habilidades_requeridas": perf_skills[:6] or ["Aplicacion progresiva del desempeno oficial"],
                "required_skills": perf_skills[:6] or ["Aplicacion progresiva del desempeno oficial"],
            }
        )
        content_plan_units.append(
            {
                "unit_number": unit_index + 1,
                "title": title,
                "ra_unidad": ra_unidad,
                "weeks": plan_weeks,
            }
        )

    return {
        "origin": "content_engine_v2_fallback",
        "entregable_integrador": {
            "nombre": deliverable_name,
            "descripcion": deliverable_name,
            "avances_por_unidad": checkpoints,
        },
        "criterio_metodologico": {
            "metodo": profile["name"],
            "secuencia_visible": " -> ".join(profile.get("phases", [])),
            "justificacion": profile.get("intent", ""),
        },
        "conocimientos": official_knowledge,
        "habilidades_sugeridas": official_skills,
        "habilidades_por_desempeno": [
            {"desempeno_code": p["code"], "habilidades": _merge_unique(p.get("habilidades"), official_skills, limit=6)}
            for p in desempenos
        ],
        "content_plan": {"units": content_plan_units, "warnings": ["fallback_didactico_local"]},
        "unidades_tematicas": units,
        "cronograma_semanal": schedule,
        "warnings": ["Se uso fallback didactico local."],
    }


class ContentGenerationEngine:
    """Genera contenido didactico de silabo con una sola tarea IA."""

    async def generate(
        self,
        *,
        curso: dict[str, Any],
        performances: list[Any],
        method_raw: dict[str, Any] | None,
        grading_rows: list[dict[str, Any]] | None = None,
        knowledge_items: list[str] | None = None,
        skill_names: list[str] | None = None,
        habilidades_por_desempeno: list[dict[str, Any]] | None = None,
        bibliography_refs: list[str] | None = None,
        week_dates: list[str] | None = None,
        force_provider: str | None = None,
    ) -> dict[str, Any]:
        method_raw = method_raw or {}
        profile = get_method_profile(method_raw.get("code"), method_raw.get("name"))
        desempenos = _normalize_performances(performances)
        prompt = self._build_prompt(
            curso=curso,
            performances=desempenos,
            method_raw=method_raw,
            profile=profile,
            grading_rows=grading_rows or [],
            knowledge_items=knowledge_items or [],
            skill_names=skill_names or [],
            habilidades_por_desempeno=habilidades_por_desempeno or [],
            bibliography_refs=bibliography_refs or [],
        )
        from services.gemini_service import _get_router_service

        service = _get_router_service()
        payload = await service.generate_json(
            "content_engine_generate",
            prompt,
            force_provider=force_provider,
            max_retries=2,
        )
        if not isinstance(payload, dict):
            raise ValueError("content_engine_generate no devolvio un objeto JSON")
        return self.normalize_payload(
            payload=payload,
            curso=curso,
            performances=desempenos,
            method_raw=method_raw,
            grading_rows=grading_rows or [],
            knowledge_items=knowledge_items or [],
            skill_names=skill_names or [],
            habilidades_por_desempeno=habilidades_por_desempeno or [],
            week_dates=week_dates,
        )

    def _build_prompt(
        self,
        *,
        curso: dict[str, Any],
        performances: list[dict[str, Any]],
        method_raw: dict[str, Any],
        profile: dict[str, Any],
        grading_rows: list[dict[str, Any]],
        knowledge_items: list[str],
        skill_names: list[str],
        habilidades_por_desempeno: list[dict[str, Any]],
        bibliography_refs: list[str],
    ) -> str:
        course_context = {
            "nombre": curso.get("name") or curso.get("nombre_curso") or "",
            "sumilla": curso.get("sumilla") or "",
            "competencia_egreso": curso.get("competencia_egreso") or "",
            "resultado_aprendizaje": curso.get("resultado_aprendizaje") or "",
            "capacidad": curso.get("capacidad") or "",
            "temas_oficiales": _merge_unique(curso.get("temas_conocimientos"), knowledge_items, limit=40),
            "habilidades_oficiales": _merge_unique(curso.get("habilidades_desempenos"), skill_names, limit=30),
        }
        method_context = {
            "selected_method": {
                "id": str(method_raw.get("id") or ""),
                "code": method_raw.get("code") or profile.get("code"),
                "name": method_raw.get("name") or profile.get("name"),
            },
            "profile": profile,
        }
        output_schema = {
            "entregable_integrador": {
                "nombre": "Nombre concreto del producto unico del curso",
                "descripcion": "Que se construye y para que sirve",
                "avances_por_unidad": [
                    {
                        "unidad": 1,
                        "sigla": "PA1",
                        "descripcion": "Primer avance del mismo producto",
                        "evidencia": "Evidencia verificable",
                        "is_final": False,
                    }
                ],
            },
            "criterio_metodologico": {
                "metodo": "Metodo seleccionado",
                "secuencia_visible": "Secuencia didactica natural",
                "justificacion": "Pertinencia con el curso",
            },
            "conocimientos": ["Tema disciplinar breve"],
            "habilidades_sugeridas": ["Verbo en infinitivo + objeto"],
            "habilidades_por_desempeno": [
                {"desempeno_code": "D1", "habilidades": ["Habilidad concreta"]}
            ],
            "content_plan": {
                "units": [
                    {
                        "unit_number": 1,
                        "title": "Titulo natural de unidad",
                        "ra_unidad": "Resultado de unidad derivado del desempeno sin reescribirlo",
                        "weeks": [
                            {
                                "week": 1,
                                "performance_code": "D1",
                                "knowledge": ["Conocimiento concreto de la semana"],
                                "skills": [{"skill_id": None, "name": "Habilidad concreta"}],
                                "activity": "Actividad didactica en lenguaje docente",
                                "evidence": "Evidencia de aprendizaje verificable",
                            }
                        ],
                    }
                ],
                "warnings": [],
            },
        }
        return f"""Eres un motor especializado en programa de contenidos para silabos universitarios peruanos.

OBJETIVO
Genera SOLO el componente didactico del programa de contenidos: unidades, semanas, conocimientos, actividades y evidencias. Debe sonar como docente experto, no como plantilla automatica.

CONTEXTO DEL CURSO
{json.dumps(course_context, ensure_ascii=False, indent=2)}

DESEMPENOS OFICIALES NO MANIPULABLES
Usa estos desempenos literalmente como referencia curricular. No los reescribas ni cambies su sentido.
{json.dumps(performances, ensure_ascii=False, indent=2)}

METODO SELECCIONADO Y PERFIL DIDACTICO BACKEND
{json.dumps(method_context, ensure_ascii=False, indent=2)}

SISTEMA DE CALIFICACION CONFIRMADO
{json.dumps(grading_rows, ensure_ascii=False, indent=2)}

HABILIDADES POR DESEMPENO YA CONFIRMADAS O SUGERIDAS
{json.dumps(habilidades_por_desempeno, ensure_ascii=False, indent=2)}

REFERENCIAS DISPONIBLES
{json.dumps((bibliography_refs or [])[:6], ensure_ascii=False, indent=2)}

GUIA DE ESTILO DIDACTICO
{json.dumps(STYLE_GUIDE, ensure_ascii=False, indent=2)}

ANTIPATRONES PROHIBIDOS
No uses ni variantes de estas frases: {json.dumps(ANTI_PATTERNS, ensure_ascii=False)}.
No escribas prefijos como "**ABDe - Fase:**" dentro de actividades.
No repitas "en la fase de..." dentro de la misma actividad. Redacta el nucleo de la tarea en lenguaje docente; el backend ordenara la fase pedagogica y las tecnicas.

REGLAS OBLIGATORIAS
1. Una unidad por desempeno oficial. Distribuye exactamente 16 semanas de forma proporcional.
2. Las columnas finales son: Desempenos, Habilidades requeridas, Semana (Fecha), Conocimientos, Actividades, Evidencias de Aprendizaje.
3. Propone un unico entregable integrador del curso. PA1, PA2, PA3, etc. son avances del mismo producto, no productos inconexos.
4. Si hay 2 unidades, PA1 debe ser avance y el ultimo PA debe ser version final o sustentacion del mismo producto.
5. Cada conocimiento semanal debe ser disciplinar y concreto. No empieces temas con verbos ni con frases de relleno.
6. Cada actividad debe ser entendible por un docente y aportar una situacion/tarea concreta; debe permitir ordenar fase del metodo y tecnica didactica sin sonar mecanico.
7. Cada evidencia debe ser concreta y verificable.
8. No generes metodologia, tutoria, bibliografia ni datos generales.
9. Responde exclusivamente JSON valido con el esquema exacto.
10. Plantea realmente el objeto de trabajo del metodo: caso, desafio, problema, proyecto, pregunta investigable, argumento, experiencia, grupo cooperativo, taller, prototipo o contexto matematizable, segun corresponda.

ESQUEMA DE SALIDA
{json.dumps(output_schema, ensure_ascii=False, indent=2)}"""

    def normalize_payload(
        self,
        *,
        payload: dict[str, Any],
        curso: dict[str, Any],
        performances: list[dict[str, Any]],
        method_raw: dict[str, Any] | None,
        grading_rows: list[dict[str, Any]],
        knowledge_items: list[str],
        skill_names: list[str],
        habilidades_por_desempeno: list[dict[str, Any]],
        week_dates: list[str] | None,
    ) -> dict[str, Any]:
        method_raw = method_raw or {}
        profile = get_method_profile(method_raw.get("code"), method_raw.get("name"))
        unit_count = len(performances)
        ranges = _unit_week_ranges(unit_count)
        dates = week_dates if week_dates and len(week_dates) >= 16 else ["---"] * 16
        fallback = build_didactic_fallback(
            curso=curso,
            performances=performances,
            method_raw=method_raw,
            knowledge_items=knowledge_items,
            skill_names=skill_names,
            habilidades_por_desempeno=habilidades_por_desempeno,
            week_dates=week_dates,
        )
        fallback_units = fallback["content_plan"]["units"]
        delivered = payload.get("entregable_integrador") if isinstance(payload.get("entregable_integrador"), dict) else {}
        deliverable_name = _clean_text(
            delivered.get("nombre") or delivered.get("descripcion"),
            fallback["entregable_integrador"]["nombre"],
        )
        checkpoints = delivered.get("avances_por_unidad")
        if not isinstance(checkpoints, list) or len(checkpoints) < unit_count:
            checkpoints = _checkpoint_ladder(profile, unit_count, deliverable_name)

        raw_units = []
        raw_plan = payload.get("content_plan")
        if isinstance(raw_plan, dict) and isinstance(raw_plan.get("units"), list):
            raw_units = raw_plan.get("units") or []
        elif isinstance(payload.get("units"), list):
            raw_units = payload.get("units") or []

        final_units: list[dict[str, Any]] = []
        schedule: list[dict[str, Any]] = []
        plan_units: list[dict[str, Any]] = []
        warnings: list[str] = []

        for unit_index, performance in enumerate(performances):
            start, end = ranges[unit_index]
            week_count = end - start + 1
            raw_unit = raw_units[unit_index] if unit_index < len(raw_units) and isinstance(raw_units[unit_index], dict) else {}
            fallback_unit = fallback_units[unit_index]
            raw_weeks = raw_unit.get("weeks") if isinstance(raw_unit.get("weeks"), list) else []

            topic_pool = _merge_unique(
                raw_unit.get("temas"),
                [w.get("knowledge") for w in raw_weeks if isinstance(w, dict)],
                performance.get("conocimientos"),
                knowledge_items,
                curso.get("temas_conocimientos"),
                limit=max(week_count, 12),
            )
            topic_pool = [_strip_robotic_prefix(topic) for topic in topic_pool if _strip_robotic_prefix(topic)]
            if not topic_pool:
                topic_pool = _merge_unique(fallback_unit.get("weeks", [{}])[0].get("knowledge"), limit=1) or [curso.get("name", "Tema del curso")]

            unit_title = _strip_robotic_prefix(raw_unit.get("title") or raw_unit.get("titulo") or topic_pool[0])
            if len(unit_title.split()) > 14:
                unit_title = " ".join(unit_title.split()[:14])
            unit_skills = _merge_unique(
                raw_unit.get("habilidades_requeridas"),
                raw_unit.get("required_skills"),
                [w.get("skills") for w in raw_weeks if isinstance(w, dict)],
                performance.get("habilidades"),
                skill_names,
                limit=6,
            )
            if not unit_skills:
                unit_skills = fallback["unidades_tematicas"][unit_index]["habilidades_requeridas"]
            ra_unidad = _clean_activity(
                raw_unit.get("ra_unidad"),
                fallback["unidades_tematicas"][unit_index]["ra_unidad"],
            )

            normalized_weeks: list[dict[str, Any]] = []
            for offset, week in enumerate(range(start, end + 1)):
                raw_week = raw_weeks[offset] if offset < len(raw_weeks) and isinstance(raw_weeks[offset], dict) else {}
                topic = _strip_robotic_prefix(
                    (_merge_unique(raw_week.get("knowledge"), limit=1) or [topic_pool[min(offset, len(topic_pool) - 1)]])[0]
                )
                if not topic:
                    topic = topic_pool[min(offset, len(topic_pool) - 1)]
                week_skills = _merge_unique(raw_week.get("skills"), unit_skills, limit=2)
                raw_activity = raw_week.get("activity") or raw_week.get("actividad")
                evidence = _clean_evidence(
                    raw_week.get("evidence") or raw_week.get("evidencia") or raw_week.get("producto"),
                    _fallback_evidence(profile, topic, offset),
                )
                if week == end:
                    checkpoint = checkpoints[min(unit_index, len(checkpoints) - 1)]
                    checkpoint_text = _clean_evidence(
                        checkpoint.get("evidencia") or checkpoint.get("descripcion"),
                        evidence,
                    )
                    if checkpoint_text:
                        evidence = checkpoint_text
                if _clean_text(raw_activity):
                    activity = _format_activity_block(
                        _clean_activity(raw_activity, ""),
                        profile,
                        topic,
                        offset,
                        deliverable_name,
                        week_count,
                        evidence,
                    )
                else:
                    activity = _fallback_activity(
                        profile,
                        topic,
                        offset,
                        deliverable_name,
                        week_count,
                        evidence,
                    )

                normalized_weeks.append(
                    {
                        "week": week,
                        "unit_number": unit_index + 1,
                        "performance_code": performance["code"],
                        "knowledge": [topic],
                        "skills": [{"skill_id": None, "name": skill} for skill in week_skills],
                        "activity": activity,
                        "evidence": evidence,
                    }
                )
                schedule.append(
                    {
                        "semana": week,
                        "fecha": dates[week - 1],
                        "desempeno": performance["statement"],
                        "desempeno_code": performance["code"],
                        "tema": topic,
                        "conocimientos": [topic],
                        "habilidades": week_skills,
                        "actividad": activity,
                        "producto": evidence,
                        "evidencia": evidence,
                    }
                )

            final_units.append(
                {
                    "numero": unit_index + 1,
                    "titulo": unit_title,
                    "semanas": f"{start}-{end}",
                    "temas": [w["knowledge"][0] for w in normalized_weeks],
                    "logro": performance["statement"],
                    "ra_unidad": ra_unidad,
                    "habilidades_requeridas": unit_skills,
                    "required_skills": unit_skills,
                }
            )
            plan_units.append(
                {
                    "unit_number": unit_index + 1,
                    "title": unit_title,
                    "ra_unidad": ra_unidad,
                    "weeks": normalized_weeks,
                }
            )

        warnings.extend(self._validate_non_robotic(schedule, profile))
        conocimientos = _merge_unique(
            payload.get("conocimientos"),
            [row.get("conocimientos") for row in schedule],
            knowledge_items,
            limit=40,
        )
        habilidades = _merge_unique(
            payload.get("habilidades_sugeridas"),
            [row.get("habilidades") for row in schedule],
            skill_names,
            limit=30,
        )

        return {
            "origin": "content_engine_v2",
            "entregable_integrador": {
                "nombre": deliverable_name,
                "descripcion": _clean_text(delivered.get("descripcion"), deliverable_name),
                "avances_por_unidad": checkpoints,
            },
            "criterio_metodologico": payload.get("criterio_metodologico") or fallback["criterio_metodologico"],
            "conocimientos": conocimientos,
            "habilidades_sugeridas": habilidades,
            "habilidades_por_desempeno": self._normalize_habilidades_por_desempeno(
                payload.get("habilidades_por_desempeno"),
                performances,
                habilidades_por_desempeno,
                habilidades,
            ),
            "content_plan": {"units": plan_units, "warnings": warnings},
            "unidades_tematicas": final_units,
            "cronograma_semanal": schedule,
            "warnings": warnings,
        }

    def _normalize_habilidades_por_desempeno(
        self,
        value: Any,
        performances: list[dict[str, Any]],
        existing: list[dict[str, Any]],
        fallback_skills: list[str],
    ) -> list[dict[str, Any]]:
        source = value if isinstance(value, list) else []
        source.extend(existing or [])
        by_code: dict[str, list[str]] = {}
        for item in source:
            if not isinstance(item, dict):
                continue
            code = _clean_text(item.get("desempeno_code") or item.get("code") or item.get("codigo"))
            if not code:
                continue
            by_code.setdefault(code, [])
            by_code[code] = _merge_unique(by_code[code], item.get("habilidades"), limit=8)

        return [
            {
                "desempeno_code": performance["code"],
                "habilidades": by_code.get(performance["code"]) or _merge_unique(
                    performance.get("habilidades"), fallback_skills, limit=6
                ),
            }
            for performance in performances
        ]

    def _validate_non_robotic(self, schedule: list[dict[str, Any]], profile: dict[str, Any] | None = None) -> list[str]:
        warnings: list[str] = []
        normalized_patterns = [_normalize_match_text(pattern) for pattern in ANTI_PATTERNS]
        phases = [_normalize_match_text(phase) for phase in _merge_unique((profile or {}).get("phases"), limit=12)]
        techniques = [_normalize_match_text(tech) for tech in _merge_unique((profile or {}).get("techniques"), limit=12)]
        for row in schedule:
            joined = " ".join(
                [
                    _clean_text(row.get("tema")),
                    _clean_text(row.get("actividad")),
                    _clean_text(row.get("evidencia")),
                ]
            )
            norm = _normalize_match_text(joined)
            if any(pattern in norm for pattern in normalized_patterns):
                warnings.append(f"Semana {row.get('semana')}: se detecto frase robotica reparable.")
            if re.search(r"\*\*[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,8}\s*-\s*[^*]+:\*\*", joined):
                warnings.append(f"Semana {row.get('semana')}: actividad conserva prefijo de metodo.")
            activity_norm = _normalize_match_text(_clean_text(row.get("actividad")))
            if phases and not any(phase in activity_norm for phase in phases):
                warnings.append(f"Semana {row.get('semana')}: la actividad no visibiliza fase metodologica.")
            if techniques and not any(tech in activity_norm for tech in techniques):
                warnings.append(f"Semana {row.get('semana')}: la actividad no visibiliza tecnica didactica.")
        return warnings


def get_content_generation_engine() -> ContentGenerationEngine:
    global _service
    if _service is None:
        _service = ContentGenerationEngine()
    return _service
