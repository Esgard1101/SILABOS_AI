import {
  AnalyticsDashboard,
  APIResponse,
  AuthUser,
  BibliographySearchApiResponse,
  BibliographySearchRequest,
  CourseDetail,
  CourseListItem,
  DocumentListResponse,
  DocumentResponse,
  EvaluationInstrumentsResponse,
  GenerateSyllabusInput,
  HealthResponse,
  InstitutionalFacultiesResponse,
  InstitutionalSkillsResponse,
  LoginRequest,
  LoginResponse,
  MethodItem,
  MethodSuggest,
  ProgramItem,
  SourcesResponse,
  SyllabusGenerateV2Input,
  SyllabusListResponse,
  SyllabusResponse,
  TeachingMethodsResponse,
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

export const api = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', {
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

  deleteDocument: async (id: string) => {
    await request<{ success: boolean; data: { eliminado: string }; error: string | null }>(
      `/api/documents/${id}`,
      { method: 'DELETE' },
    );
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

  getPedagogicMethods: () =>
    request<{ success: boolean; data: MethodItem[]; error: string | null }>('/api/methods'),

  suggestMethod: (courseId: string) =>
    request<{ success: boolean; data: MethodSuggest; error: string | null }>(
      `/api/methods/suggest?course_id=${encodeURIComponent(courseId)}`,
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
};
