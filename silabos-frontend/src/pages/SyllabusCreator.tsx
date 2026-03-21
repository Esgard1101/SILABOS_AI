import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  MessageCircle,
  User,
  Edit,
  Sparkles,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  GenerateSyllabusInput,
  InstitutionalCareer,
  InstitutionalFaculty,
  SyllabusData,
} from '../api/types';
import Toast, { useToast } from '../components/Toast';
import { useSyllabus } from '../hooks/useSyllabus';

type Step = 1 | 2 | 3;

type EvaluationItem = {
  nombre: string;
  sigla: string;
  porcentaje: number;
  cronograma: string;
  editable: boolean;
};

const FALLBACK_FACULTIES: InstitutionalFaculty[] = [
  {
    id: 'fachse',
    name: 'Facultad de Ciencias Histórico Sociales y Educación (FACHSE)',
    code: 'FACHSE',
    careers: [
      { id: 'edu-ini', name: 'Educación Inicial', code: 'EDU-INI' },
      { id: 'edu-pri', name: 'Educación Primaria', code: 'EDU-PRI' },
      { id: 'edu-cn', name: 'Ciencias Naturales', code: 'EDU-CN' },
      { id: 'edu-chhss', name: 'CC.HH.SS. y Filosofía', code: 'EDU-CHHSS' },
      { id: 'edu-ll', name: 'Lengua y Literatura', code: 'EDU-LL' },
      { id: 'edu-ie', name: 'Idiomas Extranjeros', code: 'EDU-IE' },
      { id: 'edu-mc', name: 'Matemática y Computación', code: 'EDU-MC' },
      { id: 'edu-ef', name: 'Educación Física', code: 'EDU-EF' },
    ],
  },
];

const DEFAULT_EVALUATION_ITEMS: EvaluationItem[] = [
  {
    nombre: 'Tareas (Reportes de lectura, informes de clase, trabajo práctico)',
    sigla: 'TA',
    porcentaje: 40,
    cronograma: 'Permanente',
    editable: false,
  },
  {
    nombre: 'Producto Acreditable 1 (Planificación del trabajo integrador)',
    sigla: 'PA1',
    porcentaje: 10,
    cronograma: 'Semana 5',
    editable: true,
  },
  {
    nombre: 'Producto Acreditable 2 (Avance del Trabajo Integrador)',
    sigla: 'PA2',
    porcentaje: 20,
    cronograma: 'Semana 12',
    editable: true,
  },
  {
    nombre: 'Producto Acreditable 3 (Versión Final del Trabajo Integrador)',
    sigla: 'PA3',
    porcentaje: 30,
    cronograma: 'Semana 15',
    editable: true,
  },
];

const stepLabels: Record<Step, string> = {
  1: 'Datos Generales',
  2: 'Estructura Academica',
  3: 'Didactica',
};

const progressByStep: Record<Step, number> = {
  1: 33,
  2: 66,
  3: 100,
};

function sanitizeFaculties(faculties: InstitutionalFaculty[]): InstitutionalFaculty[] {
  return faculties.map((faculty) => ({
    ...faculty,
    careers: (faculty.careers || []).filter((career) => career.code !== 'EDU'),
  }));
}

function readSessionUser() {
  try {
    const raw = sessionStorage.getItem('silabos_user');
    return raw ? (JSON.parse(raw) as { full_name?: string; email?: string; career_id?: string | null }) : null;
  } catch {
    return null;
  }
}

function getSyllabusId(syllabus: Partial<SyllabusData> | null | undefined): string {
  return String(syllabus?._id || syllabus?.id || '');
}

