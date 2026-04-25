import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Edit2, Loader2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { PerformanceDB, SuggestedPerformance } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

type Tab = 'oficiales' | 'sugeridos';

function AdjustModal({
  perf,
  onSave,
  onClose,
}: {
  perf: SuggestedPerformance;
  onSave: (p: SuggestedPerformance) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(perf.statement);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-xl border border-[#D4A351] bg-[#0A2753] p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">{perf.code}</span>
            <p className="text-[11px] text-white/50">Ajustar enunciado del desempeño</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
        <textarea
          className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/60"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] text-white/50 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ ...perf, statement: text.trim(), origin: 'teacher_edited_from_ai' });
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-4 py-1.5 text-[11px] font-bold text-white hover:brightness-110"
          >
            Guardar ajuste
          </button>
        </div>
      </div>
    </div>
  );
}

function OriginBadge({ origin }: { origin: string }) {
  if (origin === 'official')
    return (
      <span className="rounded-full bg-[#00B4CC]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#00B4CC]">
        Oficial
      </span>
    );
  if (origin === 'ai_suggested')
    return (
      <span className="rounded-full bg-[#D4A351]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#D4A351]">
        IA
      </span>
    );
  if (origin === 'teacher_edited_from_ai')
    return (
      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/60">
        Editado
      </span>
    );
  return null;
}

export default function Step3_Desempenos() {
  const navigate = useNavigate();
  const {
    draftId,
    courseDetail,
    draftPerformances,
    setDraftPerformances,
    performancesOrigin,
    setPerformancesOrigin,
    purposeNotes,
    setPurposeNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const [activeTab, setActiveTab] = useState<Tab>('oficiales');
  const [officialPerfs, setOfficialPerfs] = useState<PerformanceDB[]>([]);
  const [loadingOfficial, setLoadingOfficial] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<SuggestedPerformance | null>(null);

  useEffect(() => {
    if (!courseDetail?.id) { setLoadingOfficial(false); return; }
    setLoadingOfficial(true);
    api
      .getCoursePerformances(courseDetail.id)
      .then((res) => {
        const items = res.data?.items ?? [];
        setOfficialPerfs(items);
        if (draftPerformances.length === 0 && items.length > 0) {
          const mapped: SuggestedPerformance[] = items.map((p, idx) => ({
            code: p.code ?? `D${String(idx + 1).padStart(2, '0')}`,
            statement: p.statement,
            origin: 'official',
          }));
          setDraftPerformances(mapped);
          setPerformancesOrigin('official');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOfficial(false));
  }, [courseDetail?.id]);

  const handleSuggest = async () => {
    if (!draftId) return;
    setSuggesting(true);
    try {
      const res = await api.suggestPerformances(draftId);
      const perfs = res.data?.performances ?? [];
      if (perfs.length > 0) {
        setDraftPerformances(perfs);
        setPerformancesOrigin('ai_suggested');
        setActiveTab('sugeridos');
        showToast('Desempeños sugeridos por IA', 'success');
      }
    } catch {
      showToast('Error al sugerir desempeños', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await saveStep('purpose', {
        performances: draftPerformances,
        performances_origin: performancesOrigin,
        teacher_notes: purposeNotes,
      });
      navigate('/creator/contenido');
    } catch {
      showToast('Error al guardar desempeños', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayPerfs =
    activeTab === 'oficiales'
      ? draftPerformances.filter((p) => p.origin === 'official')
      : draftPerformances;

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
            PASO 5 DE 8 — DESEMPEÑOS
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">Desempeños del curso</h1>
          <p className="mt-1 text-[11px] text-white/60">
            Revisa y confirma los desempeños antes de proponer el contenido.
          </p>
        </div>

        {/* ── Tabs + AI button ────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(['oficiales', 'sugeridos'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`rounded-md px-3 py-1 text-[10px] font-semibold capitalize transition ${
                  activeTab === t
                    ? 'bg-[#0A2753] text-[#D4A351] shadow'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {t === 'oficiales' ? 'Oficiales' : 'Propuesta activa'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting || !draftId}
            className="flex items-center gap-1.5 rounded-lg border border-[#D4A351]/40 bg-[#D4A351]/10 px-3 py-1.5 text-[10px] font-bold text-[#D4A351] transition hover:bg-[#D4A351]/20 disabled:opacity-50"
          >
            {suggesting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            Sugerir con IA
          </button>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {loadingOfficial ? (
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Loader2 size={12} className="animate-spin" /> Cargando desempeños oficiales...
          </div>
        ) : displayPerfs.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0A2753] px-4 py-6 text-center">
            <p className="text-[11px] text-white/40">
              {activeTab === 'oficiales'
                ? 'No hay desempeños oficiales registrados para este curso.'
                : 'Sin desempeños en la propuesta activa. Usa "Sugerir con IA".'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-[#0A2753]">
                  <th className="w-16 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Código
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Enunciado del desempeño
                  </th>
                  <th className="w-20 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Origen
                  </th>
                  <th className="w-20 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayPerfs.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 bg-[#041A3A] transition hover:bg-[#0A2753]/60"
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] font-bold text-[#D4A351]">
                      {p.code}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] leading-snug text-white/80">
                      {p.statement}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <OriginBadge origin={p.origin} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setEditTarget(p)}
                        className="mx-auto flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[10px] text-white/50 hover:border-[#D4A351]/40 hover:text-[#D4A351]"
                      >
                        <Edit2 size={10} />
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Docent notes ────────────────────────────────────────────────── */}
        <div className="mt-4">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Observaciones del docente
          </label>
          <textarea
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
            rows={2}
            placeholder="Observaciones o ajustes sobre los desempeños..."
            value={purposeNotes}
            onChange={(e) => setPurposeNotes(e.target.value)}
          />
        </div>

        {/* ── Action bar ──────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
          >
            <ArrowLeft size={12} />
            Volver a Fuentes
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving || draftPerformances.length === 0}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                CONFIRMAR DESEMPEÑOS
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>

      {editTarget && (
        <AdjustModal
          perf={editTarget}
          onSave={(updated) => {
            setDraftPerformances((prev) =>
              prev.map((p) => (p.code === updated.code ? updated : p)),
            );
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
