import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  PackageCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { ProgressiveProductOption } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import GlassModal from '../../components/ui/GlassModal';
import OverlayLoader from '../../components/ui/OverlayLoader';
import { useWizardStep } from './wizardSteps';

const PRODUCT_CATEGORIES = [
  'Libre de proponer por IA',
  'Investigacion Academica',
  'Produccion Multimedia / Digital',
  'Desarrollo Tecnologico y Prototipado',
  'Intervencion Educativa / Social',
  'Analisis y Resolucion de Casos',
  'Recopilacion y Evolucion',
];

const TERRITORIAL_CONTEXT_BLOCK =
  'La Universidad Nacional Pedro Ruiz Gallo (UNPRG) tiene su sede en Lambayeque. Su zona de influencia directa abarca Chiclayo (capital y eje comercial/urbano con distritos densos como Jose Leonardo Ortiz y La Victoria), balnearios y zonas costeras (Pimentel, Puerto Eten), zonas agricolas e historicas (Ferrenafe, Monsefu, Chongoyape, Sana, Cayalti, Tuman y Huaca Rajada). Regla: elige organicamente un solo lugar o distrito de esta lista que tenga total sentido semantico con el tema del curso.';
const NOTEBOOK_ICON = '/ICONEMPEZARNOTEBOOKLM.png';
const NOTEBOOK_VIDEO_PLACEHOLDER = '/images/notebooklm_steps/metodopdfantiguo/step3.png';

function timelineEntries(option: ProgressiveProductOption) {
  return Object.entries(option.timeline_json || {}).filter(([, value]) => String(value || '').trim());
}

function workObjectText(option: ProgressiveProductOption) {
  return option.work_object?.trim() || 'Objeto de trabajo pendiente de contextualizacion.';
}

function hasConcreteWorkObject(option?: ProgressiveProductOption | null) {
  const text = (option?.work_object || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return Boolean(text) && !text.includes('pendiente');
}

function NotebookHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      eyebrow="NotebookLM"
      title="Guia para traer el consolidado del producto"
      description="Copia el prompt, pegalo en NotebookLM y trae el consolidado para que la IA proponga productos con objeto de trabajo."
    >
      <img
        src={NOTEBOOK_VIDEO_PLACEHOLDER}
        alt="Guia visual NotebookLM"
        className="aspect-video w-full bg-black object-cover"
      />
      <p className="mt-3 text-[11px] leading-5 text-white/58">
        Este espacio queda preparado para reemplazar la imagen por un video tutorial cuando este listo.
      </p>
    </GlassModal>
  );
}

function buildProductNotebookPrompt(courseName: string, methodName: string, category: string, unitsCount: number) {
  return `Necesito un CONSOLIDADO PARA DEFINIR EL PRODUCTO ACREDITABLE INTEGRADOR de un curso universitario.

CURSO: ${courseName || '[nombre del curso]'}
METODO PEDAGOGICO: ${methodName || '[metodo seleccionado en SIGEISIL]'}
CATEGORIA DE PRODUCTO PREFERIDA: ${category}
NUMERO DE UNIDADES / DESEMPENOS: ${unitsCount}
NIVEL: universitario

Usa exclusivamente las fuentes cargadas en este cuaderno de NotebookLM. No redactes el silabo ni las 16 semanas. Entrega un insumo concreto para que SIGEISIL proponga productos acreditables basados en la investigacion del cuaderno.

Estructura obligatoria:

1. PROBLEMA O NECESIDAD FORMATIVA DEL CURSO
- Explica en 3 a 5 lineas que tipo de reto academico/profesional debe resolver el estudiante.

2. OBJETO PROFESIONAL QUE PODRIA CONSTRUIRSE
- Propon 2 o 3 objetos verificables: informe tecnico, protocolo, plan, instrumento, diagnostico, propuesta, dossier, prototipo, material, estrategia, intervencion, articulo o producto digital.
- Cada objeto debe estar conectado con las fuentes, no ser generico.

3. OBJETO DE TRABAJO CENTRAL DEL CURSO
- Define el objeto de trabajo central que guiara todas las unidades y el producto final.
- Debe depender del metodo pedagogico: caso, problema, proyecto, desafio, pregunta de investigacion, experiencia o fenomeno.
- Debe estar aterrizado al contexto territorial de la Universidad Nacional Pedro Ruiz Gallo.
- Contexto territorial y area de influencia: ${TERRITORIAL_CONTEXT_BLOCK}
- Evita repetir automaticamente el mismo distrito en todos los cursos. El lugar debe responder al tema, al metodo y al tipo de producto.

4. RECOMENDACION PRINCIPAL
- Entrega el Producto Acreditable final evaluable.
- Entrega el Objeto de Trabajo segun metodo.
- Justifica por que sirve para evaluar el curso y el metodo pedagogico.

5. AVANCES PA SUGERIDOS
- Distribuye el mismo producto en ${unitsCount} avances progresivos.
- Cada avance debe ser una parte del mismo producto, no un producto distinto.
- Cada PA debe nombrar explicitamente el objeto de trabajo.

6. CRITERIOS DE CALIDAD
- Lista 5 criterios que deberian evaluarse en el producto final.

Reglas:
- Tono docente universitario, concreto y profesional.
- No inventes bibliografia.
- No uses citas internas como [1] o [2].
- Evita recomendaciones vagas como "hacer una exposicion" o "elaborar un portafolio" sin objeto profesional claro.
- Devuelve claramente tres bloques: Producto Acreditable, Objeto de Trabajo y Linea de Tiempo PA.
- Devuelve texto ordenado y facil de copiar.`;
}

