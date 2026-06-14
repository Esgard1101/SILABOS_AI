import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileText,
  Info,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
  Unlock,
  UploadCloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type {
  ProgressiveCurriculumState,
  ProgressiveUnitGeneration,
  ProgressiveUnitWeek,
  SuggestedPerformance,
} from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';
import GlassModal from '../../components/ui/GlassModal';
import OverlayLoader from '../../components/ui/OverlayLoader';
import { useWizardStep } from './wizardSteps';

type UnitScreen = 'context' | 'workshop';
type DialogMode = 'edit' | 'regenerate' | null;
type ProductSummary = {
  title?: string;
  work_object?: string;
  timeline_json?: Record<string, string>;
} | null | undefined;

const NOTEBOOK_IMAGE = '/images/notebooklm_steps/step2d5.png';
const NOTEBOOK_ICON = '/ICONEMPEZARNOTEBOOKLM.png';
const MIN_CONTEXT_CHARS = 80;
const TOTAL_SYLLABUS_WEEKS = 16;

type WeekRange = { start: number; end: number };

const UNIT_WEEK_RANGE_MAP: Record<number, WeekRange[]> = {
  1: [{ start: 1, end: 16 }],
  2: [
    { start: 1, end: 8 },
    { start: 9, end: 16 },
  ],
  3: [
    { start: 1, end: 6 },
    { start: 7, end: 11 },
    { start: 12, end: 16 },
  ],
  4: [
    { start: 1, end: 4 },
    { start: 5, end: 8 },
    { start: 9, end: 12 },
    { start: 13, end: 16 },
  ],
  5: [
    { start: 1, end: 4 },
    { start: 5, end: 7 },
    { start: 8, end: 10 },
    { start: 11, end: 13 },
    { start: 14, end: 16 },
  ],
  6: [
    { start: 1, end: 3 },
    { start: 4, end: 6 },
    { start: 7, end: 9 },
    { start: 10, end: 12 },
    { start: 13, end: 14 },
    { start: 15, end: 16 },
  ],
};

function buildFallbackWeekRanges(totalUnits: number): WeekRange[] {
  const units = Math.max(1, Math.floor(totalUnits || 1));
  const base = Math.floor(TOTAL_SYLLABUS_WEEKS / units);
  const remainder = TOTAL_SYLLABUS_WEEKS % units;
  const ranges: WeekRange[] = [];
  let cursor = 1;
  for (let index = 0; index < units; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    const start = cursor;
    const end = index === units - 1 ? TOTAL_SYLLABUS_WEEKS : Math.min(TOTAL_SYLLABUS_WEEKS, cursor + size - 1);
    ranges.push({ start, end });
    cursor = end + 1;
  }
  return ranges;
}

function getUnitWeekRanges(totalUnits: number): WeekRange[] {
  const units = Math.max(1, Math.floor(totalUnits || 1));
  return UNIT_WEEK_RANGE_MAP[units] || buildFallbackWeekRanges(units);
}

function getUnitWeekRange(totalUnits: number, unitNumber: number): WeekRange {
  const ranges = getUnitWeekRanges(totalUnits);
  const index = Math.max(0, Math.min(ranges.length - 1, Math.floor(unitNumber || 1) - 1));
  return ranges[index] || { start: 1, end: TOTAL_SYLLABUS_WEEKS };
}

function buildUnitWeekMapText(totalUnits: number): string {
  return getUnitWeekRanges(totalUnits)
    .map((range, index) => `- U${index + 1}: sem. ${range.start}-${range.end}`)
    .join('\n');
}

function textOfPerformance(item?: SuggestedPerformance | string | null) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.statement || item.label || item.code || '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stateUnits(state: ProgressiveCurriculumState | null): Record<string, unknown>[] {
  const topLevel = Array.isArray(state?.units) ? state?.units : [];
  const progressiveUnits = Array.isArray(state?.progressive_curriculum?.units)
    ? state?.progressive_curriculum?.units
    : [];
  return [...(topLevel || []), ...(progressiveUnits || [])].map(asRecord);
}

function statePerformances(state: ProgressiveCurriculumState | null): SuggestedPerformance[] {
  return Array.isArray(state?.performances) ? state.performances : [];
}

