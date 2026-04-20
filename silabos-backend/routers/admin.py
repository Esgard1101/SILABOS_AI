from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from auth.permissions import (
    get_current_user_record,
    get_user_scopes,
    require_permission,
    require_roles,
    check_course_scope,
)
from main import servicios
from models.schemas import (
    CourseCurriculumUpdate,
    MethodSkillLinkCreate,
    MethodSkillLinkUpdate,
    PerformanceCreate,
    PerformanceUpdate,
    SkillCreate,
    SkillUpdate,
    TeachingMethodCreate,
    TeachingMethodUpdate,
    UserPermissionOverrideCreate,
    UserRoleUpdate,
    UserScopeCreate,
)


class UpdateCourseSumillaRequest(BaseModel):
    sumilla: str

router = APIRouter(prefix="/admin", tags=["Admin"])


def _get_supabase():
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos no disponible",
        )
    return supabase


# ══════════════════════════════════════════════════════════════
# USUARIOS — aprobación y gestión
# ══════════════════════════════════════════════════════════════

@router.get("/users")
async def list_users(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    users = await supabase.listar_usuarios(status_filter)
    return {"success": True, "data": {"items": users}, "error": None}


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    updated = await supabase.actualizar_estado_usuario(user_id, "active", str(current_user["id"]))
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    updated = await supabase.actualizar_estado_usuario(user_id, "rejected", str(current_user["id"]))
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    try:
        updated = await supabase.actualizar_rol_usuario(
            user_id, payload.role, str(current_user["id"])
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.get("/users/{user_id}/scopes")
async def get_user_scopes_admin(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    scopes = await supabase.listar_scopes_usuario(user_id)
    return {"success": True, "data": {"items": scopes}, "error": None}


@router.post("/users/{user_id}/scopes")
async def assign_user_scope(
    user_id: str,
    payload: UserScopeCreate,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    scope = await supabase.asignar_scope_usuario(
        user_id, payload.scope_type, payload.scope_id, str(current_user["id"])
    )
    if not scope:
        raise HTTPException(status_code=400, detail="No se pudo asignar el scope")
    return {"success": True, "data": scope, "error": None}


@router.delete("/users/{user_id}/scopes/{scope_id}")
async def revoke_user_scope(
    user_id: str,
    scope_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    await supabase.revocar_scope_usuario(scope_id)
    return {"success": True, "data": None, "error": None}


@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    target = await supabase.obtener_usuario_por_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    effective = await supabase.resolve_effective_permissions(user_id, target.get("role", "docente"))
    overrides = await supabase.listar_overrides_usuario(user_id)
    return {"success": True, "data": {**effective, "override_list": overrides}, "error": None}


@router.post("/users/{user_id}/permissions/overrides")
async def create_user_override(
    user_id: str,
    payload: UserPermissionOverrideCreate,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    override = await supabase.crear_override_usuario(
        user_id, payload.permission_key, payload.effect, str(current_user["id"])
    )
    if not override:
        raise HTTPException(status_code=400, detail="No se pudo crear el override")
    return {"success": True, "data": override, "error": None}


@router.delete("/users/{user_id}/permissions/overrides/{override_id}")
async def delete_user_override(
    user_id: str,
    override_id: str,
    current_user: dict = Depends(require_roles("admin")),
):
    supabase = _get_supabase()
    await supabase.eliminar_override_usuario(override_id)
    return {"success": True, "data": None, "error": None}


# ══════════════════════════════════════════════════════════════
# MÉTODOS PEDAGÓGICOS — CRUD admin
# ══════════════════════════════════════════════════════════════

@router.get("/teaching-methods")
async def list_teaching_methods(
    include_archived: bool = Query(default=False),
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    methods = await supabase.listar_teaching_methods(include_archived=include_archived)
    return {"success": True, "data": {"items": methods}, "error": None}


@router.post("/teaching-methods")
async def create_teaching_method(
    payload: TeachingMethodCreate,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    method = await supabase.crear_teaching_method(payload.model_dump(), str(current_user["id"]))
    if not method:
        raise HTTPException(status_code=500, detail="No se pudo crear el método")
    return {"success": True, "data": method, "error": None}


@router.put("/teaching-methods/{method_id}")
async def update_teaching_method(
    method_id: str,
    payload: TeachingMethodUpdate,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    method = await supabase.actualizar_teaching_method(
        method_id, payload.model_dump(exclude_none=True), str(current_user["id"])
    )
    if not method:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    return {"success": True, "data": method, "error": None}


@router.delete("/teaching-methods/{method_id}")
async def archive_teaching_method(
    method_id: str,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    ok = await supabase.archivar_teaching_method(method_id, str(current_user["id"]))
    if not ok:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    return {"success": True, "data": None, "error": None}


# ── Vínculos método ↔ habilidad ──────────────────────────────

@router.get("/teaching-methods/{method_id}/skills")
async def list_method_skills(
    method_id: str,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    links = await supabase.listar_method_skill_links(method_id)
    return {"success": True, "data": {"items": links}, "error": None}


@router.post("/teaching-methods/{method_id}/skills")
async def add_method_skill(
    method_id: str,
    payload: MethodSkillLinkCreate,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    link = await supabase.crear_method_skill_link(
        method_id, payload.skill_id, payload.priority, payload.is_recommended
    )
    if not link:
        raise HTTPException(status_code=400, detail="No se pudo crear el vínculo")
    return {"success": True, "data": link, "error": None}


@router.put("/teaching-methods/{method_id}/skills/{link_id}")
async def update_method_skill(
    method_id: str,
    link_id: str,
    payload: MethodSkillLinkUpdate,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    link = await supabase.actualizar_method_skill_link(link_id, payload.priority, payload.is_recommended)
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
    return {"success": True, "data": link, "error": None}


@router.delete("/teaching-methods/{method_id}/skills/{link_id}")
async def remove_method_skill(
    method_id: str,
    link_id: str,
    current_user: dict = Depends(require_permission("catalog.methods.manage")),
):
    supabase = _get_supabase()
    await supabase.eliminar_method_skill_link(link_id)
    return {"success": True, "data": None, "error": None}


# ══════════════════════════════════════════════════════════════
# HABILIDADES — CRUD admin
# ══════════════════════════════════════════════════════════════

@router.get("/skills")
async def list_skills_admin(
    categoria: Optional[str] = Query(default=None),
    search: str = Query(default=""),
    include_archived: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=200),
    current_user: dict = Depends(require_permission("catalog.skills.manage")),
):
    supabase = _get_supabase()
    result = await supabase.listar_skills_admin(categoria, search, include_archived, page, page_size)
    return {"success": True, "data": result, "error": None}


@router.post("/skills")
async def create_skill(
    payload: SkillCreate,
    current_user: dict = Depends(require_permission("catalog.skills.manage")),
):
    supabase = _get_supabase()
    skill = await supabase.crear_skill(payload.model_dump(), str(current_user["id"]))
    if not skill:
        raise HTTPException(status_code=500, detail="No se pudo crear la habilidad")
    return {"success": True, "data": skill, "error": None}


@router.put("/skills/{skill_id}")
async def update_skill(
    skill_id: str,
    payload: SkillUpdate,
    current_user: dict = Depends(require_permission("catalog.skills.manage")),
):
    supabase = _get_supabase()
    skill = await supabase.actualizar_skill(
        skill_id, payload.model_dump(exclude_none=True), str(current_user["id"])
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")
    return {"success": True, "data": skill, "error": None}


@router.delete("/skills/{skill_id}")
async def archive_skill(
    skill_id: str,
    current_user: dict = Depends(require_permission("catalog.skills.manage")),
):
    supabase = _get_supabase()
    ok = await supabase.archivar_skill(skill_id, str(current_user["id"]))
    if not ok:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")
    return {"success": True, "data": None, "error": None}


# ══════════════════════════════════════════════════════════════
# CURSOS — currículo y sumilla
# ══════════════════════════════════════════════════════════════

@router.get("/courses")
async def list_courses_for_admin(
    program_id: Optional[str] = Query(default=None),
    search: str = Query(default=""),
    current_user: dict = Depends(require_permission("courses.curriculum.manage")),
):
    supabase = _get_supabase()
    items = await supabase.listar_cursos_admin(program_id=program_id, search=search)
    return {"success": True, "data": {"items": items}, "error": None}


@router.patch("/courses/{course_id}/sumilla")
async def update_course_sumilla(
    course_id: str,
    payload: UpdateCourseSumillaRequest,
    current_user: dict = Depends(require_permission("courses.curriculum.manage")),
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


@router.put("/courses/{course_id}/curriculum")
async def update_course_curriculum(
    course_id: str,
    payload: CourseCurriculumUpdate,
    current_user: dict = Depends(require_permission("courses.curriculum.manage")),
    user_scopes: list = Depends(get_user_scopes),
):
    supabase = _get_supabase()
    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    check_course_scope(current_user, curso, user_scopes)

    try:
        updated = await supabase.actualizar_curriculo_curso(
            course_id=course_id,
            data=payload.model_dump(exclude_none=True),
            changed_by=str(current_user["id"]),
            user_career_id=str(current_user.get("career_id") or ""),
            user_role=current_user.get("role", "docente"),
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return {"success": True, "data": updated, "error": None}


@router.get("/courses/{course_id}/curriculum-history")
async def get_curriculum_history(
    course_id: str,
    current_user: dict = Depends(require_permission("courses.curriculum.manage")),
):
    supabase = _get_supabase()
    items = await supabase.listar_historial_curriculo(course_id)
    return {"success": True, "data": {"items": items}, "error": None}


@router.get("/courses/{course_id}/sumilla-history")
async def get_course_sumilla_history(
    course_id: str,
    current_user: dict = Depends(require_roles("admin", "director", "coordinador")),
):
    supabase = _get_supabase()
    items = await supabase.listar_historial_sumilla(course_id)
    return {"success": True, "data": {"items": items}, "error": None}


# ══════════════════════════════════════════════════════════════
# DESEMPEÑOS (performances) por curso
# ══════════════════════════════════════════════════════════════

@router.get("/courses/{course_id}/performances")
async def list_performances(
    course_id: str,
    include_archived: bool = Query(default=False),
    current_user: dict = Depends(require_permission("courses.performances.manage")),
):
    supabase = _get_supabase()
    items = await supabase.listar_performances_curso(course_id, include_archived)
    return {"success": True, "data": {"items": items}, "error": None}


@router.post("/courses/{course_id}/performances")
async def create_performance(
    course_id: str,
    payload: PerformanceCreate,
    current_user: dict = Depends(require_permission("courses.performances.manage")),
    user_scopes: list = Depends(get_user_scopes),
):
    supabase = _get_supabase()
    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    check_course_scope(current_user, curso, user_scopes)

    perf = await supabase.crear_performance(course_id, payload.statement, str(current_user["id"]))
    if not perf:
        raise HTTPException(status_code=500, detail="No se pudo crear el desempeño")
    return {"success": True, "data": perf, "error": None}


@router.put("/courses/{course_id}/performances/{perf_id}")
async def update_performance(
    course_id: str,
    perf_id: str,
    payload: PerformanceUpdate,
    current_user: dict = Depends(require_permission("courses.performances.manage")),
    user_scopes: list = Depends(get_user_scopes),
):
    supabase = _get_supabase()
    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    check_course_scope(current_user, curso, user_scopes)

    perf = await supabase.actualizar_performance(perf_id, payload.statement, str(current_user["id"]))
    if not perf:
        raise HTTPException(status_code=404, detail="Desempeño no encontrado")
    return {"success": True, "data": perf, "error": None}


@router.delete("/courses/{course_id}/performances/{perf_id}")
async def archive_performance(
    course_id: str,
    perf_id: str,
    current_user: dict = Depends(require_permission("courses.performances.manage")),
    user_scopes: list = Depends(get_user_scopes),
):
    supabase = _get_supabase()
    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    check_course_scope(current_user, curso, user_scopes)

    ok = await supabase.archivar_performance(perf_id, str(current_user["id"]))
    if not ok:
        raise HTTPException(status_code=404, detail="Desempeño no encontrado")
    return {"success": True, "data": None, "error": None}
