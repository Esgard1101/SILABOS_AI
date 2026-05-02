import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

const VIDEO_PLACEHOLDER = '/images/notebooklm_steps/step2d5.png';
const NOTEBOOK_VIDEOS = {
  openNotebook: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777685690/paso1_abrirnotebook_d3bvlq.mp4',
  manualUpload: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777685611/CARGAMANUAL_s0ov29.mp4',
  chatSetup: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777700733/configurarchat_diqdio.mp4',
  sourcesExport: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777700960/0501_ug5k8u.mp4',
} as const;

function buildChatSetupPrompt(): string {
  return `Responde solo con JSON valido. Extrae datos reales de las fuentes: autor, anio, titulo, fuente, url, tipo, requiere_revision y motivo_revision. No agregues explicaciones ni Markdown. No uses citas internas como [1] o [2]. No inventes datos: si faltan usa "S.A.", "s.f." o "".`;
}

function buildSourcesExportPrompt(courseName: string): string {
  return `Extrae TODAS las fuentes cargadas en este cuaderno para el curso "${courseName || 'el curso'}" y devuelve un arreglo JSON valido.

Antes de responder:
1. Cuenta cuantas fuentes hay en el panel de fuentes.
2. Genera un objeto por cada fuente procesada.
3. Si dos fuentes parecen representar la misma obra, conserva ambas solo si realmente provienen de fuentes distintas, pero marca la repetida con requiere_revision=true.
4. Si una fuente proviene de una tienda, marketplace, ficha comercial o resultado de busqueda, no la descartes, pero marca requiere_revision=true y explica el motivo.
5. No uses marcadores internos de NotebookLM como [1], [2] o enlaces internos.
6. Extrae DOI o URL original solo si aparece explicitamente en la fuente.
7. No inventes datos. Si no encuentras autor usa "S.A."; si no encuentras anio usa "s.f."; si no encuentras URL usa "".
8. Si el titulo parece nombre de archivo, pagina comercial o titulo generado automaticamente, marca requiere_revision=true.
9. No devuelvas bibliografia redactada en APA. Devuelve solo datos estructurados.

Usa exactamente esta estructura:

[
  {
    "autor": "Apellido, Inicial(es). o S.A.",
    "anio": "2024 o s.f.",
    "titulo": "Titulo real de la fuente",
    "fuente": "Revista, editorial, repositorio, institucion, canal o sitio",
    "url": "DOI o URL original, vacio si no existe",
    "tipo": "articulo | libro | tesis | documentacion | web | video",
    "requiere_revision": false,
    "motivo_revision": ""
  }
]

Responde unicamente con el JSON valido.`;
}

function buildDeepResearchPrompt(courseName: string, area: string, program: string): string {
  return `Necesito bibliografia academica verificada para preparar el silabo del siguiente curso universitario:

CURSO: ${courseName || '[Nombre del curso]'}
PROGRAMA: ${program || '[Programa academico]'}
AREA: ${area || '[Area academica]'}
UNIVERSIDAD: Universidad Nacional Pedro Ruiz Gallo (UNPRG)

Busca minimo 10 referencias bibliograficas:
- De los ultimos 5 anios
- En espanol e ingles
- Con DOI o URL verificable
- De fuentes academicas: SciELO, Redalyc, Dialnet, ERIC, repositorios universitarios o editoriales academicas
- Excluye blogs, Wikipedia, Scribd, StuDocu, SlideShare y paginas comerciales

Devuelve solo la lista de fuentes recomendadas para agregarlas al cuaderno.`;
}

