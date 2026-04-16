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
