import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { GradingRow, ProgressiveProductOption } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

const SEGMENT_COLORS = ['#D4A351', '#00B4CC', '#6C85C2', '#A8D8A8', '#E8A0A0', '#C4A0D8'];

const DEFAULT_GRADING_ROWS: GradingRow[] = [
  { evidencia: 'Tareas', sigla: 'TA', porcentaje: 15, cronograma: 'Permanente' },
  { evidencia: 'Producto Acreditable 1', sigla: 'PA1', porcentaje: 35, cronograma: 'Semana 8' },
  { evidencia: 'Examen Parcial', sigla: 'EP', porcentaje: 15, cronograma: 'Semana 12' },
  { evidencia: 'Producto Acreditable 2', sigla: 'PA2', porcentaje: 35, cronograma: 'Semana 16' },
];

function buildAccreditableRows(productCount = 2): GradingRow[] {
  const count = Math.max(1, Math.min(Math.trunc(productCount || 2), 8));
  const taskPct = 15;
  const examPct = 15;
  const remaining = 100 - taskPct - examPct;
  const base = Math.floor(remaining / count);
  const weekPresets: Record<number, number[]> = {
    1: [16],
    2: [8, 16],
    3: [4, 8, 16],
    4: [4, 8, 12, 16],
  };
  const productWeeks = weekPresets[count];
  return [
    { evidencia: 'Tareas', sigla: 'TA', porcentaje: taskPct, cronograma: 'Permanente' },
    ...Array.from({ length: count }, (_, index) => {
      const row = {
        evidencia: `Producto Acreditable ${index + 1}`,
        sigla: `PA${index + 1}`,
        porcentaje: index < count - 1 ? base : remaining - base * (count - 1),
        cronograma: `Semana ${productWeeks?.[index] ?? Math.max(1, Math.round((16 * (index + 1)) / count))}`,
      };
      return index === Math.max(0, count - 2)
        ? [row, { evidencia: 'Examen Parcial', sigla: 'EP', porcentaje: examPct, cronograma: 'Semana 12' }]
        : [row];
    }).flat(),
  ];
}

function normalizeKey(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function paIndex(sigla: string) {
  const match = /^PA\s*(\d+)$/i.exec(String(sigla || '').trim());
  return match ? Number(match[1]) : null;
}

function productTimelineEntries(product?: ProgressiveProductOption | null) {
  return Object.entries(product?.timeline_json || {})
    .filter(([, value]) => String(value || '').trim())
    .sort(([left], [right]) => {
      const leftIndex = paIndex(left) ?? 999;
      const rightIndex = paIndex(right) ?? 999;
      return leftIndex - rightIndex || left.localeCompare(right);
    });
}

function productTimelineCount(product?: ProgressiveProductOption | null) {
  const entries = productTimelineEntries(product);
  const paEntries = entries.filter(([code]) => paIndex(code) !== null);
  return paEntries.length || entries.length;
}

function productKey(product?: ProgressiveProductOption | null) {
  if (!product) return '';
  return [
    product.id || '',
    product.title || '',
    product.work_object || '',
    JSON.stringify(product.timeline_json || {}),
  ].join('|');
}

function weekFromTimeline(value: string) {
  const match = /\bSemana\s+(\d{1,2})\b/i.exec(value);
  return match ? `Semana ${match[1]}` : '';
}

function stripTimelinePrefix(value: string) {
  return String(value || '')
    .trim()
    .replace(/^\s*(PA\s*\d+|PAFINAL|PF)\s*[:.)-]\s*/i, '')
    .replace(/^\s*Semana\s+\d{1,2}\s*[:.)-]\s*/i, '')
    .trim();
}

function evidenceFromTimeline(code: string, value: string) {
  const detail = stripTimelinePrefix(value);
  return `${code}: ${detail || value}`;
}

function rowsWithSelectedProductTimeline(
  rows: GradingRow[],
  product: ProgressiveProductOption,
  productCount: number,
) {
  const entries = productTimelineEntries(product);
  if (!entries.length) return rows;

  const paRows = rows.filter((row) => paIndex(row.sigla) !== null);
  const sourceRows = paRows.length === productCount
    ? rows
    : productCount === 2
      ? DEFAULT_GRADING_ROWS
      : buildAccreditableRows(productCount);

  const byCode = new Map(entries.map(([code, value]) => [normalizeKey(code).replace(/\s+/g, ''), value]));
  return sourceRows.map((row) => {
    const index = paIndex(row.sigla);
    if (!index) return row;

    const code = `PA${index}`;
    const timelineValue = byCode.get(normalizeKey(code).replace(/\s+/g, '')) || entries[index - 1]?.[1];
    if (!timelineValue) return row;

    return {
      ...row,
      evidencia: evidenceFromTimeline(code, timelineValue),
      cronograma: weekFromTimeline(timelineValue) || row.cronograma,
    };
  });
}

