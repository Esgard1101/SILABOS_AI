// Tipos base de respuesta de la API FastAPI
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export type APIResponse<T = unknown> = ApiResponse<T>;

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    career_id?: string | null;
    status?: UserAccountStatus;
    auth_provider?: string;
  };
}

export type UserAccountStatus = 'pending' | 'active' | 'rejected';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  career_id?: string | null;
  status?: UserAccountStatus;
  auth_provider?: string;
}

export interface GoogleTokenRequest {
  id_token: string;
}

export interface GoogleRegisterRequest extends GoogleTokenRequest {
  career_id: string;
}

export interface GoogleAuthData {
  account_status: 'active' | 'pending' | 'rejected' | 'not_registered';
  message: string;
  access_token?: string;
  token_type?: string;
  user?: AuthUser | null;
}

export type GoogleAuthResponse = ApiResponse<GoogleAuthData>;

export interface AdminUserItem extends AuthUser {
  created_at?: string | null;
  approved_at?: string | null;
  google_sub?: string | null;
}

export interface AdminCourseItem {
  id: string;
  name: string;
  code?: string | null;
  credits?: number | null;
  cycle?: number | null;
  is_common?: boolean;
  scope?: string | null;
  sumilla?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  career_id?: string | null;
  career_name?: string | null;
  faculty_id?: string | null;
  faculty_name?: string | null;
}

export interface CourseSumillaHistoryItem {
  id: string;
  course_id: string;
  previous_sumilla?: string | null;
  new_sumilla: string;
  changed_by?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
}

// Entrada para generar silabo
export interface GenerateSyllabusInput {
  nombre_curso: string;
  carrera: string;
  facultad: string;
  creditos: number;
  horas_teoria: number;
  horas_practica: number;
  semestre: string;
  docente: string;
  modalidad: 'presencial' | 'virtual' | 'hibrido';
  enfoque_didactico: 'competencias' | 'constructivista' | 'tradicional';
  carrera_id?: string | null;
  persist_result?: boolean;
}

export interface CriterioEvaluacion {
  nombre: string;
  porcentaje: number;
  descripcion?: string;
  sigla?: string;
  cronograma?: string;
  editable?: boolean;
  instrumento?: string;
}

export interface SistemaEvaluacion {
  criterios: CriterioEvaluacion[];
  nota_aprobatoria?: number;
  observaciones?: string | null;
}

export interface UnidadTematica {
  numero: number;
  titulo: string;
  semanas: string;
  temas: string[];
  logro: string;
  habilidades_requeridas?: string;
}

export interface SemanaItem {
  semana: number;
  tema: string;
  actividad: string;
  producto: string;
}

export interface FuenteBibliografica {
  tipo: string;
  referencia: string;
}

// Bibliografia
export interface BibliographyReference {
  apa_format: string;
  doi: string | null;
  url: string;
  source: string;
  verified: boolean;
}

export interface BibliographySearchRequest {
  keywords: string;
  area?: string;
  doi_list?: string[];
  course_name?: string;
}

export interface BibliographySearchResponse {
  references: BibliographyReference[];
  total: number;
  sources_consulted: string[];
}

// Tipos para la guia estatica de Deep Research
export interface DeepResearchStep {
  step: number;
  title: string;
  description: string;
  url?: string;
  action?: string;
  prompt_template?: string;
  tip?: string;
  important?: string;
  result?: string;
  coffee_break?: boolean;
}

export interface InstitutionalCareer {
  id: string;
  name: string;
  code: string;
}

export interface InstitutionalFaculty {
  id: string;
  name: string;
  code: string;
  careers: InstitutionalCareer[];
}

export interface InstitutionalFacultiesResponse {
  faculties: InstitutionalFaculty[];
}

// Estructura principal del silabo (se deja flexible para compatibilidad)
export interface SyllabusData {
  _id?: string;
  id?: string;
  status?: SyllabusStatus;
  created_at?: string;
  updated_at?: string;
  semester?: string;
  teacher_name?: string;
  payload_json?: SyllabusData;
  datos_generales?: {
    course_id?: string;
    nombre_curso?: string;
    carrera?: string;
    facultad?: string;
    escuela_profesional?: string;
    programa_estudios?: string;
    creditos?: number;
    horas_teoria?: number;
    horas_practica?: number;
    semestre?: string;
    periodo_academico?: string;
    docente?: string;
    docente_email?: string;
    modalidad?: string;
    codigo?: string;
    prerrequisito?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  };
  sumilla?: string;
  competencias?: string[];
  competencia_profesional?: string;
  resultados_aprendizaje?: string[];
  capacidad_del_curso?: string;
  desempenos?: Array<string | { codigo?: string; descripcion?: string; logro?: string; statement?: string }>;
  unidades_tematicas?: UnidadTematica[];
  cronograma_semanal?: SemanaItem[];
  sistema_evaluacion?: SistemaEvaluacion;
  bibliografia?: FuenteBibliografica[];
  metodologia?: string;
  tutoria?: string;
  [key: string]: unknown;
}

