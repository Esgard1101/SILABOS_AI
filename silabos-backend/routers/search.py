# Router de búsqueda académica — Agente 2
# POST /api/search/sources ← Busca y rankea fuentes académicas en internet

import logging

from fastapi import APIRouter, HTTPException, Request

from models.schemas import BuscarFuentesInput, BuscarBibliografiaInput, APIResponse, BibliografiaGuideResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Búsqueda"])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


# ──────────────────────────────────────────────
# AGENTE 2 — Buscador de Fuentes Académicas
# ──────────────────────────────────────────────

@router.post("/sources", response_model=APIResponse)
async def buscar_fuentes(datos: BuscarFuentesInput, request: Request):
    """
    Agente 2: Busca fuentes académicas reales en internet.

    Flujo en 3 pasos:
    1. Gemini Flash-Lite genera queries académicas optimizadas
    2. Google Custom Search ejecuta las búsquedas
    3. Gemini Flash-Lite filtra y rankea los resultados

    Maneja el límite de 429 de Google devolviendo resultados parciales.
    """
    try:
        servicios = _obtener_servicios(request)
        search = servicios.get("search")
        gemini = servicios.get("gemini")

        if not search:
            raise HTTPException(status_code=503, detail="Servicio de búsqueda no disponible")

        logger.info(
            f"Buscando fuentes para: '{datos.tema}' | nivel={datos.nivel} | "
            f"año_min={datos.anio_minimo} | cantidad={datos.cantidad}"
        )

        fuentes = await search.buscar_fuentes_academicas(
            tema=datos.tema,
            nivel=datos.nivel,
            anio_minimo=datos.anio_minimo,
            cantidad=datos.cantidad,
            gemini_service=gemini,
        )

        return APIResponse(
            success=True,
            data={
                "fuentes": fuentes,
                "total": len(fuentes),
                "tema": datos.tema,
            },
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al buscar fuentes: {e}")
        return APIResponse(success=False, data=None, error=str(e))


# ──────────────────────────────────────────────
# POST /api/search/bibliography — Búsqueda en APIs bibliográficas (Fase 2)
# ──────────────────────────────────────────────

@router.post("/bibliography", response_model=APIResponse)
async def buscar_bibliografia(datos: BuscarBibliografiaInput, request: Request):
    """
    Busca referencias bibliográficas en cascada: OpenAlex → SciELO → Crossref.
    Formatea los resultados en APA 7ma edición usando Gemini.
    Solo devuelve referencias con DOI o URL verificable.
    """
    import json
    import re
    from services.bibliography_service import search_bibliography
    from services.gemini_service import generate_content
    from prompts.search_prompt import construir_prompt_bibliografia_apa

    try:
        logger.info(
            f"Buscando bibliografía: '{datos.keywords}' | área={datos.area} | "
            f"doi_list={datos.doi_list}"
        )

        # Paso 1: Buscar en APIs bibliográficas
        referencias_raw = await search_bibliography(
            keywords=datos.keywords,
            area=datos.area,
            doi_list=datos.doi_list,
        )

        sources_consulted = list({r["source"] for r in referencias_raw})

        if not referencias_raw:
            return APIResponse(
                success=True,
                data={
                    "references": [],
                    "total": 0,
                    "sources_consulted": sources_consulted,
                    "message": "No se encontraron referencias bibliográficas para los criterios dados.",
                },
                error=None,
            )

        # Paso 2: Formatear en APA con Gemini
        area_contexto = datos.area or datos.course_name or datos.keywords
        prompt = construir_prompt_bibliografia_apa(referencias_raw, area_contexto)
        respuesta_ia = await generate_content(prompt)

        # Extraer JSON de la respuesta
        respuesta_ia = re.sub(r"```(?:json)?\s*", "", respuesta_ia)
        respuesta_ia = re.sub(r"```", "", respuesta_ia).strip()
        inicio = respuesta_ia.find("{")
        fin = respuesta_ia.rfind("}")
        if inicio != -1 and fin != -1:
            respuesta_ia = respuesta_ia[inicio:fin + 1]

        datos_apa = json.loads(respuesta_ia)
        referencias_formateadas = datos_apa.get("referencias", [])

        # Paso 3: Filtrar referencias sin DOI ni URL (regla crítica)
        referencias_validas = [
            r for r in referencias_formateadas
            if r.get("doi") or r.get("url")
        ]

        logger.info(
            f"Bibliografía: {len(referencias_validas)} referencias válidas "
            f"de {len(referencias_formateadas)} formateadas"
        )

        return APIResponse(
            success=True,
            data={
                "references": referencias_validas,
                "total": len(referencias_validas),
                "sources_consulted": sources_consulted,
            },
            error=None,
        )

    except json.JSONDecodeError as e:
        logger.error(f"Error al parsear APA JSON: {e}")
        # Devolver referencias sin formatear si Gemini falla
        refs_fallback = [
            {
                "apa_format": f"{', '.join(r.get('authors', [])[:2])} ({r.get('year', 's.f.')}). {r.get('title', '')}.",
                "doi": r.get("doi"),
                "url": r.get("url", ""),
                "source": r.get("source", ""),
                "verified": bool(r.get("doi") or r.get("url")),
            }
            for r in referencias_raw
            if r.get("doi") or r.get("url")
        ]
        return APIResponse(
            success=True,
            data={
                "references": refs_fallback[:8],
                "total": len(refs_fallback[:8]),
                "sources_consulted": sources_consulted,
            },
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al buscar bibliografía: {e}")
        return APIResponse(success=False, data=None, error=str(e))


# ──────────────────────────────────────────────
# GET /api/search/bibliography-guide — Guía Deep Research para docentes
# ──────────────────────────────────────────────

@router.get("/bibliography-guide", response_model=BibliografiaGuideResponse)
async def get_bibliography_guide():
    """
    Devuelve la guía paso a paso para que el docente use Google Deep Research
    y suba el PDF resultante al sistema (vía manual guiada).
    """
    return {
        "method": "Google Deep Research",
        "estimated_time_minutes": 15,
        "coffee_break": True,
        "steps": [
            {
                "step": 1,
                "title": "Ir a Google Deep Research",
                "description": "Abre una nueva pestaña y ve a gemini.google.com",
                "url": "https://gemini.google.com",
                "action": "Selecciona la opción 'Deep Research' en el menú",
            },
            {
                "step": 2,
                "title": "Escribir el prompt de investigación",
                "description": "Copia y pega este prompt en el campo de búsqueda:",
                "prompt_template": "Busca 10 referencias bibliográficas académicas sobre {tema_curso} para nivel universitario de pregrado. Incluir: libros de texto, artículos científicos y recursos web académicos. Para cada referencia incluir: título completo, autor(es), año, editorial o revista, DOI o URL de acceso. Formato de salida: APA 7ma edición. Priorizar fuentes en español e inglés publicadas después del año 2010.",
                "tip": "Reemplaza {tema_curso} con el nombre de tu curso",
            },
            {
                "step": 3,
                "title": "Iniciar la investigación",
                "description": "Haz click en el botón 'Start Research' o 'Iniciar investigación'",
                "action": "¡Es momento de ir por un café! ☕ Este proceso toma aproximadamente 15 minutos. Deep Research leerá decenas de fuentes académicas por ti.",
                "coffee_break": True,
            },
            {
                "step": 4,
                "title": "Exportar el informe",
                "description": "Cuando Deep Research termine, el informe aparece en pantalla",
                "action": "Haz click en el botón 'Export' o 'Exportar'",
                "important": "Google exporta a Google Docs por defecto. Una vez en Google Docs: ve a Archivo → Descargar → PDF (.pdf)",
            },
            {
                "step": 5,
                "title": "Subir el PDF a Silabos.AI",
                "description": "Regresa a esta plataforma",
                "action": "En el Panel Principal, usa el botón 'Subir Documento' y selecciona el PDF que descargaste. El sistema lo procesará automáticamente.",
                "result": "Las referencias estarán disponibles en el Chat de tu sílabo",
            },
        ],
        "automatic_fallback": {
            "enabled": True,
            "description": "Mientras esperas, el sistema también buscará automáticamente en OpenAlex y Crossref",
            "note": "Las fuentes automáticas complementan pero no reemplazan la investigación profunda de Deep Research",
        },
    }
