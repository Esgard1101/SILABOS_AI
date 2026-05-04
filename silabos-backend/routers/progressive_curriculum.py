"""Endpoints del motor progresivo de contenido curricular.

Estos endpoints son steps adicionales del wizard v3. No reemplazan los pasos
existentes; agregan el flujo de producto integrador, contexto por unidad,
generacion didactica y ensamblaje final.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from auth.permissions import get_current_user_record
from models.schemas import APIResponse
from services.progressive_curriculum_engine import get_progressive_curriculum_engine


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
    saved = await supabase.guardar_progressive_assembly(
        syllabus_id,
        assembled,
        user_id=user_id,
    )
    if not saved:
        raise HTTPException(500, "No se pudo guardar el ensamblaje final")
    return APIResponse(success=True, data=saved, error=None)
