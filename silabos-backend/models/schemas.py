# Modelos Pydantic para todos los agentes de Silabos.AI
from pydantic import BaseModel, Field
from typing import Any, List, Optional
from uuid import UUID


# ─────────────────────────────────────────────
# Respuesta genérica
# ─────────────────────────────────────────────
class APIResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None


# ─────────────────────────────────────────────
# AGENTE 1 — Generador de Sílabos
# ─────────────────────────────────────────────
class GenerarSilaboInput(BaseModel):
    nombre_curso: str = Field(..., min_length=3)
    carrera: str
    facultad: str
    creditos: int = Field(default=3, ge=1, le=12)
    horas_teoria: int = Field(default=2, ge=0)
    horas_practica: int = Field(default=2, ge=0)
    semestre: str = Field(default="2025-I")
    docente: str = Field(default="Por designar")
    modalidad: str = Field(default="presencial")        # presencial|virtual|híbrido
    enfoque_didactico: str = Field(default="competencias")  # competencias|constructivista|tradicional
    carrera_id: Optional[str] = None                    # UUID de la carrera en Supabase
    persist_result: bool = True


class DatosGenerales(BaseModel):
    nombre_curso: str
    carrera: str
    facultad: str
    creditos: int
    horas_teoria: int
    horas_practica: int
    semestre: str
    docente: str
    modalidad: str


class UnidadTematica(BaseModel):
    numero: int
    titulo: str
    semanas: str
    temas: List[str]
    logro: str


class SemanaItem(BaseModel):
    semana: int
    tema: str
    actividad: str
    producto: str


class CriterioEvaluacion(BaseModel):
    nombre: str
    porcentaje: int
    descripcion: str


class SistemaEvaluacion(BaseModel):
    criterios: List[CriterioEvaluacion]
    nota_aprobatoria: int = 11
    observaciones: Optional[str] = None


class FuenteBibliografica(BaseModel):
    tipo: str           # libro|articulo|web|otro
    referencia: str     # referencia APA


class SilaboData(BaseModel):
    datos_generales: DatosGenerales
    sumilla: str
    competencias: List[str]
    unidades_tematicas: List[UnidadTematica]
    cronograma_semanal: List[SemanaItem]
    sistema_evaluacion: SistemaEvaluacion
    bibliografia: List[FuenteBibliografica]


# ─────────────────────────────────────────────
# AGENTE 2 — Buscador de Fuentes
# ─────────────────────────────────────────────
class BuscarFuentesInput(BaseModel):
    tema: str = Field(..., min_length=3)
    nivel: str = Field(default="pregrado")   # pregrado|postgrado
    anio_minimo: int = Field(default=2018)
    cantidad: int = Field(default=8, ge=1, le=20)


class FuenteAcademica(BaseModel):
    titulo: str
    url: str
    autor: Optional[str] = None
    anio: Optional[int] = None
    tipo: Optional[str] = None              # articulo|libro|tesis|web
    relevancia_score: Optional[float] = None


# ─────────────────────────────────────────────
# AGENTE 3 — Validador Curricular
# ─────────────────────────────────────────────
class ValidarSilaboInput(BaseModel):
    syllabus_id: Optional[str] = None       # UUID del sílabo en BD
    syllabus_json: Optional[dict] = None    # O directamente el JSON


class ObservacionValidacion(BaseModel):
    criterio: str
    nivel: str          # error|advertencia|sugerencia
    mensaje: str


class ValidacionData(BaseModel):
    score: int = Field(ge=0, le=100)
    observaciones: List[ObservacionValidacion]
    sugerencias: List[str]
    aprobado: bool


# ─────────────────────────────────────────────
# AGENTE 4 — Chat con Documentos
# ─────────────────────────────────────────────
class MensajeHistorial(BaseModel):
    rol: str            # user|assistant
    contenido: str


class ChatDocumentoInput(BaseModel):
    pregunta: str = Field(..., min_length=3)
    doc_ids: List[str] = []
    historial: List[MensajeHistorial] = []


class FuenteCitada(BaseModel):
    doc_id: str
    fragmento: str


class ChatDocumentoData(BaseModel):
    respuesta: str
    fuentes_citadas: List[FuenteCitada]


# ─────────────────────────────────────────────
# Sesión de chat
# ─────────────────────────────────────────────
class NuevaSesionInput(BaseModel):
    titulo: Optional[str] = "Nueva conversación"
    doc_ids: List[str] = []


# ─────────────────────────────────────────────
# Búsqueda bibliográfica — Fase 2
# ─────────────────────────────────────────────
class BuscarBibliografiaInput(BaseModel):
    keywords: str = Field(..., min_length=3)
    area: str = Field(default="")
    doi_list: List[str] = Field(default=[])
    course_name: str = Field(default="")


class BibliografiaGuideResponse(BaseModel):
    method: str
    estimated_time_minutes: int
    coffee_break: bool
    steps: list
    automatic_fallback: dict


# ─────────────────────────────────────────────
# Documentos / Upload
# ─────────────────────────────────────────────
class DocumentoInfo(BaseModel):
    id: str
    nombre: str
    carrera_id: Optional[str] = None
    storage_path: str
    texto_extraido: Optional[str] = None
    creado_en: Optional[str] = None
