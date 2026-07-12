import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import GlassModal from '../../components/ui/GlassModal';
import { api } from '../../api/client';
import type { RsuAnswer, RsuMeta, RsuQuestion } from '../../api/types';

type Stage = 'inputs' | 'questions' | 'draft';

// Progreso del cuestionario en localStorage: un click fuera del modal o una recarga
// NO deben costarle al docente sus respuestas ni otra ronda de tokens de IA.
const rsuWipKey = (draftId: string) => `sigesil_rsu_wip_${draftId}`;

interface RsuWip {
  stage: Stage;
  ambito: string;
  evidencia: string;
  questions: RsuQuestion[];
  choices: Record<string, string>;
  ownIdeas: Record<string, string>;
  draftText: string;
}

function readRsuWip(draftId: string): RsuWip | null {
  try {
    const raw = localStorage.getItem(rsuWipKey(draftId));
    return raw ? (JSON.parse(raw) as RsuWip) : null;
  } catch {
    return null;
  }
}

interface RsuDesignModalProps {
  draftId: string;
  initialValue: string;
  initialMeta?: RsuMeta | null;
  onSave: (text: string, meta: RsuMeta) => void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

/**
 * Mini-flujo HITL para que el docente DISEÑE la RSU: define ámbito/evidencia,
 * responde preguntas a medida de su curso (elige o escribe su idea), genera el
 * texto y lo retoca antes de guardar. El docente es arquitecto, no espectador.
 */
export default function RsuDesignModal({
  draftId,
  initialValue,
  initialMeta,
  onSave,
  onClose,
  showToast,
}: RsuDesignModalProps) {
  // Si hay progreso sin guardar (WIP) se retoma tal cual (etapa incluida).
  // Sin WIP, siempre arranca en el cuestionario: el docente diseña ANTES de ver texto.
  const wip = useMemo(() => readRsuWip(draftId), [draftId]);
  const [stage, setStage] = useState<Stage>(wip?.stage ?? 'inputs');
  const [ambito, setAmbito] = useState(wip?.ambito ?? initialMeta?.ambito ?? '');
  const [evidencia, setEvidencia] = useState(wip?.evidencia ?? initialMeta?.evidencia ?? '');
  const [questions, setQuestions] = useState<RsuQuestion[]>(wip?.questions ?? []);
  const [choices, setChoices] = useState<Record<string, string>>(wip?.choices ?? {});
  const [ownIdeas, setOwnIdeas] = useState<Record<string, string>>(wip?.ownIdeas ?? {});
  const [draftText, setDraftText] = useState(wip?.draftText ?? initialValue);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        rsuWipKey(draftId),
        JSON.stringify({ stage, ambito, evidencia, questions, choices, ownIdeas, draftText } satisfies RsuWip),
      );
    } catch {
      // storage bloqueado — el progreso vive solo en memoria
    }
  }, [draftId, stage, ambito, evidencia, questions, choices, ownIdeas, draftText]);

  const buildAnswers = (): RsuAnswer[] =>
    questions.map((q) => ({
      id: q.id,
      pregunta: q.pregunta,
      eleccion: (ownIdeas[q.id]?.trim() || choices[q.id] || '').trim(),
    }));

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.generateRsuQuestions(draftId, {
        ambito: ambito.trim(),
        evidencia: evidencia.trim(),
      });
      const preguntas = res.data?.preguntas ?? [];
      if (!preguntas.length) {
        showToast('La IA no devolvió preguntas, intenta de nuevo', 'warning');
        return;
      }
      setQuestions(preguntas);
      setChoices({});
      setOwnIdeas({});
      setStage('questions');
    } catch {
      showToast('Error al generar preguntas de RSU', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleGenerateRsu = async () => {
    setGenerating(true);
    try {
      const res = await api.suggestRsu(draftId, {
        ambito: ambito.trim(),
        evidencia: evidencia.trim(),
        respuestas: buildAnswers(),
      });
      const texto = res.data?.responsabilidad_social?.trim() ?? '';
      if (!texto) {
        showToast('La IA no devolvió un texto de RSU', 'warning');
        return;
      }
      setDraftText(texto);
      setStage('draft');
    } catch {
      showToast('Error al generar la actividad de RSU', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!draftText.trim()) {
      showToast('El texto de RSU no puede estar vacío', 'warning');
      return;
    }
    try {
      localStorage.removeItem(rsuWipKey(draftId));
    } catch {
      // noop
    }
    onSave(draftText.trim(), {
      ambito: ambito.trim(),
      evidencia: evidencia.trim(),
      respuestas: buildAnswers(),
    });
  };

  const busy = loadingQuestions || generating;

  const footer = (() => {
    if (stage === 'inputs') {
      return (
        <button
          type="button"
          onClick={handleGenerateQuestions}
          disabled={loadingQuestions}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingQuestions ? (
            <><Loader2 size={13} className="animate-spin" /> Generando preguntas...</>
          ) : (
            <><Sparkles size={13} /> Generar preguntas</>
          )}
        </button>
      );
    }
    if (stage === 'questions') {
      return (
        <>
          <button
            type="button"
            onClick={() => setStage('inputs')}
            className="flex items-center gap-1.5 text-[11px] text-white/45 transition hover:text-white"
          >
            <ArrowLeft size={12} /> Inputs
          </button>
          <button
            type="button"
            onClick={handleGenerateRsu}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 size={13} className="animate-spin" /> Generando RSU...</>
            ) : (
              <>Generar RSU <ArrowRight size={12} /></>
            )}
          </button>
        </>
      );
    }
    return (
      <>
        {questions.length > 0 ? (
          <button
            type="button"
            onClick={handleGenerateRsu}
            disabled={generating}
            className="flex items-center gap-1.5 text-[11px] text-white/45 transition hover:text-white disabled:opacity-50"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
        >
          Guardar RSU
        </button>
      </>
    );
  })();

  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      accent="cyan"
      closeDisabled={busy}
      overlayClose={false}
      eyebrow="Responsabilidad Social Universitaria"
      title="Diseña la actividad de RSU"
      description="Tú decides el ámbito, el problema y la evidencia. La IA solo ejecuta tu diseño."
      footer={footer}
    >
      {stage === 'inputs' ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Ámbito / comunidad objetivo
            </label>
            <input
              type="text"
              value={ambito}
              onChange={(e) => setAmbito(e.target.value)}
              placeholder="Ej. asociación de productores de Ferreñafe, colegio de Monsefú..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-[#00B4D8]/45"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Evidencia / entregable esperado
            </label>
            <input
              type="text"
              value={evidencia}
              onChange={(e) => setEvidencia(e.target.value)}
              placeholder="Ej. informe técnico, taller demostrativo, prototipo entregado..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-[#00B4D8]/45"
            />
          </div>
          <p className="text-[11px] leading-4 text-white/45">
            Puedes dejar estos campos vacíos en una primera pasada; las preguntas se afinan con lo que escribas.
          </p>
        </div>
      ) : null}

      {stage === 'questions' ? (
        <div className="space-y-5">
          {questions.map((q) => {
            const hasOwnIdea = Boolean(ownIdeas[q.id]?.trim());
            return (
              <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[12px] font-semibold text-white">{q.pregunta}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.opciones.map((opcion) => {
                    const selected = !hasOwnIdea && choices[q.id] === opcion;
                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => {
                          setChoices((prev) => ({ ...prev, [q.id]: opcion }));
                          setOwnIdeas((prev) => ({ ...prev, [q.id]: '' }));
                        }}
                        className={[
                          'rounded-full border px-3 py-1.5 text-[11px] transition',
                          selected
                            ? 'border-[#00B4D8]/70 bg-[#00B4D8]/15 text-white ring-1 ring-[#00B4D8]/40'
                            : 'border-white/12 bg-white/[0.03] text-white/65 hover:border-white/30',
                        ].join(' ')}
                      >
                        {opcion}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={ownIdeas[q.id] ?? ''}
                  onChange={(e) => setOwnIdeas((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Mi propia idea (anula la opción elegida)"
                  className={[
                    'mt-3 w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none',
                    hasOwnIdea ? 'border-[#00B4D8]/45' : 'border-white/10 focus:border-[#00B4D8]/45',
                  ].join(' ')}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {stage === 'draft' ? (
        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
            Actividad de RSU (editable)
          </label>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={9}
            placeholder="Genera el texto desde las preguntas o redáctalo aquí directamente..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[12px] leading-5 text-white outline-none focus:border-[#00B4D8]/45"
          />
          <p className="text-[11px] leading-4 text-white/45">
            Retoca el texto a tu gusto: este es el control final humano antes de guardar.
          </p>
        </div>
      ) : null}
    </GlassModal>
  );
}
