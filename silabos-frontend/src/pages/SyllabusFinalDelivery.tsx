import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { SyllabusData } from '../api/types';
import FinalDeliveryInsights from '../components/FinalDeliveryInsights';
import Toast, { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { getStoredUser } from '../hooks/useAuth';

const MANAGEMENT_ROLES = new Set(['admin', 'director', 'coordinador']);

function getResponseErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getPayload(record: SyllabusData | null): SyllabusData | null {
  if (!record || typeof record !== 'object') return null;
  const payload = record.payload_json && typeof record.payload_json === 'object'
    ? (record.payload_json as SyllabusData)
    : record;
  const finalSyllabus = (payload as SyllabusData & { final_syllabus?: unknown }).final_syllabus;
  if (finalSyllabus && typeof finalSyllabus === 'object') {
    return {
      ...payload,
      ...(finalSyllabus as SyllabusData),
      datos_generales: (finalSyllabus as SyllabusData).datos_generales || payload.datos_generales,
    };
  }
  return payload;
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getFileName(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

function DeliveryActionCard({
  title,
  helper,
  image,
  alt,
  busy,
  actionLabel = 'Seleccionar',
  onClick,
}: {
  title: string;
  helper: string;
  image: string;
  alt: string;
  busy?: boolean;
  actionLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group flex min-h-[280px] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait disabled:opacity-70"
    >
      <div className="flex h-44 w-full items-center justify-center bg-slate-50 p-5">
        <img
          src={image}
          alt={alt}
          className="h-full max-h-36 w-full object-contain transition duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-700">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {busy ? 'Preparando...' : actionLabel}
        </span>
      </div>
    </button>
  );
}

export default function SyllabusFinalDelivery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearContext } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'docx' | 'pdf' | null>(null);

  const queryId = searchParams.get('id')?.trim() || '';
  const currentUser = useMemo(() => getStoredUser(), []);
  const syllabusId = String(syllabus?._id || syllabus?.id || queryId || '');
  const payload = getPayload(syllabus);
  const dg = (payload?.datos_generales || {}) as Record<string, unknown>;
  const payloadRecord = (payload || {}) as Record<string, unknown>;
  const courseName = pickText(
    dg.asignatura,
    dg.curso,
    dg.course_name,
    dg.nombre_curso,
    payloadRecord.course_name,
    'Silabo generado',
  );
  const programName = pickText(dg.programa, dg.program_name, dg.escuela, dg.programa_estudios, dg.carrera);
  const semesterName = pickText(dg.semestre, dg.periodo_academico, payload?.semester);

  useEffect(() => {
    let active = true;

    const readStoredSyllabus = (): SyllabusData | null => {
      try {
        const raw = sessionStorage.getItem('currentSyllabus');
        return raw ? (JSON.parse(raw) as SyllabusData) : null;
      } catch {
        return null;
      }
    };

    const loadSyllabus = async () => {
      setLoading(true);
      const stored = readStoredSyllabus();
      const storedId = String(stored?._id || stored?.id || '');

      if (!queryId && stored) {
        setSyllabus(stored);
        setLoading(false);
        return;
      }

      if (!queryId) {
        navigate('/syllabi', { replace: true });
        return;
      }

      try {
        const response = await api.getSyllabus(queryId);
        if (!active) return;
        setSyllabus(response.data);
        sessionStorage.setItem('currentSyllabus', JSON.stringify(response.data));
      } catch (error) {
        if (!active) return;
        if (stored && storedId === queryId) {
          setSyllabus(stored);
        } else {
          showToast(getResponseErrorMessage(error, 'No se pudo cargar el sílabo generado'), 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSyllabus();

    return () => {
      active = false;
    };
  }, [navigate, queryId, showToast]);

  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!syllabusId) {
      showToast('No se encontro un ID valido para descargar.', 'warning');
      return;
    }

    setDownloading(format);
    try {
      const response = await api.downloadSyllabusExport(syllabusId, format);

      if (!response.ok) {
        const body = await response.text();
        throw new ApiError(body || `No se pudo descargar ${format.toUpperCase()}`, response.status, body);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(response, format === 'docx' ? 'silabo.docx' : 'silabo.pdf');
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Descarga ${format.toUpperCase()} lista`, 'success');
    } catch (error) {
      showToast(getResponseErrorMessage(error, 'No se pudo descargar el archivo'), 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateNew = () => {
    if (currentUser?.role && MANAGEMENT_ROLES.has(currentUser.role)) {
      navigate('/creator');
      return;
    }

    clearContext();
    navigate('/select-context');
  };

  return (
    <div className="min-h-full bg-[#f7fbff] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/syllabi')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-amber-200 hover:text-amber-700"
        >
          <ArrowLeft size={16} />
          Mis silabos
        </button>

        <header className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
              Entrega final
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              Tu sílabo está listo
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Descarga el documento oficial o inicia un nuevo flujo cuando lo necesites.
            </p>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-bold text-slate-950">{loading ? 'Cargando...' : courseName}</p>
            <p className="mt-1 text-sm text-slate-500">{[programName, semesterName].filter(Boolean).join(' / ')}</p>
          </div>
        </header>

        <main className="mt-8 space-y-8">
          <section className="grid gap-5 lg:grid-cols-3">
            <DeliveryActionCard
              title="Descargar Word"
              helper="Archivo DOCX editable para entrega, ajustes finos o respaldo institucional."
              image="/descargarword.png"
              alt="Descargar sílabo en Word"
              busy={downloading === 'docx'}
              actionLabel="Descargar Word"
              onClick={() => handleDownload('docx')}
            />
            <DeliveryActionCard
              title="Descargar PDF"
              helper="Versión PDF lista para compartir, revisar o subir al aula virtual."
              image="/descargarPDF.png"
              alt="Descargar sílabo en PDF"
              busy={downloading === 'pdf'}
              actionLabel="Descargar PDF"
              onClick={() => handleDownload('pdf')}
            />
            <DeliveryActionCard
              title="Crear nuevo sílabo"
              helper="Vuelve al flujo de creación con el contexto correcto para el siguiente curso."
              image="/crearnuevosilaboflujofinal.png"
              alt="Crear nuevo sílabo"
              actionLabel="Crear nuevo"
              onClick={handleCreateNew}
            />
          </section>

          {syllabusId ? <FinalDeliveryInsights syllabusId={syllabusId} /> : null}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
