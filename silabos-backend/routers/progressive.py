# Router del Wizard Progresivo v3
# Endpoints para draft progresivo, autosave por bloque y sugerencias IA
#
# POST   /api/syllabi/progressive                           — crear o recuperar draft
# GET    /api/syllabi/{id}/progressive                      — obtener draft con workflow
# PATCH  /api/syllabi/{id}/steps/{step_key}                 — autosave por bloque
# POST   /api/syllabi/{id}/steps/purpose/suggest-performances — IA → desempeños
# POST   /api/syllabi/{id}/steps/content/suggest            — IA → contenido completo
# POST   /api/syllabi/{id}/steps/method/suggest             — IA → ranking de métodos
# POST   /api/syllabi/{id}/steps/grading/suggest            — IA → tabla de calificación
# POST   /api/syllabi/{id}/assemble-final                   — ensamblar sílabo final
# POST   /api/syllabi/{id}/submit-academic-validation       — enviar a validación académica
# GET    /api/methods/{id}/evidences                        — evidencias compatibles
# GET    /api/methods/{id}/instruments                      — instrumentos compatibles

import logging
import re
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import BaseModel

from auth.permissions import get_current_user_record
from models.schemas import APIResponse
from services.bibliography_parser import refs_a_bibliografia_json
from services.progressive_ai_service import get_progressive_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Wizard Progresivo v3"])


def _validate_force_provider(force_provider: str | None) -> str | None:
    if force_provider is None:
        return None
    value = force_provider.strip().lower()
    if not value:
        return None
    if value not in {"gemini", "openrouter"}:
        raise HTTPException(400, "force_provider debe ser gemini u openrouter")
    return value


def _ai_unavailable_detail(exc: Exception) -> dict:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, dict):
        return detail
    return {
        "code": "AI_PROVIDER_SATURATED",
        "message": "Nuestros servidores IA no pudieron completar la solicitud.",
        "retryable": True,
    }


def _sv(request: Request):
    from main import servicios
    return servicios


def _require_db(servicios):
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")
    return supabase


def _require_ai(servicios):
    gemini = servicios.get("gemini")
    if not gemini:
        raise HTTPException(503, "Servicio de IA no disponible")
    return gemini


# ── Modelos ──────────────────────────────────────────────────────────────────

class CreateProgressiveDraftInput(BaseModel):
    course_id: str
    semester: str
    program_id: str | None = None
    fecha_inicio: str | None = None
    fecha_fin: str | None = None


class SaveStepBlockInput(BaseModel):
    block_data: dict
    step_key: str | None = None  # fallback si no viene en la URL


# ── Endpoints ────────────────────────────────────────────────────────────────

