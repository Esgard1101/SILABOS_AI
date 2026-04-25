import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Info,
  FileText,
  GitBranch,
  BarChart,
  BookOpen,
  History,
  Share,
  AlertTriangle,
  CheckCircle,
  User,
  Download,
  GraduationCap,
  ClipboardList,
  ScrollText,
  Sigma,
  FlaskConical,
  Users,
  Library,
  Rocket,
  Save,
  Send,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { CourseDetail, CriterioEvaluacion, EvaluacionMatrizRow, SyllabusData, SyllabusStatus, ValidationObservation, ValidationResult } from '../api/types';
import BibliographyGuide from '../components/BibliographyGuide';
import StatusBadge from '../components/StatusBadge';
import Toast, { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { useAuth } from '../hooks/useAuth';

const REVIEW_MODULE_MESSAGE =
  'Módulo de revisión académica en desarrollo. Estará disponible próximamente.';

interface ContentRow {
  desempeno: string;
  habilidades: string;
  semana: string;
  conocimientos: string;
  actividades: string;
  evidencias: string;
}

interface EvaluationRow {
  desempeno: string;
  habilidades: string;
  evidencias: string;
  instrumentos: string;
}

interface UnitSection {
  id: string;
  title: string;
  habilidades: string;
  rows: ContentRow[];
}

function EditableField({
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const isEmpty = !value || value === '—';
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (multiline && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value, multiline]);

  const sharedClass = `w-full bg-transparent focus:outline-none focus:border-amber-500 text-sm leading-relaxed ${
    isEmpty ? 'text-slate-400 border-dashed border-slate-300' : 'text-slate-900 border-transparent'
  }`;

  if (multiline) {
    return (
      <textarea
        ref={ref}
        rows={1}
        value={isEmpty ? '' : value}
        onChange={(e) => onChange(e.target.value || '—')}
        placeholder={placeholder || 'Completar...'}
        className={`${sharedClass} resize-none overflow-hidden border-b py-0.5`}
      />
    );
  }

  return (
    <input
      type="text"
      value={isEmpty ? '' : value}
      onChange={(e) => onChange(e.target.value || '—')}
      placeholder={placeholder || 'Completar...'}
      className={`${sharedClass} border-b py-0.5`}
    />
  );
}

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getObservationStyles(level: string) {
  if (level === 'error') {
    return 'bg-red-50 border-red-100 text-red-700';
  }
  if (level === 'advertencia') {
    return 'bg-amber-50 border-amber-100 text-amber-700';
  }
  return 'bg-blue-50 border-blue-100 text-blue-700';
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '—';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function pickDisplayValue(...values: unknown[]): string {
  for (const value of values) {
    const formatted = displayValue(value);
    if (formatted !== '—') {
      return formatted;
    }
  }

  return '—';
}

function sanitizeTeacherName(value: unknown): string {
  const formatted = displayValue(value);
  if (formatted === '—' || /por designar/i.test(formatted)) {
    return '—';
  }

  return formatted;
}

function normalizeSyllabusRecord(record: SyllabusData | null): SyllabusData | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const rawPayload =
    record.payload_json && typeof record.payload_json === 'object'
      ? (record.payload_json as SyllabusData)
      : record;
  const finalPayloadCandidate = (rawPayload as SyllabusData & { final_syllabus?: unknown }).final_syllabus;
  const payload =
    finalPayloadCandidate && typeof finalPayloadCandidate === 'object'
      ? {
          ...rawPayload,
          ...(finalPayloadCandidate as SyllabusData),
          datos_generales:
            (finalPayloadCandidate as SyllabusData).datos_generales || rawPayload.datos_generales,
        }
      : rawPayload;

  return {
    ...payload,
    _id: record._id || record.id || payload._id || payload.id,
    id: record.id || record._id || payload.id || payload._id,
    status: record.status || payload.status,
    created_at: record.created_at || payload.created_at,
    updated_at: record.updated_at || payload.updated_at,
    semester: record.semester || payload.semester || payload.datos_generales?.semestre,
    teacher_name: record.teacher_name || payload.teacher_name,
  };
}

function normalizeDesempenos(syllabus: SyllabusData): string[] {
  if (Array.isArray(syllabus.desempenos) && syllabus.desempenos.length > 0) {
    return syllabus.desempenos.map((item, index) => {
      if (typeof item === 'string') {
        return item.trim() || `D${index + 1}`;
      }

      return displayValue(item.descripcion || item.logro || item.statement || item.codigo || `D${index + 1}`);
    });
  }

  if (Array.isArray(syllabus.unidades_tematicas) && syllabus.unidades_tematicas.length > 0) {
    return syllabus.unidades_tematicas.map((unidad, index) => `D${index + 1}. ${displayValue(unidad.logro)}`);
  }

  return ['D1. —'];
}

function parseWeekNumbers(rawWeeks?: string): number[] {
  const weeks = (rawWeeks || '').trim();
  if (!weeks) {
    return [];
  }

  const numbers = weeks.match(/\d+/g)?.map(Number) || [];
  if (numbers.length >= 2 && /-|a|al/i.test(weeks)) {
    const start = numbers[0];
    const end = numbers[1];
    if (start <= end) {
      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }
  }

  return numbers;
}

function buildUnitSections(syllabus: SyllabusData, desempenos: string[]): UnitSection[] {
  const units = syllabus.unidades_tematicas || [];
  const schedule = syllabus.cronograma_semanal || [];

  if (units.length === 0) {
    return [
      {
        id: 'unidad-unica',
        title: 'UNIDAD I: —',
        habilidades: '—',
        rows: [
          {
            desempeno: desempenos[0] || '—',
            habilidades: '—',
            semana: '—',
            conocimientos: '—',
            actividades: '—',
            evidencias: '—',
          },
        ],
      },
    ];
  }

  return units.map((unidad, index) => {
    const parsedWeeks = parseWeekNumbers(unidad.semanas);
    const matchingRows = schedule.filter((item) => parsedWeeks.includes(item.semana));
    const habilidades = displayValue(unidad.habilidades_requeridas || unidad.logro || '—');

    const rows: ContentRow[] = matchingRows.length
      ? matchingRows.map((item) => ({
          desempeno: desempenos[index] || `D${index + 1}. —`,
          habilidades,
          semana: `Semana ${displayValue(item.semana)}`,
          conocimientos: displayValue(item.tema),
          actividades: displayValue(item.actividad),
          evidencias: displayValue(item.producto),
        }))
      : [
          {
            desempeno: desempenos[index] || `D${index + 1}. —`,
            habilidades,
            semana: displayValue(unidad.semanas),
            conocimientos: unidad.temas?.length ? unidad.temas.join(', ') : '—',
            actividades: '—',
            evidencias: '—',
          },
        ];

    return {
      id: `unidad-${index + 1}`,
      title: `UNIDAD ${unidad.numero || index + 1}: ${displayValue(unidad.titulo)}`,
      habilidades,
      rows,
    };
  });
}

function buildEvaluationRows(unitSections: UnitSection[], matriz?: EvaluacionMatrizRow[]): EvaluationRow[] {
  if (matriz && matriz.length > 0) {
    return matriz.map((item) => ({
      desempeno: item.desempeno || '—',
      habilidades: Array.isArray(item.habilidades) ? (item.habilidades.join('\n') || '—') : (item.habilidades || '—'),
      evidencias: item.evidencias || '—',
      instrumentos: item.instrumentos || '—',
    }));
  }

  return unitSections.map((section) => ({
    desempeno: section.rows[0]?.desempeno || '—',
    habilidades: section.habilidades,
    evidencias: section.rows
      .map((row) => row.evidencias)
      .filter((evidencia) => evidencia !== '—')
      .join('; ') || '—',
    instrumentos: '—',
  }));
}

function buildGradingRows(criteria?: CriterioEvaluacion[]) {
  const rows = (criteria || [])
    .filter((item) => item && (item.nombre || item.sigla || item.porcentaje != null))
    .map((item, index) => ({
      evidencia: pickDisplayValue(item.nombre, `Evaluacion ${index + 1}`),
      sigla: pickDisplayValue(item.sigla, `EV${index + 1}`),
      porcentaje: item.porcentaje ?? 0,
      cronograma: displayValue(item.cronograma || item.descripcion),
    }));

  if (rows.length > 0) {
    return rows;
  }

  return [
    {
      evidencia: 'Tareas',
      nombre: 'Tareas (Reportes de lectura, informes de clase, trabajo práctico)',
      sigla: 'TA',
      porcentaje: 40,
      cronograma: 'Permanente',
    },
    {
      evidencia: 'Producto Acreditable 1',
      nombre: 'Producto Acreditable 1 (Planificación del trabajo integrador)',
      sigla: 'PA1',
      porcentaje: 10,
      cronograma: '5ª Semana',
    },
    {
      evidencia: 'Producto Acreditable 2',
      nombre: 'Producto Acreditable 2 (Avance del Trabajo Integrador)',
      sigla: 'PA2',
      porcentaje: 20,
      cronograma: '12ª Semana',
    },
    {
      evidencia: 'Producto Acreditable 3',
      nombre: 'Producto Acreditable 3 (Versión Final del Trabajo Integrador)',
      sigla: 'PA3',
      porcentaje: 30,
      cronograma: '15ª Semana',
    },
  ];
}

function buildGradingFormula(rows: Array<{ sigla: string; porcentaje: number }>) {
  const parts = rows
    .filter((row) => row.sigla && Number.isFinite(row.porcentaje))
    .map((row) => `${row.porcentaje}% ${row.sigla}`);

  return parts.length > 0 ? `PF = ${parts.join(' + ')}` : 'PF = -';
}

const defaultMetodologia = `La investigación formativa es una estrategia pedagógica que se contextualiza en un entorno real: el aprendizaje de aula, con la indagación y estudio de necesidades científicos-tecnológicos en el ámbito del programa académico.

- Empleo de la lógica de la investigación científica en el proceso de enseñanza, considerando el aprendizaje basado en problemas y el aprendizaje basado en proyectos como estrategias docentes que permiten al estudiante aprender a pensar de manera crítica y analítica, y a buscar, encontrar y utilizar los recursos apropiados para aprender.

- Fomento de la investigación documental para desarrollar habilidades investigativas de análisis, interpretación, y síntesis de la información, y de búsqueda de problemas no resueltos, que favorecen el desarrollo del pensamiento crítico y otras habilidades como la observación, descripción y comparación, a partir de los contenidos programáticos de la asignatura.`;

const defaultTutoria = `Durante el desarrollo de la asignatura se brinda al estudiante la tutoría académica correspondiente, respecto a los contenidos tratados en el curso como a los productos exigidos como evidencias de aprendizaje. Las tutorías se consideran como parte de las actividades de aprendizaje, y se pueden realizar de manera virtual, con la herramienta Google Meet, o de manera presencial.`;

const sidebarSections = [
  { id: 'info-general', label: 'I. Información General', icon: Info },
  { id: 'sumilla', label: 'II. Sumilla', icon: FileText },
  { id: 'competencia', label: 'III. Competencia Profesional', icon: GraduationCap },
  { id: 'capacidad', label: 'IV. Capacidad del Curso', icon: ClipboardList },
  { id: 'desempenos', label: 'V. Desempeños', icon: GitBranch },
  { id: 'programa-contenidos', label: 'VI. Programa de Contenidos', icon: ScrollText },
  { id: 'sistema-evaluacion', label: 'VII. Sistema de Evaluación', icon: BarChart },
  { id: 'sistema-calificacion', label: 'VIII. Sistema de Calificación', icon: Sigma },
  { id: 'metodologia', label: 'IX. Metodología', icon: FlaskConical },
  { id: 'tutoria', label: 'X. Tutoría', icon: Users },
  { id: 'referencias', label: 'XI. Referencias', icon: Library },
];

export default function SyllabusEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { context } = useAppContext();
  const { user } = useAuth();
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validationToastShown = useRef(false);
  const { showToast, toasts, removeToast } = useToast();
  const [savingDraft, setSavingDraft] = useState(false);
  const syllabusQueryId = searchParams.get('id')?.trim() || '';

  useEffect(() => {
    let active = true;

    const readStoredSyllabus = (): SyllabusData | null => {
      try {
        const raw = sessionStorage.getItem('currentSyllabus');
        return raw ? normalizeSyllabusRecord(JSON.parse(raw) as SyllabusData) : null;
      } catch {
        return null;
      }
    };

    const loadSyllabus = async () => {
      setLoadingSyllabus(true);
      const stored = readStoredSyllabus();

      if (!syllabusQueryId) {
        if (stored) {
          if (active) {
            setSyllabus(stored);
            setLoadingSyllabus(false);
          }
          return;
        }

        navigate('/creator', { replace: true });
        if (active) {
          setLoadingSyllabus(false);
        }
        return;
      }

      try {
        const response = await api.getSyllabus(syllabusQueryId);
        const normalized = normalizeSyllabusRecord(response.data);

        if (!normalized) {
          throw new Error('No se pudo cargar el sílabo');
        }

        if (!active) {
          return;
        }

        sessionStorage.setItem('currentSyllabus', JSON.stringify(normalized));
        setSyllabus(normalized);
      } catch {
        if (!active) {
          return;
        }

        const storedId = String(stored?._id || stored?.id || '');
        if (stored && storedId === syllabusQueryId) {
          setSyllabus(stored);
        } else {
          navigate('/syllabi', { replace: true });
        }
      } finally {
        if (active) {
          setLoadingSyllabus(false);
        }
      }
    };

    loadSyllabus();

    return () => {
      active = false;
    };
  }, [navigate, syllabusQueryId]);

  useEffect(() => {
    const validate = async () => {
      if (!syllabus) return;

      const currentSyllabusId = String(syllabus._id || syllabus.id || '');
      if (!currentSyllabusId) return;

      setValidationLoading(true);
      setValidationError(null);

      try {
        const response = await api.validateSyllabus(currentSyllabusId);
        setValidation(response.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo validar el sílabo';
        setValidationError(message);
      } finally {
        setValidationLoading(false);
      }
    };

    validate();
  }, [syllabus]);

  useEffect(() => {
    if (validationError && !validationToastShown.current) {
      validationToastShown.current = true;
      console.warn('Validación silenciosa:', validationError);
    }
  }, [validationError]);

  const dg = syllabus?.datos_generales || {};
  const courseId = typeof dg.course_id === 'string' ? dg.course_id : '';
  const syllabusId = String(syllabus?._id || syllabus?.id || '');
  const syllabusStatus = (syllabus?.status || 'draft') as SyllabusStatus;
  const [editableFields, setEditableFields] = useState({
    prerrequisito: displayValue(dg.prerrequisito),
    fecha_inicio: displayValue(dg.fecha_inicio),
    fecha_fin: displayValue(dg.fecha_fin),
    periodo_academico: displayValue(dg.periodo_academico || dg.semestre),
    docente: sanitizeTeacherName(dg.docente),
    docente_email: displayValue(dg.docente_email || user?.email),
  });

  useEffect(() => {
    setEditableFields({
      prerrequisito: displayValue(dg.prerrequisito),
      fecha_inicio: displayValue(dg.fecha_inicio),
      fecha_fin: displayValue(dg.fecha_fin),
      periodo_academico: displayValue(dg.periodo_academico || dg.semestre),
      docente: sanitizeTeacherName(dg.docente),
      docente_email: displayValue(dg.docente_email || user?.email),
    });
  }, [dg.docente, dg.docente_email, dg.fecha_fin, dg.fecha_inicio, dg.periodo_academico, dg.prerrequisito, dg.semestre, user?.email]);

  useEffect(() => {
    let active = true;

    const loadCourse = async () => {
      if (!courseId) {
        setCourseDetail(null);
        return;
      }

      try {
        const response = await api.getCourse(courseId);
        if (active) {
          setCourseDetail(response.data || null);
        }
      } catch {
        if (active) {
          setCourseDetail(null);
        }
      }
    };

    loadCourse();

    return () => {
      active = false;
    };
  }, [courseId]);

  const observaciones: ValidationObservation[] = useMemo(() => {
    return validation?.observaciones || [];
  }, [validation]);

  const desempenos = useMemo(() => (syllabus ? normalizeDesempenos(syllabus) : ['D1. —']), [syllabus]);
  const unitSections = useMemo(() => (syllabus ? buildUnitSections(syllabus, desempenos) : []), [desempenos, syllabus]);
  const [editableUnits, setEditableUnits] = useState<UnitSection[]>([]);

  useEffect(() => {
    setEditableUnits(unitSections);
  }, [unitSections]);
  const evaluationRows = useMemo(
    () => buildEvaluationRows(unitSections, syllabus?.evaluacion_matriz),
    [unitSections, syllabus?.evaluacion_matriz],
  );
  const gradingRows = useMemo(
    () => buildGradingRows(syllabus?.sistema_evaluacion?.criterios),
    [syllabus?.sistema_evaluacion?.criterios],
  );
  const gradingFormula = useMemo(() => buildGradingFormula(gradingRows), [gradingRows]);

  const competenciaProfesional = displayValue(syllabus?.competencia_profesional || syllabus?.competencias?.[0]);
  const capacidadDelCurso = displayValue(
    syllabus?.capacidad_del_curso || courseDetail?.capacidad || syllabus?.resultados_aprendizaje?.[0],
  );
  const metodologia = displayValue(syllabus?.metodologia || defaultMetodologia);
  const tutoria = displayValue(syllabus?.tutoria || defaultTutoria);
  const courseName = pickDisplayValue(courseDetail?.name, dg.nombre_curso, 'Curso sin nombre');
  const facultyName = pickDisplayValue(context?.faculty_name, dg.facultad);
  const schoolName = pickDisplayValue(context?.school_name, dg.escuela_profesional, dg.programa_estudios, dg.carrera);
  const programName = pickDisplayValue(context?.program_name, dg.programa_estudios, dg.carrera, dg.escuela_profesional);
  const semesterName = pickDisplayValue(context?.semester, syllabus?.semester, dg.semestre);
  const courseCode = pickDisplayValue(courseDetail?.code, dg.codigo);
  const creditsValue = pickDisplayValue(dg.creditos, courseDetail?.credits);
  const teacherPreviewName = editableFields.docente === '—' ? 'Docente' : editableFields.docente;

  const updateStoredSyllabusStatus = (status: SyllabusStatus) => {
    const current = JSON.parse(sessionStorage.getItem('currentSyllabus') || '{}');
    sessionStorage.setItem(
      'currentSyllabus',
      JSON.stringify({ ...current, status }),
    );
    setSyllabus((prev) => (prev ? { ...prev, status } : prev));
  };

  const persistStoredSyllabus = (nextSyllabus: SyllabusData) => {
    sessionStorage.setItem('currentSyllabus', JSON.stringify(nextSyllabus));
    setSyllabus(nextSyllabus);
  };

  const updateEditableField = (
    field: keyof typeof editableFields,
    value: string,
  ) => {
    setEditableFields((prev) => ({ ...prev, [field]: value }));

    const current = JSON.parse(sessionStorage.getItem('currentSyllabus') || '{}');
    const updated = {
      ...current,
      datos_generales: {
        ...(current.datos_generales || {}),
        [field]: value,
      },
    };

    sessionStorage.setItem('currentSyllabus', JSON.stringify(updated));
    setSyllabus((prev) =>
      prev
        ? {
            ...prev,
            datos_generales: {
              ...(prev.datos_generales || {}),
              [field]: value,
            },
          }
        : prev,
    );
  };

  const updateUnitCell = (
    unitIdx: number,
    rowIdx: number,
    field: keyof ContentRow,
    value: string,
  ) => {
    setEditableUnits((prev) => {
      const next = prev.map((unit, ui) => {
        if (ui !== unitIdx) return unit;
        return {
          ...unit,
          rows: unit.rows.map((row, ri) => (ri !== rowIdx ? row : { ...row, [field]: value })),
        };
      });

      // Persist to sessionStorage so handleSaveDraft picks up edits
      const current = JSON.parse(sessionStorage.getItem('currentSyllabus') || '{}');
      const cronograma = current.cronograma_semanal || [];
      // Rebuild cronograma_semanal from editable units
      const updatedCronograma = next.flatMap((unit) =>
        unit.rows.map((row) => ({
          semana: parseInt(row.semana.replace(/\D/g, '')) || 0,
          tema: row.conocimientos,
          actividad: row.actividades,
          producto: row.evidencias,
        })),
      );
      // Only update if rows are schedule-based (have numeric semana)
      const hasSchedule = updatedCronograma.some((r) => r.semana > 0);
      sessionStorage.setItem(
        'currentSyllabus',
        JSON.stringify({
          ...current,
          cronograma_semanal: hasSchedule ? updatedCronograma : cronograma,
        }),
      );

      return next;
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('URL copiada', 'success');
    } catch {
      showToast('No se pudo copiar la URL', 'error');
    }
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!syllabusId) {
      showToast('Primero genera o carga un sílabo con ID válido', 'warning');
      return;
    }

    try {
      const response = await api.downloadSyllabusExport(syllabusId, format);

      if (!response.ok) {
        const body = await response.text();
        throw new ApiError(body || `No se pudo exportar el archivo ${format.toUpperCase()}`, response.status, body);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = format === 'docx' ? 'silabo.docx' : 'silabo.pdf';
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Archivo ${format.toUpperCase()} descargado`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo exportar el sílabo', 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!syllabusId) {
      showToast('Primero guarda el sílabo como borrador', 'warning');
      return;
    }

    setSavingDraft(true);
    try {
      const current = JSON.parse(sessionStorage.getItem('currentSyllabus') || 'null') as SyllabusData | null;
      const payloadToSave = current || syllabus;
      const rawUser = sessionStorage.getItem('silabos_user');
      const currentUser = rawUser ? (JSON.parse(rawUser) as { full_name?: string }) : null;
      const response = await api.updateSyllabus(syllabusId, payloadToSave as Record<string, unknown>, {
        status: 'draft',
        changed_by: currentUser?.full_name || dg.docente || 'sistema',
        change_note: 'Borrador actualizado desde el editor',
      });

      const persisted = response.data;
      const persistedId = String(persisted?._id || persisted?.id || '');
      if (!persistedId) {
        throw new Error('El backend no devolvió un ID válido al guardar el borrador');
      }

      persistStoredSyllabus(persisted);
      showToast('Borrador guardado ✓', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el borrador', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!syllabusId) {
      showToast('Guarda el sílabo primero', 'warning');
      return;
    }

    showToast(REVIEW_MODULE_MESSAGE, 'info');
  };

  const handlePublish = async () => {
    if (!syllabusId) {
      showToast('Guarda el sílabo primero', 'warning');
      return;
    }

    try {
      await api.publishSyllabus(syllabusId);
      showToast('Sílabo publicado ✓', 'success');
      updateStoredSyllabusStatus('published');
    } catch {
      showToast('No se pudo publicar el sílabo', 'error');
    }
  };

  if (loadingSyllabus) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-slate-500">
        Cargando sílabo...
      </div>
    );
  }

  if (!syllabus) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans">
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="rounded-xl border border-amber-400/60 bg-slate-900 p-1.5 text-amber-400 shadow-sm">
            <span className="block text-xl">*</span>
          </div>
          <h1 className="font-bold text-sm tracking-tight text-slate-900">Syllabus AI</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.22em] px-3 mb-2">Secciones</div>
          {sidebarSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-amber-50 hover:text-slate-900"
              >
                <Icon size={15} className="text-amber-500" /> {section.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-amber-400">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">{teacherPreviewName}</span>
              <span className="text-[10px] text-slate-500">Docente Principal</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <header className="max-w-4xl mx-auto mb-5 flex justify-between items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/syllabi')}
                className="text-slate-500 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Mis sílabos
              </button>
              <StatusBadge status={syllabusStatus} />
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">{courseName}</h2>
            <p className="text-slate-500 text-xs italic">Vista previa del Anexo C</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button disabled className="bg-white border border-slate-200 p-2 rounded-lg opacity-50 cursor-not-allowed">
              <History size={16} className="text-slate-600" />
            </button>
            <button onClick={() => handleExport('docx')} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Download size={16} /> ? DOCX
            </button>
            <button onClick={() => handleExport('pdf')} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Download size={16} /> ? PDF
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || !syllabusId}
              className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {savingDraft ? 'Guardando...' : 'Guardar borrador'}
            </button>
            {syllabusId && (syllabusStatus === 'draft' || syllabusStatus === 'returned') && (
              <button
                onClick={handleSubmitReview}
                className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-800"
              >
                <Send size={16} />
                Enviar a revisión
              </button>
            )}
            {syllabusId && syllabusStatus === 'review' && (
              <button
                disabled
                className="bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border border-amber-200 cursor-not-allowed"
              >
                <Send size={16} />
                En revisión...
              </button>
            )}
            {syllabusId && syllabusStatus === 'approved' && (
              <button
                onClick={handlePublish}
                className="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-amber-600"
              >
                <Rocket size={16} />
                Publicar
              </button>
            )}
            {syllabusId && syllabusStatus === 'published' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-[#007A8A] to-[#00B4CC] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:brightness-110"
              >
                <CheckCircle size={16} />
                Finalizar y volver al inicio
              </button>
            )}
            <button onClick={handleShare} className="bg-white border border-slate-200 p-2 rounded-lg hover:border-amber-300">
              <Share size={16} className="text-slate-600" />
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto my-8 bg-white px-10 py-12 shadow-xl font-serif text-[15px] leading-7">
          <header className="mb-10">
            <div className="flex items-start justify-between gap-6">
              <img src="/unprg-logo.png" className="h-16 w-auto" alt="UNPRG" />
              <div className="flex-1 text-center">
                <p className="text-lg font-bold uppercase tracking-wide">UNIVERSIDAD NACIONAL "PEDRO RUIZ GALLO"</p>
                <p className="text-base font-semibold uppercase">{facultyName}</p>
                <p className="text-base font-semibold uppercase">ESCUELA PROFESIONAL {schoolName}</p>
                <p className="text-sm">Departamento Académico de {programName}</p>
                <div className="mt-5">
                  <p className="text-lg font-bold uppercase">{courseName}</p>
                  <p className="text-base">(Sílabo)</p>
                </div>
              </div>
              <img src="/logo_fachse.png" className="h-16 w-auto" alt="Facultad" />
            </div>
          </header>

          <section id="info-general" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">I. Información General</h3>
            <div className="grid grid-cols-[220px_1fr] gap-y-2 text-sm">
              <div>1.1 Programa de Estudios</div>
              <div>{programName}</div>
              <div>1.2 Escuela Profesional</div>
              <div>{schoolName}</div>
              <div>1.3 Modalidad</div>
              <div>{displayValue(dg.modalidad || 'Presencial')}</div>
              <div>1.4 Curso</div>
              <div>{courseName}</div>
              <div>1.5 Prerrequisito</div>
              <div>
                <EditableField
                  value={editableFields.prerrequisito}
                  onChange={(v) => updateEditableField('prerrequisito', v)}
                  placeholder="Ej: Estadística aplicada..."
                />
              </div>
              <div>1.6 Código del curso</div>
              <div>{courseCode}</div>
              <div>1.7 Semestre Académico</div>
              <div>{semesterName}</div>
              <div>1.8 Periodo Académico</div>
              <div>
                <EditableField
                  value={editableFields.periodo_academico}
                  onChange={(v) => updateEditableField('periodo_academico', v)}
                  placeholder="Ej: X Ciclo"
                />
              </div>
              <div>1.9 Créditos</div>
              <div>{creditsValue}</div>
              <div>1.10 Horas Semanales (Teoría / Práctica)</div>
              <div>
                {displayValue(dg.horas_teoria)} / {displayValue(dg.horas_practica)}
              </div>
              <div>1.11 Duración (Fecha inicio / Fecha término)</div>
              <div>
                <div className="flex items-center gap-2">
                  <EditableField
                    value={editableFields.fecha_inicio}
                    onChange={(v) => updateEditableField('fecha_inicio', v)}
                    placeholder="DD/MM/AAAA"
                  />
                  <span>/</span>
                  <EditableField
                    value={editableFields.fecha_fin}
                    onChange={(v) => updateEditableField('fecha_fin', v)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
              </div>
              <div>1.12 Docente (Nombre completo / Correo institucional)</div>
              <div>
                <div className="flex items-center gap-2">
                  <EditableField
                    value={editableFields.docente}
                    onChange={(v) => updateEditableField('docente', v)}
                    placeholder="Nombre completo"
                  />
                  <span>/</span>
                  <EditableField
                    value={editableFields.docente_email}
                    onChange={(v) => updateEditableField('docente_email', v)}
                    placeholder="correo@institucion.edu.pe"
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs italic text-slate-500">
              ?? Los campos con línea punteada pueden completarse directamente aquí.
            </p>
          </section>

          <section id="sumilla" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">II. Sumilla</h3>
            <p className="text-sm leading-7">{displayValue(syllabus.sumilla)}</p>
            <p className="mt-3 text-sm italic">(Tal y conforme está en el Plan de Estudios vigente)</p>
          </section>

          <section id="competencia" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">III. Competencia Profesional</h3>
            <p className="text-sm leading-7">{competenciaProfesional}</p>
            <p className="mt-3 text-sm italic">(Tal y conforme está en el Plan de Estudios vigente)</p>
          </section>

          <section id="capacidad" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">IV. Capacidad del Curso</h3>
            <p className="text-sm leading-7">{capacidadDelCurso}</p>
            <p className="mt-3 text-sm italic">(Tal y conforme está en el Plan de Estudios vigente)</p>
          </section>

          <section id="desempenos" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">V. Desempeños de las Unidades Didácticas</h3>
            <div className="space-y-2 text-sm">
              {desempenos.map((item, index) => (
                <p key={`${item}-${index}`}>{item.startsWith('D') ? item : `D${index + 1}. ${item}`}</p>
              ))}
            </div>
          </section>

          <section id="programa-contenidos" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">VI. Programa de Contenidos</h3>
            <div className="space-y-6">
              {editableUnits.map((section, unitIdx) => (
                <div key={section.id}>
                  <h4 className="font-bold text-sm mb-2">{section.title}</h4>
                  <table className="w-full border border-slate-300 border-collapse text-xs table-fixed">
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 p-2 text-left">Desempeños</th>
                        <th className="border border-slate-300 p-2 text-left">Habilidades requeridas</th>
                        <th className="border border-slate-300 p-2 text-left">Semana</th>
                        <th className="border border-slate-300 p-2 text-left">Conocimientos</th>
                        <th className="border border-slate-300 p-2 text-left">Actividades</th>
                        <th className="border border-slate-300 p-2 text-left">Evidencias de Aprendizaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, rowIndex) => (
                        <tr key={`${section.id}-${rowIndex}`}>
                          {rowIndex === 0 && (
                            <td rowSpan={section.rows.length} className="border border-slate-300 p-2 align-top">
                              {row.desempeno}
                            </td>
                          )}
                          {rowIndex === 0 && (
                            <td
                              rowSpan={section.rows.length}
                              className="border border-slate-300 p-2 align-top whitespace-pre-line"
                            >
                              {section.habilidades}
                            </td>
                          )}
                          <td className="border border-slate-300 p-2 align-top">
                            <EditableField
                              value={row.semana}
                              onChange={(v) => updateUnitCell(unitIdx, rowIndex, 'semana', v)}
                              placeholder="Semana..."
                              multiline
                            />
                          </td>
                          <td className="border border-slate-300 p-2 align-top">
                            <EditableField
                              value={row.conocimientos}
                              onChange={(v) => updateUnitCell(unitIdx, rowIndex, 'conocimientos', v)}
                              placeholder="Conocimientos..."
                              multiline
                            />
                          </td>
                          <td className="border border-slate-300 p-2 align-top">
                            <EditableField
                              value={row.actividades}
                              onChange={(v) => updateUnitCell(unitIdx, rowIndex, 'actividades', v)}
                              placeholder="Actividades..."
                              multiline
                            />
                          </td>
                          <td className="border border-slate-300 p-2 align-top">
                            <EditableField
                              value={row.evidencias}
                              onChange={(v) => updateUnitCell(unitIdx, rowIndex, 'evidencias', v)}
                              placeholder="Evidencias..."
                              multiline
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          <section id="sistema-evaluacion" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">VII. Sistema de Evaluación</h3>
            <table className="w-full border border-slate-300 border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-2 text-left">Desempeños</th>
                  <th className="border border-slate-300 p-2 text-left">Habilidades requeridas</th>
                  <th className="border border-slate-300 p-2 text-left">Evidencias de Aprendizaje</th>
                  <th className="border border-slate-300 p-2 text-left">Instrumentos de Evaluación</th>
                </tr>
              </thead>
              <tbody>
                {evaluationRows.map((row, index) => (
                  <tr key={`evaluation-${index}`}>
                    <td className="border border-slate-300 p-2">{row.desempeno}</td>
                    <td className="border border-slate-300 p-2 whitespace-pre-line">{row.habilidades}</td>
                    <td className="border border-slate-300 p-2">{row.evidencias}</td>
                    <td className="border border-slate-300 p-2">{row.instrumentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section id="sistema-calificacion" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">VIII. Sistema de Calificación</h3>
            <table className="w-full border border-slate-300 border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-2 text-left">Evidencias de aprendizaje</th>
                  <th className="border border-slate-300 p-2 text-left">Sigla</th>
                  <th className="border border-slate-300 p-2 text-left">Peso</th>
                  <th className="border border-slate-300 p-2 text-left">Cronograma</th>
                </tr>
              </thead>
              <tbody>
                {gradingRows.map((row) => (
                  <tr key={row.sigla}>
                    <td className="border border-slate-300 p-2">{row.evidencia}</td>
                    <td className="border border-slate-300 p-2">{row.sigla}</td>
                    <td className="border border-slate-300 p-2">{row.porcentaje}%</td>
                    <td className="border border-slate-300 p-2">{row.cronograma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm font-semibold">{gradingFormula}</p>
          </section>

          <section id="metodologia" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">IX. Metodología de Enseñanza-Aprendizaje y Actividades de Investigación Formativa</h3>
            <p className="text-sm leading-7">{metodologia}</p>
          </section>

          <section id="tutoria" className="mb-8 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">X. Actividades de Tutoría: Área Académica</h3>
            <p className="text-sm leading-7">{tutoria}</p>
          </section>

          <section id="referencias" className="mb-10 scroll-mt-24">
            <h3 className="text-base font-bold uppercase border-b border-slate-300 pb-1 mb-4">XI. Referencias</h3>
            {(syllabus.bibliografia || []).length === 0 ? (
              <p className="text-sm">Pendiente de completar</p>
            ) : (
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                {syllabus.bibliografia?.map((item, index) => (
                  <li key={`${item.referencia}-${index}`}>{displayValue(item.referencia)}</li>
                ))}
              </ol>
            )}
          </section>

          <footer className="mt-16 text-sm">
            <p className="mb-10">Lambayeque, ____ de __________ de 20____</p>
            <div className="grid grid-cols-2 gap-12 text-center">
              <div>
                <p className="mb-12">FIRMA</p>
                <div className="border-t border-slate-500 pt-2">
                  <p>Nombre y apellidos</p>
                  <p>Director del</p>
                  <p>Departamento Académico</p>
                </div>
              </div>
              <div>
                <p className="mb-12">FIRMA</p>
                <div className="border-t border-slate-500 pt-2">
                  <p>Nombre y apellidos</p>
                  <p>Docente</p>
                </div>
              </div>
            </div>
          </footer>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-20">
          <h3 className="text-lg font-bold text-slate-900 mb-4">BibliographyGuide</h3>
          <BibliographyGuide
            courseName={courseName}
            careerName={programName}
          />
        </div>

        <div className="max-w-4xl mx-auto mb-20 rounded-3xl bg-gradient-to-r from-slate-950 to-blue-950 p-8 text-white shadow-xl ring-1 ring-amber-400/20">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="text-2xl font-black">? ¡Tu sílabo está listo!</p>
              <p className="mt-3 text-slate-200">
                Descarga el documento oficial en formato Word o PDF para revisión del Departamento Académico, o copia la URL para compartir con tus estudiantes.
              </p>
              <div className="mt-5 space-y-2 text-sm text-slate-200">
                <p>?? Descarga DOCX para entregar al Dpto. Académico</p>
                <p>?? Comparte la URL con tus estudiantes</p>
                <p>?? Sube el PDF al Aula Virtual UNPRG</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleExport('docx')}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-all shadow-md w-full"
              >
                <Download size={18} />
                Descargar DOCX oficial
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-all w-full"
              >
                <Download size={18} />
                Descargar PDF
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 bg-white/15 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all w-full border border-white/20"
              >
                <Share size={18} />
                Copiar enlace para compartir
              </button>
              <button
                onClick={() => navigate('/syllabi')}
                className="text-center text-amber-200 text-sm hover:text-white underline w-full"
              >
                ← Volver a Mis sílabos
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className="w-80 shrink-0 border-l border-gray-200 bg-slate-50 overflow-y-auto p-5">
        <h3 className="font-bold text-xs uppercase tracking-[0.16em] text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-amber-500" /> Auditoria de Coherencia
        </h3>

        {validationLoading ? <p className="text-sm text-slate-500">Validando silabo...</p> : null}

        <div className="space-y-4">
          {!syllabusId && !validationLoading ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-bold text-slate-700">Vista previa</p>
              <p className="text-xs text-slate-500 mt-1">
                La auditoría automática estará disponible cuando el sílabo se guarde en el sistema.
              </p>
            </div>
          ) : null}

          {syllabusId && !validationLoading && !validationError && observaciones.length === 0 ? (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <CheckCircle className="text-green-600 mb-2" />
              <p className="text-sm font-bold text-green-700">Sin observaciones</p>
              <p className="text-xs text-green-600 mt-1">La auditoria no reporto alertas.</p>
            </div>
          ) : null}

          {observaciones.map((obs, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${getObservationStyles(obs.nivel)}`}>
              <AlertTriangle className="mb-2" />
              <p className="text-sm font-bold">{obs.criterio}</p>
              <p className="text-xs mt-1">{obs.mensaje}</p>
            </div>
          ))}
        </div>
      </aside>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
