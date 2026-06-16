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
    capacidad: Optional[str] = None
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


class VerificationCard(BaseModel):
    id: str
    titulo: str
    objetivo: str
    estado: str
    resumen: str
    evidencia: Optional[str] = None
    siguiente_accion: Optional[str] = None


class ValidacionData(BaseModel):
    score: int = Field(ge=0, le=100)
    observaciones: List[ObservacionValidacion]
    sugerencias: List[str]
    aprobado: bool
    audit_mode: Optional[str] = None
    dashboard_title: Optional[str] = None
    target_status_cards: List[VerificationCard] = Field(default=[])


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
    doi_list: List[str] = Field(default_factory=list)
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


# ─────────────────────────────────────────────
# Generación v2 — Wizard 4 pasos
# Recibe IDs; el backend obtiene los datos de BD
# ─────────────────────────────────────────────
class GradingRowInput(BaseModel):
    evidencia: str
    sigla: str
    porcentaje: float
    cronograma: str


class SyllabusGenerateRequest(BaseModel):
    course_id: str = Field(..., description="UUID del curso seleccionado")
    teaching_method_id: Optional[int] = Field(
        default=None,
        description="ID del método pedagógico (catálogo). None → IA sugiere"
    )
    semester: str = Field(
        default="2025-I",
        description="Semestre académico, ej: 2025-I"
    )
    selected_skill_categories: List[str] = Field(
        default=[],
        description="Categorías de skills_catalog seleccionadas por el docente"
    )
    grading_scheme: Optional[List[GradingRowInput]] = Field(
        default=None,
        description="Tabla de calificación personalizada. None → IA propone"
    )
    grading_requires_midterm_final: bool = Field(
        default=False,
        description="Si True, el prompt exige incluir examen parcial y final"
    )


# ─────────────────────────────────────────────
# Schemas de respuesta para cursos y métodos
# ─────────────────────────────────────────────
class GradingSchemeItem(BaseModel):
    evidencia: str
    sigla: str
    porcentaje: int = Field(ge=0, le=100)
    cronograma: str


class LegacySyllabusGenerateRequest(BaseModel):
    course_id: str = Field(..., description="UUID del curso seleccionado")
    teaching_method_id: Optional[int] = Field(
        default=None,
        description="ID del método pedagógico (catálogo). None -> IA sugiere"
    )
    semester: str = Field(
        default="2025-I",
        description="Semestre académico, ej: 2025-I"
    )
    grading_scheme: Optional[List[GradingSchemeItem]] = None
    grading_requires_midterm_final: bool = False


class CourseListItem(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    credits: Optional[int] = None
    cycle: Optional[int] = None
    is_common: bool = False
    scope: Optional[str] = None


class CourseDetail(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    credits: Optional[int] = None
    cycle: Optional[int] = None
    is_common: bool = False
    scope: Optional[str] = None
    sumilla: Optional[str] = None
    competencia_egreso: Optional[str] = None
    resultado_aprendizaje: Optional[str] = None
    capacidad: Optional[str] = None


class MethodItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    secuencia_didactica: Optional[str] = None


class MethodSuggestResponse(BaseModel):
    method_id: int
    method_name: str
    reason: str
    reason_items: List[str] = Field(default=[])


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Teaching Methods (desde DB)
# ─────────────────────────────────────────────
class TeachingMethodCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(default="")
    description: str = Field(default="")
    phases: List[str] = Field(default=[])
    weekly_template: str = Field(default="")
    tecnicas_didacticas: List[Any] = Field(default=[])
    estrategias_evaluacion: str = Field(default="")
    instrumentos_evaluacion: List[Any] = Field(default=[])


class TeachingMethodUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    phases: Optional[List[str]] = None
    weekly_template: Optional[str] = None
    tecnicas_didacticas: Optional[List[Any]] = None
    estrategias_evaluacion: Optional[str] = None
    instrumentos_evaluacion: Optional[List[Any]] = None


# ─────────────────────────────────────────────
# SPEC-08 8c — Catálogo de items de evaluación
# ─────────────────────────────────────────────
class EvaluationPresetCreate(BaseModel):
    sigla: str = Field(..., min_length=1, max_length=12)
    nombre: str = Field(..., min_length=2)
    pct_sugerido: Optional[int] = Field(default=None, ge=0, le=100)
    program_id: Optional[str] = None  # None = preset global (solo admin)


class EvaluationPresetUpdate(BaseModel):
    sigla: Optional[str] = Field(default=None, min_length=1, max_length=12)
    nombre: Optional[str] = Field(default=None, min_length=2)
    pct_sugerido: Optional[int] = Field(default=None, ge=0, le=100)
    program_id: Optional[str] = None
    activo: Optional[bool] = None


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Skills Admin
# ─────────────────────────────────────────────
class SkillCreate(BaseModel):
    id_habilidad: str = Field(default="")
    nombre: str = Field(..., min_length=2)
    descripcion: str = Field(default="")
    categoria: str = Field(..., min_length=2)
    subcategoria: str = Field(default="")
    nivel_cognitivo: str = Field(default="")
    verbo_principal: str = Field(default="")
    evidencias_sugeridas: str = Field(default="")
    instrumentos_sugeridos: str = Field(default="")


class SkillUpdate(BaseModel):
    id_habilidad: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    nivel_cognitivo: Optional[str] = None
    verbo_principal: Optional[str] = None
    evidencias_sugeridas: Optional[str] = None
    instrumentos_sugeridos: Optional[str] = None


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Curriculum del Curso
# ─────────────────────────────────────────────
class CourseCurriculumUpdate(BaseModel):
    sumilla: Optional[str] = None
    competencia_egreso: Optional[str] = None
    resultado_aprendizaje: Optional[str] = None
    capacidad: Optional[str] = None


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Performances (desempeños)
# ─────────────────────────────────────────────
class PerformanceCreate(BaseModel):
    statement: str = Field(..., min_length=5)


class PerformanceUpdate(BaseModel):
    statement: str = Field(..., min_length=5)


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Method-Skill Links
# ─────────────────────────────────────────────
class MethodSkillLinkCreate(BaseModel):
    skill_id: str = Field(..., description="UUID de la skill en skills_catalog")
    priority: int = Field(default=50, ge=1, le=100)
    is_recommended: bool = Field(default=False)


class MethodSkillLinkUpdate(BaseModel):
    priority: int = Field(..., ge=1, le=100)
    is_recommended: bool


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Scopes de Usuario
# ─────────────────────────────────────────────
class UserScopeCreate(BaseModel):
    scope_type: str = Field(..., pattern="^(career|program)$")
    scope_id: str = Field(..., description="UUID de la carrera o programa")


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Overrides de Permisos
# ─────────────────────────────────────────────
class UserPermissionOverrideCreate(BaseModel):
    permission_key: str = Field(..., min_length=3)
    effect: str = Field(..., pattern="^(allow|deny)$")


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Cambio de Rol
# ─────────────────────────────────────────────
class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|director|coordinador|docente)$")


# ─────────────────────────────────────────────
# ITERACIÓN 1 — Wizard Skills Request Update
# ─────────────────────────────────────────────
class SyllabusGenerateV2Request(BaseModel):
    course_id: str = Field(..., description="UUID del curso")
    teaching_method_id: Optional[str] = Field(
        default=None, description="UUID del método pedagógico. None → IA sugiere"
    )
    semester: str = Field(default="2025-I")
    selected_skill_ids: List[str] = Field(
        default=[], description="UUIDs de habilidades confirmadas por el docente"
    )
    grading_scheme: Optional[List[GradingRowInput]] = None
    grading_requires_midterm_final: bool = Field(default=False)
