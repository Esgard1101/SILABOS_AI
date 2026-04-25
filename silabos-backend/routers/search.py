# Router de busqueda academica - Agente 2

from __future__ import annotations

import json
import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from models.schemas import (
    APIResponse,
    BibliografiaGuideResponse,
    BuscarBibliografiaInput,
    BuscarFuentesInput,
)
from services.bibliography_parser import (
    build_fallback_apa,
    normalize_doi,
    normalize_reference_metadata,
    normalize_url,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Busqueda"])


def _obtener_servicios(request: Request):
    from main import servicios

    return servicios


def _extract_json_object(raw_text: str) -> str:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw_text or "")
    cleaned = re.sub(r"```", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def _title_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def _match_raw_reference(
    reference: dict[str, Any],
    raw_references: list[dict[str, Any]],
) -> dict[str, Any] | None:
    candidate_index = reference.get("candidate_index")
    if isinstance(candidate_index, int) and 1 <= candidate_index <= len(raw_references):
        return raw_references[candidate_index - 1]

    doi = normalize_doi(reference.get("doi"))
    if doi:
        for raw in raw_references:
            if normalize_doi(raw.get("doi")) == doi:
                return raw

    url = normalize_url(reference.get("url"))
    if url:
        for raw in raw_references:
            if normalize_url(raw.get("url")) == url:
                return raw

    title_key = _title_key(reference.get("title"))
    if title_key:
        for raw in raw_references:
            if _title_key(raw.get("title")) == title_key:
                return raw

    return None


def _public_reference_shape(reference: dict[str, Any]) -> dict[str, Any]:
    return {
        "apa_format": reference.get("apa_format"),
        "title": reference.get("title"),
        "authors": reference.get("authors") or [],
        "year": reference.get("year"),
        "type": reference.get("type"),
        "display_text": reference.get("display_text"),
        "doi": reference.get("doi"),
        "url": reference.get("url"),
        "source": reference.get("source"),
        "verified": bool(reference.get("verified")),
    }


def _normalize_bibliography_references(
    formatted_references: list[dict[str, Any]],
    raw_references: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized_rows: list[dict[str, Any]] = []
    seen: set[str] = set()

    for reference in formatted_references:
        if not isinstance(reference, dict):
            continue

        fallback = _match_raw_reference(reference, raw_references)
        normalized = normalize_reference_metadata(reference, fallback=fallback)
        if not normalized.get("doi") and not normalized.get("url"):
            continue

        identity = (
            normalized.get("doi")
            or normalized.get("url")
            or f"{_title_key(normalized.get('title'))}:{str(normalized.get('year') or '')}"
        )
        if not identity or identity in seen:
            continue

        seen.add(identity)
        normalized_rows.append(_public_reference_shape(normalized))

    return normalized_rows


def _build_fallback_references(raw_references: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fallback_rows: list[dict[str, Any]] = []
    seen: set[str] = set()

    for raw in raw_references:
        doi = normalize_doi(raw.get("doi"))
        url = normalize_url(raw.get("url"))
        if not doi and not url:
            continue

        normalized = normalize_reference_metadata(
            {
                "apa_format": build_fallback_apa(
                    title=raw.get("title"),
                    authors=raw.get("authors"),
                    year=raw.get("year"),
                    doi=doi,
                    url=url,
                )
            },
            fallback=raw,
        )
        identity = doi or url or _title_key(normalized.get("title"))
        if not identity or identity in seen:
            continue

        seen.add(identity)
        fallback_rows.append(_public_reference_shape(normalized))

    return fallback_rows[:8]


@router.post("/sources", response_model=APIResponse)
async def buscar_fuentes(datos: BuscarFuentesInput, request: Request):
    """
    Agente 2: busca fuentes academicas reales en internet.
    """
    try:
        servicios = _obtener_servicios(request)
        search = servicios.get("search")
        gemini = servicios.get("gemini")

        if not search:
            raise HTTPException(status_code=503, detail="Servicio de busqueda no disponible")

        logger.info(
            "Buscando fuentes para: '%s' | nivel=%s | ano_min=%s | cantidad=%s",
            datos.tema,
            datos.nivel,
            datos.anio_minimo,
            datos.cantidad,
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
        logger.error("Error al buscar fuentes: %s", e)
        return APIResponse(success=False, data=None, error=str(e))


@router.post("/bibliography", response_model=APIResponse)
async def buscar_bibliografia(datos: BuscarBibliografiaInput, request: Request):
    """
    Busca referencias bibliograficas en cascada: OpenAlex -> SciELO -> Crossref.
    Formatea resultados en APA y devuelve metadata enriquecida para la UI.
    """
    from prompts.search_prompt import construir_prompt_bibliografia_apa
    from services.bibliography_service import search_bibliography
    from services.gemini_service import generate_content

    try:
        logger.info(
            "Buscando bibliografia: '%s' | area=%s | doi_list=%s",
            datos.keywords,
            datos.area,
            datos.doi_list,
        )

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
                    "message": "No se encontraron referencias bibliograficas para los criterios dados.",
                },
                error=None,
            )

        area_contexto = datos.area or datos.course_name or datos.keywords
        prompt = construir_prompt_bibliografia_apa(referencias_raw, area_contexto)
        respuesta_ia = await generate_content(prompt, task="bibliography_format")
        datos_apa = json.loads(_extract_json_object(respuesta_ia))
        referencias_formateadas = datos_apa.get("referencias", [])
        referencias_validas = _normalize_bibliography_references(
            referencias_formateadas,
            referencias_raw,
        )

        if not referencias_validas:
            referencias_validas = _build_fallback_references(referencias_raw)

        logger.info(
            "Bibliografia: %s referencias validas de %s formateadas",
            len(referencias_validas),
            len(referencias_formateadas),
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
        logger.error("Error al parsear APA JSON: %s", e)
        refs_fallback = _build_fallback_references(referencias_raw)
        return APIResponse(
            success=True,
            data={
                "references": refs_fallback,
                "total": len(refs_fallback),
                "sources_consulted": sources_consulted,
            },
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error al buscar bibliografia: %s", e)
        return APIResponse(success=False, data=None, error=str(e))


@router.get("/bibliography-guide", response_model=BibliografiaGuideResponse)
async def get_bibliography_guide():
    """
    Devuelve la guia paso a paso para que el docente use Google Deep Research
    y suba el PDF resultante al sistema.
    """
    return {
        "method": "Google Deep Research",
        "estimated_time_minutes": 15,
        "coffee_break": True,
        "steps": [
            {
                "step": 1,
                "title": "Ir a Google Deep Research",
                "description": "Abre una nueva pestana y ve a gemini.google.com",
                "url": "https://gemini.google.com",
                "action": "Selecciona la opcion 'Deep Research' en el menu",
            },
            {
                "step": 2,
                "title": "Escribir el prompt de investigacion",
                "description": "Copia y pega este prompt en el campo de busqueda:",
                "prompt_template": "Busca 10 referencias bibliograficas academicas sobre {tema_curso} para nivel universitario de pregrado. Incluir: libros de texto, articulos cientificos y recursos web academicos. Para cada referencia incluir: titulo completo, autor(es), ano, editorial o revista, DOI o URL de acceso. Formato de salida: APA 7ma edicion. Priorizar fuentes en espanol e ingles publicadas despues del ano 2010.",
                "tip": "Reemplaza {tema_curso} con el nombre de tu curso",
            },
            {
                "step": 3,
                "title": "Iniciar la investigacion",
                "description": "Haz click en el boton 'Start Research' o 'Iniciar investigacion'",
                "action": "Es momento de ir por un cafe. Este proceso toma aproximadamente 15 minutos. Deep Research leera decenas de fuentes academicas por ti.",
                "coffee_break": True,
            },
            {
                "step": 4,
                "title": "Exportar el informe",
                "description": "Cuando Deep Research termine, el informe aparece en pantalla",
                "action": "Haz click en el boton 'Export' o 'Exportar'",
                "important": "Google exporta a Google Docs por defecto. Una vez en Google Docs: ve a Archivo -> Descargar -> PDF (.pdf)",
            },
            {
                "step": 5,
                "title": "Subir el PDF a Silabos.AI",
                "description": "Regresa a esta plataforma",
                "action": "En el Panel Principal, usa el boton 'Subir Documento' y selecciona el PDF que descargaste. El sistema lo procesara automaticamente.",
                "result": "Las referencias estaran disponibles en el chat de tu silabo",
            },
        ],
        "automatic_fallback": {
            "enabled": True,
            "description": "Mientras esperas, el sistema tambien buscara automaticamente en OpenAlex y Crossref",
            "note": "Las fuentes automaticas complementan pero no reemplazan la investigacion profunda de Deep Research",
        },
    }
