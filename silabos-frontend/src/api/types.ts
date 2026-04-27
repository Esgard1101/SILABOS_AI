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
  ra_unidad?: string | null;
  habilidades_requeridas?: string;
  actitudes?: string[];
}

export interface SemanaItem {
  semana: number;
  tema: string;
  actividad: string;
  producto: string;
  fecha?: string | null;
  desempeno?: string | null;
  desempeno_code?: string | null;
  conocimientos?: string[] | null;
  habilidades?: string[] | null;
  actitudes?: string[] | null;
  evidencia?: string | null;
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
  evaluacion_matriz?: EvaluacionMatrizRow[];
  bibliografia?: FuenteBibliografica[];
  metodologia?: string;
  tutoria?: string;
  [key: string]: unknown;
}

export interface EvaluacionMatrizRow {
  resultado_aprendizaje?: string;
  resultadoDeAprendizaje?: string;
  desempeno: string;
  desempenos?: string;
  habilidades?: string[] | string;
  evidencias: string;
  evidenciasDeAprendizaje?: string;
  instrumentos: string;
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
  ref_count?: number;
  references?: string[];
  bibliography_rows?: BibliographyReferenceRow[];
  bibliografia?: FuenteBibliografica[];
}

export interface BibliographyReferenceRow {
  apa_format?: string;
  ref_text?: string;
  title?: string | null;
  authors?: string[];
  year?: number | null;
  type?: string | null;
  display_text?: string | null;
  doi?: string | null;
  url?: string | null;
  source?: string | null;
  verified?: boolean;
  doc_id?: string | null;
  course_id?: string | null;
  ref_order?: number | null;
  created_at?: string | null;
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
  hours_theory?: number | null;
  hours_practice?: number | null;
  prerequisites?: string | null;
  tipo_curso?: string | null;
  naturaleza?: string | null;
  temas_conocimientos?: string[] | null;
  habilidades_desempenos?: string[] | null;
  actividades_metodo?: string[] | null;
}

export interface MethodItem {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  secuencia_didactica?: string | null;
  proposito?: string | null;
  rol_docente?: string | null;
  rol_estudiante?: string | null;
  phases?: string[] | null;
  productos_tipicos?: string[] | null;
  tecnicas_didacticas?: string[] | null;
  estrategias_evaluacion?: string | null;
  instrumentos_evaluacion?: string[] | null;
}

export interface MethodSuggest {
  method_id: string | null;
  method_name: string;
  method_code?: string | null;
  reason: string;
  phases?: string[] | null;
  complementario?: { method_id: string; method_name: string } | null;
}

export interface SyllabusGenerateV2Input {
  course_id: string;
  teaching_method_id: string | null;
  semester: string;
  selected_skill_ids?: string[];
  selected_skill_categories?: string[];
  grading_scheme?: Array<{
    evidencia: string;
    sigla: string;
    porcentaje: number;
    cronograma: string;
  }>;
  grading_requires_midterm_final?: boolean;
}

// ── Admin — Teaching Methods DB ────────────────────────────────────────────

export interface TeachingMethodDB {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  phases?: string[];
  weekly_template?: string | null;
  tecnicas_didacticas?: unknown[];
  estrategias_evaluacion?: string | null;
  instrumentos_evaluacion?: unknown[];
  is_archived?: boolean;
}

// ── Admin — Skills Catalog DB ──────────────────────────────────────────────

export interface SkillDB {
  id: string;
  id_habilidad?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoria: string;
  subcategoria?: string | null;
  nivel_cognitivo?: string | null;
  verbo_principal?: string | null;
  evidencias_sugeridas?: string | null;
  instrumentos_sugeridos?: string | null;
  estado?: string;
}

// ── Admin — Performances ───────────────────────────────────────────────────

export interface PerformanceDB {
  id: string;
  course_id: string;
  code?: string | null;
  statement: string;
  display_order?: number;
  is_archived?: boolean;
}

// ── Admin — Method-Skill Links ─────────────────────────────────────────────

export interface MethodSkillLink {
  id: string;
  method_id: string;
  skill_id: string;
  skill_nombre?: string | null;
  skill_categoria?: string | null;
  priority?: number;
  is_recommended?: boolean;
}

// ── Admin — User Scope Assignments ─────────────────────────────────────────

export interface UserScopeAssignment {
  id: string;
  user_id: string;
  scope_type: 'career' | 'program';
  scope_id: string;
  scope_name?: string | null;
  assigned_at?: string | null;
}

// ── Admin — Permission Overrides ───────────────────────────────────────────

