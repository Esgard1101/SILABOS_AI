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
from models.schemas import GenerarSilaboInput, SyllabusGenerateRequest, ValidarSilaboInput, APIResponse
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


def _normalize_text(value) -> str:
    return str(value or "").strip().lower()


def _matches_criterion(criterion: dict, *, keyword: str, sigla: str) -> bool:
    text = " ".join(
        [
            _normalize_text(criterion.get("nombre")),
            _normalize_text(criterion.get("descripcion")),
            _normalize_text(criterion.get("cronograma")),
        ]
    )
    return keyword in text or _normalize_text(criterion.get("sigla")) == sigla.lower()


def _ensure_midterm_final_criteria(criteria: list) -> list:
    normalized = [dict(item) for item in criteria if isinstance(item, dict)]
    if not normalized:
        return normalized

    has_midterm = any(
        _matches_criterion(item, keyword="parcial", sigla="EP") for item in normalized
    )
    has_final = any(
        _matches_criterion(item, keyword="final", sigla="EF") for item in normalized
    )
    if has_midterm and has_final:
        return normalized

    if len(normalized) == 1:
        total = int(normalized[0].get("porcentaje") or 100)
        parcial_pct = total // 2
        final_pct = total - parcial_pct
        return [
            {
                "nombre": "Examen parcial",
                "porcentaje": parcial_pct,
                "descripcion": "Evaluacion parcial",
                "sigla": "EP",
                "cronograma": "Semana 8",
            },
            {
                "nombre": "Examen final",
                "porcentaje": final_pct,
                "descripcion": "Evaluacion final",
                "sigla": "EF",
                "cronograma": "Semana 16",
            },
        ]

    candidate_indexes = [
        index
        for index, item in enumerate(normalized)
        if _normalize_text(item.get("sigla")) != "ta"
    ]
    if not candidate_indexes:
        candidate_indexes = list(range(len(normalized)))

    midterm_index = candidate_indexes[0]
    final_index = candidate_indexes[-1]
    if midterm_index == final_index and len(normalized) > 1:
        final_index = len(normalized) - 1 if midterm_index != len(normalized) - 1 else 0

    if not has_midterm:
        normalized[midterm_index] = {
            **normalized[midterm_index],
            "nombre": "Examen parcial",
            "descripcion": "Evaluacion parcial",
            "sigla": "EP",
            "cronograma": "Semana 8",
        }

    if not has_final:
        normalized[final_index] = {
            **normalized[final_index],
            "nombre": "Examen final",
            "descripcion": "Evaluacion final",
            "sigla": "EF",
            "cronograma": "Semana 16",
        }

    return normalized

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
    Genera un sílabo universitario completo usando Gemini Flash-Lite.
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
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el sílabo",
        )


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
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el sílabo",
        )


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
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el sílabo",
        )


@router.get("/", response_model=APIResponse)
async def listar_silabos(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    program_id: str = None,
    user_id: str = Depends(JWTBearer()),
):
    """
    Lista sílabos con paginación simple (skip, limit).
    Si se pasa program_id, filtra por los cursos del programa (incluye comunes).
    """
    try:
        servicios = _obtener_servicios(request)
        supabase = servicios.get("supabase")

        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        if program_id:
            silabos = await supabase.listar_silabos_programa(
                user_id=user_id,
                program_id=program_id,
                skip=skip,
                limit=limit,
            )
        else:
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


