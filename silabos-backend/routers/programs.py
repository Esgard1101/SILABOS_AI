# Router de programas, cursos y métodos pedagógicos
# Sin auth — catálogo público (solo lectura)
# GET /api/programs?career_id={id}
# GET /api/courses?program_id={id}
# GET /api/courses/{course_id}
# GET /api/methods
# GET /api/methods/suggest?course_id={id}

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Query, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Programas y Cursos"])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


# ──────────────────────────────────────────────
# PROGRAMAS
# ──────────────────────────────────────────────

@router.get("/programs")
async def listar_programas(request: Request, career_id: str = Query(...)):
    """Lista los programas académicos de una escuela/carrera."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    programas = await supabase.listar_programas(career_id)
    return {"success": True, "data": programas, "error": None}


# ──────────────────────────────────────────────
# CURSOS
# ──────────────────────────────────────────────

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
    """Obtiene el detalle completo de un curso (sumilla, competencias, resultado)."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")

    curso = await supabase.obtener_curso(course_id)
    if not curso:
        raise HTTPException(status_code=404, detail=f"Curso {course_id} no encontrado")

    return {"success": True, "data": curso, "error": None}


# ──────────────────────────────────────────────
# MÉTODOS PEDAGÓGICOS
# ──────────────────────────────────────────────

@router.get("/methods")
async def listar_metodos():
    """
    Lista los métodos pedagógicos disponibles.
    Usa catálogo hardcodeado — tabla teaching_methods está vacía hasta
    que el Dr. Carvas entregue el catálogo oficial.
    """
    from routers.institutional_catalog import METODOS_TRONALES
    metodos = [
        {
            "id": m["id"],
            "name": m["nombre"],
            "description": m["descripcion"],
            "secuencia_didactica": m["secuencia_didactica"],
        }
        for m in METODOS_TRONALES
    ]
    return {"success": True, "data": metodos, "error": None}


@router.get("/methods/suggest")
async def sugerir_metodo(request: Request, course_id: str = Query(...)):
    """
    Sugiere el método pedagógico más adecuado para un curso.
    Llama a Gemini con la sumilla del curso.
    Fallback: devuelve el primer método si Gemini falla.
    """
    from routers.institutional_catalog import METODOS_TRONALES

    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")

    metodos_base = [
        {"id": m["id"], "name": m["nombre"], "description": m["descripcion"]}
        for m in METODOS_TRONALES
    ]

    # Fallback por defecto
    fallback = {
        "method_id": metodos_base[0]["id"],
        "method_name": metodos_base[0]["name"],
        "reason": "Sugerencia por defecto (IA no disponible)",
    }

    if not supabase:
        return {"success": True, "data": fallback, "error": None}

    curso = await supabase.obtener_curso(course_id)
    if not curso:
        return {"success": True, "data": fallback, "error": None}

    sumilla = curso.get("sumilla", "")
    if not sumilla:
        return {"success": True, "data": fallback, "error": None}

    try:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        model_name = os.getenv("GEMINI_MODEL","gemini-3.1-flash-lite-preview")

        lista_metodos_texto = "\n".join(
            [f"ID {m['id']}: {m['name']} — {m['description']}" for m in metodos_base]
        )

        prompt = f"""Eres un experto en diseño curricular universitario peruano.

Dado el siguiente curso y su sumilla, elige el método pedagógico más adecuado de la lista.
Responde ÚNICAMENTE con un JSON válido con este formato exacto:
{{"method_id": <numero>, "reason": "<explicacion breve en español>"}}

CURSO: {curso.get("name", "")}
SUMILLA: {sumilla[:400]}

MÉTODOS DISPONIBLES:
{lista_metodos_texto}

Responde solo JSON, sin markdown, sin texto adicional."""

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        texto = response.text.strip()
        # Limpiar markdown si viene envuelto
        if texto.startswith("```"):
            texto = texto.split("```")[1]
            if texto.startswith("json"):
                texto = texto[4:]
        texto = texto.strip()

        resultado_ia = json.loads(texto)
        method_id = int(resultado_ia.get("method_id", 1))
        reason = resultado_ia.get("reason", "Sugerido por IA")

        # Buscar el método en el catálogo
        metodo_encontrado = next(
            (m for m in metodos_base if m["id"] == method_id),
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

    except Exception as e:
        logger.warning(f"Gemini suggest falló para curso {course_id}: {e}. Usando fallback.")
        return {"success": True, "data": fallback, "error": None}
