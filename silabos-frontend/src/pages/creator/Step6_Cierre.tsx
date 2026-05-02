import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../../api/client';
import type { GradingRow } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

// ─── Donut chart ─────────────────────────────────────────────────────────────

const SEGMENT_COLORS = ['#D4A351', '#00B4CC', '#6C85C2', '#A8D8A8', '#E8A0A0', '#C4A0D8'];

const DEFAULT_GRADING_ROWS: GradingRow[] = [
  { evidencia: 'Tareas', sigla: 'TA', porcentaje: 15, cronograma: 'Permanente' },
  { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 15, cronograma: 'Semana 4' },
  { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 20, cronograma: 'Semana 8' },
  { evidencia: 'Examen Parcial', sigla: 'EP', porcentaje: 15, cronograma: 'Semana 12' },
  { evidencia: 'Producto Acreditable 3', sigla: 'PA3', porcentaje: 35, cronograma: 'Semana 16' },
];

function isLegacyDefault(rows: GradingRow[]) {
  return (
    rows.length === 3
    && rows[0]?.sigla === 'TA'
    && rows[0]?.porcentaje === 40
    && rows[1]?.sigla === 'PA1'
    && rows[1]?.porcentaje === 30
    && rows[2]?.sigla === 'PA2'
    && rows[2]?.porcentaje === 30
  );
}

