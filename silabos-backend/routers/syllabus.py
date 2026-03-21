# Router de sílabos — Agentes 1 y 3
# POST /api/syllabus/generate  ← Agente 1: Generación
# POST /api/syllabus/validate  ← Agente 3: Validación curricular
# GET  /api/syllabus/{id}      ← Obtener sílabo por ID
# GET  /api/syllabus/          ← Listar sílabos con paginación

import json
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from auth.auth_bearer import JWTBearer
from models.schemas import GenerarSilaboInput, ValidarSilaboInput, APIResponse
from services.word_generator import (
    generar_docx,
    generar_pdf_html,
    _build_context as build_export_context,
)

logger = logging.getLogger(__name__)


def _build_editor_payload(registro: dict) -> dict:
    payload = registro.get("payload_json") or registro.get("datos") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)

    if not isinstance(payload, dict):
        payload = {}

    return {
        **payload,
        "_id": registro.get("id"),
        "id": registro.get("id"),
        "status": registro.get("status", "draft"),
        "created_at": registro.get("created_at"),
        "updated_at": registro.get("updated_at"),
        "semester": registro.get("semester"),
        "teacher_name": registro.get("teacher_name"),
    }

router = APIRouter(prefix="/syllabus", tags=["Sílabos"])


def _obtener_servicios(request: Request):
    """Obtiene los servicios del estado de la aplicación."""
    from main import servicios
    return servicios


class GuardarDraftInput(BaseModel):
    payload_json: dict
    status: str = "draft"


class ActualizarSilaboInput(BaseModel):
    payload_json: dict
    status: str = "draft"
    changed_by: str = "sistema"
    change_note: str = "Borrador actualizado"


# ──────────────────────────────────────────────
# AGENTE 1 — Generación de Sílabos
# ──────────────────────────────────────────────

