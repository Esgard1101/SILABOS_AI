import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';
import GlassModal from '../../components/ui/GlassModal';

const VIDEO_POSTER = '/images/notebooklm_steps/step2d5.png';
const NOTEBOOK_URL = 'https://notebooklm.google.com';
const NOTEBOOK_VIDEOS = {
  openNotebook: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777685690/paso1_abrirnotebook_d3bvlq.mp4',
  manualUpload: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777685611/CARGAMANUAL_s0ov29.mp4',
  chatSetup: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777700733/configurarchat_diqdio.mp4',
  sourcesExport: 'https://res.cloudinary.com/dmkk2x0fq/video/upload/v1777700960/0501_ug5k8u.mp4',
} as const;

function buildChatSetupPrompt(): string {
  return `Responde solo con JSON válido. Extrae datos reales de las fuentes: autor, año, título, fuente, url, tipo, requiere_revision y motivo_revision. No agregues explicaciones ni Markdown. No uses citas internas como [1] o [2]. No inventes datos: si faltan usa "S.A.", "s.f." o "".`;
}

function buildSourcesExportPrompt(courseName: string): string {
  return `Extrae TODAS las fuentes cargadas en este cuaderno para el curso "${courseName || 'el curso'}" y devuelve un arreglo JSON válido.

Antes de responder:
1. Cuenta cuántas fuentes hay en el panel de fuentes.
2. Genera un objeto por cada fuente procesada.
3. Si dos fuentes parecen representar la misma obra, conserva ambas solo si realmente provienen de fuentes distintas, pero marca la repetida con requiere_revision=true.
4. Si una fuente proviene de una tienda, marketplace, ficha comercial o resultado de búsqueda, no la descartes, pero marca requiere_revision=true y explica el motivo.
5. No uses marcadores internos de NotebookLM como [1], [2] o enlaces internos.
6. Extrae DOI o URL original solo si aparece explícitamente en la fuente.
7. No inventes datos. Si no encuentras autor usa "S.A."; si no encuentras año usa "s.f."; si no encuentras URL usa "".
8. Si el título parece nombre de archivo, página comercial o título generado automáticamente, marca requiere_revision=true.
9. No devuelvas bibliografía redactada en APA. Devuelve solo datos estructurados.

Usa exactamente esta estructura:

[
  {
    "autor": "Apellido, Inicial(es). o S.A.",
    "anio": "2024 o s.f.",
    "titulo": "Título real de la fuente",
    "fuente": "Revista, editorial, repositorio, institución, canal o sitio",
    "url": "DOI o URL original, vacío si no existe",
    "tipo": "artículo | libro | tesis | documentación | web | video",
    "requiere_revision": false,
    "motivo_revision": ""
  }
]

Responde únicamente con el JSON válido.`;
}

