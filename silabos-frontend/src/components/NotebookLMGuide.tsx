import React, { useEffect, useState } from 'react';
import { Check, ClipboardCopy, ExternalLink, X } from 'lucide-react';

interface UploadedBiblio {
  docId: string;
  fileName: string;
  refCount: number;
}

interface NotebookLMGuideProps {
  courseName: string;
  sumilla: string;
  metodologias?: string;
  onFileSelected?: (file: File) => void;
  uploading?: boolean;
  uploadedBiblio?: UploadedBiblio | null;
  onRemoveBiblio?: () => void;
  removingBiblio?: boolean;
}

interface ModalContent {
  title: string;
  image?: string;
  prompt?: string;
  promptLabel?: string;
}

const IMG = {
  step1:  '/images/notebooklm_steps/step1.png',
  step2a: '/images/notebooklm_steps/step2a.png',
  step2b: '/images/notebooklm_steps/step2b.png',
  step2c: '/images/notebooklm_steps/step2c.png',
  step2d1:'/images/notebooklm_steps/step2d1.png',
  step2d2:'/images/notebooklm_steps/step2d2.png',
  step2d4:'/images/notebooklm_steps/step2d4.png',
  step3:  '/images/notebooklm_steps/step3.png',
  step4:  '/images/notebooklm_steps/step4.png',
  step5:  '/images/notebooklm_steps/step5.png',
  step6:  '/images/notebooklm_steps/step6.png',
  step7:  '/images/notebooklm_steps/step7.png',
};

function buildSearchPrompt(courseName: string, sumilla: string, metodologias?: string): string {
  const metodoLine = metodologias?.trim()
    ? `\n\nEnfoques metodológicos del curso: ${metodologias.trim()}`
    : '';
  return `Actúa como un investigador académico experto. Busca exactamente 15 referencias bibliográficas académicas de alta calidad para el curso "${courseName}" de nivel universitario de pregrado.

Descripción del curso: ${sumilla.slice(0, 500)}${metodoLine}

Restricciones estrictas de fuentes:
- Excluir totalmente sitios de documentos compartidos por usuarios como Scribd, StuDocu, SlideShare, Wikipedia, blogs o páginas web no verificadas
- Usar solo literatura científica, repositorios indexados y editoriales oficiales
- Priorizar fuentes de alta relevancia académica en español e inglés publicadas después del año 2010

Distribución de las 15 fuentes:
- Incluir libros universitarios fundamentales del área publicados por editoriales académicas de prestigio internacional como Pearson, McGraw-Hill, Cengage, Springer, Elsevier o Alfaomega
- Incluir investigación hispanohablante, con prioridad en Perú y Latinoamérica, usando exclusivamente SciELO, Redalyc, Dialnet, ALICIA (CONCYTEC), RENATI (SUNEDU), biblioteca.concytec.gob.pe, arXiv o repositorios institucionales de universidades reconocidas como PUCP y UNMSM
- Incluir exactamente 2 referencias en inglés de alto impacto, indizadas en Scopus o Web of Science, publicadas estrictamente en los últimos 3 años, o provenientes de repositorios de universidades top mundiales como MIT, Cambridge o University of Chicago

Formato de salida:
- Presentar la lista numerada del 1 al 15
- Redactar cada referencia estrictamente en formato APA 7ma edición
- Para cada referencia incluir título completo, autor(es), año, editorial o revista, y DOI o URL de acceso directo al repositorio oficial del documento`;
}

