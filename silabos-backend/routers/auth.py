from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth.auth_handler import create_access_token
from auth.auth_bearer import JWTBearer

# El import absoluto funcionará porque main.py expone "servicios" o lo importamos condicionalmente,
# pero mejor importaremos "servicios" desde main
from main import servicios

router = APIRouter(tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

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

@router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Verifica credenciales y retorna un JWT y datos básicos del usuario."""
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=500, detail="Servicio de base de datos no disponible")

    user = await supabase.obtener_usuario_por_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    # Verificar password
    import bcrypt
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    # Crear token JWT
    access_token = create_access_token(user_id=str(user["id"]))

    user_data = {
        "id": str(user["id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "career_id": str(user["career_id"]) if user["career_id"] else None
    }

    return LoginResponse(access_token=access_token, user=user_data)

@router.post("/auth/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(JWTBearer())):
    """Requiere un JWT válido y retorna la información del usuario en sesión."""
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=500, detail="Servicio de base de datos no disponible")

    user = await supabase.obtener_usuario_por_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    return UserResponse(
        id=str(user["id"]),
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        career_id=str(user["career_id"]) if user["career_id"] else None
    )