function buildDeepResearchPrompt(courseName: string, area: string, program: string): string {
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

interface GuideContent {
  image?: string;
  videoUrl?: string;
  prompt?: string;
  promptLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  externalUrl?: string;
  externalLabel?: string;
  steps: readonly string[];
  note?: string;
}

interface GuideTab {
  label: string;
  content: GuideContent;
}

function GuideContentBody({ content }: { content: GuideContent }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const { image, videoUrl, prompt, promptLabel, copyLabel = 'Copiar texto', copiedLabel = 'Copiado', externalUrl, externalLabel, steps, note } = content;

  const handleCopy = async () => {
    if (!prompt) return;
    const fallbackCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/10 bg-[#041A3A]/82 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Mini video guía</p>
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              poster={image}
              className="aspect-video w-full rounded-xl bg-black object-contain"
            />
          ) : image ? (
            <img
              src={image}
              alt=""
              className="aspect-video w-full rounded-xl object-contain"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-[#A8D8A8]/24 bg-[#041A3A]/82 p-4">
          {prompt ? (
            <>
              <div className="rounded-2xl border border-[#A8D8A8]/18 bg-[#A8D8A8]/8 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A8D8A8]/78">
                  {promptLabel || 'Texto listo'}
                </p>
                <p className="mx-auto mt-2 max-w-[19rem] text-[12px] font-semibold leading-5 text-white">
                  Copia este texto y pégalo directamente en NotebookLM.
                </p>
                <p className="mx-auto mt-1 max-w-[19rem] text-[10px] leading-5 text-white/48">
                  No necesitas leerlo ni modificarlo. SIGEISIL ya preparó la instrucción.
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
                {showPrompt ? 'Ocultar texto técnico' : 'Ver texto técnico'}
              </button>
              {showPrompt ? (
                <div className="mt-3 max-h-[220px] overflow-y-auto rounded-xl border border-[#A8D8A8]/18 bg-[#061F45] p-3">
                  <pre className="whitespace-pre-wrap break-words font-sans text-[10px] leading-5 text-white/68">{prompt}</pre>
                </div>
              ) : null}
            </>
          ) : externalUrl ? (
            <div className="rounded-2xl border border-[#00B4CC]/22 bg-[#00B4CC]/8 p-4 text-center">
              <p className="mx-auto max-w-[19rem] text-[12px] font-semibold leading-5 text-white">
                Abre NotebookLM en una nueva pestaña y crea tu cuaderno.
              </p>
              <p className="mx-auto mt-1 max-w-[19rem] text-[10px] leading-5 text-white/48">
                Cuando termines, vuelve a esta pantalla para seguir con el siguiente paso.
              </p>
              <button
                type="button"
                onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] py-3 text-[12px] font-bold text-white transition hover:brightness-110"
              >
                <ExternalLink size={14} />
                {externalLabel || 'Ir a NotebookLM'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#061F45] p-4">
              <p className="text-[12px] font-semibold text-white">Sigue el video y vuelve al paso Fuentes</p>
              <p className="mt-2 text-[10px] leading-5 text-white/52">
                Para este paso no necesitas copiar ningún texto: el video muestra todo el proceso.
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
  );
}

function GuideModal({
  eyebrow,
  title,
  tabs,
  onClose,
}: {
  eyebrow: string;
  title: string;
  tabs: GuideTab[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const current = tabs[Math.min(activeTab, tabs.length - 1)];

  return (
    <GlassModal
      onClose={onClose}
      size="xl"
      eyebrow={eyebrow}
      title={title}
      subheader={
        tabs.length > 1 ? (
          <div className="flex gap-2 border-b border-white/10 px-5 py-3">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`rounded-xl px-3.5 py-2 text-[11px] font-semibold transition ${
                  index === activeTab
                    ? 'bg-[#00B4CC]/18 text-[#77E3F0] ring-1 ring-[#00B4CC]/35'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <GuideContentBody key={current.label} content={current.content} />
    </GlassModal>
  );
}

interface TimelineStep {
  id: number;
  icon: string;
  title: string;
  description: string;
  eyebrow: string;
  tabs: GuideTab[];
}

export default function Step2A_NotebookGuide() {
  const navigate = useNavigate();
  const { courseDetail } = useSyllabus();
  const { context } = useAppContext();

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(() => new Set());

  const courseName = courseDetail?.name ?? context?.course_name ?? '';
  const areaName = context?.school_name ?? '';
  const programName = context?.program_name ?? '';

  const TIMELINE_STEPS: TimelineStep[] = [
    {
      id: 1,
      icon: '/notebooklmICONS/iconnotebookcrearnuevocuaderno.png',
      title: 'Crear cuaderno',
      description: 'Abre NotebookLM y crea un cuaderno dedicado para este curso.',
      eyebrow: 'Paso 1 · Inicio del flujo',
      tabs: [
        {
          label: 'Crear cuaderno',
          content: {
            image: VIDEO_POSTER,
            videoUrl: NOTEBOOK_VIDEOS.openNotebook,
            externalUrl: NOTEBOOK_URL,
            externalLabel: 'Ir a NotebookLM',
            steps: [
              'Pulsa "Ir a NotebookLM" para abrirlo en una nueva pestaña.',
              'Inicia sesión con tu cuenta Google si te lo solicita.',
              'Haz clic en Crear cuaderno o Nuevo cuaderno.',
              'Vuelve a SIGEISIL y marca este paso como hecho.',
            ],
          },
        },
      ],
    },
    {
      id: 2,
      icon: '/notebooklmICONS/iconnotebook2viamanual.png',
      title: 'Agregar fuentes',
      description: 'Carga tus materiales manualmente o busca bibliografía con Deep Research.',
      eyebrow: 'Paso 2 · Carga de materiales',
      tabs: [
        {
          label: 'Carga manual',
          content: {
            image: VIDEO_POSTER,
            videoUrl: NOTEBOOK_VIDEOS.manualUpload,
            steps: [
              'Abre el panel de fuentes de NotebookLM.',
              'Haz clic en agregar fuente.',
              'Sube archivos, pega enlaces, agrega YouTube o elige Google Drive.',
              'Confirma que tus fuentes aparezcan cargadas antes de continuar.',
            ],
          },
        },
        {
          label: 'Deep Research con IA',
          content: {
            image: VIDEO_POSTER,
            prompt: buildDeepResearchPrompt(courseName, areaName, programName),
            promptLabel: 'Prompt de investigación',
            copyLabel: 'Copiar prompt',
            copiedLabel: 'Prompt copiado',
            steps: [
              'Abre Deep Research dentro de NotebookLM.',
              'Copia este prompt preparado por SIGEISIL.',
              'Pégalo en NotebookLM y espera los resultados.',
              'Agrega al cuaderno las fuentes académicas pertinentes.',
            ],
          },
        },
      ],
    },
    {
      id: 3,
      icon: '/notebooklmICONS/ICONNOTEBOOK_4_VerificaciÃ³n de fuentes.png',
      title: 'Verificar fuentes',
      description: 'Confirma que las fuentes se cargaron correctamente en el cuaderno.',
      eyebrow: 'Paso 3 · Verificación',
      tabs: [
        {
          label: 'Verificar fuentes',
          content: {
            image: '/images/notebooklm_steps/step3.png',
            steps: [
              'Abre el panel lateral de fuentes en NotebookLM.',
              'Revisa que cada fuente aparezca con su título y sin errores de carga.',
              'Si alguna falló, elimínala y vuelve a cargarla.',
            ],
          },
        },
      ],
    },
    {
      id: 4,
      icon: '/ajustarchat.png',
      title: 'Ajustar chat',
      description: 'Configura NotebookLM para responder en el formato que SIGEISIL puede importar.',
      eyebrow: 'Paso 4 · Preparación',
      tabs: [
        {
          label: 'Ajustar chat',
          content: {
            image: VIDEO_POSTER,
            videoUrl: NOTEBOOK_VIDEOS.chatSetup,
            prompt: buildChatSetupPrompt(),
            promptLabel: 'Prompt de ajuste del chat',
            copyLabel: 'Copiar ajuste',
            copiedLabel: 'Ajuste copiado',
            steps: [
              'Abre la configuración del chat en NotebookLM.',
              'Elige la opción Personalizado y pega este ajuste.',
              'Selecciona respuesta Más larga para cuadernos con muchas fuentes.',
              'Guarda la configuración antes de pedir la exportación.',
            ],
            note: 'Este ajuste ayuda a que NotebookLM responda en un bloque limpio y evita gastar consultas corrigiendo el formato.',
          },
        },
      ],
    },
    {
      id: 5,
      icon: '/pegarpromptDEJSON (1).png',
      title: 'Traer fuentes a SIGEISIL',
      description: 'Genera el bloque de fuentes y pégalo en el paso Fuentes.',
      eyebrow: 'Paso 5 · Exportación hacia SIGEISIL',
      tabs: [
        {
          label: 'Traer fuentes',
          content: {
            image: VIDEO_POSTER,
            videoUrl: NOTEBOOK_VIDEOS.sourcesExport,
            prompt: buildSourcesExportPrompt(courseName),
            promptLabel: 'Prompt para traer fuentes',
            copyLabel: 'Copiar instrucción',
            copiedLabel: 'Instrucción copiada',
            steps: [
              'Pega esta instrucción en el chat de NotebookLM ya configurado.',
              'Espera a que termine la respuesta completa.',
              'Copia todo el bloque generado por NotebookLM.',
              'Vuelve a SIGEISIL y pégalo en la caja "Pegar bloque de fuentes" del paso Fuentes.',
              'Procesa las fuentes y revisa la tabla del sílabo.',
            ],
            note: 'No pidas varias regeneraciones si no es necesario. En cuentas gratuitas, NotebookLM puede tener límite diario de consultas.',
          },
        },
      ],
    },
  ];

  const toggleDone = (id: number) => {
    setDoneSteps((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const activeStepData = TIMELINE_STEPS.find((step) => step.id === activeStep) ?? null;
  const completedCount = doneSteps.size;

  return (
    <>
      <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-5 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
              SUB-PASO - FUENTES Y SOPORTE DOCUMENTAL
            </p>
            <h1 className="font-playfair text-2xl font-bold text-white">Guía NotebookLM</h1>
            <p className="mt-1 text-[11px] text-white/60">
              Sigue estos 5 pasos de arriba hacia abajo para cargar, verificar y traer tus fuentes a SIGEISIL.
              Marca cada paso cuando lo termines.
            </p>
            <p className="mt-2 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold text-[#77E3F0] ring-1 ring-[#00B4CC]/25 backdrop-blur">
              {completedCount} de {TIMELINE_STEPS.length} pasos completados
            </p>
          </div>

          <ol className="space-y-0">
            {TIMELINE_STEPS.map((step, index) => {
              const isDone = doneSteps.has(step.id);
              const isLast = index === TIMELINE_STEPS.length - 1;
              return (
                <li key={step.id} className="relative flex gap-4 pb-5 last:pb-0">
                  {!isLast ? (
                    <span
                      aria-hidden
                      className={`absolute bottom-0 left-[21px] top-12 w-[2px] rounded-full transition-colors ${
                        isDone ? 'bg-[#00B4CC]' : 'bg-white/12'
                      }`}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => toggleDone(step.id)}
                    title={isDone ? 'Desmarcar paso' : 'Marcar paso como hecho'}
                    aria-pressed={isDone}
                    className={`z-10 mt-1 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold transition ${
                      isDone
                        ? 'bg-[#3BA55D] text-white shadow-[0_6px_16px_rgba(59,165,93,0.35)]'
                        : 'border-2 border-white/25 bg-[#0A2753] text-white/70 hover:border-[#00B4CC]/60 hover:text-white'
                    }`}
                  >
                    {isDone ? <Check size={18} /> : step.id}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={`group flex min-w-0 flex-1 items-center gap-4 rounded-3xl bg-white/[0.06] p-4 text-left backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.09] ${
                      isDone ? 'ring-1 ring-[#00B4CC]/40' : 'ring-1 ring-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] font-bold leading-tight ${isDone ? 'text-[#77E3F0]' : 'text-white'} group-hover:text-[#77E3F0]`}>
                        {step.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/55">{step.description}</p>
                      <p className="mt-2 text-[11px] font-semibold text-[#00B4CC]/80 group-hover:text-[#00B4CC]">
                        Abrir guía →
                      </p>
                    </div>
                    <img
                      src={step.icon}
                      alt=""
                      className="h-[58px] w-auto max-w-[84px] shrink-0 object-contain"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex items-center justify-between">
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
      </div>

      {activeStepData && (
        <GuideModal
          eyebrow={activeStepData.eyebrow}
          title={activeStepData.title}
          tabs={activeStepData.tabs}
          onClose={() => setActiveStep(null)}
        />
      )}
    </>
  );
}
