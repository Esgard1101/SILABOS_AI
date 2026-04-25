import React, { useState } from 'react';
import { ArrowLeft, File, Globe, HardDrive, LayoutGrid, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

// ─── Sub-step data ────────────────────────────────────────────────────────────

interface SubStep {
  id: number;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  detail: string;
  image: string;
}

const SUB_STEPS: SubStep[] = [
  {
    id: 1,
    icon: LayoutGrid,
    iconColor: 'text-white/50 bg-white/8',
    title: 'Panel de fuentes',
    description: 'Así se ve el panel de fuentes de NotebookLM donde cargarás todos los materiales.',
    detail: 'Al abrir tu cuaderno verás este panel lateral. Desde aquí gestionas todas las fuentes del curso. Haz clic en "+" para agregar.',
    image: '/images/notebooklm_steps/step2.png',
  },
  {
    id: 2,
    icon: File,
    iconColor: 'text-[#D4A351] bg-[#D4A351]/15',
    title: 'Subir archivos locales',
    description: 'PDFs, sílabos anteriores, libros o documentos desde tu computadora.',
    detail: 'Haz clic en "+" → "Subir archivo". Acepta PDF, .docx, .txt. El cuaderno extrae y procesa el contenido automáticamente.',
    image: '/images/notebooklm_steps/step2a.png',
  },
  {
    id: 3,
    icon: Globe,
    iconColor: 'text-[#00B4CC] bg-[#00B4CC]/15',
    title: 'Agregar enlaces y YouTube',
    description: 'Artículos en línea, páginas institucionales o videos académicos de YouTube.',
    detail: 'Haz clic en "+" → "URL del sitio web" o "Video de YouTube". Pega el enlace y confirma. NotebookLM extrae el contenido relevante.',
    image: '/images/notebooklm_steps/step2b.png',
  },
  {
    id: 4,
    icon: HardDrive,
    iconColor: 'text-[#A8D8A8] bg-[#A8D8A8]/10',
    title: 'Google Drive',
    description: 'Documentos, presentaciones o archivos guardados en tu Google Drive.',
    detail: 'Haz clic en "+" → "Google Drive". Autoriza el acceso y selecciona el archivo. Se sincroniza automáticamente.',
    image: '/images/notebooklm_steps/step2c.png',
  },
];

// ─── Card component ───────────────────────────────────────────────────────────

function SubStepCard({ step, onClick }: { step: SubStep; onClick: () => void }) {
  const Icon = step.icon;
  return (
    <button type="button" onClick={onClick}
      className="group flex flex-col rounded-xl border border-[#D4A351]/30 bg-gradient-to-br from-[#0A2753] to-[#041A3A] p-4 text-left shadow-lg transition hover:border-[#D4A351]/60 hover:shadow-[0_8px_24px_rgba(212,163,81,0.12)]">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${step.iconColor}`}>
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-bold text-white/20">{String(step.id).padStart(2, '0')}</span>
      </div>
      <p className="mb-1.5 text-[11px] font-bold leading-tight text-white group-hover:text-[#D4A351]">{step.title}</p>
      <p className="mb-3 flex-1 text-[10px] leading-relaxed text-white/50">{step.description}</p>
      <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-white/40">{step.detail}</p>
      </div>
      <p className="mt-2.5 text-[10px] font-semibold text-[#D4A351]/70 group-hover:text-[#D4A351]">Ver cómo hacerlo →</p>
    </button>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center px-1 shrink-0">
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
        <path d="M0 6 L12 6 M8 2 L12 6 L8 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Step2A_1_ManualUpload() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ title: string; image: string } | null>(null);

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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4A351]/20">
              <img src="/notebooklmICONS/ICONNOTEBOOK_2_VIAMANUAL.png" alt="Manual" className="h-4 w-4 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4A351]">
              SUB-PASO — CARGA MANUAL DE FUENTES
            </span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-white">Carga manual de fuentes</h1>
          <p className="mt-1 text-[11px] text-white/60">
            4 pasos: conoce el panel y carga tus fuentes por archivo, enlace o Drive.
          </p>
        </div>

        {/* ── Cards ──────────────────────────────────────────────────────── */}
        <div className="flex items-stretch">
          {SUB_STEPS.map((step, i) => (
            <React.Fragment key={step.id}>
              <div className="min-w-0 flex-1">
                <SubStepCard step={step} onClick={() => setModal({ title: step.title, image: step.image })} />
              </div>
              {i < SUB_STEPS.length - 1 && <FlowArrow />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Tip ────────────────────────────────────────────────────────── */}
        <div className="mt-5 rounded-xl border border-[#D4A351]/15 bg-[#D4A351]/5 px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[#D4A351]/70">
            Puedes combinar los tres métodos en el mismo cuaderno. NotebookLM indexa todas las fuentes
            juntas y permite consultarlas de forma cruzada con su asistente de IA.
          </p>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/creator/fuentes/notebook')}
            className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white">
            <ArrowLeft size={12} />Volver a la Guía Principal
          </button>
          <button type="button" onClick={() => navigate('/creator/fuentes/notebook/ia')}
            className="flex items-center gap-2 rounded-lg border border-[#00B4CC]/40 bg-[#00B4CC]/10 px-4 py-1.5 text-[11px] font-bold text-[#00B4CC] transition hover:bg-[#00B4CC]/20">
            Siguiente: Deep Research →
          </button>
        </div>
      </div>

      {modal && <ImageModal title={modal.title} image={modal.image} onClose={() => setModal(null)} />}
    </>
  );
}
