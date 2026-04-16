// SyllabusCreator.tsx — Wizard de 4 pasos para generar un sílabo
// Paso 1: Seleccionar curso del programa
// Paso 2: Cargar bibliografía (opcional, NotebookLM)
// Paso 3: Seleccionar método pedagógico
// Paso 4: Confirmar y generar

import React, { useEffect, useMemo, useState } from 'react';
import { BASE_URL, getToken } from '../api/client';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { CourseDetail, CourseListItem } from '../api/types';
import CourseCard from '../components/CourseCard';
import MethodSelector from '../components/MethodSelector';
import NavSidebar from '../components/NavSidebar';
import NotebookLMGuide from '../components/NotebookLMGuide';
import Toast, { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface GradingRow {
  evidencia: string;
  sigla: string;
  porcentaje: number;
  cronograma: string;
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Curso',
  2: 'Bibliografía',
  3: 'Habilidades',
  4: 'Método',
  5: 'Calificación',
  6: 'Confirmar',
};

const DEFAULT_GRADING_ROWS: GradingRow[] = [
  { evidencia: 'Tareas', sigla: 'TA', porcentaje: 40, cronograma: 'Permanente' },
  { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 10, cronograma: '5ª Semana' },
  { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 20, cronograma: '12ª Semana' },
  { evidencia: 'Producto Acreditable 3', sigla: 'PA3', porcentaje: 30, cronograma: '15ª Semana' },
];

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4, 5, 6];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, idx) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < current
                  ? 'bg-green-500 text-white'
                  : s === current
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < current ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                s === current ? 'text-orange-600' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px max-w-12 ${s < current ? 'bg-green-300' : 'bg-gray-200'}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SyllabusCreator() {
  const navigate = useNavigate();
  const { context } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();

  const [step, setStep] = useState<Step>(1);

  // Estado del wizard
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [uploadingBiblio, setUploadingBiblio] = useState(false);
  const [uploadedBiblio, setUploadedBiblio] = useState<{
    docId: string;
    fileName: string;
    refCount: number;
  } | null>(null);
  const [removingBiblio, setRemovingBiblio] = useState(false);

  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [selectedMethodName, setSelectedMethodName] = useState<string>('');
  const [selectedMethodSequence, setSelectedMethodSequence] = useState<string>('');

  // Paso 4 — Enfoques de habilidades
  const [skillCategories, setSkillCategories] = useState<string[]>([]);
  const [loadingSkillCategories, setLoadingSkillCategories] = useState(false);
  const [selectedSkillCategories, setSelectedSkillCategories] = useState<string[]>([]);

  const [useAiGrading, setUseAiGrading] = useState(true);
  const [requireMidtermFinal, setRequireMidtermFinal] = useState(false);
  const [gradingRows, setGradingRows] = useState<GradingRow[]>(DEFAULT_GRADING_ROWS);

  const [generating, setGenerating] = useState(false);

  const gradingTotal = useMemo(
    () => gradingRows.reduce((total, item) => total + (Number(item.porcentaje) || 0), 0),
    [gradingRows],
  );
  const gradingRowsValid = gradingRows.every(
    (item) =>
      item.evidencia.trim().length > 0 &&
      item.sigla.trim().length > 0 &&
      item.cronograma.trim().length > 0,
  );
  const canContinueFromGrading = useAiGrading || (gradingTotal === 100 && gradingRowsValid);

  // Cargar categorías de habilidades cuando llega al paso 3
  useEffect(() => {
    if (step !== 3 || skillCategories.length > 0) return;
    setLoadingSkillCategories(true);
    fetch(`${BASE_URL}/api/skills/categories`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((json) => setSkillCategories(Array.isArray(json.data) ? json.data : []))
      .catch(() => showToast('No se pudieron cargar las categorías de habilidades', 'error'))
      .finally(() => setLoadingSkillCategories(false));
  }, [step]);

  // Cargar cursos del programa al montar
  useEffect(() => {
    if (!context?.program_id) return;
    setLoadingCourses(true);
    api
      .getCourses(context.program_id)
      .then((res) => setCourses(res.data || []))
      .catch(() => showToast('No se pudieron cargar los cursos', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [context?.program_id]);

  // Cargar detalle del curso al seleccionar
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseDetail(null);
      return;
    }
    setLoadingDetail(true);
    api
      .getCourse(selectedCourseId)
      .then((res) => setCourseDetail(res.data || null))
      .catch(() => showToast('No se pudo cargar el detalle del curso', 'error'))
      .finally(() => setLoadingDetail(false));
  }, [selectedCourseId]);

  const handleBibliographyFile = async (file: File) => {
    if (!context || !courseDetail) return;
    if (uploadedBiblio) {
      showToast(
        'Al crear un sílabo debes subir un solo archivo final de tus referencias consolidadas en NotebookLM. Elimina el archivo actual primero.',
        'error',
      );
      return;
    }
    setUploadingBiblio(true);
    try {
      const res = await api.uploadBibliography(
        file,
        courseDetail.id,
        context.program_id,
        courseDetail.scope || 'program',
      );
      const refCount: number = (res as any)?.data?.ref_count ?? 0;
      const docId: string = (res as any)?.data?.id ?? '';
      setUploadedBiblio({ docId, fileName: file.name, refCount });
      showToast(
        refCount > 0
          ? `Bibliografía cargada — ${refCount} referencias extraídas automáticamente`
          : 'Bibliografía cargada (no se detectaron referencias APA en el archivo)',
        'success',
      );
    } catch (err: any) {
      const msg: string = err?.message || 'Error al subir el archivo';
      showToast(msg, 'error');
    } finally {
      setUploadingBiblio(false);
    }
  };

  const handleRemoveBibliography = async () => {
    if (!uploadedBiblio) return;
    setRemovingBiblio(true);
    try {
      await api.deleteDocument(uploadedBiblio.docId);
      setUploadedBiblio(null);
      showToast('Archivo eliminado. Puedes subir uno nuevo.', 'success');
    } catch {
      showToast('No se pudo eliminar el archivo', 'error');
    } finally {
      setRemovingBiblio(false);
    }
  };

  const updateGradingRow = (
    index: number,
    field: keyof GradingRow,
    value: string,
  ) => {
    setUseAiGrading(false);
    setGradingRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === 'porcentaje' ? Number(value) || 0 : value,
            }
          : row,
      ),
    );
  };

  const handleGenerate = async () => {
    if (!courseDetail || !context) return;
    setGenerating(true);
    try {
      const res = await api.generateSyllabusV2({
        course_id: courseDetail.id,
        teaching_method_id: selectedMethodId,
        semester: context.semester,
        selected_skill_categories: selectedSkillCategories,
        grading_scheme: useAiGrading ? undefined : gradingRows,
        grading_requires_midterm_final: requireMidtermFinal,
      });
      const syllabusId = res.data?._id || res.data?.id || (res as unknown as { _id?: string })._id;
      if (syllabusId) {
        navigate(`/editor?id=${syllabusId}`);
      } else {
        showToast('Sílabo generado pero no se pudo navegar al editor', 'warning');
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? (typeof err.details === 'object' &&
              err.details &&
              'detail' in err.details &&
              typeof err.details.detail === 'string' &&
              err.details.detail) ||
            err.message
          : err instanceof Error
          ? err.message
          : 'Error al generar el sílabo';
      showToast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No hay contexto activo. Redirigiendo…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavSidebar currentPath="/creator" />

      <div className="flex-1">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="bg-orange-500 rounded-lg p-1.5">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Nuevo Sílabo</h1>
              <p className="text-xs text-gray-500">
                {context.program_name} — {context.semester}
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <StepIndicator current={step} />

          {/* ──── PASO 1: Selección de curso ──── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Selecciona el curso</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Cursos del programa {context.program_name} (incluye cursos comunes)
                </p>
              </div>

              {loadingCourses ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando cursos…
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No se encontraron cursos para este programa.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        selectedCourseId === c.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          {c.cycle != null && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              Ciclo {c.cycle}
                            </span>
                          )}
                          {c.is_common && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                              Común
                            </span>
                          )}
                          {c.credits != null && (
                            <span className="text-xs text-gray-500">{c.credits} cr.</span>
                          )}
                        </div>
                      </div>
                      {c.code && (
                        <span className="text-xs text-gray-400">{c.code}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Vista previa del curso seleccionado */}
              {loadingDetail && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando datos del curso…
                </div>
              )}
              {courseDetail && !loadingDetail && (
                <CourseCard course={courseDetail} />
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedCourseId || loadingDetail}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 2: Bibliografía (opcional) ──── */}
          {step === 2 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Carga de bibliografía</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Opcional — enriquece el sílabo con fuentes específicas del curso.
                </p>
              </div>

              <NotebookLMGuide
                courseName={courseDetail.name}
                sumilla={courseDetail.sumilla || ''}
                metodologias={selectedMethodName || undefined}
                onFileSelected={handleBibliographyFile}
                uploading={uploadingBiblio}
                uploadedBiblio={uploadedBiblio}
                onRemoveBiblio={handleRemoveBibliography}
                removingBiblio={removingBiblio}
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Omitir este paso
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──── PASO 3: Método pedagógico ──── */}
          {step === 4 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Método pedagógico</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  La IA sugiere el método más adecuado. Puedes cambiarlo libremente.
                </p>
              </div>

              <MethodSelector
                courseId={courseDetail.id}
                selectedCategories={selectedSkillCategories}
                value={selectedMethodId}
                onChange={(id, name, sequence) => {
                  setSelectedMethodId(id);
                  setSelectedMethodName(name);
                  setSelectedMethodSequence(sequence || '');
                }}
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(5)}
                  disabled={selectedMethodId === null}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 4: Enfoques de habilidades ──── */}
          {step === 3 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Enfoques de habilidades</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Elige hasta 3 categorías. La IA usará sus verbos e instrumentos al redactar logros y
                  criterios de evaluación del sílabo.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-800 leading-relaxed">
                <strong>¿Para qué sirve esto?</strong> Cada categoría aporta un enfoque distinto:
                verbos taxonomicos específicos (Bloom) y tipos de instrumentos de evaluación. Al
                seleccionarlas, el sílabo generado usará exactamente esos verbos en los logros de cada
                unidad y en los criterios de calificación — alineando el curso al perfil de egreso de tu
                programa.
              </div>

              {loadingSkillCategories ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Cargando categorías…
                </div>
              ) : skillCategories.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                  No hay categorías disponibles en este momento.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillCategories.map((cat) => {
                    const selected = selectedSkillCategories.includes(cat);
                    const atLimit = !selected && selectedSkillCategories.length >= 3;
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={atLimit}
                        onClick={() =>
                          setSelectedSkillCategories((prev) =>
                            selected ? prev.filter((c) => c !== cat) : [...prev, cat],
                          )
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                          selected
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : atLimit
                            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSkillCategories.length > 0 && (
                <p className="text-xs text-gray-500">
                  {selectedSkillCategories.length}/3 categoría{selectedSkillCategories.length > 1 ? 's' : ''} seleccionada{selectedSkillCategories.length > 1 ? 's' : ''}: <strong>{selectedSkillCategories.join(', ')}</strong>
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedSkillCategories([]); setStep(4); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──── PASO 5: Sistema de calificación ──── */}
          {step === 5 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Sistema de calificación</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Puedes dejar la propuesta de la IA o personalizar la ponderación antes de generar.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAiGrading}
                    onChange={(e) => setUseAiGrading(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Usar sistema sugerido por IA</p>
                    <p className="text-xs text-gray-500">
                      Si no quieres tocar esta parte, mantenemos la propuesta que genere el sistema.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireMidtermFinal}
                    onChange={(e) => setRequireMidtermFinal(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Debe incluir parcial y final</p>
                    <p className="text-xs text-gray-500">
                      Se agrega como restricción simple durante la generación.
                    </p>
                  </div>
                </label>
              </div>

              <div className={`bg-white border rounded-xl overflow-hidden ${useAiGrading ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Tabla editable</h3>
                    <p className="text-xs text-gray-500">Evidencia, sigla, peso y cronograma.</p>
                  </div>
                  <div className={`text-sm font-bold ${gradingTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {gradingTotal}%
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Evidencia</th>
                        <th className="text-left px-4 py-3 font-semibold">Sigla</th>
                        <th className="text-left px-4 py-3 font-semibold">Peso</th>
                        <th className="text-left px-4 py-3 font-semibold">Cronograma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradingRows.map((row, index) => (
                        <tr key={`${row.sigla}-${index}`} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.evidencia}
                              onChange={(e) => updateGradingRow(index, 'evidencia', e.target.value)}
                              disabled={useAiGrading}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.sigla}
                              onChange={(e) => updateGradingRow(index, 'sigla', e.target.value.toUpperCase())}
                              disabled={useAiGrading}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.porcentaje}
                                onChange={(e) => updateGradingRow(index, 'porcentaje', e.target.value)}
                                disabled={useAiGrading}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.cronograma}
                              onChange={(e) => updateGradingRow(index, 'cronograma', e.target.value)}
                              disabled={useAiGrading}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!useAiGrading && gradingTotal !== 100 && (
                <p className="text-sm text-red-600">
                  La suma de los pesos debe ser exactamente 100%.
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(6)}
                  disabled={!canContinueFromGrading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 6: Confirmar y generar ──── */}
          {step === 6 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Confirmar y generar</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Revisa el resumen antes de generar. La IA tardará entre 10 y 20 segundos.
                </p>
              </div>

              {/* Resumen */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                <div className="px-5 py-4 flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      Curso
                    </p>
                    <p className="text-sm font-medium text-gray-800">{courseDetail.name}</p>
                    {courseDetail.code && (
                      <p className="text-xs text-gray-400">{courseDetail.code}</p>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      Método pedagógico
                    </p>
                    <p className="text-sm font-medium text-gray-800">{selectedMethodName}</p>
                    {selectedMethodSequence ? (
                      <p className="mt-1 text-xs text-gray-500">Secuencia: {selectedMethodSequence}</p>
                    ) : null}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Semestre
                  </p>
                  <p className="text-sm font-medium text-gray-800">{context.semester}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Enfoques de habilidades
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedSkillCategories.length > 0
                      ? selectedSkillCategories.join(', ')
                      : 'Ninguno seleccionado (IA propone)'}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Calificación
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {useAiGrading ? 'Usar sugerencia de la IA' : `Personalizada (${gradingTotal}%)`}
                  </p>
                  {requireMidtermFinal && (
                    <p className="text-xs text-gray-500 mt-1">Debe incluir parcial y final.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(5)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando sílabo…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generar sílabo
                    </>
                  )}
                </button>
              </div>

              {generating && (
                <p className="text-xs text-gray-400 text-center">
                  La IA está construyendo el sílabo completo. Esto puede tomar hasta 20 segundos…
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