function ImageModal({ title, image, onClose }: { title: string; image: string; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-[#D4A351] bg-[#0A2753] p-5 shadow-2xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white">
            <X size={13} />
          </button>
        </div>
        <img
          src={image}
          alt={title}
          className="w-full rounded-lg border border-white/10 object-contain"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      </div>
    </div>
  );
}

interface PromptVideoModalProps {
  title: string;
  eyebrow: string;
  image: string;
  videoUrl?: string;
  prompt?: string;
  promptLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  steps: string[];
  note?: string;
  onClose: () => void;
}

function PromptVideoModal({
  title,
  eyebrow,
  image,
  videoUrl,
  prompt,
  promptLabel,
  copyLabel = 'Copiar texto',
  copiedLabel = 'Copiado',
  steps,
  note,
  onClose,
}: PromptVideoModalProps) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = prompt;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-2xl border border-[#A8D8A8] bg-[#0A2753] p-5 shadow-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8D8A8]">{eyebrow}</p>
            <h3 className="mt-1 text-base font-bold text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/10 bg-[#041A3A]/82 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Mini video</p>
              <span className="rounded-full bg-[#D4A351]/16 px-2 py-0.5 text-[9px] font-semibold text-[#F2C260]">
                Placeholder
              </span>
            </div>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={image}
                className="aspect-video w-full rounded-xl border border-white/10 bg-black object-contain"
              />
            ) : (
              <img
                src={image}
                alt={title}
                className="aspect-video w-full rounded-xl border border-white/10 object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-[#A8D8A8]/24 bg-[#041A3A]/82 p-4">
            {prompt ? (
              <>
                <div className="rounded-2xl border border-[#A8D8A8]/18 bg-[#A8D8A8]/8 p-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A8D8A8]/78">
                    {promptLabel || 'Texto listo'}
                  </p>
                  <p className="mx-auto mt-2 max-w-[19rem] text-[12px] font-semibold leading-5 text-white">
                    Copia este texto y pegalo directamente en NotebookLM.
                  </p>
                  <p className="mx-auto mt-1 max-w-[19rem] text-[10px] leading-5 text-white/48">
                    No necesitas leerlo ni modificarlo. SIGEISIL ya preparo la instruccion.
                  </p>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition ${
                      copied
                        ? 'bg-[#A8D8A8] text-[#041A3A]'
                        : 'bg-gradient-to-r from-[#4A9A6A] to-[#A8D8A8] text-[#041A3A] hover:brightness-110'
                    }`}
                  >
                    {copied ? <><Check size={14} />{copiedLabel}</> : <><Copy size={14} />{copyLabel}</>}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrompt((current) => !current)}
                  className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold text-white/45 transition hover:text-white"
                >
                  {showPrompt ? 'Ocultar texto tecnico' : 'Ver texto tecnico'}
                </button>
                {showPrompt ? (
                  <div className="mt-3 max-h-[220px] overflow-y-auto rounded-xl border border-[#A8D8A8]/18 bg-[#061F45] p-3">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[10px] leading-5 text-white/68">{prompt}</pre>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#061F45] p-4">
                <p className="text-[12px] font-semibold text-white">Sigue el video y vuelve al paso Fuentes</p>
                <p className="mt-2 text-[10px] leading-5 text-white/52">
                  Esta pantalla queda lista para reemplazar la imagen por tu mini video cuando lo subas al cloud.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4A351]/18 text-[10px] font-bold text-[#F2C260]">
                {index + 1}
              </span>
              <p className="text-[10px] leading-5 text-white/62">{step}</p>
            </div>
          ))}
        </div>

        {note ? (
          <div className="mt-3 rounded-xl border border-[#D4A351]/18 bg-[#D4A351]/8 px-4 py-3">
            <p className="text-[10px] leading-5 text-[#F2C260]/82">{note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type CardAction =
  | { type: 'modal'; image: string }
  | { type: 'prompt'; promptKey: 'openNotebook' | 'manualUpload' | 'deepResearch' | 'chatSetup' | 'sourcesExport' }
  | { type: 'externalPrompt'; url: string; promptKey: 'openNotebook' }
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
  const isPromptCard = card.action.type === 'prompt' && ['chatSetup', 'deepResearch', 'sourcesExport'].includes(card.action.promptKey);
  const cta =
    card.action.type === 'navigate'
      ? 'Abrir sub-flujo ->'
    : isPromptCard
      ? 'Ver video + copiar prompt ->'
    : card.action.type === 'prompt' || card.action.type === 'externalPrompt'
      ? 'Ver video ->'
      : 'Ver instruccion ->';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[214px] flex-col rounded-2xl border bg-gradient-to-br from-[#0A2753] to-[#041A3A] p-4 text-left shadow-lg transition ${BORDER[card.style]}`}
    >
      <span className={`absolute right-2.5 top-2.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TAG_CLS[card.style]}`}>
        {card.tag}
      </span>
      <div className="mb-3 flex items-start justify-between gap-3 pr-11">
        <div className="shrink-0">
          {card.icon ? (
            <img
              src={card.icon}
              alt=""
              className="h-[74px] w-auto max-w-[104px] object-contain drop-shadow-[0_14px_24px_rgba(0,180,204,0.14)]"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : LIcon ? (
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              card.style === 'gold' ? 'bg-[#D4A351]/15' : card.style === 'cyan' ? 'bg-[#00B4CC]/15' : 'bg-[#A8D8A8]/10'
            }`}>
              <LIcon
                size={18}
                className={card.style === 'gold' ? 'text-[#D4A351]' : card.style === 'cyan' ? 'text-[#00B4CC]' : 'text-[#A8D8A8]'}
              />
            </div>
          ) : null}
        </div>
        <span className="pt-2 text-[10px] font-bold text-white/24">{String(card.id).padStart(2, '0')}</span>
      </div>
      <p className={`mb-1.5 pr-6 text-[14px] font-bold leading-tight ${TITLE_CLS[card.style]}`}>{card.title}</p>
      <p className="line-clamp-3 flex-1 text-[11px] leading-5 text-white/52">{card.description}</p>
      <p className={`mt-3 text-[11px] font-semibold ${CTA_CLS[card.style]}`}>{cta}</p>
    </button>
  );
}

function ArrowRight16() {
  return (
    <div className="flex shrink-0 items-center justify-center px-0.5">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
        <path d="M0 6 L14 6 M10 2 L14 6 L10 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ArrowLeft16() {
  return (
    <div className="flex shrink-0 items-center justify-center px-0.5">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
        <path d="M18 6 L4 6 M8 2 L4 6 L8 10" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="flex justify-end pr-0">
      <div className="flex w-1/4 items-center justify-center py-0.5">
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden>
          <path d="M7 0 L7 16 M3 12 L7 16 L11 12" stroke="#D4A351" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function Step2A_NotebookGuide() {
  const navigate = useNavigate();
  const { courseDetail } = useSyllabus();
  const { context } = useAppContext();

  const [imageModal, setImageModal] = useState<{ title: string; image: string } | null>(null);
  const [promptModal, setPromptModal] = useState<'openNotebook' | 'manualUpload' | 'deepResearch' | 'chatSetup' | 'sourcesExport' | null>(null);

  const courseName = courseDetail?.name ?? context?.course_name ?? '';
  const areaName = context?.school_name ?? '';
  const programName = context?.program_name ?? '';
  const chatSetupPrompt = buildChatSetupPrompt();
  const deepResearchPrompt = buildDeepResearchPrompt(courseName, areaName, programName);
  const sourcesExportPrompt = buildSourcesExportPrompt(courseName);

  const promptModalContent = {
    openNotebook: {
      title: 'Abrir NotebookLM y crear cuaderno',
      eyebrow: 'Inicio del flujo',
      image: VIDEO_PLACEHOLDER,
      videoUrl: NOTEBOOK_VIDEOS.openNotebook,
      steps: [
        'Se abre NotebookLM en una nueva pestana.',
        'Inicia sesion con tu cuenta Google si te lo solicita.',
        'Haz clic en Crear cuaderno o Nuevo cuaderno.',
        'Vuelve a SIGEISIL para seguir el siguiente mini paso.',
      ],
      note: 'Este video sera reemplazado por tu mini guia de 6 a 8 segundos cuando lo subas al cloud.',
    },
    manualUpload: {
      title: 'Carga manual de fuentes',
      eyebrow: 'Carga de materiales',
      image: VIDEO_PLACEHOLDER,
      videoUrl: NOTEBOOK_VIDEOS.manualUpload,
      steps: [
        'Abre el panel de fuentes de NotebookLM.',
        'Haz clic en agregar fuente.',
        'Sube archivos, pega enlaces, agrega YouTube o elige Google Drive.',
        'Confirma que tus fuentes aparezcan cargadas antes de continuar.',
      ],
      note: 'Tu video resumira las opciones principales. Para este paso no hace falta prompt.',
    },
    deepResearch: {
      title: 'Deep Research con IA',
      eyebrow: 'Busqueda academica',
      image: VIDEO_PLACEHOLDER,
      prompt: deepResearchPrompt,
      promptLabel: 'Prompt de investigacion',
      copyLabel: 'Copiar prompt',
      copiedLabel: 'Prompt copiado',
      steps: [
        'Abre Deep Research dentro de NotebookLM.',
        'Copia este prompt preparado por SIGEISIL.',
        'Pegalo en NotebookLM y espera los resultados.',
        'Agrega al cuaderno las fuentes academicas pertinentes.',
      ],
      note: 'Tu video explicara los detalles del proceso. La pantalla solo deja el prompt listo para copiar.',
    },
    chatSetup: {
      title: 'Ajustar el chat de NotebookLM',
      eyebrow: 'Paso de preparacion',
      image: VIDEO_PLACEHOLDER,
      videoUrl: NOTEBOOK_VIDEOS.chatSetup,
      prompt: chatSetupPrompt,
      promptLabel: 'Prompt de ajuste del chat',
      copyLabel: 'Copiar ajuste',
      copiedLabel: 'Ajuste copiado',
      steps: [
        'Abre la configuracion del chat en NotebookLM.',
        'Elige la opcion Personalizado y pega este ajuste.',
        'Selecciona respuesta Mas larga para cuadernos con muchas fuentes.',
        'Guarda la configuracion antes de pedir la exportacion.',
      ],
      note: 'Este ajuste ayuda a que NotebookLM responda en un bloque limpio y evita gastar consultas corrigiendo el formato.',
    },
    sourcesExport: {
      title: 'Traer fuentes a SIGEISIL',
      eyebrow: 'Exportacion hacia SIGEISIL',
      image: VIDEO_PLACEHOLDER,
      videoUrl: NOTEBOOK_VIDEOS.sourcesExport,
      prompt: sourcesExportPrompt,
      promptLabel: 'Prompt para traer fuentes',
      copyLabel: 'Copiar instruccion',
      copiedLabel: 'Instruccion copiada',
      steps: [
        'Pega esta instruccion en el chat de NotebookLM ya configurado.',
        'Espera a que termine la respuesta completa.',
        'Copia todo el bloque generado por NotebookLM.',
        'Vuelve a SIGEISIL para pegarlo en la caja de importacion.',
        'Procesa las fuentes y revisa la tabla del silabo.',
      ],
      note: 'No pidas varias regeneraciones si no es necesario. En cuentas gratuitas, NotebookLM puede tener limite diario de consultas.',
    },
  } as const;

  const HUB_CARDS: HubCard[] = [
    {
      id: 1,
      icon: '/notebooklmICONS/iconnotebookcrearnuevocuaderno.png',
      title: 'Crear nuevo cuaderno',
      description: 'Abre NotebookLM en otra pestana y crea un cuaderno dedicado para el curso.',
      tag: 'Inicio',
      action: { type: 'externalPrompt', url: 'https://notebooklm.google.com', promptKey: 'openNotebook' },
      style: 'gold',
    },
    {
      id: 2,
      icon: '/notebooklmICONS/iconnotebook2viamanual.png',
      title: 'Carga manual de fuentes',
      description: 'Sube archivos, enlaces web, YouTube o documentos de Google Drive.',
      tag: 'Manual',
      action: { type: 'prompt', promptKey: 'manualUpload' },
      style: 'cyan',
    },
    {
      id: 3,
      icon: '/notebooklmICONS/iconnotebook3deepresearch.png',
      title: 'Deep Research con IA',
      description: 'Busca bibliografia academica y agrega fuentes relevantes al cuaderno.',
      tag: 'IA',
      action: { type: 'prompt', promptKey: 'deepResearch' },
      style: 'cyan',
    },
    {
      id: 4,
      icon: '/notebooklmICONS/ICONNOTEBOOK_4_VerificaciÃ³n de fuentes.png',
      title: 'Verificar fuentes cargadas',
      description: 'Confirma que las fuentes se cargaron correctamente en el cuaderno.',
      tag: 'Verificar',
      action: { type: 'modal', image: '/images/notebooklm_steps/step3.png' },
      style: 'gold',
    },
    {
      id: 5,
      icon: '/ajustarchat.png',
      title: 'Ajustar chat',
      description: 'Configura NotebookLM para responder en el formato que SIGEISIL puede importar.',
      tag: 'Config',
      action: { type: 'prompt', promptKey: 'chatSetup' },
      style: 'mint',
    },
    {
      id: 6,
      icon: '/pegarpromptDEJSON (1).png',
      title: 'Traer fuentes a SIGEISIL',
      description: 'Copia la instruccion, genera el bloque de fuentes y pegalo en la caja de importacion.',
      tag: 'Prompt',
      action: { type: 'prompt', promptKey: 'sourcesExport' },
      style: 'mint',
    },
  ];

  const handleCard = (card: HubCard) => {
    if (card.action.type === 'navigate') {
      navigate(card.action.to);
    } else if (card.action.type === 'prompt') {
      setPromptModal(card.action.promptKey);
    } else if (card.action.type === 'externalPrompt') {
      window.open(card.action.url, '_blank', 'noopener,noreferrer');
      setPromptModal(card.action.promptKey);
    } else {
      setImageModal({ title: card.title, image: card.action.image });
    }
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        <div className="mb-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
            SUB-PASO - FUENTES Y SOPORTE DOCUMENTAL
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">Guia NotebookLM</h1>
          <p className="mt-1 text-[11px] text-white/60">
            Roadmap guiado para cargar, verificar y traer fuentes desde NotebookLM hacia SIGEISIL.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#D4A351]/50 bg-[#D4A351]/10" />
            <span className="text-white/40">Ver instruccion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#00B4CC]/50 bg-[#00B4CC]/10" />
            <span className="text-white/40">Sub-flujo detallado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-[#A8D8A8]/50 bg-[#A8D8A8]/10" />
            <span className="text-white/40">Mini video + prompt</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {HUB_CARDS.map((card) => (
            <div key={card.id}>
              <HubCardItem card={card} onClick={() => handleCard(card)} />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-[#00B4CC]/20 bg-[#00B4CC]/5 px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[#00B4CC]/80">
            Las tarjetas con borde <span className="font-semibold text-[#00B4CC]">cyan</span> abren un sub-flujo con pasos detallados.
            Las tarjetas <span className="font-semibold text-[#A8D8A8]">verdes</span> incluyen mini video, instrucciones y prompt listo para copiar.
            Las demas tarjetas muestran una imagen de guia.
          </p>
        </div>

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

      {promptModal && (
        <PromptVideoModal
          {...promptModalContent[promptModal]}
          onClose={() => setPromptModal(null)}
        />
      )}
    </>
  );
}
