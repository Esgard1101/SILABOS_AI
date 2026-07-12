import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Loader2, Sparkles } from 'lucide-react';
import GlassModal from '../../components/ui/GlassModal';
import { api } from '../../api/client';
import type { ProductHitl, ProductHitlAnswer, ProductQuestion, ProductQuestionsResponse } from '../../api/types';

type Stage = 'inputs' | 'questions';

// Progreso del cuestionario en localStorage: click accidental fuera del modal o
// recarga no deben costar respuestas ni otra ronda de tokens de IA.
const productWipKey = (draftId: string) => `sigesil_product_wip_${draftId}`;

interface ProductWip {
  stage: Stage;
  tipoChip: string;
  tipoCustom: string;
  vinculoProblema: string;
  modalidad: string;
  nivel: string;
  formatoChip: string;
  formatoCustom: string;
  notebookText: string;
  questions: ProductQuestion[];
  choices: Record<string, string>;
  ownIdeas: Record<string, string>;
}

function readProductWip(draftId: string): ProductWip | null {
  try {
    const raw = localStorage.getItem(productWipKey(draftId));
    return raw ? (JSON.parse(raw) as ProductWip) : null;
  } catch {
    return null;
  }
}

const TIPO_OPTIONS = [
  'Proyecto',
  'Informe técnico',
  'Prototipo',
  'Aplicación / producto digital',
  'Campaña / intervención',
  'Material didáctico',
];

const MODALIDAD_OPTIONS = ['Individual', 'Grupal'];
const NIVEL_OPTIONS = ['Básico', 'Intermedio', 'Avanzado'];

const FORMATO_OPTIONS = [
  'Documento',
  'Exposición / sustentación',
  'Repositorio digital',
  'Maqueta / prototipo',
  'Video',
  'Portafolio',
];

