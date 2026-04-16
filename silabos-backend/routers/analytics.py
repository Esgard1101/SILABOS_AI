# Router de analítica — Silabos.AI
# Datos reales de DB + algunos contadores mock

from fastapi import APIRouter, Depends, HTTPException, Request

from auth.permissions import require_roles

router = APIRouter(
    prefix="/analytics",
    tags=["Analítica"]
)


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


@router.get("/dashboard")
async def dashboard_stats(
    request: Request,
    current_user: dict = Depends(require_roles("admin")),
):
    """
    Estadísticas para el dashboard analítico.
    Combina datos reales de DB con proyecciones.
    """
    del current_user
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")

    if not supabase:
        raise HTTPException(503, "DB no disponible")

    stats = await supabase.obtener_stats()

    total_real = stats.get("total_syllabi", 0)
    total = total_real or 1
    by_status = {
        row["status"]: row["count"]
        for row in stats.get("by_status", [])
    }

    return {
        "overview": {
            "total_syllabi": total_real,
            "total_documents": stats.get("total_documents", 0),
            "total_users": stats.get("total_users", 0),
            "completion_rate": round(
                (by_status.get("published", 0) / total) * 100
            ),
        },
        "by_status": [
            {
                "status": "Borrador",
                "key": "draft",
                "count": by_status.get("draft", 0),
                "color": "#94a3b8",
            },
            {
                "status": "En revisión",
                "key": "review",
                "count": by_status.get("review", 0),
                "color": "#f59e0b",
            },
            {
                "status": "Aprobado",
                "key": "approved",
                "count": by_status.get("approved", 0),
                "color": "#22c55e",
            },
            {
                "status": "Publicado",
                "key": "published",
                "count": by_status.get("published", 0),
                "color": "#3b82f6",
            },
        ],
        "programs": [
            {"programa": "Lengua y Literatura", "syllabi": total_real, "completados": by_status.get("published", 0)},
            {"programa": "Educación Inicial", "syllabi": 0, "completados": 0},
            {"programa": "Educación Primaria", "syllabi": 0, "completados": 0},
            {"programa": "Ciencias Naturales", "syllabi": 0, "completados": 0},
        ],
    }
