import {
  AdminCourseListResponse,
  AdminUserListResponse,
  AnalyticsDashboard,
  APIResponse,
  AuthUser,
  BibliographySearchApiResponse,
  BibliographySearchRequest,
  CompatibleSkillsResponse,
  CourseSumillaHistoryItem,
  CourseSumillaHistoryResponse,
  CurriculumHistoryItem,
  CourseDetail,
  CourseListItem,
  DocumentListResponse,
  DocumentResponse,
  EffectivePermissions,
  EvaluationInstrumentsResponse,
  GenerateSyllabusInput,
  GoogleAuthResponse,
  GoogleRegisterRequest,
  GoogleTokenRequest,
  HealthResponse,
  InstitutionalFacultiesResponse,
  InstitutionalSkillsResponse,
  LoginRequest,
  LoginResponse,
  MethodItem,
  MethodSkillLink,
  MethodSuggest,
  PerformanceDB,
  PermissionOverride,
  ProgramItem,
  SkillDB,
  SourcesResponse,
  SyllabusGenerateV2Input,
  SyllabusListResponse,
  SyllabusResponse,
  TeachingMethodDB,
  TeachingMethodsResponse,
  UserScopeAssignment,
  ValidationResponse,
} from './types';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getToken = (): string | null => {
  return sessionStorage.getItem('silabos_token');
};

export const clearSession = (): void => {
  sessionStorage.removeItem('silabos_token');
  sessionStorage.removeItem('silabos_user');
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function buildHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  const token = getToken();

  if (token) {
    merged.set('Authorization', `Bearer ${token}`);
  }

  return merged;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function handleUnauthorized(response: Response) {
  if (response.status !== 401) {
    return;
  }

  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = timeoutMs ? window.setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(options.headers),
      signal: controller.signal,
    });

    handleUnauthorized(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La solicitud excedio el tiempo de espera');
    }

    if (error instanceof Error && /Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
      throw new Error('Error de conexion con el servidor');
    }

    throw error;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

