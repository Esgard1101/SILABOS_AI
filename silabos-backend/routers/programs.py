# Router de programas, cursos y métodos pedagógicos
# GET /api/programs?career_id={id}
# GET /api/courses?program_id={id}
# GET /api/courses/{course_id}
# GET /api/courses/{course_id}/performances  ← desempeños oficiales (público)
# GET /api/methods                        ← desde teaching_methods DB
# GET /api/methods/{method_id}/skills     ← skills compatibles para el wizard
# GET /api/skills/categories
# GET /api/skills

import logging

from fastapi import APIRouter, HTTPException, Query, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Programas y Cursos"])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


@router.get("/programs")
async def listar_programas(request: Request, career_id: str = Query(...)):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    programas = await supabase.listar_programas(career_id)
    return {"success": True, "data": programas, "error": None}


@router.get("/courses")
async def listar_cursos(request: Request, program_id: str = Query(...)):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    cursos = await supabase.listar_cursos_programa(program_id)
    return {"success": True, "data": cursos, "error": None}


@router.get("/courses/{course_id}")
async def obtener_curso(course_id: str, request: Request):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail=f"Curso {course_id} no encontrado")
    return {"success": True, "data": curso, "error": None}


@router.get("/courses/{course_id}/performances")
async def listar_performances_publico(course_id: str, request: Request):
    """Desempeños oficiales activos de un curso (acceso público para el wizard)."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    items = await supabase.listar_performances_curso(course_id, include_archived=False)
    return {"success": True, "data": {"items": items}, "error": None}


@router.get("/methods")
async def listar_metodos(request: Request):
    """Lista métodos pedagógicos desde teaching_methods en DB."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    metodos = await supabase.listar_teaching_methods(include_archived=False)
    return {"success": True, "data": metodos, "error": None}


@router.get("/methods/{method_id}/skills")
async def listar_skills_compatibles(
    method_id: str,
    request: Request,
    q: str = Query(default="", description="Texto de búsqueda"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """
    Devuelve las habilidades compatibles con un método pedagógico para el wizard.
    Responde con recommended_skills, compatible_skills, total y fallback_mode.
    """
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    resultado = await supabase.listar_skills_compatibles(
        method_id=method_id, search=q, page=page, page_size=page_size
    )
    return {"success": True, "data": resultado, "error": None}


@router.get("/skills/categories")
async def listar_skill_categories(request: Request):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    categories = await supabase.listar_skill_categories()
    return {"success": True, "data": categories, "error": None}


@router.get("/skills")
async def listar_skills(
    request: Request,
    categories: str = Query(default="", description="Categorias separadas por coma"),
):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    cats = [c.strip() for c in categories.split(",") if c.strip()] if categories else []
    skills_context = await supabase.listar_skills_por_categorias(cats)
    return {"success": True, "data": skills_context, "error": None}


@router.get("/methods/suggest")
async def sugerir_metodo(
    request: Request,
    course_id: str = Query(...),
    categories: str = Query(default=""),
):
    """Sugiere el método más adecuado para un curso usando IA."""
    servicios = _obtener_servicios(request)
    gemini = servicios.get("gemini")
    supabase = servicios.get("supabase")

    metodos_db = await supabase.listar_teaching_methods() if supabase else []
    metodos_base = [{"id": m["id"], "name": m["name"], "description": m.get("description", "")} for m in metodos_db]

    fallback = {
        "method_id": metodos_base[0]["id"] if metodos_base else None,
        "method_name": metodos_base[0]["name"] if metodos_base else "",
        "reason": "Sugerencia por defecto (IA no disponible)",
    }

    if not supabase or not gemini or not metodos_base:
        return {"success": True, "data": fallback, "error": None}

    curso = await supabase.obtener_curso(course_id)
    if not curso or not curso.get("sumilla"):
        return {"success": True, "data": fallback, "error": None}

    skill_context = categories.replace(",", ", ") if categories else "Sin categorías explícitas"

    try:
        resultado_ia = await gemini.sugerir_metodo(
            curso=curso, metodos_base=metodos_base, skill_context=skill_context
        )
        mid = resultado_ia.get("method_id")
        metodo_encontrado = next((m for m in metodos_base if str(m["id"]) == str(mid)), metodos_base[0])
        return {
            "success": True,
            "data": {
                "method_id": metodo_encontrado["id"],
                "method_name": metodo_encontrado["name"],
                "reason": resultado_ia.get("reason", "Sugerido por IA"),
            },
            "error": None,
        }
    except Exception as exc:
        logger.warning("Suggest IA falló para curso %s: %s", course_id, exc)
        return {"success": True, "data": fallback, "error": None}
