import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { BibliographyReference } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

const SOURCE_ACTION_ICONS = {
  notebook: '/ICONEMPEZARNOTEBOOKLM.png',
  ai: '/ICONCURADURIABUSQUEDADEFUENTESPORIA.png',
} as const;

type BibliographicType =
  | 'Articulo'
  | 'Libro'
  | 'Tesis'
  | 'Documentacion'
  | 'Web academica'
  | 'Video';

type SourceRowStatus = 'Importada' | 'Validada' | 'Pendiente';

interface SourceTableRow {
  id: string;
  title: string;
  type: BibliographicType;
  origin: 'NotebookLM' | 'Curaduria IA';
  loadedAt: string;
  status: SourceRowStatus;
  reference: string;
}

interface NotebookSourceBlock {
  autor?: unknown;
  anio?: unknown;
  titulo?: unknown;
  fuente?: unknown;
  url?: unknown;
  tipo?: unknown;
  requiere_revision?: unknown;
  motivo_revision?: unknown;
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function cleanNotebookReference(reference: string) {
  const marker = /(?:referencias\s+bibliogr[aá]ficas?|bibliograf[ií]a|fuentes\s+consultadas|references)\s*:?\s*/i;
  const cleaned = reference.replace(/\s+/g, ' ').trim();
  const match = marker.exec(cleaned);
  if (!match) return cleaned;
  return cleaned.slice(match.index + match[0].length).trim();
}

function dedupeTextItems(items: string[]) {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = item.toLowerCase();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function asCleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function extractJsonArrayBlock(rawText: string) {
  const withoutFences = rawText
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();
  const start = withoutFences.indexOf('[');
  const end = withoutFences.lastIndexOf(']');
  if (start < 0 || end <= start) return '';
  return withoutFences.slice(start, end + 1);
}

function parseNotebookSourceBlock(rawText: string) {
  const jsonBlock = extractJsonArrayBlock(rawText);
  if (!jsonBlock) return [];

  const parsed = JSON.parse(jsonBlock) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is NotebookSourceBlock => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const autor = asCleanText(item.autor) || 'S.A.';
      const anio = asCleanText(item.anio) || 's.f.';
      const titulo = asCleanText(item.titulo);
      const fuente = asCleanText(item.fuente);
      const url = asCleanText(item.url);
      const motivo = asCleanText(item.motivo_revision);
      const requiresReview = Boolean(item.requiere_revision) || !url || autor === 'S.A.' || anio === 's.f.';

      if (!titulo) return '';

      const base = `${autor} (${anio}). ${titulo}.${fuente ? ` ${fuente}.` : ''}${url ? ` ${url}` : ''}`;
      return requiresReview && motivo ? `${base} [Revisar: ${motivo}]` : base;
    })
    .filter(Boolean);
}

