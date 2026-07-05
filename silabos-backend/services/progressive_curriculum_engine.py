"""Motor progresivo para generar contenido semanal de silabos.

Este modulo concentra la logica didactica del nuevo flujo:
- producto acreditable como horizonte del curso,
- generacion por unidad,
- memoria ligera de continuidad,
- fases metodologicas no ciclicas,
- validacion de triple coherencia por semana.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Any

from prompts.method_profiles import get_method_profile


PRODUCT_CATEGORIES = [
    "Libre de proponer por IA",
    "Investigacion Academica",
    "Produccion Multimedia / Digital",
    "Desarrollo Tecnologico y Prototipado",
    "Intervencion Educativa / Social",
    "Analisis y Resolucion de Casos",
    "Recopilacion y Evolucion",
]

logger = logging.getLogger(__name__)

TERRITORIAL_CONTEXT_BLOCK = (
    "CONTEXTO TERRITORIAL Y ÁREA DE INFLUENCIA: La Universidad Nacional Pedro Ruiz Gallo (UNPRG) "
    "tiene su sede en Lambayeque. Su zona de influencia directa abarca Chiclayo (capital y eje "
    "comercial/urbano con distritos densos como José Leonardo Ortiz y La Victoria), balnearios y "
    "zonas costeras (Pimentel, Puerto Eten), zonas agrícolas e históricas (Ferreñafe, Monsefú, "
    "Chongoyape, Saña, Cayaltí, Tumán y Huaca Rajada). REGLA: Elige orgánicamente UN SOLO lugar "
    "o distrito de esta lista que tenga total sentido semántico con el tema del curso para situar "
    "el objeto de trabajo o proyecto."
)


class ProgressiveContentGenerationError(RuntimeError):
    """Señala que ningun proveedor IA produjo una unidad usable."""


def _canonical_product_category(value: str) -> str:
    normalized = _normalize(value)
    for category in PRODUCT_CATEGORIES:
        if normalized == _normalize(category):
            return category
    return "Libre de proponer por IA"


def _clean_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text_value = str(value).strip()
    return text_value or fallback


def _teacher_design_from_hitl(hitl: dict[str, Any] | None) -> dict[str, Any] | None:
    """Normaliza el bloque HITL (inputs + respuestas del cuestionario) para el prompt de productos."""
    if not isinstance(hitl, dict):
        return None
    inputs = hitl.get("inputs") if isinstance(hitl.get("inputs"), dict) else {}
    respuestas = [
        {
            "pregunta": _clean_text(item.get("pregunta")),
            "eleccion": _clean_text(item.get("eleccion")),
        }
        for item in (hitl.get("respuestas") or [])
        if isinstance(item, dict) and _clean_text(item.get("eleccion"))
    ]
    design = {
        "tipo_producto": _clean_text(inputs.get("tipo_producto")),
        "vinculo_problema": _clean_text(inputs.get("vinculo_problema")),
        "alcance": _clean_text(inputs.get("alcance")),
        "formato_evidencia": _clean_text(inputs.get("formato_evidencia")),
        "respuestas": respuestas,
    }
    if not any(design[key] for key in ("tipo_producto", "vinculo_problema", "alcance", "formato_evidencia")) and not respuestas:
        return None
    return design


def _normalize(value: Any) -> str:
    text_value = unicodedata.normalize("NFKD", str(value or ""))
    text_value = "".join(char for char in text_value if not unicodedata.combining(char))
    text_value = text_value.lower()
    text_value = re.sub(r"[^a-z0-9]+", " ", text_value)
    return re.sub(r"\s+", " ", text_value).strip()


ROBOTIC_ACTIVITY_LABEL_RE = re.compile(
    r"\b("
    r"fase(?:\s+del\s+m[eé]todo)?|"
    r"momento|"
    r"prop[oó]sito|"
    r"t[eé]cnica(?:s)?|"
    r"evidencia|"
    r"actividad"
    r")\s*:",
    re.IGNORECASE,
)

REPETITIVE_ACTIVITY_SYNTAX_RE = re.compile(
    r"^\s*A partir de la fase de\b.+?\b(el estudiante|los estudiantes)\b.+?\bLo (desarrolla|trabaja) mediante\b",
    re.IGNORECASE | re.DOTALL,
)

VALIDATION_STOPWORDS = {
    "para", "como", "sobre", "entre", "desde", "hasta", "ante", "bajo",
    "con", "sin", "por", "del", "las", "los", "una", "uno", "unas", "unos",
    "que", "sus", "mas", "esta", "este", "estos", "estas", "curso",
}

LOCAL_CONTEXT_TOKENS = {
    "lambayeque", "chiclayo", "unprg", "ferreñafe", "pimentel",
    "jose leonardo ortiz", "la victoria", "Monsefú", "chongoyape",
    "puerto eten", "saña", "zaña", "cayalti", "tuman",
    "huaca rajada", "morrope",
}

PRODUCT_OPTIONS_ALIASES = (
    "options",
    "opciones",
    "productos",
    "products",
    "product_options",
    "opciones_producto",
    "opciones de producto",
    "productos_acreditables",
    "productos acreditables",
    "producto_acreditable",
    "producto acreditable",
    "propuestas",
    "alternativas",
    "suggestions",
    "cards",
    "tarjetas",
)

PRODUCT_TITLE_ALIASES = (
    "title",
    "titulo",
    "nombre",
    "name",
    "producto",
    "producto_acreditable",
    "producto acreditable",
    "entregable",
    "entregable_final",
    "deliverable",
)

PRODUCT_JUSTIFICATION_ALIASES = (
    "justification",
    "justificacion",
    "fundamento",
    "fundamentacion",
    "razon",
    "rationale",
    "pertinencia",
    "por_que",
    "por que",
    "descripcion",
    "description",
)

PRODUCT_WORK_OBJECT_ALIASES = (
    "work_object",
    "work object",
    "objeto_trabajo",
    "objeto de trabajo",
    "objeto_de_trabajo",
    "central_object_text",
    "objeto",
    "caso",
    "problema",
    "proyecto",
    "desafio",
    "desafío",
    "pregunta_investigacion",
    "pregunta de investigacion",
)

PRODUCT_WORK_OBJECT_TYPE_ALIASES = (
    "work_object_type",
    "work object type",
    "central_object_type",
    "tipo_objeto",
    "tipo de objeto",
    "tipo",
)

PRODUCT_TIMELINE_ALIASES = (
    "timeline_json",
    "timeline",
    "linea_tiempo",
    "linea de tiempo",
    "línea de tiempo",
    "cronograma",
    "cronograma_pa",
    "avances",
    "avances_pa",
    "hitos",
    "progresion",
    "progresión",
)

PRODUCT_TEXT_VALUE_ALIASES = (
    "text",
    "texto",
    "value",
    "valor",
    "description",
    "descripcion",
    "descripción",
    "detalle",
    "summary",
    "resumen",
    "title",
    "titulo",
    "nombre",
    "name",
)

TIMELINE_CODE_ALIASES = (
    "code",
    "codigo",
    "sigla",
    "pa",
    "label",
    "etiqueta",
)

TIMELINE_VALUE_ALIASES = (
    "description",
    "descripcion",
    "descripción",
    "text",
    "texto",
    "value",
    "valor",
    "avance",
    "hito",
    "detalle",
)


def _has_robotic_activity_labels(value: Any) -> bool:
    return bool(ROBOTIC_ACTIVITY_LABEL_RE.search(str(value or "")))


def _has_repetitive_activity_syntax(value: Any) -> bool:
    return bool(REPETITIVE_ACTIVITY_SYNTAX_RE.search(str(value or "")))


def _work_object_type_for_profile(profile: dict[str, Any]) -> str:
    text = _normalize(
        f"{profile.get('code', '')} {profile.get('name', '')} {profile.get('work_object', '')}"
    )
    if "caso" in text:
        return "caso"
    if "desafio" in text or "reto" in text:
        return "desafio"
    if "proyecto" in text:
        return "proyecto"
    if "investig" in text or "pregunta" in text:
        return "pregunta de investigacion"
    if "problema" in text:
        return "problema"
    if "cer" in text or "afirmacion" in text:
        return "pregunta o afirmacion explicativa"
    if "experiencia" in text:
        return "experiencia concreta"
    if "fenomeno" in text or "contexto" in text:
        return "fenomeno o contexto significativo"
    return _clean_text(profile.get("work_object"), "objeto de trabajo")


def _work_object_score(activity: str, evidence: str, work_object: str) -> tuple[int, str]:
    work_object = _clean_text(work_object)
    if not work_object:
        return 0, ""
    combined_key = _normalize(f"{activity} {evidence}")
    object_key = _normalize(work_object)
    if not combined_key or not object_key:
        return 0, "Objeto de trabajo ausente"
    if object_key and object_key in combined_key:
        return 2, "Objeto de trabajo trazado"

    generic_terms = {
        "caso", "casos", "problema", "problemas", "proyecto", "proyectos",
        "desafio", "desafios", "reto", "retos", "pregunta", "preguntas",
        "fenomeno", "fenomenos", "experiencia", "experiencias",
        "argumento", "argumentos", "afirmacion", "afirmaciones",
    }
    object_tokens = [
        token for token in object_key.split()
        if len(token) >= 5 and token not in generic_terms and token not in VALIDATION_STOPWORDS
    ]
    matched = [token for token in object_tokens if token in combined_key]
    local_tokens = {
        _normalize(token)
        for token in LOCAL_CONTEXT_TOKENS
        if _normalize(token) and _normalize(token) in object_key
    }
    has_local_trace = not local_tokens or any(token in combined_key for token in local_tokens)
    if object_tokens and len(matched) >= max(2, min(4, len(object_tokens) // 3)):
        if has_local_trace:
            return 2, "Objeto de trabajo trazado"
        return 1, "Objeto mencionado sin trazabilidad contextual local"
    if any(term in combined_key for term in generic_terms):
        return 1, "Objeto mencionado de forma generica"
    return 0, "Objeto de trabajo ausente"


def _as_text_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text_value = _clean_text(value)
        if not text_value:
            return []
        parts = re.split(r"[\n;]+", text_value)
        return [part.strip(" -\t") for part in parts if part.strip(" -\t")]
    if isinstance(value, dict):
        if isinstance(value.get("items"), list):
            return _as_text_list(value.get("items"))
        text_value = _clean_text(
            value.get("name")
            or value.get("nombre")
            or value.get("title")
            or value.get("titulo")
            or value.get("label")
            or value.get("descripcion")
            or value.get("description")
            or value.get("statement")
            or value.get("text")
        )
        return [text_value] if text_value else []
    if isinstance(value, list):
        result: list[str] = []
        for item in value:
            result.extend(_as_text_list(item))
        return result
    text_value = _clean_text(value)
    return [text_value] if text_value else []


def _merge_unique(*groups: Any, limit: int | None = None) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for item in _as_text_list(group):
            key = _normalize(item)
            if not key or key in seen:
                continue
            seen.add(key)
            merged.append(item)
            if limit and len(merged) >= limit:
                return merged
    return merged


def _clean_unit_title(value: Any, unit_number: int) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    text = re.sub(r"^\s*(?:unidad|u)\s*(?:[ivxlcdm]+|\d+)\s*[:.\-–—]?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip(" .:-")
    if not text or _normalize(text) in {f"unidad {unit_number}", f"u {unit_number}", str(unit_number)}:
        return ""
    return text[:120].strip()


def _unit_title_from_weeks(
    *,
    generation: dict[str, Any],
    unit_weeks: list[dict[str, Any]],
    unit_number: int,
    performance_text: str = "",
) -> str:
    direct = _clean_unit_title(
        generation.get("unit_title")
        or generation.get("title")
        or generation.get("titulo"),
        unit_number,
    )
    if direct:
        return direct
    knowledge = _merge_unique(
        [
            week.get("knowledge")
            or week.get("conocimientos")
            or week.get("tema")
            for week in unit_weeks
        ],
        limit=3,
    )
    for item in knowledge:
        title = _clean_unit_title(item, unit_number)
        if title and _normalize(title) not in {"contenido de la semana", "tema"}:
            return title
    words = _clean_text(performance_text).split()
    if len(words) > 4:
        return " ".join(words[:9]).strip(" .")
    return ""


def _provider_sequence(force_provider: str | None) -> list[str | None]:
    forced = (force_provider or "").strip().lower()
    if forced == "gemini":
        return ["gemini", "openrouter"]
    if forced == "openrouter":
        return ["openrouter", "gemini"]
    return [None, "openrouter"]


def _expected_unit_weeks(unit_number: int, total_units: int) -> list[int]:
    ranges = _unit_week_ranges(total_units)
    start, end = ranges.get(unit_number, (1, 16))
    return list(range(start, end + 1))


def _coerce_json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _coerce_weeks(output_json: Any) -> list[dict[str, Any]]:
    if isinstance(output_json, str):
        try:
            output_json = json.loads(output_json)
        except Exception:
            return []
    if isinstance(output_json, dict):
        output_json = output_json.get("weeks") or output_json.get("semanas") or []
    if not isinstance(output_json, list):
        return []
    return [dict(item) for item in output_json if isinstance(item, dict)]


def _unit_week_ranges(total_units: int, total_weeks: int = 16) -> dict[int, tuple[int, int]]:
    total_units = max(1, int(total_units or 1))
    base = total_weeks // total_units
    remainder = total_weeks % total_units
    ranges: dict[int, tuple[int, int]] = {}
    cursor = 1
    for unit_number in range(1, total_units + 1):
        size = base + (1 if unit_number <= remainder else 0)
        start = cursor
        end = min(total_weeks, cursor + size - 1)
        ranges[unit_number] = (start, end)
        cursor = end + 1
    ranges[total_units] = (ranges[total_units][0], total_weeks)
    return ranges


def _slice_for_unit(items: list[str], unit_number: int, total_units: int) -> list[str]:
    if not items:
        return []
    total_units = max(1, total_units)
    base = len(items) // total_units
    remainder = len(items) % total_units
    cursor = 0
    for current in range(1, total_units + 1):
        size = base + (1 if current <= remainder else 0)
        segment = items[cursor: cursor + size]
        cursor += size
        if current == unit_number:
            return segment or items
    return items


def _dedupe_against_traceability(items: list[str], traceability_context: dict[str, Any]) -> list[str]:
    covered = {
        _normalize(item)
        for item in _as_text_list(traceability_context.get("covered_knowledge"))
    }
    if not covered:
        return items

    clean_items: list[str] = []
    for item in items:
        key = _normalize(item)
        if not key:
            continue
        if any(key == covered_key or key in covered_key or covered_key in key for covered_key in covered):
            continue
        clean_items.append(item)
    return clean_items or items


def _phase_for_position(profile: dict[str, Any], index: int, total: int, is_final_unit: bool) -> str:
    phases = _as_text_list(profile.get("phases"))
    if not phases:
        phases = _as_text_list(get_method_profile("DEFAULT").get("phases"))
    if not phases:
        return "Aplicacion guiada"

    total = max(1, total)
    if total == 1:
        return phases[-1] if is_final_unit else phases[min(2, len(phases) - 1)]

    if index == 0:
        return phases[0]
    if index == total - 1:
        if is_final_unit:
            return phases[-2] if len(phases) >= 2 else phases[-1]
        return phases[-3] if len(phases) >= 3 else phases[-1]
    if index == total - 2:
        return phases[-3] if len(phases) >= 3 else phases[-1]

    progress = index / max(1, total - 1)
    if progress < 0.25:
        phase_index = 1
    elif progress < 0.45:
        phase_index = 2
    elif progress < 0.78:
        phase_index = 3
    else:
        phase_index = max(3, len(phases) - 3)
    return phases[min(phase_index, len(phases) - 1)]


def _technique_for(profile: dict[str, Any], phase: str, index: int) -> str:
    techniques = _as_text_list(profile.get("techniques"))
    if not techniques:
        techniques = ["trabajo colaborativo", "retroalimentacion docente"]
    normalized_phase = _normalize(phase)
    if "problemat" in normalized_phase or "explor" in normalized_phase:
        preferred = ["caso breve", "ficha de analisis del contexto", "preguntas orientadoras"]
    elif "model" in normalized_phase:
        preferred = ["modelado docente", "microtaller de diseno"]
    elif "produccion" in normalized_phase or "desarrollo" in normalized_phase:
        preferred = ["microtaller de diseno", "produccion guiada", "revision de pares"]
    elif "revision" in normalized_phase or "ajuste" in normalized_phase:
        preferred = ["revision de pares", "lista de cotejo tecnica", "retroalimentacion docente"]
    elif "social" in normalized_phase or "presentacion" in normalized_phase:
        preferred = ["socializacion de productos", "exposicion breve", "rubrica de sustentacion"]
    else:
        preferred = techniques

    chosen = [item for item in preferred if _normalize(item) in {_normalize(t) for t in techniques}]
    if not chosen:
        chosen = preferred[:2]
    if len(chosen) == 1 and techniques:
        second = techniques[index % len(techniques)]
        if _normalize(second) != _normalize(chosen[0]):
            chosen.append(second)
    return " + ".join(chosen[:2])


def _operation_for_phase(profile: dict[str, Any], phase: str, index: int) -> str:
    moves = _as_text_list(profile.get("activity_moves"))
    if not moves:
        moves = _as_text_list(get_method_profile("DEFAULT").get("activity_moves"))
    normalized_phase = _normalize(phase)
    if "problemat" in normalized_phase or "explor" in normalized_phase:
        return moves[0] if moves else "analizar una situacion inicial"
    if "referente" in normalized_phase or "analisis" in normalized_phase or "investig" in normalized_phase:
        return moves[min(1, len(moves) - 1)] if moves else "organizar criterios de trabajo"
    if "model" in normalized_phase:
        return moves[min(2, len(moves) - 1)] if moves else "observar un modelado docente"
    if "produccion" in normalized_phase or "desarrollo" in normalized_phase:
        return moves[min(3, len(moves) - 1)] if moves else "elaborar un avance verificable"
    if "revision" in normalized_phase or "ajuste" in normalized_phase or "mejora" in normalized_phase:
        return moves[min(4, len(moves) - 1)] if moves else "ajustar el avance con criterios"
    return moves[min(index, len(moves) - 1)] if moves else "sustentar el producto elaborado"


def _evidence_for(
    *,
    profile: dict[str, Any],
    week: int,
    unit_number: int,
    week_index: int,
    week_count: int,
    grading_rows: list[dict[str, Any]],
    product_option: dict[str, Any] | None,
    knowledge: str,
    is_final_unit: bool,
) -> str:
    for row in grading_rows:
        raw_week = row.get("week") or row.get("semana") or row.get("week_number")
        try:
            row_week = int(raw_week)
        except Exception:
            row_week = None
        if row_week == week:
            code = _clean_text(row.get("code") or row.get("sigla") or row.get("label"))
            name = _clean_text(row.get("name") or row.get("nombre") or row.get("evidence") or row.get("evidencia"))
            if code and name:
                return f"{code}: {name}"
            if name:
                return name

    timeline = _coerce_json_object((product_option or {}).get("timeline_json"))
    work_object = _clean_text((product_option or {}).get("work_object"))
    if timeline:
        for key, value in timeline.items():
            text_value = _clean_text(value)
            if str(week) in text_value or f"Sem {week}" in text_value or f"Semana {week}" in text_value:
                return f"{key}: {text_value}"

    ladder = _as_text_list(profile.get("evidence_ladder"))
    if not ladder:
        ladder = ["Ficha de trabajo", "Matriz de criterios", "Avance revisado", "Producto sustentado"]
    if week_index == week_count - 1:
        if is_final_unit:
            return f"{ladder[-1]} sobre {work_object}" if work_object else ladder[-1]
        return (
            f"Avance acreditable de unidad sobre {work_object} con retroalimentacion"
            if work_object
            else "Avance acreditable de unidad con retroalimentacion"
        )
    ladder_index = min(len(ladder) - 1, int((week_index / max(1, week_count - 1)) * (len(ladder) - 1)))
    base = ladder[ladder_index]
    if knowledge and _normalize(knowledge) not in _normalize(base):
        return f"{base} sobre {knowledge}"
    return base


def _validation_summary(weeks: list[dict[str, Any]]) -> dict[str, Any]:
    scores = [
        int(((week.get("validation") or {}).get("total_score")) or 0)
        for week in weeks
        if isinstance(week.get("validation"), dict)
    ]
    overall = round(sum(scores) / len(scores), 2) if scores else 0
    if overall >= 8:
        status = "acceptable"
    elif overall >= 6:
        status = "needs_review"
    else:
        status = "weak"
    return {
        "overall_score": overall,
        "status": status,
        "weeks_count": len(weeks),
    }


class ProgressiveCurriculumEngine:
    """Constructor didactico para el flujo progresivo por unidad."""

    async def suggest_products(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]] | None,
        category: str = "Libre de proponer por IA",
        notebook_context_text: str = "",
        total_units: int = 1,
        ai_service: Any | None = None,
        force_provider: str | None = None,
        hitl: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        category = _canonical_product_category(category)
        prompt = self._product_prompt(
            curso=curso,
            method=method,
            grading_rows=grading_rows or [],
            category=category,
            notebook_context_text=notebook_context_text,
            total_units=total_units,
            hitl=hitl,
        )
        if ai_service:
            try:
                payload = await ai_service.generate_json(
                    "progressive_product_suggest",
                    prompt,
                    force_provider=force_provider,
                )
                options = self._extract_product_option_items(payload)
                normalized = self._normalize_product_options(options, category, grading_rows or [], total_units)
                if normalized:
                    return normalized[:3]
                logger.warning(
                    "Respuesta IA de productos sin opciones normalizables | shape=%s",
                    self._payload_shape(payload),
                )
            except Exception as exc:
                logger.warning(
                    "No se pudo normalizar la sugerencia progresiva de producto | error=%s",
                    exc,
                    exc_info=True,
                )
        raise ProgressiveContentGenerationError(
            "No se pudo generar un Producto Acreditable con Objeto de Trabajo contextualizado mediante IA."
        )

    async def suggest_product_questions(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]] | None,
        notebook_context_text: str = "",
        inputs: dict[str, Any] | None = None,
        total_units: int = 1,
        ai_service: Any | None = None,
        force_provider: str | None = None,
    ) -> list[dict[str, Any]]:
        """Motor HITL de productos: 3-4 preguntas a medida para que el docente diseñe el PA."""
        prompt = self._product_questions_prompt(
            curso=curso,
            method=method,
            grading_rows=grading_rows or [],
            notebook_context_text=notebook_context_text,
            inputs=inputs or {},
            total_units=total_units,
        )
        if ai_service:
            try:
                payload = await ai_service.generate_json(
                    "progressive_product_questions",
                    prompt,
                    force_provider=force_provider,
                )
                questions = self._normalize_product_questions(payload)
                if questions:
                    return questions
                logger.warning(
                    "Respuesta IA de preguntas de producto sin items normalizables | shape=%s",
                    self._payload_shape(payload),
                )
            except Exception as exc:
                logger.warning(
                    "No se pudieron normalizar las preguntas HITL de producto | error=%s",
                    exc,
                    exc_info=True,
                )
        raise ProgressiveContentGenerationError(
            "No se pudieron generar preguntas de diseno del Producto Acreditable mediante IA."
        )

    def _normalize_product_questions(self, payload: Any) -> list[dict[str, Any]]:
        raw = payload.get("preguntas") if isinstance(payload, dict) else payload
        if not isinstance(raw, list):
            return []
        questions: list[dict[str, Any]] = []
        for index, item in enumerate(raw[:4]):
            if not isinstance(item, dict):
                continue
            pregunta = _clean_text(item.get("pregunta") or item.get("question"))
            opciones = [
                _clean_text(option)
                for option in (item.get("opciones") or item.get("options") or [])
                if _clean_text(option)
            ]
            if not pregunta or len(opciones) < 2:
                continue
            questions.append(
                {
                    "id": _clean_text(item.get("id")) or f"q{index + 1}",
                    "pregunta": pregunta,
                    "opciones": opciones[:4],
                    "permite_idea_propia": True,
                }
            )
        return questions

    def _product_questions_prompt(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]],
        notebook_context_text: str,
        inputs: dict[str, Any],
        total_units: int,
    ) -> str:
        profile = self._profile_for_method(method)
        work_object_type = _work_object_type_for_profile(profile)
        timeline_specs = self._timeline_specs(grading_rows, total_units)
        pa_schedule = [{"code": code, "week": week} for code, week in timeline_specs]
        teacher_inputs = {
            "tipo_producto": _clean_text(inputs.get("tipo_producto")) or "no definido aun",
            "vinculo_problema": _clean_text(inputs.get("vinculo_problema")) or "no definido aun",
            "alcance": _clean_text(inputs.get("alcance")) or "no definido aun",
            "formato_evidencia": _clean_text(inputs.get("formato_evidencia")) or "no definido aun",
        }
        return json.dumps(
            {
                "role": "Especialista en diseno curricular universitario en Peru",
                "task": (
                    "El docente va a DISENAR su Producto Acreditable. NO decidas por el: genera 3 a 4 preguntas "
                    "concretas que lo ayuden a cerrar las decisiones que faltan para que la IA luego proponga "
                    "3 opciones de producto a su medida."
                ),
                "rules": [
                    "Genera entre 3 y 4 preguntas. Cada una aborda una decision DISTINTA del diseno del producto (por ejemplo: objeto de trabajo territorial concreto, enfoque disciplinar, hito de avance en las semanas PA, publico o beneficiario, nivel de profundidad de la evidencia).",
                    "NO repitas decisiones que el docente ya tomo en teacher_inputs; usa esas respuestas para afinar las preguntas, no para volver a preguntarlas.",
                    "Cada pregunta trae 3 a 4 opciones CONCRETAS y contextualizadas al curso, al metodo y al calendario PA. Nada generico ni de relleno.",
                    TERRITORIAL_CONTEXT_BLOCK,
                    "Si notebook_research_context trae fuentes o hallazgos, ancla al menos una pregunta u opcion en ese material.",
                    "Cada pregunta permite idea propia del docente (permite_idea_propia siempre true).",
                    "Nivel: docencia universitaria. Tono academico, claro y directo para docentes de 30-49 anos.",
                ],
                "course": curso or {},
                "method_profile": profile,
                "expected_work_object_type": work_object_type,
                "pa_schedule": pa_schedule,
                "grading_rows": grading_rows,
                "teacher_inputs": teacher_inputs,
                "notebook_research_context": _clean_text(notebook_context_text)[:6000],
                "response_schema": {
                    "preguntas": [
                        {
                            "id": "q1",
                            "pregunta": "...",
                            "opciones": ["...", "...", "..."],
                            "permite_idea_propia": True,
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )

    async def extract_unit_context(
        self,
        *,
        raw_context_text: str,
        ai_service: Any | None = None,
        force_provider: str | None = None,
    ) -> dict[str, Any]:
        raw_context_text = _clean_text(raw_context_text)
        if not raw_context_text:
            return {
                "key_concepts": [],
                "cases_or_examples": [],
                "suggested_activities": [],
                "possible_evidence": [],
                "common_errors": [],
            }
        if ai_service:
            prompt = self._context_prompt(raw_context_text)
            try:
                payload = await ai_service.generate_json(
                    "progressive_unit_context_extract",
                    prompt,
                    force_provider=force_provider,
                )
                if isinstance(payload, dict):
                    return {
                        "key_concepts": _merge_unique(payload.get("key_concepts"), limit=12),
                        "cases_or_examples": _merge_unique(payload.get("cases_or_examples"), limit=8),
                        "suggested_activities": _merge_unique(payload.get("suggested_activities"), limit=8),
                        "possible_evidence": _merge_unique(payload.get("possible_evidence"), limit=8),
                        "common_errors": _merge_unique(payload.get("common_errors"), limit=6),
                    }
            except Exception:
                pass
        return self._fallback_context_extract(raw_context_text)

    def raw_unit_context_payload(self, raw_context_text: str) -> dict[str, Any]:
        raw_context_text = _clean_text(raw_context_text)
        return {
            "notebook_raw_context": raw_context_text,
            "key_concepts": [],
            "cases_or_examples": [],
            "suggested_activities": [],
            "possible_evidence": [],
            "common_errors": [],
        }

    def build_traceability_context(
        self,
        approved_generations: list[dict[str, Any]],
        product_option: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        work_object = _clean_text((product_option or {}).get("work_object"))
        timeline = _coerce_json_object((product_option or {}).get("timeline_json"))
        weeks: list[dict[str, Any]] = []
        for generation in sorted(approved_generations, key=lambda item: int(item.get("unit_number") or 0)):
            weeks.extend(_coerce_weeks(generation.get("output_json")))
        if not weeks:
            return {
                "completed_weeks": "",
                "covered_knowledge": [],
                "last_delivered_evidence": "",
                "central_work_object": work_object,
                "next_pa_target": next(iter(timeline.values()), "") if timeline else "",
                "approved_unit_memory": [],
            }

        week_numbers = sorted(
            int(week.get("week"))
            for week in weeks
            if str(week.get("week", "")).isdigit()
        )
        covered = _merge_unique([week.get("knowledge") or week.get("conocimientos") for week in weeks], limit=32)
        last_week = max(weeks, key=lambda week: int(week.get("week") or 0))
        first_week = week_numbers[0] if week_numbers else ""
        final_week = week_numbers[-1] if week_numbers else ""
        approved_unit_memory = []
        for week in weeks:
            try:
                week_int = int(week.get("week") or 0)
            except Exception:
                continue
            if not week_int:
                continue
            validation = week.get("validation") or {}
            approved_unit_memory.append(
                {
                    "week": week_int,
                    "unit_number": int(week.get("unit_number") or 0) or None,
                    "knowledge": _clean_text(week.get("knowledge") or week.get("conocimientos")),
                    "skill": _clean_text(week.get("skill") or week.get("habilidad")),
                    "activity": _clean_text(week.get("activity") or week.get("actividad")),
                    "evidence": _clean_text(week.get("evidence") or week.get("evidencia") or week.get("producto")),
                    "phase": _clean_text(week.get("phase") or week.get("fase")),
                    "technique": _clean_text(week.get("technique") or week.get("tecnica")),
                    "product_stage": _clean_text(week.get("evidence") or week.get("producto")),
                    "validation_score": validation.get("total_score") if isinstance(validation, dict) else None,
                }
            )
        return {
            "completed_weeks": f"{first_week}-{final_week}" if first_week and final_week else "",
            "covered_knowledge": covered,
            "last_delivered_evidence": _clean_text(
                last_week.get("evidence")
                or last_week.get("evidencia")
                or last_week.get("producto")
            ),
            "central_work_object": work_object,
            "last_work_object_reference": work_object if work_object else "",
            "last_product_stage": _clean_text(last_week.get("evidence") or last_week.get("evidencia") or last_week.get("producto")),
            "next_pa_target": next(iter(timeline.values()), "") if timeline else "",
            "approved_unit_memory": approved_unit_memory,
        }

    async def generate_unit(
        self,
        *,
        unit_number: int,
        total_units: int,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        performance: dict[str, Any] | str | None,
        content_block: dict[str, Any] | None,
        grading_rows: list[dict[str, Any]] | None,
        product_option: dict[str, Any] | None,
        extracted_context: dict[str, Any] | None,
        traceability_context: dict[str, Any] | None,
        locked_weeks: list[int] | None = None,
        locked_rows: list[dict[str, Any]] | None = None,
        teacher_instruction: str = "",
        ai_service: Any | None = None,
        force_provider: str | None = None,
        mandatory_knowledge_map: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        locked_weeks = [int(week) for week in (locked_weeks or []) if str(week).isdigit()]
        traceability_context = traceability_context or {}
        extracted_context = extracted_context or {}
        profile = self._profile_for_method(method)
        prompt = self._unit_prompt(
            unit_number=unit_number,
            total_units=total_units,
            curso=curso,
            profile=profile,
            performance=performance,
            content_block=content_block,
            grading_rows=grading_rows or [],
            product_option=product_option,
            extracted_context=extracted_context,
            traceability_context=traceability_context,
            locked_weeks=locked_weeks,
            locked_rows=locked_rows or [],
            teacher_instruction=teacher_instruction,
            mandatory_knowledge_map=mandatory_knowledge_map or [],
        )
        if not ai_service:
            raise ProgressiveContentGenerationError("Servicio de IA no disponible para generar la unidad")

        generated_weeks: list[dict[str, Any]] = []
        provider_errors: list[str] = []
        for provider in _provider_sequence(force_provider):
            try:
                payload = await ai_service.generate_json(
                    "progressive_unit_generate",
                    prompt,
                    force_provider=provider,
                )
                candidate_weeks = _coerce_weeks(payload)
                if self._generated_weeks_are_usable(
                    generated_weeks=candidate_weeks,
                    unit_number=unit_number,
                    total_units=total_units,
                    locked_weeks=locked_weeks,
                    locked_rows=locked_rows or [],
                ):
                    generated_weeks = candidate_weeks
                    break
                provider_errors.append(f"{provider or 'default'}: JSON incompleto o sin actividades didacticas suficientes")
            except Exception as exc:
                provider_errors.append(f"{provider or 'default'}: {exc}")

        if not generated_weeks:
            raise ProgressiveContentGenerationError(
                "No se pudo generar una unidad usable con IA. " + " | ".join(provider_errors[-3:])
            )

        weeks = self._normalize_unit_weeks(
            generated_weeks=generated_weeks,
            unit_number=unit_number,
            total_units=total_units,
            profile=profile,
            performance=performance,
            grading_rows=grading_rows or [],
            product_option=product_option,
            locked_weeks=locked_weeks,
            locked_rows=locked_rows or [],
            mandatory_knowledge_map=mandatory_knowledge_map or [],
        )
        if self._needs_activity_repair(weeks, locked_weeks):
            repaired = False
            for provider in _provider_sequence(force_provider):
                try:
                    repair_payload = await ai_service.generate_json(
                        "progressive_unit_repair",
                        self._repair_prompt(
                            unit_number=unit_number,
                            total_units=total_units,
                            weeks=weeks,
                            profile=profile,
                            performance=performance,
                            extracted_context=extracted_context,
                            traceability_context=traceability_context,
                            locked_weeks=locked_weeks,
                        ),
                        force_provider=provider,
                    )
                    repaired_weeks = _coerce_weeks(repair_payload)
                except Exception:
                    repaired_weeks = []
                if repaired_weeks and self._generated_weeks_are_usable(
                    generated_weeks=repaired_weeks,
                    unit_number=unit_number,
                    total_units=total_units,
                    locked_weeks=locked_weeks,
                    locked_rows=locked_rows or [],
                ):
                    candidate = self._normalize_unit_weeks(
                        generated_weeks=repaired_weeks,
                        unit_number=unit_number,
                        total_units=total_units,
                        profile=profile,
                        performance=performance,
                        grading_rows=grading_rows or [],
                        product_option=product_option,
                        locked_weeks=locked_weeks,
                        locked_rows=locked_rows or [],
                        mandatory_knowledge_map=mandatory_knowledge_map or [],
                    )
                    if not self._needs_activity_repair(candidate, locked_weeks):
                        weeks = candidate
                        repaired = True
                        break
            if not repaired:
                raise ProgressiveContentGenerationError(
                    "La IA devolvio actividades repetitivas o roboticas; no se guardo contenido de relleno."
                )
        return {
            "unit_number": unit_number,
            "status": "draft",
            "traceability_context": traceability_context,
            "weeks": weeks,
            "validation_summary": _validation_summary(weeks),
        }

    def validate_week(
        self,
        *,
        row: dict[str, Any],
        phase: str,
        skill: str = "",
        work_object: str = "",
        work_object_required: bool = False,
    ) -> dict[str, Any]:
        activity = _clean_text(row.get("activity") or row.get("actividad"))
        knowledge = _clean_text(row.get("knowledge") or row.get("conocimientos"))
        evidence = _clean_text(row.get("evidence") or row.get("evidencia") or row.get("producto"))
        phase_key = _normalize(phase)
        activity_key = _normalize(activity)
        knowledge_key = _normalize(knowledge)
        skill_key = _normalize(skill)
        evidence_key = _normalize(evidence)
        robotic_labels = _has_robotic_activity_labels(activity)

        methodological_score = 2 if phase_key and phase_key in activity_key else 1 if phase_key else 0
        cognitive_score = 2 if knowledge_key and knowledge_key in activity_key else 1 if knowledge_key else 0
        skill_terms = [
            part for part in skill_key.split()
            if len(part) >= 4 and part not in VALIDATION_STOPWORDS
        ]
        matched_skill_terms = [
            part for part in skill_terms[:6]
            if part in activity_key or (len(part) >= 5 and part[:5] in activity_key)
        ]
        formative_score = (
            2
            if skill_terms and len(matched_skill_terms) >= min(2, len(skill_terms))
            else 1 if skill_key else 1
        )
        technique_terms = (
            "mediante",
            "taller",
            "debate",
            "revision",
            "modelado",
            "microtaller",
            "estudio de caso",
            "simulacion",
            "laboratorio",
            "ficha",
            "matriz",
            "discusion",
            "preguntas esenciales",
            "arbol del problema",
            "mapa de actores",
            "entrevista",
            "design thinking",
            "prototipado",
            "pitch",
            "lluvia de ideas",
            "plan de proyecto",
            "storyboard",
            "revision entre pares",
            "seminario",
            "tutoria academica",
        )
        technique_score = 2 if any(term in activity_key for term in technique_terms) else 0
        evidence_score = 2 if evidence_key else 0
        work_object_score, object_diagnosis = _work_object_score(activity, evidence, work_object)
        raw_total = methodological_score + cognitive_score + formative_score + technique_score + evidence_score
        if work_object and work_object_required:
            total = round(((raw_total + work_object_score) / 12) * 10)
        else:
            total = raw_total
        if work_object and work_object_required and work_object_score == 1:
            total = min(total, 7)
        if work_object and work_object_required and work_object_score == 0:
            total = min(total, 5)
        if technique_score == 0:
            total = min(total, 7)
        if robotic_labels:
            total = min(total, 6)

        if robotic_labels:
            diagnosis = "Usa etiquetas rigidas; debe redactarse en prosa docente"
        elif technique_score == 0:
            diagnosis = "Tecnica didactica ausente"
        elif work_object and work_object_required and work_object_score == 0:
            diagnosis = "Objeto de trabajo ausente"
        elif work_object and work_object_required and work_object_score == 1:
            diagnosis = object_diagnosis or "Objeto mencionado de forma generica"
        elif total >= 8:
            diagnosis = "Triple coherencia alta con trazabilidad del producto" if work_object_required else "Coherencia alta"
        elif total >= 6:
            diagnosis = "Revisar precision didactica"
        else:
            diagnosis = "Actividad poco alineada"
        return {
            "methodological_score": methodological_score,
            "cognitive_score": cognitive_score,
            "formative_score": formative_score,
            "technique_score": technique_score,
            "evidence_score": evidence_score,
            "work_object_score": work_object_score if work_object and work_object_required else None,
            "total_score": total,
            "diagnosis": diagnosis,
        }

    def _needs_activity_repair(self, weeks: list[dict[str, Any]], locked_weeks: list[int]) -> bool:
        locked = {int(week) for week in locked_weeks if str(week).isdigit()}
        has_labels = any(
            int(row.get("week") or 0) not in locked
            and _has_robotic_activity_labels(row.get("activity"))
            for row in weeks
        )
        repetitive_count = sum(
            1
            for row in weeks
            if int(row.get("week") or 0) not in locked
            and _has_repetitive_activity_syntax(row.get("activity"))
        )
        incomplete_validation = any(
            int(row.get("week") or 0) not in locked
            and isinstance(row.get("validation"), dict)
            and (
                int((row.get("validation") or {}).get("technique_score") or 0) == 0
                or int((row.get("validation") or {}).get("methodological_score") or 0) == 0
                or (
                    (row.get("validation") or {}).get("work_object_score") is not None
                    and int((row.get("validation") or {}).get("work_object_score") or 0) < 2
                )
            )
            for row in weeks
        )
        return has_labels or repetitive_count >= 3 or incomplete_validation

    def _generated_weeks_are_usable(
        self,
        *,
        generated_weeks: list[dict[str, Any]],
        unit_number: int,
        total_units: int,
        locked_weeks: list[int],
        locked_rows: list[dict[str, Any]],
    ) -> bool:
        expected = set(_expected_unit_weeks(unit_number, total_units))
        locked = {int(week) for week in locked_weeks if str(week).isdigit()}
        locked_available = {
            int(row.get("week") or row.get("semana") or 0)
            for row in locked_rows
            if str(row.get("week") or row.get("semana") or "").isdigit()
        }
        rows_by_week = {
            int(row.get("week") or row.get("semana") or 0): row
            for row in generated_weeks
            if isinstance(row, dict) and str(row.get("week") or row.get("semana") or "").isdigit()
        }
        if not expected:
            return False
        for week in expected:
            if week in locked and week in locked_available:
                continue
            row = rows_by_week.get(week)
            if not row:
                return False
            if not _clean_text(row.get("knowledge") or row.get("conocimientos")):
                return False
            if not _clean_text(row.get("activity") or row.get("actividad")):
                return False
            if not _clean_text(row.get("evidence") or row.get("evidencia") or row.get("producto")):
                return False
        return True

    def _repair_prompt(
        self,
        *,
        unit_number: int,
        total_units: int,
        weeks: list[dict[str, Any]],
        profile: dict[str, Any],
        performance: dict[str, Any] | str | None,
        extracted_context: dict[str, Any],
        traceability_context: dict[str, Any],
        locked_weeks: list[int],
    ) -> str:
        return json.dumps(
            {
                "role": "Editor academico universitario",
                "task": (
                    "Reescribe solo el campo activity de las semanas con redaccion robotica "
                    "o validacion incompleta por falta de fase o tecnica. "
                    "Mantén week, unit_number, performance, required_skills, knowledge, evidence y phase."
                ),
                "unit_number": unit_number,
                "total_units": total_units,
                "method_profile": profile,
                "performance_official": performance,
                "disciplinary_context": extracted_context,
                "traceability_context": traceability_context,
                "locked_weeks": locked_weeks,
                "weeks": weeks,
                "hard_rules": [
                    "No modifiques semanas bloqueadas.",
                    "Prohibido usar prefijos o etiquetas como Fase:, Momento:, Proposito:, Tecnica:, Tecnicas:, Evidencia: o Actividad:.",
                    "La fase metodologica debe integrarse en prosa natural.",
                    "La tecnica debe integrarse en prosa natural mediante expresiones como mediante, a partir de, con apoyo de o usando.",
                    "Cada activity debe mencionar una tecnica concreta del metodo o de aula: preguntas esenciales, arbol del problema, mapa de actores, entrevista breve, design thinking, prototipado rapido, revision entre pares, matriz, ficha, debate o pitch.",
                    "Solo menciona el objeto de trabajo si validation.work_object_score no es null; no lo fuerces en semanas formativas.",
                    "Cada activity debe tener maximo dos oraciones.",
                    "No repitas la misma apertura gramatical en semanas consecutivas.",
                    "Alterna sujetos y estructuras: El docente..., Los estudiantes..., Durante..., En equipos..., Con apoyo de..., La sesion se centra en...",
                    "Evita usar mas de dos veces en la unidad la formula exacta A partir de la fase de..., el estudiante... Lo desarrolla mediante...",
                    "No incluyas citas tipo [1] o [2].",
                    "Devuelve solo JSON con array weeks.",
                ],
                "response_schema": {
                    "weeks": [
                        {
                            "week": weeks[0].get("week") if weeks else 1,
                            "unit_number": unit_number,
                            "performance": "texto intacto",
                            "required_skills": ["texto intacto"],
                            "skill": "texto intacto",
                            "knowledge": "texto intacto",
                            "activity": "Durante la fase metodologica, los estudiantes analizan el conocimiento semanal con una tecnica pertinente y elaboran una evidencia verificable sin usar etiquetas rigidas.",
                            "evidence": "texto intacto",
                            "phase": "texto intacto",
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )

    # ------------------------------------------------------------------
    # Mapa Semanal de Conocimientos (Step 9)
    # ------------------------------------------------------------------
    async def suggest_knowledge_map(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        performances: list[Any],
        product_option: dict[str, Any] | None,
        notebook_context_text: str = "",
        teacher_instruction: str = "",
        ai_service: Any | None = None,
        force_provider: str | None = None,
    ) -> dict[str, Any]:
        if not ai_service:
            raise ProgressiveContentGenerationError(
                "Servicio de IA no disponible para generar el Mapa de Conocimientos."
            )
        total_units = max(1, len(performances or [])) or 1
        prompt = self._knowledge_map_prompt(
            curso=curso,
            method=method,
            performances=performances or [],
            product_option=product_option,
            notebook_context_text=notebook_context_text,
            teacher_instruction=teacher_instruction,
            total_units=total_units,
        )
        last_error = ""
        weeks: list[dict[str, Any]] = []
        for attempt in range(2):
            for provider in _provider_sequence(force_provider):
                try:
                    payload = await ai_service.generate_json(
                        "progressive_knowledge_map_suggest",
                        prompt,
                        force_provider=provider,
                    )
                    candidate = self._coerce_knowledge_map_weeks(payload, total_units=total_units)
                    if self._knowledge_map_complete(candidate):
                        weeks = candidate
                        break
                    last_error = f"{provider or 'default'}: mapa incompleto o sin 16 semanas"
                except Exception as exc:
                    last_error = f"{provider or 'default'}: {exc}"
            if weeks:
                break
        if not weeks:
            raise ProgressiveContentGenerationError(
                "No se pudo generar el Mapa de Conocimientos con IA. " + last_error
            )
        audit = self.audit_knowledge_map(weeks)
        for entry in weeks:
            entry["warnings"] = []
            entry["locked"] = bool(entry.get("locked", False))
        for warn in audit.get("warnings", []):
            target = next(
                (entry for entry in weeks if int(entry.get("week") or 0) == int(warn.get("week") or 0)),
                None,
            )
            if target is not None:
                target.setdefault("warnings", []).append(warn)
        return {"weeks": weeks, "audit": audit}

    async def reprompt_knowledge_map_weeks(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        performances: list[Any],
        product_option: dict[str, Any] | None,
        existing_map: list[dict[str, Any]],
        weeks_to_change: list[int],
        teacher_instruction: str = "",
        notebook_context_text: str = "",
        ai_service: Any | None = None,
        force_provider: str | None = None,
    ) -> dict[str, Any]:
        if not ai_service:
            raise ProgressiveContentGenerationError(
                "Servicio de IA no disponible para reprompt del Mapa de Conocimientos."
            )
        total_units = max(1, len(performances or [])) or 1
        weeks_to_change_clean = sorted(
            {int(week) for week in (weeks_to_change or []) if str(week).isdigit() and 1 <= int(week) <= 16}
        )
        if not weeks_to_change_clean:
            raise ProgressiveContentGenerationError(
                "No hay semanas seleccionadas para reescribir."
            )
        prompt = self._knowledge_map_reprompt_prompt(
            curso=curso,
            method=method,
            performances=performances or [],
            product_option=product_option,
            existing_map=existing_map or [],
            weeks_to_change=weeks_to_change_clean,
            teacher_instruction=teacher_instruction,
            notebook_context_text=notebook_context_text,
            total_units=total_units,
        )
        last_error = ""
        replacements: list[dict[str, Any]] = []
        for provider in _provider_sequence(force_provider):
            try:
                payload = await ai_service.generate_json(
                    "progressive_knowledge_map_reprompt",
                    prompt,
                    force_provider=provider,
                )
                candidate = self._coerce_knowledge_map_weeks(payload, total_units=total_units)
                target_weeks = {int(entry.get("week") or 0) for entry in candidate}
                if target_weeks >= set(weeks_to_change_clean):
                    replacements = [entry for entry in candidate if int(entry.get("week") or 0) in weeks_to_change_clean]
                    break
                last_error = f"{provider or 'default'}: faltan semanas {sorted(set(weeks_to_change_clean) - target_weeks)}"
            except Exception as exc:
                last_error = f"{provider or 'default'}: {exc}"
        if not replacements:
            raise ProgressiveContentGenerationError(
                "Reprompt parcial no produjo semanas usables. " + last_error
            )
        merged: list[dict[str, Any]] = []
        replacement_by_week = {int(entry.get("week") or 0): entry for entry in replacements}
        for entry in existing_map or []:
            try:
                week_int = int(entry.get("week") or 0)
            except Exception:
                week_int = 0
            if week_int in replacement_by_week:
                new_entry = dict(entry)
                replacement = replacement_by_week[week_int]
                for key in ("knowledge", "subtopics", "emphasis", "source_notes", "unit_number"):
                    if replacement.get(key) is not None:
                        new_entry[key] = replacement[key]
                new_entry["warnings"] = []
                merged.append(new_entry)
            else:
                merged.append(dict(entry))
        audit = self.audit_knowledge_map(merged)
        for entry in merged:
            entry.setdefault("warnings", [])
            entry["warnings"] = [
                warn for warn in audit.get("warnings", [])
                if int(warn.get("week") or 0) == int(entry.get("week") or 0)
            ]
        return {"weeks": merged, "audit": audit}

    def audit_knowledge_map(self, weeks: list[dict[str, Any]]) -> dict[str, Any]:
        warnings: list[dict[str, Any]] = []
        repeated_pairs: list[list[int]] = []
        normalized: list[tuple[int, str]] = []
        for entry in weeks or []:
            try:
                week_int = int(entry.get("week") or 0)
            except Exception:
                week_int = 0
            knowledge = _normalize(entry.get("knowledge") or "")
            if week_int and knowledge:
                normalized.append((week_int, knowledge))
            elif week_int and not knowledge:
                warnings.append(
                    {
                        "week": week_int,
                        "code": "EMPTY_KNOWLEDGE",
                        "message": "Conocimiento vacio. Edita esta semana antes de confirmar.",
                    }
                )
        for index, (week_a, text_a) in enumerate(normalized):
            for week_b, text_b in normalized[index + 1 :]:
                if not text_a or not text_b:
                    continue
                if text_a == text_b:
                    similarity = 1.0
                else:
                    tokens_a = set(text_a.split())
                    tokens_b = set(text_b.split())
                    if not tokens_a or not tokens_b:
                        continue
                    intersection = len(tokens_a & tokens_b)
                    union = len(tokens_a | tokens_b)
                    similarity = intersection / union if union else 0.0
                if similarity >= 0.75:
                    pair = sorted([week_a, week_b])
                    if pair not in repeated_pairs:
                        repeated_pairs.append(pair)
                    warnings.append(
                        {
                            "week": week_b,
                            "code": "REPETITION",
                            "message": f"Tema parece muy similar al de la semana {week_a}. Revisa redaccion.",
                        }
                    )
        for entry in weeks or []:
            try:
                week_int = int(entry.get("week") or 0)
            except Exception:
                continue
            knowledge = str(entry.get("knowledge") or "").strip()
            if knowledge and len(knowledge.split()) <= 2:
                warnings.append(
                    {
                        "week": week_int,
                        "code": "VAGUE",
                        "message": "Tema demasiado breve o vago. Considera una formulacion mas concreta.",
                    }
                )
        if any(warn["code"] == "EMPTY_KNOWLEDGE" for warn in warnings):
            overall_signal = "hard_block"
        elif warnings:
            overall_signal = "soft_warnings"
        else:
            overall_signal = "ok"
        return {
            "overall_signal": overall_signal,
            "warnings": warnings,
            "repeated_pairs": repeated_pairs,
        }

    def _coerce_knowledge_map_weeks(
        self,
        payload: Any,
        *,
        total_units: int,
    ) -> list[dict[str, Any]]:
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                return []
        if isinstance(payload, dict):
            payload = payload.get("weeks") or payload.get("semanas") or payload.get("map") or []
        if not isinstance(payload, list):
            return []
        ranges = _unit_week_ranges(total_units)
        unit_for_week: dict[int, int] = {}
        for unit_number, (start, end) in ranges.items():
            for week in range(start, end + 1):
                unit_for_week[week] = unit_number
        cleaned: list[dict[str, Any]] = []
        for raw in payload:
            if not isinstance(raw, dict):
                continue
            try:
                week_int = int(raw.get("week") or raw.get("semana") or 0)
            except Exception:
                continue
            if week_int < 1 or week_int > 16:
                continue
            knowledge = _clean_text(raw.get("knowledge") or raw.get("conocimiento") or raw.get("tema"))
            subtopics = _as_text_list(raw.get("subtopics") or raw.get("subtemas"))
            emphasis = _clean_text(raw.get("emphasis") or raw.get("enfasis") or raw.get("aplicacion"))
            source_notes = _clean_text(raw.get("source_notes") or raw.get("fuente") or raw.get("source"))
            try:
                unit_number = int(raw.get("unit_number") or unit_for_week.get(week_int) or 1)
            except Exception:
                unit_number = unit_for_week.get(week_int, 1)
            cleaned.append(
                {
                    "week": week_int,
                    "unit_number": unit_number,
                    "knowledge": knowledge,
                    "subtopics": subtopics,
                    "emphasis": emphasis,
                    "source_notes": source_notes,
                    "locked": bool(raw.get("locked", False)),
                    "warnings": [],
                }
            )
        cleaned.sort(key=lambda item: item["week"])
        seen: set[int] = set()
        deduped: list[dict[str, Any]] = []
        for entry in cleaned:
            if entry["week"] in seen:
                continue
            seen.add(entry["week"])
            deduped.append(entry)
        return deduped

    def _knowledge_map_complete(self, weeks: list[dict[str, Any]]) -> bool:
        if len(weeks) != 16:
            return False
        if {entry["week"] for entry in weeks} != set(range(1, 17)):
            return False
        return all(str(entry.get("knowledge") or "").strip() for entry in weeks)

    def validate_knowledge_map_completeness(self, weeks: list[dict[str, Any]]) -> tuple[bool, list[str]]:
        problems: list[str] = []
        if len(weeks or []) != 16:
            problems.append(f"El mapa debe tener 16 semanas (tiene {len(weeks or [])}).")
        present: set[int] = set()
        for entry in weeks or []:
            try:
                week_int = int(entry.get("week") or 0)
            except Exception:
                continue
            present.add(week_int)
            if not str(entry.get("knowledge") or "").strip():
                problems.append(f"Semana {week_int or '?'} sin conocimiento principal.")
        missing = sorted(set(range(1, 17)) - present)
        if missing:
            problems.append(f"Semanas faltantes: {missing}.")
        return (not problems, problems)

    def knowledge_map_for_unit(
        self,
        confirmed_map: list[dict[str, Any]],
        unit_number: int,
        total_units: int,
    ) -> list[dict[str, Any]]:
        ranges = _unit_week_ranges(total_units)
        start, end = ranges.get(unit_number, (1, 16))
        return [
            entry for entry in (confirmed_map or [])
            if start <= int(entry.get("week") or 0) <= end
        ]

    def _knowledge_map_prompt(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        performances: list[Any],
        product_option: dict[str, Any] | None,
        notebook_context_text: str,
        teacher_instruction: str,
        total_units: int,
    ) -> str:
        profile = self._profile_for_method(method)
        ranges = _unit_week_ranges(total_units)
        unit_distribution = [
            {"unit_number": unit_number, "weeks": list(range(start, end + 1))}
            for unit_number, (start, end) in ranges.items()
        ]
        performance_list = [
            {
                "unit_number": index + 1,
                "performance": self._performance_text(item),
            }
            for index, item in enumerate(performances or [])
        ]
        official_knowledge = _as_text_list((curso or {}).get("temas_conocimientos"))
        official_skills = _as_text_list((curso or {}).get("habilidades_desempenos"))
        return json.dumps(
            {
                "role": "Diseñador curricular universitario",
                "task": "Construir el Mapa Semanal de Conocimientos: 16 semanas con 1 conocimiento principal + subtemas + enfasis + fuente.",
                "hard_rules": [
                    "Devuelve EXACTAMENTE 16 semanas, una por cada semana del 1 al 16.",
                    "Cada semana DEBE tener un campo knowledge no vacio: tema disciplinar concreto, secuencial y de complejidad creciente.",
                    "Prohibido repetir el mismo conocimiento en semanas distintas.",
                    "official_knowledge contiene los conocimientos OFICIALES extraidos de la sumilla del curso. Son materia prima OBLIGATORIA del mapa.",
                    "Distribuye los conocimientos oficiales a lo largo de las 16 semanas. No los descartes.",
                    "Si official_knowledge tiene menos de 16 entradas, complementalos con subtemas derivados de la sumilla y del consolidado, sin inventar temas ajenos.",
                    "Si official_knowledge tiene mas de 16 entradas, agrupalos por afinidad disciplinar para que entren en 16 semanas.",
                    "Prohibido reformular un conocimiento oficial al punto de cambiar su sentido disciplinar.",
                    "El mapa prioriza logica disciplinar sobre el producto. El producto orienta aplicacion, no domina temas.",
                    "Respeta la distribucion semana->unidad provista en unit_distribution.",
                    "Subtopics: 2 a 5 puntos cortos, no oraciones largas.",
                    "Emphasis: una frase de aplicacion docente especifica, sin etiquetas.",
                    "source_notes: cita corta del consolidado NotebookLM o '' si no aplica. Sin formato Markdown ni [1].",
                    "No propongas actividades ni evidencias; solo conocimientos y subtemas.",
                    "Tono universitario, concreto, no escolar.",
                    "Devuelve SOLO JSON.",
                ],
                "course": curso or {},
                "official_knowledge": official_knowledge,
                "official_skills": official_skills,
                "method_profile": profile,
                "performances_by_unit": performance_list,
                "selected_product": product_option or {},
                "unit_distribution": unit_distribution,
                "notebook_consolidated_research": _clean_text(notebook_context_text)[:8000],
                "teacher_instruction": _clean_text(teacher_instruction)[:1200],
                "response_schema": {
                    "weeks": [
                        {
                            "week": 1,
                            "unit_number": 1,
                            "knowledge": "tema principal de la semana",
                            "subtopics": ["subtema 1", "subtema 2"],
                            "emphasis": "frase de aplicacion docente",
                            "source_notes": "referencia breve",
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )

    def _knowledge_map_reprompt_prompt(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        performances: list[Any],
        product_option: dict[str, Any] | None,
        existing_map: list[dict[str, Any]],
        weeks_to_change: list[int],
        teacher_instruction: str,
        notebook_context_text: str,
        total_units: int,
    ) -> str:
        profile = self._profile_for_method(method)
        ranges = _unit_week_ranges(total_units)
        unit_distribution = [
            {"unit_number": unit_number, "weeks": list(range(start, end + 1))}
            for unit_number, (start, end) in ranges.items()
        ]
        locked_map = [
            {
                "week": int(entry.get("week") or 0),
                "knowledge": entry.get("knowledge"),
                "subtopics": entry.get("subtopics") or [],
            }
            for entry in (existing_map or [])
            if int(entry.get("week") or 0) not in set(weeks_to_change)
        ]
        official_knowledge = _as_text_list((curso or {}).get("temas_conocimientos"))
        return json.dumps(
            {
                "role": "Diseñador curricular universitario",
                "task": "Reescribir SOLO las semanas indicadas en weeks_to_change. No toques las demas.",
                "hard_rules": [
                    "Devuelve unicamente las semanas listadas en weeks_to_change.",
                    "Cada semana reescrita debe tener knowledge no vacio.",
                    "No dupliques temas que ya aparecen en locked_weeks_map.",
                    "Mantente dentro de la unidad asignada a cada semana segun unit_distribution.",
                    "Respeta la instruccion docente al pie de la letra.",
                    "Si reescribes con conocimientos nuevos, alinealos con official_knowledge cuando sea posible; no inventes temas ajenos a la sumilla.",
                    "Devuelve SOLO JSON con weeks.",
                ],
                "weeks_to_change": weeks_to_change,
                "locked_weeks_map": locked_map,
                "official_knowledge": official_knowledge,
                "teacher_instruction": _clean_text(teacher_instruction)[:1500],
                "course": curso or {},
                "method_profile": profile,
                "performances_by_unit": [
                    {
                        "unit_number": index + 1,
                        "performance": self._performance_text(item),
                    }
                    for index, item in enumerate(performances or [])
                ],
                "selected_product": product_option or {},
                "unit_distribution": unit_distribution,
                "notebook_consolidated_research": _clean_text(notebook_context_text)[:6000],
                "response_schema": {
                    "weeks": [
                        {
                            "week": 1,
                            "unit_number": 1,
                            "knowledge": "tema principal reescrito",
                            "subtopics": ["subtema 1"],
                            "emphasis": "frase de aplicacion",
                            "source_notes": "",
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )

    def assemble_units(self, approved_generations: list[dict[str, Any]]) -> dict[str, Any]:
        ordered = sorted(approved_generations, key=lambda item: int(item.get("unit_number") or 0))
        weeks: list[dict[str, Any]] = []
        units: list[dict[str, Any]] = []
        for generation in ordered:
            unit_weeks = sorted(_coerce_weeks(generation.get("output_json")), key=lambda item: int(item.get("week") or 0))
            if not unit_weeks:
                continue
            unit_number = int(generation.get("unit_number") or unit_weeks[0].get("unit_number") or 0)
            export_weeks: list[dict[str, Any]] = []
            for week in unit_weeks:
                week_number = int(week.get("week") or week.get("semana") or 0)
                skill_values = _as_text_list(week.get("required_skills") or week.get("habilidades_requeridas"))
                skill = _clean_text(week.get("skill") or week.get("habilidad"))
                if skill and skill not in skill_values:
                    skill_values.append(skill)
                export_week = dict(week)
                export_week.update(
                    {
                        "week": week_number,
                        "semana": week_number,
                        "unit_number": unit_number,
                        "desempeno": _clean_text(week.get("performance") or week.get("desempeno")),
                        "habilidades_requeridas": skill_values,
                        "conocimientos": _clean_text(week.get("knowledge") or week.get("conocimientos")),
                        "tema": _clean_text(week.get("knowledge") or week.get("tema") or week.get("conocimientos")),
                        "actividad": _clean_text(week.get("activity") or week.get("actividad")),
                        "evidencia": _clean_text(week.get("evidence") or week.get("evidencia") or week.get("producto")),
                        "producto": _clean_text(week.get("evidence") or week.get("producto") or week.get("evidencia")),
                    }
                )
                export_weeks.append(export_week)
            week_numbers = [week["week"] for week in export_weeks if week.get("week")]
            unit_skills = _merge_unique(
                [
                    skill
                    for week in export_weeks
                    for skill in _as_text_list(week.get("habilidades_requeridas"))
                ],
                limit=12,
            )
            performance_text = export_weeks[0].get("desempeno") or ""
            week_range = ""
            if week_numbers:
                week_range = str(min(week_numbers)) if min(week_numbers) == max(week_numbers) else f"{min(week_numbers)}-{max(week_numbers)}"
            unit_title = _unit_title_from_weeks(
                generation=generation,
                unit_weeks=export_weeks,
                unit_number=unit_number,
                performance_text=performance_text,
            )
            units.append(
                {
                    "unit_number": unit_number,
                    "numero": str(unit_number),
                    "titulo": unit_title,
                    "weeks": week_numbers,
                    "semanas": week_range,
                    "desempeno": performance_text,
                    "logro": performance_text,
                    "ra_unidad": performance_text,
                    "knowledge": _merge_unique([week.get("conocimientos") for week in export_weeks], limit=16),
                    "temas": [
                        {
                            "semana": week.get("week"),
                            "conocimientos": week.get("conocimientos") or week.get("tema") or "",
                        }
                        for week in export_weeks
                    ],
                    "required_skills": unit_skills,
                    "habilidades_requeridas": unit_skills,
                    "evidence": _clean_text(export_weeks[-1].get("evidencia")),
                }
            )
            weeks.extend(export_weeks)
        weeks = sorted(weeks, key=lambda item: int(item.get("week") or 0))
        return {
            "progressive_curriculum": {
                "engine_version": "progressive-curriculum-v1",
                "assembled_units": len(units),
                "content_plan": weeks,
                "units": units,
            },
            "cronograma_semanal": weeks,
            "unidades_tematicas": units,
        }

    def _profile_for_method(self, method: dict[str, Any] | str | None) -> dict[str, Any]:
        if isinstance(method, dict):
            code = method.get("code") or method.get("method_code") or method.get("selected_method_code")
            name = method.get("name") or method.get("method_name") or method.get("selected_method_name")
            return get_method_profile(code, name)
        return get_method_profile(method or "DEFAULT", method or "")

    def _fallback_product_options(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]],
        category: str,
        total_units: int = 1,
    ) -> list[dict[str, Any]]:
        course_name = _clean_text((curso or {}).get("name"), "el curso")
        profile = self._profile_for_method(method)
        category_key = _normalize(category)
        work_object_type = "caso" if "casos" in category_key or "caso" in category_key else _work_object_type_for_profile(profile)
        work_object = f"{work_object_type} concreto pendiente de contextualizacion IA para {course_name}"
        if "multimedia" in category_key:
            titles = ["Podcast de analisis critico", "Video documental breve", "Infografia interactiva"]
        elif "tecnologico" in category_key:
            titles = ["Prototipo funcional aplicado", "Modelo digital demostrable", "Maqueta tecnica validada"]
        elif "intervencion" in category_key:
            titles = ["Plan de intervencion educativa", "Taller aplicado con recursos", "Secuencia pedagogica contextualizada"]
        elif "casos" in category_key:
            titles = ["Informe diagnostico de caso", "Dictamen tecnico sustentado", "Propuesta de solucion de caso"]
        elif "recopilacion" in category_key:
            titles = ["Portafolio progresivo del curso", "Dossier de evidencias comentadas", "Bitacora reflexiva aplicada"]
        elif "investigacion" in category_key:
            titles = ["Informe academico aplicado", "Monografia breve sustentada", "Estado del arte guiado"]
        else:
            titles = [
                f"Portafolio de {work_object}",
                f"Propuesta aplicada de {course_name}",
                f"Producto integrador de {course_name}",
            ]

        return [
            {
                "category": category,
                "title": title,
                "justification": (
                    f"Este producto permite articular los desempenos del curso mediante "
                    f"avances verificables sobre {work_object}, retroalimentacion docente y sustentacion final."
                ),
                "work_object": work_object,
                "work_object_type": work_object_type,
                "timeline_json": self._timeline_from_grading(grading_rows, title, total_units, work_object=work_object),
                "selected": False,
            }
            for title in titles[:3]
        ]

    def _timeline_from_grading(
        self,
        grading_rows: list[dict[str, Any]],
        title: str,
        total_units: int = 1,
        *,
        work_object: str = "",
    ) -> dict[str, str]:
        timeline: dict[str, str] = {}
        rows = grading_rows or []
        pa_limit = max(1, int(total_units or 1))
        pa_rows = [
            row for row in rows
            if _normalize(row.get("code") or row.get("sigla") or row.get("label")).startswith("pa")
        ]
        if not pa_rows and rows:
            pa_rows = rows[: max(1, min(pa_limit, len(rows)))]
        else:
            pa_rows = pa_rows[:pa_limit]
        if not pa_rows:
            ranges = _unit_week_ranges(pa_limit)
            pa_rows = [
                {"code": f"PA{index}", "week": ranges[index][1]}
                for index in range(1, pa_limit + 1)
            ]
        selected_pa_rows = pa_rows[:pa_limit]
        for index, row in enumerate(selected_pa_rows, start=1):
            code = _clean_text(row.get("code") or row.get("sigla") or row.get("label"), f"PA{index}")
            week = self._week_from_grading_row(row)
            stage = "avance" if index < len(selected_pa_rows) else "producto final"
            object_tail = f" aplicado al objeto de trabajo: {work_object}" if work_object else ""
            timeline[code] = f"Semana {week}: {stage} de {title}{object_tail}"
        if not timeline:
            object_tail = f" sobre {work_object}" if work_object else ""
            timeline = {
                "PA1": f"Semana 8: avance revisado de {title}{object_tail}",
                "PAFinal": f"Semana 16: producto final y sustentacion de {title}{object_tail}",
            }
        return timeline

    def _timeline_specs(self, grading_rows: list[dict[str, Any]], total_units: int = 1) -> list[tuple[str, str]]:
        rows = grading_rows or []
        units = max(1, int(total_units or 1))
        pa_rows = [
            row for row in rows
            if _normalize(row.get("code") or row.get("sigla") or row.get("label")).startswith("pa")
        ]
        if pa_rows:
            return [
                (
                    _clean_text(row.get("code") or row.get("sigla") or row.get("label"), f"PA{index}"),
                    self._week_from_grading_row(row),
                )
                for index, row in enumerate(pa_rows[:units], start=1)
            ]

        ranges = _unit_week_ranges(units)
        return [(f"PA{index}", str(ranges[index][1])) for index in range(1, units + 1)]

    def _week_from_grading_row(self, row: dict[str, Any]) -> str:
        value = row.get("week") or row.get("semana") or row.get("week_number") or row.get("cronograma")
        match = re.search(r"\d{1,2}", str(value or ""))
        if match:
            return match.group(0)
        return _clean_text(value, "?")

    def _clean_timeline_value(self, value: Any) -> str:
        text = _clean_text(value)
        text = re.sub(r"^\s*(PA\s*\d+|PAFINAL|PF)\s*[:.)-]\s*", "", text, flags=re.IGNORECASE)
        return text.strip(" .;\n\t")

    def _split_timeline_text(self, value: str) -> list[str]:
        text = _clean_text(value)
        if not text:
            return []

        code_matches = list(re.finditer(r"\b(?:PA\s*\d+|PAFINAL|PF)\b\s*[:.)-]\s*", text, re.IGNORECASE))
        if len(code_matches) > 1:
            return [
                self._clean_timeline_value(text[match.start(): code_matches[index + 1].start() if index + 1 < len(code_matches) else len(text)])
                for index, match in enumerate(code_matches)
            ]

        semicolon_parts = [self._clean_timeline_value(part) for part in re.split(r"\s*;\s*", text)]
        semicolon_parts = [part for part in semicolon_parts if part]
        if len(semicolon_parts) > 1:
            return semicolon_parts

        week_matches = list(re.finditer(r"\bSemana\s+\d+\s*:", text, re.IGNORECASE))
        if len(week_matches) > 1:
            return [
                self._clean_timeline_value(text[match.start(): week_matches[index + 1].start() if index + 1 < len(week_matches) else len(text)])
                for index, match in enumerate(week_matches)
            ]

        return [self._clean_timeline_value(text)] if text else []

    def _normalize_timeline_json(
        self,
        timeline: Any,
        grading_rows: list[dict[str, Any]],
        total_units: int = 1,
    ) -> dict[str, str]:
        specs = self._timeline_specs(grading_rows, total_units)
        expected_codes = [code for code, _week in specs]
        raw_map: dict[str, str] = {}

        if isinstance(timeline, list):
            for index, item in enumerate(timeline):
                if isinstance(item, dict):
                    code = _clean_text(
                        self._alias_value(item, TIMELINE_CODE_ALIASES),
                        expected_codes[index] if index < len(expected_codes) else f"PA{index + 1}",
                    )
                    raw_map[code] = _clean_text(
                        self._alias_value(item, TIMELINE_VALUE_ALIASES)
                    )
                else:
                    raw_map[expected_codes[index] if index < len(expected_codes) else f"PA{index + 1}"] = _clean_text(item)
        elif isinstance(timeline, str):
            raw_map[expected_codes[0] if expected_codes else "PA1"] = timeline
        else:
            raw_map = {str(key): _clean_text(value) for key, value in _coerce_json_object(timeline).items()}

        raw_map = {key: value for key, value in raw_map.items() if _clean_text(value)}
        if not raw_map:
            return {}

        if len(raw_map) == 1 and len(expected_codes) > 1:
            only_value = next(iter(raw_map.values()))
            parts = self._split_timeline_text(only_value)
            if len(parts) > 1:
                return {
                    code: parts[index]
                    for index, code in enumerate(expected_codes)
                    if index < len(parts) and parts[index]
                }

        result: dict[str, str] = {}
        used_keys: set[str] = set()
        for index, code in enumerate(expected_codes):
            key_match = next(
                (
                    key for key in raw_map
                    if _normalize(key).replace(" ", "") == _normalize(code).replace(" ", "")
                    or _normalize(key) == f"pa {index + 1}"
                    or _normalize(key) == f"avance {index + 1}"
                ),
                None,
            )
            if key_match:
                result[code] = self._clean_timeline_value(raw_map[key_match])
                used_keys.add(key_match)

        leftovers = [self._clean_timeline_value(value) for key, value in raw_map.items() if key not in used_keys]
        if not result and leftovers:
            parts = self._split_timeline_text(" ; ".join(leftovers))
            for index, part in enumerate(parts[: len(expected_codes)]):
                if part:
                    result[expected_codes[index]] = part

        return {code: value for code, value in result.items() if value}

    def _alias_value(self, item: dict[str, Any], aliases: tuple[str, ...]) -> Any:
        if not isinstance(item, dict):
            return None
        normalized_aliases = {_normalize(alias) for alias in aliases}
        compact_aliases = {alias.replace(" ", "") for alias in normalized_aliases}
        for key, value in item.items():
            normalized_key = _normalize(key)
            if normalized_key in normalized_aliases or normalized_key.replace(" ", "") in compact_aliases:
                return value
        return None

    def _coerce_product_text(self, value: Any, aliases: tuple[str, ...] = PRODUCT_TEXT_VALUE_ALIASES) -> str:
        if value is None:
            return ""
        if isinstance(value, (str, int, float)):
            return _clean_text(value)
        if isinstance(value, list):
            for item in value:
                text = self._coerce_product_text(item, aliases)
                if text:
                    return text
            return ""
        if isinstance(value, dict):
            for alias_group in (aliases, PRODUCT_TEXT_VALUE_ALIASES):
                nested = self._alias_value(value, alias_group)
                text = self._coerce_product_text(nested, aliases=())
                if text:
                    return text
            text_values = [
                _clean_text(item)
                for item in value.values()
                if isinstance(item, str) and _clean_text(item)
            ]
            if text_values:
                return max(text_values, key=len)
        return ""

    def _looks_like_product_option(self, item: Any) -> bool:
        if not isinstance(item, dict):
            return False
        return bool(
            self._alias_value(item, PRODUCT_TITLE_ALIASES)
            or self._alias_value(item, PRODUCT_WORK_OBJECT_ALIASES)
            or self._alias_value(item, PRODUCT_TIMELINE_ALIASES)
        )

    def _extract_product_option_items(self, payload: Any, *, depth: int = 0) -> list[dict[str, Any]]:
        if depth > 3:
            return []
        if isinstance(payload, list):
            result: list[dict[str, Any]] = []
            for item in payload:
                result.extend(self._extract_product_option_items(item, depth=depth + 1))
            return result
        if not isinstance(payload, dict):
            return []

        for alias in PRODUCT_OPTIONS_ALIASES:
            value = self._alias_value(payload, (alias,))
            if isinstance(value, list):
                extracted = self._extract_product_option_items(value, depth=depth + 1)
                if extracted:
                    return extracted

        if self._looks_like_product_option(payload):
            return [payload]

        for alias in PRODUCT_OPTIONS_ALIASES:
            value = self._alias_value(payload, (alias,))
            if value is not None:
                extracted = self._extract_product_option_items(value, depth=depth + 1)
                if extracted:
                    return extracted

        extracted: list[dict[str, Any]] = []
        for value in payload.values():
            if isinstance(value, list):
                extracted.extend(self._extract_product_option_items(value, depth=depth + 1))
        if extracted:
            return extracted

        for value in payload.values():
            if isinstance(value, dict):
                extracted.extend(self._extract_product_option_items(value, depth=depth + 1))
        return extracted

    def _payload_shape(self, payload: Any) -> str:
        if isinstance(payload, dict):
            return f"dict_keys={list(payload.keys())[:12]}"
        if isinstance(payload, list):
            first = payload[0] if payload else None
            if isinstance(first, dict):
                return f"list_len={len(payload)} first_keys={list(first.keys())[:12]}"
            return f"list_len={len(payload)} first_type={type(first).__name__}"
        return type(payload).__name__

    def _normalize_product_options(
        self,
        options: Any,
        category: str,
        grading_rows: list[dict[str, Any]],
        total_units: int = 1,
    ) -> list[dict[str, Any]]:
        if not isinstance(options, list):
            return []
        normalized: list[dict[str, Any]] = []
        for item in options:
            if not isinstance(item, dict):
                continue
            title = self._coerce_product_text(
                self._alias_value(item, PRODUCT_TITLE_ALIASES),
                PRODUCT_TITLE_ALIASES,
            )
            justification = self._coerce_product_text(
                self._alias_value(item, PRODUCT_JUSTIFICATION_ALIASES),
                PRODUCT_JUSTIFICATION_ALIASES,
            )
            work_object = self._coerce_product_text(
                self._alias_value(item, PRODUCT_WORK_OBJECT_ALIASES),
                PRODUCT_WORK_OBJECT_ALIASES,
            )
            work_object_type = self._coerce_product_text(
                self._alias_value(item, PRODUCT_WORK_OBJECT_TYPE_ALIASES),
                PRODUCT_WORK_OBJECT_TYPE_ALIASES,
            )
            timeline = self._alias_value(item, PRODUCT_TIMELINE_ALIASES) or {}
            if title and work_object:
                if not justification:
                    justification = (
                        f"Producto acreditable pertinente porque articula {title} con el objeto "
                        f"de trabajo situado: {work_object}."
                    )
                timeline_json = self._normalize_timeline_json(timeline, grading_rows, total_units)
                fallback_timeline = self._timeline_from_grading(grading_rows, title, total_units, work_object=work_object)
                if not timeline_json:
                    timeline_json = fallback_timeline
                else:
                    for code, value in fallback_timeline.items():
                        timeline_json.setdefault(code, value)
                timeline_json = {
                    code: (
                        value
                        if _normalize(work_object) in _normalize(value)
                        else f"{value} sobre {work_object}"
                    )
                    for code, value in timeline_json.items()
                }
                normalized.append(
                    {
                        "category": _clean_text(item.get("category"), category),
                        "title": title,
                        "justification": justification,
                        "work_object": work_object,
                        "work_object_type": work_object_type,
                        "timeline_json": timeline_json,
                        "selected": bool(item.get("selected", False)),
                    }
                )
        return normalized

    def _fallback_context_extract(self, raw_context_text: str) -> dict[str, Any]:
        lines = [
            line.strip(" -\t")
            for line in re.split(r"[\n.;]+", raw_context_text)
            if line.strip(" -\t")
        ]
        key_concepts = [line for line in lines if len(line.split()) <= 12][:12]
        if not key_concepts:
            key_concepts = lines[:8]
        cases = [line for line in lines if any(term in _normalize(line) for term in ("caso", "ejemplo", "situacion", "aula"))][:6]
        activities = [line for line in lines if any(term in _normalize(line) for term in ("taller", "actividad", "diseno", "analisis"))][:6]
        evidence = [line for line in lines if any(term in _normalize(line) for term in ("ficha", "matriz", "informe", "producto", "portafolio"))][:6]
        return {
            "key_concepts": key_concepts[:12],
            "cases_or_examples": cases,
            "suggested_activities": activities,
            "possible_evidence": evidence,
            "weekly_suggestions": [],
            "common_errors": [],
        }

    def _normalize_unit_weeks(
        self,
        *,
        generated_weeks: list[dict[str, Any]],
        unit_number: int,
        total_units: int,
        profile: dict[str, Any],
        performance: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]],
        product_option: dict[str, Any] | None,
        locked_weeks: list[int],
        locked_rows: list[dict[str, Any]],
        mandatory_knowledge_map: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        ranges = _unit_week_ranges(total_units)
        start, end = ranges.get(unit_number, (1, 16))
        expected_weeks = list(range(start, end + 1))
        by_week = {int(row.get("week") or row.get("semana") or 0): dict(row) for row in generated_weeks}
        locked_by_week = {
            int(row.get("week") or row.get("semana") or 0): dict(row)
            for row in locked_rows
            if str(row.get("week") or row.get("semana") or "").isdigit()
        }
        mandatory_by_week: dict[int, dict[str, Any]] = {}
        for entry in (mandatory_knowledge_map or []):
            try:
                week_int = int(entry.get("week") or 0)
            except Exception:
                continue
            if week_int:
                mandatory_by_week[week_int] = entry
        normalized: list[dict[str, Any]] = []
        work_object = _clean_text((product_option or {}).get("work_object"))
        pa_weeks = {
            int(week)
            for _code, week in self._timeline_specs(grading_rows, total_units)
            if str(week).isdigit()
        }
        for index, week_number in enumerate(expected_weeks):
            if week_number in locked_weeks and week_number in locked_by_week:
                row = dict(locked_by_week[week_number])
                row["locked"] = True
                if week_number in mandatory_by_week:
                    row["knowledge"] = _clean_text(mandatory_by_week[week_number].get("knowledge")) or row.get("knowledge")
                locked_phase = _clean_text(row.get("phase") or row.get("fase"))
                locked_skill = _clean_text(row.get("skill") or row.get("habilidad"))
                if "validation" not in row:
                    row["validation"] = self.validate_week(
                        row=row,
                        phase=locked_phase,
                        skill=locked_skill,
                        work_object=work_object,
                        work_object_required=week_number in pa_weeks,
                    )
                normalized.append(row)
                continue

            row = dict(by_week.get(week_number) or {})
            phase = _clean_text(row.get("phase") or row.get("fase"))
            if not phase:
                phase = _phase_for_position(profile, index, len(expected_weeks), unit_number == total_units)
            mandatory_entry = mandatory_by_week.get(week_number)
            if mandatory_entry:
                knowledge = _clean_text(mandatory_entry.get("knowledge"), "Contenido de la semana")
            else:
                knowledge = _clean_text(row.get("knowledge") or row.get("conocimientos"), "Contenido de la semana")
            skill = _clean_text(row.get("skill") or row.get("habilidad"))
            required_skills = _as_text_list(row.get("required_skills") or row.get("habilidades_requeridas"))
            if not skill and required_skills:
                skill = required_skills[0]
            activity = _clean_text(row.get("activity") or row.get("actividad"))
            evidence = _clean_text(row.get("evidence") or row.get("evidencia") or row.get("producto"))
            clean_row = {
                "week": week_number,
                "unit_number": unit_number,
                "performance": _clean_text(row.get("performance") or row.get("desempeno"), self._performance_text(performance)),
                "required_skills": required_skills or ([skill] if skill else []),
                "skill": skill,
                "knowledge": knowledge,
                "activity": activity,
                "evidence": evidence,
                "locked": False,
                "phase": phase,
            }
            clean_row["validation"] = self.validate_week(
                row=clean_row,
                phase=phase,
                skill=skill,
                work_object=work_object,
                work_object_required=week_number in pa_weeks,
            )
            normalized.append(clean_row)
        return normalized

    def _performance_text(self, performance: dict[str, Any] | str | None) -> str:
        if isinstance(performance, dict):
            return _clean_text(
                performance.get("statement")
                or performance.get("descripcion")
                or performance.get("description")
                or performance.get("text")
                or performance.get("desempeno")
            )
        return _clean_text(performance)

    def _product_prompt(
        self,
        *,
        curso: dict[str, Any] | None,
        method: dict[str, Any] | str | None,
        grading_rows: list[dict[str, Any]],
        category: str,
        notebook_context_text: str = "",
        total_units: int = 1,
        hitl: dict[str, Any] | None = None,
    ) -> str:
        profile = self._profile_for_method(method)
        work_object_type = _work_object_type_for_profile(profile)
        timeline_specs = self._timeline_specs(grading_rows, total_units)
        timeline_schema = {
            code: f"Semana {week}: avance especifico del mismo producto"
            for code, week in timeline_specs
        }
        teacher_design = _teacher_design_from_hitl(hitl)
        prompt_payload = {
                "role": "Experto en diseno curricular universitario",
                "task": "Proponer 3 productos acreditables integradores concretos para un curso universitario.",
                "rules": [
                    "El PA es un solo producto del curso con avances parciales.",
                    "El producto debe ser verificable y coherente con el metodo.",
                    "CRITICO: Debes formular un work_object (Objeto de Trabajo). Dependiendo del metodo, este debe ser un Caso, Problema, Proyecto, Desafio o Pregunta de Investigacion ESPECIFICO y CONCRETO.",
                    TERRITORIAL_CONTEXT_BLOCK,
                    "No uses objetos genericos. En lugar de 'Caso de un nino', usa un caso situado con distrito, poblacion, problema y condicion verificable.",
                    f"Para este metodo, el tipo esperado de objeto de trabajo es: {work_object_type}.",
                    "El titulo (title) debe nombrar el producto profesional concreto que el estudiante construira para resolver o desarrollar ese work_object.",
                    "timeline_json debe mostrar como el work_object se desarrolla a lo largo de las semanas. Cada avance PA debe nombrar explicitamente el objeto.",
                    "Si notebook_research_context existe, usalo como grounding disciplinar principal, pero NO copies su estructura Markdown ni lo devuelvas como resumen.",
                    "Aunque notebook_research_context venga en texto libre, tu salida debe seguir exactamente response_schema: options -> title, work_object, work_object_type, justification, timeline_json.",
                    "Si el consolidado de Notebook no trae distrito concreto, elige organicamente UN SOLO lugar del contexto territorial. Si trae un lugar repetitivo o poco pertinente, puedes re-situarlo en otro lugar de la lista que sea semanticamente mejor.",
                    "No propongas actividades semanales; solo horizonte acreditable y avances PA.",
                    "timeline_json debe ser un objeto JSON con una clave por PA. No juntes varias semanas dentro de PA1.",
                    f"Usa exactamente estas claves para timeline_json: {', '.join(timeline_schema.keys())}.",
                    "Nivel: docencia universitaria. Tono academico, concreto y no escolar.",
                ],
                "course": curso or {},
                "method_profile": profile,
                "territorial_context": TERRITORIAL_CONTEXT_BLOCK,
                "category": category,
                "grading_rows": grading_rows,
                "total_units": max(1, int(total_units or 1)),
                "expected_timeline_json": timeline_schema,
                "notebook_research_context": _clean_text(notebook_context_text)[:6000],
                "response_schema": {
                    "options": [
                        {
                            "category": "categoria del producto",
                            "title": "Nombre del Producto Acreditable, por ejemplo Plan de intervencion nutricional",
                            "work_object": "Objeto de trabajo concreto segun el metodo, situado en un solo lugar elegido semanticamente del contexto territorial",
                            "work_object_type": work_object_type,
                            "justification": "Por que moviliza desempenos, metodo, evidencia y recomendaciones del contexto Notebook si existe",
                            "timeline_json": timeline_schema,
                        }
                    ]
                },
        }
        if teacher_design:
            prompt_payload["rules"].append(
                "DISENO DEL DOCENTE (restricciones duras): las 3 opciones DEBEN respetar el tipo de producto, "
                "el vinculo con el problema/contexto, el alcance, el formato de evidencia y las respuestas "
                "registradas en teacher_design. No las contradigas, no las ignores y no las diluyas: el docente "
                "es el arquitecto y la IA ejecuta su diseno."
            )
            prompt_payload["teacher_design"] = teacher_design
        return json.dumps(prompt_payload, ensure_ascii=False)

    def _context_prompt(self, raw_context_text: str) -> str:
        return json.dumps(
            {
                "role": "Extractor curricular",
                "task": "Extraer contexto disciplinar util para generar una unidad.",
                "raw_context_text": raw_context_text,
                "response_schema": {
                    "key_concepts": ["conceptos o temas concretos"],
                    "cases_or_examples": ["casos o situaciones"],
                    "suggested_activities": ["actividades sugeridas"],
                    "possible_evidence": ["evidencias posibles"],
                    "weekly_suggestions": ["sugerencias semanales no finales"],
                    "common_errors": ["riesgos de comprension"],
                },
            },
            ensure_ascii=False,
        )

    def _unit_prompt(
        self,
        *,
        unit_number: int,
        total_units: int,
        curso: dict[str, Any] | None,
        profile: dict[str, Any],
        performance: dict[str, Any] | str | None,
        content_block: dict[str, Any] | None,
        grading_rows: list[dict[str, Any]],
        product_option: dict[str, Any] | None,
        extracted_context: dict[str, Any],
        traceability_context: dict[str, Any],
        locked_weeks: list[int],
        locked_rows: list[dict[str, Any]],
        teacher_instruction: str,
        mandatory_knowledge_map: list[dict[str, Any]] | None = None,
    ) -> str:
        ranges = _unit_week_ranges(total_units)
        start, end = ranges.get(unit_number, (1, 16))
        work_object = _clean_text((product_option or {}).get("work_object"))
        timeline = _coerce_json_object((product_option or {}).get("timeline_json"))
        pa_milestones = []
        for code, week in self._timeline_specs(grading_rows, total_units):
            week_text = _clean_text(week)
            week_value: int | str = int(week_text) if week_text.isdigit() else week_text
            if isinstance(week_value, int) and not (start <= week_value <= end):
                continue
            description = _clean_text(timeline.get(code))
            if not description:
                description = next(
                    (
                        _clean_text(value)
                        for key, value in timeline.items()
                        if _normalize(key) == _normalize(code)
                        or f"semana {week_text}" in _normalize(value)
                    ),
                    "",
                )
            pa_milestones.append(
                {
                    "code": code,
                    "week": week_value,
                    "description": description,
                }
            )
        mandatory_block = [
            {
                "week": int(entry.get("week") or 0),
                "knowledge": _clean_text(entry.get("knowledge")),
                "subtopics": _as_text_list(entry.get("subtopics")),
                "emphasis": _clean_text(entry.get("emphasis")),
            }
            for entry in (mandatory_knowledge_map or [])
            if entry.get("week") and _clean_text(entry.get("knowledge"))
        ]
        return json.dumps(
            {
                "role": "Experto en diseno instruccional universitario",
                "task": f"Genera la Unidad {unit_number} de {total_units}, semanas {start}-{end}.",
                "static_context": {
                    "course": curso or {},
                    "method_profile": profile,
                    "performance_official": performance,
                    "content_block": content_block or {},
                    "grading_rows": grading_rows,
                    "selected_product": product_option or {},
                    "central_work_object": work_object,
                    "pa_milestones": pa_milestones,
                },
                "traceability_context": traceability_context,
                "disciplinary_context": extracted_context,
                "locked_weeks": locked_weeks,
                "locked_rows": locked_rows,
                "teacher_instruction": teacher_instruction,
                "mandatory_knowledge_by_week": mandatory_block,
                "hard_rules": [
                    "El conocimiento obligatorio de cada semana ya esta fijado en mandatory_knowledge_by_week. Prohibido modificarlo, ampliarlo como nuevo tema, reemplazarlo o crear titulos alternativos.",
                    "Para cada semana de mandatory_knowledge_by_week, el campo knowledge del response_schema debe ser EXACTAMENTE el valor provisto en knowledge.",
                    "Tu trabajo es disenar didactica, evidencia, fase y tecnica alrededor de cada conocimiento obligatorio. No inventes temas nuevos.",
                    "Cada activity debe redactarse en prosa docente continua, maximo dos oraciones.",
                    "Prohibido usar prefijos o etiquetas como Fase:, Momento:, Proposito:, Tecnica:, Tecnicas:, Evidencia: o Actividad:.",
                    "La fase metodologica debe integrarse naturalmente en la frase, sin convertirla en etiqueta.",
                    "La tecnica debe integrarse en prosa, por ejemplo: mediante debate academico y ficha de analisis.",
                    "No uses Inicio:, Desarrollo: ni Cierre: como etiquetas.",
                    "No repitas actividades, evidencias ni redacciones presentes en traceability_context.approved_unit_memory.",
                    "Si disciplinary_context.notebook_raw_context existe, usalo como insumo principal de la unidad: respeta su secuencia, casos, actividades posibles, evidencias y alertas docentes.",
                    "Respeta exactamente las semanas bloqueadas.",
                    "Aplica la triple coherencia sin volverla literal: fase del metodo + operacion sobre conocimiento + habilidad + tecnica + evidencia.",
                    "El PA es horizonte integrador del curso, no una entrega semanal. No conviertas todas las evidencias en PA.",
                    "static_context.pa_milestones proviene de la matriz de evaluacion del docente y es AUTORITATIVO. En EXACTAMENTE esas semanas la evidencia DEBE ser el avance sumativo correspondiente (PA1, PA2, ...), nombrando el objeto concreto. No muevas un PA a otra semana, no adelantes ni atrases hitos y no omitas ninguno.",
                    "En semanas que NO aparecen en pa_milestones, la evidencia debe ser formativa y breve: ficha, matriz, registro, borrador, reporte breve, lista de cotejo o bitacora. Prohibido iniciar con PA1, PA2, PAFinal o 'avance acreditable'.",
                    "El objeto de trabajo puede orientar el contexto, pero no lo pegues al final de cada actividad o evidencia. Mencionalo solo cuando sea natural o cuando la semana sea PA/hito.",
                    "No termines repetidamente evidencias con frases como 'para/sobre/orientado a' + central_work_object.",
                    "No uses frases genericas como analisis del caso, desarrollo del proyecto o resolucion del problema sin nombrar que caso, que proyecto o que problema.",
                    "Varia la sintaxis semana a semana; no uses la misma apertura gramatical en semanas consecutivas.",
                    "Alterna sujetos y estructuras: El docente..., Los estudiantes..., Durante..., En equipos..., Con apoyo de..., La sesion se centra en...",
                    "Evita usar mas de dos veces en toda la unidad la formula exacta A partir de la fase de..., el estudiante... Lo desarrolla mediante...",
                    "No incluyas citas tipo [1] o [2].",
                    "Devuelve solo JSON.",
                ],
                "response_schema": {
                    "weeks": [
                        {
                            "week": start,
                            "unit_number": unit_number,
                            "performance": "desempeno oficial intacto",
                            "required_skills": ["habilidad requerida"],
                            "knowledge": "conocimiento semanal",
                            "activity": "Actividad en prosa que integra fase metodologica, conocimiento, habilidad y tecnica sin forzar el PA semanal.",
                            "evidence": "evidencia formativa verificable; solo nombra PA y objeto si esta semana figura en pa_milestones",
                            "phase": "fase metodologica",
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )


_ENGINE: ProgressiveCurriculumEngine | None = None


def get_progressive_curriculum_engine() -> ProgressiveCurriculumEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = ProgressiveCurriculumEngine()
    return _ENGINE
