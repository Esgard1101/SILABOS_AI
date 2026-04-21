// SyllabusCreator.tsx — Wizard Progresivo v3
// Orden: Curso → Bibliografía → Propósito → Contenido → Método → Calificación → Confirmar
// Cada bloque se guarda de forma incremental. La IA solo interviene en puntos críticos.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Loader2,
  Plus,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import {
  ContentBlock,
  CourseDetail,
  CourseListItem,
  BibliographyReference,
  GradingBlock,
  GradingRow,
  HabilidadPorDesempeno,
  InstitutionalSkill,
  MethodBlock,
  PerformanceDB,
  ProgressiveDraft,
  PurposeBlock,
  SyllabusData,
  StepBlockStatus,
  SuggestedPerformance,
  WorkflowState,
} from '../api/types';
import CourseCard from '../components/CourseCard';
import MethodSelector from '../components/MethodSelector';
import NavSidebar from '../components/NavSidebar';
import NotebookLMGuide from '../components/NotebookLMGuide';
import Toast, { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { setCurrentSyllabus } from '../utils/syllabusStorage';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<Step, string> = {
  1: 'Curso',
  2: 'Bibliografía',
  3: 'Propósito',
  4: 'Contenido',
  5: 'Método',
  6: 'Calificación',
  7: 'Confirmar',
};

const STEP_KEYS: Record<Step, string | null> = {
  1: null,
  2: 'bibliography',
  3: 'purpose',
  4: 'content',
  5: 'method',
  6: 'grading',
  7: null,
};

const MAX_SKILLS = 8;
const MAX_CONOCIMIENTOS = 8;
const MAX_ACTITUDES = 6;

// ── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StepBlockStatus }) {
  const cfg: Record<StepBlockStatus, { label: string; cls: string }> = {
    empty:     { label: 'Vacío',      cls: 'bg-gray-100 text-gray-500' },
    suggested: { label: 'Sugerido',   cls: 'bg-blue-100 text-blue-700' },
    edited:    { label: 'Editado',    cls: 'bg-orange-100 text-orange-700' },
    approved:  { label: 'Aprobado',   cls: 'bg-green-100 text-green-700' },
    dirty:     { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  };
  const { label, cls } = cfg[status] ?? cfg.empty;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((s, idx) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < current
                  ? 'bg-green-500 text-white'
                  : s === current
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < current ? <CheckCircle className="w-3.5 h-3.5" /> : s}
            </div>
            <span
              className={`text-[10px] font-medium hidden sm:inline ${
                s === current ? 'text-orange-600' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-px max-w-8 ${s < current ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SuggestButton({
  onClick,
  loading,
  label = 'Sugerir con IA',
  disabled = false,
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? 'Generando…' : label}
    </button>
  );
}

function ChipInput({
  items,
  onChange,
  placeholder,
  max,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  max: number;
}) {
  const [draft, setDraft] = useState('');
  const addItem = () => {
    const val = draft.trim();
    if (!val || items.includes(val) || items.length >= max) return;
    onChange([...items, val]);
    setDraft('');
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-orange-500 hover:text-orange-700"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-gray-400 self-center">Sin elementos</span>
        )}
      </div>
      {items.length < max && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft.trim()}
            className="px-2 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
      <p className="text-[10px] text-gray-400">{items.length}/{max} elementos</p>
    </div>
  );
}

function SkillBadge({
  skill,
  selected,
  atLimit,
  onToggle,
}: {
  skill: InstitutionalSkill;
  selected: boolean;
  atLimit: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={atLimit && !selected}
      onClick={onToggle}
      className={`flex items-start gap-2 w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
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
          {skill.nivel && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {skill.nivel}
            </span>
          )}
        </div>
        {skill.verbo && (
          <p className="text-xs text-gray-500 mt-0.5">Verbo: {skill.verbo}</p>
        )}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SyllabusCreator() {
  const navigate = useNavigate();
  const { context } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const savingRef = useRef(false);

  // ── Step 1: Curso
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Draft
  const [draftId, setDraftId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowState>({});
  const [saving, setSaving] = useState(false);

  // ── Step 2: Bibliografía
  const [uploadingBiblio, setUploadingBiblio] = useState(false);
  const [uploadedBiblio, setUploadedBiblio] = useState<{ docId: string; fileName: string; refCount: number } | null>(null);
  const [removingBiblio, setRemovingBiblio] = useState(false);
  const [bibliographyReferences, setBibliographyReferences] = useState<string[]>([]);
  const [bibliographySources, setBibliographySources] = useState<string[]>([]);
  const [showAIBiblioModal, setShowAIBiblioModal] = useState(false);
  const [aiBiblioIntent, setAIBiblioIntent] = useState<'manual' | 'skip'>('manual');
  const [aiBiblioQuery, setAIBiblioQuery] = useState('');
  const [searchingAIBiblio, setSearchingAIBiblio] = useState(false);

  // ── Step 3: Propósito
  const [officialPerformances, setOfficialPerformances] = useState<PerformanceDB[]>([]);
  const [loadingPerformances, setLoadingPerformances] = useState(false);
  const [draftPerformances, setDraftPerformances] = useState<SuggestedPerformance[]>([]);
  const [performancesOrigin, setPerformancesOrigin] = useState<PurposeBlock['performances_origin']>('none');
  const [suggestingPerf, setSuggestingPerf] = useState(false);
  const [purposeNotes, setPurposeNotes] = useState('');

  // ── Step 4: Contenido
  const [contentMode, setContentMode] = useState<'idle' | 'proposal' | 'editing' | 'confirmed'>('idle');
  const [habilidadesSugeridas, setHabilidadesSugeridas] = useState<string[]>([]);
  const [habilidadesPorDesempeno, setHabilidadesPorDesempeno] = useState<HabilidadPorDesempeno[]>([]);
  const [allSkills, setAllSkills] = useState<InstitutionalSkill[]>([]);
  const [skillCategories, setSkillCategories] = useState<string[]>([]);
  const [loadingAllSkills, setLoadingAllSkills] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [conocimientos, setConocimientos] = useState<string[]>([]);
  const [actitudes, setActitudes] = useState<string[]>([]);
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [contentNotes, setContentNotes] = useState('');

  // ── Step 5: Método
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [selectedMethodSequence, setSelectedMethodSequence] = useState('');
  const [methodCompatibleIds, setMethodCompatibleIds] = useState<Set<string>>(new Set());
  const [loadingMethodCompat, setLoadingMethodCompat] = useState(false);
  const [suggestingMethod, setSuggestingMethod] = useState(false);
  const [methodNotes, setMethodNotes] = useState('');

  // ── Step 6: Calificación
  const [gradingRows, setGradingRows] = useState<GradingRow[]>([
    { evidencia: 'Tareas', sigla: 'TA', porcentaje: 40, cronograma: 'Permanente' },
    { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 30, cronograma: 'Semana 8' },
    { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 30, cronograma: 'Semana 15' },
  ]);
  const [gradingOrigin, setGradingOrigin] = useState<GradingBlock['template_origin']>('none');
  const [suggestingGrading, setSuggestingGrading] = useState(false);
  const [gradingNotes, setGradingNotes] = useState('');

  // ── Step 7: Confirmar
  const [assembling, setAssembling] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [requiresValidation, setRequiresValidation] = useState(false);
  const [submittingValidation, setSubmittingValidation] = useState(false);
  const [finalSyllabusId, setFinalSyllabusId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Load courses
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!context?.program_id) return;
    setLoadingCourses(true);
    api
      .getCourses(context.program_id)
      .then((res) => setCourses(res.data || []))
      .catch(() => showToast('No se pudieron cargar los cursos', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [context?.program_id]);

  // Load course detail
  useEffect(() => {
    if (!selectedCourseId) { setCourseDetail(null); return; }
    setLoadingDetail(true);
    api
      .getCourse(selectedCourseId)
      .then((res) => setCourseDetail(res.data || null))
      .catch(() => showToast('No se pudo cargar el detalle del curso', 'error'))
      .finally(() => setLoadingDetail(false));
  }, [selectedCourseId]);

  useEffect(() => {
    if (courseDetail?.name && !aiBiblioQuery.trim()) {
      setAIBiblioQuery(courseDetail.name);
    }
  }, [courseDetail?.name]);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: load performances when entering step 3
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 3 || !selectedCourseId) return;
    setLoadingPerformances(true);
    api
      .getCoursePerformances(selectedCourseId)
      .then((res) => {
        const items = res.data?.items || [];
        setOfficialPerformances(items);
        if (items.length > 0 && draftPerformances.length === 0) {
          const mapped: SuggestedPerformance[] = items.map((p) => ({
            code: p.code || '',
            statement: p.statement,
            origin: 'official' as const,
          }));
          setDraftPerformances(mapped);
          setPerformancesOrigin('official');
        }
      })
      .catch(() => showToast('No se pudieron cargar los desempeños', 'error'))
      .finally(() => setLoadingPerformances(false));
  }, [step, selectedCourseId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 4: load all skills (cached)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 4 || contentMode !== 'editing' || allSkills.length > 0) return;
    setLoadingAllSkills(true);
    api
      .getSkills()
      .then((res) => {
        setAllSkills(res.skills || []);
        setSkillCategories(res.categorias || []);
      })
      .catch(() => showToast('No se pudieron cargar las habilidades', 'error'))
      .finally(() => setLoadingAllSkills(false));
  }, [step, contentMode, allSkills.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 5: load method compatibility
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedMethodId) { setMethodCompatibleIds(new Set()); return; }
    setLoadingMethodCompat(true);
    api
      .getMethodSkills(selectedMethodId)
      .then((res) => {
        const data = res.data;
        const ids = new Set<string>([
          ...(data?.recommended_skills ?? []).map((s) => String(s.id)),
          ...(data?.compatible_skills ?? []).map((s) => String(s.id)),
        ]);
        setMethodCompatibleIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoadingMethodCompat(false));
  }, [selectedMethodId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Draft management
  // ─────────────────────────────────────────────────────────────────────────

  const createOrLoadDraft = useCallback(async () => {
    if (!courseDetail || !context) return;
    try {
      const res = await api.createOrGetProgressiveDraft(
        courseDetail.id,
        context.semester,
        context.program_id,
      );
      const draft = res.data;
      if (!draft?.id) return;
      setDraftId(draft.id);
      const payload = draft.payload_json;
      if (payload) {
        setWorkflow(payload._workflow || {});
        // Restore purpose block
        const p = payload.purpose;
        if (p?.performances?.length) {
          setDraftPerformances(p.performances as SuggestedPerformance[]);
          setPerformancesOrigin(p.performances_origin || 'none');
          setPurposeNotes(p.teacher_notes || '');
        }
        // Restore content block
        const c = payload.content;
        if (c) {
          if (c.habilidades_por_desempeno?.length) setHabilidadesPorDesempeno(c.habilidades_por_desempeno as HabilidadPorDesempeno[]);
          if (c.habilidades_sugeridas?.length) setHabilidadesSugeridas(c.habilidades_sugeridas);
          if (c.selected_skill_ids?.length) setSelectedSkillIds(c.selected_skill_ids);
          if (c.knowledge_items?.length) setConocimientos(c.knowledge_items);
          if (c.attitudes?.length) setActitudes(c.attitudes);
          setContentNotes(c.teacher_notes || '');
          const cStatus = payload._workflow?.content?.status;
          if (cStatus === 'approved') setContentMode('confirmed');
          else if (cStatus === 'edited') setContentMode('editing');
          else if (cStatus === 'suggested' && c.habilidades_sugeridas?.length) setContentMode('proposal');
        }
        // Restore method block
        const m = payload.method;
        if (m?.selected_method_id) {
          setSelectedMethodId(String(m.selected_method_id));
          setSelectedMethodName(m.selected_method_name || '');
          setMethodNotes(m.teacher_notes || '');
        }
        // Restore grading block
        const g = payload.grading;
        if (g?.rows?.length) {
          setGradingRows(g.rows as GradingRow[]);
          setGradingOrigin(g.template_origin || 'none');
          setGradingNotes(g.teacher_notes || '');
        }
        // Restore biblio
        const b = payload.bibliography;
        if (Array.isArray(b?.references) && b.references.length > 0) {
          setBibliographyReferences(
            b.references
              .map((ref: unknown) => String(ref || '').trim())
              .filter(Boolean),
          );
        }
        if (Array.isArray(b?.sources_consulted) && b.sources_consulted.length > 0) {
          setBibliographySources(
            b.sources_consulted
              .map((source: unknown) => String(source || '').trim())
              .filter(Boolean),
          );
        }
        if (b?.doc_ids?.length) {
          setUploadedBiblio({
            docId: b.doc_ids[0],
            fileName: 'Bibliografía cargada',
            refCount: b.references?.length || 0,
          });
        }
      }
    } catch {
      showToast('No se pudo inicializar el draft progresivo', 'error');
    }
  }, [courseDetail, context]);

  const saveStep = useCallback(
    async (stepKey: string, blockData: Record<string, unknown>) => {
      if (!draftId || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        await api.saveProgressiveStep(draftId, stepKey, blockData);
        setWorkflow((prev) => ({
          ...prev,
          [stepKey]: { status: 'edited' as StepBlockStatus, dirty: false },
        }));
      } catch {
        // Non-critical — don't show toast to avoid noise
      } finally {
        setSaving(false);
        savingRef.current = false;
      }
    },
    [draftId],
  );

  // Save current step block before navigating
  const saveCurrentStepBlock = useCallback(async () => {
    const stepKey = STEP_KEYS[step];
    if (!stepKey || !draftId) return;

    const blockMap: Record<string, Record<string, unknown>> = {
      bibliography: {
        doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
        references: bibliographyReferences,
        sources_consulted: bibliographySources,
      },
      purpose: {
        performances: draftPerformances,
        performances_origin: performancesOrigin,
        teacher_notes: purposeNotes,
      },
      content: {
        habilidades_por_desempeno: habilidadesPorDesempeno,
        habilidades_sugeridas: habilidadesSugeridas,
        selected_skill_ids: selectedSkillIds,
        knowledge_items: conocimientos,
        attitudes: actitudes,
        source: contentMode === 'confirmed' ? (selectedSkillIds.length > 0 ? 'manual' : 'ai_suggested') : 'none',
        content_mode: contentMode,
        teacher_notes: contentNotes,
      },
      method: {
        selected_method_id: selectedMethodId,
        selected_method_name: selectedMethodName,
        teacher_notes: methodNotes,
      },
      grading: {
        rows: gradingRows,
        template_origin: gradingOrigin,
        total_percent: gradingTotal,
        teacher_notes: gradingNotes,
      },
    };

    const blockData = blockMap[stepKey];
    if (blockData) await saveStep(stepKey, blockData);
  }, [
    step, draftId, uploadedBiblio, bibliographyReferences, bibliographySources, draftPerformances, performancesOrigin, purposeNotes,
    selectedSkillIds, conocimientos, actitudes, contentNotes, selectedMethodId,
    selectedMethodName, methodNotes, gradingRows, gradingOrigin, gradingNotes,
    saveStep,
  ]);

  const goToStep = useCallback(
    async (target: Step) => {
      await saveCurrentStepBlock();
      setStep(target);
    },
    [saveCurrentStepBlock],
  );

  const bibliographySummary = useMemo(() => {
    const parts: string[] = [];
    if (uploadedBiblio) {
      parts.push(`${uploadedBiblio.fileName} - ${uploadedBiblio.refCount} refs NotebookLM`);
    }
    if (bibliographyReferences.length > 0) {
      parts.push(`${bibliographyReferences.length} refs buscadas por IA`);
    }
    return parts.join(' · ') || 'Sin bibliografía cargada';
  }, [uploadedBiblio, bibliographyReferences]);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────────────────

  const gradingTotal = useMemo(
    () => gradingRows.reduce((s, r) => s + (Number(r.porcentaje) || 0), 0),
    [gradingRows],
  );

  const filteredSkills = useMemo((): InstitutionalSkill[] => {
    let skills = allSkills;
    if (skillCategoryFilter) skills = skills.filter((s) => s.categoria === skillCategoryFilter);
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          s.categoria?.toLowerCase().includes(q) ||
          s.verbo?.toLowerCase().includes(q),
      );
    }
    return skills;
  }, [allSkills, skillCategoryFilter, skillSearch]);

  const selectedSkillObjects = useMemo(
    () => allSkills.filter((s) => selectedSkillIds.includes(String(s.id))),
    [allSkills, selectedSkillIds],
  );

  const incompatibleCount = useMemo(
    () =>
      methodCompatibleIds.size > 0
        ? selectedSkillIds.filter((id) => !methodCompatibleIds.has(id)).length
        : 0,
    [selectedSkillIds, methodCompatibleIds],
  );

  const hasValidGrading = gradingTotal === 100 && gradingRows.every(
    (r) => r.evidencia.trim() && r.sigla.trim() && r.cronograma.trim(),
  );

  const requiresAcademicValidation =
    performancesOrigin === 'ai_suggested' || performancesOrigin === 'teacher_edited_from_ai';

  // ─────────────────────────────────────────────────────────────────────────
  // IA Actions
  // ─────────────────────────────────────────────────────────────────────────

  const openAIBibliographyModal = (intent: 'manual' | 'skip') => {
    if (courseDetail?.name && !aiBiblioQuery.trim()) {
      setAIBiblioQuery(courseDetail.name);
    }
    setAIBiblioIntent(intent);
    setShowAIBiblioModal(true);
  };

  const dedupeReferences = (items: string[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const normalized = item.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const handleSearchBibliography = async (continueAfter = false) => {
    if (!draftId || !courseDetail || !context) return;

    const keywords = aiBiblioQuery.trim() || courseDetail.name;
    setSearchingAIBiblio(true);
    try {
      const res = await api.searchBibliography({
        keywords,
        area: context.program_name,
        course_name: courseDetail.name,
      });

      const rawReferences = (res.data?.references || []) as BibliographyReference[];
      const nextRefs = dedupeReferences(
        rawReferences
          .map((item) => item.apa_format?.trim() || '')
          .filter(Boolean),
      );
      const nextSources = (res.data?.sources_consulted || []).filter(Boolean);

      if (nextRefs.length === 0) {
        showToast('La IA no encontró referencias verificables para ese criterio', 'warning');
        return;
      }

      setBibliographyReferences(nextRefs);
      setBibliographySources(nextSources);
      await saveStep('bibliography', {
        doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
        references: nextRefs,
        sources_consulted: nextSources,
      });

      setShowAIBiblioModal(false);
      showToast(`${nextRefs.length} referencias cargadas desde OpenAlex/SciELO/Crossref`, 'success');
      if (continueAfter) {
        setStep(3);
      }
    } catch (err: any) {
      showToast(err?.message || 'Error al buscar bibliografía con IA', 'error');
    } finally {
      setSearchingAIBiblio(false);
    }
  };

  const handleContinueWithoutBibliography = async () => {
    setShowAIBiblioModal(false);
    await saveStep('bibliography', {
      doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
      references: bibliographyReferences,
      sources_consulted: bibliographySources,
    });
    setStep(3);
  };

  const handleSuggestPerformances = async () => {
    if (!draftId) return;
    setSuggestingPerf(true);
    try {
      const res = await api.suggestPerformances(draftId);
      const perfs = res.data?.performances || [];
      if (perfs.length === 0) {
        showToast('La IA no generó desempeños. Inténtalo de nuevo.', 'warning');
        return;
      }
      setDraftPerformances(perfs);
      setPerformancesOrigin('ai_suggested');
      showToast(`${perfs.length} desempeños sugeridos por IA`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al sugerir desempeños', 'error');
    } finally {
      setSuggestingPerf(false);
    }
  };

  const handleSuggestContent = async () => {
    if (!draftId) return;
    await saveStep('purpose', {
      performances: draftPerformances,
      performances_origin: performancesOrigin,
      teacher_notes: purposeNotes,
    });
    setSuggestingContent(true);
    try {
      const res = await api.suggestContent(draftId);
      const s = res.data;
      if (!s) return;
      if (s.habilidades_por_desempeno?.length) setHabilidadesPorDesempeno(s.habilidades_por_desempeno);
      if (s.habilidades_sugeridas?.length) setHabilidadesSugeridas(s.habilidades_sugeridas);
      if (s.conocimientos?.length) setConocimientos(s.conocimientos.slice(0, MAX_CONOCIMIENTOS));
      if (s.actitudes?.length) setActitudes(s.actitudes.slice(0, MAX_ACTITUDES));
      setContentMode('proposal');
      showToast('Propuesta de contenido generada por IA', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al generar propuesta de contenido', 'error');
    } finally {
      setSuggestingContent(false);
    }
  };

  const handleConfirmContent = async () => {
    setContentMode('confirmed');
    await saveStep('content', {
      habilidades_por_desempeno: habilidadesPorDesempeno,
      habilidades_sugeridas: habilidadesSugeridas,
      selected_skill_ids: selectedSkillIds,
      knowledge_items: conocimientos,
      attitudes: actitudes,
      source: 'ai_suggested',
      content_mode: 'confirmed',
      teacher_notes: contentNotes,
    });
    setWorkflow((prev: WorkflowState) => ({ ...prev, content: { status: 'approved' as StepBlockStatus, dirty: false } }));
  };

  const handleSaveContentEdits = async () => {
    setContentMode('confirmed');
    await saveStep('content', {
      habilidades_por_desempeno: habilidadesPorDesempeno,
      habilidades_sugeridas: habilidadesSugeridas,
      selected_skill_ids: selectedSkillIds,
      knowledge_items: conocimientos,
      attitudes: actitudes,
      source: 'manual',
      content_mode: 'confirmed',
      teacher_notes: contentNotes,
    });
    setWorkflow((prev: WorkflowState) => ({ ...prev, content: { status: 'approved' as StepBlockStatus, dirty: false } }));
  };

  const handleSuggestGrading = async () => {
    if (!draftId) return;
    // Save method block so API reads selected method
    await saveStep('method', {
      selected_method_id: selectedMethodId,
      selected_method_name: selectedMethodName,
      teacher_notes: methodNotes,
    });
    setSuggestingGrading(true);
    try {
      const res = await api.suggestGrading(draftId);
      const rows = res.data?.rows || [];
      if (rows.length) {
        setGradingRows(rows as GradingRow[]);
        setGradingOrigin(res.data?.origin ?? 'ai_suggested');
        showToast('Tabla de calificación generada por IA', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error al sugerir calificación', 'error');
    } finally {
      setSuggestingGrading(false);
    }
  };

  const handleAssembleFinal = async () => {
    if (!draftId) return;
    // Save grading first
    await saveStep('grading', {
      rows: gradingRows,
      template_origin: gradingOrigin,
      total_percent: gradingTotal,
      teacher_notes: gradingNotes,
    });
    setAssembling(true);
    try {
      const res = await api.assembleFinal(draftId);
      const data = res.data;
      if (data?.assembled) {
        const finalSyllabus = (data.final_syllabus || null) as SyllabusData | null;
        if (finalSyllabus) {
          setCurrentSyllabus({
            ...finalSyllabus,
            id: draftId,
            _id: draftId,
            status: 'draft',
          });
        }
        setAssembled(true);
        setRequiresValidation(data.requires_academic_validation ?? false);
        setFinalSyllabusId(draftId);
        showToast('Sílabo ensamblado exitosamente', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error al ensamblar el sílabo', 'error');
    } finally {
      setAssembling(false);
    }
  };

  const handleSubmitValidation = async () => {
    if (!draftId) return;
    setSubmittingValidation(true);
    try {
      await api.submitAcademicValidation(draftId);
      const current = sessionStorage.getItem('currentSyllabus');
      if (current) {
        try {
          const parsed = JSON.parse(current) as SyllabusData;
          setCurrentSyllabus({ ...parsed, status: 'review', id: draftId, _id: draftId });
        } catch {
          // noop: if currentSyllabus is malformed, navigation still succeeds
        }
      }
      showToast('Enviado a validación académica', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err?.message || 'Error al enviar a validación', 'error');
    } finally {
      setSubmittingValidation(false);
    }
  };

  const handleBibliographyFile = async (file: File) => {
    if (!context || !courseDetail) return;
    if (uploadedBiblio) {
      showToast('Elimina el archivo actual antes de subir uno nuevo.', 'error');
      return;
    }
    setUploadingBiblio(true);
    try {
      const res = await api.uploadBibliography(
        file, courseDetail.id, context.program_id, courseDetail.scope || 'program',
      );
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

  const updateGradingRow = (index: number, field: keyof GradingRow, value: string) => {
    setGradingRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, [field]: field === 'porcentaje' ? Number(value) || 0 : value }
          : row,
      ),
    );
    setGradingOrigin('manual');
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No hay contexto activo.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

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
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900">Nuevo Sílabo</h1>
              <p className="text-xs text-gray-500">
                {context.program_name} — {context.semester}
              </p>
            </div>
            {saving && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Guardando…
              </div>
            )}
            {draftId && !saving && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                Draft activo
              </span>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <StepIndicator current={step} />

          {/* ──── PASO 1: Curso ──── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Selecciona el curso</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Cursos del programa {context.program_name}
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
                  onClick={async () => {
                    if (!selectedCourseId || loadingDetail) return;
                    await createOrLoadDraft();
                    setStep(2);
                  }}
                  disabled={!selectedCourseId || loadingDetail}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 2: Bibliografía ──── */}
          {step === 2 && courseDetail && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bibliografía</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sube la bibliografía del curso para enriquecer el contexto de IA (opcional).
                  </p>
                </div>
                <StatusBadge status={workflow.bibliography?.status ?? 'empty'} />
              </div>

              <NotebookLMGuide
                courseName={courseDetail.name}
                sumilla={courseDetail.sumilla ?? ''}
                uploading={uploadingBiblio}
                uploadedBiblio={uploadedBiblio}
                onFileSelected={handleBibliographyFile}
                onRemoveBiblio={handleRemoveBibliography}
                removingBiblio={removingBiblio}
              />

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">Fuentes buscadas por IA</h3>
                    <p className="mt-1 text-sm text-blue-800">
                      Usa OpenAlex, SciELO y Crossref para cargar referencias base automáticamente.
                      Es más rápido, pero menos profundo que Deep Research de NotebookLM.
                    </p>
                  </div>
                  {bibliographyReferences.length > 0 && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {bibliographyReferences.length} refs
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openAIBibliographyModal('manual')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Usar fuentes buscadas por IA
                  </button>
                  {bibliographyReferences.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        setBibliographyReferences([]);
                        setBibliographySources([]);
                        await saveStep('bibliography', {
                          doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
                          references: [],
                          sources_consulted: [],
                        });
                        showToast('Referencias buscadas por IA eliminadas', 'success');
                      }}
                      className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Quitar referencias IA
                    </button>
                  )}
                </div>

                {bibliographyReferences.length > 0 && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Referencias cargadas
                    </p>
                    <div className="mt-2 space-y-2">
                      {bibliographyReferences.slice(0, 3).map((ref, index) => (
                        <p key={`${index}-${ref.slice(0, 24)}`} className="text-sm text-gray-700">
                          {index + 1}. {ref}
                        </p>
                      ))}
                    </div>
                    {bibliographyReferences.length > 3 && (
                      <p className="mt-2 text-xs text-gray-500">
                        y {bibliographyReferences.length - 3} referencias más
                      </p>
                    )}
                    {bibliographySources.length > 0 && (
                      <p className="mt-3 text-xs text-gray-500">
                        Fuentes consultadas: {bibliographySources.join(', ')}
                      </p>
                    )}
                  </div>
                )}

              </div>
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
                    onClick={() => openAIBibliographyModal('skip')}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={() => goToStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──── PASO 3: Propósito ──── */}
          {step === 3 && courseDetail && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Propósito del curso</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Base curricular que orienta el contenido, el método y la evaluación.
                  </p>
                </div>
                <StatusBadge status={workflow.purpose?.status ?? 'empty'} />
              </div>

              {/* Curriculum fields — read-only */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {courseDetail.sumilla && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sumilla</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{courseDetail.sumilla}</p>
                  </div>
                )}
                {courseDetail.competencia_egreso && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Competencia de egreso
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{courseDetail.competencia_egreso}</p>
                  </div>
                )}
                {courseDetail.resultado_aprendizaje && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Resultado de aprendizaje
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{courseDetail.resultado_aprendizaje}</p>
                  </div>
                )}
                {courseDetail.capacidad && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Capacidad</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{courseDetail.capacidad}</p>
                  </div>
                )}
                {!courseDetail.sumilla && !courseDetail.competencia_egreso &&
                 !courseDetail.resultado_aprendizaje && !courseDetail.capacidad && (
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-400 italic">
                      Este curso no tiene información curricular registrada. El admin puede agregarla en Currículum.
                    </p>
                  </div>
                )}
              </div>

              {/* Desempeños */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-gray-800">Desempeños</h3>
                    {performancesOrigin !== 'none' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        performancesOrigin === 'official'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {performancesOrigin === 'official' ? 'Oficiales' : 'Sugeridos por IA'}
                      </span>
                    )}
                  </div>
                  {officialPerformances.length === 0 && draftId && (
                    <SuggestButton
                      onClick={handleSuggestPerformances}
                      loading={suggestingPerf}
                      label="Sugerir desempeños"
                    />
                  )}
                </div>

                {loadingPerformances ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando desempeños…
                  </div>
                ) : officialPerformances.length > 0 ? (
                  <div className="space-y-2">
                    {officialPerformances.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-3 bg-white rounded-lg border border-green-200 px-3 py-2.5"
                      >
                        <span className="text-xs font-mono font-bold text-green-600 mt-0.5 shrink-0">
                          {p.code || '—'}
                        </span>
                        <p className="text-sm text-gray-700">{p.statement}</p>
                      </div>
                    ))}
                    <p className="text-xs text-green-700 flex items-center gap-1.5 mt-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {officialPerformances.length} desempeño{officialPerformances.length !== 1 ? 's' : ''} oficial{officialPerformances.length !== 1 ? 'es' : ''} — la IA los usará textualmente.
                    </p>
                  </div>
                ) : draftPerformances.length > 0 ? (
                  <div className="space-y-2">
                    {draftPerformances.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 bg-blue-50 rounded-lg border border-blue-200 px-3 py-2.5"
                      >
                        <span className="text-xs font-mono font-bold text-blue-600 mt-0.5 shrink-0">
                          {p.code || `D${idx + 1}`}
                        </span>
                        <textarea
                          value={p.statement}
                          onChange={(e) =>
                            setDraftPerformances((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, statement: e.target.value, origin: 'teacher_edited_from_ai' } : x,
                              ),
                            )
                          }
                          rows={2}
                          className="flex-1 text-sm text-gray-700 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setDraftPerformances((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {requiresAcademicValidation && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2 text-xs text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Desempeños sugeridos por IA — el sílabo requerirá validación académica antes de publicarse.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span>
                      Este curso no tiene desempeños oficiales. Puedes usar el botón
                      &ldquo;Sugerir desempeños&rdquo; para que la IA los proponga desde la sumilla y competencia.
                    </span>
                  </div>
                )}
              </div>

              {/* Teacher notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Observaciones del docente
                </label>
                <textarea
                  value={purposeNotes}
                  onChange={(e) => setPurposeNotes(e.target.value)}
                  rows={2}
                  placeholder="Comentarios sobre el propósito del curso…"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => goToStep(4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 4: Contenido ──── */}
          {step === 4 && courseDetail && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Contenido</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    El sistema deriva habilidades, conocimientos y actitudes desde el propósito definido.
                  </p>
                </div>
                <StatusBadge status={workflow.content?.status ?? 'empty'} />
              </div>

              {/* ── MODO IDLE: generar propuesta ── */}
              {contentMode === 'idle' && (
                <div className="flex flex-col items-center gap-4 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Target className="w-8 h-8 text-orange-400" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Propuesta de contenido</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      El sistema generará habilidades, conocimientos y actitudes derivadas de los desempeños definidos en el paso anterior.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSuggestContent}
                    disabled={suggestingContent || !draftId}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestingContent
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Generando propuesta…</>
                      : <><Sparkles className="w-4 h-4" />Generar propuesta de contenido</>
                    }
                  </button>
                </div>
              )}

              {/* ── MODO PROPOSAL: ver propuesta, confirmar o modificar ── */}
              {contentMode === 'proposal' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-800">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Propuesta generada por IA a partir de los desempeños del curso. Confirma si estás de acuerdo o modifica según tu criterio.
                  </div>

                  {/* Habilidades por desempeño */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Habilidades <span className="text-gray-400 font-normal normal-case">(derivadas por desempeño)</span>
                    </h3>
                    {habilidadesPorDesempeno.length === 0 && habilidadesSugeridas.length === 0 ? (
                      <span className="text-xs text-gray-400">No se generaron habilidades.</span>
                    ) : habilidadesPorDesempeno.length > 0 ? (
                      <div className="space-y-2">
                        {habilidadesPorDesempeno.map((grupo) => (
                          <div key={grupo.desempeno_code} className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              {grupo.desempeno_code}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {grupo.habilidades.map((h, i) => (
                                <span key={i} className="inline-block px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {habilidadesSugeridas.map((h, i) => (
                          <span key={i} className="inline-block px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conocimientos propuestos */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conocimientos</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {conocimientos.length === 0
                        ? <span className="text-xs text-gray-400">No se generaron conocimientos.</span>
                        : conocimientos.map((k, i) => (
                          <span key={i} className="inline-block px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                            {k}
                          </span>
                        ))
                      }
                    </div>
                  </div>

                  {/* Actitudes propuestas */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actitudes</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {actitudes.length === 0
                        ? <span className="text-xs text-gray-400">No se generaron actitudes.</span>
                        : actitudes.map((a, i) => (
                          <span key={i} className="inline-block px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                            {a}
                          </span>
                        ))
                      }
                    </div>
                  </div>

                  {/* Confirmar / Modificar */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmContent}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar propuesta
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentMode('editing')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-sm"
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      onClick={handleSuggestContent}
                      disabled={suggestingContent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    >
                      {suggestingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Regenerar
                    </button>
                  </div>
                </div>
              )}

              {/* ── MODO EDITING: editar habilidades desde catálogo + chips ── */}
              {contentMode === 'editing' && (
                <div className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Modo edición. Selecciona habilidades del catálogo y ajusta conocimientos y actitudes.
                  </div>

                  {/* Selector de habilidades del catálogo */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700">
                      Habilidades <span className="text-gray-400 font-normal">(catálogo institucional)</span>
                    </h3>
                    {loadingAllSkills ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />Cargando catálogo…
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={skillSearch}
                            onChange={(e) => setSkillSearch(e.target.value)}
                            placeholder="Buscar por nombre, categoría o verbo…"
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <select
                            value={skillCategoryFilter}
                            onChange={(e) => setSkillCategoryFilter(e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            <option value="">Todas</option>
                            {skillCategories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {filteredSkills.length === 0
                            ? <p className="text-sm text-gray-400 text-center py-4">No se encontraron habilidades.</p>
                            : filteredSkills.map((s) => (
                              <div key={String(s.id)}>
                                <SkillBadge
                                  skill={s}
                                  selected={selectedSkillIds.includes(String(s.id))}
                                  atLimit={selectedSkillIds.length >= MAX_SKILLS}
                                  onToggle={() => toggleSkill(String(s.id))}
                                />
                              </div>
                            ))
                          }
                        </div>
                        <p className="text-xs text-gray-500">{selectedSkillIds.length}/{MAX_SKILLS} habilidades seleccionadas</p>
                      </>
                    )}
                  </div>

                  {/* Conocimientos */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700">Conocimientos <span className="text-gray-400 font-normal">(temas conceptuales)</span></h3>
                    <ChipInput items={conocimientos} onChange={setConocimientos} placeholder="Agregar conocimiento y Enter…" max={MAX_CONOCIMIENTOS} />
                  </div>

                  {/* Actitudes */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700">Actitudes <span className="text-gray-400 font-normal">(disposiciones valorativas)</span></h3>
                    <ChipInput items={actitudes} onChange={setActitudes} placeholder="Agregar actitud y Enter…" max={MAX_ACTITUDES} />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas del docente</label>
                    <textarea
                      value={contentNotes}
                      onChange={(e) => setContentNotes(e.target.value)}
                      rows={2}
                      placeholder="Observaciones sobre el contenido…"
                      className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveContentEdits}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Guardar cambios
                  </button>
                </div>
              )}

              {/* ── MODO CONFIRMED: resumen confirmado ── */}
              {contentMode === 'confirmed' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-green-800">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Contenido confirmado. Puedes editarlo antes de continuar.
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Habilidades</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedSkillIds.length > 0 ? selectedSkillObjects.map((s) => s.nombre) : habilidadesSugeridas).map((h, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">{h}</span>
                        ))}
                        {selectedSkillIds.length === 0 && habilidadesSugeridas.length === 0 && <span className="text-xs text-gray-400">Sin habilidades</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Conocimientos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {conocimientos.length === 0
                          ? <span className="text-xs text-gray-400">Sin conocimientos</span>
                          : conocimientos.map((k, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">{k}</span>)
                        }
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Actitudes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {actitudes.length === 0
                          ? <span className="text-xs text-gray-400">Sin actitudes</span>
                          : actitudes.map((a, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">{a}</span>)
                        }
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContentMode('editing')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Editar contenido
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => goToStep(5)}
                  disabled={contentMode === 'idle'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 5: Método ──── */}
          {step === 5 && courseDetail && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Método pedagógico</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Selecciona el método que operativiza el propósito y el contenido definidos.
                  </p>
                </div>
                <StatusBadge status={workflow.method?.status ?? 'empty'} />
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

              {/* Compatibility panel */}
              {selectedSkillIds.length > 0 && selectedMethodId && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Compatibilidad habilidades ↔ método
                    </p>
                    {loadingMethodCompat && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                  </div>
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {selectedSkillObjects.map((s) => {
                      const id = String(s.id);
                      const compatible = methodCompatibleIds.size === 0 || methodCompatibleIds.has(id);
                      return (
                        <div key={id} className="flex items-center gap-2 px-4 py-2 text-sm">
                          <span className={`shrink-0 text-xs font-bold ${compatible ? 'text-green-600' : 'text-amber-600'}`}>
                            {compatible ? '✓' : '⚠'}
                          </span>
                          <span className="flex-1 text-gray-700 text-xs truncate">{s.nombre}</span>
                          {!compatible && (
                            <span className="text-[10px] text-amber-500 shrink-0">No recomendada</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {incompatibleCount > 0 && (
                    <div className="px-4 py-2.5 border-t border-amber-100 bg-amber-50 flex items-center gap-2 text-xs text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {incompatibleCount} habilidad{incompatibleCount > 1 ? 'es' : ''} no recomendada
                        {incompatibleCount > 1 ? 's' : ''} para <strong>{selectedMethodName}</strong>. Puedes continuar o ajustar.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Notas del docente
                </label>
                <textarea
                  value={methodNotes}
                  onChange={(e) => setMethodNotes(e.target.value)}
                  rows={2}
                  placeholder="Justificación de la elección metodológica…"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => goToStep(6)}
                  disabled={!selectedMethodId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 6: Calificación ──── */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Sistema de calificación</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Tabla de evaluación compatible con el método seleccionado.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={workflow.grading?.status ?? 'empty'} />
                  {draftId && selectedMethodId && (
                    <SuggestButton
                      onClick={handleSuggestGrading}
                      loading={suggestingGrading}
                      label="Generar tabla"
                    />
                  )}
                </div>
              </div>

              {gradingOrigin !== 'none' && (
                <p className="text-xs text-gray-500">
                  Origen:{' '}
                  <span className="font-semibold">
                    {gradingOrigin === 'method_template' ? 'Plantilla del método' :
                     gradingOrigin === 'ai_suggested' ? 'Sugerido por IA' : 'Manual'}
                  </span>
                </p>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Evidencia</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-16">Sigla</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-20">%</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Cronograma</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradingRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.evidencia}
                            onChange={(e) => updateGradingRow(idx, 'evidencia', e.target.value)}
                            className="w-full text-sm border-0 p-0 focus:outline-none focus:ring-0 bg-transparent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.sigla}
                            onChange={(e) => updateGradingRow(idx, 'sigla', e.target.value)}
                            className="w-full text-sm border-0 p-0 focus:outline-none focus:ring-0 bg-transparent uppercase"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.porcentaje}
                            min={0}
                            max={100}
                            onChange={(e) => updateGradingRow(idx, 'porcentaje', e.target.value)}
                            className="w-full text-sm border-0 p-0 focus:outline-none focus:ring-0 bg-transparent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.cronograma}
                            onChange={(e) => updateGradingRow(idx, 'cronograma', e.target.value)}
                            className="w-full text-sm border-0 p-0 focus:outline-none focus:ring-0 bg-transparent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setGradingRows((r) => r.filter((_, i) => i !== idx));
                              setGradingOrigin('manual');
                            }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-gray-600">Total</td>
                      <td className={`px-3 py-2 text-sm font-bold ${gradingTotal === 100 ? 'text-green-600' : 'text-red-500'}`}>
                        {gradingTotal}%
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGradingRows((r) => [
                    ...r,
                    { evidencia: '', sigla: '', porcentaje: 0, cronograma: '' },
                  ]);
                  setGradingOrigin('manual');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <Plus className="w-4 h-4" />
                Agregar fila
              </button>

              {gradingTotal !== 100 && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  La suma debe ser exactamente 100% (actualmente {gradingTotal}%)
                </div>
              )}

              {/* Teacher notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Notas del docente
                </label>
                <textarea
                  value={gradingNotes}
                  onChange={(e) => setGradingNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones sobre el sistema de evaluación…"
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
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
                  onClick={() => goToStep(7)}
                  disabled={!hasValidGrading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ──── PASO 7: Confirmar ──── */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Confirmar y ensamblar</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Revisa el resumen por bloques antes de generar el sílabo final.
                </p>
              </div>

              {/* Summary cards */}
              <div className="space-y-3">
                {(
                  [
                    {
                      label: 'Bibliografía',
                      key: 'bibliography',
                      summary: uploadedBiblio
                        ? `${uploadedBiblio.fileName} — ${uploadedBiblio.refCount} refs`
                        : 'Sin bibliografía cargada',
                      step: 2 as Step,
                    },
                    {
                      label: 'Propósito',
                      key: 'purpose',
                      summary: draftPerformances.length > 0
                        ? `${draftPerformances.length} desempeños (${performancesOrigin === 'official' ? 'oficiales' : 'sugeridos por IA'})`
                        : 'Sin desempeños definidos',
                      step: 3 as Step,
                    },
                    {
                      label: 'Contenido',
                      key: 'content',
                      summary: [
                        selectedSkillIds.length > 0 ? `${selectedSkillIds.length} habilidades` : '',
                        conocimientos.length > 0 ? `${conocimientos.length} conocimientos` : '',
                        actitudes.length > 0 ? `${actitudes.length} actitudes` : '',
                      ].filter(Boolean).join(' · ') || 'Sin contenido definido',
                      step: 4 as Step,
                    },
                    {
                      label: 'Método',
                      key: 'method',
                      summary: selectedMethodName || 'Sin método seleccionado',
                      step: 5 as Step,
                    },
                    {
                      label: 'Calificación',
                      key: 'grading',
                      summary: `${gradingRows.length} evidencias — total ${gradingTotal}%`,
                      step: 6 as Step,
                    },
                  ] as Array<{ label: string; key: string; summary: string; step: Step }>
                ).map(({ label, key, summary, step: s }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={workflow[key]?.status ?? 'empty'} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">
                          {key === 'bibliography' ? bibliographySummary : summary}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(s)}
                      className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>

              {requiresAcademicValidation && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Este sílabo usa desempeños sugeridos por IA. Requerirá{' '}
                    <strong>validación académica</strong> antes de publicarse. Puedes ensamblarlo ahora
                    y enviarlo a revisión.
                  </span>
                </div>
              )}

              {assembled ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Sílabo ensamblado exitosamente.</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => finalSyllabusId && navigate(`/editor?id=${finalSyllabusId}`)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Abrir en editor
                    </button>
                    {requiresAcademicValidation ? (
                      <button
                        onClick={handleSubmitValidation}
                        disabled={submittingValidation}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-semibold rounded-lg text-sm"
                      >
                        {submittingValidation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Enviar a validación académica
                      </button>
                    ) : null}
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg text-sm"
                    >
                      Volver al dashboard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setStep(6)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                  </button>
                  <button
                    onClick={handleAssembleFinal}
                    disabled={assembling || !selectedMethodId || !hasValidGrading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm"
                  >
                    {assembling ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Ensamblando…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />Ensamblar sílabo</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showAIBiblioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {aiBiblioIntent === 'skip' ? 'Antes de omitir la bibliografía' : 'Fuentes buscadas por IA'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  El sistema puede buscar referencias base en OpenAlex, SciELO y Crossref.
                  Son útiles para avanzar rápido, pero suelen ser menos finas que Deep Research de NotebookLM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAIBiblioModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Recomendación: usa NotebookLM cuando quieras máxima calidad y contexto profundo.
                Usa esta opción cuando necesites una base bibliográfica rápida para no frenar el armado del sílabo.
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Término de búsqueda
                </label>
                <input
                  type="text"
                  value={aiBiblioQuery}
                  onChange={(e) => setAIBiblioQuery(e.target.value)}
                  placeholder={courseDetail?.name || 'Nombre del curso'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-orange-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Sugerencia: usa el nombre del curso o un tema central de la sumilla.
                </p>
              </div>

              {bibliographyReferences.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Referencias actualmente cargadas
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {bibliographySummary}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAIBiblioModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <div className="flex flex-wrap gap-3">
                {aiBiblioIntent === 'skip' && (
                  <button
                    type="button"
                    onClick={handleContinueWithoutBibliography}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Continuar sin bibliografía
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSearchBibliography(aiBiblioIntent === 'skip')}
                  disabled={searchingAIBiblio}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {searchingAIBiblio ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {aiBiblioIntent === 'skip' ? 'Buscar y continuar' : 'Buscar y cargar fuentes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
