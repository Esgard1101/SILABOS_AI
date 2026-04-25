import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useSyllabus } from '../../context/SyllabusContext';

// ─── Editable list card ────────────────────────────────────────────────────────

function ItemList({
  label,
  items,
  accentClass,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  accentClass: string;
  onAdd: (text: string) => void;
  onRemove: (i: number) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-[#0A2753] p-4">
      <p className={`mb-3 text-[10px] font-bold uppercase tracking-[0.22em] ${accentClass}`}>
        {label}
      </p>
      <ul className="mb-3 flex-1 space-y-1.5">
        {items.length === 0 && (
          <li className="text-[10px] italic text-white/30">Sin ítems aún.</li>
        )}
        {items.map((item, i) => (
          <li key={i} className="group flex items-start gap-2">
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${accentClass
                .replace('text-[#00B4CC]', 'bg-[#00B4CC]')
                .replace('text-[#D4A351]', 'bg-[#D4A351]')
                .replace('text-white/60', 'bg-white/40')}`}
            />
            <span className="flex-1 text-[11px] leading-snug text-white/80">{item}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 text-white/20 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
            >
              <X size={11} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <input
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-[#D4A351]/40"
          placeholder={`Agregar ${label.toLowerCase()}...`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        />
        <button
          type="button"
          onClick={commit}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-white/40 hover:text-[#D4A351]"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step4_Contenido() {
  const navigate = useNavigate();
  const {
    draftId,
    contentMode,
    setContentMode,
    habilidadesSugeridas,
    setHabilidadesSugeridas,
    habilidadesPorDesempeno,
    setHabilidadesPorDesempeno,
    conocimientos,
    setConocimientos,
    actitudes,
    setActitudes,
    contentNotes,
    setContentNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSuggest = async () => {
    if (!draftId) return;
    setSuggesting(true);
    try {
      const res = await api.suggestContent(draftId);
      const d = res.data;
      if (d) {
        if (d.conocimientos?.length) setConocimientos(d.conocimientos);
        if (d.actitudes?.length) setActitudes(d.actitudes);
        if (d.habilidades_sugeridas?.length) setHabilidadesSugeridas(d.habilidades_sugeridas);
        if (d.habilidades_por_desempeno?.length)
          setHabilidadesPorDesempeno(d.habilidades_por_desempeno);
        setContentMode('proposal');
        showToast('Propuesta de contenido generada', 'success');
      }
    } catch {
      showToast('Error al generar propuesta de contenido', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await saveStep('content', {
        habilidades_sugeridas: habilidadesSugeridas,
        habilidades_por_desempeno: habilidadesPorDesempeno,
        knowledge_items: conocimientos,
        attitudes: actitudes,
        content_mode: 'confirmed',
        teacher_notes: contentNotes,
      });
      setContentMode('confirmed');
      navigate('/creator/metodo');
    } catch {
      showToast('Error al guardar contenido', 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasContent =
    conocimientos.length > 0 || habilidadesSugeridas.length > 0 || actitudes.length > 0;

  const modeBadge = {
    idle: null,
    proposal: { label: 'Propuesta IA', cls: 'bg-[#D4A351]/15 text-[#D4A351]' },
    editing: { label: 'Editando', cls: 'bg-white/10 text-white/60' },
    confirmed: { label: 'Confirmado', cls: 'bg-[#00B4CC]/15 text-[#00B4CC]' },
  }[contentMode];

  return (
    <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
          PASO 6 DE 8 — CONTENIDO FORMATIVO
        </p>
        <h1 className="font-playfair text-2xl font-bold text-white">Propuesta de contenido</h1>
        <p className="mt-1 text-[11px] text-white/60">
          Habilidades, conocimientos y actitudes derivadas de los desempeños confirmados.
        </p>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          {modeBadge && (
            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${modeBadge.cls}`}>
              {modeBadge.label}
            </span>
          )}
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
          {suggesting ? 'Generando...' : 'Proponer con IA'}
        </button>
      </div>

      {/* ── 3-col grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ItemList
          label="Conocimientos"
          accentClass="text-[#00B4CC]"
          items={conocimientos}
          onAdd={(t) => {
            setConocimientos((p) => [...p, t]);
            if (contentMode === 'idle' || contentMode === 'confirmed') setContentMode('editing');
          }}
          onRemove={(i) => setConocimientos((p) => p.filter((_, idx) => idx !== i))}
        />
        <ItemList
          label="Habilidades"
          accentClass="text-[#D4A351]"
          items={habilidadesSugeridas}
          onAdd={(t) => {
            setHabilidadesSugeridas((p) => [...p, t]);
            if (contentMode === 'idle' || contentMode === 'confirmed') setContentMode('editing');
          }}
          onRemove={(i) => setHabilidadesSugeridas((p) => p.filter((_, idx) => idx !== i))}
        />
        <ItemList
          label="Actitudes"
          accentClass="text-white/60"
          items={actitudes}
          onAdd={(t) => {
            setActitudes((p) => [...p, t]);
            if (contentMode === 'idle' || contentMode === 'confirmed') setContentMode('editing');
          }}
          onRemove={(i) => setActitudes((p) => p.filter((_, idx) => idx !== i))}
        />
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Observaciones del docente
        </label>
        <textarea
          className="w-full resize-none rounded-lg border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
          rows={2}
          placeholder="Notas sobre el contenido formativo..."
          value={contentNotes}
          onChange={(e) => setContentNotes(e.target.value)}
        />
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/desempenos')}
          className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a Desempeños
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !hasContent}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              CONFIRMAR CONTENIDO
              <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
