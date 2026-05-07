import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Lock,
  Pencil,
  RotateCcw,
  Sparkles,
  Unlock,
  X,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type {
  KnowledgeMap,
  KnowledgeMapAudit,
  KnowledgeMapWeek,
  ProgressiveCurriculumState,
  SuggestedPerformance,
} from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

const TOTAL_WEEKS = 16;
const MIN_NOTEBOOK_CHARS = 80;
const NOTEBOOK_ICON = '/ICONEMPEZARNOTEBOOKLM.png';
const NOTEBOOK_VIDEO_PLACEHOLDER = '/images/notebooklm_steps/metodopdfantiguo/step3.png';

type Screen = 'context' | 'map';
type RepromptScope = 'unlocked' | 'manual';

function performanceText(item?: SuggestedPerformance | string | null) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.statement || item.label || item.code || '';
}

function unitForWeek(week: number, totalUnits: number) {
  const units = Math.max(1, Math.floor(totalUnits || 1));
  const base = Math.floor(TOTAL_WEEKS / units);
  const remainder = TOTAL_WEEKS % units;
  let cursor = 1;
  for (let unit = 1; unit <= units; unit += 1) {
    const size = base + (unit <= remainder ? 1 : 0);
    const end = unit === units ? TOTAL_WEEKS : cursor + size - 1;
    if (week >= cursor && week <= end) return unit;
    cursor = end + 1;
  }
  return units;
}

function buildKnowledgeMapPrompt(
  courseName: string,
  performances: SuggestedPerformance[],
  totalUnits: number,
  productTitle: string,
  workObject: string,
  officialKnowledge: string[],
) {
  const performancesText = performances
    .map((item, index) => `- Unidad ${index + 1}: ${performanceText(item)}`)
    .join('\n');
  const officialKnowledgeText = (officialKnowledge || [])
    .map((item) => `- ${item}`)
    .join('\n');
  return `Necesito un MAPA SEMANAL DE CONOCIMIENTOS de 16 semanas para pegarlo en SIGEISIL.

CURSO: ${courseName || '[nombre del curso]'}
TOTAL DE UNIDADES: ${totalUnits}
PRODUCTO ACREDITABLE: ${productTitle || 'Pendiente'}
OBJETO DE TRABAJO: ${workObject || 'Pendiente'}

DESEMPENOS OFICIALES POR UNIDAD:
${performancesText || '- Pendiente'}

CONOCIMIENTOS OFICIALES DEL CURSO (extraidos de la sumilla, OBLIGATORIOS):
${officialKnowledgeText || '- (no hay conocimientos oficiales disponibles, infierelos del consolidado)'}

REGLAS DE USO DE CONOCIMIENTOS OFICIALES:
- Estos conocimientos vienen de la base de datos institucional y son la materia prima del curso.
- Distribuyelos a lo largo de las 16 semanas, no los descartes.
- Si son menos de 16, complementa con subtemas derivados (no inventes temas ajenos a la sumilla).
- Si son mas de 16, agrupalos por afinidad disciplinar para que entren en 16 semanas.
- No reformules el conocimiento oficial al punto de cambiar su sentido.

Usa exclusivamente las fuentes cargadas en este cuaderno de NotebookLM. No redactes el silabo final ni actividades semanales. Entrega solo el mapa de conocimientos curriculares.

Estructura obligatoria por semana (1..16):
- SEMANA N
- CONOCIMIENTO PRINCIPAL: tema disciplinar concreto, secuencial, complejidad creciente.
- SUBTEMAS: 2 a 5 puntos cortos asociados al conocimiento principal.
- ENFASIS: una frase de aplicacion docente especifica.
- FUENTE: cita corta del consolidado o vacio.

Reglas:
- 16 semanas exactas, una por una, ordenadas.
- Prohibido repetir el mismo conocimiento en semanas distintas.
- Logica disciplinar manda; el producto orienta aplicacion pero no domina temas.
- Tono universitario, concreto, no escolar.
- No propongas actividades, evidencias ni rubricas.
- No incluyas citas tipo [1] o [2].

Devuelve texto ordenado y facil de copiar para pegarlo en SIGEISIL.`;
}

