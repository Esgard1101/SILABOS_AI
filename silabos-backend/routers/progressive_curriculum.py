"""Endpoints del motor progresivo de contenido curricular.

Estos endpoints son steps adicionales del wizard v3. No reemplazan los pasos
existentes; agregan el flujo de producto integrador, contexto por unidad,
generacion didactica y ensamblaje final.
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from auth.permissions import get_current_user_record
from models.schemas import APIResponse
from services.bibliography_parser import refs_a_bibliografia_json
from services.progressive_curriculum_engine import (
    ProgressiveContentGenerationError,
    get_progressive_curriculum_engine,
)


router = APIRouter(tags=["Motor Curricular Progresivo v1"])


class ProductSuggestInput(BaseModel):
    category: str = "Libre de proponer por IA"
    notebook_context_text: str = ""


class ProductSelectInput(BaseModel):
    option_id: str


class UnitContextInput(BaseModel):
    raw_context_text: str = ""


class UnitGenerateInput(BaseModel):
    raw_context_text: str = ""
    teacher_instruction: str = ""
    locked_weeks: list[int] = Field(default_factory=list)


class UnitRegenerateInput(BaseModel):
    teacher_instruction: str = ""
    locked_weeks: list[int] = Field(default_factory=list)
    raw_context_text: str = ""


class UnitApproveInput(BaseModel):
    generation_id: str | None = None


class WeekLockInput(BaseModel):
    locked: bool = True


class WeekPatchInput(BaseModel):
    performance: str | None = None
    required_skills: list[str] | None = None
    skill: str | None = None
    knowledge: str | None = None
    activity: str | None = None
    evidence: str | None = None
    phase: str | None = None
    locked: bool | None = None


def _sv(request: Request):
    from main import servicios

    return servicios


def _require_db(servicios):
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")
    return supabase


def _optional_ai(servicios):
    return servicios.get("gemini")


def _current_user_id(current_user: dict) -> str | None:
    return None if current_user.get("role") == "admin" else str(current_user["id"])


def _validate_force_provider(force_provider: str | None) -> str | None:
    if force_provider is None:
        return None
    value = force_provider.strip().lower()
    if not value:
        return None
    if value not in {"gemini", "openrouter"}:
        raise HTTPException(400, "force_provider debe ser gemini u openrouter")
    return value


def _dump_model(model: BaseModel) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=True)
    return model.dict(exclude_unset=True)


def _as_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    return []


def _performance_text(item: Any) -> str:
    if isinstance(item, dict):
        return str(
            item.get("statement")
            or item.get("descripcion")
            or item.get("description")
            or item.get("desempeno")
            or item.get("text")
            or ""
        ).strip()
    return str(item or "").strip()


def _clean_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _merge_unique_texts(*groups: Any, limit: int = 80) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for group in groups:
        values = group if isinstance(group, list) else [group]
        for item in values:
            if isinstance(item, dict):
                raw = (
                    item.get("referencia")
                    or item.get("reference")
                    or item.get("ref_text")
                    or item.get("apa_format")
                    or item.get("text")
                    or item.get("title")
                )
            else:
                raw = item
            text = _clean_text(raw)
            key = " ".join(text.lower().split())
            if key and key not in seen:
                seen.add(key)
                merged.append(text)
            if len(merged) >= limit:
                return merged
    return merged


def _performance_export_rows(performances: list[Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for index, item in enumerate(performances or []):
        if isinstance(item, dict):
            statement = _clean_text(
                item.get("statement")
                or item.get("descripcion")
                or item.get("description")
                or item.get("desempeno")
                or item.get("text"),
                f"Desempeno {index + 1}",
            )
            code = _clean_text(item.get("code") or item.get("codigo"), f"D{index + 1}")
        else:
            statement = _clean_text(item, f"Desempeno {index + 1}")
            code = f"D{index + 1}"
        rows.append({"codigo": code, "descripcion": statement, "statement": statement})
    return rows


def _grading_criteria(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    criteria: list[dict[str, Any]] = []
    for index, row in enumerate(rows or []):
        if not isinstance(row, dict):
            continue
        criteria.append(
            {
                "nombre": _clean_text(
                    row.get("evidencia")
                    or row.get("nombre")
                    or row.get("name"),
                    f"Evaluacion {index + 1}",
                ),
                "porcentaje": row.get("porcentaje")
                if row.get("porcentaje") is not None
                else row.get("percentage", 0),
                "sigla": _clean_text(row.get("sigla") or row.get("code"), f"EV{index + 1}"),
                "cronograma": _clean_text(row.get("cronograma") or row.get("schedule"), "-"),
                "descripcion": _clean_text(row.get("evidencia") or row.get("descripcion"), "-"),
            }
        )
    return criteria


def _methodology_text(method: dict | str | None, course_name: str = "") -> str:
    if isinstance(method, dict):
        name = _clean_text(method.get("name") or method.get("selected_method_name"), "metodologias activas")
        description = _clean_text(method.get("description") or method.get("descripcion"))
        teacher_role = _clean_text(method.get("rol_docente"))
        student_role = _clean_text(method.get("rol_estudiante"))
    else:
        name = _clean_text(method, "metodologias activas")
        description = teacher_role = student_role = ""
    prefix = f"La asignatura de {course_name}" if course_name else "La asignatura"
    parts = [
        f"{prefix} se desarrolla mediante {name}, articulando el trabajo semanal con evidencias verificables y retroalimentacion docente.",
    ]
    if description:
        parts.append(description)
    if teacher_role:
        parts.append(f"El docente orienta el proceso mediante {teacher_role.lower()}.")
    if student_role:
        parts.append(f"El estudiante participa mediante {student_role.lower()}.")
    return " ".join(parts)


def _tutorial_text(course_name: str = "") -> str:
    course_fragment = f" del curso de {course_name}" if course_name else " del curso"
    return (
        f"Las actividades de tutoria academica{course_fragment} se desarrollan de manera presencial o virtual, "
        "segun la necesidad del estudiante. Se prioriza el acompanamiento para resolver dificultades de comprension, "
        "mejorar los avances del producto acreditable y fortalecer la sustentacion de evidencias."
    )


def _clean_unit_title(value: Any, unit_number: int) -> str:
    text = _clean_text(value)
    if not text:
        return ""
    text = re.sub(r"^\s*(?:unidad|u)\s*(?:[ivxlcdm]+|\d+)\s*[:.\-–—]?\s*", "", text, flags=re.IGNORECASE)
    text = " ".join(text.split()).strip(" .:-")
    if not text or text.lower() in {f"unidad {unit_number}", f"u{unit_number}", f"u {unit_number}"}:
        return ""
    return text[:120].strip()


def _knowledge_texts_from_unit(unit: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for item in unit.get("knowledge") or []:
        values.append(_clean_text(item))
    for tema in unit.get("temas") or []:
        if isinstance(tema, dict):
            values.append(_clean_text(tema.get("conocimientos") or tema.get("tema")))
        else:
            values.append(_clean_text(tema))
    for week in unit.get("weeks") or []:
        if isinstance(week, dict):
            knowledge = week.get("knowledge") or week.get("conocimientos")
            if isinstance(knowledge, list):
                values.extend(_clean_text(item) for item in knowledge)
            else:
                values.append(_clean_text(knowledge))
    return [value for value in values if value]


def _title_from_content_unit(content_unit: dict[str, Any], fallback_unit: dict[str, Any], unit_number: int) -> str:
    direct = _clean_unit_title(
        content_unit.get("title")
        or content_unit.get("titulo")
        or content_unit.get("nombre"),
        unit_number,
    )
    if direct:
        return direct
    candidates = _knowledge_texts_from_unit(content_unit) or _knowledge_texts_from_unit(fallback_unit)
    for candidate in candidates:
        title = _clean_unit_title(candidate, unit_number)
        if title and title.lower() not in {"contenido de la semana", "tema"}:
            return title
    fallback_direct = _clean_unit_title(fallback_unit.get("titulo") or fallback_unit.get("title"), unit_number)
    if fallback_direct:
        return fallback_direct
    performance = _clean_text(
        content_unit.get("ra_unidad")
        or fallback_unit.get("ra_unidad")
        or fallback_unit.get("desempeno")
        or fallback_unit.get("logro")
    )
    words = performance.split()
    if len(words) >= 5:
        return " ".join(words[:9]).strip(" .")
    return ""


def _apply_unit_titles_from_content(enriched: dict[str, Any], content: dict[str, Any]) -> None:
    units = enriched.get("unidades_tematicas")
    if not isinstance(units, list):
        return
    content_plan = content.get("content_plan") if isinstance(content, dict) else {}
    plan_units = content_plan.get("units") if isinstance(content_plan, dict) else []
    plan_by_number = {
        int(unit.get("unit_number") or index + 1): unit
        for index, unit in enumerate(plan_units or [])
        if isinstance(unit, dict)
    }
    for index, unit in enumerate(units):
        if not isinstance(unit, dict):
            continue
        unit_number = int(unit.get("unit_number") or unit.get("numero") or index + 1)
        title = _title_from_content_unit(plan_by_number.get(unit_number, {}), unit, unit_number)
        unit["titulo"] = title
    progressive = enriched.get("progressive_curriculum")
    if isinstance(progressive, dict) and isinstance(progressive.get("units"), list):
        title_by_number = {
            int(unit.get("unit_number") or unit.get("numero") or index + 1): unit.get("titulo")
            for index, unit in enumerate(units)
            if isinstance(unit, dict)
        }
        for index, unit in enumerate(progressive["units"]):
            if isinstance(unit, dict):
                unit_number = int(unit.get("unit_number") or unit.get("numero") or index + 1)
                if title_by_number.get(unit_number):
                    unit["titulo"] = title_by_number[unit_number]


async def _enrich_assembly_with_previous_steps(
    *,
    supabase,
    syllabus_id: str,
    assembled: dict[str, Any],
    current_user: dict,
    user_id: str | None,
) -> dict[str, Any]:
    context = await _course_context(
        supabase=supabase,
        syllabus_id=syllabus_id,
        user_id=user_id,
    )
    payload = context["payload"] or {}
    draft = context["draft"] or {}
    curso = context["curso"] or {}
    purpose = payload.get("purpose") or {}
    content = payload.get("content") or {}
    bibliography = payload.get("bibliography") or {}
    method = context.get("method") or payload.get("method") or {}
    grading_rows = context.get("grading_rows") or []
    course_id = context.get("course_id") or ""
    datos_payload = payload.get("datos_generales") or {}

    selected_program_id = (
        _clean_text(datos_payload.get("program_id"))
        or _clean_text(payload.get("program_id"))
        or _clean_text(draft.get("program_id"))
        or _clean_text(curso.get("program_id"))
    )
    selected_program = await supabase.obtener_programa(selected_program_id) if selected_program_id else None

    course_refs = await supabase.obtener_referencias_curso(str(course_id)) if course_id else []
    bibliography_refs = _merge_unique_texts(
        course_refs,
        bibliography.get("references") if isinstance(bibliography, dict) else [],
    )

    teacher_name = _clean_text(
        current_user.get("full_name")
        or draft.get("teacher_name")
        or datos_payload.get("docente")
    )
    teacher_email = _clean_text(
        current_user.get("email")
        or datos_payload.get("docente_email")
    )
    fecha_inicio = _clean_text(datos_payload.get("fecha_inicio"))
    fecha_fin = _clean_text(datos_payload.get("fecha_fin"))
    competencia = _clean_text(
        curso.get("competencia_egreso")
        or purpose.get("competencia")
        or payload.get("competencia_profesional")
    )
    resultado = _clean_text(
        curso.get("resultado_aprendizaje")
        or payload.get("resultado_aprendizaje")
        or curso.get("capacidad")
        or purpose.get("capacidad")
    )
    capacidad = _clean_text(curso.get("capacidad") or purpose.get("capacidad") or resultado)
    course_name = _clean_text(curso.get("name") or datos_payload.get("nombre_curso"))
    method_name = _clean_text(
        method.get("name") if isinstance(method, dict) else method
    ) or _clean_text((payload.get("method") or {}).get("selected_method_name"))
    rsu_text = _clean_text(content.get("responsabilidad_social"))
    if not rsu_text:
        rsu_text = (
            "Los estudiantes desarrollan una actividad de aplicacion vinculada al curso, "
            "orientada a responder una necesidad concreta del entorno academico o comunitario."
        )

    enriched = dict(assembled or {})
    enriched.update(
        {
            "_assembled": True,
            "_wizard_version": "v3-progressive",
            "course_id": str(course_id),
            "semester": draft.get("semester") or datos_payload.get("semestre") or "",
            "teacher_name": teacher_name,
            "datos_generales": {
                "course_id": str(course_id),
                "nombre_curso": course_name,
                "creditos": curso.get("credits", ""),
                "semestre": draft.get("semester") or datos_payload.get("semestre") or "",
                "periodo_academico": draft.get("semester") or datos_payload.get("semestre") or "",
                "docente": teacher_name,
                "docente_email": teacher_email,
                "codigo": curso.get("code", ""),
                "program_id": selected_program_id,
                "facultad": (selected_program or {}).get("faculty_name") or curso.get("faculty_name", ""),
                "carrera": (selected_program or {}).get("career_name") or curso.get("career_name", ""),
                "escuela_profesional": (selected_program or {}).get("career_name") or curso.get("career_name", ""),
                "programa_estudios": (selected_program or {}).get("program_name") or curso.get("program_name", ""),
                "modalidad": _clean_text(datos_payload.get("modalidad"), "Presencial"),
                "prerrequisito": curso.get("prerequisites", ""),
                "horas_teoria": curso.get("hours_theory", ""),
                "horas_practica": curso.get("hours_practice", ""),
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
            },
            "sumilla": _clean_text(curso.get("sumilla") or payload.get("sumilla")),
            "competencia_profesional": competencia,
            "competencias": [competencia] if competencia else [],
            "competencia_egreso": competencia,
            "resultados_aprendizaje": [resultado] if resultado else [],
            "resultado_aprendizaje": resultado,
            "capacidad_del_curso": capacidad,
            "desempenos": _performance_export_rows(context.get("performances") or purpose.get("performances") or []),
            "metodologia": _clean_text(payload.get("metodologia")) or _methodology_text(method, course_name),
            "tutoria": _clean_text(payload.get("tutoria")) or _tutorial_text(course_name),
            "responsabilidad_social": {
                "actividadPropuesta": rsu_text,
                "descripcion": rsu_text,
            },
            "responsabilidadSocial": {
                "actividadPropuesta": rsu_text,
                "descripcion": rsu_text,
            },
            "method_id": _clean_text((payload.get("method") or {}).get("selected_method_id")),
            "method_short_name": method_name,
            "methodology_json": method if isinstance(method, dict) else {"name": method_name},
            "sistema_evaluacion": {
                "criterios": _grading_criteria(grading_rows),
                "nota_aprobatoria": 14,
            },
            "bibliografia": refs_a_bibliografia_json(bibliography_refs),
            "bibliography": bibliography_refs,
            "bibliography_sources": _as_list(bibliography.get("sources_consulted")) if isinstance(bibliography, dict) else [],
        }
    )
    _apply_unit_titles_from_content(enriched, content)
    return enriched


async def _course_context(
    *,
    supabase,
    syllabus_id: str,
    user_id: str | None,
) -> dict:
    draft = await supabase.obtener_draft_progresivo(syllabus_id, user_id)
    if not draft:
        raise HTTPException(404, "Draft no encontrado")

    payload = draft.get("payload_json") or {}
    course_id = (
        (payload.get("course_snapshot") or {}).get("course_id")
        or (payload.get("datos_generales") or {}).get("course_id")
        or draft.get("course_id")
    )
    if not course_id:
        raise HTTPException(400, "No se encontro course_id en el draft")

    curso = await supabase.obtener_curso(str(course_id))
    if not curso:
        raise HTTPException(404, "Curso no encontrado")

    official_performances = await supabase.listar_performances_curso(
        str(course_id),
        include_archived=False,
    )
    payload_performances = _as_list((payload.get("purpose") or {}).get("performances"))
    performances = official_performances or payload_performances

    method_block = payload.get("method") or {}
    method: dict | str | None = None
    selected_method_id = method_block.get("selected_method_id") or method_block.get("suggested_method_id")
    if selected_method_id:
        method = await supabase.obtener_teaching_method(str(selected_method_id))
    if not method:
        method = {
            "id": selected_method_id,
            "name": method_block.get("selected_method_name")
            or method_block.get("method_name")
            or method_block.get("suggested_method_name")
            or "",
            "code": method_block.get("selected_method_code")
            or method_block.get("method_code")
            or method_block.get("suggested_method_code")
            or "",
        }

    state = await supabase.obtener_progressive_curriculum_state(syllabus_id, user_id)
    selected_product = None
    if state:
        selected_product = (state.get("progressive_curriculum") or {}).get("selected_product")
        if not selected_product:
            selected = [
                item for item in (state.get("product_options") or [])
                if item and item.get("selected")
            ]
            selected_product = selected[0] if selected else None
    selected_product = selected_product or (payload.get("progressive_curriculum") or {}).get("selected_product")

    return {
        "draft": draft,
        "payload": payload,
        "course_id": str(course_id),
        "curso": curso,
        "performances": performances,
        "content_block": payload.get("content") or {},
        "method": method,
        "grading_rows": _as_list((payload.get("grading") or {}).get("rows")),
        "product_option": selected_product or {},
    }


def _performance_for_unit(performances: list, unit_number: int) -> Any:
    if not performances:
        return ""
    index = max(0, min(len(performances) - 1, int(unit_number) - 1))
    return performances[index]


def _locked_rows_from_generation(generation: dict | None, locked_weeks: list[int]) -> list[dict]:
    if not generation:
        return []
    output = generation.get("output_json") or []
    if isinstance(output, dict):
        output = output.get("weeks") or []
    locked = {int(week) for week in locked_weeks if str(week).isdigit()}
    return [
        dict(row)
        for row in output
        if isinstance(row, dict) and int(row.get("week") or 0) in locked
    ]


async def _generate_or_regenerate_unit(
    *,
    syllabus_id: str,
    unit_number: int,
    body: UnitGenerateInput | UnitRegenerateInput,
    request: Request,
    current_user: dict,
    force_provider: str | None,
    parent_generation_id: str | None = None,
) -> dict:
    servicios = _sv(request)
    supabase = _require_db(servicios)
    engine = get_progressive_curriculum_engine()
    ai_service = _optional_ai(servicios)
    user_id = _current_user_id(current_user)

    context = await _course_context(supabase=supabase, syllabus_id=syllabus_id, user_id=user_id)
    performances = context["performances"]
    total_units = max(1, len(performances))
    if unit_number < 1 or unit_number > total_units:
        raise HTTPException(400, f"Unidad invalida. El curso tiene {total_units} unidad(es)")

    raw_context_text = (body.raw_context_text or "").strip()
    if raw_context_text:
        extracted_context = await engine.extract_unit_context(
            raw_context_text=raw_context_text,
            ai_service=ai_service,
            force_provider=force_provider,
        )
        await supabase.upsert_unit_context(
            syllabus_id,
            unit_number,
            raw_context_text,
            extracted_context,
            notebook_prompt_version="progressive-v1",
            user_id=user_id,
        )
    else:
        saved_context = await supabase.obtener_unit_context(syllabus_id, unit_number, user_id)
        extracted_context = (saved_context or {}).get("extracted_context_json") or {}

    approved_generations = await supabase.listar_unit_generations(
        syllabus_id,
        status="approved",
        user_id=user_id,
    )
    approved_previous = [
        generation for generation in approved_generations
        if int(generation.get("unit_number") or 0) < unit_number
    ]
    traceability_context = engine.build_traceability_context(approved_previous)

    latest = await supabase.obtener_latest_unit_generation(syllabus_id, unit_number, user_id)
    inherited_locks = latest.get("locked_weeks_json") if latest else []
    locked_weeks = body.locked_weeks or inherited_locks or []
    locked_weeks = [int(week) for week in locked_weeks if str(week).isdigit()]
    locked_rows = _locked_rows_from_generation(latest, locked_weeks)

    try:
        result = await engine.generate_unit(
            unit_number=unit_number,
            total_units=total_units,
            curso=context["curso"],
            method=context["method"],
            performance=_performance_for_unit(performances, unit_number),
            content_block=context["content_block"],
            grading_rows=context["grading_rows"],
            product_option=context["product_option"],
            extracted_context=extracted_context,
            traceability_context=traceability_context,
            locked_weeks=locked_weeks,
            locked_rows=locked_rows,
            teacher_instruction=body.teacher_instruction or "",
            ai_service=ai_service,
            force_provider=force_provider,
        )
    except ProgressiveContentGenerationError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "PROGRESSIVE_UNIT_AI_FAILED",
                "message": str(exc),
                "retryable": True,
                "unit_number": unit_number,
            },
        ) from exc

    generation = await supabase.guardar_unit_generation(
        syllabus_id=syllabus_id,
        unit_number=unit_number,
        output_json=result["weeks"],
        validation_summary_json=result["validation_summary"],
        traceability_context_json=traceability_context,
        locked_weeks_json=locked_weeks,
        teacher_instruction=body.teacher_instruction or "",
        parent_generation_id=parent_generation_id,
        status="draft",
        user_id=user_id,
    )
    if not generation:
        raise HTTPException(500, "No se pudo guardar la generacion de la unidad")

    await supabase.guardar_week_validations(
        generation["id"],
        syllabus_id,
        unit_number,
        result["weeks"],
    )
    result["generation_id"] = generation["id"]
    result["version"] = generation.get("version")
    result["locked_weeks"] = locked_weeks
    return result


@router.get("/syllabi/{syllabus_id}/progressive/state", response_model=APIResponse)
async def obtener_progressive_state(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    state = await supabase.obtener_progressive_curriculum_state(
        syllabus_id,
        _current_user_id(current_user),
    )
    if not state:
        raise HTTPException(404, "Estado progresivo no encontrado")
    return APIResponse(success=True, data=state, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/products/suggest", response_model=APIResponse)
async def sugerir_productos_integradores(
    syllabus_id: str,
    body: ProductSuggestInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
    force_provider: str | None = Query(default=None),
):
    force_provider = _validate_force_provider(force_provider)
    servicios = _sv(request)
    supabase = _require_db(servicios)
    engine = get_progressive_curriculum_engine()
    user_id = _current_user_id(current_user)
    context = await _course_context(supabase=supabase, syllabus_id=syllabus_id, user_id=user_id)

    options = await engine.suggest_products(
        curso=context["curso"],
        method=context["method"],
        grading_rows=context["grading_rows"],
        category=body.category,
        notebook_context_text=body.notebook_context_text,
        total_units=len(context["performances"] or []) or 1,
        ai_service=_optional_ai(servicios),
        force_provider=force_provider,
    )
    saved = await supabase.guardar_curricular_product_options(
        syllabus_id,
        options,
        user_id=user_id,
    )
    await supabase.guardar_ai_suggestion(
        syllabus_id,
        "progressive_product_options",
        {"category": body.category, "has_notebook_context": bool(body.notebook_context_text.strip())},
        {"options": saved or options},
        user_id=user_id,
    )
    return APIResponse(success=True, data={"options": saved or options}, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/products/select", response_model=APIResponse)
async def seleccionar_producto_integrador(
    syllabus_id: str,
    body: ProductSelectInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    selected = await supabase.seleccionar_curricular_product_option(
        syllabus_id,
        body.option_id,
        user_id=_current_user_id(current_user),
    )
    if not selected:
        raise HTTPException(404, "Opcion de producto no encontrada")
    return APIResponse(success=True, data=selected, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/unit-contexts/{unit_number}/extract", response_model=APIResponse)
async def extraer_contexto_unidad(
    syllabus_id: str,
    unit_number: int,
    body: UnitContextInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
    force_provider: str | None = Query(default=None),
):
    force_provider = _validate_force_provider(force_provider)
    servicios = _sv(request)
    supabase = _require_db(servicios)
    engine = get_progressive_curriculum_engine()
    extracted = await engine.extract_unit_context(
        raw_context_text=body.raw_context_text,
        ai_service=_optional_ai(servicios),
        force_provider=force_provider,
    )
    saved = await supabase.upsert_unit_context(
        syllabus_id,
        unit_number,
        body.raw_context_text,
        extracted,
        notebook_prompt_version="progressive-v1",
        user_id=_current_user_id(current_user),
    )
    if not saved:
        raise HTTPException(404, "No se pudo guardar el contexto de unidad")
    return APIResponse(success=True, data=saved, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/units/{unit_number}/generate", response_model=APIResponse)
async def generar_unidad_progresiva(
    syllabus_id: str,
    unit_number: int,
    body: UnitGenerateInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
    force_provider: str | None = Query(default=None),
):
    result = await _generate_or_regenerate_unit(
        syllabus_id=syllabus_id,
        unit_number=unit_number,
        body=body,
        request=request,
        current_user=current_user,
        force_provider=_validate_force_provider(force_provider),
    )
    return APIResponse(success=True, data=result, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/units/{unit_number}/regenerate", response_model=APIResponse)
async def regenerar_unidad_progresiva(
    syllabus_id: str,
    unit_number: int,
    body: UnitRegenerateInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
    force_provider: str | None = Query(default=None),
):
    supabase = _require_db(_sv(request))
    latest = await supabase.obtener_latest_unit_generation(
        syllabus_id,
        unit_number,
        _current_user_id(current_user),
    )
    if not latest:
        raise HTTPException(404, "No existe una unidad previa para regenerar")
    result = await _generate_or_regenerate_unit(
        syllabus_id=syllabus_id,
        unit_number=unit_number,
        body=body,
        request=request,
        current_user=current_user,
        force_provider=_validate_force_provider(force_provider),
        parent_generation_id=latest.get("id"),
    )
    return APIResponse(success=True, data=result, error=None)


@router.patch("/syllabi/{syllabus_id}/progressive/units/{unit_number}/weeks/{week}/lock", response_model=APIResponse)
async def actualizar_lock_semana(
    syllabus_id: str,
    unit_number: int,
    week: int,
    body: WeekLockInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    generation = await supabase.actualizar_week_lock(
        syllabus_id,
        unit_number,
        week,
        body.locked,
        user_id=_current_user_id(current_user),
    )
    if not generation:
        raise HTTPException(404, "Generacion o semana no encontrada")
    return APIResponse(success=True, data=generation, error=None)


@router.patch("/syllabi/{syllabus_id}/progressive/units/{unit_number}/weeks/{week}", response_model=APIResponse)
async def editar_semana_unidad(
    syllabus_id: str,
    unit_number: int,
    week: int,
    body: WeekPatchInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    engine = get_progressive_curriculum_engine()
    patch = _dump_model(body)
    if not patch:
        raise HTTPException(400, "No se enviaron cambios")
    current = await supabase.obtener_latest_unit_generation(
        syllabus_id,
        unit_number,
        _current_user_id(current_user),
    )
    if not current:
        raise HTTPException(404, "Generacion de unidad no encontrada")

    weeks = current.get("output_json") or []
    if isinstance(weeks, dict):
        weeks = weeks.get("weeks") or []
    target = next((dict(row) for row in weeks if int(row.get("week") or 0) == int(week)), None)
    if not target:
        raise HTTPException(404, "Semana no encontrada")
    target.update(patch)
    phase = target.get("phase") or ""
    skill = target.get("skill") or ((target.get("required_skills") or [""])[0] if target.get("required_skills") else "")
    target["validation"] = engine.validate_week(row=target, phase=phase, skill=skill)
    patch["validation"] = target["validation"]

    updated = await supabase.actualizar_unit_week(
        syllabus_id,
        unit_number,
        week,
        patch,
        user_id=_current_user_id(current_user),
    )
    if not updated:
        raise HTTPException(500, "No se pudo actualizar la semana")
    output = updated.get("output_json") or []
    await supabase.guardar_week_validations(updated["id"], syllabus_id, unit_number, output)
    return APIResponse(success=True, data=updated, error=None)


@router.post("/syllabi/{syllabus_id}/progressive/units/{unit_number}/approve", response_model=APIResponse)
async def aprobar_unidad_progresiva(
    syllabus_id: str,
    unit_number: int,
    body: UnitApproveInput,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    approved = await supabase.aprobar_unit_generation(
        syllabus_id,
        unit_number,
        generation_id=body.generation_id,
        user_id=_current_user_id(current_user),
    )
    if not approved:
        raise HTTPException(404, "Generacion de unidad no encontrada")

    engine = get_progressive_curriculum_engine()
    approved_generations = await supabase.listar_unit_generations(
        syllabus_id,
        status="approved",
        user_id=_current_user_id(current_user),
    )
    traceability = engine.build_traceability_context(approved_generations)
    return APIResponse(
        success=True,
        data={"approved": approved, "traceability_context": traceability},
        error=None,
    )


@router.post("/syllabi/{syllabus_id}/progressive/assemble", response_model=APIResponse)
async def ensamblar_progressive_curriculum(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user_record),
):
    supabase = _require_db(_sv(request))
    user_id = _current_user_id(current_user)
    approved_generations = await supabase.listar_unit_generations(
        syllabus_id,
        status="approved",
        user_id=user_id,
    )
    if not approved_generations:
        raise HTTPException(400, "No hay unidades aprobadas para ensamblar")
    engine = get_progressive_curriculum_engine()
    assembled = engine.assemble_units(approved_generations)
    assembled = await _enrich_assembly_with_previous_steps(
        supabase=supabase,
        syllabus_id=syllabus_id,
        assembled=assembled,
        current_user=current_user,
        user_id=user_id,
    )
    saved = await supabase.guardar_progressive_assembly(
        syllabus_id,
        assembled,
        user_id=user_id,
    )
    if not saved:
        raise HTTPException(500, "No se pudo guardar el ensamblaje final")
    return APIResponse(success=True, data=saved, error=None)
