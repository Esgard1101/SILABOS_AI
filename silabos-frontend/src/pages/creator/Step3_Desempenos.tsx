import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { CourseDetail, PerformanceDB, SuggestedPerformance } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

type AlignmentState = 'aligned' | 'partial' | 'weak';

interface AlignmentResult {
  score: number;
  state: AlignmentState;
  label: string;
  comment: string;
  matches: string[];
}

const ACTION_VERBS = [
  'analiza',
  'aplica',
  'argumenta',
  'compara',
  'contrasta',
  'diseña',
  'elabora',
  'evalúa',
  'explica',
  'formula',
  'implementa',
  'interpreta',
  'sustenta',
];

const STOP_WORDS = new Set([
  'para',
  'como',
  'desde',
  'sobre',
  'entre',
  'curso',
  'estudiante',
  'estudiantes',
  'aprendizaje',
  'desarrollo',
  'mediante',
  'utilizando',
  'considerando',
]);

function textFragments(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(textFragments);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return textFragments(record.items);
    }
    return Object.values(record).flatMap(textFragments);
  }
  return [];
}

function normalizeText(value: unknown) {
  return textFragments(value)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 4 && !STOP_WORDS.has(token));
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeText(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function courseOfficialFragments(course: CourseDetail | null) {
  if (!course) return [];
  return textFragments([
    course.sumilla,
    course.competencia_egreso,
    course.resultado_aprendizaje,
    course.capacidad,
    ...(course.temas_conocimientos || []),
    ...(course.habilidades_desempenos || []),
  ]);
}

function buildCourseKeywords(course: CourseDetail | null) {
  const fragments = courseOfficialFragments(course);
  const tokens = fragments.flatMap(tokenize);
  const frequency = new Map<string, number>();
  tokens.forEach((token) => frequency.set(token, (frequency.get(token) || 0) + 1));
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .slice(0, 36);
}

function evaluateAlignment(perf: SuggestedPerformance, course: CourseDetail | null): AlignmentResult {
  const statement = normalizeText(perf.statement);
  const keywords = buildCourseKeywords(course);
  const matches = keywords.filter((keyword) => statement.includes(keyword)).slice(0, 5);
  const hasVerb = ACTION_VERBS.some((verb) => statement.includes(normalizeText(verb)));
  const hasOfficialBase = Boolean(course?.sumilla || course?.resultado_aprendizaje || course?.capacidad);

  let score = hasOfficialBase ? 58 : 50;
  score += Math.min(matches.length * 8, 28);
  if (hasVerb) score += 10;
  if (perf.origin === 'official') score += 4;
  if (perf.statement.length > 115) score += 3;
  score = Math.max(45, Math.min(97, score));

  if (score >= 85) {
    return {
      score,
      state: 'aligned',
      label: 'Alineado',
      comment: 'Evidencia correspondencia con la sumilla, capacidad y datos oficiales del curso.',
      matches,
    };
  }

  if (score >= 68) {
    return {
      score,
      state: 'partial',
      label: 'Parcial',
      comment: 'Pertinente, pero conviene precisar el vínculo con el resultado de aprendizaje o la evidencia.',
      matches,
    };
  }

  return {
    score,
    state: 'weak',
    label: 'Revisar',
    comment: 'Requiere ajuste para asegurar actuación observable y trazabilidad con el propósito del curso.',
    matches,
  };
}

function alignmentClasses(state: AlignmentState) {
  if (state === 'aligned') {
    return {
      icon: 'text-[#8BE2A5]',
      badge: 'bg-[#3BA55D]/15 text-[#8BE2A5] ring-[#3BA55D]/25',
      bar: 'bg-[#69D27D]',
    };
  }
  if (state === 'partial') {
    return {
      icon: 'text-[#F2C260]',
      badge: 'bg-[#D4A351]/16 text-[#F2C260] ring-[#D4A351]/25',
      bar: 'bg-[#D4A351]',
    };
  }
  return {
    icon: 'text-[#FF7A70]',
    badge: 'bg-[#FF7A70]/14 text-[#FFB0A8] ring-[#FF7A70]/24',
    bar: 'bg-[#FF7A70]',
  };
}

function mapOfficialPerformance(perf: PerformanceDB, index: number): SuggestedPerformance {
  return {
    code: perf.code ?? `DO-${String(index + 1).padStart(2, '0')}`,
    statement: perf.statement,
    origin: 'official',
    display_order: perf.display_order,
    conocimientos: perf.conocimientos || [],
    habilidades: perf.habilidades || [],
  };
}

function SourceBadge({ origin }: { origin: SuggestedPerformance['origin'] }) {
  if (origin === 'official') {
    return <span className="rounded-full bg-[#00B4CC]/15 px-2 py-0.5 text-[9px] font-bold text-[#77E3F0]">Oficial</span>;
  }
  if (origin === 'teacher_edited_from_ai') {
    return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white/62">Editado</span>;
  }
  return <span className="rounded-full bg-[#D4A351]/15 px-2 py-0.5 text-[9px] font-bold text-[#F2C260]">Sistema</span>;
}

function PerformanceRow({
  performance,
  alignment,
  confirmed,
  onConfirm,
  onObserve,
}: {
  performance: SuggestedPerformance;
  alignment: AlignmentResult;
  confirmed: boolean;
  onConfirm: () => void;
  onObserve: () => void;
}) {
  const classes = alignmentClasses(alignment.state);

  return (
    <tr className="border-b border-white/6 bg-[#041A3A] align-top transition hover:bg-[#08234A]">
      <td className="w-[58px] px-2 py-2">
        <span className="inline-flex rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] font-bold text-[#D4A351]">
          {performance.code}
        </span>
      </td>
      <td className="px-2 py-2">
        <p className="overflow-hidden text-[11px] font-medium leading-4 text-white/86 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {performance.statement}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <SourceBadge origin={performance.origin} />
          {alignment.matches.slice(0, 2).map((match) => (
            <span key={match} className="rounded-full bg-white/6 px-1.5 py-0.5 text-[8px] text-white/42">
              {match}
            </span>
          ))}
        </div>
      </td>
      <td className="w-[108px] px-2 py-2">
        <div className="flex items-center gap-1.5">
          {alignment.state === 'aligned' ? (
            <CheckCircle2 size={14} className={classes.icon} />
          ) : (
            <AlertCircle size={14} className={classes.icon} />
          )}
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold ring-1 ${classes.badge}`}>
              {alignment.label} {alignment.score}%
            </span>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${classes.bar}`} style={{ width: `${alignment.score}%` }} />
            </div>
          </div>
        </div>
      </td>
      <td className="w-[150px] px-2 py-2">
        <p className="overflow-hidden text-[9px] leading-4 text-white/58 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {alignment.comment}
        </p>
      </td>
      <td className="w-[310px] px-2 py-2">
        <div className="flex flex-nowrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[8.5px] font-bold transition ${
              confirmed
                ? 'border-[#3BA55D]/30 bg-[#3BA55D]/12 text-[#8BE2A5]'
                : 'border-[#00B4CC]/26 text-[#77E3F0] hover:border-[#00B4CC]/45 hover:text-white'
            }`}
          >
            <CheckCircle2 size={10} />
            {confirmed ? 'Confirmado' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={onObserve}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[8.5px] font-semibold text-white/58 transition hover:border-white/30 hover:text-white"
          >
            <MessageCircle size={10} />
            Observar
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Step3_Desempenos() {
  const navigate = useNavigate();
  const {
    draftId,
    courseDetail,
    setCourseDetail,
    draftPerformances,
    setDraftPerformances,
    performancesOrigin,
    setPerformancesOrigin,
    purposeNotes,
    setPurposeNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const [officialPerfs, setOfficialPerfs] = useState<SuggestedPerformance[]>([]);
  const [loadingOfficial, setLoadingOfficial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmedCodes, setConfirmedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!draftId && !courseDetail?.id) {
      setLoadingOfficial(false);
      return;
    }

    setLoadingOfficial(true);
    const request = draftId
      ? api.getWizardCourseData(draftId)
      : api.getCoursePerformances(courseDetail!.id);

    request
      .then((res) => {
        const data = res.data as
          | { course?: CourseDetail; performances?: SuggestedPerformance[] }
          | { items?: PerformanceDB[] }
          | undefined;
        if (data && 'course' in data && data.course) {
          setCourseDetail(data.course);
        }
        const mapped = data && 'performances' in data
          ? (data.performances || []).map((perf, index) => ({
              ...perf,
              code: perf.code || perf.codigo || `D${index + 1}`,
              origin: 'official' as const,
            }))
          : ((data as { items?: PerformanceDB[] } | undefined)?.items || []).map(mapOfficialPerformance);
        setOfficialPerfs(mapped);
        if (draftPerformances.length === 0 && mapped.length > 0) {
          setDraftPerformances(mapped);
          setPerformancesOrigin('official');
          setConfirmedCodes(mapped.map((performance) => performance.code));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOfficial(false));
  }, [courseDetail?.id, draftId, draftPerformances.length, setCourseDetail, setDraftPerformances, setPerformancesOrigin]);

  const visiblePerfs = officialPerfs.length > 0 ? officialPerfs : draftPerformances;
  const alignments = useMemo(
    () => visiblePerfs.map((performance) => evaluateAlignment(performance, courseDetail)),
    [courseDetail, visiblePerfs],
  );
  const generalScore = alignments.length
    ? Math.round(alignments.reduce((total, item) => total + item.score, 0) / alignments.length)
    : 0;
  const alignedCount = alignments.filter((item) => item.state === 'aligned').length;
  const partialCount = alignments.filter((item) => item.state === 'partial').length;
  const weakCount = alignments.filter((item) => item.state === 'weak').length;
  const officialDataCount = courseOfficialFragments(courseDetail).length;
  const handleConfirm = (performance: SuggestedPerformance) => {
    setConfirmedCodes((current) => (
      current.includes(performance.code)
        ? current.filter((code) => code !== performance.code)
        : [...current, performance.code]
    ));
  };

  const handleObserve = (performance: SuggestedPerformance, alignment: AlignmentResult) => {
    const nextNote = `[${performance.code}] ${alignment.comment}`;
    setPurposeNotes((current) => (current.trim() ? `${current.trim()}\n${nextNote}` : nextNote));
    showToast('Observación agregada', 'success');
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const selectedPerformances = visiblePerfs;
      await saveStep('purpose', {
        performances: selectedPerformances,
        performances_origin: selectedPerformances.length > 0 ? 'official' : performancesOrigin,
        teacher_notes: purposeNotes,
        alignment_summary: {
          score: generalScore,
          aligned: alignedCount,
          partial: partialCount,
          weak: weakCount,
          confirmed_codes: confirmedCodes,
        },
      });
      navigate('/creator/contenido');
    } catch {
      showToast('Error al guardar desempeños', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-3 text-white sm:px-6">
        <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <button
              type="button"
              onClick={() => navigate('/creator/fuentes')}
              className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-white/42 transition hover:text-white"
            >
              <ArrowLeft size={12} />
              Volver a Fuentes
            </button>
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-[#D4A351]">
              PASO 5 DE 8 - DESEMPEÑOS
            </p>
            <h1 className="font-playfair text-[1.55rem] font-bold leading-tight text-white">
              Desempeños oficiales
            </h1>
            <p className="mt-0.5 max-w-3xl text-[10px] leading-4 text-white/62">
              Revise los desempeños oficiales del Anexo 2 antes de pasar al programa de contenidos.
            </p>
          </div>

          <aside className="rounded-xl border border-[#D4A351]/24 bg-[#0A2753] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-white">Alineamiento general</p>
                <p className="mt-0.5 text-[26px] font-black leading-none text-[#8BE2A5]">{generalScore || '--'}%</p>
              </div>
              <ShieldCheck size={15} className="text-[#D4A351]" />
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#D4A351] to-[#69D27D]" style={{ width: `${generalScore}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
              <span className="text-[#8BE2A5]">● {alignedCount} alineado</span>
              <span className="text-[#F2C260]">● {partialCount} parcial</span>
              <span className="text-[#FFB0A8]">● {weakCount} revisar</span>
            </div>
          </aside>
        </div>

        <div className="mb-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(280px,390px)]">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#D4A351]/24 bg-[#0A2753] px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#F2C260]" />
              <div>
                <p className="text-[11px] font-bold text-[#F2C260]">Desempeños oficiales del curso</p>
                <p className="text-[9px] leading-4 text-white/50">
                  La cantidad de unidades se tomará de estos desempeños oficiales.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/8 px-2 py-1 text-[9px] font-bold text-white/70">
              {officialPerfs.length}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#00B4CC]/18 bg-[#00B4CC]/6 px-3 py-2">
            <Info size={14} className="shrink-0 text-[#77E3F0]" />
            <p className="text-[10px] leading-4 text-white/62">
              Datos curriculares oficiales detectados: {officialDataCount}. El método se aplicará después.
            </p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-end gap-3">
          <span className="text-[8px] uppercase tracking-[0.18em] text-white/36">
              Propósito {"->"} Contenido {"->"} Método {"->"} Evaluación
          </span>
        </div>

        {loadingOfficial ? (
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Loader2 size={12} className="animate-spin" /> Cargando desempeños oficiales...
          </div>
        ) : visiblePerfs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0A2753] px-4 py-8 text-center">
            <p className="text-[12px] text-white/48">No hay desempeños oficiales registrados para este curso.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D4A351]/22 bg-[#041A3A]">
            <table className="w-full min-w-[1020px] table-fixed text-left">
              <thead className="bg-[#0A2753]">
                <tr className="border-b border-[#D4A351]/18">
                  <th className="w-[58px] px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#F2C260]/72">Cód.</th>
                  <th className="px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#F2C260]/72">Desempeño</th>
                  <th className="w-[108px] px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#F2C260]/72">Alineamiento</th>
                  <th className="w-[150px] px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#F2C260]/72">Comentario</th>
                  <th className="w-[310px] px-2 py-1.5 text-right text-[8px] font-bold uppercase tracking-[0.16em] text-[#F2C260]/72">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visiblePerfs.map((performance, index) => {
                  const alignment = alignments[index];
                  return (
                    <React.Fragment key={`${performance.code}-${index}`}>
                      <PerformanceRow
                        performance={performance}
                        alignment={alignment}
                        confirmed={confirmedCodes.includes(performance.code)}
                        onConfirm={() => handleConfirm(performance)}
                        onObserve={() => handleObserve(performance, alignment)}
                      />
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Observaciones del docente
          </label>
          <textarea
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#0A2753] px-4 py-3 text-[12px] text-white outline-none focus:border-[#D4A351]/40"
            rows={2}
            placeholder="Observaciones o ajustes sobre los desempeños..."
            value={purposeNotes}
            onChange={(event) => setPurposeNotes(event.target.value)}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-1.5 text-[12px] text-white/42 transition hover:text-white"
          >
            <ArrowLeft size={13} />
            Volver a Fuentes
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving || (draftPerformances.length === 0 && officialPerfs.length === 0)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-6 py-3 text-[12px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Guardar y continuar
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
