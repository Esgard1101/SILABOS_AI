# Router de documentos curriculares
# POST /api/documents/upload  ← Sube PDF y extrae texto
# GET  /api/documents/         ← Lista documentos
# DELETE /api/documents/{id}  ← Elimina documento

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from models.schemas import APIResponse

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
):
    """
    Sube un PDF al almacenamiento de Supabase.
    Extrae el texto con PyPDF2 y guarda los metadatos en la BD.
    """
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        # Validar que sea PDF
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

        # Leer bytes del archivo
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        if len(file_bytes) > 10 * 1024 * 1024:  # Límite: 10 MB
            raise HTTPException(status_code=400, detail="El archivo supera el límite de 10 MB")

        logger.info(f"Subiendo documento: {file.filename} ({len(file_bytes)} bytes)")

        resultado = await supabase.subir_pdf(
            file_bytes=file_bytes,
            filename=file.filename,
            carrera_id=carrera_id,
        )

        if "error" in resultado:
            return APIResponse(success=False, data=None, error=resultado["error"])

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
    """Elimina un documento curricular por su ID."""
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
