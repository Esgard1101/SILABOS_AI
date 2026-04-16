# Router de programas, cursos y metodos pedagogicos
# Sin auth - catalogo publico (solo lectura)
# GET /api/programs?career_id={id}
# GET /api/courses?program_id={id}
# GET /api/courses/{course_id}
# GET /api/methods
# GET /api/methods/suggest?course_id={id}

import logging

from fastapi import APIRouter, HTTPException, Query, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Programas y Cursos"])


def _obtener_servicios(request: Request):
    from main import servicios

    return servicios


@router.get("/programs")
async def listar_programas(request: Request, career_id: str = Query(...)):
    """Lista los programas academicos de una escuela/carrera."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    programas = await supabase.listar_programas(career_id)
    return {"success": True, "data": programas, "error": None}


@router.get("/courses")
async def listar_cursos(request: Request, program_id: str = Query(...)):
    """
    Lista los cursos de un programa.
    Incluye cursos comunes (is_common=true) de toda la carrera.
    """
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    cursos = await supabase.listar_cursos_programa(program_id)
    return {"success": True, "data": cursos, "error": None}


@router.get("/courses/{course_id}")
async def obtener_curso(course_id: str, request: Request):
    """Obtiene el detalle completo de un curso."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail=f"Curso {course_id} no encontrado")

    return {"success": True, "data": curso, "error": None}


@router.get("/methods")
async def listar_metodos():
    """
    Lista los metodos pedagogicos disponibles.
    Usa catalogo hardcodeado - tabla teaching_methods aun no poblada.
    """
    from routers.institutional_catalog import METODOS_TRONALES

    metodos = [
        {
            "id": metodo["id"],
            "name": metodo["nombre"],
            "description": metodo["descripcion"],
            "secuencia_didactica": metodo["secuencia_didactica"],
        }
        for metodo in METODOS_TRONALES
    ]
    return {"success": True, "data": metodos, "error": None}


@router.get("/skills/categories")
async def listar_skill_categories(request: Request):
    """
    Lista las categorias de habilidades disponibles en skills_catalog.
    """
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
    """
    Devuelve verbos e instrumentos para las categorias seleccionadas.
    """
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    cats = [category.strip() for category in categories.split(",") if category.strip()] if categories else []
    skills_context = await supabase.listar_skills_por_categorias(cats)
    return {"success": True, "data": skills_context, "error": None}


@router.get("/methods/suggest")
async def sugerir_metodo(
    request: Request,
    course_id: str = Query(...),
    categories: str = Query(default="", description="Categorias separadas por coma"),
):
    """
    Sugiere el metodo pedagogico mas adecuado para un curso.
    Usa OpenRouter via el servicio central para evitar gastar Gemini.
    """
    from routers.institutional_catalog import METODOS_TRONALES

    servicios = _obtener_servicios(request)
    gemini = servicios.get("gemini")
    supabase = servicios.get("supabase")

    metodos_base = [
        {
            "id": metodo["id"],
            "name": metodo["nombre"],
            "description": metodo["descripcion"],
        }
        for metodo in METODOS_TRONALES
    ]

    fallback = {
        "method_id": metodos_base[0]["id"],
        "method_name": metodos_base[0]["name"],
        "reason": "Sugerencia por defecto (IA no disponible)",
    }

    if not supabase:
        return {"success": True, "data": fallback, "error": None}
    if not gemini:
        return {"success": True, "data": fallback, "error": None}

    curso = await supabase.obtener_curso(course_id)
    if not curso:
        return {"success": True, "data": fallback, "error": None}

    sumilla = curso.get("sumilla", "")
    if not sumilla:
        return {"success": True, "data": fallback, "error": None}

    skill_categories = [category.strip() for category in categories.split(",") if category.strip()] if categories else []
    skill_context = ", ".join(skill_categories) if skill_categories else "Sin categorias explicitas"

    try:
        resultado_ia = await gemini.sugerir_metodo(
            curso=curso,
            metodos_base=metodos_base,
            skill_context=skill_context,
        )
        method_id = int(resultado_ia.get("method_id", metodos_base[0]["id"]))
        reason = resultado_ia.get("reason", "Sugerido por IA")

        metodo_encontrado = next(
            (metodo for metodo in metodos_base if metodo["id"] == method_id),
            metodos_base[0],
        )

        return {
            "success": True,
            "data": {
                "method_id": metodo_encontrado["id"],
                "method_name": metodo_encontrado["name"],
                "reason": reason,
            },
            "error": None,
        }
    except Exception as exc:
        logger.warning(
            "OpenRouter suggest fallo para curso %s: %s. Usando fallback.",
            course_id,
            exc,
        )
        return {"success": True, "data": fallback, "error": None}