@router.post("/generate-v2", response_model=APIResponse)
async def generar_silabo_v2(
    datos: SyllabusGenerateRequest,
    request: Request,
    user_id: str = Depends(JWTBearer()),
):
    """
    Genera un sílabo usando el wizard de 4 pasos.
    Recibe course_id, teaching_method_id y semester.
    Obtiene sumilla, competencias y método desde la BD.
    """
    try:
        servicios = _obtener_servicios(request)
        gemini = servicios.get("gemini")
        supabase = servicios.get("supabase")

        if not gemini:
            raise HTTPException(status_code=503, detail="Servicio de IA no disponible")
        if not supabase:
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

        if datos.grading_scheme:
            total_porcentaje = sum(item.porcentaje for item in datos.grading_scheme)
            if total_porcentaje != 100:
                raise HTTPException(
                    status_code=400,
                    detail="La suma de la ponderación debe ser exactamente 100%",
                )

        # Obtener datos del curso desde BD
        curso = await supabase.obtener_curso(datos.course_id)
        if not curso:
            raise HTTPException(status_code=404, detail=f"Curso {datos.course_id} no encontrado")

        # Obtener método pedagógico del catálogo
        from routers.institutional_catalog import METODOS_TRONALES
        metodo_dict = None
        method_id = datos.teaching_method_id

        if method_id:
            metodo_raw = next((m for m in METODOS_TRONALES if m["id"] == method_id), None)
            if metodo_raw:
                metodo_dict = {
                    "name": metodo_raw["nombre"],
                    "secuencia_didactica": metodo_raw["secuencia_didactica"],
                }
        else:
            # IA elige automáticamente (primer método como fallback)
            metodo_raw = METODOS_TRONALES[0]
            metodo_dict = {
                "name": metodo_raw["nombre"],
                "secuencia_didactica": metodo_raw["secuencia_didactica"],
            }

        # Construir datos para el prompt con info del curso desde BD
        datos_prompt = {
            "nombre_curso": curso.get("name", ""),
            "carrera": "",   # Se llenará con datos del programa si está disponible
            "facultad": "",
            "creditos": curso.get("credits", 3),
            "horas_teoria": 2,
            "horas_practica": 2,
            "semestre": datos.semester,
            "docente": "Por designar",
            "modalidad": "presencial",
            "enfoque_didactico": "competencias",
            # Datos ricos del curso
            "sumilla": curso.get("sumilla", ""),
            "competencia_egreso": curso.get("competencia_egreso", ""),
            "resultado_aprendizaje": curso.get("resultado_aprendizaje", ""),
            "capacidad": curso.get("capacidad", ""),
            "grading_scheme": [item.model_dump() for item in (datos.grading_scheme or [])],
            "grading_requires_midterm_final": datos.grading_requires_midterm_final,
        }

        # Contexto curricular vacío por defecto
        contexto_curricular = ""

        # Llamar al generador con el método pedagógico
        from prompts.syllabus_prompt import construir_prompt_silabo
        from google import genai
        import os

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")

        prompt = construir_prompt_silabo(datos_prompt, contexto_curricular, metodo=metodo_dict)

        client = genai.Client(api_key=api_key)
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
        except Exception as e:
            error_message = str(e).lower()
            logger.error(f"Error del proveedor Gemini al generar sÃ­labo v2: {e}")
            if any(
                keyword in error_message
                for keyword in ("429", "quota", "rate limit", "exhausted")
            ):
                raise HTTPException(
                    status_code=429,
                    detail="Perdón, la IA está muy ocupada en este momento. Intenta de nuevo en 1 minuto mientras tomas un café ☕",
                )
            raise HTTPException(
                status_code=500,
                detail="Error interno al generar el sílabo",
            )

        texto = response.text.strip()
        if texto.startswith("```"):
            partes = texto.split("```")
            texto = partes[1] if len(partes) > 1 else texto
            if texto.startswith("json"):
                texto = texto[4:]
            texto = texto.strip()

        silabo = json.loads(texto)

        if curso.get("capacidad") and not silabo.get("capacidad_del_curso"):
            silabo["capacidad_del_curso"] = curso["capacidad"]

        if datos.grading_scheme:
            silabo.setdefault("sistema_evaluacion", {})
            silabo["sistema_evaluacion"]["criterios"] = [
                {
                    "nombre": item.evidencia,
                    "porcentaje": item.porcentaje,
                    "descripcion": item.cronograma,
                    "sigla": item.sigla,
                    "cronograma": item.cronograma,
                }
                for item in datos.grading_scheme
            ]
        elif datos.grading_requires_midterm_final:
            silabo.setdefault("sistema_evaluacion", {})
            criterios_actuales = silabo["sistema_evaluacion"].get("criterios") or []
            silabo["sistema_evaluacion"]["criterios"] = _ensure_midterm_final_criteria(
                criterios_actuales
            )

        # Enriquecer con course_id y semester para que guardar_silabo funcione
        if "datos_generales" not in silabo:
            silabo["datos_generales"] = {}
        silabo["datos_generales"]["course_id"] = datos.course_id
        silabo["datos_generales"]["semestre"] = datos.semester

        # Guardar en BD
        silabo_guardado = await supabase.guardar_silabo(
            silabo,
            user_id=user_id,
            status="draft",
        )
        if not silabo_guardado.get("id"):
            raise HTTPException(status_code=500, detail="No se pudo guardar el sílabo generado")

        await supabase.guardar_version(
            syllabus_id=silabo_guardado["id"],
            payload=silabo,
            version_number=1,
            changed_by="sistema",
            note=f"Generado con método: {metodo_dict['name']}",
        )

        return APIResponse(
            success=True,
            data=_build_editor_payload(silabo_guardado),
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al generar sílabo v2: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el sílabo",
        )


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
