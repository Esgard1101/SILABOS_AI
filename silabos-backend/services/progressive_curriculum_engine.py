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


def _has_robotic_activity_labels(value: Any) -> bool:
    return bool(ROBOTIC_ACTIVITY_LABEL_RE.search(str(value or "")))


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
            return ladder[-1]
        return "Avance acreditable de unidad con retroalimentacion"
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
    ) -> list[dict[str, Any]]:
        category = _canonical_product_category(category)
        prompt = self._product_prompt(
            curso=curso,
            method=method,
            grading_rows=grading_rows or [],
            category=category,
            notebook_context_text=notebook_context_text,
            total_units=total_units,
        )
        if ai_service:
            try:
                payload = await ai_service.generate_json(
                    "progressive_product_suggest",
                    prompt,
                    force_provider=force_provider,
                )
                options = payload.get("options") if isinstance(payload, dict) else payload
                normalized = self._normalize_product_options(options, category, grading_rows or [], total_units)
                if normalized:
                    return normalized[:3]
            except Exception:
                pass
        return self._fallback_product_options(
            curso=curso,
            method=method,
            grading_rows=grading_rows or [],
            category=category,
            total_units=total_units,
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

    def build_traceability_context(self, approved_generations: list[dict[str, Any]]) -> dict[str, Any]:
        weeks: list[dict[str, Any]] = []
        for generation in sorted(approved_generations, key=lambda item: int(item.get("unit_number") or 0)):
            weeks.extend(_coerce_weeks(generation.get("output_json")))
        if not weeks:
            return {
                "completed_weeks": "",
                "covered_knowledge": [],
                "last_delivered_evidence": "",
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
        return {
            "completed_weeks": f"{first_week}-{final_week}" if first_week and final_week else "",
            "covered_knowledge": covered,
            "last_delivered_evidence": _clean_text(
                last_week.get("evidence")
                or last_week.get("evidencia")
                or last_week.get("producto")
            ),
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
        )
        generated_weeks: list[dict[str, Any]] = []
        if ai_service:
            try:
                payload = await ai_service.generate_json(
                    "progressive_unit_generate",
                    prompt,
                    force_provider=force_provider,
                )
                generated_weeks = _coerce_weeks(payload)
            except Exception:
                generated_weeks = []

        if not generated_weeks:
            generated_weeks = self._fallback_unit_weeks(
                unit_number=unit_number,
                total_units=total_units,
                curso=curso or {},
                profile=profile,
                performance=performance,
                content_block=content_block or {},
                grading_rows=grading_rows or [],
                product_option=product_option or {},
                extracted_context=extracted_context,
                traceability_context=traceability_context,
            )

        weeks = self._normalize_unit_weeks(
            generated_weeks=generated_weeks,
            unit_number=unit_number,
            total_units=total_units,
            profile=profile,
            performance=performance,
            locked_weeks=locked_weeks,
            locked_rows=locked_rows or [],
        )
        if ai_service and self._needs_activity_repair(weeks, locked_weeks):
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
                    force_provider=force_provider,
                )
                repaired_weeks = _coerce_weeks(repair_payload)
                if repaired_weeks:
                    weeks = self._normalize_unit_weeks(
                        generated_weeks=repaired_weeks,
                        unit_number=unit_number,
                        total_units=total_units,
                        profile=profile,
                        performance=performance,
                        locked_weeks=locked_weeks,
                        locked_rows=locked_rows or [],
                    )
            except Exception:
                pass
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
        formative_score = 2 if skill_key and any(part in activity_key for part in skill_key.split()[:4]) else 1 if skill_key else 1
        technique_terms = (
            "mediante",
            "taller",
            "debate",
            "revision",
            "modelado",
            "microtaller",
            "caso",
            "simulacion",
            "laboratorio",
            "ficha",
            "matriz",
            "discusion",
        )
        technique_score = 2 if any(term in activity_key for term in technique_terms) else 0
        evidence_score = 2 if evidence_key else 0
        total = methodological_score + cognitive_score + formative_score + technique_score + evidence_score
        if robotic_labels:
            total = min(total, 6)

        if robotic_labels:
            diagnosis = "Usa etiquetas rigidas; debe redactarse en prosa docente"
        elif total >= 8:
            diagnosis = "Coherencia alta"
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
            "total_score": total,
            "diagnosis": diagnosis,
        }

    def _needs_activity_repair(self, weeks: list[dict[str, Any]], locked_weeks: list[int]) -> bool:
        locked = {int(week) for week in locked_weeks if str(week).isdigit()}
        return any(
            int(row.get("week") or 0) not in locked
            and _has_robotic_activity_labels(row.get("activity"))
            for row in weeks
        )

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
                    "Reescribe solo el campo activity de las semanas con redaccion robotica. "
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
                    "Cada activity debe tener maximo dos oraciones.",
                    "Usa preferentemente el estilo: A partir de..., el estudiante...",
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
                            "activity": "A partir de la fase metodologica, el estudiante realiza una operacion cognitiva sobre el conocimiento movilizando la habilidad oficial. Lo desarrolla mediante una tecnica pertinente y concreta la evidencia indicada.",
                            "evidence": "texto intacto",
                            "phase": "texto intacto",
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
            units.append(
                {
                    "unit_number": unit_number,
                    "weeks": [week.get("week") for week in unit_weeks],
                    "desempeno": unit_weeks[0].get("performance") or unit_weeks[0].get("desempeno") or "",
                    "knowledge": _merge_unique([week.get("knowledge") for week in unit_weeks], limit=16),
                    "evidence": _clean_text(unit_weeks[-1].get("evidence")),
                }
            )
            weeks.extend(unit_weeks)
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
            work_object = _clean_text(profile.get("work_object"), "producto integrador")
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
                    f"avances verificables, retroalimentacion docente y sustentacion final."
                ),
                "timeline_json": self._timeline_from_grading(grading_rows, title, total_units),
                "selected": False,
            }
            for title in titles[:3]
        ]

    def _timeline_from_grading(self, grading_rows: list[dict[str, Any]], title: str, total_units: int = 1) -> dict[str, str]:
        timeline: dict[str, str] = {}
        rows = grading_rows or []
        pa_rows = [
            row for row in rows
            if _normalize(row.get("code") or row.get("sigla") or row.get("label")).startswith("pa")
        ]
        if not pa_rows and rows:
            pa_rows = rows[: max(1, min(4, total_units or len(rows)))]
        if not pa_rows:
            ranges = _unit_week_ranges(max(1, int(total_units or 1)))
            pa_rows = [
                {"code": f"PA{index}", "week": ranges[index][1]}
                for index in range(1, max(1, int(total_units or 1)) + 1)
            ]
        for index, row in enumerate(pa_rows[:4], start=1):
            code = _clean_text(row.get("code") or row.get("sigla") or row.get("label"), f"PA{index}")
            week = self._week_from_grading_row(row)
            stage = "avance" if index < len(pa_rows[:4]) else "producto final"
            timeline[code] = f"Semana {week}: {stage} de {title}"
        if not timeline:
            timeline = {
                "PA1": f"Semana 8: avance revisado de {title}",
                "PAFinal": f"Semana 16: producto final y sustentacion de {title}",
            }
        return timeline

    def _timeline_specs(self, grading_rows: list[dict[str, Any]], total_units: int = 1) -> list[tuple[str, str]]:
        rows = grading_rows or []
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
                for index, row in enumerate(pa_rows[:4], start=1)
            ]

        units = max(1, int(total_units or 1))
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
                        item.get("code") or item.get("sigla") or item.get("pa") or item.get("label"),
                        expected_codes[index] if index < len(expected_codes) else f"PA{index + 1}",
                    )
                    raw_map[code] = _clean_text(
                        item.get("description")
                        or item.get("descripcion")
                        or item.get("text")
                        or item.get("value")
                        or item.get("avance")
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
            title = _clean_text(item.get("title") or item.get("titulo"))
            justification = _clean_text(item.get("justification") or item.get("justificacion"))
            timeline = item.get("timeline_json") or item.get("timeline") or {}
            if title and justification:
                timeline_json = self._normalize_timeline_json(timeline, grading_rows, total_units)
                fallback_timeline = self._timeline_from_grading(grading_rows, title, total_units)
                if not timeline_json:
                    timeline_json = fallback_timeline
                else:
                    for code, value in fallback_timeline.items():
                        timeline_json.setdefault(code, value)
                normalized.append(
                    {
                        "category": _clean_text(item.get("category"), category),
                        "title": title,
                        "justification": justification,
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

    def _fallback_unit_weeks(
        self,
        *,
        unit_number: int,
        total_units: int,
        curso: dict[str, Any],
        profile: dict[str, Any],
        performance: dict[str, Any] | str | None,
        content_block: dict[str, Any],
        grading_rows: list[dict[str, Any]],
        product_option: dict[str, Any],
        extracted_context: dict[str, Any],
        traceability_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        ranges = _unit_week_ranges(total_units)
        start, end = ranges.get(unit_number, (1, 16))
        week_numbers = list(range(start, end + 1))
        official_topics = _merge_unique(
            extracted_context.get("key_concepts"),
            content_block.get("knowledge_items"),
            curso.get("temas_conocimientos"),
            curso.get("sumilla"),
            limit=48,
        )
        unit_topics = _slice_for_unit(official_topics, unit_number, total_units)
        unit_topics = _dedupe_against_traceability(unit_topics, traceability_context)
        if not unit_topics:
            unit_topics = [self._performance_text(performance) or _clean_text(curso.get("name"), "contenido del curso")]

        skill_items = _merge_unique(
            content_block.get("habilidades_sugeridas"),
            content_block.get("skills"),
            curso.get("habilidades_desempenos"),
            self._performance_text(performance),
            limit=24,
        )
        if not skill_items:
            skill_items = ["analizar y producir evidencias academicas pertinentes"]

        weeks: list[dict[str, Any]] = []
        for index, week in enumerate(week_numbers):
            knowledge = unit_topics[min(index, len(unit_topics) - 1)]
            skill = skill_items[index % len(skill_items)]
            phase = _phase_for_position(profile, index, len(week_numbers), unit_number == total_units)
            evidence = _evidence_for(
                profile=profile,
                week=week,
                unit_number=unit_number,
                week_index=index,
                week_count=len(week_numbers),
                grading_rows=grading_rows,
                product_option=product_option,
                knowledge=knowledge,
                is_final_unit=unit_number == total_units,
            )
            activity = self._compose_activity(
                profile=profile,
                phase=phase,
                knowledge=knowledge,
                skill=skill,
                week_index=index,
                evidence=evidence,
            )
            weeks.append(
                {
                    "week": week,
                    "unit_number": unit_number,
                    "performance": self._performance_text(performance),
                    "required_skills": [skill],
                    "skill": skill,
                    "knowledge": knowledge,
                    "activity": activity,
                    "evidence": evidence,
                    "locked": False,
                    "phase": phase,
                }
            )
        return weeks

    def _compose_activity(
        self,
        *,
        profile: dict[str, Any],
        phase: str,
        knowledge: str,
        skill: str,
        week_index: int,
        evidence: str = "",
    ) -> str:
        operation = _operation_for_phase(profile, phase, week_index)
        technique = _technique_for(profile, phase, week_index)
        skill_text = _clean_text(skill, "la habilidad prevista")
        knowledge_text = _clean_text(knowledge, "el contenido de la semana")
        evidence_text = _clean_text(evidence, "una evidencia verificable")
        return (
            f"A partir de la fase de {phase}, el estudiante desarrolla una operacion de {operation} "
            f"sobre {knowledge_text}, movilizando la habilidad de {skill_text}. Lo trabaja mediante {technique} y concreta "
            f"{evidence_text}."
        )

    def _normalize_unit_weeks(
        self,
        *,
        generated_weeks: list[dict[str, Any]],
        unit_number: int,
        total_units: int,
        profile: dict[str, Any],
        performance: dict[str, Any] | str | None,
        locked_weeks: list[int],
        locked_rows: list[dict[str, Any]],
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
        normalized: list[dict[str, Any]] = []
        for index, week_number in enumerate(expected_weeks):
            if week_number in locked_weeks and week_number in locked_by_week:
                row = dict(locked_by_week[week_number])
                row["locked"] = True
                locked_phase = _clean_text(row.get("phase") or row.get("fase"))
                locked_skill = _clean_text(row.get("skill") or row.get("habilidad"))
                row["validation"] = self.validate_week(row=row, phase=locked_phase, skill=locked_skill)
                normalized.append(row)
                continue

            row = dict(by_week.get(week_number) or {})
            phase = _clean_text(row.get("phase") or row.get("fase"))
            if not phase:
                phase = _phase_for_position(profile, index, len(expected_weeks), unit_number == total_units)
            knowledge = _clean_text(row.get("knowledge") or row.get("conocimientos"), "Contenido de la semana")
            skill = _clean_text(row.get("skill") or row.get("habilidad"))
            required_skills = _as_text_list(row.get("required_skills") or row.get("habilidades_requeridas"))
            if not skill and required_skills:
                skill = required_skills[0]
            activity = _clean_text(row.get("activity") or row.get("actividad"))
            evidence = _clean_text(row.get("evidence") or row.get("evidencia") or row.get("producto"), "Evidencia de aprendizaje")
            if not activity:
                activity = self._compose_activity(
                    profile=profile,
                    phase=phase,
                    knowledge=knowledge,
                    skill=skill,
                    week_index=index,
                    evidence=evidence,
                )
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
            clean_row["validation"] = self.validate_week(row=clean_row, phase=phase, skill=skill)
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
    ) -> str:
        profile = self._profile_for_method(method)
        timeline_specs = self._timeline_specs(grading_rows, total_units)
        timeline_schema = {
            code: f"Semana {week}: avance especifico del mismo producto"
            for code, week in timeline_specs
        }
        return json.dumps(
            {
                "role": "Experto en diseno curricular universitario",
                "task": "Proponer 3 productos acreditables integradores concretos para un curso universitario.",
                "rules": [
                    "El PA es un solo producto del curso con avances parciales.",
                    "Cada opcion debe tener justificacion y timeline_json separado por PA.",
                    "El producto debe ser verificable y coherente con el metodo.",
                    "Evita productos genericos como portafolio, informe o exposicion si no estan contextualizados al curso.",
                    "El titulo debe nombrar el objeto profesional concreto que el estudiante construira.",
                    "Si notebook_research_context existe, usalo como fuente principal para definir el producto.",
                    "No propongas actividades semanales; solo horizonte acreditable y avances PA.",
                    "timeline_json debe ser un objeto JSON con una clave por PA. No juntes varias semanas dentro de PA1.",
                    f"Usa exactamente estas claves para timeline_json: {', '.join(timeline_schema.keys())}.",
                    "Nivel: docencia universitaria. Tono academico, concreto y no escolar.",
                ],
                "course": curso or {},
                "method_profile": profile,
                "category": category,
                "grading_rows": grading_rows,
                "total_units": max(1, int(total_units or 1)),
                "expected_timeline_json": timeline_schema,
                "notebook_research_context": _clean_text(notebook_context_text)[:6000],
                "response_schema": {
                    "options": [
                        {
                            "category": category,
                            "title": "Nombre concreto del producto profesional, maximo 120 caracteres",
                            "justification": "Por que moviliza desempenos, metodo, evidencia y recomendaciones del contexto Notebook si existe",
                            "timeline_json": timeline_schema,
                        }
                    ]
                },
            },
            ensure_ascii=False,
        )

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
    ) -> str:
        ranges = _unit_week_ranges(total_units)
        start, end = ranges.get(unit_number, (1, 16))
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
                },
                "traceability_context": traceability_context,
                "disciplinary_context": extracted_context,
                "locked_weeks": locked_weeks,
                "locked_rows": locked_rows,
                "teacher_instruction": teacher_instruction,
                "hard_rules": [
                    "Cada activity debe redactarse en prosa docente continua, maximo dos oraciones.",
                    "Prohibido usar prefijos o etiquetas como Fase:, Momento:, Proposito:, Tecnica:, Tecnicas:, Evidencia: o Actividad:.",
                    "La fase metodologica debe integrarse naturalmente en la frase, por ejemplo: A partir de la fase de busqueda de fuentes, el estudiante...",
                    "La tecnica debe integrarse en prosa, por ejemplo: mediante debate academico y ficha de analisis.",
                    "No uses Inicio:, Desarrollo: ni Cierre: como etiquetas.",
                    "No repitas temas de traceability_context.covered_knowledge.",
                    "Respeta exactamente las semanas bloqueadas.",
                    "Aplica la triple coherencia sin volverla literal: fase del metodo + operacion sobre conocimiento + habilidad + tecnica + evidencia.",
                    "Usa preferentemente el estilo: A partir de..., el estudiante...",
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
                            "activity": "A partir de la fase metodologica, el estudiante realiza una operacion cognitiva sobre el conocimiento semanal movilizando la habilidad oficial. Lo desarrolla mediante una tecnica pertinente y concreta la evidencia indicada.",
                            "evidence": "evidencia verificable",
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
