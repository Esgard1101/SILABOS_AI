import { SyllabusData, SyllabusListItem, SyllabusObservation, SyllabusStatus, SyllabusVersion } from '../api/types';

const CURRENT_SYLLABUS_KEY = 'currentSyllabus';
const STATUS_OVERRIDES_KEY = 'syllabusStatusOverrides';

type StatusOverrideMap = Record<string, SyllabusStatus>;
type SyllabusLike = Partial<SyllabusListItem> | SyllabusData | null | undefined;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCurrentSyllabus(): SyllabusData | null {
  return readJson<SyllabusData | null>(CURRENT_SYLLABUS_KEY, null);
}

export function setCurrentSyllabus(syllabus: SyllabusData): void {
  sessionStorage.setItem(CURRENT_SYLLABUS_KEY, JSON.stringify(syllabus));
}

export function getStatusOverrides(): StatusOverrideMap {
  return readJson<StatusOverrideMap>(STATUS_OVERRIDES_KEY, {});
}

export function setSyllabusStatusOverride(syllabusId: string, status: SyllabusStatus): void {
  const current = getStatusOverrides();
  current[syllabusId] = status;
  sessionStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(current));
}

export function resolveSyllabusStatus(
  syllabus: SyllabusLike,
  fallback: SyllabusStatus = 'draft',
): SyllabusStatus {
  if (!syllabus) {
    return fallback;
  }

  const syllabusId =
    ('id' in syllabus ? syllabus.id : undefined) ||
    ('_id' in syllabus ? syllabus._id : undefined);
  const overrides = getStatusOverrides();

  if (syllabusId && overrides[syllabusId]) {
    return overrides[syllabusId];
  }

  const rawStatus = syllabus.status;
  if (
    rawStatus === 'draft' ||
    rawStatus === 'review' ||
    rawStatus === 'approved' ||
    rawStatus === 'published' ||
    rawStatus === 'generated' ||
    rawStatus === 'exported'
  ) {
    return rawStatus;
  }

  return fallback;
}

export function getSyllabusPayload(
  syllabus: SyllabusLike,
): SyllabusData | null {
  if (!syllabus) {
    return null;
  }

  if (syllabus.payload_json && typeof syllabus.payload_json === 'object') {
    return syllabus.payload_json;
  }

  return syllabus as SyllabusData;
}

export function getCourseName(syllabus: SyllabusLike): string {
  const payload = getSyllabusPayload(syllabus);
  return payload?.datos_generales?.nombre_curso || 'Curso sin nombre';
}

export function getCareerName(syllabus: SyllabusLike): string {
  const payload = getSyllabusPayload(syllabus);
  return (
    payload?.datos_generales?.carrera ||
    payload?.datos_generales?.programa_estudios ||
    payload?.datos_generales?.escuela_profesional ||
    'Carrera no disponible'
  );
}

export function getSemesterName(syllabus: SyllabusLike): string {
  const payload = getSyllabusPayload(syllabus);
  return syllabus?.semester || payload?.datos_generales?.semestre || 'Sin semestre';
}

export function getTeacherName(syllabus: SyllabusLike): string {
  const payload = getSyllabusPayload(syllabus);
  return syllabus?.teacher_name || payload?.datos_generales?.docente || 'Docente no disponible';
}

export function formatDateLabel(value?: string | null): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function enrichVersion(syllabusId: string, version: Partial<SyllabusVersion>): SyllabusVersion {
  return {
    id: version.id || '',
    syllabus_id: version.syllabus_id || syllabusId,
    version_number: version.version_number || 1,
    changed_by: version.changed_by || 'sistema',
    change_note: version.change_note || '',
    created_at: version.created_at || '',
  };
}

export function enrichObservation(
  syllabusId: string,
  observation: Partial<SyllabusObservation>,
): SyllabusObservation {
  return {
    id: observation.id || '',
    syllabus_id: observation.syllabus_id || syllabusId,
    observer_name: observation.observer_name || 'Observador',
    observation: observation.observation || '',
    status: observation.status || 'pending',
    created_at: observation.created_at || '',
  };
}
