import os

from fastapi import HTTPException, status
from google.auth.transport.requests import Request
from google.oauth2 import id_token as google_id_token


def verify_google_token(token: str) -> dict:
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In no está configurado",
        )

    try:
        payload = google_id_token.verify_oauth2_token(
            token,
            Request(),
            google_client_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido",
        ) from exc

    if not payload.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta de Google debe tener el correo verificado",
        )

    return {
        "sub": payload.get("sub", ""),
        "email": (payload.get("email") or "").strip().lower(),
        "full_name": (payload.get("name") or payload.get("email") or "").strip(),
        "picture": payload.get("picture"),
        "email_verified": bool(payload.get("email_verified")),
    }