export interface DocumentItem {
  id: string;
  nombre: string;
  carrera_id?: string | null;
  storage_path?: string;
  texto_extraido?: string | null;
  created_at?: string | null;
  doc_type?: string;
  name?: string;
}

export interface ValidationObservation {
  criterio: string;
  nivel: 'error' | 'advertencia' | 'sugerencia' | string;
  mensaje: string;
}

export interface ValidationResult {
  score: number;
  observaciones: ValidationObservation[];
  sugerencias: string[];
  aprobado: boolean;
}

export interface SourceItem {
  titulo: string;
  url: string;
  autor?: string | null;
  anio?: number | null;
  tipo?: string | null;
  relevancia_score?: number | null;
}

export interface SyllabusListData {
  items: SyllabusListItem[];
  skip: number;
  limit: number;
}

export interface DocumentListData {
  items: DocumentItem[];
}

export interface SourcesData {
  fuentes: SourceItem[];
  total: number;
  tema: string;
}

export interface HealthData {
  api: string;
  gemini: string;
  openrouter: string;
  supabase: string;
  google_search: string;
}

export type SyllabusStatus =
  'draft' | 'review' | 'returned' | 'approved' | 'published' | 'generated' | 'exported';

export interface SyllabusVersion {
  id: string;
  syllabus_id: string;
  version_number: number;
  changed_by: string;
  change_note: string;
  created_at: string;
}

export interface SyllabusObservation {
  id: string;
  syllabus_id: string;
  observer_name: string;
  observation: string;
  status: string;
  created_at: string;
}

export interface SyllabusListItem {
  id: string;
  semester: string;
  teacher_name: string;
  status: SyllabusStatus;
  created_at: string;
  updated_at: string;
  payload_json?: SyllabusData;
}

export interface TeachingMethod {
  id: number;
  nombre: string;
  descripcion: string;
  tipo_actividades: string[];
  tipo_evidencias: string[];
  secuencia_didactica: string;
}

export interface InstitutionalSkill {
  id: number | string;
  id_habilidad?: string;
  nombre: string;
  categoria: string;
  subcategoria?: string;
  nivel: string;
  verbo: string;
  descripcion: string;
}

export interface EvaluationInstrument {
  id: number;
  nombre: string;
  tipo: string;
  descripcion: string;
}

export interface AnalyticsOverview {
  total_syllabi: number;
  total_documents: number;
  total_users: number;
  completion_rate: number;
}

export interface AnalyticsByStatus {
  status: string;
  key: string;
  count: number;
  color: string;
}

export interface AnalyticsByProgram {
  programa: string;
  syllabi: number;
  completados: number;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  by_status: AnalyticsByStatus[];
  programs: AnalyticsByProgram[];
}

export interface TeachingMethodsResponse {
  methods: TeachingMethod[];
  total: number;
}

export interface InstitutionalSkillsResponse {
  skills: InstitutionalSkill[];
  total: number;
  categorias: string[];
}

export interface EvaluationInstrumentsResponse {
  instruments: EvaluationInstrument[];
  total: number;
}

export type SyllabusResponse = ApiResponse<SyllabusData>;
export type SyllabusListResponse = ApiResponse<SyllabusListData>;
export type DocumentResponse = ApiResponse<DocumentItem>;
export type DocumentListResponse = ApiResponse<DocumentListData>;
export type ValidationResponse = ApiResponse<ValidationResult>;
export type SourcesResponse = ApiResponse<SourcesData>;
export type HealthResponse = ApiResponse<HealthData>;
export type BibliographySearchApiResponse = ApiResponse<BibliographySearchResponse>;
export type AdminUserListResponse = ApiResponse<{ items: AdminUserItem[] }>;
export type AdminCourseListResponse = ApiResponse<{ items: AdminCourseItem[] }>;
export type CourseSumillaHistoryResponse = ApiResponse<{ items: CourseSumillaHistoryItem[] }>;

// ── Wizard v2 — Programas, Cursos, Métodos ─────────────────────────────────

export interface ProgramItem {
  id: string;
  name: string;
  coordinator?: string | null;
  career_id?: string | null;
}

export interface CourseListItem {
  id: string;
  name: string;
  code?: string | null;
  credits?: number | null;
  cycle?: number | null;
  is_common?: boolean;
  scope?: string | null;
}

export interface CourseDetail extends CourseListItem {
  sumilla?: string | null;
  competencia_egreso?: string | null;
  resultado_aprendizaje?: string | null;
  capacidad?: string | null;
}

export interface MethodItem {
  id: number;
  name: string;
  description?: string | null;
  secuencia_didactica?: string | null;
}

export interface MethodSuggest {
  method_id: number;
  method_name: string;
  reason: string;
}

export interface SyllabusGenerateV2Input {
  course_id: string;
  teaching_method_id: number | null;
  semester: string;
  selected_skill_categories?: string[];
  grading_scheme?: Array<{
    evidencia: string;
    sigla: string;
    porcentaje: number;
    cronograma: string;
  }>;
  grading_requires_midterm_final?: boolean;
}
