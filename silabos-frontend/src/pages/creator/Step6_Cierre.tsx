import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  LayoutGrid,
  Loader2,
  Plus,
  Rows3,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type {
  EvaluationItemPreset,
  GradingMode,
  GradingRow,
  GradingUnit,
  ProgressiveProductOption,
} from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';
import OverlayLoader from '../../components/ui/OverlayLoader';
import GlassModal from '../../components/ui/GlassModal';
import { useWizardStep } from './wizardSteps';
import {
  ITEM_PRESETS,
  applyProductTimeline,
  buildAccreditableRows,
  composePaEvidencia,
  flatToUnits,
  flatTotal,
  normalizePaRows,
  paIndex,
  paLabel,
  perUnitTotals,
  productTimelineCount,
  productTimelineEntries,
  unitInternalTotal,
  unitsToFlat,
} from './gradingModel';

const SEGMENT_COLORS = ['#D4A351', '#00B4CC', '#6C85C2', '#A8D8A8', '#E8A0A0', '#C4A0D8', '#6FE9F5', '#D4AF37'];

const GLASS_CARD = 'rounded-2xl border border-white/12 bg-white/[0.05] backdrop-blur-2xl ring-1 ring-inset ring-white/10';

function sameRows(left: GradingRow[], right: GradingRow[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function productKey(product?: ProgressiveProductOption | null) {
  if (!product) return '';
  return [product.id || '', product.title || '', product.work_object || '', JSON.stringify(product.timeline_json || {})].join('|');
}

function isLegacyTemplate(rows: GradingRow[], productCount: number) {
  const paCount = rows.filter((r) => /^PA\d+$/i.test(r.sigla)).length;
  return paCount !== productCount;
}

function presetToRow(preset: EvaluationItemPreset | null): GradingRow {
  if (!preset) return { evidencia: 'Nueva evidencia', sigla: 'EV', porcentaje: 0, cronograma: '' };
  return {
    evidencia: preset.nombre,
    sigla: preset.sigla,
    porcentaje: preset.pct_sugerido ?? 0,
    cronograma: '',
    preset_id: preset.id,
  };
}

// ── Donut ────────────────────────────────────────────────────────────────────
function DonutChart({ rows, total }: { rows: { sigla: string; porcentaje: number }[]; total: number }) {
  const circ = 2 * Math.PI * 48;
  let offset = 0;
  const arcs = rows.map((row, i) => {
    const dash = (row.porcentaje / 100) * circ;
    const arc = { dash, gap: circ - dash, offset, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], sigla: row.sigla, pct: row.porcentaje };
    offset += dash;
    return arc;
  });

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
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">{total}</text>
        <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">%</text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: arc.color }} />
            <span className="text-[9px] text-white/60">{arc.sigla} {arc.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Menú "Agregar evidencia" con catálogo (8a) ───────────────────────────────
function AddEvidenceMenu({
  onPick,
  presets,
  label = 'Agregar evidencia',
}: {
  onPick: (p: EvaluationItemPreset | null) => void;
  presets: EvaluationItemPreset[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-1 py-1 text-[10px] text-white/45 transition hover:text-[#E9B44C]"
      >
        <Plus size={11} />
        {label}
        <ChevronDown size={10} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-white/12 bg-[#0B192C]/95 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
            <p className="px-3 pt-2 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Catálogo</p>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onPick(p); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-white/80 transition hover:bg-white/5"
              >
                <span><span className="font-jetbrains font-bold text-[#E9B44C]">{p.sigla}</span> · {p.nombre}</span>
                <span className="text-[9px] text-white/40">{p.pct_sugerido ?? 0}%</span>
              </button>
            ))}
            <div className="border-t border-white/10" />
            <button
              type="button"
              onClick={() => { onPick(null); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-[11px] text-white/55 transition hover:bg-white/5"
            >
              + Item personalizado
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Tabla de evidencias (8a: naming PA blindado) ─────────────────────────────
function GradingTable({
  rows,
  onChange,
  presets,
  compact = false,
}: {
  rows: GradingRow[];
  onChange: (rows: GradingRow[]) => void;
  presets: EvaluationItemPreset[];
  compact?: boolean;
}) {
  const update = (i: number, field: keyof GradingRow, value: string | number) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = (preset: EvaluationItemPreset | null) => onChange([...rows, presetToRow(preset)]);

  return (
    <div>
      <div className={`overflow-hidden ${GLASS_CARD}`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Evidencia</th>
              <th className="w-16 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Sigla</th>
              <th className="w-14 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">%</th>
              {!compact ? <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Cronograma</th> : null}
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const n = paIndex(row.sigla);
              return (
                <tr key={i} className="border-b border-white/5 transition hover:bg-white/[0.04]">
                  <td className="px-2 py-1.5">
                    {n !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 font-jetbrains text-[11px] font-bold text-[#E9B44C]">PA{n}:</span>
                        <input
                          className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/25"
                          value={paLabel(row)}
                          placeholder={`Producto Acreditable ${n}`}
                          onChange={(e) => update(i, 'evidencia', composePaEvidencia(row.sigla, e.target.value))}
                        />
                      </div>
                    ) : (
                      <input
                        className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/25"
                        value={row.evidencia}
                        onChange={(e) => update(i, 'evidencia', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {n !== null ? (
                      <span className="font-jetbrains text-[11px] font-bold text-[#E9B44C]/70">{row.sigla}</span>
                    ) : (
                      <input
                        className="w-full bg-transparent font-jetbrains text-[11px] font-bold text-[#E9B44C] outline-none"
                        value={row.sigla}
                        onChange={(e) => update(i, 'sigla', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      className="w-12 bg-transparent text-center text-[11px] text-white outline-none"
                      value={row.porcentaje}
                      min={0}
                      max={100}
                      onChange={(e) => update(i, 'porcentaje', Number(e.target.value))}
                    />
                  </td>
                  {!compact ? (
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full bg-transparent text-[11px] text-white/70 outline-none placeholder:text-white/20"
                        value={row.cronograma}
                        placeholder="Semana X"
                        onChange={(e) => update(i, 'cronograma', e.target.value)}
                      />
                    </td>
                  ) : null}
                  <td className="px-1 py-1.5">
                    <button type="button" onClick={() => remove(i)} className="text-white/20 transition hover:text-red-400">
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <AddEvidenceMenu onPick={add} presets={presets} />
      </div>
    </div>
  );
}

// ── Tarjeta de unidad (8b) ───────────────────────────────────────────────────
function UnitCard({
  unit,
  onChange,
  presets,
}: {
  unit: GradingUnit;
  onChange: (u: GradingUnit) => void;
  presets: EvaluationItemPreset[];
}) {
  const internal = unitInternalTotal(unit);
  const internalOk = internal === 100;
  return (
    <div className={`${GLASS_CARD} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-white">
            <span className="text-[#6FE9F5]">U{unit.unit_index}</span> · {unit.unit_label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[#00B4D8]/25 bg-[#00B4D8]/10 px-2 py-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#6FE9F5]">Peso</span>
          <input
            type="number"
            className="w-10 bg-transparent text-center text-[11px] font-bold text-white outline-none"
            value={unit.weight_pct}
            min={0}
            max={100}
            onChange={(e) => onChange({ ...unit, weight_pct: Number(e.target.value) })}
          />
          <span className="text-[10px] text-white/50">%</span>
        </div>
      </div>
      <GradingTable rows={unit.rows} onChange={(rows) => onChange({ ...unit, rows })} presets={presets} compact />
      <p className={`mt-1 text-[9px] font-semibold ${internalOk ? 'text-white/35' : 'text-amber-300'}`}>
        Interno: {internal}% {internalOk ? '' : '— debe sumar 100% dentro de la unidad'}
      </p>
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
    gradingMode,
    setGradingMode,
    gradingUnits,
    setGradingUnits,
    gradingTransversal,
    setGradingTransversal,
    gradingOrigin,
    setGradingOrigin,
    gradingNotes,
    setGradingNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const { context } = useAppContext();
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProgressiveProductOption | null>(null);
  const [appliedProductKey, setAppliedProductKey] = useState('');
  const [loadingProductState, setLoadingProductState] = useState(Boolean(draftId));
  const [showProductModal, setShowProductModal] = useState(false);
  const [presets, setPresets] = useState<EvaluationItemPreset[]>(ITEM_PRESETS);
  const { current: stepCurrent, total: stepTotal } = useWizardStep();

  // Catálogo de items (8c): globales + del programa; fallback a la constante local.
  useEffect(() => {
    let active = true;
    api.listEvaluationPresets(context?.program_id)
      .then((res) => {
        if (!active) return;
        const items = res.data?.items || [];
        if (items.length) setPresets(items);
      })
      .catch(() => { /* fallback ITEM_PRESETS */ });
    return () => { active = false; };
  }, [context?.program_id]);
  const selectedProductKey = productKey(selectedProduct);
  const productCount = Math.max(1, draftPerformances.length || productTimelineCount(selectedProduct) || 2);

  // Cargar producto seleccionado del estado progresivo
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
        if (active) { setSelectedProduct(null); setLoadingProductState(false); }
      });
    return () => { active = false; };
  }, [draftId]);

  // Normaliza naming PA + corrige plantilla legacy (solo modo global)
  useEffect(() => {
    if (gradingMode !== 'global') return;
    if (gradingOrigin !== 'manual' && isLegacyTemplate(gradingRows, productCount)) {
      setGradingRows(buildAccreditableRows(productCount));
      setGradingOrigin('none');
      return;
    }
    const normalized = normalizePaRows(gradingRows);
    if (!sameRows(normalized, gradingRows)) setGradingRows(normalized);
  }, [gradingRows, gradingMode, gradingOrigin, productCount, setGradingOrigin, setGradingRows]);

  // Aplica el producto seleccionado (solo semana; naming blindado) — modo global
  useEffect(() => {
    if (gradingMode !== 'global') { setLoadingProductState(false); return; }
    if (!selectedProduct || !selectedProductKey) return;
    if (appliedProductKey === selectedProductKey || gradingOrigin === 'manual') {
      setLoadingProductState(false);
      return;
    }
    const nextRows = applyProductTimeline(gradingRows, selectedProduct, productCount);
    if (!sameRows(gradingRows, nextRows)) {
      setGradingRows(nextRows);
      setGradingOrigin('ai_suggested');
    }
    setAppliedProductKey(selectedProductKey);
    setLoadingProductState(false);
  }, [appliedProductKey, gradingMode, gradingOrigin, gradingRows, productCount, selectedProduct, selectedProductKey, setGradingOrigin, setGradingRows]);

  // ── Toggle de modo (8b) ──────────────────────────────────────────────────
  const switchMode = (mode: GradingMode) => {
    if (mode === gradingMode) return;
    if (mode === 'per_unit') {
      const { units, transversal } = flatToUnits(gradingRows, draftPerformances);
      setGradingUnits(units);
      setGradingTransversal(transversal);
    } else {
      setGradingRows(normalizePaRows(unitsToFlat(gradingUnits, gradingTransversal)));
      setGradingOrigin('manual');
    }
    setGradingMode(mode);
  };

  const handleRowsChange = (nextRows: GradingRow[]) => {
    setGradingOrigin('manual');
    setGradingRows(nextRows);
  };

  // ── Totales / validación ──────────────────────────────────────────────────
  const globalTotal = flatTotal(gradingRows);
  const unitTotals = perUnitTotals(gradingUnits, gradingTransversal);
  const weightingOk = gradingMode === 'global' ? globalTotal === 100 : unitTotals.topValid && unitTotals.unitsValid;
  const hasEvidence = gradingMode === 'global' ? gradingRows.length > 0 : gradingUnits.length > 0;

  const donutRows = gradingMode === 'global'
    ? gradingRows
    : [
        ...gradingTransversal,
        ...gradingUnits.map((u) => ({ sigla: `U${u.unit_index}`, porcentaje: u.weight_pct })),
      ];
  const donutTotal = gradingMode === 'global' ? globalTotal : unitTotals.top;

  const checks = [
    { label: 'Desempeños confirmados', ok: draftPerformances.length > 0 },
    { label: 'Habilidades y contenido propuestos', ok: habilidadesSugeridas.length > 0 },
    { label: 'Método didáctico seleccionado', ok: !!selectedMethodId },
    { label: 'Sistema de evaluación con evidencias', ok: hasEvidence },
    { label: gradingMode === 'global' ? 'Ponderación total = 100%' : 'Pesos de unidad + transversales = 100% y cada unidad = 100%', ok: weightingOk },
  ];
  const allOk = checks.every((c) => c.ok);

  const handleContinue = async () => {
    if (!draftId) return;
    setSavingEvaluation(true);
    try {
      let payload: Record<string, unknown>;
      if (gradingMode === 'per_unit') {
        const flat = normalizePaRows(unitsToFlat(gradingUnits, gradingTransversal));
        setGradingRows(flat);
        payload = {
          rows: flat,
          mode: 'per_unit',
          units: gradingUnits,
          transversal: gradingTransversal,
          template_origin: gradingOrigin,
          total_percent: unitTotals.top,
          teacher_notes: gradingNotes,
        };
      } else {
        const rowsToSave = normalizePaRows(gradingRows);
        if (!sameRows(rowsToSave, gradingRows)) setGradingRows(rowsToSave);
        payload = {
          rows: rowsToSave,
          mode: 'global',
          template_origin: gradingOrigin,
          total_percent: globalTotal,
          teacher_notes: gradingNotes,
        };
      }
      await saveStep('grading', payload);
      showToast('Sistema de evaluación guardado', 'success');
      navigate('/creator/programa');
    } catch {
      showToast('No se pudo guardar la evaluación', 'error');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const timelineEntries = productTimelineEntries(selectedProduct);

  return (
    <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
      <OverlayLoader
        show={loadingProductState || savingEvaluation}
        title={loadingProductState ? 'Sincronizando evaluación' : 'Guardando evaluación'}
        message={
          loadingProductState
            ? 'Recuperando el producto seleccionado y aplicando sus avances PA antes de mostrar la tabla.'
            : 'Consolidando pesos, evidencias y cronograma para continuar al programa semanal.'
        }
      />

      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
          Paso {stepCurrent} de {stepTotal} — Sistema de evaluación
        </p>
        <h1 className="font-playfair text-2xl font-bold text-white">Cronología de evaluación</h1>
        <p className="mt-1 text-[11px] text-white/60">
          Define pesos y semanas de entrega para que el motor progresivo oriente los avances PA.
        </p>

        {selectedProduct ? (
          <div className={`mt-3 flex items-start justify-between gap-3 ${GLASS_CARD} border-[#00B4D8]/25 bg-[#00B4D8]/[0.08] px-3 py-2.5`}>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6FE9F5]">Producto acreditable aplicado a PA</p>
              <p className="mt-1 text-[12px] font-semibold text-white">{selectedProduct.title}</p>
              {selectedProduct.work_object ? (
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/55">{selectedProduct.work_object}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowProductModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#00B4D8]/30 bg-[#00B4D8]/10 px-3 py-1.5 text-[10px] font-semibold text-[#6FE9F5] transition hover:bg-[#00B4D8]/20"
            >
              <Eye size={12} />
              Ver producto acreditable
            </button>
          </div>
        ) : null}
      </div>

      {/* Toggle de modo (8b) */}
      <div className="mb-4 inline-flex rounded-xl border border-white/12 bg-white/[0.04] p-1 backdrop-blur-xl">
        {([
          { key: 'global' as const, label: 'Evaluación global', icon: Rows3 },
          { key: 'per_unit' as const, label: 'Matriz por unidad', icon: LayoutGrid },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchMode(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
              gradingMode === key ? 'bg-gradient-to-r from-[#007A8A] to-[#00B4D8] text-white shadow-lg shadow-cyan-950/30' : 'text-white/45 hover:text-white/75'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Evidencias y pesos</p>

          {gradingMode === 'global' ? (
            <>
              <GradingTable rows={gradingRows} onChange={handleRowsChange} presets={presets} />
              {gradingRows.length > 0 && globalTotal !== 100 ? (
                <p className="text-[10px] font-semibold text-amber-300">Total actual: {globalTotal}% — debe sumar exactamente 100%.</p>
              ) : null}
            </>
          ) : (
            <div className="space-y-3">
              {draftPerformances.length === 0 ? (
                <div className={`${GLASS_CARD} p-4 text-[11px] text-white/55`}>
                  Aún no hay desempeños confirmados; la matriz por unidad necesita el número de perfomances oficiales.
                </div>
              ) : null}
              {gradingUnits.map((unit, i) => (
                <UnitCard
                  key={unit.unit_index}
                  unit={unit}
                  presets={presets}
                  onChange={(u) => { setGradingOrigin('manual'); setGradingUnits(gradingUnits.map((x, idx) => (idx === i ? u : x))); }}
                />
              ))}

              {/* Transversales */}
              <div className={`${GLASS_CARD} p-3`}>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Transversales (permanentes)</p>
                <GradingTable
                  rows={gradingTransversal}
                  onChange={(rows) => { setGradingOrigin('manual'); setGradingTransversal(rows); }}
                  presets={presets}
                  compact
                />
              </div>

              <div className={`${GLASS_CARD} px-3 py-2 text-[10px] font-semibold ${unitTotals.topValid ? 'text-white/45' : 'text-amber-300'}`}>
                Pesos de unidad ({unitTotals.unitsWeight}%) + transversales ({unitTotals.transSum}%) = {unitTotals.top}%
                {unitTotals.topValid ? '' : ' — debe sumar 100%.'}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {hasEvidence ? (
            <div className={`${GLASS_CARD} p-4`}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Distribución</p>
              <DonutChart rows={donutRows} total={donutTotal} />
            </div>
          ) : null}

          <div className={`${GLASS_CARD} p-4`}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Checklist</p>
            <ul className="space-y-2.5">
              {checks.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-[#00B4D8]' : 'border border-white/20'}`}>
                    {c.ok && <Check size={9} className="text-[#0B192C]" />}
                  </span>
                  <span className={`text-[11px] leading-snug ${c.ok ? 'text-white/80' : 'text-white/35'}`}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Observaciones de evaluación</label>
        <textarea
          className={`w-full resize-none ${GLASS_CARD} px-3 py-2 text-[11px] text-white outline-none focus:border-[#00B4D8]/50`}
          rows={2}
          placeholder="Notas sobre pesos, semanas de PA o condiciones de evaluación."
          value={gradingNotes}
          onChange={(e) => setGradingNotes(e.target.value)}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/mapa-conocimientos')}
          className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver al mapa
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={savingEvaluation || !allOk || !draftId}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          title={!allOk ? 'Completa el checklist antes de continuar' : undefined}
        >
          {savingEvaluation ? (<><Loader2 size={12} className="animate-spin" />Guardando...</>) : (<>Continuar al programa<ArrowRight size={12} /></>)}
        </button>
      </div>

      {showProductModal && selectedProduct ? (
        <GlassModal
          onClose={() => setShowProductModal(false)}
          size="lg"
          eyebrow="Producto acreditable"
          title={<span className="font-playfair text-lg font-bold text-white">{selectedProduct.title}</span>}
          description="Referencia de los hitos PA. Úsala para nombrar cada avance en la tabla; el nombre que escribas es el que llega al sílabo."
        >
          {selectedProduct.work_object ? (
            <div className={`mb-4 ${GLASS_CARD} border-[#E9B44C]/30 bg-[#E9B44C]/[0.06] p-3`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E9B44C]">Objeto de trabajo</p>
              <p className="mt-1 text-[12px] leading-5 text-white/80">{selectedProduct.work_object}</p>
            </div>
          ) : null}

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6FE9F5]">Línea de tiempo PA</p>
          <ol className="relative space-y-3 border-l border-[#00B4D8]/30 pl-5">
            {timelineEntries.map(([code, value]) => (
              <li key={code} className="relative">
                <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00B4D8] text-[7px] font-bold text-[#0B192C]">
                  {paIndex(code) ?? '•'}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6FE9F5]">{code}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-white/85">{value}</p>
              </li>
            ))}
            {timelineEntries.length === 0 ? (
              <li className="text-[11px] text-white/50">El producto no tiene línea de tiempo cargada.</li>
            ) : null}
          </ol>
        </GlassModal>
      ) : null}
    </div>
  );
}
