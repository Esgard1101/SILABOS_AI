from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from auth.auth_bearer import JWTBearer


async def get_current_user_record(user_id: str = Depends(JWTBearer())) -> dict:
    from main import servicios

    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos no disponible",
        )

    user = await supabase.obtener_usuario_por_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no tiene acceso activo",
        )

    return user


def require_roles(*roles: str) -> Callable:
    async def dependency(user: dict = Depends(get_current_user_record)) -> dict:
        if roles and user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción",
            )
        return user

    return dependency


def require_permission(permission_key: str) -> Callable:
    """
    Dependency que verifica si el usuario tiene un permiso efectivo.
    Permisos efectivos = plantilla de rol + overrides (allow/deny).
    admin siempre pasa sin consultar la tabla.
    """
    async def dependency(user: dict = Depends(get_current_user_record)) -> dict:
        role = user.get("role", "")
        if role == "admin":
            return user

        from main import servicios
        supabase = servicios.get("supabase")
        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        effective = await supabase.resolve_effective_permissions(
            str(user["id"]), role
        )
        if permission_key not in effective.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {permission_key}",
            )
        return user

    return dependency


def require_permission_or_roles(permission_key: str, *extra_roles: str) -> Callable:
    """Pasa si el usuario tiene el permiso O es uno de los roles extra."""
    async def dependency(user: dict = Depends(get_current_user_record)) -> dict:
        role = user.get("role", "")
        if role in ("admin", *extra_roles):
            return user

        from main import servicios
        supabase = servicios.get("supabase")
        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        effective = await supabase.resolve_effective_permissions(str(user["id"]), role)
        if permission_key not in effective.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso requerido: {permission_key}",
            )
        return user

    return dependency


async def get_user_scopes(user: dict = Depends(get_current_user_record)) -> list:
    """Devuelve los scopes activos del usuario (career/program IDs)."""
    from main import servicios
    supabase = servicios.get("supabase")
    if not supabase:
        return []
    return await supabase.listar_scopes_usuario(str(user["id"]))


def check_course_scope(user: dict, course: dict, user_scopes: list) -> None:
    """
    Valida que el usuario tenga acceso de escritura sobre el curso.
    Lanza HTTPException si está fuera de scope.
    - admin: siempre pasa
    - director: accede a cursos de su career (directa o vía scopes)
    - coordinador: accede a cursos de su program (vía scopes); no edita comunes
    """
    role = user.get("role", "")
    if role == "admin":
        return

    career_id = str(user.get("career_id") or "")
    course_career_id = str(course.get("career_id") or "")
    course_program_id = str(course.get("program_id") or "")
    is_common = bool(course.get("is_common"))

    scope_career_ids = {s["scope_id"] for s in user_scopes if s["scope_type"] == "career"}
    scope_program_ids = {s["scope_id"] for s in user_scopes if s["scope_type"] == "program"}

    if role == "director":
        allowed_careers = scope_career_ids | ({career_id} if career_id else set())
        if course_career_id not in allowed_careers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Fuera de tu scope de carrera",
            )
        return

    if role == "coordinador":
        if is_common:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los cursos comunes solo pueden ser editados por director o admin",
            )
        allowed_programs = scope_program_ids
        if not allowed_programs or course_program_id not in allowed_programs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Fuera de tu scope de programa",
            )
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Sin acceso al módulo admin",
    )
