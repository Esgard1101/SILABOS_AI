import React, { useCallback, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Copy, Download, Search, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

function buildSearchText(courseName: string, area: string, program: string): string {
  return `Necesito bibliografía académica verificada para preparar el sílabo del siguiente curso universitario:

CURSO: ${courseName || '[Nombre del curso]'}
PROGRAMA: ${program || '[Programa académico]'}
ÁREA: ${area || '[Área académica]'}
UNIVERSIDAD: Universidad Nacional Pedro Ruiz Gallo (UNPRG)

Busca mínimo 10 referencias bibliográficas:
- De los últimos 5 años
- En español e inglés
- Con DOI o URL verificable
- De fuentes académicas: SciELO, Redalyc, Dialnet, ERIC, repositorios universitarios o editoriales académicas
- Excluye blogs, Wikipedia, Scribd, StuDocu, SlideShare y páginas comerciales

Devuelve solo la lista de fuentes recomendadas para agregarlas al cuaderno.`;
}

function copyTextWithFallback(text: string, onDone: () => void) {
  const fallback = () => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    onDone();
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(fallback);
  } else {
    fallback();
  }
}

function TextOverlay({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = () => {
    copyTextWithFallback(text, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#041A3A]/90 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#A8D8A8] bg-[#0A2753] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8D8A8]">Texto listo para pegar</p>
            <h3 className="mt-1 text-sm font-bold text-white">Copia y pega en Deep Research</h3>
            <p className="mt-1 text-[11px] text-white/50">No necesitas editar el texto.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {['Copiar texto', 'Pegar en NotebookLM', 'Esperar resultados'].map((step, index) => (
            <React.Fragment key={step}>
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/60">{step}</span>
              {index < 2 && <ChevronRight size={10} className="shrink-0 text-white/25" />}
            </React.Fragment>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition ${
            copied ? 'bg-[#A8D8A8] text-[#041A3A]' : 'bg-gradient-to-r from-[#4A9A6A] to-[#A8D8A8] text-[#041A3A] hover:brightness-110'
          }`}
        >
          {copied ? <><Check size={14} />Copiado</> : <><Copy size={14} />Copiar texto</>}
        </button>

        <details className="mt-3 rounded-xl border border-white/10 bg-[#041A3A] px-3 py-2">
          <summary className="cursor-pointer text-[10px] font-semibold text-white/45">Ver texto técnico</summary>
          <pre className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-5 text-white/64">{text}</pre>
        </details>
      </div>
    </div>
  );
}

function GuideModal({
  title,
  image,
  searchText,
  onClose,
}: {
  title: string;
  image: string;
  searchText: string | null;
  onClose: () => void;
}) {
  const [textOpen, setTextOpen] = useState(false);
  const handleKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (textOpen) {
        setTextOpen(false);
        return;
      }
      onClose();
    }
  }, [onClose, textOpen]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
        <div className="w-full max-w-5xl rounded-2xl border border-[#D4A351] bg-[#0A2753] p-5 shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4A351]">Mini video</p>
              <h3 className="mt-1 text-base font-bold text-white">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/10 bg-[#041A3A]/82 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Video placeholder</span>
                <span className="rounded-full bg-[#D4A351]/16 px-2 py-0.5 text-[9px] font-semibold text-[#F2C260]">6-8s</span>
              </div>
              <img src={image} alt={title} className="aspect-video w-full rounded-xl border border-white/10 object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#041A3A]/82 p-4">
              {searchText ? (
                <>
                  <p className="text-[12px] font-semibold leading-5 text-white">Copia el texto preparado por SIGEISIL y pégalo en NotebookLM.</p>
                  <p className="mt-1 text-[10px] leading-5 text-white/50">Este texto ya incluye el curso, programa y criterios académicos.</p>
                  <button type="button" onClick={() => setTextOpen(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] py-3 text-[12px] font-bold text-white transition hover:brightness-110">
                    <Copy size={14} />Copiar texto de búsqueda
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[12px] font-semibold leading-5 text-white">Mira el video y replica el paso en NotebookLM.</p>
                  <p className="mt-1 text-[10px] leading-5 text-white/50">Cuando subas el video final, esta pantalla queda lista para reemplazar la imagen.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {textOpen && searchText && <TextOverlay text={searchText} onClose={() => setTextOpen(false)} />}
    </>
  );
}

type ModalKind = 'image' | 'image+text';

interface SubStep {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
  image: string;
  kind: ModalKind;
}

const SUB_STEPS: SubStep[] = [
  {
    id: 1,
    icon: Search,
    title: 'Abrir Deep Research',
    description: 'Entra al modo de búsqueda profunda dentro de NotebookLM.',
    detail: 'Selecciona Deep Research en el menú de búsqueda del cuaderno.',
    image: '/images/notebooklm_steps/step2d1.png',
    kind: 'image',
  },
  {
    id: 2,
    icon: Sparkles,
    title: 'Pegar texto y buscar',
    description: 'Copia el texto preparado por SIGEISIL y ejecuta la búsqueda.',
    detail: 'Pega el texto en NotebookLM y espera la respuesta completa.',
    image: '/images/notebooklm_steps/step2d2.png',
    kind: 'image+text',
  },
  {
    id: 3,
    icon: Download,
    title: 'Agregar fuentes',
    description: 'Revisa los resultados y agrega al cuaderno las fuentes utiles.',
    detail: 'Confirma que las fuentes queden cargadas antes de volver a SIGEISIL.',
    image: '/images/notebooklm_steps/step2d5.png',
    kind: 'image',
  },
];

function SubStepCard({ step, onClick }: { step: SubStep; onClick: () => void }) {
  const Icon = step.icon;
  const isSpecial = step.kind === 'image+text';

  return (
    <button type="button" onClick={onClick}
      className={`group flex min-h-[216px] flex-col rounded-2xl border p-4 text-left shadow-lg transition ${
        isSpecial
          ? 'border-[#A8D8A8]/30 bg-gradient-to-br from-[#0A2753] to-[#A8D8A8]/5 hover:border-[#A8D8A8]/60'
          : 'border-[#00B4CC]/30 bg-gradient-to-br from-[#0A2753] to-[#041A3A] hover:border-[#00B4CC]/60'
      }`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isSpecial ? 'bg-[#A8D8A8]/10 text-[#A8D8A8]' : 'bg-[#00B4CC]/15 text-[#00B4CC]'}`}>
          <Icon size={16} />
        </div>
        <span className="text-[11px] font-bold text-white/22">{String(step.id).padStart(2, '0')}</span>
      </div>
      <p className={`mb-1.5 text-[14px] font-bold leading-tight ${isSpecial ? 'text-[#A8D8A8] group-hover:text-white' : 'text-white group-hover:text-[#00B4CC]'}`}>{step.title}</p>
      <p className="mb-3 flex-1 text-[11px] leading-5 text-white/52">{step.description}</p>
      <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2">
        <p className="text-[10px] leading-5 text-white/42">{step.detail}</p>
      </div>
      <p className={`mt-3 text-[11px] font-semibold ${isSpecial ? 'text-[#A8D8A8]/78' : 'text-[#00B4CC]/78'}`}>
        {isSpecial ? 'Ver video + copiar texto ->' : 'Ver video ->'}
      </p>
    </button>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center px-1">
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
        <path d="M0 6 L12 6 M8 2 L12 6 L8 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Step2A_2_DeepResearch() {
  const navigate = useNavigate();
  const { courseDetail } = useSyllabus();
  const { context } = useAppContext();
  const [activeStep, setActiveStep] = useState<SubStep | null>(null);

  const searchText = buildSearchText(
    courseDetail?.name ?? context?.course_name ?? '',
    context?.school_name ?? '',
    context?.program_name ?? '',
  );

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        <button type="button" onClick={() => navigate('/creator/fuentes/notebook')}
          className="mb-4 flex items-center gap-1.5 text-[10px] text-white/40 transition hover:text-[#D4A351]">
          <ArrowLeft size={11} />Guía NotebookLM
        </button>

        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00B4CC]/15">
              <img src="/notebooklmICONS/iconnotebook3deepresearch.png" alt="Deep Research" className="h-5 w-5 object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#00B4CC]">
              SUB-PASO - BÚSQUEDA AUTOMÁTICA CON IA
            </span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-white">Deep Research</h1>
          <p className="mt-1 text-[11px] text-white/60">
            3 mini pasos para buscar bibliografía académica y agregarla al cuaderno.
          </p>
        </div>

        <div className="flex items-stretch">
          {SUB_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="min-w-0 flex-1">
                <SubStepCard step={step} onClick={() => setActiveStep(step)} />
              </div>
              {index < SUB_STEPS.length - 1 && <FlowArrow />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[#D4A351]/15 bg-[#D4A351]/5 px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[#D4A351]/70">
            Deep Research puede tardar varios minutos. No cierres la ventana mientras busca.
            Cuando termine, revisa las fuentes y agregalas al cuaderno antes de continuar.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/creator/fuentes/notebook')}
            className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white">
            <ArrowLeft size={12} />Volver a la Guia Principal
          </button>
          <button type="button" onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110">
            Listo, cargar referencias {'->'}
          </button>
        </div>
      </div>

      {activeStep && (
        <GuideModal
          title={activeStep.title}
          image={activeStep.image}
          searchText={activeStep.kind === 'image+text' ? searchText : null}
          onClose={() => setActiveStep(null)}
        />
      )}
    </>
  );
}