function DonutChart({ rows }: { rows: GradingRow[] }) {
  const circ = 2 * Math.PI * 48;
  let offset = 0;
  const arcs = rows.map((row, i) => {
    const dash = (row.porcentaje / 100) * circ;
    const arc = { dash, gap: circ - dash, offset, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], sigla: row.sigla, pct: row.porcentaje };
    offset += dash;
    return arc;
  });
  const total = rows.reduce((s, r) => s + r.porcentaje, 0);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke={arc.color}
            strokeWidth="14"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
          />
        ))}
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">
          {total}
        </text>
        <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
          %
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: arc.color }} />
            <span className="text-[9px] text-white/60">
              {arc.sigla} {arc.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Grading table ────────────────────────────────────────────────────────────

function GradingTable({
  rows,
  onChange,
}: {
  rows: GradingRow[];
  onChange: (rows: GradingRow[]) => void;
}) {
  const update = (i: number, field: keyof GradingRow, value: string | number) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...rows,
      { evidencia: 'Nueva evidencia', sigla: 'EV', porcentaje: 0, cronograma: '' },
    ]);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-[#0A2753]">
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Evidencia
              </th>
              <th className="w-16 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Sigla
              </th>
              <th className="w-16 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                %
              </th>
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Cronograma
              </th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 bg-[#041A3A]">
                <td className="px-2 py-1.5">
                  <input
                    className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/25"
                    value={row.evidencia}
                    onChange={(e) => update(i, 'evidencia', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full bg-transparent font-mono text-[11px] font-bold text-[#D4A351] outline-none"
                    value={row.sigla}
                    onChange={(e) => update(i, 'sigla', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="number"
                    className="w-14 bg-transparent text-center text-[11px] text-white outline-none"
                    value={row.porcentaje}
                    min={0}
                    max={100}
                    onChange={(e) => update(i, 'porcentaje', Number(e.target.value))}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full bg-transparent text-[11px] text-white/70 outline-none"
                    value={row.cronograma}
                    onChange={(e) => update(i, 'cronograma', e.target.value)}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-white/20 hover:text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 flex items-center gap-1 text-[10px] text-white/40 hover:text-[#D4A351]"
      >
        <Plus size={11} /> Agregar evidencia
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step6_Cierre() {
  const navigate = useNavigate();
  const {
    draftId,
    draftPerformances,
    habilidadesSugeridas,
    selectedMethodId,
    gradingRows,
    setGradingRows,
    gradingOrigin,
    setGradingOrigin,
    gradingNotes,
    setGradingNotes,
    saveStep,
    showToast,
    setAssembled,
    setFinalSyllabusId,
    setRequiresValidation,
  } = useSyllabus();

  const [assembling, setAssembling] = useState(false);
  const [aiRecoveryVisible, setAiRecoveryVisible] = useState(false);

  useEffect(() => {
    if (isLegacyDefault(gradingRows)) {
      setGradingRows(DEFAULT_GRADING_ROWS);
      setGradingOrigin('none');
    }
  }, [gradingRows, setGradingOrigin, setGradingRows]);

  const totalPct = gradingRows.reduce((s, r) => s + r.porcentaje, 0);

  const checks = [
    { label: 'Desempeños confirmados', ok: draftPerformances.length > 0 },
    { label: 'Habilidades y contenido propuestos', ok: habilidadesSugeridas.length > 0 },
    { label: 'Método didáctico seleccionado', ok: !!selectedMethodId },
    { label: 'Sistema de evaluación con evidencias', ok: gradingRows.length > 0 },
    { label: 'Ponderación total = 100%', ok: totalPct === 100 },
  ];
  const allOk = checks.every((c) => c.ok);

  const isAiAvailabilityError = (error: unknown) => {
    if (!(error instanceof ApiError)) return false;
    if (error.status !== 503 && error.status !== 429) return false;
    const detail = (error.details as { detail?: unknown } | undefined)?.detail;
    return (
      error.status === 503 ||
      (typeof detail === 'object' &&
        detail !== null &&
        'code' in detail &&
        detail.code === 'AI_PROVIDER_SATURATED')
    );
  };

  const isTimeoutOrNetworkError = (error: unknown) => {
    if (error instanceof ApiError) return false;
    if (!(error instanceof Error)) return false;
    return /excedio el tiempo|tiempo de espera|Error de conexion|NetworkError|Failed to fetch|aborted/i.test(
      error.message,
    );
  };

  const pollAssembledSyllabus = async (
    syllabusId: string,
    attempts = 12,
    intervalMs = 5000,
  ): Promise<boolean> => {
    for (let i = 0; i < attempts; i++) {
      try {
        const resp = await api.getSyllabus(syllabusId);
        const payload = (resp?.data as { payload_json?: { _assembled?: boolean } } | undefined)?.payload_json;
        if (payload?._assembled) {
          return true;
        }
      } catch {
        // ignore, continue polling
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  };

  const handleAssemble = async (forceProvider?: 'gemini' | 'openrouter') => {
    if (!draftId) return;
    setAssembling(true);
    setAiRecoveryVisible(false);
    try {
      await saveStep('grading', {
        rows: gradingRows,
        template_origin: gradingOrigin,
        total_percent: totalPct,
        teacher_notes: gradingNotes,
      });
      const res = await api.assembleFinal(draftId, forceProvider ? { forceProvider } : undefined);
      const d = res.data;
      if (d?.syllabus_id) {
        setFinalSyllabusId(d.syllabus_id);
        setAssembled(true);
        setRequiresValidation(d.requires_academic_validation ?? false);
        navigate(`/editor?id=${d.syllabus_id}`);
      }
    } catch (error) {
      if (isTimeoutOrNetworkError(error)) {
        showToast(
          'La IA está tardando más de lo esperado. Esperando a que termine en segundo plano...',
          'warning',
        );
        const completed = await pollAssembledSyllabus(draftId);
        if (completed) {
          showToast('Sílabo generado correctamente. Redirigiendo al editor...', 'success');
          setFinalSyllabusId(draftId);
          setAssembled(true);
          navigate(`/editor?id=${draftId}`);
        } else {
          showToast(
            'La IA aún no termina. Espera unos segundos e intenta de nuevo, o abre el sílabo desde la lista.',
            'warning',
          );
        }
      } else if (isAiAvailabilityError(error)) {
        setAiRecoveryVisible(true);
        showToast('Servidor IA con alta demanda. Puedes reintentar o usar el alternativo.', 'warning');
      } else {
        showToast('Error al ensamblar el sílabo', 'error');
      }
    } finally {
      setAssembling(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
          PASO 8 DE 8 — EVALUACIÓN Y CIERRE
        </p>
        <h1 className="font-playfair text-2xl font-bold text-white">Validación y publicación</h1>
        <p className="mt-1 text-[11px] text-white/60">
          Configura el sistema de evaluación y ensambla el sílabo final.
        </p>
      </div>

      {/* ── Main content grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Grading table — 2 cols */}
        <div className="space-y-3 lg:col-span-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">
              Sistema de evaluación
            </p>
          </div>
          <GradingTable rows={gradingRows} onChange={setGradingRows} />
          {gradingRows.length > 0 && totalPct !== 100 && (
            <p className="text-[10px] font-semibold text-red-400">
              Total actual: {totalPct}% — debe sumar exactamente 100%.
            </p>
          )}
        </div>

        {/* Sidebar: donut + checklist */}
        <div className="space-y-4">
          {gradingRows.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#0A2753] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">
                Distribución
              </p>
              <DonutChart rows={gradingRows} />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#0A2753] p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">
              Checklist de cierre
            </p>
            <ul className="space-y-2.5">
              {checks.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      c.ok ? 'bg-[#00B4CC]' : 'border border-white/20'
                    }`}
                  >
                    {c.ok && <Check size={9} className="text-[#041A3A]" />}
                  </span>
                  <span
                    className={`text-[11px] leading-snug ${c.ok ? 'text-white/80' : 'text-white/35'}`}
                  >
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Observaciones finales
        </label>
        <textarea
          className="w-full resize-none rounded-lg border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
          rows={2}
          placeholder="Notas finales antes de ensamblar el sílabo..."
          value={gradingNotes}
          onChange={(e) => setGradingNotes(e.target.value)}
        />
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      {aiRecoveryVisible && (
        <div className="mt-4 rounded-xl border border-[#D4A351]/35 bg-[#0A2753] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">
            Alta demanda del servidor IA
          </p>
          <p className="mt-2 max-w-3xl text-[11px] leading-5 text-white/65">
            Nuestros servidores principales están experimentando alta demanda. Puedes reintentar o usar nuestro servidor alternativo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAssemble('gemini')}
              disabled={assembling || !allOk || !draftId}
              className="rounded-lg border border-[#00B4CC]/35 px-3 py-2 text-[10px] font-bold text-[#77E3F0] transition hover:bg-[#00B4CC]/10 disabled:opacity-50"
            >
              Reintentar (Servidor Principal)
            </button>
            <button
              type="button"
              onClick={() => handleAssemble('openrouter')}
              disabled={assembling || !allOk || !draftId}
              className="rounded-lg border border-[#D4A351]/40 bg-[#D4A351]/10 px-3 py-2 text-[10px] font-bold text-[#F2C260] transition hover:bg-[#D4A351]/20 disabled:opacity-50"
            >
              Usar Servidor Alternativo
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/metodo')}
          className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a Método
        </button>
        <button
          type="button"
          onClick={() => handleAssemble()}
          disabled={assembling || !allOk || !draftId}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          title={!allOk ? 'Completa todos los ítems del checklist antes de ensamblar' : undefined}
        >
          {assembling ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Ensamblando... (puede tardar hasta 2 min)
            </>
          ) : (
            <>
              <BookOpen size={12} />
              Ensamblar y abrir en Editor
            </>
          )}
        </button>
      </div>
    </div>
  );
}