@router.post("/generate", response_model=APIResponse)
async def generar_silabo(
    datos: GenerarSilaboInput,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """
    Genera un sílabo universitario completo usando Gemini 2.0 Flash.
    Lee el contexto curricular desde Supabase si se proporciona carrera_id.
    """
    try:
        servicios = _obtener_servicios(request)
        gemini = servicios.get("gemini")
        supabase = servicios.get("supabase")

        if not gemini:
            raise HTTPException(status_code=503, detail="Servicio de IA no disponible")

        # Obtener contexto curricular de Supabase si hay carrera_id
        contexto_curricular = ""
        if datos.carrera_id and supabase:
            docs = await supabase.obtener_docs_carrera(datos.carrera_id)
            textos = []
            for doc in docs:
                if doc.get("texto_extraido"):
                    textos.append(f"[{doc.get('nombre', 'Documento')}]\n{doc['texto_extraido'][:2000]}")
            contexto_curricular = "\n\n".join(textos)
            logger.info(f"Contexto curricular: {len(docs)} documentos, {len(contexto_curricular)} chars")

        # Llamar al Agente 1 (Gemini)
        datos_dict = datos.model_dump()
        silabo = await gemini.generar_silabo(datos_dict, contexto_curricular)

        if "error" in silabo:
            return APIResponse(
                success=False,
                data=None,
                error=silabo["error"],
            )

        if not datos.persist_result:
            return APIResponse(success=True, data=silabo, error=None)

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        silabo_guardado = await supabase.guardar_silabo(
            silabo,
            user_id=user_id,
            status="draft",
        )
        if not silabo_guardado.get("id"):
            raise HTTPException(
                status_code=500,
                detail="No se pudo guardar el sílabo generado en la base de datos",
            )

        await supabase.guardar_version(
            syllabus_id=silabo_guardado["id"],
            payload=silabo,
            version_number=1,
            changed_by=datos.docente or "sistema",
            note="Versión inicial generada por IA",
        )

        return APIResponse(
            success=True,
            data=_build_editor_payload(silabo_guardado),
            error=None,
        )

        # Guardar en base de datos (nuevo método recibe solo el sílabo)
        silabo_guardado = {}
        if supabase:
            silabo_guardado = await supabase.guardar_silabo(silabo)
            if silabo_guardado.get("id"):
                await supabase.guardar_version(
                    syllabus_id=silabo_guardado["id"],
                    payload=silabo,
                    version_number=1,
                    changed_by=datos.docente or "sistema",
                    note="VersiÃ³n inicial generada por IA",
                )

        # Combinar sílabo generado con metadatos de BD
        resultado = {**silabo}
        if silabo_guardado.get("id"):
            resultado["_id"] = silabo_guardado["id"]

        return APIResponse(success=True, data=resultado, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar sílabo: {e}")
        return APIResponse(success=False, data=None, error=str(e))


# ──────────────────────────────────────────────
# AGENTE 3 — Validación Curricular
# ──────────────────────────────────────────────

@router.post("/validate", response_model=APIResponse)
async def validar_silabo(
    datos: ValidarSilaboInput,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """
    Valida la coherencia curricular de un sílabo.
    Acepta el ID de un sílabo guardado o el JSON directo.
    """
    try:
        servicios = _obtener_servicios(request)
        gemini = servicios.get("gemini")
        supabase = servicios.get("supabase")

        if not gemini:
            raise HTTPException(status_code=503, detail="Servicio de IA no disponible")

        # Resolver el sílabo: desde BD o del JSON directo
        silabo = None
        perfil_egreso = ""
        carrera_id = None

        if datos.syllabus_id and supabase:
            registro = await supabase.obtener_silabo(
                datos.syllabus_id, user_id=user_id
            )
            if not registro:
                raise HTTPException(status_code=404, detail=f"Sílabo {datos.syllabus_id} no encontrado")
            silabo = registro.get("payload_json") or registro.get("datos") or registro
            carrera_id = registro.get("carrera_id") or silabo.get("carrera_id")
        elif datos.syllabus_json:
            silabo = datos.syllabus_json
        else:
            raise HTTPException(
                status_code=400,
                detail="Debes proporcionar syllabus_id o syllabus_json",
            )

        # Obtener perfil de egreso si hay carrera_id
        if carrera_id and supabase:
            perfil_egreso = await supabase.obtener_perfil_egreso(carrera_id)

        # Llamar al Agente 3 (Gemini Flash-Lite)
        resultado = await gemini.validar_silabo(silabo, perfil_egreso)

        return APIResponse(success=True, data=resultado, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al validar sílabo: {e}")
        return APIResponse(success=False, data=None, error=str(e))


# ──────────────────────────────────────────────
# CRUD básico
# ──────────────────────────────────────────────

@router.get("/{syllabus_id}", response_model=APIResponse)
async def obtener_silabo(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Obtiene un sílabo por su UUID."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
        if not registro:
            raise HTTPException(status_code=404, detail="Sílabo no encontrado")

        return APIResponse(success=True, data=registro, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener sílabo {syllabus_id}: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.get("/", response_model=APIResponse)
async def listar_silabos(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    user_id: str = Depends(JWTBearer()),
):
    """Lista sílabos con paginación simple (skip, limit)."""
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        silabos = await supabase.listar_silabos(
            skip=skip,
            limit=limit,
            user_id=user_id,
        )
        return APIResponse(success=True, data={"items": silabos, "skip": skip, "limit": limit}, error=None)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al listar sílabos: {e}")
        return APIResponse(success=False, data=None, error=str(e))


@router.post("/draft", response_model=APIResponse)
async def guardar_borrador(
    datos: GuardarDraftInput,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")

    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")

    registro = await supabase.guardar_silabo(
        datos.payload_json,
        user_id=user_id,
        status=datos.status or "draft",
    )
    if not registro:
        raise HTTPException(500, "No se pudo guardar el borrador")

    return APIResponse(
        success=True,
        data=_build_editor_payload(registro),
        error=None,
    )


@router.put("/{syllabus_id}", response_model=APIResponse)
async def actualizar_borrador(
    syllabus_id: str,
    datos: ActualizarSilaboInput,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")

    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")

    existente = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not existente:
        raise HTTPException(404, "Sílabo no encontrado")

    actualizado = await supabase.actualizar_silabo(
        syllabus_id,
        datos.payload_json,
        user_id=user_id,
        status=datos.status or existente.get("status") or "draft",
    )
    if not actualizado:
        raise HTTPException(500, "No se pudo actualizar el sílabo")

    ultima_version = await supabase.obtener_ultima_version(syllabus_id)
    await supabase.guardar_version(
        syllabus_id=syllabus_id,
        payload=datos.payload_json,
        version_number=ultima_version + 1,
        changed_by=datos.changed_by or "sistema",
        note=datos.change_note or "Borrador actualizado",
    )

    return APIResponse(
        success=True,
        data=_build_editor_payload(actualizado),
        error=None,
    )


@router.get("/{syllabus_id}/export")
async def exportar_silabo(
    syllabus_id: str,
    request: Request,
    format: str = "docx",
    user_id: str = Depends(JWTBearer()),
):
    """
    Exporta sílabo a DOCX (sin rowspan, editable) o PDF (WeasyPrint).
    GET /api/syllabus/{id}/export?format=docx
    GET /api/syllabus/{id}/export?format=pdf
    """
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")

    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")

    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, f"Sílabo {syllabus_id} no encontrado")

    silabo_data = registro.get("payload_json") or registro.get("datos") or registro
    if isinstance(silabo_data, str):
        silabo_data = json.loads(silabo_data)

    ctx = build_export_context(silabo_data)
    filename = ctx.get("_filename", "silabo")

    if format == "pdf":
        try:
            pdf_bytes = generar_pdf_html(silabo_data)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}.pdf"'
                },
            )
        except ImportError as e:
            raise HTTPException(503, str(e))
        except Exception as e:
            logger.error(f"Error generando PDF: {e}")
            raise HTTPException(500, f"Error generando PDF: {e}")

    if format == "docx":
        template_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "templates",
            "anexo_c_template.docx",
        )
        try:
            docx_bytes = generar_docx(
                silabo_data,
                template_path if os.path.exists(template_path) else None,
            )
            return Response(
                content=docx_bytes,
                media_type=(
                    "application/vnd.openxmlformats-"
                    "officedocument.wordprocessingml.document"
                ),
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}.docx"'
                },
            )
        except FileNotFoundError as e:
            raise HTTPException(503, str(e))
        except Exception as e:
            logger.error(f"Error generando DOCX: {e}")
            raise HTTPException(500, f"Error generando DOCX: {e}")

    raise HTTPException(400, "Formato no soportado. Usar: docx o pdf")


class CambiarStatusInput(BaseModel):
    status: str  # draft|review|approved|published


class GuardarObservacionInput(BaseModel):
    observer_name: str
    observation: str


@router.post("/{syllabus_id}/submit-review", response_model=APIResponse)
async def enviar_revision(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Cambia el status a 'review' (enviar a revisiÃ³n)."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    ok = await supabase.actualizar_status(
        syllabus_id, "review"
    )
    if not ok:
        raise HTTPException(404, "SÃ­labo no encontrado")
    return APIResponse(
        success=True,
        data={"status": "review"},
        error=None,
    )


@router.post("/{syllabus_id}/approve", response_model=APIResponse)
async def aprobar_silabo(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Cambia el status a 'approved'."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    ok = await supabase.actualizar_status(
        syllabus_id, "approved"
    )
    if not ok:
        raise HTTPException(404, "SÃ­labo no encontrado")
    return APIResponse(
        success=True,
        data={"status": "approved"},
        error=None,
    )


@router.post("/{syllabus_id}/publish", response_model=APIResponse)
async def publicar_silabo(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Cambia el status a 'published'."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    ok = await supabase.actualizar_status(
        syllabus_id, "published"
    )
    if not ok:
        raise HTTPException(404, "SÃ­labo no encontrado")
    return APIResponse(
        success=True,
        data={"status": "published"},
        error=None,
    )


@router.get("/{syllabus_id}/versions", response_model=APIResponse)
async def listar_versiones(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Lista el historial de versiones de un sÃ­labo."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    versiones = await supabase.listar_versiones(
        syllabus_id
    )
    return APIResponse(
        success=True,
        data={"versions": versiones},
        error=None,
    )


@router.post("/{syllabus_id}/observations", response_model=APIResponse)
async def agregar_observacion(
    syllabus_id: str,
    datos: GuardarObservacionInput,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Agrega una observaciÃ³n curricular al sÃ­labo."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    obs = await supabase.guardar_observacion(
        syllabus_id,
        datos.observer_name,
        datos.observation,
    )
    return APIResponse(
        success=True, data=obs, error=None
    )


@router.get("/{syllabus_id}/observations", response_model=APIResponse)
async def listar_observaciones(
    syllabus_id: str,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """Lista las observaciones de un sÃ­labo."""
    servicios = _obtener_servicios(request)
    supabase = servicios.get("supabase")
    if not supabase:
        raise HTTPException(503, "DB no disponible")
    registro = await supabase.obtener_silabo(syllabus_id, user_id=user_id)
    if not registro:
        raise HTTPException(404, "SÃƒÂ­labo no encontrado")
    obs = await supabase.listar_observaciones(
        syllabus_id
    )
    return APIResponse(
        success=True,
        data={"observations": obs},
        error=None,
    )