function ensureFullMap(map: KnowledgeMapWeek[]): KnowledgeMapWeek[] {
  const byWeek = new Map<number, KnowledgeMapWeek>();
  for (const item of map || []) {
    if (item && Number.isFinite(item.week)) byWeek.set(Number(item.week), item);
  }
  const result: KnowledgeMapWeek[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week += 1) {
    const found = byWeek.get(week);
    if (found) {
      result.push({
        ...found,
        subtopics: Array.isArray(found.subtopics) ? found.subtopics : [],
        warnings: Array.isArray(found.warnings) ? found.warnings : [],
      });
    } else {
      result.push({
        week,
        unit_number: 0,
        knowledge: '',
        subtopics: [],
        emphasis: '',
        source_notes: '',
        locked: false,
        warnings: [],
      });
    }
  }
  return result;
}

function BlockingLoader({ title, message }: { title: string; message: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#061224]/85 px-4 text-white backdrop-blur-md">
      <div className="w-full max-w-sm border border-[#00B4D8]/35 bg-[#0B192C] p-6 text-center shadow-2xl shadow-cyan-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#00B4D8]/35 bg-[#00B4D8]/10">
          <Loader2 size={26} className="animate-spin text-[#6FE9F5]" />
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">{title}</p>
        <p className="mt-2 text-[12px] leading-5 text-white/68">{message}</p>
        <div className="mt-5 h-1 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-gradient-to-r from-[#00B4D8] via-[#6FE9F5] to-[#D4AF37]" />
        </div>
      </div>
    </div>
  );
}