function sameRows(left: GradingRow[], right: GradingRow[]) {
  return JSON.stringify(left) === JSON.stringify(right);
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

function isLegacyDefault(rows: GradingRow[], productCount = 2) {
  const paCount = rows.filter((row) => /^PA\d+$/i.test(row.sigla)).length;
  return (
    (rows.length === 3
      && rows[0]?.sigla === 'TA'
      && rows[0]?.porcentaje === 40
      && rows[1]?.sigla === 'PA1'
      && rows[1]?.porcentaje === 30
      && rows[2]?.sigla === 'PA2'
      && rows[2]?.porcentaje === 30)
    || paCount !== productCount
  );
}

function DonutChart({ rows }: { rows: GradingRow[] }) {
  const circ = 2 * Math.PI * 48;
  let offset = 0;
  const arcs = rows.map((row, i) => {
    const dash = (row.porcentaje / 100) * circ;
    const arc = {
      dash,
      gap: circ - dash,
      offset,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      sigla: row.sigla,
      pct: row.porcentaje,
    };
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
  const add = () => {
    onChange([...rows, { evidencia: 'Nueva evidencia', sigla: 'EV', porcentaje: 0, cronograma: '' }]);
  };

  return (
    <div>
      <div className="overflow-hidden border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-[#0B192C]">
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Evidencia</th>
              <th className="w-16 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Sigla</th>
              <th className="w-16 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">%</th>
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Cronograma</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 bg-[#162A45]">
                <td className="px-2 py-1.5">
                  <input
                    className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/25"
                    value={row.evidencia}
                    onChange={(e) => update(i, 'evidencia', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full bg-transparent font-jetbrains text-[11px] font-bold text-[#E9B44C] outline-none"
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
                  <button type="button" onClick={() => remove(i)} className="text-white/20 hover:text-red-400">
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
        className="mt-2 flex items-center gap-1 text-[10px] text-white/40 hover:text-[#E9B44C]"
      >
        <Plus size={11} />
        Agregar evidencia
      </button>
    </div>
  );
}

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
  } = useSyllabus();

  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProgressiveProductOption | null>(null);
  const [appliedProductKey, setAppliedProductKey] = useState('');
  const [loadingProductState, setLoadingProductState] = useState(Boolean(draftId));
  const selectedProductKey = productKey(selectedProduct);
  const productCount = Math.max(1, draftPerformances.length || productTimelineCount(selectedProduct) || 2);

  useEffect(() => {
    if (isLegacyDefault(gradingRows, productCount)) {
      setGradingRows(productCount === 2 ? DEFAULT_GRADING_ROWS : buildAccreditableRows(productCount));
      setGradingOrigin('none');
    }
  }, [gradingRows, productCount, setGradingOrigin, setGradingRows]);

  useEffect(() => {
    if (!draftId) {
      setLoadingProductState(false);
      return;
    }
    let active = true;
    setLoadingProductState(true);
    api.getProgressiveCurriculumState(draftId)
      .then((response) => {
        if (!active) return;
        const stateProduct = response.data.progressive_curriculum?.selected_product
          || response.data.product_options?.find((option) => option.selected)
          || null;
        setSelectedProduct(stateProduct);
        if (!stateProduct) setLoadingProductState(false);
      })
      .catch(() => {
        if (active) setSelectedProduct(null);
        if (active) setLoadingProductState(false);
      });
    return () => {
      active = false;
    };
  }, [draftId]);

  useEffect(() => {
    if (!selectedProduct || !selectedProductKey || appliedProductKey === selectedProductKey || gradingOrigin === 'manual') {
      if (selectedProductKey && (appliedProductKey === selectedProductKey || gradingOrigin === 'manual')) {
        setLoadingProductState(false);
      }
      return;
    }

    const nextRows = rowsWithSelectedProductTimeline(gradingRows, selectedProduct, productCount);
    if (!sameRows(gradingRows, nextRows)) {
      setGradingRows(nextRows);
      setGradingOrigin('ai_suggested');
    }
    setAppliedProductKey(selectedProductKey);
    setLoadingProductState(false);
  }, [
    appliedProductKey,
    gradingOrigin,
    gradingRows,
    productCount,
    selectedProduct,
    selectedProductKey,
    setGradingOrigin,
    setGradingRows,
  ]);

  const handleRowsChange = (nextRows: GradingRow[]) => {
    setGradingOrigin('manual');
    setGradingRows(nextRows);
  };

  const totalPct = gradingRows.reduce((s, r) => s + r.porcentaje, 0);
  const checks = [
    { label: 'Desempenos confirmados', ok: draftPerformances.length > 0 },
    { label: 'Habilidades y contenido propuestos', ok: habilidadesSugeridas.length > 0 },
    { label: 'Metodo didactico seleccionado', ok: !!selectedMethodId },
    { label: 'Sistema de evaluacion con evidencias', ok: gradingRows.length > 0 },
    { label: 'Ponderacion total = 100%', ok: totalPct === 100 },
  ];
  const allOk = checks.every((c) => c.ok);

  const handleContinue = async () => {
    if (!draftId) return;
    setSavingEvaluation(true);
    try {
      await saveStep('grading', {
        rows: gradingRows,
        template_origin: gradingOrigin,
        total_percent: totalPct,
        teacher_notes: gradingNotes,
      });
      showToast('Sistema de evaluacion guardado', 'success');
      navigate('/creator/programa');
    } catch {
      showToast('No se pudo guardar la evaluacion', 'error');
    } finally {
      setSavingEvaluation(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
      {loadingProductState ? (
        <BlockingLoader
          title="Sincronizando evaluacion"
          message="Estamos recuperando el producto seleccionado y aplicando sus avances PA antes de mostrar la tabla."
        />
      ) : null}
      {savingEvaluation ? (
        <BlockingLoader
          title="Guardando evaluacion"
          message="Estamos consolidando pesos, evidencias y cronograma para continuar al programa semanal."
        />
      ) : null}
      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
          Paso 9 de 11 - Sistema de evaluacion
        </p>
        <h1 className="font-playfair text-2xl font-bold text-white">Cronologia de evaluacion</h1>
        <p className="mt-1 text-[11px] text-white/60">
          Define pesos y semanas de entrega para que el motor progresivo oriente los avances PA.
        </p>
        {selectedProduct ? (
          <div className="mt-3 border border-[#00B4D8]/25 bg-[#00B4D8]/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6FE9F5]">
              Producto seleccionado aplicado a PA
            </p>
            <p className="mt-1 text-[12px] font-semibold text-white">{selectedProduct.title}</p>
            {selectedProduct.work_object ? (
              <p className="mt-1 text-[10px] leading-4 text-white/58">{selectedProduct.work_object}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            Evidencias y pesos
          </p>
          <GradingTable rows={gradingRows} onChange={handleRowsChange} />
          {gradingRows.length > 0 && totalPct !== 100 && (
            <p className="text-[10px] font-semibold text-red-400">
              Total actual: {totalPct}% - debe sumar exactamente 100%.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {gradingRows.length > 0 && (
            <div className="border border-white/10 bg-[#162A45] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                Distribucion
              </p>
              <DonutChart rows={gradingRows} />
            </div>
          )}

          <div className="border border-white/10 bg-[#162A45] p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              Checklist
            </p>
            <ul className="space-y-2.5">
              {checks.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-[#00B4D8]' : 'border border-white/20'}`}>
                    {c.ok && <Check size={9} className="text-[#0B192C]" />}
                  </span>
                  <span className={`text-[11px] leading-snug ${c.ok ? 'text-white/80' : 'text-white/35'}`}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Observaciones de evaluacion
        </label>
        <textarea
          className="w-full resize-none border border-white/10 bg-[#162A45] px-3 py-2 text-[11px] text-white outline-none focus:border-[#00B4D8]/50"
          rows={2}
          placeholder="Notas sobre pesos, semanas de PA o condiciones de evaluacion."
          value={gradingNotes}
          onChange={(e) => setGradingNotes(e.target.value)}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/producto')}
          className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a producto
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={savingEvaluation || !allOk || !draftId}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          title={!allOk ? 'Completa el checklist antes de continuar' : undefined}
        >
          {savingEvaluation ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              Continuar al programa
              <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