function splitAlcance(alcance: string): { modalidad: string; nivel: string } {
  const modalidad = MODALIDAD_OPTIONS.find((option) => alcance.toLowerCase().includes(option.toLowerCase())) ?? '';
  const nivel = NIVEL_OPTIONS.find((option) => alcance.toLowerCase().includes(option.toLowerCase())) ?? '';
  return { modalidad, nivel };
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(selected ? '' : option)}
            className={[
              'rounded-full border px-3 py-1.5 text-[11px] transition',
              selected
                ? 'border-[#00B4D8]/70 bg-[#00B4D8]/15 text-white ring-1 ring-[#00B4D8]/40'
                : 'border-white/12 bg-white/[0.03] text-white/65 hover:border-white/30',
            ].join(' ')}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface ProductDesignModalProps {
  draftId: string;
  notebookPrompt: string;
  initialHitl?: ProductHitl | null;
  initialNotebookText?: string;
  /** hitl=null significa "generar sin cuestionario" (flujo legacy). */
  onGenerate: (hitl: ProductHitl | null, notebookText: string) => void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

/**
 * Mini-flujo HITL para que el docente DISEÑE el Producto Acreditable antes de que
 * la IA genere las 3 opciones: 4 inputs fijos + preguntas a medida del curso
 * (con las fuentes de su cuaderno NotebookLM). El docente es arquitecto, la IA ejecuta.
 */
export default function ProductDesignModal({
  draftId,
  notebookPrompt,
  initialHitl,
  initialNotebookText = '',
  onGenerate,
  onClose,
  showToast,
}: ProductDesignModalProps) {
  const initialInputs = initialHitl?.inputs;
  const initialAlcance = splitAlcance(initialInputs?.alcance ?? '');
  const initialTipo = initialInputs?.tipo_producto ?? '';
  const initialFormato = initialInputs?.formato_evidencia ?? '';

  // WIP (progreso sin generar) manda sobre el prefill del último hitl persistido.
  const wip = useMemo(() => readProductWip(draftId), [draftId]);
  const [stage, setStage] = useState<Stage>(wip?.stage ?? 'inputs');
  const [tipoChip, setTipoChip] = useState(wip?.tipoChip ?? (TIPO_OPTIONS.includes(initialTipo) ? initialTipo : ''));
  const [tipoCustom, setTipoCustom] = useState(wip?.tipoCustom ?? (TIPO_OPTIONS.includes(initialTipo) ? '' : initialTipo));
  const [vinculoProblema, setVinculoProblema] = useState(wip?.vinculoProblema ?? initialInputs?.vinculo_problema ?? '');
  const [modalidad, setModalidad] = useState(wip?.modalidad ?? initialAlcance.modalidad);
  const [nivel, setNivel] = useState(wip?.nivel ?? initialAlcance.nivel);
  const [formatoChip, setFormatoChip] = useState(wip?.formatoChip ?? (FORMATO_OPTIONS.includes(initialFormato) ? initialFormato : ''));
  const [formatoCustom, setFormatoCustom] = useState(wip?.formatoCustom ?? (FORMATO_OPTIONS.includes(initialFormato) ? '' : initialFormato));
  const [notebookText, setNotebookText] = useState(wip?.notebookText ?? (initialHitl?.notebook_context_text || initialNotebookText));
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [questions, setQuestions] = useState<ProductQuestion[]>(wip?.questions ?? []);
  const [choices, setChoices] = useState<Record<string, string>>(wip?.choices ?? {});
  const [ownIdeas, setOwnIdeas] = useState<Record<string, string>>(wip?.ownIdeas ?? {});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsStatus, setQuestionsStatus] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(
        productWipKey(draftId),
        JSON.stringify({
          stage, tipoChip, tipoCustom, vinculoProblema, modalidad, nivel,
          formatoChip, formatoCustom, notebookText, questions, choices, ownIdeas,
        } satisfies ProductWip),
      );
    } catch {
      // storage bloqueado — el progreso vive solo en memoria
    }
  }, [draftId, stage, tipoChip, tipoCustom, vinculoProblema, modalidad, nivel, formatoChip, formatoCustom, notebookText, questions, choices, ownIdeas]);

  const buildInputs = () => ({
    tipo_producto: (tipoCustom.trim() || tipoChip).trim(),
    vinculo_problema: vinculoProblema.trim(),
    alcance: [modalidad, nivel ? `nivel ${nivel.toLowerCase()}` : ''].filter(Boolean).join(' · '),
    formato_evidencia: (formatoCustom.trim() || formatoChip).trim(),
  });

  const buildAnswers = (): ProductHitlAnswer[] =>
    questions.map((question) => ({
      id: question.id,
      pregunta: question.pregunta,
      eleccion: (ownIdeas[question.id]?.trim() || choices[question.id] || '').trim(),
    }));

  const prefillAnswers = (generated: ProductQuestion[]) => {
    const previous = initialHitl?.respuestas ?? [];
    const nextChoices: Record<string, string> = {};
    const nextOwnIdeas: Record<string, string> = {};
    for (const question of generated) {
      const match = previous.find((answer) => answer.id === question.id || answer.pregunta === question.pregunta);
      if (!match?.eleccion) continue;
      if (question.opciones.includes(match.eleccion)) {
        nextChoices[question.id] = match.eleccion;
      } else {
        nextOwnIdeas[question.id] = match.eleccion;
      }
    }
    setChoices(nextChoices);
    setOwnIdeas(nextOwnIdeas);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(notebookPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      showToast('No se pudo copiar el prompt de NotebookLM', 'warning');
    }
  };

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    setQuestionsStatus('Preparando preguntas a medida del curso...');
    try {
      const queued = await api.generateProductQuestions(draftId, {
        ...buildInputs(),
        notebook_context_text: notebookText.trim(),
      });
      const jobId = queued.data.job_id || queued.data.id;
      if (!jobId) throw new Error('El servidor no devolvió job_id para las preguntas');
      const completed = await api.pollAiGenerationJob<ProductQuestionsResponse>(jobId, {
        intervalMs: 3000,
        timeoutMs: 180000,
        onUpdate: (job) => {
          setQuestionsStatus(
            job.status === 'running'
              ? 'La IA está leyendo tu curso, método y fuentes...'
              : 'Solicitud en cola. Esperando al proveedor...',
          );
        },
      });
      const result = completed.data.result || completed.data.result_json;
      const preguntas = result?.preguntas ?? [];
      if (!preguntas.length) {
        showToast('La IA no devolvió preguntas, intenta de nuevo', 'warning');
        return;
      }
      setQuestions(preguntas);
      prefillAnswers(preguntas);
      setStage('questions');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al generar preguntas del producto', 'error');
    } finally {
      setLoadingQuestions(false);
      setQuestionsStatus('');
    }
  };

  const clearWip = () => {
    try {
      localStorage.removeItem(productWipKey(draftId));
    } catch {
      // noop
    }
  };

  const handleGenerateProducts = () => {
    clearWip();
    onGenerate(
      {
        inputs: buildInputs(),
        respuestas: buildAnswers(),
        notebook_context_text: notebookText.trim(),
      },
      notebookText.trim(),
    );
  };

  const footer = stage === 'inputs' ? (
    <>
      <button
        type="button"
        onClick={() => { clearWip(); onGenerate(null, notebookText.trim()); }}
        disabled={loadingQuestions}
        className="text-[10px] text-white/38 transition hover:text-white/70 disabled:opacity-40"
      >
        Generar sin cuestionario
      </button>
      <button
        type="button"
        onClick={handleGenerateQuestions}
        disabled={loadingQuestions}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingQuestions ? (
          <><Loader2 size={13} className="animate-spin" /> {questionsStatus || 'Generando preguntas...'}</>
        ) : (
          <><Sparkles size={13} /> Generar preguntas</>
        )}
      </button>
    </>
  ) : (
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
        onClick={handleGenerateProducts}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
      >
        Generar productos <ArrowRight size={12} />
      </button>
    </>
  );

  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      accent="cyan"
      closeDisabled={loadingQuestions}
      overlayClose={false}
      eyebrow="Producto Acreditable"
      title="Diseña tu producto antes de generarlo"
      description="Tú fijas el rumbo del producto del curso. La IA solo ejecuta tu diseño con 3 opciones a tu medida."
      footer={footer}
    >
      {stage === 'inputs' ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Tipo de producto preferido
            </label>
            <ChipGroup options={TIPO_OPTIONS} value={tipoChip} onChange={(next) => { setTipoChip(next); if (next) setTipoCustom(''); }} />
            <input
              type="text"
              value={tipoCustom}
              onChange={(e) => { setTipoCustom(e.target.value); if (e.target.value.trim()) setTipoChip(''); }}
              placeholder="Otro tipo (escríbelo con tus palabras)"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none focus:border-[#00B4D8]/45"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Vínculo con el problema / contexto
            </label>
            <input
              type="text"
              value={vinculoProblema}
              onChange={(e) => setVinculoProblema(e.target.value)}
              placeholder="Ej. déficit de comprensión lectora en colegios de José Leonardo Ortiz..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-[#00B4D8]/45"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Alcance
              </label>
              <ChipGroup options={MODALIDAD_OPTIONS} value={modalidad} onChange={setModalidad} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Complejidad
              </label>
              <ChipGroup options={NIVEL_OPTIONS} value={nivel} onChange={setNivel} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Formato de evidencia / entrega
            </label>
            <ChipGroup options={FORMATO_OPTIONS} value={formatoChip} onChange={(next) => { setFormatoChip(next); if (next) setFormatoCustom(''); }} />
            <input
              type="text"
              value={formatoCustom}
              onChange={(e) => { setFormatoCustom(e.target.value); if (e.target.value.trim()) setFormatoChip(''); }}
              placeholder="Otro formato de entrega"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none focus:border-[#00B4D8]/45"
            />
          </div>

          <div className="rounded-2xl border border-[#00B4D8]/20 bg-[#00B4D8]/[0.06] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#72E7F6]">
                Tu cuaderno NotebookLM (opcional)
              </p>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 rounded-lg border border-[#00B4D8]/35 px-2.5 py-1.5 text-[10px] font-semibold text-[#72E7F6] transition hover:bg-[#00B4D8]/10"
              >
                {copiedPrompt ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedPrompt ? 'Copiado' : 'Copiar prompt'}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-white/50">
              Copia el prompt, pégalo en tu cuaderno NotebookLM del curso y trae aquí su recomendación.
              Las preguntas y los productos usarán ese material junto a tus fuentes ya guardadas.
            </p>
            <textarea
              value={notebookText}
              onChange={(e) => setNotebookText(e.target.value)}
              rows={4}
              placeholder="Pega aquí la respuesta de tu cuaderno NotebookLM (problema formativo, objetos posibles, recomendación)..."
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-white outline-none placeholder:text-white/25 focus:border-[#00B4D8]/45"
            />
          </div>

          <p className="text-[11px] leading-4 text-white/45">
            Puedes dejar campos vacíos en una primera pasada; las preguntas se afinan con lo que definas.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((question) => {
            const hasOwnIdea = Boolean(ownIdeas[question.id]?.trim());
            return (
              <div key={question.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[12px] font-semibold text-white">{question.pregunta}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.opciones.map((opcion) => {
                    const selected = !hasOwnIdea && choices[question.id] === opcion;
                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => {
                          setChoices((prev) => ({ ...prev, [question.id]: opcion }));
                          setOwnIdeas((prev) => ({ ...prev, [question.id]: '' }));
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
                  value={ownIdeas[question.id] ?? ''}
                  onChange={(e) => setOwnIdeas((prev) => ({ ...prev, [question.id]: e.target.value }))}
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
      )}
    </GlassModal>
  );
}
