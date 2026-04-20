// SyllabusCreator.tsx — Wizard de 6 pasos para generar un sílabo
// Paso 1: Seleccionar curso
// Paso 2: Cargar bibliografía (opcional)
// Paso 3: Seleccionar método pedagógico
// Paso 4: Seleccionar habilidades compatibles con el método
// Paso 5: Sistema de calificación
// Paso 6: Confirmar y generar

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Loader2,
  Sparkles,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { CompatibleSkillsResponse, CourseDetail, CourseListItem, SkillDB } from '../api/types';
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
  3: 'Método',
  4: 'Habilidades',
  5: 'Calificación',
  6: 'Confirmar',
};

const DEFAULT_GRADING_ROWS: GradingRow[] = [
  { evidencia: 'Tareas', sigla: 'TA', porcentaje: 40, cronograma: 'Permanente' },
  { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 10, cronograma: '5ª Semana' },
  { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 20, cronograma: '12ª Semana' },
  { evidencia: 'Producto Acreditable 3', sigla: 'PA3', porcentaje: 30, cronograma: '15ª Semana' },
];

const MAX_SKILLS = 8;

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

function SkillBadge({
  skill,
  selected,
  recommended,
  atLimit,
  onToggle,
}: {
  skill: SkillDB;
  selected: boolean;
  recommended: boolean;
  atLimit: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={atLimit && !selected}
      onClick={onToggle}
      className={`flex items-start gap-2 w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
        selected
          ? 'border-orange-400 bg-orange-50 text-orange-900'
          : atLimit
          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50'
      }`}
    >
      <div
        className={`w-4 h-4 shrink-0 mt-0.5 rounded border-2 flex items-center justify-center ${
          selected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
        }`}
      >
        {selected && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm">{skill.nombre}</span>
          {recommended && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              Recomendada
            </span>
          )}
          {skill.nivel_cognitivo && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {skill.nivel_cognitivo}
            </span>
          )}
        </div>
        {skill.verbo_principal && (
          <p className="text-xs text-gray-500 mt-0.5">Verbo: {skill.verbo_principal}</p>
        )}
      </div>
    </button>
  );
}