def _clean_text(value, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _as_text_list(values) -> list[str]:
    if not isinstance(values, list):
        return []

    result: list[str] = []
    for value in values:
        if isinstance(value, dict):
            text = _clean_text(
                value.get("name")
                or value.get("nombre")
                or value.get("title")
                or value.get("label")
                or value.get("descripcion")
                or value.get("statement")
            )
        else:
            text = _clean_text(value)
        if text:
            result.append(text)
    return result


def _merge_unique_texts(*groups) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()

    for group in groups:
        for item in _as_text_list(group):
            normalized = item.strip().lower()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            merged.append(item)

    return merged


def _build_evaluacion_matriz(
    desempenos: list[dict],
    habilidades_por_desempeno: list[dict],
    grading_rows: list[dict],
    instrument_names: list[str],
    skill_names: list[str] | None = None,
    habilidades_sugeridas: list[str] | None = None,
    ai_instruments_por_desempeno: list[dict] | None = None,
    unidades_tematicas: list[dict] | None = None,
    cronograma_semanal: list[dict] | None = None,
) -> list[dict]:
    """One row per desempeño.
    Habilidades priority:  habilidades_por_desempeno → skill_names → habilidades_sugeridas
    Instruments priority:  ai_instruments_por_desempeno (course-specific) → catalog (generic)
    """
    hab_map = {item["desempeno_code"]: item.get("habilidades", []) for item in habilidades_por_desempeno}
    ai_inst_map = {item["desempeno_code"]: item.get("instrumentos", []) for item in (ai_instruments_por_desempeno or [])}
    evidencias_text = "; ".join(r.get("evidencia", "") for r in grading_rows if r.get("evidencia")) or "—"
    catalog_instruments_text = "; ".join(instrument_names) if instrument_names else "—"

    units = unidades_tematicas or []
    schedule = cronograma_semanal or []
    if units:
        result = []
        for i, unidad in enumerate(units):
            semanas = _parse_week_range(unidad.get("semanas"))
            unit_schedule = [
                row for row in schedule
                if isinstance(row, dict) and row.get("semana") in semanas
            ]
            evidencias = _merge_unique_texts([
                row.get("evidencia") or row.get("producto")
                for row in unit_schedule
                if isinstance(row, dict)
            ])

            code = _clean_text((desempenos[i] or {}).get("codigo")) if i < len(desempenos) else ""
            ai_insts = ai_inst_map.get(code, [])
            desempeno_text = _clean_text(unidad.get("logro")) or (
                _clean_text((desempenos[i] or {}).get("descripcion"))
                if i < len(desempenos)
                else f"Desempeno RA{i + 1}"
            )
            instruments_text = (
                "; ".join(ai_insts)
                if ai_insts
                else _specific_instrument_fallback(desempeno_text, i)
            )
            evidencias_text_unit = "; ".join(evidencias) if evidencias else evidencias_text

            result.append({
                "resultado_aprendizaje": f"RA{i + 1}",
                "resultadoDeAprendizaje": f"RA{i + 1}",
                "desempeno": desempeno_text,
                "desempenos": desempeno_text,
                "evidencias": evidencias_text_unit,
                "evidenciasDeAprendizaje": evidencias_text_unit,
                "instrumentos": instruments_text,
            })

        return result

    n = max(len(desempenos), 1)
    skill_buckets = _distribute_items(skill_names, n) if skill_names else []
    sugeridas_buckets = _distribute_items(habilidades_sugeridas, n) if habilidades_sugeridas else []

    result = []
    for i, d in enumerate(desempenos):
        code = d.get("codigo", f"D{i + 1}")

        habs = hab_map.get(code, [])
        if not habs and skill_buckets:
            habs = skill_buckets[i] if i < len(skill_buckets) else []
        if not habs and sugeridas_buckets:
            habs = sugeridas_buckets[i] if i < len(sugeridas_buckets) else []

        ai_insts = ai_inst_map.get(code, [])
        instruments_text = "; ".join(ai_insts) if ai_insts else catalog_instruments_text

        result.append({
            "resultado_aprendizaje": f"RA{i + 1}",
            "resultadoDeAprendizaje": f"RA{i + 1}",
            "desempeno": d.get("descripcion", ""),
            "desempenos": d.get("descripcion", ""),
            "habilidades": habs,
            "evidencias": evidencias_text,
            "evidenciasDeAprendizaje": evidencias_text,
            "instrumentos": instruments_text,
        })

    return result


def _parse_week_range(value) -> set[int]:
    parts = re.findall(r"\d+", str(value or ""))
    if len(parts) >= 2:
        start, end = int(parts[0]), int(parts[1])
        return set(range(start, end + 1))
    if len(parts) == 1:
        return {int(parts[0])}
    return set()


CANONICAL_GRADING_ROWS = [
    {"evidencia": "Tareas", "sigla": "TA", "porcentaje": 15, "cronograma": "Permanente"},
    {"evidencia": "Producto Acreditable 1", "sigla": "PA1", "porcentaje": 15, "cronograma": "Semana 4"},
    {"evidencia": "Producto Acreditable 2", "sigla": "PA2", "porcentaje": 20, "cronograma": "Semana 8"},
    {"evidencia": "Examen Parcial", "sigla": "EP", "porcentaje": 15, "cronograma": "Semana 12"},
    {"evidencia": "Proyecto Final y Reflexión", "sigla": "PA3", "porcentaje": 35, "cronograma": "Semana 16"},
]

METHOD_EVIDENCE_PRODUCTS = {
    "ABPro": [
        "Dossier analítico",
        "Avance de proyecto / Recurso parcial",
        "Examen Parcial / Sustentación",
        "Proyecto final integrador + exposición",
    ],
    "ABI": [
        "Informe analítico de investigación",
        "Seminario documentado",
        "Examen Parcial",
        "Informe de investigación final + sustentación",
    ],
    "ABDe": [
        "Evidencias iniciales y preguntas esenciales",
        "Recurso de desafío",
        "Sustentación / Examen Parcial",
        "Propuesta final de difusión",
    ],
    "AEC": [
        "Informe de caso introductorio",
        "Sustentación de caso histórico/práctico",
        "Examen Parcial / Informe evaluativo",
        "Informe final de caso integrador + exposición",
    ],
    "AC": [
        "Informe grupal",
        "Dossier cooperativo",
        "Examen Parcial / Informe cooperativo",
        "Informe grupal integrador y exposición final",
    ],
    "AE": [
        "Informe reflexivo-aplicado",
        "Microdiseño sustentado / Avance",
        "Examen Parcial",
        "Propuesta integral + exposición",
    ],
    "ADI": [
        "Informe argumentado de fundamentos",
        "Dossier argumentado / Unidad sustentada",
        "Examen Parcial",
        "Propuesta completa argumentada + sustentación",
    ],
    "CER": [
        "Informe de fenomenología",
        "Dossier de evidencias y razonamiento",
        "Examen Parcial",
        "Aplicación contextualizada final",
    ],
    "EMR": [
        "Informe sobre fundamentos realistas",
        "Propuesta didáctica parcial",
        "Examen Parcial",
        "Propuesta integral EMR + sustentación",
    ],
    "ABT": [
        "Informe síntesis de fundamentos",
        "Producto de taller sustentado",
        "Examen Parcial",
        "Propuesta completa de taller + sustentación",
    ],
    "ABRP": [
        "Informe de fundamentación inicial",
        "Dossier de análisis teórico-problemático",
        "Examen Parcial / Propuesta de intervención",
        "Propuesta final de abordaje didáctico + sustentación",
    ],
}


def _normalize_match_text(value: str) -> str:
    replacements = str.maketrans("áéíóúÁÉÍÓÚñÑ", "aeiouAEIOUnN")
    return str(value or "").translate(replacements).lower()


def _resolve_evidence_method_key(method_name: str = "", method_code: str = "") -> str:
    code = _clean_text(method_code)
    if code in METHOD_EVIDENCE_PRODUCTS:
        return code

    text = _normalize_match_text(f"{method_code} {method_name}")
    if "abpro" in text or "proyecto" in text:
        return "ABPro"
    if "abi" in text or "investigacion" in text:
        return "ABI"
    if "abde" in text or "desafio" in text:
        return "ABDe"
    if "aec" in text or "caso" in text:
        return "AEC"
    if re.search(r"\bac\b", text) or "cooperativo" in text:
        return "AC"
    if re.search(r"\bae\b", text) or "experiencial" in text:
        return "AE"
    if "adi" in text or "indagacion" in text:
        return "ADI"
    if "cer" in text or ("evidencia" in text and "razonamiento" in text):
        return "CER"
    if "emr" in text or "matematica realista" in text:
        return "EMR"
    if "abt" in text or "taller" in text:
        return "ABT"
    if "abrp" in text or "resolucion de problemas" in text:
        return "ABRP"
    return "ABPro"


def _canonical_grading_rows(method_name: str = "", method_code: str = "") -> list[dict]:
    rows = [row.copy() for row in CANONICAL_GRADING_ROWS]
    if method_name or method_code:
        products = METHOD_EVIDENCE_PRODUCTS[_resolve_evidence_method_key(method_name, method_code)]
        for index, evidence_name in enumerate(products, start=1):
            rows[index]["evidencia"] = evidence_name
    return rows


def _normalize_grading_rows(rows: list[dict] | None) -> list[dict]:
    cleaned = [row for row in (rows or []) if isinstance(row, dict)]
    if not cleaned:
        return _canonical_grading_rows()

    siglas = [_clean_text(row.get("sigla")).upper() for row in cleaned]
    percentages = []
    for row in cleaned:
        try:
            percentages.append(float(row.get("porcentaje", 0)))
        except (TypeError, ValueError):
            percentages.append(0)

    is_legacy_default = siglas == ["TA", "PA1", "PA2"] and percentages == [40, 30, 30]
    if is_legacy_default or round(sum(percentages), 2) != 100:
        return _canonical_grading_rows()

    return cleaned


def _sanitize_content_items(items: list[str], limit: int | None = None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in items or []:
        text = re.sub(r"\s+", " ", str(raw or "").strip(" .;,\n\t"))
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
        if limit and len(cleaned) >= limit:
            break
    return cleaned


_CONJUGATED_TO_INFINITIVE = {
    "analiza": "Analizar",
    "describe": "Describir",
    "identifica": "Identificar",
    "detecta": "Detectar",
    "disena": "Disenar",
    "diseña": "Diseñar",
    "aplica": "Aplicar",
    "evalua": "Evaluar",
    "evalúa": "Evaluar",
    "compara": "Comparar",
    "formula": "Formular",
    "interpreta": "Interpretar",
    "comunica": "Comunicar",
    "argumenta": "Argumentar",
    "reconoce": "Reconocer",
    "resuelve": "Resolver",
    "propone": "Proponer",
    "implementa": "Implementar",
    "construye": "Construir",
    "crea": "Crear",
    "organiza": "Organizar",
    "selecciona": "Seleccionar",
    "utiliza": "Utilizar",
}


def _normalize_skill_phrase(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip(" .;,\n\t"))
    if not text:
        return ""
    parts = text.split(" ", 1)
    first = parts[0].lower()
    rest = parts[1] if len(parts) > 1 else ""
    if re.search(r"(ar|er|ir)$", first):
        return text[0].upper() + text[1:]
    if first in _CONJUGATED_TO_INFINITIVE:
        return f"{_CONJUGATED_TO_INFINITIVE[first]} {rest}".strip()
    return f"Analizar {text[0].lower() + text[1:]}"


def _sanitize_skill_items(items: list[str], limit: int | None = None) -> list[str]:
    return _sanitize_content_items([_normalize_skill_phrase(item) for item in items or []], limit)


def _format_cell_items(items: list[str], fallback: str = "") -> str:
    cleaned = _sanitize_content_items(items)
    return ", ".join(cleaned) if cleaned else fallback


def _specific_instrument_fallback(desempeno_text: str, unit_index: int) -> str:
    topic = _clean_text(desempeno_text, f"RA{unit_index + 1}")
    topic = re.sub(r"\s+", " ", topic).strip()
    short_topic = topic[:80].rstrip(" ,.;")
    options = [
        f"Rúbrica analítica de desempeño del RA{unit_index + 1}",
        f"Lista de cotejo de evidencias del RA{unit_index + 1}",
    ]
    if short_topic and not short_topic.upper().startswith("RA"):
        options[0] = f"Rúbrica analítica de {short_topic.lower()}"
    return "; ".join(options)


def _distribute_items(items: list[str], bucket_count: int) -> list[list[str]]:
    if bucket_count <= 0:
        return []

    buckets = [[] for _ in range(bucket_count)]
    if not items:
        return buckets

    total = len(items)
    for index, item in enumerate(items):
        bucket_index = min(bucket_count - 1, int(index * bucket_count / total))
        if item and item not in buckets[bucket_index]:
            buckets[bucket_index].append(item)
    return buckets


def _expand_topics(items: list[str], total: int, fallback_title: str) -> list[str]:
    base = [item for item in items if item] or [fallback_title]
    expanded: list[str] = []
    for index in range(total):
        if index < len(base):
            expanded.append(base[index])
        else:
            expanded.append(f"{base[-1]} - aplicacion {index - len(base) + 1}")
    return expanded


def _topic_tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9Ã¡Ã©Ã­Ã³ÃºÃ±]{4,}", _normalize_match_text(text)))


def _topic_similarity(left: str, right: str) -> float:
    a = _topic_tokens(left)
    b = _topic_tokens(right)
    if not a or not b:
        return 0.0
    return len(a & b) / max(len(a | b), 1)


def _content_plan_topics(plan_units: list[dict]) -> list[str]:
    topics: list[str] = []
    for unit in plan_units or []:
        weeks = unit.get("weeks", []) if isinstance(unit, dict) else []
        for week in weeks:
            if not isinstance(week, dict):
                continue
            topics.append("; ".join(_as_text_list(week.get("knowledge", []))))
    return [topic for topic in topics if topic]


def _content_plan_is_usable(plan_units: list[dict]) -> bool:
    if len(plan_units or []) < 4:
        return False
    topics = _content_plan_topics(plan_units[:4])
    if len(topics) < 16:
        return False
    normalized = {re.sub(r"[\W_]+", "", topic.lower()) for topic in topics}
    if len(normalized) < 12:
        return False
    for idx in range(1, len(topics)):
        if _topic_similarity(topics[idx - 1], topics[idx]) >= 0.80:
            return False
    return True


def _progressive_topic_sequence(items: list[str], total: int = 16) -> list[str]:
    seeds = _sanitize_content_items(items, 12) or ["fundamentos del curso", "aplicacion disciplinar"]

    def seed(index: int) -> str:
        return seeds[min(len(seeds) - 1, index % len(seeds))]

    templates = [
        "Fundamentos conceptuales de {a}",
        "Contexto, alcance y categorias de {a}",
        "Principios y enfoques de {a}",
        "Integracion diagnostica de {a} y {b}",
        "Modelos teoricos de {a}",
        "Procedimientos y estrategias de {a}",
        "Analisis comparado de {a} y {b}",
        "Producto parcial sobre {a}",
        "Metodos de aplicacion de {a}",
        "Criterios de diseno e intervencion en {a}",
        "Resolucion de situaciones practicas vinculadas con {a}",
        "Evaluacion parcial de resultados sobre {a}",
        "Proyecto integrador aplicado a {a}",
        "Validacion y mejora de propuestas sobre {a}",
        "Sustentacion de evidencias y toma de decisiones en {a}",
        "Cierre integrador y reflexion academica sobre {a}",
    ]
    topics = []
    for index in range(total):
        a = seed(index)
        b = seed(index + 1)
        topics.append(templates[index % len(templates)].format(a=a, b=b))
    return topics


def _build_deterministic_content_plan(
    knowledge_items: list[str],
    skill_names: list[str],
    attitudes: list[str] | None,
    desempenos_final: list[dict],
) -> dict:
    topics = _progressive_topic_sequence(knowledge_items, 16)
    skills = _sanitize_skill_items(skill_names, 12) or ["Analizar fundamentos del curso", "Aplicar procedimientos academicos"]
    attitudes_pool = _sanitize_content_items(attitudes or [], 8) or ["Responsabilidad academica", "Rigor en el trabajo colaborativo"]
    units = []
    for unit_index in range(4):
        weeks = []
        perf_code = f"D{unit_index + 1}"
        if unit_index < len(desempenos_final):
            perf_code = _clean_text(desempenos_final[unit_index].get("codigo"), perf_code)
        for offset in range(4):
            week = unit_index * 4 + offset + 1
            weeks.append(
                {
                    "week": week,
                    "unit_number": unit_index + 1,
                    "performance_code": perf_code,
                    "knowledge": [topics[week - 1]],
                    "skills": [
                        {"skill_id": None, "name": skills[(week - 1) % len(skills)]},
                        {"skill_id": None, "name": skills[week % len(skills)]},
                    ],
                    "attitudes": [attitudes_pool[(week - 1) % len(attitudes_pool)]],
                }
            )
        units.append(
            {
                "unit_number": unit_index + 1,
                "ra_unidad": f"Resultado de aprendizaje de la unidad {unit_index + 1}",
                "weeks": weeks,
            }
        )
    return {"units": units, "warnings": ["content_plan regenerado por baja diversidad tematica"]}


def _split_into_weeks(items: list[str], total_weeks: int = 16, per_week: int = 2) -> list[list[str]]:
    """Reparte items en N semanas con rotación uniforme.

    Cada semana w recibe `per_week` items distintos: items[(w*per_week + j) % n].
    Maximiza diversidad entre semanas adyacentes incluso con pool corto.
    """
    weeks: list[list[str]] = [[] for _ in range(total_weeks)]
    cleaned = [str(item).strip() for item in (items or []) if str(item or "").strip()]
    if not cleaned:
        return weeks
    n = len(cleaned)
    for w in range(total_weeks):
        for j in range(per_week):
            cand = cleaned[(w * per_week + j) % n]
            if cand and cand not in weeks[w]:
                weeks[w].append(cand)
    return weeks


def _mix_attitudes_per_week(
    user_pool: list[str],
    total_weeks: int,
    phase_for_week: list[str],
) -> list[list[str]]:
    """Combina actitudes del docente + defaults por fase con rotación.

    Resultado: cada semana 1-2 actitudes; al menos una "fase-aware".
    """
    weeks: list[list[str]] = [[] for _ in range(total_weeks)]
    user = [str(a).strip() for a in (user_pool or []) if str(a or "").strip()]
    n_user = len(user)
    for w in range(total_weeks):
        phase_default = _default_attitudes_for_phase(phase_for_week[w] if w < len(phase_for_week) else "")
        primary = phase_default[w % max(len(phase_default), 1)] if phase_default else ""
        out: list[str] = []
        if primary:
            out.append(primary)
        if n_user:
            secondary = user[w % n_user]
            if secondary and secondary not in out:
                out.append(secondary)
        weeks[w] = out or ["Responsabilidad académica"]
    return weeks


# Pool de actitudes default por keyword de fase (se mantiene tal cual)


# Pool de actitudes default por keyword de fase (cuando docente no carga actitudes propias)
_ATTITUDES_BY_PHASE_KEYWORD = (
    (("explor", "identif", "idea", "presentaci", "comprens", "demostr", "context"),
     ["Curiosidad intelectual", "Apertura a la indagación"]),
    (("investig", "revisi", "planific", "definici", "selecci", "delimit", "matemat"),
     ["Rigor académico", "Responsabilidad en el manejo de fuentes"]),
    (("desarroll", "implement", "ejecut", "produccion", "ejercitaci", "investigaci", "matemati", "analisis", "discuss"),
     ["Trabajo colaborativo", "Compromiso con el aprendizaje"]),
    (("evaluac", "presentaci", "difus", "socializ", "verific", "consolid", "reflex", "cierre", "comunicaci"),
     ["Honestidad intelectual", "Apertura a la mejora continua"]),
)


def _default_attitudes_for_phase(phase_label: str) -> list[str]:
    if not phase_label:
        return ["Responsabilidad académica"]
    lowered = phase_label.lower()
    for needles, actitudes in _ATTITUDES_BY_PHASE_KEYWORD:
        if any(n in lowered for n in needles):
            return actitudes
    return ["Responsabilidad académica"]


def _draft_ra_curso(curso: dict, desempenos: list[dict], method_name: str) -> str:
    """Fallback determinístico para RA del curso cuando la columna está vacía."""
    course_name = _clean_text((curso or {}).get("name"))
    competencia = _clean_text((curso or {}).get("competencia_egreso"))
    capacidad = _clean_text((curso or {}).get("capacidad"))
    if competencia:
        return competencia
    if capacidad:
        return capacidad
    if desempenos:
        first = desempenos[0].get("descripcion") or desempenos[0].get("statement") or ""
        return (
            f"Aplica los aprendizajes del curso de {course_name or 'la asignatura'} mediante "
            f"{method_name or 'metodologías activas'}, integrando análisis crítico, fundamentación "
            f"académica y producción de evidencias coherentes con el perfil profesional."
            f" {first}".strip()
        )
    return (
        f"Desarrolla las competencias del curso de {course_name or 'la asignatura'} "
        f"con rigor académico, autonomía y responsabilidad ética."
    )


def _draft_ra_unidad(
    unit_index: int,
    unit_title: str,
    knowledge_in_unit: list[str],
    desempenos: list[dict],
    method_short: str,
    phases: list[str],
) -> str:
    """Genera RA por unidad determinísticamente desde título + desempeños + fase principal."""
    if unit_index < len(desempenos):
        desempeno_text = desempenos[unit_index].get("descripcion") or desempenos[unit_index].get("statement") or ""
    else:
        desempeno_text = ""
    main_topics = ", ".join(knowledge_in_unit[:3]) if knowledge_in_unit else (unit_title or f"Unidad {unit_index + 1}")
    phase_focus = phases[0] if phases else "el desarrollo del curso"
    if desempeno_text:
        return desempeno_text
    return (
        f"Aplica los aprendizajes de {main_topics} mediante {method_short or 'metodología activa'}, "
        f"con énfasis en {phase_focus.lower()}, demostrando coherencia entre análisis y producción académica."
    )


_PRODUCT_KEYWORDS_BY_PHASE = (
    (("explor", "idea", "identif", "presentaci"),
     ("árbol", "mapa", "preguntas", "esquema", "lluvia")),
    (("investig", "revisi", "planific", "definici", "selecci", "matemat"),
     ("ficha", "matriz", "plan", "marco", "cuadro")),
    (("desarroll", "implement", "ejecut", "produccion", "ejercitaci", "matemati"),
     ("borrador", "informe", "prototipo", "guion", "modelo", "producto")),
    (("evaluac", "presentaci", "difus", "socializ", "verific", "consolid", "cierre", "comunicaci"),
     ("dossier", "exposici", "informe final", "sustenta", "examen", "ponencia", "portafolio")),
)


_FORMATIVE_EVIDENCE_PATTERNS = {
    "ABI": [
        "Matriz de preguntas de investigacion",
        "Fichas de lectura academica",
        "Organizador conceptual analitico",
    ],
    "ABPro": [
        "Esquema del proyecto",
        "Plan de trabajo del proyecto",
        "Avance revisado del producto",
    ],
    "ABDe": [
        "Matriz de analisis del desafio",
        "Plan de solucion del desafio",
        "Prototipo o avance validado",
    ],
    "Aprendizaje Cooperativo": [
        "Organizador cooperativo inicial",
        "Ficha individual de trabajo",
        "Producto grupal en revision",
    ],
    "Estudio de Casos": [
        "Ficha de analisis del caso",
        "Matriz de alternativas de solucion",
        "Informe preliminar del caso",
    ],
}


def _formative_evidence_for_week(week: int, method_short: str, topic: str) -> str:
    week_in_unit = (week - 1) % 4
    templates = _FORMATIVE_EVIDENCE_PATTERNS.get(method_short) or [
        "Esquema de analisis",
        "Ficha de trabajo academico",
        "Avance con retroalimentacion",
    ]
    if week_in_unit < len(templates):
        return templates[week_in_unit]
    return f"Avance integrador de {topic}"


def _evidence_for_week(
    week: int,
    phase_label: str,
    method_short: str,
    method_products: list[str],
    evidences_by_week: dict[int, list[str]],
    permanent: list[str],
    grading_rows: list[dict],
    topic: str,
) -> str:
    """Selecciona evidencia por semana priorizando: grading explícito → productos del método por fase → grading cíclico."""
    explicit = evidences_by_week.get(week)
    if explicit:
        return "; ".join(explicit)

    return _formative_evidence_for_week(week, method_short, topic)

    if method_products and phase_label:
        lowered_phase = phase_label.lower()
        for phase_needles, prod_needles in _PRODUCT_KEYWORDS_BY_PHASE:
            if any(n in lowered_phase for n in phase_needles):
                for prod in method_products:
                    if any(pk in prod.lower() for pk in prod_needles):
                        return prod

    if grading_rows:
        non_permanent = [r for r in grading_rows if "permanente" not in str(r.get("cronograma", "")).lower()]
        if non_permanent:
            row = non_permanent[(week - 1) % len(non_permanent)]
            evidencia_g = _clean_text(row.get("evidencia"))
            sigla_g = _clean_text(row.get("sigla"))
            if evidencia_g:
                return f"{evidencia_g}{f' ({sigla_g})' if sigla_g else ''}"

    if permanent:
        return permanent[0]
    return f"Avance de {topic}"


# Mapeo nombre → código corto del método (para prefijo "ABPro – Fase: ...")
_METHOD_SHORT_NAMES = (
    ("aprendizaje basado en proyectos", "ABPro"),
    ("aprendizaje basado en desafíos", "ABDe"),
    ("aprendizaje basado en desafios", "ABDe"),
    ("aprendizaje basado en investigación", "ABI"),
    ("aprendizaje basado en investigacion", "ABI"),
    ("aprendizaje cooperativo", "Aprendizaje Cooperativo"),
    ("estudio de casos", "Estudio de Casos"),
    ("aprendizaje experiencial", "Aprendizaje Experiencial"),
    ("educación matemática realista", "EMR"),
    ("educacion matematica realista", "EMR"),
    ("resolución de problemas", "Resolución de Problemas"),
    ("resolucion de problemas", "Resolución de Problemas"),
    ("análisis dirigido", "ADI"),
    ("analisis dirigido", "ADI"),
)


def _short_method_name(name: str, code: str | None = None) -> str:
    if code and code.strip():
        return code.strip()
    if not name:
        return "Método"
    lowered = name.strip().lower()
    for needle, short in _METHOD_SHORT_NAMES:
        if needle in lowered:
            return short
    return name.strip()


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _compute_end_date(start_value: str | None, total_weeks: int = 16) -> str:
    start = _parse_iso_date(start_value)
    if not start:
        return ""
    return (start + timedelta(weeks=total_weeks)).strftime("%Y-%m-%d")


def _compute_week_dates(semester: str, total_weeks: int = 16, start_date: str | None = None) -> list[str]:
    """Devuelve lista de fechas (lunes) por semana. Acepta semestre 'YYYY-I' o 'YYYY-II'.

    Heurística: I → inicia 4to lunes de marzo del año. II → inicia 4to lunes de agosto.
    Si no parsea, devuelve lista de '---'.
    """
    explicit_start = _parse_iso_date(start_date)
    if explicit_start:
        return [(explicit_start + timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(total_weeks)]

    if not semester:
        return ["---"] * total_weeks
    match = re.match(r"\s*(\d{4})\s*[-_]?\s*(I{1,2})\s*$", str(semester).upper())
    if not match:
        return ["---"] * total_weeks
    year = int(match.group(1))
    period = match.group(2)
    target_month = 3 if period == "I" else 8
    first = date(year, target_month, 1)
    days_until_monday = (7 - first.weekday()) % 7
    first_monday = first + timedelta(days=days_until_monday)
    start = first_monday + timedelta(weeks=3)  # 4to lunes
    return [(start + timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(total_weeks)]


def _resolve_phase_for_week(
    unit_idx: int,
    week_in_unit: int,
    phases: list[str],
    phase_rules: dict | None,
) -> tuple[str, str]:
    """Devuelve (fase_label, action_text) para la celda dada."""
    if not phases:
        return ("Desarrollo", "")

    rules = phase_rules if isinstance(phase_rules, dict) else {}
    by_unit = rules.get("by_unit") if isinstance(rules.get("by_unit"), list) else []

    phase_idx = week_in_unit % len(phases)
    if unit_idx < len(by_unit):
        unit_rule = by_unit[unit_idx]
        weeks_map = unit_rule.get("weeks") if isinstance(unit_rule, dict) else None
        if isinstance(weeks_map, list) and week_in_unit < len(weeks_map):
            try:
                phase_idx = int(weeks_map[week_in_unit]) % len(phases)
            except (TypeError, ValueError):
                pass

    fase = phases[phase_idx]
    return (fase, "")


def _resolve_action_for_week(
    week_number: int,
    phase_rules: dict | None,
) -> str:
    if not isinstance(phase_rules, dict):
        return ""
    actions = phase_rules.get("actions_by_week")
    if not isinstance(actions, dict):
        return ""
    return _clean_text(actions.get(str(week_number)) or actions.get(week_number))


def _normalize_sentence_spacing(text: str) -> str:
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    text = re.sub(r"\s+([,.;:])", r"\1", text)
    text = re.sub(r"([.;:])(?=\S)", r"\1 ", text)
    text = re.sub(r":\s*:", ":", text)
    return text.strip()


def _as_sentence(text: str) -> str:
    text = _normalize_sentence_spacing(text).strip(" ;:")
    if not text:
        return ""
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?":
        text += "."
    return text


def _overlaps_meaningfully(left: str, right: str) -> bool:
    left_tokens = set(re.findall(r"[a-záéíóúñ]{5,}", _normalize_match_text(left)))
    right_tokens = set(re.findall(r"[a-záéíóúñ]{5,}", _normalize_match_text(right)))
    return bool(left_tokens & right_tokens)


def _build_methodology_narrative(method_raw: dict | None, course_name: str = "") -> str:
    if not isinstance(method_raw, dict) or not method_raw.get("name"):
        return "Metodología activa centrada en el aprendizaje del estudiante."

    name = _clean_text(method_raw.get("name"))
    description = _clean_text(method_raw.get("description"))
    proposito = _clean_text(method_raw.get("proposito"))
    rol_doc = _clean_text(method_raw.get("rol_docente"))
    rol_est = _clean_text(method_raw.get("rol_estudiante"))
    phases = _as_text_list(method_raw.get("phases"))
    estrategias = _clean_text(method_raw.get("estrategias_evaluacion"))

    parrafos: list[str] = []
    p1 = f"La asignatura{' de ' + course_name if course_name else ''} se desarrollará mediante {name}."
    if proposito:
        p1 = f"{p1} {_as_sentence(proposito)}"
    elif description:
        p1 = f"{p1} {_as_sentence(description)}"
    parrafos.append(_as_sentence(p1))

    if estrategias:
        parrafos.append(_as_sentence(f"La investigación formativa se desarrollará mediante {estrategias}"))
    else:
        parrafos.append(
            "La investigación formativa se desarrollará mediante revisión documental, "
            "trabajo cooperativo, elaboración progresiva de productos y retroalimentación académica."
        )

    if rol_doc or rol_est:
        partes_rol = []
        if rol_doc:
            partes_rol.append(f"Rol del docente: {rol_doc}")
        if rol_est:
            partes_rol.append(f"Rol del estudiante: {rol_est}")
        parrafos.append(_as_sentence(" ".join(_as_sentence(parte) for parte in partes_rol)))
    else:
        parrafos.append(
            "El docente actuará como facilitador y orientador del proceso; "
            "el estudiante asumirá un rol activo en la indagación, producción y exposición."
        )

    if phases:
        parrafos.append(_as_sentence(f"Esta configuración responde a las fases del método: {', '.join(phases)}"))

    return "\n\n".join(_as_sentence(parrafo) for parrafo in parrafos if parrafo)


def _validate_method_alignment(
    schedule: list[dict],
    method_short: str,
    phases: list[str],
) -> list[str]:
    warnings: list[str] = []
    if not phases or not schedule:
        return warnings
    phases_lower = [p.lower() for p in phases]
    for row in schedule:
        actividad = (row.get("actividad") or "").lower()
        if not any(p in actividad for p in phases_lower):
            warnings.append(
                f"Sem {row.get('semana')}: actividad no refleja ninguna fase del método ({method_short})."
            )
        if method_short and method_short.lower() not in actividad:
            warnings.append(
                f"Sem {row.get('semana')}: actividad no menciona el método ({method_short})."
            )
    return warnings


def _extract_week_targets(grading_rows: list[dict]) -> tuple[dict[int, list[str]], list[str]]:
    by_week: dict[int, list[str]] = {}
    permanent: list[str] = []

    for row in grading_rows:
        evidencia = _clean_text(row.get("evidencia"))
        cronograma = _clean_text(row.get("cronograma"))
        if not evidencia:
            continue

        if "permanente" in cronograma.lower():
            permanent.append(evidencia)
            continue

        weeks = [int(value) for value in re.findall(r"\d+", cronograma)]
        if len(weeks) >= 2 and any(token in cronograma.lower() for token in ("-", " al ", " a ")):
            start, end = weeks[0], weeks[1]
            for week in range(start, end + 1):
                by_week.setdefault(week, []).append(evidencia)
            continue

        for week in weeks:
            by_week.setdefault(week, []).append(evidencia)

    return by_week, permanent


def _compose_activity(
    method_short: str,
    phase_label: str,
    action_text: str,
    topic: str,
    technique: str = "",
) -> str:
    """Redacta una actividad semanal legible evitando concatenaciones redundantes."""
    prefix = f"**{method_short} - {phase_label}:**" if method_short and phase_label else ""
    topic_text = _clean_text(topic, "los contenidos de la semana")
    phase_text = _clean_text(phase_label, "desarrollo")
    cuerpo = _clean_text(action_text)

    if not cuerpo:
        cuerpo = f"Los estudiantes desarrollan {topic_text} en la fase de {phase_text.lower()}"

    technique_text = _clean_text(technique)
    if technique_text:
        normalized_body = _normalize_match_text(cuerpo)
        normalized_technique = _normalize_match_text(technique_text)
        already_connector = any(connector in normalized_body for connector in (" mediante ", " a traves de ", " con apoyo de "))
        repeats_technique = normalized_technique in normalized_body or _overlaps_meaningfully(cuerpo, technique_text)
        if not already_connector and not repeats_technique:
            cuerpo = f"{cuerpo} mediante {technique_text}"

    cuerpo = _as_sentence(cuerpo)
    return f"{prefix} {cuerpo}".strip() if prefix else cuerpo


def _build_units_and_schedule(
    performances: list[str],
    knowledge_items: list[str],
    skill_names: list[str],
    method_name: str,
    phases: list[str],
    techniques: list[str],
    grading_rows: list[dict],
    content_plan: dict | None = None,
    method_code: str | None = None,
    phase_rules: dict | None = None,
    week_dates: list[str] | None = None,
    desempenos_final: list[dict] | None = None,
    attitudes_pool: list[str] | None = None,
    method_products: list[str] | None = None,
) -> tuple[list[dict], list[dict]]:
    unit_count = 4
    weeks_per_unit = 4
    total_weeks = unit_count * weeks_per_unit
    evidences_by_week, permanent_evidences = _extract_week_targets(grading_rows)
    method_short = _short_method_name(method_name, method_code)
    dates = week_dates if week_dates and len(week_dates) >= total_weeks else ["---"] * total_weeks
    desempenos_final = desempenos_final or []

    def _date_for(week: int) -> str:
        idx = week - 1
        return dates[idx] if 0 <= idx < len(dates) else "---"

    def _perf_for(unit_idx: int, code_hint: str = "") -> str:
        if code_hint:
            for d in desempenos_final:
                if d.get("codigo") == code_hint:
                    return d.get("descripcion", "") or d.get("statement", "")
        if unit_idx < len(performances):
            return performances[unit_idx]
        if performances:
            return performances[-1]
        return ""

    units: list[dict] = []
    schedule: list[dict] = []

    plan_units = (content_plan or {}).get("units", []) if isinstance(content_plan, dict) else []
    if not _content_plan_is_usable(plan_units):
        repaired_plan = _build_deterministic_content_plan(
            knowledge_items=knowledge_items,
            skill_names=skill_names,
            attitudes=attitudes_pool,
            desempenos_final=desempenos_final,
        )
        plan_units = repaired_plan.get("units", [])
    if plan_units:
        for unit_index, plan_unit in enumerate(plan_units[:unit_count]):
            weeks = plan_unit.get("weeks", []) if isinstance(plan_unit, dict) else []
            start_week = unit_index * weeks_per_unit + 1
            end_week = start_week + weeks_per_unit - 1
            unit_knowledge: list[str] = []
            unit_skills: list[str] = []
            unit_attitudes: list[str] = []
            for week_row in weeks:
                unit_knowledge.extend(_as_text_list(week_row.get("knowledge", [])))
                unit_skills.extend([
                    _normalize_skill_phrase(skill.get("name", "")) if isinstance(skill, dict) else _normalize_skill_phrase(skill)
                    for skill in week_row.get("skills", [])
                ])
                unit_attitudes.extend(_as_text_list(week_row.get("attitudes", [])))

            title = _clean_text((unit_knowledge or [f"Bloque {unit_index + 1}"])[0], f"Bloque {unit_index + 1}")
            performance_text = _perf_for(unit_index) or _clean_text(plan_unit.get("ra_unidad"), title)
            ra_unidad_plan = _clean_text(plan_unit.get("ra_unidad")) or _draft_ra_unidad(
                unit_index, title, _merge_unique_texts(unit_knowledge),
                desempenos_final, method_short, phases,
            )
            units.append(
                {
                    "numero": unit_index + 1,
                    "titulo": title,
                    "semanas": f"{start_week}-{end_week}",
                    "temas": _merge_unique_texts(unit_knowledge)[:weeks_per_unit],
                    "logro": performance_text,
                    "ra_unidad": ra_unidad_plan,
                    "habilidades_requeridas": ", ".join(_merge_unique_texts(unit_skills)[:3]) or "Desarrollo de habilidades del curso",
                    "actitudes": _merge_unique_texts(unit_attitudes)[:3],
                }
            )

            for offset in range(weeks_per_unit):
                week_row = weeks[offset] if offset < len(weeks) and isinstance(weeks[offset], dict) else {}
                week = int(week_row.get("week") or (start_week + offset))
                week_in_unit = (week - 1) % weeks_per_unit
                knowledge = _as_text_list(week_row.get("knowledge", []))
                skills = [
                    _normalize_skill_phrase(skill.get("name", "")) if isinstance(skill, dict) else _normalize_skill_phrase(skill)
                    for skill in week_row.get("skills", [])
                ]
                attitudes = _as_text_list(week_row.get("attitudes", []))
                topic = "; ".join(knowledge) or title

                phase_label, _ = _resolve_phase_for_week(unit_index, week_in_unit, phases, phase_rules)
                action_text = _resolve_action_for_week(week, phase_rules)
                technique = techniques[week_in_unit % len(techniques)] if techniques else ""
                activity = _compose_activity(method_short, phase_label, action_text, topic, technique)

                perf_code = _clean_text(week_row.get("performance_code", ""))
                desempeno_text = _perf_for(unit_index, perf_code)

                product = _evidence_for_week(
                    week=week,
                    phase_label=phase_label,
                    method_short=method_short,
                    method_products=method_products or [],
                    evidences_by_week=evidences_by_week,
                    permanent=permanent_evidences,
                    grading_rows=grading_rows,
                    topic=topic,
                )
                schedule.append(
                    {
                        "semana": week,
                        "fecha": _date_for(week),
                        "desempeno": desempeno_text,
                        "desempeno_code": perf_code,
                        "tema": topic,
                        "conocimientos": knowledge,
                        "habilidades": skills,
                        "actitudes": attitudes,
                        "actividad": activity,
                        "producto": product,
                        "evidencia": product,
                    }
                )

        return units, schedule

    # Fallback path: sin content_plan estructurado por semana
    # Distribuir K/H/A por semana directamente para matchear matriz de EjemplosDeSilabos
    knowledge_per_week = _split_into_weeks(knowledge_items, total_weeks=total_weeks, per_week=2)
    skills_per_week = _split_into_weeks(skill_names, total_weeks=total_weeks, per_week=3)

    # Pre-computar fase por semana para alimentar mix de actitudes
    phase_per_week_global: list[str] = []
    for week_pre in range(1, total_weeks + 1):
        u_pre = (week_pre - 1) // weeks_per_unit
        wiu_pre = (week_pre - 1) % weeks_per_unit
        ph_lbl, _ = _resolve_phase_for_week(u_pre, wiu_pre, phases, phase_rules)
        phase_per_week_global.append(ph_lbl)

    attitudes_per_week = _mix_attitudes_per_week(
        attitudes_pool or [],
        total_weeks=total_weeks,
        phase_for_week=phase_per_week_global,
    )

    knowledge_buckets = _distribute_items(knowledge_items, unit_count)
    skill_buckets = _distribute_items(skill_names, unit_count)
    products_list = method_products or []

    for unit_index in range(unit_count):
        start_week = unit_index * weeks_per_unit + 1
        end_week = start_week + weeks_per_unit - 1
        seed_topics = knowledge_buckets[unit_index]
        fallback_title = f"Bloque {unit_index + 1}"
        title = _clean_text(seed_topics[0] if seed_topics else fallback_title, fallback_title)
        topics = _expand_topics(seed_topics, weeks_per_unit, title)

        performance_text = _perf_for(unit_index)
        if not performance_text:
            performance_text = f"Aplica aprendizajes del bloque {unit_index + 1} en torno a {title.lower()}"

        unit_skills = skill_buckets[unit_index] or skill_names[:3]
        skills_text = ", ".join(unit_skills[:3]) if unit_skills else "Desarrollo de habilidades del curso"

        ra_unidad = _draft_ra_unidad(
            unit_index, title, seed_topics, desempenos_final, method_short, phases,
        )

        units.append(
            {
                "numero": unit_index + 1,
                "titulo": title,
                "semanas": f"{start_week}-{end_week}",
                "temas": topics,
                "logro": performance_text,
                "ra_unidad": ra_unidad,
                "habilidades_requeridas": skills_text,
            }
        )

        for offset, topic in enumerate(topics):
            week = start_week + offset
            week_in_unit = offset
            week_idx = week - 1

            phase_label, _ = _resolve_phase_for_week(unit_index, week_in_unit, phases, phase_rules)
            action_text = _resolve_action_for_week(week, phase_rules)
            technique = techniques[week_in_unit % len(techniques)] if techniques else ""
            activity = _compose_activity(method_short, phase_label, action_text, topic, technique)

            week_knowledge = knowledge_per_week[week_idx] if week_idx < len(knowledge_per_week) else []
            if not week_knowledge:
                week_knowledge = [topic]

            week_skills = skills_per_week[week_idx] if week_idx < len(skills_per_week) else []
            if not week_skills:
                week_skills = unit_skills[:2] if unit_skills else []

            week_attitudes = attitudes_per_week[week_idx] if week_idx < len(attitudes_per_week) else []
            if not week_attitudes:
                week_attitudes = _default_attitudes_for_phase(phase_label)

            product = _evidence_for_week(
                week=week,
                phase_label=phase_label,
                method_short=method_short,
                method_products=products_list,
                evidences_by_week=evidences_by_week,
                permanent=permanent_evidences,
                grading_rows=grading_rows,
                topic=topic,
            )

            schedule.append(
                {
                    "semana": week,
                    "fecha": _date_for(week),
                    "desempeno": performance_text,
                    "desempeno_code": "",
                    "tema": topic,
                    "conocimientos": week_knowledge,
                    "habilidades": week_skills,
                    "actitudes": week_attitudes,
                    "actividad": activity,
                    "producto": product,
                    "evidencia": product,
                }
            )

    return units, schedule


@router.post("/syllabi/progressive", response_model=APIResponse)
async def crear_o_obtener_draft_progresivo(
    datos: CreateProgressiveDraftInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    """Crea o recupera el draft progresivo abierto para este curso/semestre/docente."""
    supabase = _require_db(_sv(request))
    user_id = str(current_user["id"])

    draft = await supabase.crear_o_obtener_draft_progresivo(
        course_id=datos.course_id,
        semester=datos.semester,
        user_id=user_id,
        program_id=datos.program_id,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        teacher_name=str(current_user.get("full_name") or ""),
        teacher_email=str(current_user.get("email") or ""),
    )
    if not draft:
        raise HTTPException(500, "No se pudo crear el draft progresivo")

    return APIResponse(success=True, data=draft, error=None)


@router.get("/syllabi/{syllabus_id}/progressive", response_model=APIResponse)
async def obtener_draft_progresivo(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    """Obtiene el draft progresivo completo con su workflow y bloques."""
    supabase = _require_db(_sv(request))
    user_id = None if current_user.get("role") == "admin" else str(current_user["id"])

    draft = await supabase.obtener_draft_progresivo(syllabus_id, user_id)
    if not draft:
        raise HTTPException(404, f"Draft {syllabus_id} no encontrado")

    return APIResponse(success=True, data=draft, error=None)


VALID_STEP_KEYS = {"bibliography", "purpose", "content", "method", "grading"}


@router.patch("/syllabi/{syllabus_id}/steps/{step_key}", response_model=APIResponse)
async def guardar_step_block(
    syllabus_id: str,
    step_key: str = Path(..., description="bibliography|purpose|content|method|grading"),
    datos: SaveStepBlockInput = ...,
    request: Request = ...,
    current_user: dict = Depends(get_current_user_record),
):
    """Autosave de un bloque del draft progresivo."""
    if step_key not in VALID_STEP_KEYS:
        raise HTTPException(400, f"step_key inválido: {step_key}. Válidos: {VALID_STEP_KEYS}")

    supabase = _require_db(_sv(request))
    user_id = str(current_user["id"])

    resultado = await supabase.guardar_step_block(
        syllabus_id=syllabus_id,
        step_key=step_key,
        block_data=datos.block_data,
        user_id=user_id,
    )
    if not resultado:
        raise HTTPException(500, f"No se pudo guardar el bloque {step_key}")

    return APIResponse(success=True, data=resultado, error=None)


@router.post("/syllabi/{syllabus_id}/steps/purpose/suggest-performances", response_model=APIResponse)
async def sugerir_desempenos(
    syllabus_id: str,
    request: Request,
    force_provider: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user_record),
):
    """IA genera desempeños sugeridos desde el propósito del curso."""
    sv = _sv(request)
    supabase = _require_db(sv)
    user_id = str(current_user["id"])
    progressive_ai = get_progressive_ai_service()

    draft = await supabase.obtener_draft_progresivo(syllabus_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    course_id = payload.get("course_snapshot", {}).get("course_id") or draft.get("course_id")
    if not course_id:
        raise HTTPException(400, "No se encontró course_id en el draft")

    curso = await supabase.obtener_curso(str(course_id))
    if not curso:
        raise HTTPException(404, "Curso no encontrado")

    # Refs bibliográficas del draft para enriquecer el contexto
    refs = await supabase.obtener_referencias_curso(str(course_id))

    try:
        performances = await progressive_ai.sugerir_desempenos(
            curso,
            refs[:6],
            force_provider=_validate_force_provider(force_provider),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Error en sugerir_desempenos: %s", exc)
        raise HTTPException(status_code=503, detail=_ai_unavailable_detail(exc)) from exc

    if not performances:
        return APIResponse(
            success=True,
            data={"performances": [], "origin": "ai_suggested", "warning": "La IA no pudo generar desempeños"},
            error=None,
        )

    # Mark as ai_suggested
    for p in performances:
        p["origin"] = "ai_suggested"

    # Cache suggestion
    await supabase.guardar_ai_suggestion(
        syllabus_id=syllabus_id,
        step_key="purpose",
        input_json={"course_id": str(course_id)},
        output_json={"performances": performances},
        user_id=user_id,
    )

    return APIResponse(
        success=True,
        data={"performances": performances, "origin": "ai_suggested"},
        error=None,
    )


@router.post("/syllabi/{syllabus_id}/steps/content/suggest", response_model=APIResponse)
async def sugerir_contenido(
    syllabus_id: str,
    request: Request,
    force_provider: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user_record),
):
    """IA sugiere conocimientos, actitudes y habilidades desde los desempeños confirmados."""
    sv = _sv(request)
    supabase = _require_db(sv)
    user_id = str(current_user["id"])
    progressive_ai = get_progressive_ai_service()

    draft = await supabase.obtener_draft_progresivo(syllabus_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    course_id = payload.get("course_snapshot", {}).get("course_id") or draft.get("course_id")
    purpose_block = payload.get("purpose", {})
    performances = purpose_block.get("performances", [])

    curso = await supabase.obtener_curso(str(course_id)) if course_id else {}
    refs = await supabase.obtener_referencias_curso(str(course_id)) if course_id else []
    skills_suggest = await supabase.sugerir_skills_para_contenido(
        course_id=str(course_id) if course_id else None,
        desempeno=" ".join([str(p.get("statement", "")) for p in performances[:4] if isinstance(p, dict)]),
        limit=20,
    ) if course_id else {"skills": []}

    try:
        sugerencia = await progressive_ai.sugerir_contenido(
            curso or {},
            performances,
            refs[:4],
            skills_context=skills_suggest.get("skills", []),
            force_provider=_validate_force_provider(force_provider),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Error en sugerir_contenido: %s", exc)
        raise HTTPException(status_code=503, detail=_ai_unavailable_detail(exc)) from exc

    def _merge_unique(*lists):
        out, seen = [], set()
        for items in lists:
            for raw in items or []:
                text_value = str(raw or "").strip()
                key = text_value.lower()
                if text_value and key not in seen:
                    seen.add(key)
                    out.append(text_value)
        return out

    sugerencia["conocimientos"] = _sanitize_content_items(_merge_unique(
        ((curso or {}).get("temas_conocimientos") or [])[:8],
        sugerencia.get("conocimientos", []),
    ), 8)
    catalog_skill_names = [s.get("nombre", "") for s in skills_suggest.get("skills", [])[:8]]
    if catalog_skill_names:
        # RN biblioteca: las habilidades sugeridas deben salir del catálogo maestro cuando hay match.
        sugerencia["habilidades_sugeridas"] = _sanitize_skill_items(_merge_unique(catalog_skill_names), 8)
    else:
        sugerencia["habilidades_sugeridas"] = _sanitize_skill_items(_merge_unique(
            (curso or {}).get("habilidades_desempenos", [])[:8],
            sugerencia.get("habilidades_sugeridas", []),
        ), 8)
    sugerencia.setdefault("actitudes", [])
    if len(sugerencia["actitudes"]) < 3:
        sugerencia["actitudes"] = _sanitize_content_items(_merge_unique(
            sugerencia["actitudes"],
            ["Responsabilidad académica", "Rigor en el trabajo colaborativo", "Apertura a la mejora continua"],
        ), 4)
    else:
        sugerencia["actitudes"] = _sanitize_content_items(sugerencia["actitudes"], 4)
    if not _clean_text(sugerencia.get("responsabilidad_social")):
        temas_rsu = ", ".join(sugerencia.get("conocimientos", [])[:2]) or curso.get("name", "el curso")
        sugerencia["responsabilidad_social"] = (
            f"Desarrollar una actividad de transferencia comunitaria donde los estudiantes apliquen {temas_rsu} "
            "para atender una necesidad concreta del entorno local."
        )
    plan_units = (
        (sugerencia.get("content_plan") or {}).get("units", [])
        if isinstance(sugerencia.get("content_plan"), dict)
        else []
    )
    if not _content_plan_is_usable(plan_units):
        sugerencia["content_plan"] = _build_deterministic_content_plan(
            knowledge_items=sugerencia.get("conocimientos", []),
            skill_names=sugerencia.get("habilidades_sugeridas", []),
            attitudes=sugerencia.get("actitudes", []),
            desempenos_final=[
                {
                    "codigo": p.get("code", f"D{i + 1}") if isinstance(p, dict) else f"D{i + 1}",
                    "descripcion": p.get("statement", "") if isinstance(p, dict) else str(p),
                }
                for i, p in enumerate(performances or [])
            ],
        )

    await supabase.guardar_ai_suggestion(
        syllabus_id=syllabus_id,
        step_key="content",
        input_json={"performances_count": len(performances)},
        output_json=sugerencia,
        user_id=user_id,
    )

    return APIResponse(success=True, data=sugerencia, error=None)


@router.post("/syllabi/{syllabus_id}/steps/method/suggest", response_model=APIResponse)
async def sugerir_metodo_progresivo(
    syllabus_id: str,
    request: Request,
    force_provider: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user_record),
):
    """IA rankea métodos basados en propósito + contenido del draft."""
    sv = _sv(request)
    supabase = _require_db(sv)
    gemini = _require_ai(sv)
    user_id = str(current_user["id"])

    draft = await supabase.obtener_draft_progresivo(syllabus_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    course_id = payload.get("course_snapshot", {}).get("course_id") or draft.get("course_id")

    curso = await supabase.obtener_curso(str(course_id)) if course_id else {}
    metodos_db = await supabase.listar_teaching_methods(include_archived=False)
    metodos_base = [
        {
            "id": m["id"],
            "name": m["name"],
            "code": m.get("code", ""),
            "description": m.get("description", ""),
            "proposito": m.get("proposito", ""),
            "phases": _as_text_list(m.get("phases")),
            "tecnicas_didacticas": _as_text_list(m.get("tecnicas_didacticas")),
            "rol_docente": m.get("rol_docente", ""),
            "rol_estudiante": m.get("rol_estudiante", ""),
        }
        for m in metodos_db
    ]

    if not metodos_base:
        raise HTTPException(400, "No hay métodos pedagógicos disponibles")

    # Contexto enriquecido (Manual V3 §5 Mod6: propósito + contenido + disciplina + guía oficial)
    content_block = payload.get("content", {})
    conocimientos = ", ".join(content_block.get("knowledge_items", [])[:5])
    purpose_block = payload.get("purpose", {})
    desempenos_text = "; ".join(
        str(p.get("statement", "")) if isinstance(p, dict) else str(p)
        for p in purpose_block.get("performances", [])[:4]
    )
    disciplina = (
        curso.get("scope")
        or curso.get("naturaleza")
        or curso.get("program_name")
        or curso.get("career_name")
        or ""
    )
    skill_context = (
        f"Disciplina/programa: {disciplina}\n"
        f"Conocimientos clave: {conocimientos or 'no especificados'}\n"
        f"Desempeños: {desempenos_text or 'no especificados'}"
    )

    fallback = {
        "method_id": metodos_base[0]["id"],
        "method_name": metodos_base[0]["name"],
        "reason": "Sugerencia por defecto",
    }

    if not gemini or not curso:
        return APIResponse(success=True, data=fallback, error=None)

    try:
        resultado = await gemini.sugerir_metodo(
            curso=curso,
            metodos_base=metodos_base,
            skill_context=skill_context,
            force_provider=_validate_force_provider(force_provider),
        )
        mid = resultado.get("method_id")
        metodo_encontrado = next((m for m in metodos_base if str(m["id"]) == str(mid)), metodos_base[0])
        complementario_id = resultado.get("complementario_id")
        complementario = next(
            (m for m in metodos_base if complementario_id and str(m["id"]) == str(complementario_id)),
            None,
        )
        sugerencia = {
            "method_id": metodo_encontrado["id"],
            "method_name": metodo_encontrado["name"],
            "method_code": metodo_encontrado.get("code", ""),
            "phases": metodo_encontrado.get("phases", []),
            "reason": resultado.get("reason", "Sugerido por IA"),
            "complementario": (
                {
                    "method_id": complementario["id"],
                    "method_name": complementario["name"],
                }
                if complementario else None
            ),
        }
    except Exception as exc:
        logger.warning("Error en sugerir_metodo progresivo: %s", exc)
        raise HTTPException(status_code=503, detail=_ai_unavailable_detail(exc)) from exc

    await supabase.guardar_ai_suggestion(
        syllabus_id=syllabus_id,
        step_key="method",
        input_json={"course_id": str(course_id)},
        output_json=sugerencia,
        user_id=user_id,
    )

    return APIResponse(success=True, data=sugerencia, error=None)


@router.post("/syllabi/{syllabus_id}/steps/grading/suggest", response_model=APIResponse)
async def sugerir_calificacion(
    syllabus_id: str,
    request: Request,
    force_provider: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user_record),
):
    """Sugiere nombres de evidencias por metodo sin alterar pesos ni cronograma."""
    sv = _sv(request)
    supabase = _require_db(sv)
    user_id = str(current_user["id"])

    draft = await supabase.obtener_draft_progresivo(syllabus_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    method_block = payload.get("method", {})
    method_id = method_block.get("selected_method_id")
    method_name = _clean_text(method_block.get("selected_method_name"))
    method_code = _clean_text(method_block.get("method_code") or method_block.get("selected_method_code"))
    if method_id:
        method_raw = await supabase.obtener_teaching_method(str(method_id))
        if method_raw:
            method_name = _clean_text(method_raw.get("name")) or method_name
            method_code = _clean_text(method_raw.get("code")) or method_code

    rows = _canonical_grading_rows(method_name, method_code)
    method_key = _resolve_evidence_method_key(method_name, method_code)

    await supabase.guardar_ai_suggestion(
        syllabus_id=syllabus_id,
        step_key="grading",
        input_json={
            "method_id": str(method_id),
            "method_name": method_name,
            "method_code": method_code,
            "method_key": method_key,
            "rule": "evidence_names_only_keep_structure",
            "products": METHOD_EVIDENCE_PRODUCTS[method_key],
        },
        output_json={"rows": rows},
        user_id=user_id,
    )

    return APIResponse(success=True, data={"rows": rows, "origin": "ai_suggested"}, error=None)


@router.post("/syllabi/{syllabus_id}/assemble-final", response_model=APIResponse)
async def ensamblar_final(
    syllabus_id: str,
    request: Request,
    force_provider: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user_record),
):
    """
    Ensambla el sílabo final de forma determinística desde los bloques del draft.
    No ejecuta IA — construye por código a partir de los datos validados.
    """
    sv = _sv(request)
    supabase = _require_db(sv)
    force_provider = _validate_force_provider(force_provider)
    user_id = str(current_user["id"])

    draft = await supabase.obtener_draft_progresivo(syllabus_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    purpose = payload.get("purpose", {})
    content = payload.get("content", {})
    method = payload.get("method", {})
    grading = payload.get("grading", {})
    bibliography = payload.get("bibliography", {})
    course_id = payload.get("course_snapshot", {}).get("course_id") or draft.get("course_id")

    curso = await supabase.obtener_curso(str(course_id)) if course_id else {}

    # Deterministic assembly
    performances = purpose.get("performances", [])

    grading_rows = _normalize_grading_rows(grading.get("rows", []))
    criterios = [
        {
            "nombre": r.get("evidencia", ""),
            "porcentaje": r.get("porcentaje", 0),
            "sigla": r.get("sigla", ""),
            "cronograma": r.get("cronograma", ""),
            "descripcion": r.get("evidencia", ""),
        }
        for r in grading_rows
    ]

    knowledge_items = content.get("knowledge_items", [])
    attitudes = content.get("attitudes", [])
    habilidades_por_desempeno = content.get("habilidades_por_desempeno", [])
    habilidades_sugeridas = content.get("habilidades_sugeridas", [])
    content_plan = content.get("content_plan", {})
    datos_generales_payload = payload.get("datos_generales", {}) or {}
    selected_skill_ids = content.get("selected_skill_ids", [])
    skills_raw = await supabase.listar_skills_raw_por_ids(selected_skill_ids) if selected_skill_ids else []
    skill_names = [
        _clean_text(skill.get("nombre"))
        for skill in skills_raw
        if _clean_text(skill.get("nombre"))
    ]
    method_id = method.get("selected_method_id")
    method_raw = await supabase.obtener_teaching_method(str(method_id)) if method_id else None
    # Preferir DB (fresh) sobre payload (potencialmente stale por cambio de método)
    method_name = _clean_text((method_raw or {}).get("name")) or method.get("selected_method_name", "")
    method_code = _clean_text((method_raw or {}).get("code"))
    method_short = _short_method_name(method_name, method_code)
    phases = _as_text_list((method_raw or {}).get("phases"))
    techniques = _as_text_list((method_raw or {}).get("tecnicas_didacticas"))
    phase_rules = (method_raw or {}).get("phase_rules_json") or {}
    method_products = _as_text_list((method_raw or {}).get("productos_tipicos"))
    method_instruments = await supabase.listar_instrumentos_metodo(str(method_id)) if method_id else []
    instrument_names = [_clean_text(i.get("name")) for i in method_instruments if _clean_text(i.get("name"))]

    desempenos_final = [
        {
            "codigo": _clean_text(item.get("code"), f"D{index + 1}"),
            "descripcion": _clean_text(item.get("statement"), f"Desempeno {index + 1}"),
            "statement": _clean_text(item.get("statement"), f"Desempeno {index + 1}"),
        }
        if isinstance(item, dict)
        else {
            "codigo": f"D{index + 1}",
            "descripcion": _clean_text(item, f"Desempeno {index + 1}"),
            "statement": _clean_text(item, f"Desempeno {index + 1}"),
        }
        for index, item in enumerate(performances)
    ]
    desempenos_text = [item["descripcion"] for item in desempenos_final]

    # AI generates course-specific instruments per desempeño (Motor Evaluativo, Módulo 7)
    ai_instruments_por_desempeno: list[dict] = []
    _gemini_svc = _sv(request).get("gemini")
    if _gemini_svc and desempenos_final:
        try:
            ai_instruments_por_desempeno = await _gemini_svc.sugerir_instrumentos_por_desempeno(
                desempenos=desempenos_final,
                habilidades_por_desempeno=habilidades_por_desempeno,
                grading_rows=grading_rows,
                method_name=method_name,
                course_name=curso.get("name", "") if curso else "",
                sumilla=curso.get("sumilla", "") if curso else "",
                force_provider=force_provider,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("sugerir_instrumentos_por_desempeno failed: %s", exc)
            raise HTTPException(status_code=503, detail=_ai_unavailable_detail(exc)) from exc

    fecha_inicio = _clean_text(datos_generales_payload.get("fecha_inicio"))
    fecha_fin = _clean_text(datos_generales_payload.get("fecha_fin")) or _compute_end_date(fecha_inicio, total_weeks=16)
    week_dates = _compute_week_dates(draft.get("semester", ""), total_weeks=16, start_date=fecha_inicio)

    unidades_tematicas, cronograma_semanal = _build_units_and_schedule(
        performances=desempenos_text,
        knowledge_items=knowledge_items,
        skill_names=skill_names,
        method_name=method_name,
        phases=phases,
        techniques=techniques,
        grading_rows=grading_rows,
        content_plan=content_plan,
        method_code=method_code,
        phase_rules=phase_rules,
        week_dates=week_dates,
        desempenos_final=desempenos_final,
        attitudes_pool=attitudes,
        method_products=method_products,
    )

    method_warnings = _validate_method_alignment(cronograma_semanal, method_short, phases)
    teacher_name = str(
        current_user.get("full_name")
        or draft.get("teacher_name")
        or payload.get("datos_generales", {}).get("docente")
        or ""
    )
    teacher_email = str(
        current_user.get("email")
        or payload.get("datos_generales", {}).get("docente_email")
        or ""
    )
    notebooklm_refs = await supabase.obtener_referencias_curso(str(course_id)) if course_id else []
    bibliography_refs = _merge_unique_texts(
        notebooklm_refs,
        bibliography.get("references", []),
    )
    bibliography_sources = _as_text_list(bibliography.get("sources_consulted", []))
    competencia = curso.get("competencia_egreso", "") if curso else ""
    resultado_raw = curso.get("resultado_aprendizaje", "") if curso else ""
    resultado = _clean_text(resultado_raw) or _draft_ra_curso(curso or {}, desempenos_final, method_name)
    rsu_text = _clean_text(content.get("responsabilidad_social"))
    if not rsu_text:
        temas_rsu = ", ".join(_as_text_list(knowledge_items)[:2]) or (curso.get("name", "") if curso else "el curso")
        rsu_text = (
            f"Desarrollar una actividad de transferencia comunitaria donde los estudiantes apliquen {temas_rsu} "
            "para atender una necesidad concreta del entorno local."
        )
    metodologia_text = _build_methodology_narrative(
        method_raw,
        course_name=curso.get("name", "") if curso else "",
    )

    final = {
        "_assembled": True,
        "_wizard_version": "v3-progressive",
        "course_id": str(course_id) if course_id else "",
        "semester": draft.get("semester", ""),
        "teacher_name": teacher_name,
        "datos_generales": {
            "course_id": str(course_id) if course_id else "",
            "nombre_curso": curso.get("name", "") if curso else "",
            "creditos": curso.get("credits", 3) if curso else 3,
            "semestre": draft.get("semester", ""),
            "periodo_academico": draft.get("semester", ""),
            "docente": teacher_name,
            "docente_email": teacher_email,
            "codigo": curso.get("code", "") if curso else "",
            "facultad": curso.get("faculty_name", "") if curso else "",
            "carrera": curso.get("career_name", "") if curso else "",
            "escuela_profesional": curso.get("career_name", "") if curso else "",
            "programa_estudios": curso.get("program_name", "") if curso else "",
            "modalidad": "Presencial",
            "prerrequisito": curso.get("prerequisites", "") if curso else "",
            "horas_teoria": curso.get("hours_theory", "") if curso else "",
            "horas_practica": curso.get("hours_practice", "") if curso else "",
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
        },
        "sumilla": curso.get("sumilla", "") if curso else "",
        "competencia_profesional": competencia,
        "competencias": [competencia] if competencia else [],
        "competencia_egreso": curso.get("competencia_egreso", "") if curso else "",
        "resultados_aprendizaje": [resultado] if resultado else [],
        "resultado_aprendizaje": resultado,
        "capacidad_del_curso": curso.get("capacidad", "") if curso else "",
        "desempenos": desempenos_final,
        "performances_origin": purpose.get("performances_origin", "none"),
        "contenido": {
            "conocimientos": knowledge_items,
            "actitudes": attitudes,
            "habilidades_seleccionadas": selected_skill_ids,
            "habilidades_nombres": skill_names,
        },
        "unidades_tematicas": unidades_tematicas,
        "cronograma_semanal": cronograma_semanal,
        "metodologia": metodologia_text,
        "tutoria": (
            "Las tutorias academicas se realizan de manera presencial o virtual, "
            "segun la programacion institucional vigente."
        ),
        "responsabilidad_social": {
            "actividadPropuesta": rsu_text,
            "descripcion": rsu_text,
        },
        "responsabilidadSocial": {
            "actividadPropuesta": rsu_text,
            "descripcion": rsu_text,
        },
        "method_id": method_id,
        "method_short_name": method_short,
        "methodology_json": {
            "id": str(method_id) if method_id else "",
            "name": method_name,
            "code": method_code,
            "short_name": method_short,
            "description": _clean_text((method_raw or {}).get("description")),
            "proposito": _clean_text((method_raw or {}).get("proposito")),
            "rol_docente": _clean_text((method_raw or {}).get("rol_docente")),
            "rol_estudiante": _clean_text((method_raw or {}).get("rol_estudiante")),
            "phases": phases,
            "phase_rules_json": phase_rules,
            "productos_tipicos": (method_raw or {}).get("productos_tipicos", []),
            "weekly_template": _clean_text((method_raw or {}).get("weekly_template")),
            "tecnicas_didacticas": (method_raw or {}).get("tecnicas_didacticas", []),
            "estrategias_evaluacion": _clean_text((method_raw or {}).get("estrategias_evaluacion")),
            "instrumentos_evaluacion": (method_raw or {}).get("instrumentos_evaluacion", []),
        },
        "sistema_evaluacion": {
            "criterios": criterios,
            "nota_aprobatoria": 14,
        },
        "evaluacion_matriz": _build_evaluacion_matriz(
            desempenos_final, habilidades_por_desempeno, grading_rows, instrument_names,
            skill_names, habilidades_sugeridas, ai_instruments_por_desempeno,
            unidades_tematicas, cronograma_semanal
        ),
        "bibliografia": refs_a_bibliografia_json(bibliography_refs),
        "bibliography": bibliography_refs,
        "bibliography_sources": bibliography_sources,
        "_meta": {
            **(payload.get("_meta") or {}),
            "method_alignment_warnings": method_warnings,
        },
    }

    resultado = await supabase.ensamblar_final(syllabus_id, final, user_id)
    if not resultado:
        raise HTTPException(500, "No se pudo ensamblar el sílabo final")

    # Save version
    await supabase.guardar_version(
        syllabus_id=syllabus_id,
        payload=final,
        version_number=1,
        changed_by=str(current_user.get("full_name", "sistema")),
        note=f"Ensamblado progresivo v3 — método: {method.get('selected_method_name', '')}",
    )

    return APIResponse(
        success=True,
        data={
            "syllabus_id": syllabus_id,
            "assembled": True,
            "requires_academic_validation": payload.get("_meta", {}).get("requires_academic_validation", False),
            "final_syllabus": final,
        },
        error=None,
    )


@router.post("/syllabi/{syllabus_id}/submit-academic-validation", response_model=APIResponse)
async def enviar_validacion_academica(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    """Envía el draft para validación académica (cuando usa desempeños sugeridos por IA)."""
    supabase = _require_db(_sv(request))
    user_id = str(current_user["id"])

    draft = await supabase.obtener_draft_progresivo(syllabus_id, user_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    meta = payload.get("_meta", {})
    if not meta.get("requires_academic_validation"):
        return APIResponse(
            success=True,
            data={"message": "Este sílabo no requiere validación académica"},
            error=None,
        )

    # Reuse the institutional review flow and track academic validation in dedicated flags.
    current_status = draft.get("status", "draft")
    if current_status not in ("draft", "generated", "returned"):
        raise HTTPException(400, f"No se puede enviar a validacion desde el estado '{current_status}'")

    ok = await supabase.marcar_envio_validacion_academica(syllabus_id)
    if not ok:
        raise HTTPException(500, "No se pudo actualizar el estado del sílabo")

    return APIResponse(
        success=True,
        data={
            "status": "review",
            "academic_validation_status": "pending",
            "syllabus_id": syllabus_id,
        },
        error=None,
    )


# ── Evidence / Instrument catalogs per method ─────────────────────────────────

@router.get("/methods/{method_id}/evidences", response_model=APIResponse)
async def listar_evidencias_metodo(
    method_id: str,
    request: Request,
):
    """Lista evidencias compatibles con el método pedagógico."""
    supabase = _require_db(_sv(request))
    items = await supabase.listar_evidencias_metodo(method_id)
    return APIResponse(success=True, data={"items": items}, error=None)


@router.get("/methods/{method_id}/instruments", response_model=APIResponse)
async def listar_instrumentos_metodo(
    method_id: str,
    request: Request,
):
    """Lista instrumentos compatibles con el método pedagógico."""
    supabase = _require_db(_sv(request))
    items = await supabase.listar_instrumentos_metodo(method_id)
    return APIResponse(success=True, data={"items": items}, error=None)
