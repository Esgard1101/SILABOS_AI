import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { MethodItem } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

// ─── Method card ─────────────────────────────────────────────────────────────

function MethodCard({
  method,
  selected,
  featured,
  onClick,
}: {
  method: MethodItem;
  selected: boolean;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full rounded-xl border text-left transition ${
        selected
          ? 'border-[#D4A351] bg-[#D4A351]/10 shadow-[0_0_20px_rgba(212,163,81,0.12)]'
          : 'border-white/10 bg-[#0A2753] hover:border-[#D4A351]/40 hover:bg-[#0A2753]/80'
      } ${featured ? 'p-5' : 'p-3.5'}`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4A351]">
          <Check size={10} className="text-[#041A3A]" />
        </span>
      )}
      <p
        className={`font-bold text-white pr-6 ${featured ? 'mb-2 text-sm' : 'mb-1.5 text-[11px]'}`}
      >
        {method.name}
      </p>
      {method.description && (
        <p
          className={`leading-snug text-white/60 line-clamp-3 ${featured ? 'text-[11px]' : 'text-[10px]'}`}
        >
          {method.description}
        </p>
      )}
      {method.secuencia_didactica && selected && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#D4A351]">
            Secuencia didáctica
          </p>
          <p className="text-[10px] leading-relaxed text-white/70">
            {method.secuencia_didactica}
          </p>
        </div>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step5_Metodo() {
  const navigate = useNavigate();
  const {
    draftId,
    selectedMethodId,
    setSelectedMethodId,
    selectedMethodName,
    setSelectedMethodName,
    selectedMethodSequence,
    setSelectedMethodSequence,
    methodNotes,
    setMethodNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestReason, setSuggestReason] = useState('');

  useEffect(() => {
    api
      .getPedagogicMethods()
      .then((res) => setMethods(res.data ?? []))
      .catch(() => showToast('Error cargando métodos didácticos', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSuggest = async () => {
    if (!draftId) return;
    setSuggesting(true);
    try {
      const res = await api.suggestMethodProgressive(draftId);
      const d = res.data;
      if (d?.method_id) {
        const sid = String(d.method_id);
        setSelectedMethodId(sid);
        const found = methods.find((m) => String(m.id) === sid);
        setSelectedMethodName(d.method_name || found?.name || '');
        setSelectedMethodSequence(found?.secuencia_didactica || '');
        setSuggestReason(d.reason || '');
        showToast('Método sugerido por IA', 'success');
      }
    } catch {
      showToast('Error al sugerir método', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSelect = (m: MethodItem) => {
    setSelectedMethodId(String(m.id));
    setSelectedMethodName(m.name);
    setSelectedMethodSequence(m.secuencia_didactica || '');
    setSuggestReason('');
  };

  const handleContinue = async () => {
    if (!selectedMethodId) return;
    setSaving(true);
    try {
      await saveStep('method', {
        selected_method_id: selectedMethodId,
        selected_method_name: selectedMethodName,
        teacher_notes: methodNotes,
        suggestion_reason: suggestReason,
      });
      navigate('/creator/cierre');
    } catch {
      showToast('Error al guardar método', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedObj = methods.find((m) => String(m.id) === selectedMethodId);
  const featuredMethod = selectedObj ?? methods[0];
  const restMethods = methods.filter((m) => m !== featuredMethod);

  return (
    <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
          PASO 7 DE 8 — MÉTODO DIDÁCTICO
        </p>
        <h1 className="font-playfair text-2xl font-bold text-white">
          Método y secuencia didáctica
        </h1>
        <p className="mt-1 text-[11px] text-white/60">
          Selecciona el método que operativizará el propósito del sílabo.
        </p>
      </div>

      {/* ── AI toolbar ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        {suggestReason && (
          <p className="flex-1 text-[10px] text-[#D4A351]/80">
            IA recomienda{' '}
            <span className="font-semibold text-[#D4A351]">{selectedMethodName}</span> —{' '}
            {suggestReason}
          </p>
        )}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting || !draftId || loading}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#D4A351]/40 bg-[#D4A351]/10 px-3 py-1.5 text-[10px] font-bold text-[#D4A351] transition hover:bg-[#D4A351]/20 disabled:opacity-50"
        >
          {suggesting ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          {suggesting ? 'Analizando...' : 'Sugerir con IA'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <Loader2 size={12} className="animate-spin" /> Cargando métodos...
        </div>
      ) : (
        <>
          {/* Featured method */}
          {featuredMethod && (
            <div className="mb-4">
              <MethodCard
                method={featuredMethod}
                selected={selectedMethodId === String(featuredMethod.id)}
                featured
                onClick={() => handleSelect(featuredMethod)}
              />
            </div>
          )}

          {/* Secondary methods grid */}
          {restMethods.length > 0 && (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                Otros métodos disponibles
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {restMethods.map((m) => (
                  <React.Fragment key={m.id}>
                    <MethodCard
                      method={m}
                      selected={selectedMethodId === String(m.id)}
                      onClick={() => handleSelect(m)}
                    />
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Observaciones del docente
        </label>
        <textarea
          className="w-full resize-none rounded-lg border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
          rows={2}
          placeholder="Justificación del método seleccionado..."
          value={methodNotes}
          onChange={(e) => setMethodNotes(e.target.value)}
        />
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/contenido')}
          className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a Contenido
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !selectedMethodId}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              CONFIRMAR MÉTODO
              <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
