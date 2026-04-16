from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from auth.permissions import require_roles
from main import servicios

router = APIRouter(prefix="/admin", tags=["Admin"])


def _get_supabase():
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos no disponible",
        )
    return supabase


class UpdateCourseSumillaRequest(BaseModel):
    sumilla: str = Field(min_length=1)


@router.get("/users")
async def list_users(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: dict = Depends(require_roles("admin")),
):
    del current_user
    supabase = _get_supabase()
    users = await supabase.listar_usuarios(status_filter)
    return {"success": True, "data": {"items": users}, "error": None}


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    updated = await supabase.actualizar_estado_usuario(
        user_id,
        "active",
        str(current_user["id"]),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    updated = await supabase.actualizar_estado_usuario(
        user_id,
        "rejected",
        str(current_user["id"]),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.get("/courses")
async def list_courses_for_admin(
    program_id: Optional[str] = Query(default=None),
    search: str = Query(default=""),
    current_user: dict = Depends(require_roles("admin")),
):
    del current_user
    supabase = _get_supabase()
    items = await supabase.listar_cursos_admin(program_id=program_id, search=search)
    return {"success": True, "data": {"items": items}, "error": None}


@router.patch("/courses/{course_id}/sumilla")
async def update_course_sumilla(
    course_id: str,
    payload: UpdateCourseSumillaRequest,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    updated = await supabase.actualizar_sumilla_curso(
        course_id=course_id,
        new_sumilla=payload.sumilla.strip(),
        changed_by=str(current_user["id"]),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.get("/courses/{course_id}/sumilla-history")
async def get_course_sumilla_history(
    course_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    del current_user
    supabase = _get_supabase()
    items = await supabase.listar_historial_sumilla(course_id)
    return {"success": True, "data": {"items": items}, "error": None}