export interface PermissionOverride {
  id: string;
  user_id: string;
  permission_key: string;
  effect: 'allow' | 'deny';
  granted_by?: string | null;
  granted_at?: string | null;
}

// ── Wizard — Compatible Skills Response ────────────────────────────────────

export interface CompatibleSkillsResponse {
  recommended_skills: SkillDB[];
  compatible_skills: SkillDB[];
  total: number;
  fallback_mode: boolean;
}

export interface SkillSuggestResponse {
  skills: SkillDB[];
  total: number;
}

// ── Admin — Curriculum History ─────────────────────────────────────────────

export interface CurriculumHistoryItem {
  id: string;
  course_id: string;
  action: string;
  payload_before?: Record<string, unknown> | null;
  payload_after?: Record<string, unknown> | null;
  changed_at: string;
  changed_by_name?: string | null;
}

// ── Admin — Effective Permissions ──────────────────────────────────────────

export interface EffectivePermissions {
  permissions: Record<string, boolean>;
  role: string;
  scopes: UserScopeAssignment[];
  override_list?: PermissionOverride[];
}

// ── Wizard Progresivo v3 ────────────────────────────────────────────────────

export type StepBlockStatus = 'empty' | 'suggested' | 'edited' | 'approved' | 'dirty';

export interface WorkflowBlockState {
  status: StepBlockStatus;
  dirty: boolean;
}

export type WorkflowState = Record<string, WorkflowBlockState>;

export interface SuggestedPerformance {
  code: string;
  statement: string;
  origin: 'official' | 'ai_suggested' | 'teacher_edited_from_ai';
}

export interface PurposeBlock {
  curriculum_snapshot: Record<string, unknown>;
  performances: SuggestedPerformance[];
  performances_origin: 'official' | 'ai_suggested' | 'teacher_edited_from_ai' | 'none';
  teacher_notes: string;
  approval_state: StepBlockStatus;
}

export interface ContentBlock {
  habilidades_sugeridas: string[];
  habilidades_por_desempeno: HabilidadPorDesempeno[];
  selected_skill_ids: string[];
  knowledge_items: string[];
  attitudes: string[];
  source: 'none' | 'ai_suggested' | 'manual' | 'confirmed' | 'editing';
  content_mode: 'idle' | 'proposal' | 'editing' | 'confirmed';
  teacher_notes: string;
  approval_state: StepBlockStatus;
}

export interface MethodBlock {
  suggested_method_id: string | null;
  suggestion_reason: string;
  selected_method_id: string | null;
  selected_method_name: string;
  compatibility_snapshot: Record<string, unknown>;
  teacher_notes: string;
  approval_state: StepBlockStatus;
}

export interface GradingRow {
  evidencia: string;
  sigla: string;
  porcentaje: number;
  cronograma: string;
}

export interface GradingBlock {
  template_origin: 'none' | 'method_template' | 'ai_suggested' | 'manual';
  rows: GradingRow[];
  total_percent: number;
  teacher_notes: string;
  approval_state: StepBlockStatus;
}

export interface BiblioBlock {
  doc_ids: string[];
  references: string[];
  sources_consulted?: string[];
}

export interface ProgressiveDraftMeta {
  wizard_version: string;
  current_step: string;
  requires_academic_validation: boolean;
  academic_validation_status: 'not_required' | 'pending' | 'approved' | 'returned';
}

export interface ProgressiveDraft {
  id: string;
  course_id: string;
  semester: string;
  status: string;
  wizard_version: string;
  current_step: string;
  requires_academic_validation: boolean;
  academic_validation_status: string;
  program_id?: string | null;
  created_at: string;
  updated_at: string;
  payload_json: {
    _meta: ProgressiveDraftMeta;
    _workflow: WorkflowState;
    course_snapshot: Record<string, unknown>;
    bibliography: BiblioBlock;
    purpose: PurposeBlock;
    content: ContentBlock;
    method: MethodBlock;
    grading: GradingBlock;
    final_syllabus?: Record<string, unknown> | null;
  };
}

export interface EvidenceCatalogItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priority?: number;
  is_recommended?: boolean;
}

export interface InstrumentCatalogItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priority?: number;
  is_recommended?: boolean;
}

export interface HabilidadPorDesempeno {
  desempeno_code: string;
  habilidades: string[];
}

export interface ContentSuggestion {
  conocimientos: string[];
  actitudes: string[];
  habilidades_sugeridas: string[];
  habilidades_por_desempeno: HabilidadPorDesempeno[];
}

export interface GradingSuggestion {
  rows: GradingRow[];
  origin: 'method_template' | 'ai_suggested';
}