function inferBibliographicType(reference: string): BibliographicType {
  const lower = reference.toLowerCase();

  if (/tesis|disertaci[oó]n|doctoral|maestr[ií]a/.test(lower)) return 'Tesis';
  if (/youtube|vimeo|video/.test(lower)) return 'Video';
  if (/manual|gu[ií]a|reglamento|lineamiento|norma|documento|informe|reporte/.test(lower)) {
    return 'Documentacion';
  }
  if (/editorial|isbn|cap[ií]tulo/.test(lower)) return 'Libro';
  if (/journal|revista|doi\.org|issn|vol\.|n[uú]m\.|pp\./.test(lower)) return 'Articulo';
  if (/https?:\/\//.test(lower)) return 'Web academica';
  return 'Articulo';
}

function formatTypeLabel(type: BibliographicType) {
  if (type === 'Articulo') return 'Artículo';
  if (type === 'Documentacion') return 'Documentación';
  if (type === 'Web academica') return 'Web académica';
  return type;
}

function formatOriginLabel(origin: SourceTableRow['origin']) {
  return origin === 'Curaduria IA' ? 'Curaduría IA' : 'NotebookLM';
}

function extractReferenceTitle(reference: string) {
  const normalized = reference.replace(/\s+/g, ' ').trim();
  const withoutLead = normalized.replace(/^[^.]+?\(\d{4}[a-z]?\)\.?\s*/i, '');
  const title = withoutLead.split('. ').find(Boolean) ?? normalized;
  return truncateText(title.replace(/\.$/, '').trim(), 96);
}

function buildSourceRows({
  references,
  sources,
  uploadedBiblio,
  defaultDate,
}: {
  references: string[];
  sources: string[];
  uploadedBiblio: { fileName: string; refCount: number; references?: string[] } | null;
  defaultDate: string;
}): SourceTableRow[] {
  const hasVerifiedOrigins = sources.length > 0;
  const notebookReferences = dedupeTextItems((uploadedBiblio?.references || []).map(cleanNotebookReference));
  const notebookReferenceKeys = new Set(notebookReferences.map((reference) => reference.trim().toLowerCase()));

  const notebookRows: SourceTableRow[] = notebookReferences.length > 0
    ? notebookReferences.map((reference, index) => ({
        id: `notebook-${index}`,
        title: extractReferenceTitle(reference),
        type: inferBibliographicType(reference),
        origin: 'NotebookLM' as const,
        loadedAt: defaultDate,
        status: 'Importada' as const,
        reference: reference.trim(),
      }))
    : uploadedBiblio
      ? [
          {
            id: 'notebook-upload',
            title: truncateText(uploadedBiblio.fileName.replace(/\.pdf$/i, ''), 72),
            type: 'Documentacion',
            origin: 'NotebookLM',
            loadedAt: defaultDate,
            status: uploadedBiblio.refCount > 0 ? 'Importada' : 'Pendiente',
            reference:
              uploadedBiblio.refCount > 0
                ? `PDF exportado cargado con ${uploadedBiblio.refCount} referencias detectadas por el parser.`
                : 'PDF exportado cargado. La tabla se completará cuando el parser detecte referencias válidas.',
          },
        ]
      : [];

  const aiRows = references
    .filter((reference) => !notebookReferenceKeys.has(reference.trim().toLowerCase()))
    .map((reference, index) => ({
      id: `ai-${index}`,
      title: extractReferenceTitle(reference),
      type: inferBibliographicType(reference),
      origin: 'Curaduria IA' as const,
      loadedAt: defaultDate,
      status:
        hasVerifiedOrigins || /(https?:\/\/|doi\.org|doi:)/i.test(reference)
          ? ('Validada' as const)
          : ('Pendiente' as const),
      reference: reference.trim(),
    }));

  return [...notebookRows, ...aiRows];
}

function getStatusClasses(status: SourceRowStatus) {
  if (status === 'Validada') {
    return 'bg-[#3BA55D]/18 text-[#8BE2A5] ring-1 ring-[#3BA55D]/25';
  }
  if (status === 'Importada') {
    return 'bg-[#00B4CC]/16 text-[#77E3F0] ring-1 ring-[#00B4CC]/24';
  }
  return 'bg-[#D4A351]/16 text-[#F2C260] ring-1 ring-[#D4A351]/24';
}

function ActionVisualCard({
  title,
  description,
  imageSrc,
  imageAlt,
  onClick,
  badge,
}: {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-[#D4A351]/18 bg-[#041A3A]/90 p-3.5 text-left shadow-[0_14px_28px_rgba(1,32,63,0.18)] transition hover:border-[#D4A351]/35 hover:bg-[#08234A]"
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        className="h-[138px] w-[138px] shrink-0 object-contain drop-shadow-[0_16px_28px_rgba(0,180,204,0.16)] transition duration-200 group-hover:scale-[1.03]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-semibold text-white group-hover:text-[#F7D789]">{title}</p>
          {badge && (
            <span className="rounded-full bg-[#00B4CC]/18 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6FDBEA]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-3 max-w-[28rem] text-[11px] leading-5 text-white/60">{description}</p>
      </div>

      <ExternalLink size={16} className="shrink-0 text-white/28 transition group-hover:text-[#F2C260]" />
    </button>
  );
}

function AIBiblioModal({
  query,
  onQueryChange,
  onSearch,
  onSkip,
  searching,
  onClose,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (continueAfter: boolean) => void;
  onSkip: () => void;
  searching: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0A2753] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Fuentes buscadas por IA</h3>
            <p className="mt-0.5 text-[10px] text-white/50">
              Busca en OpenAlex, SciELO y Crossref. Esta salida alimenta la tabla compacta del paso.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white"
          >
            <X size={13} />
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/50">
            Palabras clave del curso
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ej: Matemática Educativa, Didáctica"
            className="h-9 w-full rounded-xl border border-white/20 bg-[#041A3A] px-3 text-[11px] text-white placeholder-white/30 outline-none focus:border-[#00B4CC]/50 focus:ring-1 focus:ring-[#00B4CC]/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSearch(false)}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {searching ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {searching ? 'Buscando...' : 'Buscar fuentes'}
          </button>
          <button
            type="button"
            onClick={() => onSearch(true)}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-[11px] font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
          >
            Buscar y continuar
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-3 py-2 text-[10px] text-white/40 transition hover:text-white/70"
          >
            Omitir bibliografía
          </button>
        </div>
      </div>
    </div>
  );
}

function ReferencesModal({
  references,
  sources,
  originLabel,
  onClose,
}: {
  references: string[];
  sources: string[];
  originLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#0A2753] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-white">Referencias en formato APA 7</h3>
            <p className="mt-1 text-[11px] text-white/55">
              {references.length} referencias listas para revisión.
              {sources.length > 0 ? ` Fuentes consultadas: ${sources.join(' · ')}.` : ` Origen: ${originLabel}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {references.map((reference, index) => (
              <article
                key={`${index}-${reference.slice(0, 12)}`}
                className="rounded-xl border border-white/10 bg-[#041A3A]/88 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/68">
                    #{index + 1}
                  </span>
                  <span className="rounded-full bg-[#D4A351]/16 px-2 py-0.5 text-[10px] font-semibold text-[#F2C260]">
                    {formatTypeLabel(inferBibliographicType(reference))}
                  </span>
                  <span className="rounded-full bg-[#00B4CC]/16 px-2 py-0.5 text-[10px] font-semibold text-[#6FDBEA]">
                    {originLabel}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-6 text-white/76">{reference}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Step2_Fuentes() {
  const navigate = useNavigate();
  const { context } = useAppContext();
  const {
    draftId,
    courseDetail,
    saveStep,
    showToast,
    uploadedBiblio,
    setUploadedBiblio,
    bibliographyReferences,
    setBibliographyReferences,
    bibliographySources,
    setBibliographySources,
  } = useSyllabus();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBiblio, setUploadingBiblio] = useState(false);
  const [removingBiblio, setRemovingBiblio] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showReferencesModal, setShowReferencesModal] = useState(false);
  const [referencesModalOrigin, setReferencesModalOrigin] = useState<'NotebookLM' | 'Curaduria IA'>('NotebookLM');
  const [focusedReference, setFocusedReference] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState(courseDetail?.name ?? '');
  const [notebookImportText, setNotebookImportText] = useState('');
  const [importingNotebookText, setImportingNotebookText] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tableDateLabel] = useState(() => formatTodayLabel());
  const notebookReferences = dedupeTextItems((uploadedBiblio?.references || []).map(cleanNotebookReference));
  const notebookReferenceKeys = new Set(notebookReferences.map((reference) => reference.toLowerCase()));
  const aiReferences = bibliographyReferences.filter(
    (reference) => !notebookReferenceKeys.has(cleanNotebookReference(reference).toLowerCase()),
  );
  const modalReferences = focusedReference
    ? [focusedReference]
    : referencesModalOrigin === 'NotebookLM'
      ? notebookReferences
      : aiReferences;
  const modalSources = referencesModalOrigin === 'NotebookLM' ? ['NotebookLM'] : bibliographySources.filter((source) => source !== 'NotebookLM');

  const sourceRows = buildSourceRows({
    references: bibliographyReferences,
    sources: bibliographySources,
    uploadedBiblio,
    defaultDate: tableDateLabel,
  });

  const hydrateStoredNotebookReferences = async (showFoundToast = false) => {
    if (!courseDetail?.id) return false;

    const res = await api.getBibliographyReferences(courseDetail.id);
    const data = res.data;
    const parsedRefs = dedupeRefs((data?.references || []).map(cleanNotebookReference).filter(Boolean));
    const docId = data?.doc_id || '';

    if (!docId && parsedRefs.length === 0) return false;

    const nextRefs = dedupeRefs([...parsedRefs, ...bibliographyReferences]);
    const nextSources = dedupeRefs(['NotebookLM', ...bibliographySources]);
    const fileName = data?.document_name || 'PDF NotebookLM cargado';
    const refCount = data?.total ?? parsedRefs.length;

    setUploadedBiblio({ docId, fileName, refCount, references: parsedRefs });
    if (parsedRefs.length > 0) {
      setBibliographyReferences(nextRefs);
      setBibliographySources(nextSources);
      await saveStep('bibliography', {
        doc_ids: docId ? [docId] : [],
        references: nextRefs,
        sources_consulted: nextSources,
      });
    }

    if (showFoundToast) {
      showToast('Ya existe un PDF NotebookLM para este curso. Lo cargué para que puedas revisarlo o eliminarlo.', 'warning');
    }

    return true;
  };

  useEffect(() => {
    if (!courseDetail?.id) return;
    if (uploadedBiblio?.references?.length) return;
    if (uploadedBiblio && uploadedBiblio.refCount <= 0) return;

    let cancelled = false;

    const loadStoredNotebookReferences = async () => {
      try {
        if (cancelled) return;
        await hydrateStoredNotebookReferences();
      } catch {
        // The upload flow still works; this only hydrates refs from an already uploaded PDF.
      }
    };

    void loadStoredNotebookReferences();

    return () => {
      cancelled = true;
    };
  }, [courseDetail?.id, uploadedBiblio]);

  const handleFile = async (file: File) => {
    if (!context || !courseDetail) return;
    if (uploadedBiblio) {
      showToast('Elimina el PDF actual antes de subir otro.', 'error');
      return;
    }

    setUploadingBiblio(true);
    try {
      const res = await api.uploadBibliography(file, courseDetail.id, context.program_id, courseDetail.scope || 'program');
      const data = res.data;
      const refCount = data?.ref_count ?? 0;
      const docId = data?.id ?? '';
      const parsedRefs = dedupeRefs((data?.references || []).map(cleanNotebookReference).filter(Boolean));
      const nextRefs = dedupeRefs([...parsedRefs, ...bibliographyReferences]);
      const nextSources = dedupeRefs(['NotebookLM', ...bibliographySources]);

      setUploadedBiblio({ docId, fileName: file.name, refCount, references: parsedRefs });
      if (parsedRefs.length > 0) {
        setBibliographyReferences(nextRefs);
        setBibliographySources(nextSources);
        await saveStep('bibliography', {
          doc_ids: [docId],
          references: nextRefs,
          sources_consulted: nextSources,
        });
      }
      showToast(refCount > 0 ? `${refCount} referencias extraídas` : 'PDF cargado', 'success');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && err.status === 409) {
        try {
          const hydrated = await hydrateStoredNotebookReferences(true);
          if (hydrated) return;
        } catch {
          // Fall through to the API error when the existing upload cannot be hydrated.
        }
      }
      const message = err instanceof Error ? err.message : 'Error al subir el archivo';
      showToast(message, 'error');
    } finally {
      setUploadingBiblio(false);
    }
  };

  const handleRemoveBiblio = async () => {
    if (!uploadedBiblio) return;

    setRemovingBiblio(true);
    try {
      if (uploadedBiblio.docId) {
        await api.deleteDocument(uploadedBiblio.docId);
      } else if (courseDetail?.id) {
        await api.deleteCourseBibliography(courseDetail.id);
      } else {
        throw new Error('No se encontró el documento de bibliografía');
      }
      const uploadedReferenceKeys = new Set((uploadedBiblio.references || []).map((reference) => cleanNotebookReference(reference).toLowerCase()));
      if (uploadedReferenceKeys.size > 0) {
        const nextRefs = bibliographyReferences.filter(
          (reference) => !uploadedReferenceKeys.has(cleanNotebookReference(reference).toLowerCase()),
        );
        const nextSources = bibliographySources.filter((source) => source !== 'NotebookLM');
        setBibliographyReferences(nextRefs);
        setBibliographySources(nextSources);
        await saveStep('bibliography', {
          doc_ids: [],
          references: nextRefs,
          sources_consulted: nextSources,
        });
      }
      setUploadedBiblio(null);
      showToast('PDF eliminado.', 'success');
    } catch {
      showToast('No se pudo eliminar el archivo', 'error');
    } finally {
      setRemovingBiblio(false);
    }
  };

  const handleClearReferences = async () => {
    setBibliographyReferences(notebookReferences);
    setBibliographySources(notebookReferences.length > 0 ? ['NotebookLM'] : []);

    await saveStep('bibliography', {
      doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
      references: notebookReferences,
      sources_consulted: notebookReferences.length > 0 ? ['NotebookLM'] : [],
    });

    showToast('Resultados de IA eliminados', 'success');
  };

  const handleImportNotebookText = async () => {
    if (!courseDetail) {
      showToast('Selecciona un curso antes de importar fuentes.', 'warning');
      return;
    }
    if (!notebookImportText.trim()) {
      showToast('Pega el bloque generado por NotebookLM antes de procesar.', 'warning');
      return;
    }

    setImportingNotebookText(true);
    try {
      const parsedRefs = dedupeRefs(parseNotebookSourceBlock(notebookImportText));

      if (parsedRefs.length === 0) {
        showToast('No pude reconocer el bloque. Copia la respuesta completa de NotebookLM e intenta otra vez.', 'error');
        return;
      }

      const nextRefs = dedupeRefs([...parsedRefs, ...aiReferences]);
      const nextSources = dedupeRefs(['NotebookLM', ...bibliographySources.filter((source) => source !== 'NotebookLM')]);

      setUploadedBiblio({
        docId: uploadedBiblio?.docId || '',
        fileName: 'Bloque de fuentes NotebookLM',
        refCount: parsedRefs.length,
        references: parsedRefs,
      });
      setBibliographyReferences(nextRefs);
      setBibliographySources(nextSources);
      setNotebookImportText('');

      await saveStep('bibliography', {
        doc_ids: uploadedBiblio?.docId ? [uploadedBiblio.docId] : [],
        references: nextRefs,
        sources_consulted: nextSources,
      });

      showToast(`${parsedRefs.length} fuentes importadas desde NotebookLM`, 'success');
    } catch {
      showToast('El bloque no tiene un formato valido. Vuelve a copiarlo completo desde NotebookLM.', 'error');
    } finally {
      setImportingNotebookText(false);
    }
  };

  const handleRemoveSourceRow = async (row: SourceTableRow) => {
    const removeKey = cleanNotebookReference(row.reference).toLowerCase();
    const nextRefs = bibliographyReferences.filter(
      (reference) => cleanNotebookReference(reference).toLowerCase() !== removeKey,
    );
    const nextNotebookRefs = notebookReferences.filter(
      (reference) => cleanNotebookReference(reference).toLowerCase() !== removeKey,
    );
    const nextAiRefs = aiReferences.filter(
      (reference) => cleanNotebookReference(reference).toLowerCase() !== removeKey,
    );
    const nextSources = dedupeRefs([
      ...(nextNotebookRefs.length > 0 ? ['NotebookLM'] : []),
      ...(nextAiRefs.length > 0 ? bibliographySources.filter((source) => source !== 'NotebookLM') : []),
    ]);

    setBibliographyReferences(nextRefs);
    setBibliographySources(nextSources);
    if (row.origin === 'NotebookLM') {
      setUploadedBiblio((current) => (
        current
          ? { ...current, refCount: nextNotebookRefs.length, references: nextNotebookRefs }
          : current
      ));
    }

    await saveStep('bibliography', {
      doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
      references: nextRefs,
      sources_consulted: nextSources,
    });

    showToast('Fuente quitada de la tabla', 'success');
  };

  const dedupeRefs = (items: string[]) => {
    return dedupeTextItems(items);
  };

  const handleSearch = async (continueAfter: boolean) => {
    if (!draftId || !courseDetail || !context) return;

    setSearching(true);
    try {
      const res = await api.searchBibliography({
        keywords: aiQuery.trim() || courseDetail.name,
        area: context.program_name,
        course_name: courseDetail.name,
      });

      const rawRefs = (res.data?.references || []) as BibliographyReference[];
      const nextRefs = dedupeRefs(rawRefs.map((reference) => reference.apa_format?.trim() || '').filter(Boolean));
      const nextSources = (res.data?.sources_consulted || []).filter(Boolean);

      if (nextRefs.length === 0) {
        showToast('No se encontraron referencias verificables', 'warning');
        return;
      }

      const mergedRefs = dedupeRefs([...notebookReferences, ...nextRefs]);
      const mergedSources = dedupeRefs([...(notebookReferences.length > 0 ? ['NotebookLM'] : []), ...(nextSources as string[])]);

      setBibliographyReferences(mergedRefs);
      setBibliographySources(mergedSources);

      await saveStep('bibliography', {
        doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
        references: mergedRefs,
        sources_consulted: mergedSources,
      });

      setShowSearchModal(false);
      showToast(`${nextRefs.length} referencias cargadas`, 'success');

      if (continueAfter) navigate('/creator/desempenos');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al buscar bibliografía';
      showToast(message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSkip = async () => {
    setShowSearchModal(false);
    await saveStep('bibliography', {
      doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
      references: bibliographyReferences,
      sources_consulted: bibliographySources,
    });
    navigate('/creator/desempenos');
  };

  const handleContinue = async () => {
    await saveStep('bibliography', {
      doc_ids: uploadedBiblio ? [uploadedBiblio.docId] : [],
      references: bibliographyReferences,
      sources_consulted: bibliographySources,
    });
    navigate('/creator/desempenos');
  };

  return (
    <>
      <div className="h-full overflow-y-auto overflow-x-hidden bg-[#041A3A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
              PASO 4 DE 8 - FUENTES Y SOPORTE DOCUMENTAL
            </p>
            <h1 className="font-playfair text-[2rem] font-bold leading-tight text-white">
              Fuentes del curso y soporte documental
            </h1>
            <p className="mt-1 max-w-[58rem] text-[11px] text-white/60">
              Compactamos este paso en tres bloques: PDF exportado desde NotebookLM, curaduría asistida por IA
              y tabla de fuentes activas para la demo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#0A2753] p-4 shadow-[0_18px_44px_rgba(1,32,63,0.18)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00B4CC]/18">
                  <BookOpen size={15} className="text-[#00B4CC]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4A351]">NotebookLM</p>
                  <p className="text-[13px] font-semibold text-white">PDF exportado y roadmap del flujo</p>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-white/60">
                Este bloque reemplaza la carga docente tradicional. Aquí se sube el PDF output de NotebookLM y
                se mantiene el acceso al roadmap visual.
              </p>

              <div className="mt-3">
                <ActionVisualCard
                  title="Abrir roadmap NotebookLM"
                  description="Guía visual para trabajar el cuaderno documental en paralelo y luego exportar el PDF de salida."
                  imageSrc={SOURCE_ACTION_ICONS.notebook}
                  imageAlt="NotebookLM"
                  onClick={() => navigate('/creator/fuentes/notebook')}
                  badge="Roadmap"
                />
              </div>

              <div className="mt-3 rounded-2xl border border-[#A8D8A8]/22 bg-[#041A3A]/88 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white">Pegar bloque de fuentes de NotebookLM</p>
                    <p className="mt-1 text-[10px] leading-5 text-white/55">
                      Usa el roadmap, copia la respuesta generada por NotebookLM y pegala aqui para llenar la tabla.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#A8D8A8]/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A8D8A8]">
                    Recomendado
                  </span>
                </div>

                <textarea
                  value={notebookImportText}
                  onChange={(event) => setNotebookImportText(event.target.value)}
                  placeholder="Pega aqui el bloque completo generado por NotebookLM."
                  className="mt-3 min-h-[104px] w-full resize-y rounded-xl border border-[#A8D8A8]/18 bg-[#061F45] px-3 py-2 text-[10.5px] leading-5 text-white outline-none placeholder:text-white/28 focus:border-[#A8D8A8]/45 focus:ring-1 focus:ring-[#A8D8A8]/15"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-[25rem] text-[9.5px] leading-4 text-white/42">
                    No necesitas editar el texto. SIGEISIL extrae las fuentes y marca para revision las incompletas.
                  </p>
                  <button
                    type="button"
                    onClick={handleImportNotebookText}
                    disabled={importingNotebookText}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4A9A6A] to-[#A8D8A8] px-3.5 py-2 text-[10px] font-bold text-[#041A3A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importingNotebookText ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                    Procesar fuentes
                  </button>
                </div>
              </div>

              <div className="hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white">Subir PDF exportado desde NotebookLM</p>
                    <p className="mt-1 text-[10px] leading-5 text-white/55">
                      El parser intentará capturar referencias desde el PDF para alimentar la tabla mientras el
                      endpoint enriquecido queda listo.
                    </p>
                  </div>
                  {uploadedBiblio && (
                    <button
                      type="button"
                      onClick={handleRemoveBiblio}
                      disabled={removingBiblio}
                      className="shrink-0 rounded-lg border border-white/10 p-2 text-white/40 transition hover:text-rose-400 disabled:opacity-50"
                    >
                      {removingBiblio ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>

                {uploadedBiblio ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#D4A351]/25 bg-[#08234A] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-white">{uploadedBiblio.fileName}</p>
                      <p className="mt-1 text-[10px] text-[#6FDBEA]">
                        {uploadedBiblio.refCount} referencias detectadas por el parser
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {notebookReferences.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setReferencesModalOrigin('NotebookLM');
                            setFocusedReference(null);
                            setShowReferencesModal(true);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-[#D4A351]/25 px-2.5 py-1.5 text-[10px] font-semibold text-[#F2C260] transition hover:border-[#D4A351]/45 hover:text-white"
                        >
                          <Eye size={11} />
                          Ver APA
                        </button>
                      )}
                      <span className="rounded-full bg-[#00B4CC]/14 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#77E3F0]">
                        PDF
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingBiblio}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/2 text-[11px] font-semibold text-white/68 transition hover:border-[#00B4CC]/40 hover:text-white disabled:opacity-50"
                  >
                    {uploadingBiblio ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Subiendo PDF...
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        Subir PDF exportado
                      </>
                    )}
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0A2753] p-4 shadow-[0_18px_44px_rgba(1,32,63,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4A351]/15">
                    <Sparkles size={15} className="text-[#D4A351]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4A351]">Curaduría IA</p>
                    <p className="text-[13px] font-semibold text-white">Búsqueda de fuentes para el docente</p>
                  </div>
                </div>

                {aiReferences.length > 0 && (
                  <span className="rounded-full bg-[#00B4CC]/16 px-2.5 py-1 text-[10px] font-semibold text-[#77E3F0]">
                    {aiReferences.length} refs
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-5 text-white/60">
                Solicita sugerencias académicas según el curso. Los resultados IA se muestran aquí solo cuando
                vienen de OpenAlex, SciELO o Crossref.
              </p>

              <div className="mt-3">
                <ActionVisualCard
                  title="Buscar con IA"
                  description="Consulta OpenAlex, SciELO y Crossref y convierte la salida en referencias base para la tabla."
                  imageSrc={SOURCE_ACTION_ICONS.ai}
                  imageAlt="Curaduría IA"
                  onClick={() => {
                    setAiQuery(courseDetail?.name ?? '');
                    setShowSearchModal(true);
                  }}
                  badge="IA"
                />
              </div>

              {aiReferences.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReferencesModalOrigin('Curaduria IA');
                      setFocusedReference(null);
                      setShowReferencesModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/68 transition hover:text-white"
                  >
                    <Eye size={12} />
                    Ver APA de IA
                  </button>
                  <button
                    type="button"
                    onClick={handleClearReferences}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/50 transition hover:text-white"
                  >
                    <Trash2 size={12} />
                    Limpiar resultados
                  </button>
                </div>
              )}

              <p className="mt-3 text-[10px] leading-5 text-white/45">
                {aiReferences.length > 0
                  ? `Fuentes consultadas: ${bibliographySources.filter((source) => source !== 'NotebookLM').join(' · ') || 'OpenAlex · SciELO · Crossref'}`
                  : 'Cuando ejecutes la búsqueda, la tabla compacta mostrará los resultados validados y el modal conservará el formato APA 7.'}
              </p>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-[#D4A351]/24 bg-[#0A2753] p-3.5 shadow-[0_18px_44px_rgba(1,32,63,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4A351]/14 ring-1 ring-[#D4A351]/25">
                  <FileText size={15} className="text-[#F2C260]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Fuentes activas del curso</p>
                  <p className="mt-0.5 text-[10px] text-white/55">
                    Tabla compacta lista para recibir el nuevo endpoint enriquecido sin cambiar el layout.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#D4A351]/14 px-2.5 py-1 text-[10px] font-semibold text-[#F2C260] ring-1 ring-[#D4A351]/20">
                  {sourceRows.length} fuentes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAiQuery(courseDetail?.name ?? '');
                    setShowSearchModal(true);
                  }}
                  className="rounded-xl border border-[#D4A351]/24 px-3 py-1.5 text-[10px] font-semibold text-white/68 transition hover:border-[#D4A351]/45 hover:text-white"
                >
                  Actualizar lista
                </button>
              </div>
            </div>

            {sourceRows.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-white/14 bg-[#041A3A]/80 px-5 py-8 text-center">
                <p className="text-[13px] font-semibold text-white">Aún no hay fuentes activas en la tabla</p>
                <p className="mx-auto mt-2 max-w-[40rem] text-[11px] leading-5 text-white/52">
                  Sube el PDF exportado desde NotebookLM o ejecuta la curaduría IA. En cuanto haya datos, esta
                  tabla se llenará sin ocupar un bloque adicional.
                </p>
              </div>
            ) : (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-[#D4A351]/22 bg-[#041A3A]/82">
                <div className="overflow-x-auto">
                  <div className="max-h-[14.25rem] overflow-y-auto">
                    <table className="min-w-[860px] w-full table-fixed">
                      <thead className="sticky top-0 z-10 bg-[#061F45] shadow-[inset_0_-1px_0_rgba(212,163,81,0.22)]">
                        <tr className="border-b border-[#D4A351]/18">
                          <th className="w-[44px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            #
                          </th>
                          <th className="px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Fuente
                          </th>
                          <th className="w-[116px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Tipo
                          </th>
                          <th className="w-[112px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Origen
                          </th>
                          <th className="w-[96px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Fecha
                          </th>
                          <th className="w-[104px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Estado
                          </th>
                          <th className="w-[112px] px-2.5 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F2C260]/78">
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sourceRows.map((row, index) => (
                          <tr key={row.id} className="border-b border-white/6 align-top last:border-b-0 hover:bg-[#D4A351]/[0.035]">
                            <td className="px-2.5 py-2 text-[10px] font-semibold text-[#F2C260]/70">{index + 1}</td>
                            <td className="px-2.5 py-2">
                              <p className="line-clamp-1 text-[10.5px] font-semibold leading-4 text-white">{row.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-4 text-white/46">
                                {truncateText(row.reference, 130)}
                              </p>
                            </td>
                            <td className="px-2.5 py-2 text-[9.5px] font-semibold text-white/72">{formatTypeLabel(row.type)}</td>
                            <td className="px-2.5 py-2 text-[9.5px] font-semibold text-white/72">{formatOriginLabel(row.origin)}</td>
                            <td className="px-2.5 py-2 text-[9.5px] text-white/60">{row.loadedAt}</td>
                            <td className="px-2.5 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${getStatusClasses(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-2.5 py-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="Ver APA"
                                  onClick={() => {
                                    setReferencesModalOrigin(row.origin);
                                    setFocusedReference(row.reference);
                                    setShowReferencesModal(true);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4A351]/20 text-[#F2C260]/78 transition hover:border-[#D4A351]/45 hover:text-white"
                                >
                                  <Eye size={11} />
                                </button>
                                <button
                                  type="button"
                                  title="Quitar fuente"
                                  onClick={() => void handleRemoveSourceRow(row)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300/12 text-white/38 transition hover:border-rose-300/35 hover:text-rose-300"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <p className="mt-3 text-[10px] leading-5 text-[#D4A351]/72">
              Mientras cerramos el RAG completo, esta vista combina el PDF exportado de NotebookLM con la
              curaduría IA del curso y deja libre el espacio que antes ocupaban las referencias en string.
            </p>
          </section>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/creator/repositorio')}
              className="flex items-center gap-1.5 text-[11px] text-white/40 transition hover:text-white"
            >
              <ArrowLeft size={12} />
              Atrás
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-xl border border-white/15 px-4 py-2 text-[10px] font-semibold text-white/60 transition hover:text-white"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
              >
                CONTINUAR <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSearchModal && (
        <AIBiblioModal
          query={aiQuery}
          onQueryChange={setAiQuery}
          onSearch={handleSearch}
          onSkip={handleSkip}
          searching={searching}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showReferencesModal && modalReferences.length > 0 && (
        <ReferencesModal
          references={modalReferences}
          sources={modalSources}
          originLabel={formatOriginLabel(referencesModalOrigin)}
          onClose={() => {
            setShowReferencesModal(false);
            setFocusedReference(null);
          }}
        />
      )}
    </>
  );
}
