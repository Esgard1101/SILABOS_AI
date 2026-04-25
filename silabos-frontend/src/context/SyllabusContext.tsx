import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  CourseDetail,
  GradingRow,
  HabilidadPorDesempeno,
  SuggestedPerformance,
  WorkflowState,
} from '../api/types';
import { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';

// ─── Local types ──────────────────────────────────────────────────────────────

export type ContentMode = 'idle' | 'proposal' | 'editing' | 'confirmed';
export type PerfsOrigin = 'none' | 'official' | 'ai_suggested' | 'teacher_edited_from_ai';
export type GradingOrigin = 'none' | 'method_template' | 'ai_suggested' | 'manual';

export interface UploadedBiblio {
  docId: string;
  fileName: string;
  refCount: number;
}

// ─── Context interface ────────────────────────────────────────────────────────

interface SyllabusCtxValue {
  draftId: string | null;
  courseDetail: CourseDetail | null;
  workflow: WorkflowState;
  saving: boolean;
  setCourseDetail: (d: CourseDetail | null) => void;
  createOrLoadDraft: () => Promise<void>;
  saveStep: (key: string, data: Record<string, unknown>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  toasts: ReturnType<typeof useToast>['toasts'];
  removeToast: (id: string) => void;
  // Bibliography
  uploadedBiblio: UploadedBiblio | null;
  setUploadedBiblio: React.Dispatch<React.SetStateAction<UploadedBiblio | null>>;
  bibliographyReferences: string[];
  setBibliographyReferences: React.Dispatch<React.SetStateAction<string[]>>;
  bibliographySources: string[];
  setBibliographySources: React.Dispatch<React.SetStateAction<string[]>>;
  // Performances
  draftPerformances: SuggestedPerformance[];
  setDraftPerformances: React.Dispatch<React.SetStateAction<SuggestedPerformance[]>>;
  performancesOrigin: PerfsOrigin;
  setPerformancesOrigin: React.Dispatch<React.SetStateAction<PerfsOrigin>>;
  purposeNotes: string;
  setPurposeNotes: React.Dispatch<React.SetStateAction<string>>;
  // Content
  contentMode: ContentMode;
  setContentMode: React.Dispatch<React.SetStateAction<ContentMode>>;
  habilidadesSugeridas: string[];
  setHabilidadesSugeridas: React.Dispatch<React.SetStateAction<string[]>>;
  habilidadesPorDesempeno: HabilidadPorDesempeno[];
  setHabilidadesPorDesempeno: React.Dispatch<React.SetStateAction<HabilidadPorDesempeno[]>>;
  selectedSkillIds: string[];
  setSelectedSkillIds: React.Dispatch<React.SetStateAction<string[]>>;
  conocimientos: string[];
  setConocimientos: React.Dispatch<React.SetStateAction<string[]>>;
  actitudes: string[];
  setActitudes: React.Dispatch<React.SetStateAction<string[]>>;
  contentNotes: string;
  setContentNotes: React.Dispatch<React.SetStateAction<string>>;
  // Method
  selectedMethodId: string | null;
  setSelectedMethodId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedMethodName: string;
  setSelectedMethodName: React.Dispatch<React.SetStateAction<string>>;
  selectedMethodSequence: string;
  setSelectedMethodSequence: React.Dispatch<React.SetStateAction<string>>;
  methodNotes: string;
  setMethodNotes: React.Dispatch<React.SetStateAction<string>>;
  // Grading
  gradingRows: GradingRow[];
  setGradingRows: React.Dispatch<React.SetStateAction<GradingRow[]>>;
  gradingOrigin: GradingOrigin;
  setGradingOrigin: React.Dispatch<React.SetStateAction<GradingOrigin>>;
  gradingNotes: string;
  setGradingNotes: React.Dispatch<React.SetStateAction<string>>;
  // Cierre
  assembled: boolean;
  setAssembled: React.Dispatch<React.SetStateAction<boolean>>;
  finalSyllabusId: string | null;
  setFinalSyllabusId: React.Dispatch<React.SetStateAction<string | null>>;
  requiresValidation: boolean;
  setRequiresValidation: React.Dispatch<React.SetStateAction<boolean>>;
}

const SyllabusCtx = createContext<SyllabusCtxValue | null>(null);

const DRAFT_KEY = 'sigesil_draft_id';

export function useSyllabus(): SyllabusCtxValue {
  const ctx = useContext(SyllabusCtx);
  if (!ctx) throw new Error('useSyllabus must be used inside SyllabusProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SyllabusProvider({ children }: { children: React.ReactNode }) {
  const { context } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();
  const savingRef = useRef(false);

  const [draftId, setDraftId] = useState<string | null>(() => sessionStorage.getItem(DRAFT_KEY));
  const [courseDetail, _setCourseDetail] = useState<CourseDetail | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowState>({});
  const [saving, setSaving] = useState(false);

  const [uploadedBiblio, setUploadedBiblio] = useState<UploadedBiblio | null>(null);
  const [bibliographyReferences, setBibliographyReferences] = useState<string[]>([]);
  const [bibliographySources, setBibliographySources] = useState<string[]>([]);

  const [draftPerformances, setDraftPerformances] = useState<SuggestedPerformance[]>([]);
  const [performancesOrigin, setPerformancesOrigin] = useState<PerfsOrigin>('none');
  const [purposeNotes, setPurposeNotes] = useState('');

  const [contentMode, setContentMode] = useState<ContentMode>('idle');
  const [habilidadesSugeridas, setHabilidadesSugeridas] = useState<string[]>([]);
  const [habilidadesPorDesempeno, setHabilidadesPorDesempeno] = useState<HabilidadPorDesempeno[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [conocimientos, setConocimientos] = useState<string[]>([]);
  const [actitudes, setActitudes] = useState<string[]>([]);
  const [contentNotes, setContentNotes] = useState('');

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [selectedMethodSequence, setSelectedMethodSequence] = useState('');
  const [methodNotes, setMethodNotes] = useState('');

  const [gradingRows, setGradingRows] = useState<GradingRow[]>([
    { evidencia: 'Tareas', sigla: 'TA', porcentaje: 40, cronograma: 'Permanente' },
    { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 30, cronograma: 'Semana 8' },
    { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 30, cronograma: 'Semana 15' },
  ]);
  const [gradingOrigin, setGradingOrigin] = useState<GradingOrigin>('none');
  const [gradingNotes, setGradingNotes] = useState('');

  const [assembled, setAssembled] = useState(false);
  const [finalSyllabusId, setFinalSyllabusId] = useState<string | null>(null);
  const [requiresValidation, setRequiresValidation] = useState(false);

  const setCourseDetail = useCallback((d: CourseDetail | null) => {
    _setCourseDetail(d);
  }, []);

  const saveStep = useCallback(
    async (key: string, data: Record<string, unknown>) => {
      if (!draftId || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        await api.saveProgressiveStep(draftId, key, data);
        setWorkflow((prev) => ({
          ...prev,
          [key]: { status: 'edited' as const, dirty: false },
        }));
      } catch {
        // non-critical
      } finally {
        setSaving(false);
        savingRef.current = false;
      }
    },
    [draftId],
  );

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
      sessionStorage.setItem(DRAFT_KEY, draft.id);

      const pl = draft.payload_json;
      if (!pl) return;

      setWorkflow(pl._workflow || {});

      const p = pl.purpose;
      if (p?.performances?.length) {
        setDraftPerformances(p.performances as SuggestedPerformance[]);
        setPerformancesOrigin((p.performances_origin as PerfsOrigin) || 'none');
        setPurposeNotes(p.teacher_notes || '');
      }

      const c = pl.content;
      if (c) {
        if (c.habilidades_por_desempeno?.length) setHabilidadesPorDesempeno(c.habilidades_por_desempeno as HabilidadPorDesempeno[]);
        if (c.habilidades_sugeridas?.length) setHabilidadesSugeridas(c.habilidades_sugeridas as string[]);
        if (c.selected_skill_ids?.length) setSelectedSkillIds(c.selected_skill_ids as string[]);
        if (c.knowledge_items?.length) setConocimientos(c.knowledge_items as string[]);
        if (c.attitudes?.length) setActitudes(c.attitudes as string[]);
        setContentNotes((c.teacher_notes as string) || '');
        const cStatus = pl._workflow?.content?.status;
        const storedMode = c.content_mode as ContentMode | undefined;
        const hasAi = Boolean(c.habilidades_por_desempeno?.length) || Boolean(c.habilidades_sugeridas?.length) || Boolean(c.knowledge_items?.length);
        if (cStatus === 'approved' || storedMode === 'confirmed') setContentMode('confirmed');
        else if (storedMode === 'proposal' || hasAi) setContentMode('proposal');
        else if (storedMode === 'editing' && Boolean(c.selected_skill_ids?.length)) setContentMode('editing');
        else setContentMode('idle');
      }

      const m = pl.method;
      if (m?.selected_method_id) {
        setSelectedMethodId(String(m.selected_method_id));
        setSelectedMethodName((m.selected_method_name as string) || '');
        setMethodNotes((m.teacher_notes as string) || '');
      }

      const g = pl.grading;
      if (g?.rows?.length) {
        setGradingRows(g.rows as GradingRow[]);
        setGradingOrigin((g.template_origin as GradingOrigin) || 'none');
        setGradingNotes((g.teacher_notes as string) || '');
      }

      const b = pl.bibliography;
      if (Array.isArray(b?.references) && b.references.length > 0) {
        setBibliographyReferences((b.references as unknown[]).map((r) => String(r || '').trim()).filter(Boolean));
      }
      if (Array.isArray(b?.sources_consulted) && b.sources_consulted.length > 0) {
        setBibliographySources((b.sources_consulted as unknown[]).map((s) => String(s || '').trim()).filter(Boolean));
      }
      if (b?.doc_ids?.length) {
        setUploadedBiblio({
          docId: (b.doc_ids as string[])[0],
          fileName: 'Bibliografía cargada',
          refCount: (b.references as unknown[] | undefined)?.length || 0,
        });
      }
    } catch {
      showToast('No se pudo inicializar el draft', 'error');
    }
  }, [courseDetail, context, showToast]);

  const value: SyllabusCtxValue = {
    draftId, courseDetail, workflow, saving,
    setCourseDetail, createOrLoadDraft, saveStep,
    showToast, toasts, removeToast,
    uploadedBiblio, setUploadedBiblio,
    bibliographyReferences, setBibliographyReferences,
    bibliographySources, setBibliographySources,
    draftPerformances, setDraftPerformances,
    performancesOrigin, setPerformancesOrigin,
    purposeNotes, setPurposeNotes,
    contentMode, setContentMode,
    habilidadesSugeridas, setHabilidadesSugeridas,
    habilidadesPorDesempeno, setHabilidadesPorDesempeno,
    selectedSkillIds, setSelectedSkillIds,
    conocimientos, setConocimientos,
    actitudes, setActitudes,
    contentNotes, setContentNotes,
    selectedMethodId, setSelectedMethodId,
    selectedMethodName, setSelectedMethodName,
    selectedMethodSequence, setSelectedMethodSequence,
    methodNotes, setMethodNotes,
    gradingRows, setGradingRows,
    gradingOrigin, setGradingOrigin,
    gradingNotes, setGradingNotes,
    assembled, setAssembled,
    finalSyllabusId, setFinalSyllabusId,
    requiresValidation, setRequiresValidation,
  };

  return <SyllabusCtx.Provider value={value}>{children}</SyllabusCtx.Provider>;
}
