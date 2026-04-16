from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.auth_bearer import JWTBearer
from auth.auth_handler import create_access_token
from auth.google_auth import verify_google_token

from main import servicios

router = APIRouter(tags=["Auth"])


def _get_supabase():
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de base de datos no disponible",
        )
    return supabase


def _serialize_user(user: dict) -> dict:
    return {
        "id": str(user["id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "career_id": str(user["career_id"]) if user.get("career_id") else None,
        "status": user.get("status", "active"),
        "auth_provider": user.get("auth_provider", "local"),
    }


def _build_account_state_response(account_status: str, message: str, user: dict | None = None) -> dict:
    return {
        "success": True,
        "data": {
            "account_status": account_status,
            "message": message,
            "user": _serialize_user(user) if user else None,
        },
        "error": None,
    }


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleTokenRequest(BaseModel):
    id_token: str


class GoogleRegisterRequest(GoogleTokenRequest):
    career_id: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    career_id: str | None
    status: str
    auth_provider: str


@router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    supabase = _get_supabase()

    user = await supabase.obtener_usuario_por_email(credentials.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    import bcrypt

    if not bcrypt.checkpw(
        credentials.password.encode("utf-8"),
        user["password_hash"].encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    user_status = user.get("status", "active")
    if user_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está pendiente de aprobación",
        )
    if user_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu solicitud de acceso fue rechazada",
        )

    access_token = create_access_token(user_id=str(user["id"]))
    return LoginResponse(access_token=access_token, user=_serialize_user(user))


@router.post("/auth/google")
async def login_with_google(payload: GoogleTokenRequest):
    supabase = _get_supabase()
    identity = verify_google_token(payload.id_token)

    user = await supabase.obtener_usuario_por_google_sub(identity["sub"])
    if not user:
        user = await supabase.obtener_usuario_por_email(identity["email"])

    if not user:
        return _build_account_state_response(
            "not_registered",
            "Tu cuenta aún no está registrada. Solicita acceso primero.",
        )

    if user.get("google_sub") != identity["sub"]:
        user = await supabase.vincular_google_usuario(
            user_id=str(user["id"]),
            google_sub=identity["sub"],
            full_name=identity["full_name"],
            email=identity["email"],
        )

    user_status = (user or {}).get("status", "active")
    if user_status == "pending":
        return _build_account_state_response(
            "pending",
            "Tu solicitud está pendiente de aprobación por un administrador.",
            user,
        )
    if user_status == "rejected":
        return _build_account_state_response(
            "rejected",
            "Tu solicitud fue rechazada. Contacta al administrador para revisarla.",
            user,
        )

    access_token = create_access_token(user_id=str(user["id"]))
    return {
        "success": True,
        "data": {
            "account_status": "active",
            "message": "Acceso concedido",
            "access_token": access_token,
            "token_type": "bearer",
            "user": _serialize_user(user),
        },
        "error": None,
    }


@router.post("/auth/register-google")
async def register_with_google(payload: GoogleRegisterRequest):
    supabase = _get_supabase()
    identity = verify_google_token(payload.id_token)

    user = await supabase.obtener_usuario_por_google_sub(identity["sub"])
    if not user:
        user = await supabase.obtener_usuario_por_email(identity["email"])

    if not user:
        user = await supabase.crear_usuario_google(
            email=identity["email"],
            full_name=identity["full_name"],
            career_id=payload.career_id,
            google_sub=identity["sub"],
            role="docente",
            status="pending",
        )
    else:
        next_status = user.get("status", "pending")
        user = await supabase.vincular_google_usuario(
            user_id=str(user["id"]),
            google_sub=identity["sub"],
            full_name=identity["full_name"],
            email=identity["email"],
            career_id=payload.career_id,
            status=next_status,
        )

    user_status = (user or {}).get("status", "pending")
    if user_status == "active":
        return _build_account_state_response(
            "active",
            "Tu cuenta ya está activa. Puedes ingresar con Google.",
            user,
        )
    if user_status == "rejected":
        return _build_account_state_response(
            "rejected",
            "Tu solicitud fue rechazada. Contacta al administrador para revisarla.",
            user,
        )

    return _build_account_state_response(
        "pending",
        "Solicitud registrada. Queda pendiente de aprobación por un administrador.",
        user,
    )


@router.post("/auth/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(JWTBearer())):
    supabase = _get_supabase()

    user = await supabase.obtener_usuario_por_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    return UserResponse(**_serialize_user(user))