export default function SyllabusCreator() {
  const navigate = useNavigate();
  const { context } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();

  const [step, setStep] = useState<Step>(1);

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

  // Step 3 — Method
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedMethodName, setSelectedMethodName] = useState<string>('');
  const [selectedMethodSequence, setSelectedMethodSequence] = useState<string>('');

  // Step 4 — Skills
  const [skillsData, setSkillsData] = useState<CompatibleSkillsResponse | null>(null);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Step 5 — Grading
  const [useAiGrading, setUseAiGrading] = useState(true);
  const [requireMidtermFinal, setRequireMidtermFinal] = useState(false);
  const [gradingRows, setGradingRows] = useState<GradingRow[]>(DEFAULT_GRADING_ROWS);

  const [generating, setGenerating] = useState(false);

  const gradingTotal = useMemo(
    () => gradingRows.reduce((total, item) => total + (Number(item.porcentaje) || 0), 0),
    [gradingRows],
  );
  const gradingRowsValid = gradingRows.every(
    (r) => r.evidencia.trim().length > 0 && r.sigla.trim().length > 0 && r.cronograma.trim().length > 0,
  );
  const canContinueFromGrading = useAiGrading || (gradingTotal === 100 && gradingRowsValid);

  // Load courses
  useEffect(() => {
    if (!context?.program_id) return;
    setLoadingCourses(true);
    api
      .getCourses(context.program_id)
      .then((res) => setCourses(res.data || []))
      .catch(() => showToast('No se pudieron cargar los cursos', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [context?.program_id]);

  // Load course detail on selection
  useEffect(() => {
    if (!selectedCourseId) { setCourseDetail(null); return; }
    setLoadingDetail(true);
    api
      .getCourse(selectedCourseId)
      .then((res) => setCourseDetail(res.data || null))
      .catch(() => showToast('No se pudo cargar el detalle del curso', 'error'))
      .finally(() => setLoadingDetail(false));
  }, [selectedCourseId]);

  // Load compatible skills when entering step 4 (method must be selected)
  useEffect(() => {
    if (step !== 4 || !selectedMethodId || skillsData) return;
    setLoadingSkills(true);
    api
      .getMethodSkills(selectedMethodId)
      .then((res) => setSkillsData(res.data || null))
      .catch(() => showToast('No se pudieron cargar las habilidades', 'error'))
      .finally(() => setLoadingSkills(false));
  }, [step, selectedMethodId]);

  // Reset skills when method changes
  useEffect(() => {
    setSkillsData(null);
    setSelectedSkillIds([]);
    setSkillSearch('');
  }, [selectedMethodId]);

  const handleBibliographyFile = async (file: File) => {
    if (!context || !courseDetail) return;
    if (uploadedBiblio) {
      showToast('Elimina el archivo actual antes de subir uno nuevo.', 'error');
      return;
    }
    setUploadingBiblio(true);
    try {
      const res = await api.uploadBibliography(file, courseDetail.id, context.program_id, courseDetail.scope || 'program');
      const refCount: number = (res as any)?.data?.ref_count ?? 0;
      const docId: string = (res as any)?.data?.id ?? '';
      setUploadedBiblio({ docId, fileName: file.name, refCount });
      showToast(
        refCount > 0
          ? `Bibliografía cargada — ${refCount} referencias extraídas`
          : 'Bibliografía cargada (sin referencias APA detectadas)',
        'success',
      );
    } catch (err: any) {
      showToast(err?.message || 'Error al subir el archivo', 'error');
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
      showToast('Archivo eliminado.', 'success');
    } catch {
      showToast('No se pudo eliminar el archivo', 'error');
    } finally {
      setRemovingBiblio(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const updateGradingRow = (index: number, field: keyof GradingRow, value: string) => {
    setUseAiGrading(false);
    setGradingRows((rows) =>
      rows.map((row, i) =>
        i === index ? { ...row, [field]: field === 'porcentaje' ? Number(value) || 0 : value } : row,
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
        selected_skill_ids: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        grading_scheme: useAiGrading ? undefined : gradingRows,
        grading_requires_midterm_final: requireMidtermFinal,
      });
      const syllabusId = res.data?._id || res.data?.id;
      if (syllabusId) {
        navigate(`/editor?id=${syllabusId}`);
      } else {
        showToast('Sílabo generado pero no se pudo navegar al editor', 'warning');
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? (typeof err.details === 'object' && err.details && 'detail' in err.details
              ? String(err.details.detail)
              : err.message)
          : err instanceof Error
          ? err.message
          : 'Error al generar el sílabo';
      showToast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Filtered skill list for display in step 4
  const recommendedSkillIds = useMemo(
    () => new Set((skillsData?.recommended_skills ?? []).map((s) => s.id)),
    [skillsData],
  );

  const allSkillsForDisplay = useMemo((): SkillDB[] => {
    if (!skillsData) return [];
    const recIds = recommendedSkillIds;
    const compatible = skillsData.compatible_skills.filter((s) => !recIds.has(s.id));
    return [...skillsData.recommended_skills, ...compatible];
  }, [skillsData, recommendedSkillIds]);

  const filteredSkills = useMemo((): SkillDB[] => {
    if (!skillSearch.trim()) return allSkillsForDisplay;
    const q = skillSearch.toLowerCase();
    return allSkillsForDisplay.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        s.categoria?.toLowerCase().includes(q) ||
        s.verbo_principal?.toLowerCase().includes(q),
    );
  }, [allSkillsForDisplay, skillSearch]);

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
                      {c.code && <span className="text-xs text-gray-400">{c.code}</span>}
                    </button>
                  ))}
                </div>
              )}

              {loadingDetail && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando datos del curso…
                </div>
              )}
              {courseDetail && !loadingDetail && <CourseCard course={courseDetail} />}

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
          {step === 3 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Método pedagógico</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  La IA sugiere el método más adecuado. Puedes cambiarlo libremente.
                </p>
              </div>

              <MethodSelector
                courseId={courseDetail.id}
                value={selectedMethodId}
                onChange={(id, name, sequence) => {
                  setSelectedMethodId(id);
                  setSelectedMethodName(name);
                  setSelectedMethodSequence(sequence || '');
                }}
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!selectedMethodId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 4: Habilidades compatibles ──── */}
          {step === 4 && courseDetail && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Habilidades del sílabo</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Selecciona hasta {MAX_SKILLS} habilidades compatibles con{' '}
                  <strong>{selectedMethodName}</strong>. La IA las usará para redactar logros y criterios de evaluación.
                </p>
              </div>

              {skillsData?.fallback_mode && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
                  Mostrando catálogo completo — no hay habilidades específicas configuradas para este método.
                </div>
              )}

              {loadingSkills ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando habilidades compatibles…
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Buscar por nombre, categoría o verbo…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />

                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {filteredSkills.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">
                        No se encontraron habilidades.
                      </p>
                    ) : (
                      filteredSkills.map((s: SkillDB) => (
                        <div key={s.id}>
                          <SkillBadge
                            skill={s}
                            selected={selectedSkillIds.includes(s.id)}
                            recommended={recommendedSkillIds.has(s.id)}
                            atLimit={selectedSkillIds.length >= MAX_SKILLS}
                            onToggle={() => toggleSkill(s.id)}
                          />
                        </div>
                      ))
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    {selectedSkillIds.length}/{MAX_SKILLS} seleccionadas
                    {skillsData && ` — ${skillsData.total} disponibles`}
                  </p>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedSkillIds([]); setStep(5); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={() => setStep(5)}
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
                      Se agrega como restricción durante la generación.
                    </p>
                  </div>
                </label>
              </div>

              <div
                className={`bg-white border rounded-xl overflow-hidden ${
                  useAiGrading ? 'border-gray-100 opacity-70' : 'border-gray-200'
                }`}
              >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Tabla editable</h3>
                    <p className="text-xs text-gray-500">Evidencia, sigla, peso y cronograma.</p>
                  </div>
                  <div
                    className={`text-sm font-bold ${gradingTotal === 100 ? 'text-green-600' : 'text-red-600'}`}
                  >
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

              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                <div className="px-5 py-4 flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Curso</p>
                    <p className="text-sm font-medium text-gray-800">{courseDetail.name}</p>
                    {courseDetail.code && <p className="text-xs text-gray-400">{courseDetail.code}</p>}
                  </div>
                </div>
                <div className="px-5 py-4 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      Método pedagógico
                    </p>
                    <p className="text-sm font-medium text-gray-800">{selectedMethodName || '(IA elige)'}</p>
                    {selectedMethodSequence && (
                      <p className="mt-1 text-xs text-gray-500">Secuencia: {selectedMethodSequence}</p>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Semestre</p>
                  <p className="text-sm font-medium text-gray-800">{context.semester}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                    Habilidades seleccionadas
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedSkillIds.length > 0
                      ? `${selectedSkillIds.length} habilidad${selectedSkillIds.length > 1 ? 'es' : ''} seleccionada${selectedSkillIds.length > 1 ? 's' : ''}`
                      : 'Ninguna (IA propone)'}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Calificación</p>
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
