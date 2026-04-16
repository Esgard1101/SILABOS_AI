# Router de documentos curriculares
# POST /api/documents/upload  ← Sube PDF y extrae texto; si doc_type=bibliografia parsea refs
# GET  /api/documents/         ← Lista documentos
# DELETE /api/documents/{id}  ← Elimina documento (cascade refs)

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from models.schemas import APIResponse
from services.bibliography_parser import (
    parsear_referencias_bibliograficas,
    refs_a_bibliografia_json,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documentos"])


def _obtener_servicios(request: Request):
    from main import servicios
    return servicios


@router.post("/upload", response_model=APIResponse)
async def subir_documento(
    request: Request,
    file: UploadFile = File(...),
    carrera_id: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    program_id: Optional[str] = Form(None),
    scope: Optional[str] = Form(None),
    doc_type: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
):
    """
    Sube un PDF al almacenamiento local.
    Extrae el texto con PyPDF2 y guarda los metadatos en la BD.

    Si doc_type == 'bibliografia' y course_id está presente:
    - Parsea la sección REFERENCIAS BIBLIOGRÁFICAS del texto extraído.
    - Guarda las referencias en course_bibliography_refs (reemplaza anteriores).
    - Devuelve ref_count en el data de respuesta.
    - Si el curso ya tiene refs de un documento distinto al actual → error 409.
    """
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        lower_name = (file.filename or "").lower()
        if not any(lower_name.endswith(ext) for ext in (".pdf", ".md", ".txt")):
            raise HTTPException(
                status_code=400,
                detail="Solo se aceptan archivos PDF, Markdown o TXT",
            )

        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo supera el límite de 10 MB")

        # ── Bloquear segundo upload de bibliografía para el mismo curso ──
        es_bibliografia = doc_type == "bibliografia" and bool(course_id)
        if es_bibliografia:
            doc_id_existente = await supabase.obtener_doc_id_refs_curso(course_id)
            if doc_id_existente:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Al crear un sílabo debes subir un solo archivo final de tus "
                        "referencias consolidadas en NotebookLM. Si el archivo no es el "
                        "correcto, elimínalo primero y vuelve a intentarlo."
                    ),
                )

        logger.info(f"Subiendo documento: {file.filename} ({len(file_bytes)} bytes)")

        if lower_name.endswith(".pdf"):
            resultado = await supabase.subir_pdf(
                file_bytes=file_bytes,
                filename=file.filename,
                carrera_id=carrera_id,
            )
        else:
            resultado = await supabase.subir_texto_plano(
                file_bytes=file_bytes,
                filename=file.filename,
                carrera_id=carrera_id,
            )

        if "error" in resultado:
            return APIResponse(success=False, data=None, error=resultado["error"])

        doc_id = resultado.get("id", "")

        # ── Parsear referencias bibliográficas si corresponde ──
        ref_count = 0
        if es_bibliografia and doc_id:
            texto = resultado.get("text_content") or resultado.get("texto_extraido", "")
            if texto:
                refs = parsear_referencias_bibliograficas(texto)
                if refs:
                    ref_count = await supabase.guardar_referencias_curso(
                        course_id=course_id,
                        doc_id=doc_id,
                        refs=refs,
                    )
                    logger.info(
                        f"Referencias parseadas y guardadas: {ref_count} "
                        f"(course_id={course_id}, doc_id={doc_id})"
                    )
                else:
                    logger.warning(
                        f"No se encontró sección REFERENCIAS BIBLIOGRÁFICAS en el documento "
                        f"{file.filename}"
                    )

        resultado["ref_count"] = ref_count
        return APIResponse(success=True, data=resultado, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al subir documento: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.get("/", response_model=APIResponse)
async def listar_documentos(request: Request):
    """Lista todos los documentos curriculares disponibles."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        documentos = await supabase.listar_documentos()
        return APIResponse(success=True, data={"items": documentos}, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al listar documentos: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.delete("/{doc_id}", response_model=APIResponse)
async def eliminar_documento(doc_id: str, request: Request):
    """Elimina un documento curricular y sus referencias bibliográficas parseadas."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        eliminado = await supabase.eliminar_documento(doc_id)

        if eliminado:
            return APIResponse(success=True, data={"eliminado": doc_id}, error=None)
        else:
            raise HTTPException(status_code=404, detail="Documento no encontrado o error al eliminar")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar documento {doc_id}: {e}")
        return APIResponse(success=False, data=None, error=str(e))
