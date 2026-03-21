# Router de chat con documentos — Agente 4 (tipo NotebookLM)
# POST /api/chat/document    ← Responde preguntas sobre documentos
# POST /api/chat/new         ← Crea nueva sesión de chat
# GET  /api/chat/{session_id} ← Obtiene historial de sesión

import logging

from fastapi import APIRouter, HTTPException, Request

from models.schemas import ChatDocumentoInput, NuevaSesionInput, APIResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


# ──────────────────────────────────────────────
# AGENTE 4 — Chat con Documentos
# ──────────────────────────────────────────────

@router.post("/document", response_model=APIResponse)
async def chat_con_documentos(datos: ChatDocumentoInput, request: Request):
    """
    Agente 4: Responde preguntas sobre documentos.

    Flujo v2 (Fase 2):
    - Si hay doc_ids: usa RAG (pgvector) para recuperar contexto semántico.
      Si el documento no está indexado aún, lo indexa en el momento.
    - Si no hay doc_ids: comportamiento anterior (prompt directo con Gemini).
    """
    try:
        servicios = _obtener_servicios(request)
        gemini = servicios.get("gemini")
        supabase = servicios.get("supabase")

        if not gemini:
            raise HTTPException(status_code=503, detail="Servicio de IA no disponible")

        # ── Flujo CON documentos (RAG) ──────────────────────────────────
        if datos.doc_ids:
            from services import rag_service

            # Para cada doc_id, verificar si está indexado; si no, indexar ahora
            for doc_id in datos.doc_ids:
                already_indexed = await rag_service.is_indexed(doc_id)
                if not already_indexed:
                    logger.info(f"Documento {doc_id} no indexado — indexando ahora")
                    if supabase:
                        texto = await supabase.obtener_texto_docs([doc_id])
                        if texto:
                            await rag_service.index_document(
                                doc_id=doc_id,
                                text=texto,
                                metadata={"doc_id": doc_id},
                            )
                        else:
                            logger.warning(f"No se pudo obtener texto del documento {doc_id}")

            # Responder con contexto RAG
            respuesta = await rag_service.answer_with_context(
                query=datos.pregunta,
                doc_ids=datos.doc_ids,
            )
            fuentes_citadas = _extraer_fuentes_citadas(respuesta, datos.doc_ids)

        # ── Flujo SIN documentos (comportamiento original) ───────────────
        else:
            historial = [msg.model_dump() for msg in datos.historial]
            respuesta = await gemini.chat_documento(
                pregunta=datos.pregunta,
                contexto_docs="",
                historial=historial,
            )
            fuentes_citadas = []

        return APIResponse(
            success=True,
            data={
                "respuesta": respuesta,
                "fuentes_citadas": fuentes_citadas,
            },
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en chat con documentos: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.post("/new", response_model=APIResponse)
async def nueva_sesion(datos: NuevaSesionInput, request: Request):
    """Crea una nueva sesión de chat y la guarda en Supabase."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        sesion = await supabase.crear_sesion_chat(
            titulo=datos.titulo or "Nueva conversación",
            doc_ids=datos.doc_ids,
        )

        return APIResponse(success=True, data=sesion, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear sesión de chat: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.get("/{session_id}", response_model=APIResponse)
async def obtener_sesion(session_id: str, request: Request):
    """Obtiene el historial completo de una sesión de chat."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        sesion = await supabase.obtener_sesion_chat(session_id)
        if not sesion:
            raise HTTPException(status_code=404, detail="Sesión de chat no encontrada")

        return APIResponse(success=True, data=sesion, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener sesión {session_id}: {e}")
        return APIResponse(success=False, data=None, error=str(e))


# ──────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────

def _extraer_fuentes_citadas(respuesta: str, doc_ids: list) -> list:
    """
    Heurística simple para detectar qué documentos fueron citados
    en la respuesta de Gemini.
    """
    fuentes = []
    # Si la respuesta menciona "Según el documento" o "documento", asumimos
    # que citó los documentos solicitados
    if doc_ids and ("documento" in respuesta.lower() or "según" in respuesta.lower()):
        for doc_id in doc_ids:
            fuentes.append({
                "doc_id": doc_id,
                "fragmento": "Referenciado en la respuesta",
            })
    return fuentes