function PromptModal({ prompt, onClose }: { prompt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col border border-[#00B4D8]/35 bg-[#0B192C] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">NotebookLM</p>
            <h2 className="mt-1 text-base font-bold text-white">Vista previa del prompt</h2>
            <p className="mt-1 text-[11px] text-white/55">
              Pegalo en NotebookLM con tus fuentes y trae el consolidado curricular.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/48 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <pre className="whitespace-pre-wrap border border-white/10 bg-[#162A45] p-4 font-jetbrains text-[11px] leading-5 text-white/82">
            {prompt}
          </pre>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col border border-[#00B4D8]/35 bg-[#0B192C] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">NotebookLM</p>
            <h2 className="mt-1 text-base font-bold text-white">Guia rapida para traer el consolidado</h2>
            <p className="mt-1 text-[11px] text-white/55">
              Por ahora se muestra una imagen placeholder. Sera reemplazada por el video definitivo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/48 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <img
            src={NOTEBOOK_VIDEO_PLACEHOLDER}
            alt="Guia visual NotebookLM"
            className="aspect-video w-full border border-white/10 bg-black object-cover"
          />
        </div>
      </div>
    </div>
  );
}

type WeekCardProps = {
  entry: KnowledgeMapWeek;
  totalUnits: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (patch: Partial<KnowledgeMapWeek>) => void | Promise<void>;
  onToggleLock: () => void | Promise<void>;
  busy: boolean;
  confirmed: boolean;
};

const WeekCard: React.FC<WeekCardProps> = (props) => {
  const {
    entry,
    totalUnits,
    isEditing,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onToggleLock,
    busy,
    confirmed,
  } = props;
  const [knowledgeDraft, setKnowledgeDraft] = useState(entry.knowledge || '');
  const [subtopicsDraft, setSubtopicsDraft] = useState((entry.subtopics || []).join('\n'));
  const [emphasisDraft, setEmphasisDraft] = useState(entry.emphasis || '');

  useEffect(() => {
    if (isEditing) {
      setKnowledgeDraft(entry.knowledge || '');
      setSubtopicsDraft((entry.subtopics || []).join('\n'));
      setEmphasisDraft(entry.emphasis || '');
    }
  }, [isEditing, entry]);

  const warning = entry.warnings && entry.warnings[0];
  const empty = !entry.knowledge?.trim();
  const unitNumber = entry.unit_number || unitForWeek(entry.week, totalUnits);

  const borderClass = empty
    ? 'border-rose-400/60'
    : warning
      ? 'border-amber-400/60'
      : entry.locked
        ? 'border-[#00B4D8]/55'
        : 'border-white/10';

  return (
    <div
      className={`relative flex w-[230px] shrink-0 flex-col border bg-[#0B192C] px-3 py-3 transition ${borderClass}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="font-jetbrains text-[10px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">
            Sem {entry.week}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-white/38">Unidad {unitNumber}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={entry.locked ? 'Desbloquear' : 'Bloquear (no se reescribira)'}
            onClick={onToggleLock}
            disabled={busy || confirmed}
            className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#162A45] text-white/55 transition hover:border-[#00B4D8]/55 hover:text-[#72E7F6] disabled:opacity-40"
          >
            {entry.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          <button
            type="button"
            title="Editar tema"
            onClick={onStartEdit}
            disabled={busy || confirmed}
            className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#162A45] text-white/55 transition hover:border-[#E9B44C]/55 hover:text-[#F2C260] disabled:opacity-40"
          >
            <Pencil size={11} />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={knowledgeDraft}
            onChange={(event) => setKnowledgeDraft(event.target.value)}
            rows={3}
            className="w-full resize-none border border-[#00B4D8]/40 bg-[#162A45] px-2 py-1.5 text-[11px] leading-4 text-white outline-none focus:border-[#00B4D8]"
            placeholder="Conocimiento principal"
          />
          <textarea
            value={subtopicsDraft}
            onChange={(event) => setSubtopicsDraft(event.target.value)}
            rows={3}
            className="w-full resize-none border border-white/10 bg-[#162A45] px-2 py-1.5 text-[10px] leading-4 text-white/86 outline-none focus:border-[#00B4D8]/50"
            placeholder="Un subtema por linea"
          />
          <input
            value={emphasisDraft}
            onChange={(event) => setEmphasisDraft(event.target.value)}
            className="w-full border border-white/10 bg-[#162A45] px-2 py-1.5 text-[10px] text-white/82 outline-none focus:border-[#00B4D8]/50"
            placeholder="Enfasis docente"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={busy}
              className="border border-white/10 px-2 py-1 text-[10px] font-bold text-white/55 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || !knowledgeDraft.trim()}
              onClick={() => {
                onSaveEdit({
                  knowledge: knowledgeDraft.trim(),
                  subtopics: subtopicsDraft
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                  emphasis: emphasisDraft.trim(),
                });
              }}
              className="flex items-center gap-1 bg-[#00A896] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`text-[12px] font-semibold leading-4 ${empty ? 'text-rose-300' : 'text-white'}`}>
            {entry.knowledge?.trim() || 'Sin conocimiento. Edita o regenera.'}
          </p>
          {entry.subtopics && entry.subtopics.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.subtopics.slice(0, 5).map((sub, index) => (
                <span
                  key={`${entry.week}-sub-${index}`}
                  className="inline-flex items-center border border-[#00B4D8]/25 bg-[#00B4D8]/10 px-1.5 py-0.5 text-[9px] leading-3 text-[#A6EAF5]"
                >
                  {sub}
                </span>
              ))}
            </div>
          ) : null}
          {entry.emphasis ? (
            <p className="mt-2 text-[10px] leading-4 text-white/55">{entry.emphasis}</p>
          ) : null}
          {warning ? (
            <div
              title={warning.message}
              className="mt-2 flex items-center gap-1 border border-amber-400/35 bg-amber-400/10 px-1.5 py-1 text-[9px] leading-3 text-amber-200"
            >
              <AlertTriangle size={10} className="shrink-0" />
              <span className="line-clamp-2">{warning.message}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

function ScreenTabs({
  screen,
  onSelect,
  contextReady,
  hasMap,
}: {
  screen: Screen;
  onSelect: (value: Screen) => void;
  contextReady: boolean;
  hasMap: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect('context')}
        className={[
          'flex h-8 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition',
          screen === 'context'
            ? 'border-[#00B4D8] bg-[#00B4D8]/15 text-[#72E7F6]'
            : 'border-white/10 bg-[#0B192C] text-white/48 hover:text-white',
        ].join(' ')}
      >
        <UploadCloud size={12} />
        1 Consolidado NotebookLM
      </button>
      <button
        type="button"
        onClick={() => onSelect('map')}
        disabled={!contextReady && !hasMap}
        className={[
          'flex h-8 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40',
          screen === 'map'
            ? 'border-[#E9B44C] bg-[#E9B44C]/12 text-[#F2C260]'
            : 'border-white/10 bg-[#0B192C] text-white/48 hover:text-white',
        ].join(' ')}
      >
        <Sparkles size={12} />
        2 Linea de tiempo 16 semanas
      </button>
    </div>
  );
}

function RepromptDialog({
  totalUnits,
  unlockedWeeks,
  manualSelection,
  onChangeManualSelection,
  scope,
  onChangeScope,
  instruction,
  onChangeInstruction,
  loading,
  onClose,
  onSubmit,
}: {
  totalUnits: number;
  unlockedWeeks: number[];
  manualSelection: number[];
  onChangeManualSelection: (weeks: number[]) => void;
  scope: RepromptScope;
  onChangeScope: (value: RepromptScope) => void;
  instruction: string;
  onChangeInstruction: (value: string) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const targetWeeks = scope === 'unlocked' ? unlockedWeeks : manualSelection;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col border border-[#E9B44C]/35 bg-[#0B192C] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Reprompt parcial</p>
            <h2 className="mt-1 text-base font-bold text-white">Reescribir solo semanas seleccionadas</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/48 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 grid gap-2 text-[11px] text-white/72">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scope === 'unlocked'}
                onChange={() => onChangeScope('unlocked')}
              />
              <span>
                Reescribir <strong className="text-white">todas las semanas desbloqueadas</strong> (
                {unlockedWeeks.length} semana{unlockedWeeks.length === 1 ? '' : 's'}).
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scope === 'manual'}
                onChange={() => onChangeScope('manual')}
              />
              <span>Elegir semanas especificas a reescribir.</span>
            </label>
          </div>

          {scope === 'manual' ? (
            <div className="mb-4 grid grid-cols-8 gap-1.5">
              {Array.from({ length: TOTAL_WEEKS }, (_, index) => index + 1).map((week) => {
                const selected = manualSelection.includes(week);
                return (
                  <button
                    key={week}
                    type="button"
                    onClick={() =>
                      onChangeManualSelection(
                        selected
                          ? manualSelection.filter((value) => value !== week)
                          : [...manualSelection, week].sort((a, b) => a - b),
                      )
                    }
                    className={[
                      'h-9 border text-[11px] font-bold transition',
                      selected
                        ? 'border-[#E9B44C] bg-[#E9B44C]/15 text-[#F2C260]'
                        : 'border-white/10 bg-[#162A45] text-white/55 hover:border-[#E9B44C]/40',
                    ].join(' ')}
                  >
                    {week}
                  </button>
                );
              })}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
              Instruccion docente
            </span>
            <textarea
              value={instruction}
              onChange={(event) => onChangeInstruction(event.target.value)}
              rows={5}
              className="w-full resize-none border border-white/10 bg-[#162A45] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#00B4D8]/60"
              placeholder='Ejemplo: cambia los temas del primer mes para que se enfoquen en jurisprudencia penal aplicada.'
            />
          </label>

          <div className="mt-3 border border-white/10 bg-[#162A45] px-3 py-2 text-[11px] text-white/58">
            Semanas que recibira la IA: {targetWeeks.length ? targetWeeks.join(', ') : 'ninguna seleccionada'}.
            <span className="mt-1 block text-[10px] text-white/40">
              Total unidades: {totalUnits}. Las semanas bloqueadas con candado se mantienen intactas.
            </span>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/10 px-4 py-2 text-[11px] font-bold text-white/58 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !targetWeeks.length || !instruction.trim()}
            className="flex items-center gap-2 bg-[#00A896] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Reescribir semanas
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Step8b_MapaConocimientos() {
  const navigate = useNavigate();
  const { draftId, courseDetail, draftPerformances, showToast } = useSyllabus();

  const [state, setState] = useState<ProgressiveCurriculumState | null>(null);
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMap | null>(null);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [notebookContext, setNotebookContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyWeek, setBusyWeek] = useState<number | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatusText, setJobStatusText] = useState('');
  const [repromptOpen, setRepromptOpen] = useState(false);
  const [repromptScope, setRepromptScope] = useState<RepromptScope>('unlocked');
  const [manualSelection, setManualSelection] = useState<number[]>([]);
  const [repromptInstruction, setRepromptInstruction] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('context');

  const performances = useMemo(() => {
    return (state?.performances?.length ? state.performances : draftPerformances) || [];
  }, [draftPerformances, state]);
  const totalUnits = Math.max(1, performances.length || 1);
  const selectedProduct =
    state?.progressive_curriculum?.selected_product
    || state?.product_options?.find((item) => item.selected);
  const officialKnowledge = useMemo(() => {
    const raw = courseDetail?.temas_conocimientos;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is string => Boolean(item));
  }, [courseDetail?.temas_conocimientos]);

  const mapWeeks = useMemo(
    () => ensureFullMap(knowledgeMap?.map_json || []),
    [knowledgeMap],
  );
  const audit: KnowledgeMapAudit | undefined = knowledgeMap?.audit_json;
  const confirmed = knowledgeMap?.status === 'confirmed';
  const unlockedWeeks = mapWeeks.filter((entry) => !entry.locked).map((entry) => entry.week);
  const allWeeksHaveKnowledge = mapWeeks.every((entry) => (entry.knowledge || '').trim().length > 0);
  const hasMap = (knowledgeMap?.map_json?.length || 0) > 0;
  const canConfirm = hasMap && allWeeksHaveKnowledge && !confirmed;
  const contextReady = notebookContext.trim().length >= MIN_NOTEBOOK_CHARS;

  const notebookPrompt = useMemo(
    () => buildKnowledgeMapPrompt(
      courseDetail?.name || '',
      performances,
      totalUnits,
      selectedProduct?.title || '',
      selectedProduct?.work_object || '',
      officialKnowledge,
    ),
    [courseDetail, performances, totalUnits, selectedProduct, officialKnowledge],
  );

  const loadState = useCallback(async () => {
    if (!draftId) return;
    try {
      const stateResponse = await api.getProgressiveCurriculumState(draftId);
      setState(stateResponse.data);
      const mapResponse = await api.getKnowledgeMap(draftId);
      const fetched = mapResponse.data || stateResponse.data?.knowledge_map || null;
      setKnowledgeMap(fetched);
      if (fetched) {
        if (fetched.notebook_context_text) {
          setNotebookContext(fetched.notebook_context_text);
        }
        if ((fetched.map_json?.length || 0) > 0) {
          setScreen('map');
        }
      }
    } catch {
      showToast('No se pudo cargar el Mapa de Conocimientos', 'error');
    }
  }, [draftId, showToast]);

  useEffect(() => {
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(notebookPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      showToast('No se pudo copiar el prompt', 'warning');
    }
  };

  const handleSuggest = async () => {
    if (!draftId) return;
    if (!contextReady) {
      showToast(`Pega un consolidado de al menos ${MIN_NOTEBOOK_CHARS} caracteres`, 'warning');
      return;
    }
    setLoading(true);
    setJobStatusText('Disenando el Mapa Semanal de Conocimientos...');
    try {
      const queued = await api.suggestKnowledgeMap(draftId, {
        notebook_context_text: notebookContext,
        teacher_instruction: '',
      });
      const jobId = queued.data.job_id || queued.data.id;
      if (!jobId) throw new Error('No se recibio job_id de la IA');
      setActiveJobId(jobId);
      await api.pollAiGenerationJob(jobId, {
        intervalMs: 4000,
        timeoutMs: 600000,
        onUpdate: (job) => {
          setJobStatusText(
            job.status === 'running'
              ? 'IA estructurando 16 conocimientos semanales con auditoria de repeticion...'
              : 'En cola. Esperando proveedor disponible...',
          );
        },
      });
      showToast('Mapa generado', 'success');
      await loadState();
      setScreen('map');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo generar el mapa', 'error');
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setJobStatusText('');
    }
  };

  const handleToggleLock = async (week: KnowledgeMapWeek) => {
    if (!draftId || confirmed) return;
    setBusyWeek(week.week);
    try {
      const response = await api.updateKnowledgeMapWeek(draftId, week.week, { locked: !week.locked });
      setKnowledgeMap(response.data.map);
    } catch {
      showToast('No se pudo cambiar el candado', 'error');
    } finally {
      setBusyWeek(null);
    }
  };

  const handleSaveEdit = async (week: number, patch: Partial<KnowledgeMapWeek>) => {
    if (!draftId || confirmed) return;
    if ('knowledge' in patch && !(patch.knowledge || '').trim()) {
      showToast('El conocimiento no puede quedar vacio', 'warning');
      return;
    }
    setBusyWeek(week);
    try {
      const response = await api.updateKnowledgeMapWeek(draftId, week, patch);
      setKnowledgeMap(response.data.map);
      setEditingWeek(null);
      showToast(`Semana ${week} actualizada`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar la semana', 'error');
    } finally {
      setBusyWeek(null);
    }
  };

  const openReprompt = () => {
    setRepromptInstruction('');
    setRepromptScope(unlockedWeeks.length ? 'unlocked' : 'manual');
    setManualSelection([]);
    setRepromptOpen(true);
  };

  const handleReprompt = async () => {
    if (!draftId) return;
    const targetWeeks = repromptScope === 'unlocked' ? unlockedWeeks : manualSelection;
    if (!targetWeeks.length) {
      showToast('Selecciona al menos una semana', 'warning');
      return;
    }
    if (!repromptInstruction.trim()) {
      showToast('Escribe una instruccion para la IA', 'warning');
      return;
    }
    setLoading(true);
    setJobStatusText('Reescribiendo semanas seleccionadas...');
    try {
      const queued = await api.repromptKnowledgeMap(draftId, {
        weeks_to_change: targetWeeks,
        teacher_instruction: repromptInstruction,
        notebook_context_text: notebookContext,
      });
      const jobId = queued.data.job_id || queued.data.id;
      if (!jobId) throw new Error('No se recibio job_id');
      setActiveJobId(jobId);
      await api.pollAiGenerationJob(jobId, {
        intervalMs: 4000,
        timeoutMs: 600000,
        onUpdate: (job) => {
          setJobStatusText(
            job.status === 'running'
              ? 'IA reescribiendo solo las semanas seleccionadas...'
              : 'En cola. Esperando proveedor...',
          );
        },
      });
      showToast('Reprompt aplicado', 'success');
      setRepromptOpen(false);
      await loadState();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo aplicar el reprompt', 'error');
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setJobStatusText('');
    }
  };

  const handleConfirm = async () => {
    if (!draftId) return;
    if (!allWeeksHaveKnowledge) {
      showToast('Hay semanas sin conocimiento. Edita o regenera antes de confirmar.', 'warning');
      return;
    }
    setLoading(true);
    setJobStatusText('Confirmando mapa como verdad curricular...');
    try {
      await api.confirmKnowledgeMap(draftId);
      showToast('Mapa confirmado. Ya es la verdad inamovible para las unidades.', 'success');
      await loadState();
      navigate('/creator/evaluacion');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo confirmar el mapa', 'error');
    } finally {
      setLoading(false);
      setJobStatusText('');
    }
  };

  const warningsCount = audit?.warnings?.length || 0;
  const overallSignal = audit?.overall_signal || (hasMap ? 'ok' : '');

  return (
    <>
      {loading ? (
        <BlockingLoader
          title={activeJobId ? 'IA en proceso' : 'Procesando mapa'}
          message={jobStatusText || 'Trabajando en el Mapa Semanal de Conocimientos.'}
        />
      ) : null}

      {promptModalOpen ? (
        <PromptModal prompt={notebookPrompt} onClose={() => setPromptModalOpen(false)} />
      ) : null}

      {videoModalOpen ? <VideoModal onClose={() => setVideoModalOpen(false)} /> : null}

      <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
              Paso 9 de 12 - Mapa Semanal de Conocimientos
            </p>
            <h1 className="font-playfair text-2xl font-bold text-white">
              {screen === 'context' ? 'Trae tu consolidado de NotebookLM' : 'Linea de tiempo - 16 semanas'}
            </h1>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-white/62">
              {screen === 'context'
                ? 'Pantalla 1 de 2. Lleva el prompt a NotebookLM, trae el consolidado disciplinar y pegalo aqui antes de generar el mapa.'
                : 'Pantalla 2 de 2. Esta es la verdad curricular del curso. Una vez confirmado, el motor de unidades respetara estos conocimientos exactos.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScreenTabs
              screen={screen}
              onSelect={(value) => {
                if (value === 'map' && !hasMap && !contextReady) {
                  showToast('Primero pega el consolidado de NotebookLM', 'warning');
                  return;
                }
                setScreen(value);
              }}
              contextReady={contextReady}
              hasMap={hasMap}
            />
            {confirmed ? (
              <span className="flex items-center gap-2 border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                <ShieldCheck size={13} /> Confirmado v{knowledgeMap?.version}
              </span>
            ) : (
              <span className="border border-white/10 bg-[#162A45] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                Borrador {hasMap ? `v${knowledgeMap?.version}` : ''}
              </span>
            )}
          </div>
        </div>

        {screen === 'context' ? (
          <section className="border border-white/10 bg-[#162A45] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                title="Ver guia visual de NotebookLM"
                className="flex h-20 w-20 shrink-0 items-center justify-center transition hover:brightness-110"
              >
                <img
                  src={NOTEBOOK_ICON}
                  alt="NotebookLM"
                  className="h-full w-full object-contain"
                />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">
                  Como llenar esta pantalla
                </p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-[12px] leading-5 text-white/72">
                  <li>Copia el prompt y pegalo en NotebookLM con tus fuentes oficiales del curso.</li>
                  <li>Trae el consolidado disciplinar y pegalo en el textarea de abajo.</li>
                  <li>Genera el mapa para pasar a la pantalla 2 con la linea de tiempo de 16 semanas.</li>
                </ol>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap border border-[#00B4D8]/35 bg-[#0B192C] px-3 text-[11px] font-bold text-[#72E7F6] transition hover:bg-[#00B4D8]/10"
                  >
                    {copiedPrompt ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copiedPrompt ? 'Copiado' : 'Copiar prompt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptModalOpen(true)}
                    title="Ver prompt"
                    aria-label="Ver prompt"
                    className="inline-flex h-9 w-9 items-center justify-center border border-white/10 bg-[#0B192C] text-white/55 transition hover:border-[#00B4D8]/55 hover:text-[#72E7F6]"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoModalOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap border border-white/10 bg-[#0B192C] px-3 text-[11px] font-bold text-white/55 transition hover:border-[#E9B44C]/45 hover:text-[#E9B44C]"
                  >
                    <Eye size={13} />
                    Ver guia visual
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
                  <UploadCloud size={12} />
                  Consolidado NotebookLM o apuntes docentes
                </p>
                <span
                  className={`font-jetbrains text-[10px] ${contextReady ? 'text-emerald-300' : 'text-[#E9B44C]'}`}
                >
                  {notebookContext.trim().length}/{MIN_NOTEBOOK_CHARS} caracteres minimos
                </span>
              </div>
              <textarea
                value={notebookContext}
                onChange={(event) => setNotebookContext(event.target.value)}
                rows={10}
                disabled={confirmed}
                className="w-full resize-none border border-white/10 bg-[#0B192C] px-3 py-3 text-[12px] leading-5 text-white outline-none placeholder:text-white/24 focus:border-[#00B4D8]/60 disabled:opacity-60"
                placeholder="Pega aqui el consolidado de NotebookLM (temas, casos, secuencia disciplinar) o apuntes docentes."
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={loading || confirmed || !contextReady}
                  className="inline-flex h-10 items-center gap-2 whitespace-nowrap bg-[#00A896] px-4 text-[11px] font-bold text-white transition hover:bg-[#00B4D8] disabled:opacity-50"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {hasMap ? 'Regenerar mapa con IA' : 'Generar mapa con IA'}
                </button>
                {hasMap ? (
                  <button
                    type="button"
                    onClick={() => setScreen('map')}
                    className="inline-flex h-10 items-center gap-2 whitespace-nowrap border border-white/10 px-4 text-[11px] font-bold text-white/65 transition hover:border-[#E9B44C]/50 hover:text-[#E9B44C]"
                  >
                    <ArrowRight size={12} />
                    Ir a la linea de tiempo
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {screen === 'map' ? (
          <>
            <div className="mb-3 flex flex-col gap-2 border border-white/10 bg-[#0B192C] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">
                  Consolidado cargado
                </p>
                <p className="mt-1 text-[11px] text-white/58">
                  {notebookContext.trim().length} caracteres usados como insumo del mapa.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScreen('context')}
                  className="flex h-9 items-center gap-2 border border-white/10 bg-[#0B192C] px-3 text-[10px] font-bold text-white/65 hover:border-[#E9B44C]/50 hover:text-[#E9B44C]"
                >
                  <FileText size={13} />
                  Editar consolidado
                </button>
                <button
                  type="button"
                  onClick={openReprompt}
                  disabled={!hasMap || confirmed}
                  className="flex h-9 items-center gap-2 border border-[#E9B44C]/35 px-3 text-[10px] font-bold text-[#F2C260] hover:bg-[#E9B44C]/10 disabled:opacity-40"
                >
                  <RotateCcw size={13} />
                  Reprompt parcial
                </button>
              </div>
            </div>

            {hasMap && warningsCount > 0 ? (
              <div className="mb-3 flex items-start gap-2 border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[11px] leading-4 text-amber-100">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">
                    Validador IA: {warningsCount} alerta{warningsCount === 1 ? '' : 's'} suave
                    {warningsCount === 1 ? '' : 's'} (signal: {overallSignal}).
                  </p>
                  <p className="text-amber-100/80">
                    No bloquean la confirmacion. Revisa las cards con borde amarillo o usa "Reprompt parcial" para
                    ajustar.
                  </p>
                </div>
              </div>
            ) : null}

            <section className="border border-white/10 bg-[#162A45] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">
                  Linea de tiempo - 16 semanas
                </p>
                <p className="text-[10px] text-white/45">
                  Desplaza horizontal para ver el ciclo lectivo completo
                </p>
              </div>
              {hasMap ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {mapWeeks.map((entry) => (
                    <WeekCard
                      key={entry.week}
                      entry={entry}
                      totalUnits={totalUnits}
                      isEditing={editingWeek === entry.week}
                      onStartEdit={() => setEditingWeek(entry.week)}
                      onCancelEdit={() => setEditingWeek(null)}
                      onSaveEdit={(patch) => handleSaveEdit(entry.week, patch)}
                      onToggleLock={() => handleToggleLock(entry)}
                      busy={busyWeek === entry.week}
                      confirmed={confirmed}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                  <Sparkles size={26} className="text-[#00B4D8]" />
                  <p className="mt-3 text-[13px] font-bold text-white">Aun no hay mapa</p>
                  <p className="mt-1 max-w-md text-[11px] leading-4 text-white/52">
                    Vuelve a la pantalla 1 y pega el consolidado de NotebookLM antes de generar.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/creator/producto')}
            className="flex items-center gap-1.5 text-[11px] text-white/46 transition hover:text-white"
          >
            <ArrowLeft size={12} />
            Volver a producto
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading || screen === 'context'}
            className="flex items-center gap-2 bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {confirmed ? 'Mapa confirmado' : 'Confirmar y continuar'}
            <ArrowRight size={12} />
          </button>
        </div>

        {repromptOpen ? (
          <RepromptDialog
            totalUnits={totalUnits}
            unlockedWeeks={unlockedWeeks}
            manualSelection={manualSelection}
            onChangeManualSelection={setManualSelection}
            scope={repromptScope}
            onChangeScope={setRepromptScope}
            instruction={repromptInstruction}
            onChangeInstruction={setRepromptInstruction}
            loading={loading}
            onClose={() => setRepromptOpen(false)}
            onSubmit={handleReprompt}
          />
        ) : null}
      </div>
    </>
  );
}