function normalizeDocument<T extends { created_at?: string | null; creado_en?: string | null }>(document: T) {
  return {
    ...document,
    created_at: document.created_at ?? document.creado_en ?? null,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<T> {
  const response = await fetchWithAuth(path, options, timeoutMs);
  const body = await readResponseBody(response);

  if (!response.ok) {
    const message =
      (typeof body === 'object' && body && 'error' in body && typeof body.error === 'string' && body.error) ||
      (typeof body === 'object' && body && 'detail' in body && typeof body.detail === 'string' && body.detail) ||
      (typeof body === 'string' && body) ||
      `Error HTTP ${response.status}`;

    throw new ApiError(message, response.status, body);
  }

  if (typeof body === 'object' && body && 'success' in body && body.success === false) {
    const message =
      ('error' in body && typeof body.error === 'string' && body.error) || 'La API devolvio un error';
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isTransientGenerationPollError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  if (error instanceof Error) {
    return /tiempo de espera|conexion con el servidor|Failed to fetch|NetworkError|Load failed/i.test(error.message);
  }

  return false;
}

export const api = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  googleLogin: (data: GoogleTokenRequest) =>
    request<GoogleAuthResponse>('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  registerGoogle: (data: GoogleRegisterRequest) =>
    request<GoogleAuthResponse>('/api/auth/register-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getCurrentUser: () =>
    request<AuthUser>('/api/auth/me', {
      method: 'POST',
    }),

  generateSyllabus: (data: GenerateSyllabusInput) =>
    request<SyllabusResponse>(
      '/api/syllabus/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      60000,
    ),

  createSyllabusDraft: (payloadJson: Record<string, unknown>, status = 'draft') =>
    request<SyllabusResponse>(
      '/api/syllabus/draft',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload_json: payloadJson,
          status,
        }),
      },
      60000,
    ),

  updateSyllabus: (
    id: string,
    payloadJson: Record<string, unknown>,
    options?: {
      status?: string;
      changed_by?: string;
      change_note?: string;
    },
  ) =>
    request<SyllabusResponse>(
      `/api/syllabus/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload_json: payloadJson,
          status: options?.status || 'draft',
          changed_by: options?.changed_by || 'sistema',
          change_note: options?.change_note || 'Borrador actualizado',
        }),
      },
      60000,
    ),

  listSyllabi: (programId?: string) => {
    const url = programId
      ? `/api/syllabus/?program_id=${encodeURIComponent(programId)}`
      : '/api/syllabus/';
    return request<SyllabusListResponse>(url);
  },

  listSyllabiAll: () => request<SyllabusListResponse>('/api/syllabus/'),

  getSyllabus: (id: string) => request<SyllabusResponse>(`/api/syllabus/${id}`),

  submitForReview: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/submit-review`,
      { method: 'POST' },
    ),

  approveSyllabus: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/approve`,
      { method: 'POST' },
    ),

  publishSyllabus: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/publish`,
      { method: 'POST' },
    ),

  returnToTeacher: (syllabusId: string, observation = '', observerName = 'Dirección de Escuela') =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/return-to-teacher`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation, observer_name: observerName }),
      },
    ),

  getSyllabusVersions: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/versions`,
    ),

  addObservation: (
    syllabusId: string,
    observerName: string,
    observation: string,
  ) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/observations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observer_name: observerName,
          observation,
        }),
      },
    ),

  getObservations: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabus/${syllabusId}/observations`,
    ),

  validateSyllabus: (id: string) =>
    request<ValidationResponse>('/api/syllabus/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syllabus_id: id }),
    }),

  uploadDocument: (file: File, docType: string, name: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('name', name);

    return request<DocumentResponse>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    }).then((response) => ({
      ...response,
      data: response.data
        ? normalizeDocument(response.data as DocumentResponse['data'] & { creado_en?: string | null })
        : response.data,
    }));
  },

  listDocuments: async () => {
    const response = await request<DocumentListResponse>('/api/documents/');

    return {
      ...response,
      data: {
        items: (response.data?.items || []).map((item) =>
          normalizeDocument(item as DocumentListResponse['data']['items'][number] & { creado_en?: string | null }),
        ),
      },
    };
  },

  searchSources: (tema: string, nivel: string) =>
    request<SourcesResponse>('/api/search/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, nivel }),
    }),

  searchBibliography: (data: BibliographySearchRequest) =>
    request<BibliographySearchApiResponse>('/api/search/bibliography', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getInstitutionalFaculties: () =>
    request<InstitutionalFacultiesResponse>('/api/institutional/faculties', {
      method: 'GET',
    }),

  getMethods: () => request<TeachingMethodsResponse>('/api/catalog/methods'),

  getSkills: (categoria?: string) => {
    const path = categoria
      ? `/api/catalog/skills?categoria=${encodeURIComponent(categoria)}`
      : '/api/catalog/skills';

    return request<InstitutionalSkillsResponse>(path);
  },

  getInstruments: () => request<EvaluationInstrumentsResponse>('/api/catalog/instruments'),

  getAnalytics: () => request<AnalyticsDashboard>('/api/analytics/dashboard'),

  downloadSyllabusExport: (id: string, format: 'docx' | 'pdf') =>
    fetchWithAuth(`/api/syllabus/${id}/export?format=${format}`, {
      method: 'GET',
    }),

  checkHealth: () => request<HealthResponse>('/health'),

  // ── Programas y cursos (wizard v2) ───────────────────────────────────────
  getPrograms: (careerId: string) =>
    request<{ success: boolean; data: ProgramItem[]; error: string | null }>(
      `/api/programs?career_id=${encodeURIComponent(careerId)}`,
    ),

  getCourses: (programId: string) =>
    request<{ success: boolean; data: CourseListItem[]; error: string | null }>(
      `/api/courses?program_id=${encodeURIComponent(programId)}`,
    ),

  getCourse: (courseId: string) =>
    request<{ success: boolean; data: CourseDetail; error: string | null }>(
      `/api/courses/${encodeURIComponent(courseId)}`,
    ),

  getCoursePerformances: (courseId: string) =>
    request<APIResponse<{ items: PerformanceDB[] }>>(
      `/api/courses/${encodeURIComponent(courseId)}/performances`,
    ),

  getPedagogicMethods: () =>
    request<{ success: boolean; data: MethodItem[]; error: string | null }>('/api/methods'),

  suggestMethod: (courseId: string, categories: string[] = []) =>
    request<{ success: boolean; data: MethodSuggest; error: string | null }>(
      `/api/methods/suggest?course_id=${encodeURIComponent(courseId)}${
        categories.length
          ? `&categories=${encodeURIComponent(categories.join(','))}`
          : ''
      }`,
    ),

  generateSyllabusV2: (data: SyllabusGenerateV2Input) =>
    request<SyllabusResponse>(
      '/api/syllabus/generate-v2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      90000,
    ),

  getInstitutionalCareers: (facultyId: string) =>
    request<{ success: boolean; data: { id: string; name: string; code?: string }[]; error: string | null }>(
      `/api/institutional/careers?faculty_id=${encodeURIComponent(facultyId)}`,
    ),

  uploadBibliography: (
    file: File,
    courseId: string,
    programId: string,
    scope: string,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('program_id', programId);
    formData.append('scope', scope);
    formData.append('doc_type', 'bibliografia');
    formData.append('name', file.name);
    return request<DocumentResponse>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  getBibliographyReferences: (courseId: string) =>
    request<
      APIResponse<{
        doc_id?: string | null;
        document_name?: string | null;
        document_created_at?: string | null;
        references: string[];
        bibliography_rows?: import('./types').BibliographyReferenceRow[];
        bibliografia?: import('./types').FuenteBibliografica[];
        total: number;
      }>
    >(`/api/documents/bibliography/${encodeURIComponent(courseId)}/references`),

  deleteDocument: (docId: string) =>
    request<APIResponse>(`/api/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    }),

  deleteCourseBibliography: (courseId: string) =>
    request<APIResponse>(`/api/documents/bibliography/${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
    }),

  listAdminUsers: (status?: string) =>
    request<AdminUserListResponse>(
      status ? `/api/admin/users?status=${encodeURIComponent(status)}` : '/api/admin/users',
    ),

  approveUser: (userId: string) =>
    request<APIResponse>(`/api/admin/users/${encodeURIComponent(userId)}/approve`, {
      method: 'POST',
    }),

  rejectUser: (userId: string) =>
    request<APIResponse>(`/api/admin/users/${encodeURIComponent(userId)}/reject`, {
      method: 'POST',
    }),

  listAdminCourses: (programId?: string, search = '') => {
    const params = new URLSearchParams();
    if (programId) params.set('program_id', programId);
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString();
    return request<AdminCourseListResponse>(`/api/admin/courses${query ? `?${query}` : ''}`);
  },

  updateCourseSumilla: (courseId: string, sumilla: string) =>
    request<APIResponse>(`/api/admin/courses/${encodeURIComponent(courseId)}/sumilla`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sumilla }),
    }),

  getCourseSumillaHistory: (courseId: string) =>
    request<CourseSumillaHistoryResponse>(
      `/api/admin/courses/${encodeURIComponent(courseId)}/sumilla-history`,
    ),

  // ── Admin — Teaching Methods ──────────────────────────────────────────────

  listAdminMethods: (includeArchived = false) =>
    request<APIResponse<{ items: TeachingMethodDB[] }>>(
      `/api/admin/teaching-methods${includeArchived ? '?include_archived=true' : ''}`,
    ),

  createMethod: (data: Partial<TeachingMethodDB>) =>
    request<APIResponse<TeachingMethodDB>>('/api/admin/teaching-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateMethod: (methodId: string, data: Partial<TeachingMethodDB>) =>
    request<APIResponse<TeachingMethodDB>>(`/api/admin/teaching-methods/${encodeURIComponent(methodId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  archiveMethod: (methodId: string) =>
    request<APIResponse>(`/api/admin/teaching-methods/${encodeURIComponent(methodId)}/archive`, {
      method: 'POST',
    }),

  restoreMethod: (methodId: string) =>
    request<APIResponse>(`/api/admin/teaching-methods/${encodeURIComponent(methodId)}/restore`, {
      method: 'POST',
    }),

  // ── Admin — Method-Skill Links ────────────────────────────────────────────

  listMethodSkills: (methodId: string) =>
    request<APIResponse<{ items: MethodSkillLink[] }>>(
      `/api/admin/teaching-methods/${encodeURIComponent(methodId)}/skills`,
    ),

  addMethodSkill: (methodId: string, data: { skill_id: string; priority?: number; is_recommended?: boolean }) =>
    request<APIResponse<MethodSkillLink>>(`/api/admin/teaching-methods/${encodeURIComponent(methodId)}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateMethodSkill: (methodId: string, linkId: string, data: { priority: number; is_recommended: boolean }) =>
    request<APIResponse<MethodSkillLink>>(
      `/api/admin/teaching-methods/${encodeURIComponent(methodId)}/skills/${encodeURIComponent(linkId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    ),

  removeMethodSkill: (methodId: string, linkId: string) =>
    request<APIResponse>(
      `/api/admin/teaching-methods/${encodeURIComponent(methodId)}/skills/${encodeURIComponent(linkId)}`,
      { method: 'DELETE' },
    ),

  // ── Admin — Skills Catalog ────────────────────────────────────────────────

  listAdminSkills: (params?: { search?: string; categoria?: string; page?: number; page_size?: number; include_archived?: boolean }) => {
    const p = new URLSearchParams();
    if (params?.search) p.set('search', params.search);
    if (params?.categoria) p.set('categoria', params.categoria);
    if (params?.page) p.set('page', String(params.page));
    if (params?.page_size) p.set('page_size', String(params.page_size));
    if (params?.include_archived) p.set('include_archived', 'true');
    const q = p.toString();
    return request<APIResponse<{ items: SkillDB[]; total: number }>>(
      `/api/admin/skills${q ? `?${q}` : ''}`,
    );
  },

  createSkill: (data: Partial<SkillDB>) =>
    request<APIResponse<SkillDB>>('/api/admin/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateSkill: (skillId: string, data: Partial<SkillDB>) =>
    request<APIResponse<SkillDB>>(`/api/admin/skills/${encodeURIComponent(skillId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  archiveSkill: (skillId: string) =>
    request<APIResponse>(`/api/admin/skills/${encodeURIComponent(skillId)}/archive`, {
      method: 'POST',
    }),

  restoreSkill: (skillId: string) =>
    request<APIResponse>(`/api/admin/skills/${encodeURIComponent(skillId)}/restore`, {
      method: 'POST',
    }),

  // ── Admin — Course Curriculum ─────────────────────────────────────────────

  getCourseCurriculum: (courseId: string) =>
    request<{ success: boolean; data: CourseDetail; error: string | null }>(
      `/api/courses/${encodeURIComponent(courseId)}`,
    ),

  updateCourseCurriculum: (courseId: string, data: {
    sumilla?: string;
    competencia_egreso?: string;
    resultado_aprendizaje?: string;
    capacidad?: string;
  }) =>
    request<APIResponse>(`/api/admin/courses/${encodeURIComponent(courseId)}/curriculum`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getCourseCurriculumHistory: (courseId: string) =>
    request<APIResponse<{ items: CurriculumHistoryItem[] }>>(
      `/api/admin/courses/${encodeURIComponent(courseId)}/curriculum-history`,
    ),

  // ── Admin — Performances ──────────────────────────────────────────────────

  listPerformances: (courseId: string, includeArchived = false) =>
    request<APIResponse<{ items: PerformanceDB[] }>>(
      `/api/admin/courses/${encodeURIComponent(courseId)}/performances${includeArchived ? '?include_archived=true' : ''}`,
    ),

  createPerformance: (courseId: string, statement: string) =>
    request<APIResponse<PerformanceDB>>(`/api/admin/courses/${encodeURIComponent(courseId)}/performances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement }),
    }),

  updatePerformance: (courseId: string, perfId: string, statement: string) =>
    request<APIResponse<PerformanceDB>>(
      `/api/admin/courses/${encodeURIComponent(courseId)}/performances/${encodeURIComponent(perfId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      },
    ),

  archivePerformance: (courseId: string, perfId: string) =>
    request<APIResponse>(
      `/api/admin/courses/${encodeURIComponent(courseId)}/performances/${encodeURIComponent(perfId)}/archive`,
      { method: 'POST' },
    ),

  // ── Admin — User Roles & Scopes ───────────────────────────────────────────

  updateUserRole: (userId: string, role: string) =>
    request<APIResponse>(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }),

  getUserScopes: (userId: string) =>
    request<APIResponse<{ items: UserScopeAssignment[] }>>(
      `/api/admin/users/${encodeURIComponent(userId)}/scopes`,
    ),

  addUserScope: (userId: string, data: { scope_type: 'career' | 'program'; scope_id: string }) =>
    request<APIResponse<UserScopeAssignment>>(`/api/admin/users/${encodeURIComponent(userId)}/scopes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  removeUserScope: (userId: string, scopeId: string) =>
    request<APIResponse>(
      `/api/admin/users/${encodeURIComponent(userId)}/scopes/${encodeURIComponent(scopeId)}`,
      { method: 'DELETE' },
    ),

  // ── Admin — User Permissions ──────────────────────────────────────────────

  getUserPermissions: (userId: string) =>
    request<APIResponse<EffectivePermissions>>(
      `/api/admin/users/${encodeURIComponent(userId)}/permissions`,
    ),

  addPermissionOverride: (userId: string, data: { permission_key: string; effect: 'allow' | 'deny' }) =>
    request<APIResponse<PermissionOverride>>(
      `/api/admin/users/${encodeURIComponent(userId)}/permissions/overrides`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    ),

  removePermissionOverride: (userId: string, overrideId: string) =>
    request<APIResponse>(
      `/api/admin/users/${encodeURIComponent(userId)}/permissions/overrides/${encodeURIComponent(overrideId)}`,
      { method: 'DELETE' },
    ),

  // ── Wizard — Method Skills ────────────────────────────────────────────────

  getMethodSkills: (methodId: string, params?: { q?: string; page?: number; page_size?: number }) => {
    const p = new URLSearchParams();
    if (params?.q) p.set('q', params.q);
    if (params?.page) p.set('page', String(params.page));
    if (params?.page_size) p.set('page_size', String(params.page_size));
    const q = p.toString();
    return request<APIResponse<CompatibleSkillsResponse>>(
      `/api/methods/${encodeURIComponent(methodId)}/skills${q ? `?${q}` : ''}`,
    );
  },

  // ── Wizard Progresivo v3 ──────────────────────────────────────────────────

  suggestSkills: (params?: {
    course_id?: string | null;
    desempeno?: string;
    q?: string;
    nivel_bloom?: string;
    limit?: number;
  }) => {
    const p = new URLSearchParams();
    if (params?.course_id) p.set('course_id', params.course_id);
    if (params?.desempeno) p.set('desempeno', params.desempeno);
    if (params?.q) p.set('q', params.q);
    if (params?.nivel_bloom) p.set('nivel_bloom', params.nivel_bloom);
    if (params?.limit) p.set('limit', String(params.limit));
    const q = p.toString();
    return request<APIResponse<import('./types').SkillSuggestResponse>>(
      `/api/skills/suggest${q ? `?${q}` : ''}`,
    );
  },

  createOrGetProgressiveDraft: (
    courseId: string,
    semester: string,
    programId?: string | null,
    options?: { fechaInicio?: string; fechaFin?: string },
  ) =>
    request<APIResponse<import('./types').ProgressiveDraft>>('/api/syllabi/progressive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId,
        semester,
        program_id: programId ?? null,
        fecha_inicio: options?.fechaInicio ?? null,
        fecha_fin: options?.fechaFin ?? null,
      }),
    }),

  getProgressiveDraft: (syllabusId: string) =>
    request<APIResponse<import('./types').ProgressiveDraft>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive`,
    ),

  getWizardCourseData: (syllabusId: string) =>
    request<APIResponse<{
      course: import('./types').CourseDetail;
      performances: import('./types').SuggestedPerformance[];
    }>>(`/api/syllabi/${encodeURIComponent(syllabusId)}/course-data`),

  getPerformancesSummary: (syllabusId: string) =>
    request<APIResponse<{
      performances: Array<{ label: string; code: string; statement: string }>;
    }>>(`/api/syllabi/${encodeURIComponent(syllabusId)}/performances-summary`),

  prefillSyllabusUnits: (syllabusId: string) =>
    request<APIResponse<{
      performances: import('./types').SuggestedPerformance[];
      unidades_tematicas: unknown[];
      cronograma_semanal: unknown[];
      normalized?: unknown;
    }>>(`/api/syllabi/${encodeURIComponent(syllabusId)}/units/prefill`, {
      method: 'POST',
    }),

  saveProgressiveStep: (syllabusId: string, stepKey: string, blockData: Record<string, unknown>) =>
    request<APIResponse>(`/api/syllabi/${encodeURIComponent(syllabusId)}/steps/${stepKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_data: blockData }),
    }),

  suggestPerformances: (syllabusId: string, options?: { forceProvider?: 'gemini' | 'openrouter' }) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<{ performances: import('./types').SuggestedPerformance[]; origin: string }>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/steps/purpose/suggest-performances${q}`,
      { method: 'POST' },
      60000,
    );
  },

  suggestContent: (syllabusId: string, options?: { forceProvider?: 'gemini' | 'openrouter' }) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').ContentSuggestion>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/steps/content/suggest${q}`,
      { method: 'POST' },
      60000,
    );
  },

  suggestMethodProgressive: (syllabusId: string, options?: { forceProvider?: 'gemini' | 'openrouter' }) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').MethodSuggest>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/steps/method/suggest${q}`,
      { method: 'POST' },
      60000,
    );
  },

  suggestGrading: (syllabusId: string, options?: { forceProvider?: 'gemini' | 'openrouter' }) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').GradingSuggestion>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/steps/grading/suggest${q}`,
      { method: 'POST' },
      60000,
    );
  },

  assembleFinal: (syllabusId: string, options?: { forceProvider?: 'gemini' | 'openrouter' }) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<{ syllabus_id: string; assembled: boolean; requires_academic_validation: boolean; final_syllabus: Record<string, unknown> }>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/assemble-final${q}`,
      { method: 'POST' },
      180000,
    );
  },

  submitAcademicValidation: (syllabusId: string) =>
    request<APIResponse>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/submit-academic-validation`,
      { method: 'POST' },
    ),

  getMethodEvidences: (methodId: string) =>
    request<APIResponse<{ items: import('./types').EvidenceCatalogItem[] }>>(
      `/api/methods/${encodeURIComponent(methodId)}/evidences`,
    ),

  getMethodInstruments: (methodId: string) =>
    request<APIResponse<{ items: import('./types').InstrumentCatalogItem[] }>>(
      `/api/methods/${encodeURIComponent(methodId)}/instruments`,
    ),

  getProgressiveCurriculumState: (syllabusId: string) =>
    request<APIResponse<import('./types').ProgressiveCurriculumState>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/state`,
    ),

  getAiGenerationJob: <T = unknown>(jobId: string) =>
    request<APIResponse<import('./types').AiGenerationJob<T>>>(
      `/api/jobs/${encodeURIComponent(jobId)}`,
      { method: 'GET' },
      30000,
    ),

  pollAiGenerationJob: async <T = unknown>(
    jobId: string,
    options?: {
      intervalMs?: number;
      timeoutMs?: number;
      onUpdate?: (job: import('./types').AiGenerationJob<T>) => void;
    },
  ) => {
    const intervalMs = options?.intervalMs ?? 4000;
    const timeoutMs = options?.timeoutMs ?? 300000;
    const startedAt = Date.now();

    let lastTransientError: Error | null = null;

    while (Date.now() - startedAt <= timeoutMs) {
      let response: APIResponse<import('./types').AiGenerationJob<T>>;
      try {
        response = await api.getAiGenerationJob<T>(jobId);
      } catch (error) {
        if (!isTransientGenerationPollError(error)) {
          throw error;
        }

        lastTransientError = error instanceof Error ? error : new Error('Error temporal consultando el avance');
        options?.onUpdate?.({
          id: jobId,
          job_id: jobId,
          job_type: '',
          status: 'running',
          message: 'Seguimos esperando la generacion. La consulta de avance tardo mas de lo normal.',
        } as import('./types').AiGenerationJob<T>);
        await sleep(intervalMs);
        continue;
      }

      lastTransientError = null;
      const job = response.data;
      options?.onUpdate?.(job);

      if (job.status === 'done') {
        return response;
      }

      if (job.status === 'error') {
        throw new ApiError(
          job.error_message || 'La IA esta un poco ocupada, muchos usuarios. Espere un momento por favor.',
          503,
          response,
        );
      }

      await sleep(intervalMs);
    }

    throw new ApiError(
      lastTransientError
        ? 'La generacion sigue en proceso. Mantuvimos la espera, pero la consulta de avance no respondio a tiempo.'
        : 'La generacion sigue en cola. Intenta revisar nuevamente en unos segundos.',
      408,
    );
  },

  suggestProgressiveProducts: (
    syllabusId: string,
    category: string,
    options?: { forceProvider?: 'gemini' | 'openrouter'; notebookContextText?: string },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/products/suggest${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, notebook_context_text: options?.notebookContextText || '' }),
      },
      300000,
    );
  },

  selectProgressiveProduct: (syllabusId: string, optionId: string) =>
    request<APIResponse<import('./types').ProgressiveProductOption>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/products/select`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId }),
      },
    ),

  extractProgressiveUnitContext: (
    syllabusId: string,
    unitNumber: number,
    rawContextText: string,
    options?: { forceProvider?: 'gemini' | 'openrouter' },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/unit-contexts/${unitNumber}/extract${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_context_text: rawContextText }),
      },
      60000,
    );
  },

  saveProgressiveUnitContext: (
    syllabusId: string,
    unitNumber: number,
    rawContextText: string,
  ) =>
    request<APIResponse<import('./types').ProgressiveUnitContext>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/unit-contexts/${unitNumber}/save`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_context_text: rawContextText }),
      },
      30000,
    ),

  generateProgressiveUnit: (
    syllabusId: string,
    unitNumber: number,
    data: { raw_context_text?: string; teacher_instruction?: string; locked_weeks?: number[] },
    options?: { forceProvider?: 'gemini' | 'openrouter' },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/units/${unitNumber}/generate${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      120000,
    );
  },

  regenerateProgressiveUnit: (
    syllabusId: string,
    unitNumber: number,
    data: { raw_context_text?: string; teacher_instruction?: string; locked_weeks?: number[] },
    options?: { forceProvider?: 'gemini' | 'openrouter' },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/units/${unitNumber}/regenerate${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      120000,
    );
  },

  lockProgressiveWeek: (syllabusId: string, unitNumber: number, week: number, locked: boolean) =>
    request<APIResponse<import('./types').ProgressiveUnitGeneration>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/units/${unitNumber}/weeks/${week}/lock`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked }),
      },
    ),

  updateProgressiveWeek: (
    syllabusId: string,
    unitNumber: number,
    week: number,
    data: Partial<import('./types').ProgressiveUnitWeek>,
  ) =>
    request<APIResponse<import('./types').ProgressiveUnitGeneration>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/units/${unitNumber}/weeks/${week}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    ),

  approveProgressiveUnit: (syllabusId: string, unitNumber: number, generationId?: string | null) =>
    request<APIResponse<{ approved: import('./types').ProgressiveUnitGeneration; traceability_context: Record<string, unknown> }>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/units/${unitNumber}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId ?? null }),
      },
    ),

  getKnowledgeMap: (syllabusId: string) =>
    request<APIResponse<import('./types').KnowledgeMap | null>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/knowledge-map`,
    ),

  suggestKnowledgeMap: (
    syllabusId: string,
    data: { notebook_context_text?: string; teacher_instruction?: string },
    options?: { forceProvider?: 'gemini' | 'openrouter' },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/knowledge-map/suggest${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      60000,
    );
  },

  repromptKnowledgeMap: (
    syllabusId: string,
    data: { weeks_to_change: number[]; teacher_instruction?: string; notebook_context_text?: string },
    options?: { forceProvider?: 'gemini' | 'openrouter' },
  ) => {
    const q = options?.forceProvider ? `?force_provider=${encodeURIComponent(options.forceProvider)}` : '';
    return request<APIResponse<import('./types').AiGenerationJobQueued>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/knowledge-map/reprompt${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      60000,
    );
  },

  updateKnowledgeMapWeek: (
    syllabusId: string,
    week: number,
    data: Partial<Pick<import('./types').KnowledgeMapWeek, 'knowledge' | 'subtopics' | 'emphasis' | 'source_notes' | 'locked'>>,
  ) =>
    request<APIResponse<{ map: import('./types').KnowledgeMap; audit: import('./types').KnowledgeMapAudit }>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/knowledge-map/weeks/${week}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    ),

  confirmKnowledgeMap: (syllabusId: string, teacherNotes?: string) =>
    request<APIResponse<import('./types').KnowledgeMap>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/knowledge-map/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_notes: teacherNotes || '' }),
      },
    ),

  assembleProgressiveCurriculum: (syllabusId: string) =>
    request<APIResponse<{ syllabus_id: string; saved: boolean; final_syllabus: Record<string, unknown> }>>(
      `/api/syllabi/${encodeURIComponent(syllabusId)}/progressive/assemble`,
      { method: 'POST' },
      600000,
    ),
};

