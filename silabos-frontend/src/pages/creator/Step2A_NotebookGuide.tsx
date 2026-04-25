import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Download, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

// ─── Synthesis text builder ───────────────────────────────────────────────────

function buildSynthesisText(courseName: string): string {
  return `Basándote ÚNICAMENTE en las fuentes que tengo cargadas en este cuaderno, necesito que hagas lo siguiente:

1. Escribe un resumen académico de 2 a 3 párrafos sobre los temas principales del curso: ${courseName || 'el curso universitario'}.

2. Luego lista TODAS las fuentes del cuaderno en formato APA 7.ª edición, con DOI o URL cuando esté disponible.

3. Numera las referencias y ordénalas alfabéticamente por apellido del autor.

IMPORTANTE: Usa solo la información de las fuentes del cuaderno, no agregues información de tu conocimiento general.`;
}

// ─── Image modal ──────────────────────────────────────────────────────────────

function ImageModal({ title, image, onClose }: { title: string; image: string; onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-xl border border-[#D4A351] bg-[#0A2753] p-5 shadow-2xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white">
            <X size={13} />
          </button>
        </div>
        <img src={image} alt={title} className="w-full rounded-lg border border-white/10 object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
    </div>
  );
}

// ─── Synthesis modal (image + copyable text, nested) ─────────────────────────

function SynthesisTextOverlay({ text, onClose }: { text: string; onClose: () => void }) {
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
      <div className="w-full max-w-lg rounded-2xl border border-[#A8D8A8] bg-[#0A2753] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A8D8A8]">Texto listo para pegar</p>
            <h3 className="mt-0.5 text-[13px] font-bold text-white">Copia todo el texto de abajo</h3>
            <p className="mt-1 text-[11px] text-white/50">Pégalo en el chat de NotebookLM y presiona Enter.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <div className="rounded-xl border border-[#A8D8A8]/30 bg-[#041A3A] p-4" style={{ maxHeight: '220px', overflowY: 'auto' }}>
          <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-white/80">{text}</pre>
        </div>
        <button type="button" onClick={handleCopy}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition ${copied ? 'bg-[#A8D8A8] text-[#041A3A]' : 'bg-gradient-to-r from-[#4A9A6A] to-[#A8D8A8] text-[#041A3A] hover:brightness-110'}`}>
          {copied ? <><Copy size={14} />¡Copiado! Ahora pégalo en NotebookLM</> : <><Copy size={14} />Copiar todo el texto</>}
        </button>
        <p className="mt-3 text-center text-[10px] text-white/30">Escape para volver a la imagen de guía.</p>
      </div>
    </div>
  );
}

function SynthesisModal({ title, image, text, onClose }: { title: string; image: string; text: string; onClose: () => void }) {
  const [textOpen, setTextOpen] = useState(false);
  const handleKey = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { if (textOpen) { setTextOpen(false); return; } onClose(); }
  }, [onClose, textOpen]);
  React.useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-xl border border-[#A8D8A8] bg-[#0A2753] shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-0.5 text-[11px] text-white/50">Así se ve el chat de NotebookLM donde debes pegar el texto.</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 hover:text-white">
              <X size={13} />
            </button>
          </div>
          <div className="px-5">
            <img src={image} alt={title} className="w-full rounded-lg border border-white/10 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="p-5 pt-4">
            <div className="rounded-xl border border-[#A8D8A8]/20 bg-[#A8D8A8]/5 px-4 py-3">
              <p className="mb-2.5 text-[11px] text-[#A8D8A8]/80">¿Listo para copiar el texto de síntesis?</p>
              <button type="button" onClick={() => setTextOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4A9A6A] to-[#A8D8A8] px-4 py-2 text-[11px] font-bold text-[#041A3A] transition hover:brightness-110">
                <Copy size={13} />Ver y copiar el texto de síntesis
              </button>
            </div>
          </div>
        </div>
      </div>
      {textOpen && <SynthesisTextOverlay text={text} onClose={() => setTextOpen(false)} />}
    </>
  );
}

// ─── Hub card data ────────────────────────────────────────────────────────────

type CardAction =
  | { type: 'modal'; image: string }
  | { type: 'synthesis'; image: string }
  | { type: 'navigate'; to: string };

type CardStyle = 'gold' | 'cyan' | 'mint';

interface HubCard {
  id: number;
  icon: string;
  lucideIcon?: React.ElementType;
  title: string;
  description: string;
  tag: string;
  action: CardAction;
  style: CardStyle;
}

// ─── Hub card component ───────────────────────────────────────────────────────

const BORDER: Record<CardStyle, string> = {
  gold: 'border-[#D4A351]/30 hover:border-[#D4A351]/60 hover:shadow-[0_8px_20px_rgba(212,163,81,0.12)]',
  cyan: 'border-[#00B4CC]/40 hover:border-[#00B4CC]/70 hover:shadow-[0_8px_20px_rgba(0,180,204,0.15)]',
  mint: 'border-[#A8D8A8]/30 hover:border-[#A8D8A8]/60 hover:shadow-[0_8px_20px_rgba(168,216,168,0.12)]',
};
const TAG_CLS: Record<CardStyle, string> = {
  gold: 'bg-white/5 text-white/40',
  cyan: 'bg-[#00B4CC]/15 text-[#00B4CC]',
  mint: 'bg-[#A8D8A8]/10 text-[#A8D8A8]',
};
const TITLE_CLS: Record<CardStyle, string> = {
  gold: 'text-white group-hover:text-[#D4A351]',
  cyan: 'text-[#00B4CC] group-hover:text-white',
  mint: 'text-[#A8D8A8] group-hover:text-white',
};
const CTA_CLS: Record<CardStyle, string> = {
  gold: 'text-[#D4A351]/70 group-hover:text-[#D4A351]',
  cyan: 'text-[#00B4CC]/70 group-hover:text-[#00B4CC]',
  mint: 'text-[#A8D8A8]/70 group-hover:text-[#A8D8A8]',
};

function HubCardItem({ card, onClick }: { card: HubCard; onClick: () => void }) {
  const LIcon = card.lucideIcon;
  const cta =
    card.action.type === 'navigate'
      ? 'Abrir sub-flujo →'
      : card.action.type === 'synthesis'
      ? 'Ver imagen + copiar texto →'
      : 'Ver instrucción →';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl border bg-gradient-to-br from-[#0A2753] to-[#041A3A] p-3.5 text-left shadow-lg transition ${BORDER[card.style]}`}
    >
      <span className={`absolute right-2.5 top-2.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TAG_CLS[card.style]}`}>
        {card.tag}
      </span>
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          card.style === 'gold' ? 'bg-[#D4A351]/15' : card.style === 'cyan' ? 'bg-[#00B4CC]/15' : 'bg-[#A8D8A8]/10'
        }`}>
          {card.icon ? (
            <img src={card.icon} alt="" className="h-4 w-4 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : LIcon ? (
            <LIcon size={13} className={card.style === 'gold' ? 'text-[#D4A351]' : card.style === 'cyan' ? 'text-[#00B4CC]' : 'text-[#A8D8A8]'} />
          ) : null}
        </div>
        <span className="text-[9px] font-bold text-white/20">{String(card.id).padStart(2, '0')}</span>
      </div>
      <p className={`mb-1 text-[11px] font-bold leading-tight pr-6 ${TITLE_CLS[card.style]}`}>{card.title}</p>
      <p className="line-clamp-2 flex-1 text-[10px] leading-snug text-white/50">{card.description}</p>
      <p className={`mt-2 text-[10px] font-semibold ${CTA_CLS[card.style]}`}>{cta}</p>
    </button>
  );
}

// ─── Arrow connectors ─────────────────────────────────────────────────────────

function ArrowRight16() {
  return (
    <div className="flex items-center justify-center px-0.5 shrink-0">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
        <path d="M0 6 L14 6 M10 2 L14 6 L10 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ArrowLeft16() {
  return (
    <div className="flex items-center justify-center px-0.5 shrink-0">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
        <path d="M18 6 L4 6 M8 2 L4 6 L8 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="flex justify-end pr-0">
      <div className="w-1/4 flex items-center justify-center py-0.5">
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden>
          <path d="M7 0 L7 16 M3 12 L7 16 L11 12" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step2A_NotebookGuide() {
  const navigate = useNavigate();
  const { courseDetail } = useSyllabus();
  const { context } = useAppContext();

  const [imageModal, setImageModal] = useState<{ title: string; image: string } | null>(null);
  const [synthModal, setSynthModal] = useState(false);

  const courseName = courseDetail?.name ?? context?.course_name ?? '';
  const synthesisText = buildSynthesisText(courseName);

  const HUB_CARDS: HubCard[] = [
    {
      id: 1,
      icon: '/notebooklmICONS/ICONNOTEBOOK_1_CREARNUEVOCUADERNO.png',
      title: 'Crear nuevo cuaderno',
      description: 'Accede a NotebookLM y crea un cuaderno dedicado para el curso.',
      tag: 'Inicio',
      action: { type: 'modal', image: '/images/notebooklm_steps/step1.png' },
      style: 'gold',
    },
    {
      id: 2,
      icon: '/notebooklmICONS/ICONNOTEBOOK_2_VIAMANUAL.png',
      title: 'Carga manual de fuentes',
      description: 'Sube archivos, enlaces web, YouTube o Google Drive.',
      tag: 'Manual',
      action: { type: 'navigate', to: '/creator/fuentes/notebook/manual' },
      style: 'cyan',
    },
    {
      id: 3,
      icon: '/notebooklmICONS/ICONNOTEBOOK_3_DEEPRESEARCH.png',
      title: 'Deep Research con IA',
      description: 'Búsqueda automática de bibliografía académica verificada.',
      tag: 'IA',
      action: { type: 'navigate', to: '/creator/fuentes/notebook/ia' },
      style: 'cyan',
    },
    {
      id: 4,
      icon: '/notebooklmICONS/ICONNOTEBOOK_4_Verificación de fuentes.png',
      title: 'Verificar fuentes cargadas',
      description: 'Confirma que las fuentes se cargaron correctamente en el cuaderno.',
      tag: 'Verificar',
      action: { type: 'modal', image: '/images/notebooklm_steps/step3.png' },
      style: 'gold',
    },
    {
      id: 5,
      icon: '',
      lucideIcon: ExternalLink,
      title: 'Consultar el asistente',
      description: 'Haz preguntas sobre las fuentes cargadas para explorar el contenido.',
      tag: 'Consulta',
      action: { type: 'modal', image: '/images/notebooklm_steps/step4.png' },
      style: 'gold',
    },
    {
      id: 6,
      icon: '',
      lucideIcon: Copy,
      title: 'Generar referencias APA',
      description: 'Pide al asistente que liste todas las fuentes en formato APA 7.',
      tag: 'Referencias',
      action: { type: 'modal', image: '/images/notebooklm_steps/step5.png' },
      style: 'gold',
    },
    {
      id: 7,
      icon: '',
      lucideIcon: Copy,
      title: 'Prompt de Síntesis',
      description: 'Usa el texto preparado por SIGESIL para generar el resumen y las referencias del curso.',
      tag: 'Síntesis',
      action: { type: 'synthesis', image: '/images/notebooklm_steps/step6.png' },
      style: 'mint',
    },
    {
      id: 8,
      icon: '',
      lucideIcon: Download,
      title: 'Exportar a SIGESIL',
      description: 'Copia las referencias APA y cárgalas en el módulo de bibliografía.',
      tag: 'Export',
      action: { type: 'modal', image: '/images/notebooklm_steps/step7.png' },
      style: 'gold',
    },
  ];

  const row1 = HUB_CARDS.slice(0, 4);
  const row2 = HUB_CARDS.slice(4, 8);

  const handleCard = (card: HubCard) => {
    if (card.action.type === 'navigate') {
      navigate(card.action.to);
    } else if (card.action.type === 'synthesis') {
      setSynthModal(true);
    } else {
      setImageModal({ title: card.title, image: card.action.image });
    }
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
            SUB-PASO — FUENTES Y SOPORTE DOCUMENTAL
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">Guía NotebookLM</h1>
          <p className="mt-1 text-[11px] text-white/60">
            8 pasos para organizar y sintetizar fuentes del curso. Haz clic en cada tarjeta.
          </p>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#D4A351]/50 bg-[#D4A351]/10" />
            <span className="text-white/40">Ver instrucción</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#00B4CC]/50 bg-[#00B4CC]/10" />
            <span className="text-white/40">Sub-flujo detallado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#A8D8A8]/50 bg-[#A8D8A8]/10" />
            <span className="text-white/40">Imagen + texto para copiar</span>
          </div>
        </div>

        {/* ── Row 1 (1→4, L to R) ────────────────────────────────────────── */}
        <div className="flex items-stretch">
          {row1.map((card, i) => (
            <React.Fragment key={card.id}>
              <div className="min-w-0 flex-1">
                <HubCardItem card={card} onClick={() => handleCard(card)} />
              </div>
              {i < row1.length - 1 && <ArrowRight16 />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Vertical connector (right side, 4→5) ───────────────────────── */}
        <ArrowDown />

        {/* ── Row 2 (8←5, R to L displayed) ─────────────────────────────── */}
        <div className="flex items-stretch">
          {[...row2].reverse().map((card, i) => (
            <React.Fragment key={card.id}>
              <div className="min-w-0 flex-1">
                <HubCardItem card={card} onClick={() => handleCard(card)} />
              </div>
              {i < row2.length - 1 && <ArrowLeft16 />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Info banner ─────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-[#00B4CC]/20 bg-[#00B4CC]/5 px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[#00B4CC]/80">
            Las tarjetas con borde <span className="font-semibold text-[#00B4CC]">cyan</span> abren un sub-flujo con pasos detallados.
            La tarjeta <span className="font-semibold text-[#A8D8A8]">verde</span> incluye el texto de síntesis listo para copiar.
            Las demás tarjetas muestran una imagen de guía.
          </p>
        </div>

        {/* ── Action bar ──────────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white">
            <ArrowLeft size={12} />Volver a Fuentes
          </button>
          <button type="button" onClick={() => navigate('/creator/fuentes')}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110">
            Listo, cargar referencias
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {imageModal && (
        <ImageModal title={imageModal.title} image={imageModal.image} onClose={() => setImageModal(null)} />
      )}

      {synthModal && (
        <SynthesisModal
          title="Prompt de Síntesis"
          image="/images/notebooklm_steps/step6.png"
          text={synthesisText}
          onClose={() => setSynthModal(false)}
        />
      )}
    </>
  );
}