function buildConsolidatePrompt(courseName: string, sumilla: string): string {
  return `Analiza TODAS las fuentes cargadas en este cuaderno (libros, artículos, sílabos, videos) y genera un documento estructurado con las siguientes secciones exactas, en este orden y con estos títulos exactos:

## RESUMEN DEL ÁREA
Escribe un resumen académico de 300-400 palabras sobre el campo de conocimiento del curso "${courseName}". Incluye los enfoques teóricos principales, debates actuales y aplicaciones relevantes. Basa el resumen únicamente en las fuentes cargadas.

## CONCEPTOS CLAVE
Lista entre 10 y 15 conceptos fundamentales del área. Para cada uno escribe una definición breve de 1-2 oraciones basada en las fuentes. Formato:
**Concepto**: definición.

## ENFOQUES METODOLÓGICOS
Describe los principales enfoques o métodos que aparecen en las fuentes y que son relevantes para enseñar o investigar en este campo. Basado en: ${sumilla.slice(0, 400)}

## REFERENCIAS BIBLIOGRÁFICAS
Lista TODAS las fuentes que has analizado en formato APA 7 estricto.(MINIMO 10 FUENTES, MAXIMO 15 FUENTES). Sigue estas reglas al pie de la letra:
Reglas obligatorias:
- Libros: Apellido, N. (año). Título en cursiva. Editorial. DOI o URL si existe.
- Artículos: Apellido, N. (año). Título del artículo. Nombre de la Revista en cursiva, volumen(número), páginas. https://doi.org/xxx
- Videos de YouTube: Apellido, N. [Canal] (año, día mes). Título del video [Video]. YouTube. URL
- Sílabos o documentos institucionales: Institución. (año). Título del documento. Tipo de documento.
- Ordena alfabéticamente por apellido del primer autor.


Responde únicamente con las cuatro secciones. Sin introducción ni cierre.`;
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  number,
  title,
  description,
  children,
  onClick,
}: {
  number: number;
  title: string;
  description: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'linear-gradient(345deg, rgba(63,94,251,1) 0%, rgba(156,82,180,1) 50%, rgba(252,70,107,1) 93%)' }}
      className={[
        'rounded-2xl border p-4 shadow-lg transition-all duration-200',
        onClick
          ? 'cursor-pointer border-white/20 hover:border-white/40 hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.01]'
          : 'border-white/15',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Badge */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white ring-1 ring-white/40 backdrop-blur-sm">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs text-white/70">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotebookLMGuide({
  courseName,
  sumilla,
  metodologias,
  onFileSelected,
  uploading = false,
  uploadedBiblio = null,
  onRemoveBiblio,
  removingBiblio = false,
}: NotebookLMGuideProps) {
  const [modal, setModal] = useState<ModalContent | null>(null);
  const [step2Tab, setStep2Tab] = useState<'upload' | 'deepresearch'>('upload');
  const [copied, setCopied] = useState(false);

  const searchPrompt = buildSearchPrompt(courseName, sumilla, metodologias);
  const consolidatePrompt = buildConsolidatePrompt(courseName, sumilla);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  const openModal = (content: ModalContent) => { setCopied(false); setModal(content); };
  const closeModal = () => setModal(null);
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Step 2 – Tab A options
  const uploadOptions = [
    { icon: '💻', label: 'Archivos locales',           hint: 'PDF, imágenes o documentos de tu PC',   img: IMG.step2a, imgTitle: 'Subir archivos locales' },
    { icon: '🌐', label: 'Sitios web o YouTube',        hint: 'Pega la URL de un artículo o video',    img: IMG.step2b, imgTitle: 'Agregar sitios web o videos de YouTube' },
    { icon: '📂', label: 'Google Drive / texto copiado', hint: 'Conecta con Drive o pega texto plano', img: IMG.step2c, imgTitle: 'Usar Google Drive o texto copiado' },
  ];

  // Step 2 – Tab B sub-steps
  const deepResearchSubs = [
    {
      num: '1',
      label: 'Abre el buscador y elige "Deep Research" en el menú desplegable',
      image: IMG.step2d1,
      imageTitle: 'Seleccionar Deep Research',
    },
    {
      num: '2',
      label: 'Pega el prompt de búsqueda generado y ejecuta la investigación',
      image: IMG.step2d2,
      imageTitle: 'Pegar prompt en la caja de búsqueda',
      prompt: searchPrompt,
      promptLabel: 'Prompt de búsqueda de fuentes',
    },
    {
      num: '3',
      label: 'Al finalizar, importa las fuentes encontradas al cuaderno',
      image: IMG.step2d4,
      imageTitle: 'Importar fuentes al finalizar la investigación',
    },
  ];

  return (
    <>
      {/* ── Modal overlay ─────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className={[
              'relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl',
              modal.prompt ? 'max-w-4xl' : 'max-w-2xl',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-sm font-bold text-gray-900">{modal.title}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className={modal.image && modal.prompt ? 'grid grid-cols-1 gap-5 md:grid-cols-2' : ''}>
              {modal.image && (
                <img
                  src={modal.image}
                  alt={modal.title}
                  className="max-h-[65vh] w-full rounded-xl border border-gray-100 object-contain shadow-sm"
                />
              )}
              {modal.prompt && (
                <div className="flex flex-col gap-2">
                  {modal.promptLabel && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {modal.promptLabel}
                    </p>
                  )}
                  <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4 overflow-auto max-h-[55vh]">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-700">
                      {modal.prompt}
                    </pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(modal.prompt!)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    {copied ? (
                      <><Check className="h-4 w-4" /> Copiado</>
                    ) : (
                      <><ClipboardCopy className="h-4 w-4" /> Copiar prompt</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Steps ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Step 1 */}
        <StepCard
          number={1}
          title="Abre NotebookLM y crea tu cuaderno"
          description="Ve a notebooklm.google.com con tu cuenta Google y haz clic en '+ Crear nuevo'."
          onClick={() => openModal({ title: 'Crear un nuevo cuaderno', image: IMG.step1 })}
        >
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="https://notebooklm.google.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              Abrir NotebookLM <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-[11px] text-white/40 italic">o clic en la card para ver la guía</span>
          </div>
        </StepCard>

        {/* Step 2 — bifurcación con tabs (card sin onClick global: tiene elementos internos) */}
        <StepCard
          number={2}
          title="Carga tus fuentes bibliográficas"
          description="Sube tus propios archivos o usa el agente Deep Research de NotebookLM para buscar fuentes académicas."
        >
          {/* Tabs */}
          <div className="mt-3 flex gap-1 rounded-xl border border-white/20 bg-black/20 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setStep2Tab('upload')}
              className={[
                'flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                step2Tab === 'upload'
                  ? 'border-white/80 bg-white text-slate-900 shadow-md shadow-black/10'
                  : 'border-white/20 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white',
              ].join(' ')}
            >
              📁 Subir mis archivos
            </button>
            <button
              type="button"
              onClick={() => setStep2Tab('deepresearch')}
              className={[
                'flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                step2Tab === 'deepresearch'
                  ? 'border-white/80 bg-white text-slate-900 shadow-md shadow-black/10'
                  : 'border-white/20 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white',
              ].join(' ')}
            >
              🔍 Deep Research
            </button>
          </div>

          {/* Tab A */}
          {step2Tab === 'upload' && (
            <div className="mt-3 space-y-2">
              {uploadOptions.map((opt) => (
                <div
                  key={opt.label}
                  onClick={() => openModal({ title: opt.imgTitle, image: opt.img })}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15"
                >
                  <span className="text-lg">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{opt.label}</p>
                    <p className="text-[11px] text-white/70">{opt.hint}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-white/85">Ver →</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab B */}
          {step2Tab === 'deepresearch' && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-white/45 italic">
                NotebookLM tiene un agente de búsqueda integrado. Sigue estos pasos:
              </p>
              {deepResearchSubs.map((sub) => (
                <div
                  key={sub.num}
                  onClick={() =>
                    openModal({
                      title: sub.imageTitle,
                      image: sub.image,
                      prompt: sub.prompt,
                      promptLabel: sub.promptLabel,
                    })
                  }
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900 ring-1 ring-white/70">
                    {sub.num}
                  </span>
                  <p className="flex-1 text-xs text-white">{sub.label}</p>
                  <span className="shrink-0 text-[11px] font-medium text-white/85">
                    {sub.prompt ? 'Ver prompt →' : 'Ver →'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </StepCard>

        {/* Step 3 */}
        <StepCard
          number={3}
          title='En el Studio, selecciona "Informes"'
          description="Con las fuentes cargadas, ve al panel Studio (columna derecha) y haz clic en la opción Informes."
          onClick={() => openModal({ title: 'Seleccionar "Informes" en el Studio', image: IMG.step3 })}
        />

        {/* Step 4 */}
        <StepCard
          number={4}
          title='Escoge "Resumen" y haz clic en el lápiz'
          description='Selecciona el tipo "Resumen" y usa el ícono de lápiz para personalizar las instrucciones del informe.'
          onClick={() => openModal({ title: 'Seleccionar Resumen y personalizar', image: IMG.step4 })}
        />

        {/* Step 5 — prompt de consolidación */}
        <StepCard
          number={5}
          title="Pega el prompt de consolidación y genera"
          description='Copia el prompt generado para este curso, pégalo en la caja de texto y haz clic en "Generar".'
          onClick={() =>
            openModal({
              title: 'Prompt de consolidación para este curso',
              image: IMG.step5,
              prompt: consolidatePrompt,
              promptLabel: 'Prompt de consolidación',
            })
          }
        >
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/50 italic">
            <ClipboardCopy className="h-3 w-3" />
            Haz clic en la card para ver el prompt generado
          </div>
        </StepCard>

        {/* Step 6 */}
        <StepCard
          number={6}
          title="El informe aparece en el Studio"
          description="Una vez generado, aparece en la parte inferior del Studio. Haz clic en los tres puntos (⋮) para ver las opciones."
          onClick={() =>
            openModal({ title: 'Informe generado con opciones de exportar', image: IMG.step6 })
          }
        />

        {/* Step 7 */}
        <StepCard
          number={7}
          title="Exporta como Google Doc y descarga el PDF"
          description='Elige "Exportar a Documentos". En Google Docs ve a Archivo → Descargar → PDF. Luego sube ese PDF aquí abajo.'
          onClick={() => openModal({ title: 'Exportar como Google Doc', image: IMG.step7 })}
        />

        {/* Upload area */}
        <div
          style={{ background: 'linear-gradient(345deg, rgba(63,94,251,0.15) 0%, rgba(156,82,180,0.15) 50%, rgba(252,70,107,0.15) 93%)' }}
          className="rounded-2xl border-2 border-dashed border-white/20 p-5 text-center"
        >
          {uploadedBiblio ? (
            /* ── Archivo ya subido ── */
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-[260px]">
                    {uploadedBiblio.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {uploadedBiblio.refCount > 0
                      ? `${uploadedBiblio.refCount} referencias extraídas automáticamente`
                      : 'Archivo cargado — no se detectaron referencias APA'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemoveBiblio}
                disabled={removingBiblio}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {removingBiblio ? 'Eliminando…' : '✕ Quitar archivo'}
              </button>
            </div>
          ) : (
            /* ── Sin archivo aún ── */
            <>
              <p className="mb-1 text-sm font-medium text-gray-800">Sube el output de NotebookLM</p>
              <p className="mb-3 text-xs text-gray-500">PDF, Markdown o TXT · Solo un archivo por sílabo</p>
              <label className="inline-block cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">
                  {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.md,.txt"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0];
                    if (file && onFileSelected) onFileSelected(file);
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </>
  );
}