function ProductDetailModal({
  option,
  selected,
  busy,
  onSelect,
  onClose,
}: {
  option: ProgressiveProductOption;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const timeline = timelineEntries(option);
  return (
    <GlassModal
      onClose={onClose}
      size="lg"
      eyebrow={option.category}
      title={option.title}
      titleClassName="mt-2 font-playfair text-xl font-bold leading-7 text-white"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/10 px-4 py-2 text-[11px] font-bold text-white/58 transition hover:text-white"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onSelect}
            disabled={busy || selected || !option.id}
            className="flex items-center gap-2 bg-[#00A896] px-4 py-2 text-[11px] font-bold text-white transition hover:bg-[#00B4D8] disabled:opacity-50"
          >
            {selected ? <CheckCircle2 size={13} /> : busy ? <Loader2 size={13} className="animate-spin" /> : null}
            {selected ? 'Seleccionado' : 'Seleccionar producto'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">Producto acreditable</p>
          <p className="mt-2 text-[12px] leading-6 text-white/74">{option.justification}</p>
        </div>
        <div className="border border-white/10 bg-[#162A45] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
            Objeto de trabajo {option.work_object_type ? `- ${option.work_object_type}` : ''}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-white/72">{workObjectText(option)}</p>
        </div>
        <div className="border border-white/10 bg-[#162A45] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            <CalendarDays size={12} />
            Linea de tiempo PA
          </div>
          <div className="space-y-2">
            {timeline.length ? timeline.map(([code, value]) => (
              <div key={code} className="grid grid-cols-[54px_1fr] gap-2">
                <span className="font-jetbrains text-[10px] font-bold text-[#6FE9F5]">{code}</span>
                <span className="text-[11px] leading-5 text-white/68">{value}</span>
              </div>
            )) : (
              <p className="text-[10px] text-white/35">Sin hitos definidos.</p>
            )}
          </div>
        </div>
      </div>
    </GlassModal>
  );
}

function ProductOptionRow({
  option,
  selected,
  busy,
  onSelect,
  onDetails,
}: {
  option: ProgressiveProductOption;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const timeline = timelineEntries(option);
  return (
    <div
      className={[
        'grid gap-4 border-b border-white/10 px-4 py-4 transition lg:grid-cols-[1.05fr_1fr_1fr_auto]',
        selected ? 'bg-[#00B4CC]/10' : 'bg-[#0B192C]/35 hover:bg-white/[0.035]',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00B4CC]/30 bg-[#00B4CC]/10 text-[#6FE9F5]">
            <PackageCheck size={15} />
          </span>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onDetails}
              className="text-left text-[13px] font-bold leading-5 text-white transition hover:text-[#6FE9F5]"
            >
              {option.title}
            </button>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4A351]">
              {option.category}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDetails}
          className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/42 transition hover:text-[#E9B44C]"
        >
          <Info size={12} />
          Ver explicacion
        </button>
      </div>

      <div className="min-w-0 border-l border-white/10 pl-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
          Objeto de trabajo {option.work_object_type ? `- ${option.work_object_type}` : ''}
        </p>
        <p className="text-[10px] leading-4 text-white/64">{workObjectText(option)}</p>
      </div>

      <div className="min-w-0 border-l border-white/10 pl-4">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
          <CalendarDays size={12} />
          Linea de tiempo PA
        </div>
        <div className="space-y-1.5">
          {timeline.length ? timeline.map(([code, value]) => (
            <div key={code} className="grid grid-cols-[54px_1fr] gap-2">
              <span className="font-jetbrains text-[10px] font-bold text-[#6FE9F5]">{code}</span>
              <span className="text-[10px] leading-4 text-white/62">{value}</span>
            </div>
          )) : (
            <p className="text-[10px] text-white/35">Sin hitos definidos.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onSelect}
          disabled={busy || !option.id || selected}
          className={[
            'flex h-9 min-w-[118px] items-center justify-center gap-2 rounded-lg border px-3 text-[10px] font-bold transition',
            selected
              ? 'border-[#00B4CC]/35 bg-[#00B4CC]/20 text-[#6FE9F5]'
              : 'border-white/12 bg-white/[0.04] text-white/72 hover:border-[#D4A351]/45 hover:text-[#F2C260]',
          ].join(' ')}
        >
          {selected ? (
            <>
              <CheckCircle2 size={13} />
              Seleccionado
            </>
          ) : busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            'Seleccionar'
          )}
        </button>
      </div>
    </div>
  );
}

export default function Step7_ProductoIntegrador() {
  const navigate = useNavigate();
  const { draftId, draftPerformances, courseDetail, selectedMethodName, showToast } = useSyllabus();
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [options, setOptions] = useState<ProgressiveProductOption[]>([]);
  const [selected, setSelected] = useState<ProgressiveProductOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [notebookProductContext, setNotebookProductContext] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [detailOption, setDetailOption] = useState<ProgressiveProductOption | null>(null);
  const [notebookHelpOpen, setNotebookHelpOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatusText, setJobStatusText] = useState('');
  const [loadingState, setLoadingState] = useState(Boolean(draftId));
  const { current: stepCurrent, total: stepTotal } = useWizardStep();

  const unitsCount = Math.max(1, draftPerformances.length || 1);
  const selectedOption = selected || options.find((option) => option.selected) || null;
  const selectedId = selectedOption?.id;
  const selectedTitle = selectedOption?.title || '';
  const selectedHasWorkObject = hasConcreteWorkObject(selectedOption);
  const notebookPrompt = buildProductNotebookPrompt(courseDetail?.name || '', selectedMethodName || '', category, unitsCount);

  const statusLabel = useMemo(() => {
    if (selectedTitle) return 'Horizonte del curso fijado';
    if (options.length) return 'Opciones listas para revision docente';
    return 'Pendiente de sugerencia';
  }, [options.length, selectedTitle]);

  useEffect(() => {
    if (!draftId) {
      setLoadingState(false);
      return;
    }
    let active = true;
    setLoadingState(true);
    api.getProgressiveCurriculumState(draftId)
      .then((response) => {
        if (!active) return;
        setOptions(response.data.product_options || []);
        const fromState = response.data.progressive_curriculum?.selected_product;
        const fromList = (response.data.product_options || []).find((option) => option.selected);
        setSelected(fromList || fromState || null);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoadingState(false);
      });
    return () => {
      active = false;
    };
  }, [draftId]);

  const handleSuggest = async () => {
    if (!draftId) return;
    setLoading(true);
    setActiveJobId(null);
    setJobStatusText('Preparando sugerencia de producto integrador...');
    try {
      const queued = await api.suggestProgressiveProducts(draftId, category, {
        notebookContextText: notebookProductContext,
      });
      const jobId = queued.data.job_id || queued.data.id;
      if (!jobId) throw new Error('El servidor no devolvio job_id para la sugerencia');
      setActiveJobId(jobId);
      setJobStatusText(
        queued.data.already_running
          ? 'La IA ya tiene una sugerencia en proceso.'
          : 'La IA esta cruzando metodo, evaluacion y consolidado de NotebookLM.',
      );
      const completed = await api.pollAiGenerationJob<{ options: ProgressiveProductOption[] }>(jobId, {
        intervalMs: 4000,
        timeoutMs: 600000,
        onUpdate: (job) => {
          setJobStatusText(
            job.status === 'running'
              ? 'Construyendo opciones y linea de tiempo PA...'
              : 'Solicitud en cola. Seguimos esperando al proveedor para priorizar calidad.',
          );
        },
      });
      const result = completed.data.result || completed.data.result_json;
      setOptions(result?.options || []);
      setSelected(null);
      showToast('Opciones de producto generadas', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudieron generar productos integradores', 'error');
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setJobStatusText('');
    }
  };

  const handleCopyNotebookPrompt = async () => {
    try {
      await navigator.clipboard.writeText(notebookPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      showToast('No se pudo copiar el prompt de NotebookLM', 'warning');
    }
  };

  const handleSelect = async (option: ProgressiveProductOption) => {
    if (!draftId || !option.id) return;
    setSelectingId(option.id);
    try {
      const response = await api.selectProgressiveProduct(draftId, option.id);
      setSelected(response.data);
      setOptions((prev) => prev.map((item) => ({ ...item, selected: item.id === option.id })));
      showToast('Producto integrador seleccionado', 'success');
    } catch {
      showToast('No se pudo seleccionar el producto', 'error');
    } finally {
      setSelectingId(null);
    }
  };

  const handleNext = () => {
    if (!selectedId) {
      showToast('Selecciona un producto integrador antes de continuar', 'warning');
      return;
    }
    if (!selectedHasWorkObject) {
      showToast('El producto seleccionado necesita un objeto de trabajo contextualizado antes de continuar', 'warning');
      return;
    }
    navigate('/creator/mapa-conocimientos');
  };

  return (
    <>
    <OverlayLoader
      show={loadingState || loading || Boolean(selectingId)}
      title={loadingState ? 'Cargando producto' : loading ? 'Generando horizonte' : 'Fijando producto'}
      message={
        loadingState
          ? 'Estamos recuperando las opciones guardadas, el producto seleccionado y su linea de tiempo PA.'
          : loading
            ? (jobStatusText || 'La IA esta cruzando metodo, evaluacion y consolidado de NotebookLM. Esto puede tomar unos segundos.')
            : 'Estamos guardando el producto acreditable seleccionado para sincronizarlo con evaluacion y programa.'
      }
    />
    {notebookHelpOpen ? <NotebookHelpModal onClose={() => setNotebookHelpOpen(false)} /> : null}
    <div className="h-full overflow-y-auto bg-[#0B192C] px-4 py-5 text-white sm:px-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
            Paso {stepCurrent} de {stepTotal} - Producto integrador
          </p>
          <h1 className="font-playfair text-2xl font-bold text-white">Horizonte acreditable del curso</h1>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-white/62">
            Define el producto unico del curso. Los PA funcionan como avances del mismo producto, no como productos inconexos.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-[#00B4D8]">{unitsCount}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Unidades</p>
          </div>
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-[#E9B44C]">{options.length}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Opciones</p>
          </div>
          <div className="border border-white/10 bg-[#162A45] px-3 py-2">
            <p className="font-jetbrains text-[15px] font-bold text-white">{selectedId ? 'OK' : '--'}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/38">Estado</p>
          </div>
        </div>
      </div>

      <section className="mb-4 border border-white/10 bg-[#162A45]">
        <div className="grid gap-3 border-b border-white/10 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
                Categoria del producto
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full border border-white/10 bg-[#0B192C] px-3 text-[12px] text-white outline-none focus:border-[#00B4D8]/70"
              >
                {PRODUCT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/38">
                Metodo heredado
              </span>
              <div className="flex h-10 items-center gap-2 border border-white/10 bg-[#0B192C] px-3">
                <Wand2 size={14} className="text-[#E9B44C]" />
                <span className="truncate text-[12px] text-white/70">{selectedMethodName || 'Metodo pendiente'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={loading || !draftId}
            className="flex h-10 items-center justify-center gap-2 bg-[#00A896] px-4 text-[11px] font-bold text-white transition hover:bg-[#00B4D8] disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generar 3 opciones
          </button>
        </div>
        <div className="grid gap-3 border-b border-white/10 px-4 py-4 lg:grid-cols-[260px_1fr_auto] lg:items-start">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setNotebookHelpOpen(true)}
              title="Ver guia visual de NotebookLM"
              className="h-14 w-14 shrink-0 transition hover:brightness-110"
            >
              <img src={NOTEBOOK_ICON} alt="NotebookLM" className="h-14 w-14 object-contain" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E9B44C]">
                Subir consolidado de Notebook para plantear producto
              </p>
              <p className="mt-1 text-[10px] leading-4 text-white/45">
                Pega aqui la recomendacion investigada para que el motor proponga productos con grounding disciplinar.
              </p>
            </div>
          </div>
          <textarea
            value={notebookProductContext}
            onChange={(event) => setNotebookProductContext(event.target.value)}
            rows={4}
            className="w-full resize-none border border-white/10 bg-[#0B192C] px-3 py-2 text-[11px] leading-5 text-white outline-none placeholder:text-white/24 focus:border-[#00B4D8]/60"
            placeholder="Pega el consolidado de NotebookLM: problema formativo, producto recomendado, avances PA sugeridos y criterios de calidad."
          />
          <button
            type="button"
            onClick={handleCopyNotebookPrompt}
            className="flex h-10 items-center justify-center gap-2 border border-[#00B4D8]/35 px-3 text-[10px] font-bold text-[#72E7F6] transition hover:bg-[#00B4D8]/10"
            title="Copiar prompt para generar el consolidado en NotebookLM"
          >
            {copiedPrompt ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            {copiedPrompt ? 'Copiado' : 'Copiar prompt'}
          </button>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E9B44C]">{statusLabel}</p>
          {selectedTitle ? <p className="mt-1 text-[12px] text-white/72">{selectedTitle}</p> : null}
        </div>
      </section>

      {activeJobId ? (
        <div className="mb-4 flex items-center justify-between gap-3 border border-[#00B4D8]/25 bg-[#00B4D8]/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Loader2 size={16} className="shrink-0 animate-spin text-[#72E7F6]" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72E7F6]">IA generando en segundo plano</p>
              <p className="mt-1 text-[11px] leading-5 text-white/64">{jobStatusText || 'Procesando solicitud...'}</p>
            </div>
          </div>
          <span className="hidden font-jetbrains text-[10px] text-white/34 sm:inline">job {activeJobId.slice(0, 8)}</span>
        </div>
      ) : null}

      <section className="overflow-hidden border border-white/10 bg-[#162A45]">
        {options.length ? (
          options.map((option) => (
            <div key={option.id || option.title}>
              <ProductOptionRow
                option={option}
                selected={selectedId === option.id}
                busy={selectingId === option.id}
                onSelect={() => handleSelect(option)}
                onDetails={() => setDetailOption(option)}
              />
            </div>
          ))
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <Sparkles size={24} className="text-[#00B4D8]" />
            <p className="mt-3 text-[13px] font-bold text-white">Genera el horizonte acreditable</p>
            <p className="mt-1 max-w-md text-[11px] leading-5 text-white/48">
              El motor propondra productos concretos y los repartira como avances PA por unidad.
            </p>
          </div>
        )}
      </section>

      {selectedOption && !selectedHasWorkObject ? (
        <div className="mt-3 border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[11px] leading-5 text-amber-100">
          <p className="font-bold">Producto seleccionado incompleto.</p>
          <p className="mt-1 text-amber-100/80">
            Este producto no tiene objeto de trabajo contextualizado. Regenera opciones con el consolidado de NotebookLM
            o selecciona una opcion que incluya objeto antes de pasar al mapa de conocimientos.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/metodo')}
          className="flex items-center gap-1.5 text-[11px] text-white/46 transition hover:text-white"
        >
          <ArrowLeft size={12} />
          Volver a Metodo
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedId || !selectedHasWorkObject}
          className="flex items-center gap-2 bg-gradient-to-r from-[#007A8A] to-[#00B4D8] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continuar al mapa de conocimientos
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
    {detailOption ? (
      <ProductDetailModal
        option={detailOption}
        selected={selectedId === detailOption.id}
        busy={selectingId === detailOption.id}
        onSelect={() => handleSelect(detailOption)}
        onClose={() => setDetailOption(null)}
      />
    ) : null}
    </>
  );
}