function maxUnitNumber(items: unknown[]): number {
  return items.reduce<number>((max, item) => {
    const value = Number(asRecord(item).unit_number);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
}

function timelinePaCount(state: ProgressiveCurriculumState | null) {
  return timelineEntriesFromState(state).filter(([code]) => /^PA\s*\d+$/i.test(String(code || '').trim())).length;
}

function resolveUnitCount(
  state: ProgressiveCurriculumState | null,
  draftPerformances: SuggestedPerformance[],
) {
  const units = stateUnits(state);
  const performances = statePerformances(state);
  return Math.max(
    1,
    draftPerformances.length,
    units.length,
    performances.length,
    maxUnitNumber(units),
    maxUnitNumber(state?.unit_contexts || []),
    maxUnitNumber(state?.unit_generations || []),
    timelinePaCount(state),
  );
}

function performanceForUnit(
  state: ProgressiveCurriculumState | null,
  draftPerformances: SuggestedPerformance[],
  unitNumber: number,
) {
  const index = Math.max(0, unitNumber - 1);
  const fromLocal = textOfPerformance(draftPerformances[index]);
  if (fromLocal) return fromLocal;

  const fromState = textOfPerformance(statePerformances(state)[index]);
  if (fromState) return fromState;

  const unit = stateUnits(state).find((item) => Number(item.unit_number) === unitNumber) || stateUnits(state)[index];
  const unitText = String(
    unit?.performance_statement
    || unit?.performance
    || unit?.statement
    || unit?.title
    || '',
  ).trim();
  return unitText.replace(/^Unidad\s+\d+\s*:\s*/i, '');
}

function buildUnitNotebookPrompt(
  unitNumber: number,
  totalUnits: number,
  courseName: string,
  performance: string,
  knowledgeMapWeeks: { week: number; knowledge: string; subtopics?: string[] }[],
) {
  const range = getUnitWeekRange(totalUnits, unitNumber);
  const unitWeekMapText = buildUnitWeekMapText(totalUnits);
  const knowledgeListText = knowledgeMapWeeks
    .filter((item) => item.week >= range.start && item.week <= range.end)
    .map((item) => {
      const subtopicsText = (item.subtopics || [])
        .filter(Boolean)
        .map((subtopic) => `  - ${subtopic}`)
        .join('\n');
      return [
        `- Sem. ${item.week}: ${item.knowledge}`,
        subtopicsText ? `  Subtemas:\n${subtopicsText}` : '  Subtemas: sin registro.',
      ].join('\n');
    })
    .join('\n');

  return `Genera un CONSOLIDADO DIDACTICO CONCRETO para SIGEISIL.

CURSO: ${courseName || '[nombre del curso]'}
UNIDAD: ${unitNumber}/${totalUnits}
DESEMPENO: ${performance || '[pegar desempeno oficial]'}
NIVEL: universitario

DISTRIBUCION:
${unitWeekMapText}

ALCANCE: Unidad ${unitNumber}, semanas ${range.start}-${range.end}. No adelantes contenidos de otras unidades.

Usa solo fuentes del cuaderno NotebookLM. No redactes el silabo final; entrega insumos didacticos concretos.

Estructura obligatoria:

1. CONOCIMIENTOS INMUTABLES
Temas y subtemas aprobados:
${knowledgeListText || '- No se encontraron conocimientos confirmados para esta unidad. Detente y solicita confirmar el Mapa Semanal de Conocimientos antes de proponer didactica.'}
REGLA ABSOLUTA: prohibido inventar, modificar, resumir o extraer temas/subtemas nuevos. Solo indica como ensenar y evaluar lo listado.

2. SITUACIONES UNIVERSITARIAS
- 3 casos, problemas o escenarios profesionales aplicados al punto 1 y al desempeno.

3. OPERACIONES COGNITIVAS
- Que debe hacer el estudiante: comparar, disenar, diagnosticar, argumentar, modelar, validar, aplicar, sustentar.

4. ACTIVIDADES DOCENTES
- 4 actividades con tecnica: caso breve, taller guiado, revision de pares, modelado, microdiseno, debate, laboratorio, simulacion o practica.
- Evita vaguedades como "analizar el tema" o "desarrollar actividad".

5. EVIDENCIAS VERIFICABLES
- Evidencias observables: matriz, ficha, borrador, guion, informe, prototipo, plan, instrumento, dossier o sustentacion.

6. SUGERENCIAS DIDACTICAS SEMANALES (Semana ${range.start} a ${range.end})
- Para CADA semana del bloque 1, propone una dinamica sobre EXACTAMENTE ese tema y subtemas.
- Identifica como Semana N y conecta: tema + operacion cognitiva + tecnica + evidencia.
- No uses etiquetas Fase:, Momento:, Proposito:, Tecnicas: o Evidencia:.

7. RIESGOS DE COMPRENSION
- Errores frecuentes al aprender estos temas.

Reglas finales:
- Tono universitario, profesional y concreto.
- No inventes bibliografia ni uses citas internas [1], [2].
- No propongas producto final del curso.
- Devuelve texto ordenado y facil de copiar.`;
}

function scoreClass(score?: number) {
  if ((score || 0) >= 8) return 'bg-emerald-400 text-[#0B192C]';
  if ((score || 0) >= 6) return 'bg-[#E9B44C] text-[#0B192C]';
  return 'bg-rose-400 text-white';
}

function normalizeGenerationWeeks(generation?: ProgressiveUnitGeneration | null): ProgressiveUnitWeek[] {
  if (!generation?.output_json) return [];
  return Array.isArray(generation.output_json) ? generation.output_json : [];
}

function timelineEntriesFromState(state: ProgressiveCurriculumState | null) {
  const product = state?.progressive_curriculum?.selected_product
    || state?.product_options?.find((item) => item.selected);
  return Object.entries(product?.timeline_json || {}).filter(([, value]) => String(value || '').trim());
}

function UnitRail({
  count,
  selectedUnit,
  generations,
  contexts,
  onSelect,
}: {
  count: number;
  selectedUnit: number;
  generations: ProgressiveUnitGeneration[];
  contexts: Record<number, string>;
  onSelect: (unit: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-[#162A45] px-3 py-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-2">
      {Array.from({ length: count }, (_, index) => {
        const unit = index + 1;
        const generation = generations.find((item) => Number(item.unit_number) === unit);
        const score = generation?.validation_summary_json?.overall_score;
        const approved = generation?.status === 'approved';
        const hasContext = Boolean((contexts[unit] || '').trim());
        return (
          <button
            key={unit}
            type="button"
            onClick={() => onSelect(unit)}
            title={`Unidad ${unit}`}
            className={[
              'relative flex h-10 min-w-10 items-center justify-center border text-[11px] font-bold transition lg:w-10',
              selectedUnit === unit
                ? 'border-[#00B4D8] bg-[#00B4D8]/18 text-white'
                : 'border-white/10 bg-[#0B192C]/50 text-white/48 hover:text-white',
            ].join(' ')}
          >
            {approved ? <CheckCircle2 size={14} className="text-emerald-300" /> : score ? Math.round(score) : unit}
            {hasContext && !approved ? <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#E9B44C]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function UnitStageTabs({
  screen,
  contextReady,
  onContext,
  onWorkshop,
}: {
  screen: UnitScreen;
  contextReady: boolean;
  onContext: () => void;
  onWorkshop: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onContext}
        className={[
          'flex h-8 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition',
          screen === 'context'
            ? 'border-[#00B4D8] bg-[#00B4D8]/15 text-[#72E7F6]'
            : 'border-white/10 bg-[#0B192C] text-white/48 hover:text-white',
        ].join(' ')}
      >
        <UploadCloud size={12} />
        1 Contexto
      </button>
      <button
        type="button"
        onClick={onWorkshop}
        disabled={!contextReady}
        className={[
          'flex h-8 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40',
          screen === 'workshop'
            ? 'border-[#E9B44C] bg-[#E9B44C]/12 text-[#F2C260]'
            : 'border-white/10 bg-[#0B192C] text-white/48 hover:text-white',
        ].join(' ')}
      >
        <Sparkles size={12} />
        2 Sugerir con IA
      </button>
    </div>
  );
}

function WeekTable({
  weeks,
  busyWeek,
  disabled,
  onLock,
  onEdit,
  onRetry,
}: {
  weeks: ProgressiveUnitWeek[];
  busyWeek: number | null;
  disabled?: boolean;
  onLock: (week: ProgressiveUnitWeek) => void;
  onEdit: (week: ProgressiveUnitWeek) => void;
  onRetry: (week?: ProgressiveUnitWeek) => void;
}) {
  if (!weeks.length) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center border border-white/10 bg-[#162A45] px-5 text-center">
        <Sparkles size={28} className="text-[#00B4D8]" />
        <p className="mt-3 text-[13px] font-bold text-white">Unidad aun no generada</p>
        <p className="mt-1 max-w-md text-[11px] leading-5 text-white/48">
          Con el contexto cargado, solicita la sugerencia IA para revisar la tabla docente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-white/10 bg-[#162A45]">
      <table className="min-w-[1080px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 bg-[#0B192C]">
            <th className="w-14 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Sem</th>
            <th className="w-[250px] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Conocimiento / habilidad</th>
            <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Actividad didactica</th>
            <th className="w-[210px] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Evidencia</th>
            <th className="w-20 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Valid.</th>
            <th className="w-32 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const score = week.validation?.total_score ?? 0;
            return (
              <tr key={week.week} className="border-b border-white/8 bg-[#162A45] align-top">
                <td className="px-3 py-3">
                  <span className="font-jetbrains text-[13px] font-bold text-[#E9B44C]">{week.week}</span>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[11px] font-semibold leading-5 text-white">{week.knowledge}</p>
                  {week.skill ? <p className="mt-1 text-[10px] leading-4 text-[#00B4D8]/78">{week.skill}</p> : null}
                </td>
                <td className="px-3 py-3">
                  {week.phase ? (
                    <span className="mb-2 inline-flex border border-[#E9B44C]/25 bg-[#E9B44C]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#F2C260]">
                      {week.phase}
                    </span>
                  ) : null}
                  <p className="whitespace-pre-wrap text-[11px] leading-5 text-white/78">{week.activity}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[11px] leading-5 text-white/72">{week.evidence}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-jetbrains text-[10px] font-bold ${scoreClass(score)}`}>
                    {score || '--'}
                  </span>
                  {week.validation?.diagnosis ? (
                    <p className="mt-1 text-[9px] leading-3 text-white/34">{week.validation.diagnosis}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      title={week.locked ? 'Desbloquear semana' : 'Fijar semana'}
                      onClick={() => onLock(week)}
                      disabled={disabled || busyWeek === week.week}
                      className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#0B192C] text-white/55 transition hover:border-[#00B4D8]/50 hover:text-[#00B4D8]"
                    >
                      {busyWeek === week.week ? <Loader2 size={13} className="animate-spin" /> : week.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                    <button
                      type="button"
                      title="Editar semana"
                      onClick={() => onEdit(week)}
                      disabled={disabled}
                      className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#0B192C] text-white/55 transition hover:border-[#E9B44C]/50 hover:text-[#E9B44C]"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      title="Reintentar con IA"
                      onClick={() => onRetry(week)}
                      disabled={disabled}
                      className="flex h-8 w-8 items-center justify-center border border-white/10 bg-[#0B192C] text-white/55 transition hover:border-[#00A896]/50 hover:text-[#7EE7D4]"
                    >
                      <Sparkles size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditWeekDialog({
  week,
  loading,
  onChange,
  onClose,
  onSave,
}: {
  week: ProgressiveUnitWeek;
  loading: boolean;
  onChange: (week: ProgressiveUnitWeek) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <GlassModal
      onClose={onClose}
      size="md"
      eyebrow="Edicion manual"
      title={`Semana ${week.week}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="border border-white/10 px-4 py-2 text-[11px] font-bold text-white/58 hover:text-white">Cancelar</button>
          <button type="button" onClick={onSave} disabled={loading} className="flex items-center gap-2 bg-[#00A896] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Guardar semana
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
            Conocimiento (fijado por Mapa - solo lectura)
          </span>
          <input
            value={week.knowledge}
            readOnly
            disabled
            className="w-full cursor-not-allowed border border-white/10 bg-[#0B192C] px-3 py-2 text-sm text-white/70 outline-none"
            title="Este conocimiento viene del Mapa Semanal confirmado y no puede modificarse aqui."
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">Habilidad</span>
          <input value={week.skill || ''} onChange={(event) => onChange({ ...week, skill: event.target.value })} className="w-full border border-white/10 bg-[#162A45] px-3 py-2 text-sm text-white outline-none focus:border-[#00B4D8]/60" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">Actividad didactica</span>
          <textarea value={week.activity} onChange={(event) => onChange({ ...week, activity: event.target.value })} rows={7} className="w-full resize-none border border-white/10 bg-[#162A45] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#00B4D8]/60" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">Evidencia</span>
          <input value={week.evidence} onChange={(event) => onChange({ ...week, evidence: event.target.value })} className="w-full border border-white/10 bg-[#162A45] px-3 py-2 text-sm text-white outline-none focus:border-[#00B4D8]/60" />
        </label>
      </div>
    </GlassModal>
  );
}

function RegenerateDialog({
  instruction,
  loading,
  lockedWeeks,
  onChange,
  onClose,
  onRegenerate,
}: {
  instruction: string;
  loading: boolean;
  lockedWeeks: number[];
  onChange: (value: string) => void;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  return (
    <GlassModal
      onClose={onClose}
      size="md"
      accent="amber"
      eyebrow="Reintento IA"
      title="Regenerar unidad"
      footer={
        <>
          <button type="button" onClick={onClose} className="border border-white/10 px-4 py-2 text-[11px] font-bold text-white/58 hover:text-white">Cancelar</button>
          <button type="button" onClick={onRegenerate} disabled={loading} className="flex items-center gap-2 bg-[#00A896] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Regenerar unidad
          </button>
        </>
      }
    >
      <label className="block">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">Instruccion docente</span>
        <textarea
          value={instruction}
          onChange={(event) => onChange(event.target.value)}
          rows={7}
          className="w-full resize-none border border-white/10 bg-[#162A45] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#00B4D8]/60"
          placeholder="Ejemplo: enfoca la unidad en talleres practicos usando revision de pares y casos breves."
        />
      </label>
      <div className="mt-3 border border-white/10 bg-[#162A45] px-3 py-2 text-[11px] text-white/58">
        Semanas bloqueadas: {lockedWeeks.length ? lockedWeeks.join(', ') : 'ninguna'}.
      </div>
    </GlassModal>
  );
}

function ProductReferenceDialog({
  product,
  timeline,
  onClose,
}: {
  product: ProductSummary;
  timeline: [string, unknown][];
  onClose: () => void;
}) {
  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      eyebrow="Referencia PA"
      title="Producto y linea de tiempo"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
        <div className="border border-white/10 bg-[#162A45] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Producto acreditable</p>
          <p className="mt-2 text-[13px] font-bold leading-6 text-white">{product?.title || 'Producto pendiente'}</p>
          <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Objeto de trabajo</p>
          <p className="mt-2 text-[12px] leading-6 text-white/70">{product?.work_object || 'Objeto pendiente de contextualizacion'}</p>
        </div>

        <div className="border border-[#E9B44C]/25 bg-[#162A45] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#F2C260]">Linea PA</p>
          <div className="mt-3 grid gap-2">
            {timeline.length ? timeline.map(([code, value]) => (
              <div key={String(code)} className="border border-white/10 bg-[#0B192C] px-3 py-2">
                <p className="font-jetbrains text-[10px] font-bold text-[#00B4D8]">{code}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/68">{String(value)}</p>
              </div>
            )) : (
              <p className="text-[11px] leading-5 text-white/48">Sin hitos PA definidos.</p>
            )}
          </div>
        </div>
      </div>
    </GlassModal>
  );
}

function NotebookHelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      eyebrow="NotebookLM"
      title="Guia rapida para traer el consolidado"
    >
      <img src={NOTEBOOK_IMAGE} alt="Video guia NotebookLM" className="aspect-video w-full border border-white/10 bg-black object-cover" />
      <p className="mt-4 text-[12px] leading-6 text-white/68">
        Usa este video/placeholder como referencia visual: copia el prompt, pegalo en NotebookLM y trae el consolidado completo para esta unidad.
      </p>
    </GlassModal>
  );
}

export default function Step8_ProgramaProgresivo() {
  const navigate = useNavigate();
  const { draftId, courseDetail, draftPerformances, showToast } = useSyllabus();
  const { context } = useAppContext();
  const [state, setState] = useState<ProgressiveCurriculumState | null>(null);
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [screenByUnit, setScreenByUnit] = useState<Record<number, UnitScreen>>({});
  const [contextTextByUnit, setContextTextByUnit] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyWeek, setBusyWeek] = useState<number | null>(null);
  const [teacherInstruction, setTeacherInstruction] = useState('');
  const [editingWeek, setEditingWeek] = useState<ProgressiveUnitWeek | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatusText, setJobStatusText] = useState('');
  const [productReferenceOpen, setProductReferenceOpen] = useState(false);
  const [notebookHelpOpen, setNotebookHelpOpen] = useState(false);
  const { current: stepCurrent, total: stepTotal } = useWizardStep();

  const unitCount = useMemo(
    () => resolveUnitCount(state, draftPerformances),
    [draftPerformances, state],
  );
  const currentPerformance = performanceForUnit(state, draftPerformances, selectedUnit);
  const currentGeneration = useMemo(
    () => state?.unit_generations?.find((item) => Number(item.unit_number) === selectedUnit) || null,
    [selectedUnit, state],
  );
  const weeks = normalizeGenerationWeeks(currentGeneration);
  const currentContext = contextTextByUnit[selectedUnit] || '';
  const contextReady = currentContext.trim().length >= MIN_CONTEXT_CHARS;
  const unitWeekRange = getUnitWeekRange(unitCount, selectedUnit);
  const savedContextText = (
    state?.unit_contexts?.find((item) => Number(item.unit_number) === selectedUnit)?.raw_context_text || ''
  ).trim();
  const contextSaved = Boolean(savedContextText && savedContextText === currentContext.trim());
  const currentScreen = screenByUnit[selectedUnit] || (currentGeneration ? 'workshop' : 'context');
  const lockedWeeks = weeks.filter((week) => week.locked).map((week) => week.week);
  const knowledgeMapWeeks = useMemo(
    () => (state?.knowledge_map?.map_json || [])
      .map((item) => ({
        week: Number(item.week),
        knowledge: String(item.knowledge || '').trim(),
        subtopics: Array.isArray(item.subtopics)
          ? item.subtopics.map((subtopic) => String(subtopic || '').trim()).filter(Boolean)
          : [],
      }))
      .filter((item) => Number.isFinite(item.week) && item.knowledge),
    [state?.knowledge_map?.map_json],
  );
  const notebookPrompt = buildUnitNotebookPrompt(
    selectedUnit,
    unitCount,
    courseDetail?.name || context?.course_name || '',
    currentPerformance,
    knowledgeMapWeeks,
  );
  const approvedCount = state?.unit_generations?.filter((item) => item.status === 'approved').length || 0;
  const selectedProduct = state?.progressive_curriculum?.selected_product
    || state?.product_options?.find((item) => item.selected);
  const productTimeline = timelineEntriesFromState(state);

  const loadState = useCallback(async () => {
    if (!draftId) return;
    try {
      const response = await api.getProgressiveCurriculumState(draftId);
      const data = response.data;
      setState(data);
      const contexts: Record<number, string> = {};
      (data.unit_contexts || []).forEach((item) => {
        if (item.unit_number) contexts[item.unit_number] = item.raw_context_text || '';
      });
      setContextTextByUnit((prev) => ({ ...contexts, ...prev }));
      if (data.knowledge_map?.status !== 'confirmed') {
        showToast(
          'Debes confirmar el Mapa Semanal de Conocimientos antes de generar unidades.',
          'warning',
        );
        navigate('/creator/mapa-conocimientos');
      }
    } catch {
      showToast('No se pudo cargar el motor progresivo', 'error');
    }
  }, [draftId, showToast, navigate]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (selectedUnit > unitCount) {
      setSelectedUnit(unitCount);
    }
  }, [selectedUnit, unitCount]);

  const selectUnit = (unit: number) => {
    if (loading) {
      showToast('La IA esta generando. Espera a que termine para cambiar de unidad.', 'warning');
      return;
    }
    setSelectedUnit(unit);
    setScreenByUnit((prev) => ({
      ...prev,
      [unit]: state?.unit_generations?.some((item) => Number(item.unit_number) === unit) ? 'workshop' : 'context',
    }));
  };

  const setCurrentScreen = (screen: UnitScreen) => {
    setScreenByUnit((prev) => ({ ...prev, [selectedUnit]: screen }));
  };

  const updateContextText = (value: string) => {
    setContextTextByUnit((prev) => ({ ...prev, [selectedUnit]: value }));
  };

  const handleClearContext = () => {
    updateContextText('');
    showToast('Contexto limpiado. Puedes pegar un nuevo consolidado.', 'success');
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(notebookPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      showToast('No se pudo copiar el prompt', 'warning');
    }
  };

  const handleSaveContextAndContinue = async () => {
    if (!draftId) return;
    if (!contextReady) {
      showToast('Pega un resumen o apuntes mas completos antes de continuar', 'warning');
      return;
    }
    setLoading(true);
    setActiveJobId(null);
    setJobStatusText('Guardando contexto de unidad...');
    try {
      await api.saveProgressiveUnitContext(draftId, selectedUnit, currentContext);
      await loadState();
      setCurrentScreen('workshop');
      showToast('Contexto de unidad guardado', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el contexto de la unidad', 'error');
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setJobStatusText('');
    }
  };

  const handleGenerate = async (regenerate = false) => {
    if (!draftId) return;
    if (!contextReady) {
      setCurrentScreen('context');
      showToast('Primero carga el resumen de NotebookLM o tus apuntes de unidad', 'warning');
      return;
    }
    setLoading(true);
    setActiveJobId(null);
    setJobStatusText(regenerate ? 'Preparando regeneracion de unidad...' : 'Preparando generacion de unidad...');
    try {
      const rawContextText = contextSaved ? '' : currentContext;
      const queued = regenerate && currentGeneration
        ? await api.regenerateProgressiveUnit(draftId, selectedUnit, {
            raw_context_text: rawContextText,
            teacher_instruction: teacherInstruction,
            locked_weeks: lockedWeeks,
          })
        : await api.generateProgressiveUnit(draftId, selectedUnit, {
            raw_context_text: rawContextText,
            teacher_instruction: teacherInstruction,
            locked_weeks: lockedWeeks,
          });
      const jobId = queued.data.job_id || queued.data.id;
      if (!jobId) throw new Error('El servidor no devolvio job_id para la unidad');
      setActiveJobId(jobId);
      setJobStatusText(
        queued.data.already_running
          ? 'La IA ya esta trabajando esta solicitud. Seguimos revisando el avance.'
          : 'La IA esta estructurando la matriz semanal con triple coherencia.',
      );
      await api.pollAiGenerationJob(jobId, {
        intervalMs: 4000,
        timeoutMs: 300000,
        onUpdate: (job) => {
          setJobStatusText(
            job.status === 'running'
              ? 'Analizando contexto curricular y redactando actividades docentes...'
              : 'Solicitud en cola. Esperando proveedor disponible...',
          );
        },
      });
      if (regenerate && currentGeneration) {
        showToast('Unidad regenerada con trazabilidad', 'success');
      } else {
        showToast('Unidad generada', 'success');
      }
      setTeacherInstruction('');
      setDialogMode(null);
      setCurrentScreen('workshop');
      await loadState();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo generar la unidad', 'error');
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setJobStatusText('');
    }
  };

  const handleLock = async (week: ProgressiveUnitWeek) => {
    if (!draftId) return;
    setBusyWeek(week.week);
    try {
      await api.lockProgressiveWeek(draftId, selectedUnit, week.week, !week.locked);
      await loadState();
    } catch {
      showToast('No se pudo actualizar el candado', 'error');
    } finally {
      setBusyWeek(null);
    }
  };

  const openEdit = (week: ProgressiveUnitWeek) => {
    setEditingWeek({ ...week });
    setDialogMode('edit');
  };

  const openRetry = (week?: ProgressiveUnitWeek) => {
    setTeacherInstruction(week ? `Mejora la semana ${week.week}. ` : '');
    setDialogMode('regenerate');
  };

  const saveEditedWeek = async () => {
    if (!draftId || !editingWeek) return;
    setLoading(true);
    try {
      await api.updateProgressiveWeek(draftId, selectedUnit, editingWeek.week, {
        skill: editingWeek.skill,
        activity: editingWeek.activity,
        evidence: editingWeek.evidence,
        phase: editingWeek.phase,
      });
      showToast('Semana actualizada', 'success');
      setEditingWeek(null);
      setDialogMode(null);
      await loadState();
    } catch {
      showToast('No se pudo guardar la semana', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!draftId || !currentGeneration) return;
    setLoading(true);
    setJobStatusText(
      selectedUnit < unitCount
        ? 'Aprobando unidad y preparando la siguiente...'
        : 'Aprobando la ultima unidad y cerrando el programa progresivo...',
    );
    try {
      await api.approveProgressiveUnit(draftId, selectedUnit, currentGeneration.id);
      await loadState();
      if (selectedUnit < unitCount) {
        const nextUnit = selectedUnit + 1;
        setSelectedUnit(nextUnit);
        setScreenByUnit((prev) => ({ ...prev, [nextUnit]: 'context' }));
      } else {
        navigate('/creator/cierre');
      }
      showToast('Unidad aprobada', 'success');
    } catch {
      showToast('No se pudo aprobar la unidad', 'error');
    } finally {
      setLoading(false);
      setJobStatusText('');
    }
  };

  return (
    <>
    <OverlayLoader
      show={loading}
      title={activeJobId ? 'Generando unidad' : 'Procesando programa'}
      message={jobStatusText || 'Estamos guardando los cambios del programa progresivo.'}
    />
    <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
            Paso {stepCurrent} de {stepTotal} - Programa progresivo
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">
            {currentScreen === 'context' ? 'Contexto docente de unidad' : 'Sugerencia IA de unidad'}
          </h1>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-white/62">
            Cada unidad se trabaja en dos pantallas: primero contexto docente obligatorio, luego generacion y revision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UnitStageTabs
            screen={currentScreen}
            contextReady={contextReady}
            onContext={() => setCurrentScreen('context')}
            onWorkshop={() => {
              if (!contextReady) {
                showToast('Primero carga el contexto de la unidad', 'warning');
                return;
              }
              if (!contextSaved) {
                handleSaveContextAndContinue();
                return;
              }
              setCurrentScreen('workshop');
            }}
          />
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[13px] font-bold text-[#00B4D8]">{approvedCount}/{unitCount}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Unidades aprobadas</p>
          </div>
        </div>
      </div>

      <section className="mb-4 overflow-hidden border border-white/10 bg-[#162A45]">
        <div className="flex flex-col lg:flex-row">
          <UnitRail
            count={unitCount}
            selectedUnit={selectedUnit}
            generations={state?.unit_generations || []}
            contexts={contextTextByUnit}
            onSelect={selectUnit}
          />
          <div className="min-w-0 flex-1 p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E9B44C]">
                  Unidad {selectedUnit} - Semanas {unitWeekRange.start} a {unitWeekRange.end} - Pantalla {currentScreen === 'context' ? '1 de 2' : '2 de 2'}
                </p>
                <p className="mt-1 max-w-4xl text-[12px] leading-5 text-white/78">
                  {currentPerformance || 'Desempeno oficial no disponible en contexto local.'}
                </p>
              </div>
              {currentScreen === 'workshop' ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('context')}
                    className="flex h-9 items-center gap-2 border border-white/10 bg-[#0B192C] px-3 text-[10px] font-bold text-white/65 hover:border-[#E9B44C]/50 hover:text-[#E9B44C]"
                  >
                    <FileText size={13} />
                    Editar contexto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate(false)}
                    disabled={loading}
                    className="flex h-9 items-center gap-2 bg-[#00A896] px-4 text-[10px] font-bold text-white hover:bg-[#00B4D8] disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    Generar unidad
                  </button>
                  <button
                    type="button"
                    onClick={() => openRetry()}
                    disabled={!weeks.length}
                    className="flex h-9 items-center gap-2 border border-white/10 bg-[#0B192C] px-3 text-[10px] font-bold text-white/65 hover:border-[#E9B44C]/50 hover:text-[#E9B44C] disabled:opacity-40"
                  >
                    <RotateCcw size={13} />
                    Regenerar
                  </button>
                </div>
              ) : null}
            </div>

            {activeJobId ? (
              <div className="mb-4 flex items-center justify-between gap-3 border border-[#00B4D8]/25 bg-[#00B4D8]/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Loader2 size={16} className="shrink-0 animate-spin text-[#72E7F6]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72E7F6]">IA generando en segundo plano</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/64">{jobStatusText || 'Procesando solicitud...'}</p>
                  </div>
                </div>
                <span className="hidden font-jetbrains text-[10px] text-white/34 sm:inline">job {activeJobId.slice(0, 8)}</span>
              </div>
            ) : null}

            <div className="mb-3 flex flex-col gap-3 border border-[#00B4D8]/20 bg-[#0B192C] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#72E7F6]">Producto base de verificacion</p>
                <p className="mt-1 truncate text-[12px] font-bold leading-5 text-white/86">{selectedProduct?.title || 'Producto pendiente'}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/58">{selectedProduct?.work_object || 'Objeto pendiente de contextualizacion'}</p>
              </div>
              <button
                type="button"
                onClick={() => setProductReferenceOpen(true)}
                title="Ver producto, objeto de trabajo y linea PA"
                className="flex h-9 shrink-0 items-center justify-center gap-2 border border-white/10 bg-[#162A45] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/62 hover:border-[#00B4D8]/45 hover:text-[#72E7F6] md:w-9 md:px-0"
              >
                <Info size={14} />
                <span className="md:hidden">Ver linea PA</span>
              </button>
            </div>

            {currentScreen === 'context' ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_340px]">
                <label className="block">
                  <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
                    <UploadCloud size={12} />
                    Resumen NotebookLM o apuntes docentes obligatorios
                  </span>
                  <textarea
                    value={currentContext}
                    onChange={(event) => updateContextText(event.target.value)}
                    rows={14}
                    className="w-full resize-none border border-white/10 bg-[#0B192C] px-3 py-3 text-[12px] leading-6 text-white outline-none placeholder:text-white/24 focus:border-[#00B4D8]/60"
                    placeholder="Pega aqui el consolidado de NotebookLM de esta unidad o tus apuntes docentes. Debe incluir temas, casos, operaciones cognitivas, actividades posibles, evidencias y riesgos de comprension."
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
                    <span className={contextReady ? 'text-emerald-300' : 'text-[#E9B44C]'}>
                      {currentContext.trim().length}/{MIN_CONTEXT_CHARS} caracteres minimos
                    </span>
                    {contextSaved ? <span className="text-[#72E7F6]">Contexto guardado previamente</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearContext}
                    disabled={loading || !currentContext.trim()}
                    className="mt-3 inline-flex items-center gap-1.5 border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/52 transition hover:border-[#E9B44C]/45 hover:text-[#F2C260] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 size={12} />
                    Limpiar
                  </button>
                </label>

                <div className="border border-[#00B4D8]/20 bg-[#0B192C] p-4">
                  <button
                    type="button"
                    onClick={() => setNotebookHelpOpen(true)}
                    className="mb-3 flex aspect-video w-full items-center justify-center border border-[#00B4D8]/20 bg-[#061224] p-5 transition hover:border-[#00B4D8]/55 hover:bg-[#00B4D8]/8"
                    title="Ver guia visual de NotebookLM"
                  >
                    <img src={NOTEBOOK_ICON} alt="NotebookLM" className="max-h-full max-w-full object-contain opacity-95" />
                  </button>
                  <p className="text-[11px] font-bold text-white">Prompt para NotebookLM</p>
                  <p className="mt-1 text-[10px] leading-5 text-white/52">
                    Copia esta instruccion, pegala en NotebookLM y trae el consolidado. Haz click en el icono para ver la guia visual; el prompt ya indica que esta unidad abarca semanas {unitWeekRange.start} a {unitWeekRange.end}.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="mt-3 flex h-9 items-center gap-1.5 border border-[#00B4D8]/35 px-3 text-[10px] font-bold text-[#72E7F6] hover:bg-[#00B4D8]/10"
                  >
                    {copiedPrompt ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    {copiedPrompt ? 'Prompt copiado' : 'Copiar prompt'}
                  </button>
                  <div className="mt-4 border border-[#E9B44C]/20 bg-[#E9B44C]/8 p-3">
                    <div className="flex gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#E9B44C]" />
                      <p className="text-[10px] leading-5 text-[#F2C260]/82">
                        Este contexto es obligatorio para reducir respuestas genericas. No reemplaza los desempenos oficiales; solo aterriza la didactica.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveContextAndContinue}
                    disabled={loading || !contextReady}
                    className="mt-4 flex w-full items-center justify-center gap-2 bg-[#00A896] px-4 py-3 text-[11px] font-bold text-white transition hover:bg-[#00B4D8] disabled:opacity-45"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <FileCheck2 size={13} />}
                    Guardar contexto y continuar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-col gap-2 border border-white/10 bg-[#0B192C] px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">Contexto cargado</p>
                    <p className="mt-1 text-[11px] text-white/58">
                      La IA usara el resumen de unidad como insumo principal para proponer actividades didacticas.
                    </p>
                  </div>
                  <span className="font-jetbrains text-[11px] font-bold text-[#72E7F6]">
                    {currentContext.trim().length} caracteres
                  </span>
                </div>
                <WeekTable
                  weeks={weeks}
                  busyWeek={busyWeek}
                  disabled={loading}
                  onLock={handleLock}
                  onEdit={openEdit}
                  onRetry={openRetry}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/evaluacion')}
          className="flex items-center gap-1.5 text-[11px] text-white/46 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a evaluacion
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={!currentGeneration || loading || currentScreen === 'context'}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:opacity-45"
        >
          {selectedUnit < unitCount ? 'Aprobar y avanzar' : 'Aprobar y cerrar'}
          <ArrowRight size={12} />
        </button>
      </div>

      {dialogMode === 'edit' && editingWeek ? (
        <EditWeekDialog
          week={editingWeek}
          loading={loading}
          onChange={setEditingWeek}
          onClose={() => {
            setEditingWeek(null);
            setDialogMode(null);
          }}
          onSave={saveEditedWeek}
        />
      ) : null}

      {dialogMode === 'regenerate' ? (
        <RegenerateDialog
          instruction={teacherInstruction}
          loading={loading}
          lockedWeeks={lockedWeeks}
          onChange={setTeacherInstruction}
          onClose={() => setDialogMode(null)}
          onRegenerate={() => handleGenerate(true)}
        />
      ) : null}

      {productReferenceOpen ? (
        <ProductReferenceDialog
          product={selectedProduct}
          timeline={productTimeline}
          onClose={() => setProductReferenceOpen(false)}
        />
      ) : null}
      {notebookHelpOpen ? (
        <NotebookHelpDialog onClose={() => setNotebookHelpOpen(false)} />
      ) : null}
    </div>
    </>
  );
}
