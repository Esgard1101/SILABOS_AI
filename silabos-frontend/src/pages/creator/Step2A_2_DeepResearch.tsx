import React, { useCallback, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Clock, Copy, Download, ExternalLink, Search, Sparkles, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

// ─── Search text builder ──────────────────────────────────────────────────────

function buildSearchText(courseName: string, area: string, program: string): string {
  return `Necesito bibliografía académica verificada para preparar el sílabo del siguiente curso universitario:

CURSO: ${courseName || '[Nombre del curso]'}
PROGRAMA: ${program || '[Programa académico]'}
ÁREA: ${area || '[Área académica]'}
UNIVERSIDAD: Universidad Nacional Pedro Ruiz Gallo (UNPRG)

Por favor, busca y devuelve mínimo 10 referencias bibliográficas:
- De los últimos 5 años (2020–2025)
- En español e inglés
- Con enlace (DOI o URL) verificado y funcional
- En formato APA 7.ª edición
- De bases de datos: Scielo, Google Scholar, Redalyc, Dialnet o ERIC

Devuelve solo la lista numerada de referencias, lista para copiar.`;
}

// ─── Text overlay (z-60, encima del modal de imagen) ─────────────────────────

function TextOverlay({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { /* no clipboard */ }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: 'rgba(4,26,58,0.88)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-[#D4A351] bg-[#0A2753] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A351]">Texto listo para pegar</p>
            <h3 className="mt-0.5 text-[13px] font-bold text-white">Copia todo el texto de abajo</h3>
            <p className="mt-1 text-[11px] text-white/50">Pégalo en el campo de búsqueda de NotebookLM y presiona Enter.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
        {/* Mini guide */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {['1. Copia el texto', '2. Abre NotebookLM', '3. Pégalo → Enter'].map((s, i) => (
            <React.Fragment key={i}>
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/60">{s}</span>
              {i < 2 && <ChevronRight size={10} className="shrink-0 text-white/25" />}
            </React.Fragment>
          ))}
        </div>
        {/* Text */}
        <div className="rounded-xl border border-[#D4A351]/30 bg-[#041A3A] p-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-white/80">{text}</pre>
        </div>
        <button type="button" onClick={handleCopy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition ${copied ? 'bg-[#00B4CC] text-[#041A3A]' : 'bg-gradient-to-r from-[#007A8A] to-[#00B4CC] text-white hover:brightness-110'}`}>
          {copied ? <><Check size={14} />¡Copiado! Ahora pégalo en NotebookLM</> : <><Copy size={14} />Copiar todo el texto</>}
        </button>
        <p className="mt-3 text-center text-[10px] text-white/30">Escape para volver a la imagen de guía.</p>
      </div>
    </div>
  );
}

// ─── Guide modal (z-50) with optional text overlay ───────────────────────────

function GuideModal({ title, image, searchText, onClose }: { title: string; image: string; searchText: string | null; onClose: () => void }) {
  const [textOpen, setTextOpen] = useState(false);
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { if (textOpen) { setTextOpen(false); return; } onClose(); }
  }, [onClose, textOpen]);
  React.useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-xl border border-[#D4A351] bg-[#0A2753] shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {searchText && <p className="mt-0.5 text-[11px] text-white/50">Así se ve la pantalla donde debes pegar el texto.</p>}
            </div>
            <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white">
              <X size={13} />
            </button>
          </div>
          <div className="px-5">
            <img src={image} alt={title} className="w-full rounded-lg border border-white/10 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          {searchText && (
            <div className="p-5 pt-4">
              <div className="rounded-xl border border-[#D4A351]/20 bg-[#D4A351]/5 px-4 py-3">
                <p className="mb-2.5 text-[11px] text-[#D4A351]/80">¿Listo para copiar el texto que debes pegar aquí?</p>
                <button type="button" onClick={() => setTextOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#B8882A] to-[#D4A351] px-4 py-2 text-[11px] font-bold text-[#041A3A] transition hover:brightness-110">
                  <Copy size={13} />Ver y copiar el texto de búsqueda
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {textOpen && searchText && <TextOverlay text={searchText} onClose={() => setTextOpen(false)} />}
    </>
  );
}

// ─── Sub-step data ────────────────────────────────────────────────────────────

type ModalKind = 'image' | 'image+text';

interface SubStep {
  id: number;
  icon: React.ElementType;
  iconColor: string;
  titleColor: string;
  ctaColor: string;
  title: string;
  description: string;
  detail: string;
  image: string;
  kind: ModalKind;
}

const SUB_STEPS: SubStep[] = [
  {
    id: 1,
    icon: Zap,
    iconColor: 'text-[#D4A351] bg-[#D4A351]/15',
    titleColor: 'text-white group-hover:text-[#D4A351]',
    ctaColor: 'text-[#D4A351]/70 group-hover:text-[#D4A351]',
    title: 'Abrir la búsqueda avanzada',
    description: 'Accede al panel de Deep Research en tu cuaderno NotebookLM.',
    detail: 'Abre tu cuaderno → haz clic en "Deep Research" en la barra lateral.',
    image: '/images/notebooklm_steps/step2d.png',
    kind: 'image',
  },
  {
    id: 2,
    icon: Search,
    iconColor: 'text-[#00B4CC] bg-[#00B4CC]/15',
    titleColor: 'text-white group-hover:text-[#00B4CC]',
    ctaColor: 'text-[#00B4CC]/70 group-hover:text-[#00B4CC]',
    title: 'Seleccionar "Deep Research"',
    description: 'Elige la búsqueda profunda, no el chat normal.',
    detail: 'Selecciona "Deep Research" en el cuadro que aparece. Busca en fuentes académicas reales.',
    image: '/images/notebooklm_steps/step2d1.png',
    kind: 'image',
  },
  {
    id: 3,
    icon: Sparkles,
    iconColor: 'text-[#A8D8A8] bg-[#A8D8A8]/10',
    titleColor: 'text-[#A8D8A8] group-hover:text-white',
    ctaColor: 'text-[#A8D8A8]/70 group-hover:text-[#A8D8A8]',
    title: 'Pegar el texto y buscar',
    description: 'Copia el texto que preparó SIGESIL y pégalo en el campo de búsqueda.',
    detail: 'SIGESIL ya preparó el texto con los detalles del curso. Cópialo, pégalo y presiona Enter.',
    image: '/images/notebooklm_steps/step2d2.png',
    kind: 'image+text',
  },
  {
    id: 4,
    icon: Clock,
    iconColor: 'text-white/50 bg-white/8',
    titleColor: 'text-white group-hover:text-white/80',
    ctaColor: 'text-white/40 group-hover:text-white/60',
    title: 'Esperar los resultados',
    description: 'NotebookLM busca automáticamente. Puede tardar 2 a 5 minutos.',
    detail: 'Verás una barra de progreso. No cierres la ventana. Puedes esperar en otra pestaña.',
    image: '/images/notebooklm_steps/step2d3.png',
    kind: 'image',
  },
  {
    id: 5,
    icon: Download,
    iconColor: 'text-[#00B4CC] bg-[#00B4CC]/15',
    titleColor: 'text-white group-hover:text-[#00B4CC]',
    ctaColor: 'text-[#00B4CC]/70 group-hover:text-[#00B4CC]',
    title: 'Revisar fuentes encontradas',
    description: 'NotebookLM muestra las fuentes que encontró. Selecciona las más relevantes.',
    detail: 'Revisa la lista de fuentes sugeridas. Marca las que son pertinentes para el curso y descarta las irrelevantes.',
    image: '/images/notebooklm_steps/step2d4.png',
    kind: 'image',
  },
  {
    id: 6,
    icon: ExternalLink,
    iconColor: 'text-[#D4A351] bg-[#D4A351]/15',
    titleColor: 'text-white group-hover:text-[#D4A351]',
    ctaColor: 'text-[#D4A351]/70 group-hover:text-[#D4A351]',
    title: 'Importar al cuaderno',
    description: 'Agrega las fuentes seleccionadas a tu cuaderno NotebookLM.',
    detail: 'Haz clic en "Agregar fuentes al cuaderno". Las fuentes quedan disponibles para consulta y síntesis.',
    image: '/images/notebooklm_steps/step2d5.png',
    kind: 'image',
  },
];

// ─── Card component ───────────────────────────────────────────────────────────

function SubStepCard({ step, onClick }: { step: SubStep; onClick: () => void }) {
  const Icon = step.icon;
  const isSpecial = step.kind === 'image+text';
  return (
    <button type="button" onClick={onClick}
      className={`group flex flex-col rounded-xl border p-4 text-left shadow-lg transition ${
        isSpecial
          ? 'border-[#A8D8A8]/30 bg-gradient-to-br from-[#0A2753] to-[#A8D8A8]/5 hover:border-[#A8D8A8]/60'
          : 'border-[#D4A351]/30 bg-gradient-to-br from-[#0A2753] to-[#041A3A] hover:border-[#D4A351]/60 hover:shadow-[0_6px_20px_rgba(212,163,81,0.10)]'
      }`}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${step.iconColor}`}>
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-bold text-white/20">{String(step.id).padStart(2, '0')}</span>
      </div>
      <p className={`mb-1 text-[11px] font-bold leading-tight ${step.titleColor}`}>{step.title}</p>
      <p className="mb-2.5 flex-1 text-[10px] leading-relaxed text-white/50">{step.description}</p>
      <div className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5">
        <p className="text-[10px] leading-relaxed text-white/40">{step.detail}</p>
      </div>
      <p className={`mt-2 text-[10px] font-semibold ${step.ctaColor}`}>
        {isSpecial ? 'Ver imagen + copiar texto →' : 'Ver cómo hacerlo →'}
      </p>
    </button>
  );
}

function FlowArrow({ right = true }: { right?: boolean }) {
  return (
    <div className="flex items-center justify-center px-0.5 shrink-0">
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
        {right
          ? <path d="M0 5 L10 5 M7 2 L10 5 L7 8" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M14 5 L4 5 M7 2 L4 5 L7 8" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const row1 = SUB_STEPS.slice(0, 3);
  const row2 = SUB_STEPS.slice(3, 6);

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <button type="button" onClick={() => navigate('/creator/fuentes/notebook')}
          className="mb-4 flex items-center gap-1.5 text-[10px] text-white/40 transition hover:text-[#D4A351]">
          <ArrowLeft size={11} />Guía NotebookLM
        </button>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00B4CC]/15">
              <img src="/notebooklmICONS/ICONNOTEBOOK_3_DEEPRESEARCH.png" alt="Deep Research" className="h-4 w-4 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#00B4CC]">
              SUB-PASO — BÚSQUEDA AUTOMÁTICA CON IA
            </span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-white">Deep Research</h1>
          <p className="mt-1 text-[11px] text-white/60">
            6 pasos para que NotebookLM busque bibliografía académica para tu curso.
            El paso 3 incluye el texto listo para pegar.
          </p>
        </div>

        {/* ── Row 1 (pasos 1-3, izq → der) ───────────────────────────────── */}
        <div className="flex items-stretch">
          {row1.map((step, i) => (
            <React.Fragment key={step.id}>
              <div className="min-w-0 flex-1">
                <SubStepCard step={step} onClick={() => setActiveStep(step)} />
              </div>
              {i < row1.length - 1 && <FlowArrow right />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Vertical connector (right side, 3→4) ───────────────────────── */}
        <div className="flex justify-end pr-0">
          <div className="w-1/3 flex items-center justify-center py-0.5">
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" aria-hidden>
              <path d="M6 0 L6 14 M2 10 L6 14 L10 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ── Row 2 (pasos 6-4, der → izq) ───────────────────────────────── */}
        <div className="flex items-stretch">
          {[...row2].reverse().map((step, i) => (
            <React.Fragment key={step.id}>
              <div className="min-w-0 flex-1">
                <SubStepCard step={step} onClick={() => setActiveStep(step)} />
              </div>
              {i < row2.length - 1 && <FlowArrow right={false} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Context banner ──────────────────────────────────────────────── */}
        {(courseDetail?.name || context?.course_name) && (
          <div className="mt-4 rounded-xl border border-[#00B4CC]/20 bg-[#00B4CC]/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <ExternalLink size={11} className="shrink-0 text-[#00B4CC]/60" />
              <p className="text-[10px] text-[#00B4CC]/70">
                Texto del Paso 3 personalizado para:{' '}
                <span className="font-bold text-[#00B4CC]">{courseDetail?.name ?? context?.course_name}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Tip ────────────────────────────────────────────────────────── */}
        <div className="mt-3 rounded-xl border border-[#D4A351]/15 bg-[#D4A351]/5 px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[#D4A351]/70">
            Deep Research puede tardar 2–5 minutos. No cierres la ventana mientras busca.
            Cuando termine, revisa las fuentes encontradas y agrégalas al cuaderno antes de continuar.
          </p>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/creator/fuentes/notebook')}
            className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white">
            <ArrowLeft size={12} />Volver a la Guía Principal
          </button>
          <button type="button" onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110">
            Listo, cargar referencias →
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
