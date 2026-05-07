import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Rows3,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { ProgressiveCurriculumState, ProgressiveUnitGeneration } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

function weeksCount(generation: ProgressiveUnitGeneration) {
  return Array.isArray(generation.output_json) ? generation.output_json.length : 0;
}

function timelineEntries(product?: { timeline_json?: Record<string, string> } | null) {
  return Object.entries(product?.timeline_json || {}).filter(([, value]) => String(value || '').trim());
}

export default function Step9_CierreProgresivo() {
  const navigate = useNavigate();
  const {
    draftId,
    draftPerformances,
    showToast,
    setAssembled,
    setFinalSyllabusId,
    setRequiresValidation,
  } = useSyllabus();
  const [state, setState] = useState<ProgressiveCurriculumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [assembling, setAssembling] = useState(false);

  const unitCount = Math.max(1, draftPerformances.length || state?.unit_generations?.length || 1);
  const approved = useMemo(
    () => (state?.unit_generations || []).filter((item) => item.status === 'approved'),
    [state],
  );
  const selectedProduct = state?.progressive_curriculum?.selected_product
    || state?.product_options?.find((item) => item.selected);
  const productTimeline = timelineEntries(selectedProduct);
  const allUnitsApproved = approved.length >= unitCount;
  const productReady = Boolean(selectedProduct?.work_object?.trim());

  const loadState = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    try {
      const response = await api.getProgressiveCurriculumState(draftId);
      setState(response.data);
    } catch {
      showToast('No se pudo cargar el cierre progresivo', 'error');
    } finally {
      setLoading(false);
    }
  }, [draftId, showToast]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleAssemble = async () => {
    if (!draftId) return;
    if (!allUnitsApproved) {
      showToast('Aprueba todas las unidades antes de ensamblar', 'warning');
      return;
    }
    if (!productReady) {
      showToast('El producto acreditable debe tener objeto de trabajo antes de ensamblar', 'warning');
      return;
    }
    setAssembling(true);
    try {
      await api.assembleProgressiveCurriculum(draftId);
      setFinalSyllabusId(draftId);
      setAssembled(true);
      setRequiresValidation(false);
      showToast('Silabo ensamblado con el motor progresivo', 'success');
      navigate(`/final-delivery?id=${draftId}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo ensamblar el silabo progresivo', 'error');
    } finally {
      setAssembling(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
            Paso 12 de 12 - Ensamblaje final
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">Cierre del motor progresivo</h1>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-white/62">
            Consolida el contenido aprobado por unidad y prepara el silabo final con trazabilidad.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-[#00B4D8]">{approved.length}/{unitCount}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Unidades</p>
          </div>
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-[#E9B44C]">{productReady ? 'OK' : '--'}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Producto</p>
          </div>
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-white">{allUnitsApproved ? 'Listo' : 'Pend.'}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Estado</p>
          </div>
        </div>
      </div>

      <section className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="border border-white/10 bg-[#162A45] p-4">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={17} className="text-[#00B4D8]" />
            <p className="text-[13px] font-bold text-white">Producto integrador</p>
          </div>
          <p className="mt-3 text-[16px] font-bold leading-6 text-white">
            {selectedProduct?.title || 'Producto no seleccionado'}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-white/58">
            {selectedProduct?.justification || 'Vuelve al paso de producto para fijar el horizonte del curso.'}
          </p>
        </div>
        <div className="border border-white/10 bg-[#162A45] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[#E9B44C]" />
            <p className="text-[13px] font-bold text-white">Objeto de trabajo</p>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-white/72">
            {selectedProduct?.work_object || 'Objeto de trabajo pendiente de contextualizacion.'}
          </p>
        </div>
        <div className="border border-white/10 bg-[#162A45] p-4">
          <div className="flex items-center gap-2">
            <Rows3 size={17} className="text-[#00B4D8]" />
            <p className="text-[13px] font-bold text-white">Linea PA</p>
          </div>
          <div className="mt-3 space-y-2">
            {productTimeline.length ? productTimeline.map(([code, value]) => (
              <div key={code} className="grid grid-cols-[52px_1fr] gap-2 text-[10px] leading-5">
                <span className="font-jetbrains font-bold text-[#6FE9F5]">{code}</span>
                <span className="text-white/66">{value}</span>
              </div>
            )) : (
              <p className="text-[11px] text-white/42">Sin linea de tiempo definida.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="border border-white/10 bg-[#162A45] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[#E9B44C]" />
            <p className="text-[13px] font-bold text-white">Criterios de ensamblaje</p>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {[
              { icon: CheckCircle2, label: 'Unidades aprobadas', ok: allUnitsApproved },
              { icon: FileCheck2, label: 'Producto con objeto', ok: productReady },
              { icon: Rows3, label: 'Semanas generadas', ok: approved.reduce((sum, item) => sum + weeksCount(item), 0) >= 16 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="border border-white/10 bg-[#0B192C] p-3">
                  <Icon size={16} className={item.ok ? 'text-emerald-300' : 'text-white/30'} />
                  <p className="mt-2 text-[10px] font-bold text-white/74">{item.label}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/34">{item.ok ? 'OK' : 'Pendiente'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden border border-white/10 bg-[#162A45]">
        <div className="grid grid-cols-[70px_1fr_100px_110px] border-b border-white/10 bg-[#0B192C] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">
          <span>Unidad</span>
          <span>Ultima evidencia</span>
          <span>Semanas</span>
          <span>Validacion</span>
        </div>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#00B4D8]" />
          </div>
        ) : approved.length ? (
          approved.map((generation) => {
            const weeks = generation.output_json || [];
            const lastEvidence = weeks[weeks.length - 1]?.evidence || 'Sin evidencia';
            const score = generation.validation_summary_json?.overall_score || 0;
            return (
              <div key={generation.id} className="grid grid-cols-[70px_1fr_100px_110px] items-center border-b border-white/8 px-4 py-3">
                <span className="font-jetbrains text-[12px] font-bold text-[#E9B44C]">U{generation.unit_number}</span>
                <span className="text-[11px] leading-5 text-white/72">{lastEvidence}</span>
                <span className="font-jetbrains text-[11px] text-white/60">{weeksCount(generation)}</span>
                <span className="font-jetbrains text-[11px] font-bold text-[#00B4D8]">{score ? `${score}/10` : '--'}</span>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-10 text-center text-[12px] text-white/46">
            Aun no hay unidades aprobadas.
          </div>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/programa')}
          className="flex items-center gap-1.5 text-[11px] text-white/46 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver al taller
        </button>
        <button
          type="button"
          onClick={handleAssemble}
          disabled={assembling || !allUnitsApproved || !productReady}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:opacity-45"
        >
          {assembling ? <Loader2 size={13} className="animate-spin" /> : <BookOpenCheck size={13} />}
          {assembling ? 'Ensamblando silabo final...' : 'Ensamblar y preparar entrega'}
        </button>
      </div>
      {assembling ? (
        <p className="mt-3 text-right text-[11px] leading-5 text-white/52">
          Este cierre puede tardar varios minutos porque la IA esta integrando unidades, producto, evaluacion y
          trazabilidad. Mantén esta pantalla abierta; si ya se guardo, te llevaremos a la entrega final.
        </p>
      ) : null}
    </div>
  );
}