export default function SyllabusCreator() {
  const navigate = useNavigate();
  const { generate, loading, error } = useSyllabus();
  const [step, setStep] = useState<Step>(1);
  const { showToast, toasts, removeToast } = useToast();
  const [resultadosAprendizaje, setResultadosAprendizaje] = useState<string[]>(['', '', '']);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [faculties, setFaculties] = useState<InstitutionalFaculty[]>(FALLBACK_FACULTIES);
  const [selectedFacultyId, setSelectedFacultyId] = useState(FALLBACK_FACULTIES[0]?.id || '');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [evaluationItems, setEvaluationItems] = useState<EvaluationItem[]>(DEFAULT_EVALUATION_ITEMS);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string>('');

  const [formData, setFormData] = useState<GenerateSyllabusInput>({
    nombre_curso: '',
    carrera: '',
    facultad: FALLBACK_FACULTIES[0]?.name || '',
    creditos: 3,
    horas_teoria: 2,
    horas_practica: 2,
    semestre: '2025-I',
    docente: '',
    modalidad: 'presencial',
    enfoque_didactico: 'competencias',
  });

  const [sumilla, setSumilla] = useState('');

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    const sessionUser = readSessionUser();
    if (sessionUser?.full_name) {
      setTeacherName(sessionUser.full_name);
      setFormData((prev) => ({ ...prev, docente: sessionUser.full_name || prev.docente }));
    }
    if (sessionUser?.email) {
      setTeacherEmail(sessionUser.email);
    }

    try {
      const rawDraft = sessionStorage.getItem('syllabusDraft');
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft) as { draftId?: string };
        if (parsedDraft.draftId) {
          setSavedDraftId(parsedDraft.draftId);
        }
      }
    } catch {
      // Ignoramos borradores locales corruptos.
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadFaculties = async () => {
      try {
        const response = await api.getInstitutionalFaculties();
        if (!active) {
          return;
        }

        const sanitized = sanitizeFaculties(response.faculties || []);
        if (sanitized.length > 0) {
          setFaculties(sanitized);
          setSelectedFacultyId((current) => current || sanitized[0].id);
        }
      } catch {
        if (!active) {
          return;
        }
        setFaculties(FALLBACK_FACULTIES);
        setSelectedFacultyId(FALLBACK_FACULTIES[0]?.id || '');
        showToast('Usando datos institucionales locales de respaldo', 'warning');
      }
    };

    loadFaculties();

    return () => {
      active = false;
    };
  }, [showToast]);

  const selectedFaculty = useMemo(() => {
    return faculties.find((faculty) => faculty.id === selectedFacultyId) || faculties[0] || FALLBACK_FACULTIES[0];
  }, [faculties, selectedFacultyId]);

  const availablePrograms = useMemo(() => {
    return selectedFaculty?.careers || [];
  }, [selectedFaculty]);

  const selectedProgram = useMemo(() => {
    return availablePrograms.find((career) => career.id === selectedProgramId) || null;
  }, [availablePrograms, selectedProgramId]);

  useEffect(() => {
    if (!selectedFaculty) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      facultad: selectedFaculty.name,
    }));

    if (!availablePrograms.length) {
      setSelectedProgramId('');
      setFormData((prev) => ({ ...prev, carrera: '', carrera_id: null }));
      return;
    }

    setSelectedProgramId((current) => {
      if (current && availablePrograms.some((program) => program.id === current)) {
        return current;
      }
      return availablePrograms[0].id;
    });
  }, [availablePrograms, selectedFaculty]);

  useEffect(() => {
    if (!selectedProgram) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      carrera: selectedProgram.name,
      carrera_id: selectedProgram.id,
    }));
  }, [selectedProgram]);

  const totalPercentage = useMemo(() => {
    return evaluationItems.reduce((total, item) => total + (Number(item.porcentaje) || 0), 0);
  }, [evaluationItems]);

  const weightFeedback = useMemo(() => {
    if (totalPercentage < 100) {
      return {
        text: `Faltan ${100 - totalPercentage}% por asignar`,
        className: 'text-red-600',
      };
    }

    if (totalPercentage > 100) {
      return {
        text: `Excede en ${totalPercentage - 100}%`,
        className: 'text-red-600',
      };
    }

    return {
      text: '✓ Total: 100%',
      className: 'text-green-600',
    };
  }, [totalPercentage]);

  const evaluationFormula = useMemo(() => {
    return evaluationItems
      .map((item) => `${(item.porcentaje / 100).toFixed(2)}×${item.sigla}`)
      .join(' + ');
  }, [evaluationItems]);

  const updateField = <K extends keyof GenerateSyllabusInput>(key: K, value: GenerateSyllabusInput[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const buildBasePayload = (): SyllabusData => {
    const resultadosLocales = resultadosAprendizaje
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return {
      id: savedDraftId || undefined,
      _id: savedDraftId || undefined,
      status: 'draft',
      datos_generales: {
        nombre_curso: formData.nombre_curso,
        facultad: selectedFaculty?.name || formData.facultad,
        carrera: selectedProgram?.name || formData.carrera,
        escuela_profesional: selectedProgram?.name || formData.carrera,
        programa_estudios: selectedProgram?.name || formData.carrera,
        creditos: formData.creditos,
        horas_teoria: formData.horas_teoria,
        horas_practica: formData.horas_practica,
        semestre: formData.semestre,
        periodo_academico: formData.semestre,
        docente: teacherName.trim() || formData.docente || 'Por designar',
        docente_email: teacherEmail.trim() || '—',
        modalidad: 'Presencial',
        codigo: '—',
        prerrequisito: '—',
        fecha_inicio: '—',
        fecha_fin: '—',
      },
      sumilla: sumilla.trim() || '—',
      competencias: resultadosLocales,
      competencia_profesional: resultadosLocales[0] || '—',
      resultados_aprendizaje: resultadosLocales,
      capacidad_del_curso: resultadosLocales[0] || '—',
      unidades_tematicas: [],
      cronograma_semanal: [],
      sistema_evaluacion: {
        criterios: evaluationItems.map((item) => ({
          nombre: item.nombre,
          sigla: item.sigla,
          porcentaje: item.porcentaje,
          cronograma: item.cronograma,
          editable: item.editable,
          descripcion: '',
        })),
      },
      bibliografia: [],
      metodologia: '—',
      tutoria: '—',
    };
  };

  const mergePersistedPayload = (data: SyllabusData): SyllabusData => {
    const base = buildBasePayload();
    return {
      ...base,
      ...data,
      id: getSyllabusId(data) || getSyllabusId(base) || undefined,
      _id: getSyllabusId(data) || getSyllabusId(base) || undefined,
      status: (data.status || 'draft'),
      datos_generales: {
        ...base.datos_generales,
        ...(data.datos_generales || {}),
      },
      sistema_evaluacion: {
        ...base.sistema_evaluacion,
        ...(data.sistema_evaluacion || {}),
        criterios:
          base.sistema_evaluacion?.criterios?.length
            ? base.sistema_evaluacion.criterios
            : (data.sistema_evaluacion?.criterios || []),
      },
    };
  };

  const goToStep = (target: Step) => {
    setStep(target);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSaveDraft = async () => {
    const localDraft = {
      formData,
      teacherName,
      teacherEmail,
      selectedFacultyId,
      selectedProgramId,
      sumilla,
      resultados_aprendizaje: resultadosAprendizaje,
      sistema_evaluacion: evaluationItems,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('syllabusDraft', JSON.stringify(localDraft));

    setSavingDraft(true);
    try {
      const payload = buildBasePayload();
      const response = savedDraftId
        ? await api.updateSyllabus(savedDraftId, payload as Record<string, unknown>, {
            status: 'draft',
            changed_by: teacherName.trim() || 'sistema',
            change_note: 'Borrador guardado desde el creador',
          })
        : await api.createSyllabusDraft(payload as Record<string, unknown>, 'draft');

      const persisted = mergePersistedPayload(response.data);
      const persistedId = getSyllabusId(persisted);
      if (!persistedId) {
        throw new Error('El backend no devolvió un ID válido para el borrador');
      }

      setSavedDraftId(persistedId);
      sessionStorage.setItem('currentSyllabus', JSON.stringify(persisted));
      sessionStorage.setItem('syllabusDraft', JSON.stringify({ ...localDraft, draftId: persistedId }));
      showToast('Borrador guardado correctamente', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el borrador', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleResultadoChange = (index: number, value: string) => {
    setResultadosAprendizaje((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleRemoveResultado = (index: number) => {
    setResultadosAprendizaje((prev) => prev.map((item, idx) => (idx === index ? '' : item)));
  };

  const updateEvaluationPercentage = (index: number, value: string) => {
    const nextValue = Number(value);
    setEvaluationItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index || !item.editable) {
          return item;
        }

        return {
          ...item,
          porcentaje: Number.isNaN(nextValue) ? 0 : nextValue,
        };
      }),
    );
  };

  const handleSuggestWithAI = async () => {
    if (!formData.nombre_curso.trim() || !formData.carrera.trim()) {
      showToast('Completa nombre del curso y programa antes de pedir una sugerencia', 'warning');
      return;
    }

    setIsSuggesting(true);
    try {
      const response = await api.generateSyllabus({
        ...formData,
        facultad: selectedFaculty?.name || formData.facultad,
        carrera: selectedProgram?.name || formData.carrera,
        carrera_id: selectedProgram?.id || formData.carrera_id || null,
        creditos: formData.creditos || 3,
        horas_teoria: formData.horas_teoria || 2,
        horas_practica: formData.horas_practica || 2,
        semestre: formData.semestre || '2025-I',
        docente: teacherName.trim() || 'Por designar',
        persist_result: false,
      });

      const suggestedData = response.data;
      if (suggestedData?.sumilla) {
        setSumilla(suggestedData.sumilla);
      }

      const suggestedResults =
        suggestedData?.resultados_aprendizaje?.filter((item) => item?.trim().length) ||
        suggestedData?.competencias?.filter((item) => item?.trim().length) ||
        [];

      if (suggestedResults.length > 0) {
        setResultadosAprendizaje(Array.from({ length: Math.max(3, suggestedResults.length) }, (_, index) => suggestedResults[index] || ''));
      }

      showToast('Sugerencia aplicada ✓', 'success');
    } catch {
      showToast('No se pudo obtener sugerencia', 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (totalPercentage !== 100) {
      showToast('La suma de porcentajes debe ser exactamente 100%', 'warning');
      return;
    }

    try {
      const data = await generate({
        ...formData,
        facultad: selectedFaculty?.name || formData.facultad,
        carrera: selectedProgram?.name || formData.carrera,
        carrera_id: selectedProgram?.id || formData.carrera_id || null,
        docente: teacherName.trim() || formData.docente,
      });

      const payload = mergePersistedPayload(data);
      const persistedId = getSyllabusId(payload);
      if (!persistedId) {
        showToast('La IA generó el sílabo, pero no se pudo persistir en la base de datos', 'error');
        return;
      }

      setSavedDraftId(persistedId);
      sessionStorage.setItem('currentSyllabus', JSON.stringify(payload));
      navigate('/editor');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo generar el silabo', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
          <div className="flex items-center gap-3 text-orange-600">
            <div className="size-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <h2 className="text-slate-900 text-lg font-bold">Creador de Silabo</h2>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-100 text-slate-600">
            <MessageCircle size={20} />
          </button>
          <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-100 text-slate-600">
            <User size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-8">
        <nav className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-bold">Paso {step} de 3</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-medium">{stepLabels[step]}</span>
            </div>
            <span className="text-slate-900 font-bold">{progressByStep[step]}% completado</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600" style={{ width: `${progressByStep[step]}%` }}></div>
          </div>
          <div className="grid grid-cols-3 mt-6 border-b border-slate-200">
            <button
              onClick={() => goToStep(1)}
              className={`pb-4 text-center flex items-center justify-center gap-2 ${
                step === 1 ? 'border-b-2 border-orange-600 text-orange-600' : 'text-slate-400'
              }`}
            >
              <span className="text-sm">1. Datos Generales</span>
            </button>
            <button
              onClick={() => goToStep(2)}
              className={`pb-4 text-center flex items-center justify-center gap-2 ${
                step === 2 ? 'border-b-2 border-orange-600 text-orange-600' : 'text-slate-400'
              }`}
            >
              <Edit size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">2. ESTRUCTURA</span>
            </button>
            <button
              onClick={() => goToStep(3)}
              className={`pb-4 text-center flex items-center justify-center gap-2 ${
                step === 3 ? 'border-b-2 border-orange-600 text-orange-600' : 'text-slate-400'
              }`}
            >
              <span className="text-sm">3. Didactica</span>
            </button>
          </div>
        </nav>

        {step === 1 ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Datos Generales del Curso</h1>
              <p className="text-slate-500 mt-2 text-lg">Completa la informacion base para generar el silabo.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Nombre del curso *</label>
                  <input
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    placeholder="Ej: Taller de Investigación Educativa I"
                    value={formData.nombre_curso}
                    onChange={(e) => updateField('nombre_curso', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Programa *</label>
                  <select
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                  >
                    <option value="">Selecciona un programa</option>
                    {availablePrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Facultad *</label>
                  <select
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                  >
                    <option value="">Selecciona una facultad</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Semestre</label>
                  <input
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    placeholder="Ej: 2025-I"
                    value={formData.semestre}
                    onChange={(e) => updateField('semestre', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Docente</label>
                  <input
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    placeholder="Nombre del docente"
                    value={teacherName}
                    onChange={(e) => {
                      setTeacherName(e.target.value);
                      updateField('docente', e.target.value);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Correo institucional</label>
                  <input
                    type="email"
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    placeholder="docente@unprg.edu.pe"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Creditos</label>
                  <input
                    type="number"
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={formData.creditos}
                    onChange={(e) => updateField('creditos', Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Horas Teoria</label>
                  <input
                    type="number"
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={formData.horas_teoria}
                    onChange={(e) => updateField('horas_teoria', Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700">Horas Practica</label>
                  <input
                    type="number"
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={formData.horas_practica}
                    onChange={(e) => updateField('horas_practica', Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Modalidad</label>
                  <select
                    className="rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    value={formData.modalidad}
                    onChange={(e) => updateField('modalidad', e.target.value as GenerateSyllabusInput['modalidad'])}
                  >
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="hibrido">Hibrido</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Estructura Academica y Competencias</h1>
              <p className="text-slate-500 mt-2 text-lg">
                Define la sumilla, las competencias clave y los resultados de aprendizaje esperados.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="flex flex-col gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Sumilla del Curso</label>
                    <button
                      type="button"
                      onClick={handleSuggestWithAI}
                      disabled={isSuggesting}
                      className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-full disabled:opacity-70"
                    >
                      <Sparkles size={14} /> {isSuggesting ? 'Sugiriendo...' : 'Sugerir con IA'}
                    </button>
                  </div>
                  <textarea
                    className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                    placeholder="Escriba una descripcion general del proposito y contenido del curso..."
                    rows={6}
                    value={sumilla}
                    onChange={(e) => setSumilla(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Resultados de Aprendizaje</label>
                    <p className="text-xs text-slate-500 mt-1">Que sera capaz de hacer el estudiante al finalizar?</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSuggestWithAI}
                    disabled={isSuggesting}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-orange-600 px-4 py-2 rounded-full shadow-md disabled:opacity-70"
                  >
                    <Sparkles size={14} /> {isSuggesting ? 'Sugiriendo...' : 'Sugerir con IA'}
                  </button>
                </div>
                <div className="space-y-4">
                  {resultadosAprendizaje.map((resultado, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex-shrink-0 size-6 bg-orange-600 text-white text-xs font-bold rounded flex items-center justify-center">{i + 1}</div>
                      <textarea
                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 resize-none"
                        rows={2}
                        value={resultado}
                        onChange={(e) => handleResultadoChange(i, e.target.value)}
                      ></textarea>
                      <button onClick={() => handleRemoveResultado(i)} className="text-slate-400 hover:text-red-500 h-fit">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Didactica y Generacion</h1>
              <p className="text-slate-500 mt-2 text-lg">Selecciona el enfoque didactico y revisa el sistema de calificacion del Anexo C.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-12">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Enfoque Didactico</label>
              <select
                className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                value={formData.enfoque_didactico}
                onChange={(e) =>
                  updateField('enfoque_didactico', e.target.value as GenerateSyllabusInput['enfoque_didactico'])
                }
              >
                <option value="competencias">Competencias</option>
                <option value="constructivista">Constructivista</option>
                <option value="tradicional">Tradicional</option>
              </select>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-12">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Sistema de Calificacion Anexo C</label>
                  <p className="text-sm text-slate-500 mt-1">Las siglas, nombres y cronograma son fijos; solo los pesos acreditables son ajustables.</p>
                </div>
                <span className={`text-sm font-semibold ${weightFeedback.className}`}>{weightFeedback.text}</span>
              </div>

              <div className="space-y-4">
                {evaluationItems.map((item, index) => (
                  <div key={item.sigla} className="grid grid-cols-1 md:grid-cols-[120px_1fr_140px_130px] gap-4 items-center rounded-xl border border-slate-200 p-4">
                    <div>
                      <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">{item.sigla}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{item.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.cronograma}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.editable ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.porcentaje}
                          onChange={(e) => updateEvaluationPercentage(index, e.target.value)}
                          className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm p-3"
                        />
                      ) : (
                        <span className="inline-flex min-w-[72px] justify-center rounded-lg bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700">
                          {item.porcentaje}%
                        </span>
                      )}
                      <span className="text-sm font-semibold text-slate-500">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                PF = {evaluationFormula}
              </div>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between pt-8 border-t border-slate-200 mb-12">
          <button
            onClick={handlePrevious}
            disabled={step === 1}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-40"
          >
            <ArrowLeft size={20} /> Anterior
          </button>

          <div className="flex gap-4 items-center">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDraft ? 'Guardando borrador...' : 'Guardar borrador'}
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-200"
              >
                {step === 2 ? 'Continuar a Didactica' : 'Continuar'} <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading || totalPercentage !== 100}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 disabled:opacity-70"
              >
                {loading ? 'Generando con IA...' : 'Generar Silabo'}
              </button>
            )}
          </div>
        </div>
        <Toast toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
}
