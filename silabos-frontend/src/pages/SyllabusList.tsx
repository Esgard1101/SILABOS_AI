import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  MessageSquarePlus,
  Pencil,
  PlusCircle,
  Rocket,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import {
  APIResponse,
  SyllabusData,
  SyllabusListItem,
  SyllabusStatus,
  SyllabusVersion,
} from '../api/types';
import NavSidebar from '../components/NavSidebar';
import StatusBadge from '../components/StatusBadge';
import Toast, { useToast } from '../components/Toast';
import { getStoredUser } from '../hooks/useAuth';
import {
  enrichVersion,
  formatDateLabel,
  getCareerName,
  getCourseName,
  getSemesterName,
  getSyllabusPayload,
  getTeacherName,
  resolveSyllabusStatus,
  setCurrentSyllabus,
  setSyllabusStatusOverride,
} from '../utils/syllabusStorage';

type VersionMap = Record<string, SyllabusVersion[]>;
type LoadingMap = Record<string, boolean>;

function getResponseErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function mapSyllabusItem(raw: Partial<SyllabusListItem> | SyllabusData): SyllabusListItem {
  const data = raw as SyllabusData;

  return {
    id: raw.id || data._id || '',
    semester: raw.semester || data.datos_generales?.semestre || '',
    teacher_name: raw.teacher_name || data.datos_generales?.docente || '',
    status: resolveSyllabusStatus(raw),
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || raw.created_at || '',
    payload_json: raw.payload_json,
  };
}

function getSyllabusDataFromResponse(response: APIResponse): SyllabusData | null {
  if (!response.data || typeof response.data !== 'object') {
    return null;
  }

  const data = response.data as Record<string, unknown>;
  const payload = data.payload_json;

  if (payload && typeof payload === 'object') {
    return payload as SyllabusData;
  }

  return data as unknown as SyllabusData;
}

async function downloadExport(
  syllabusId: string,
  format: 'docx' | 'pdf',
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => string,
) {
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
    link.download = format === 'docx' ? 'silabo.docx' : 'silabo.pdf';
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Descarga ${format.toUpperCase()} completada`, 'success');
  } catch (error) {
    showToast(getResponseErrorMessage(error, 'No se pudo descargar el archivo'), 'error');
  }
}

export default function SyllabusList() {
  const navigate = useNavigate();
  const [syllabi, setSyllabi] = useState<SyllabusListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versionsById, setVersionsById] = useState<VersionMap>({});
  const [versionsLoading, setVersionsLoading] = useState<LoadingMap>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [observerName, setObserverName] = useState(getStoredUser()?.full_name || 'Dirección de Escuela');
  const [observationText, setObservationText] = useState('');
  const { showToast, toasts, removeToast } = useToast();

  const selectedItem = useMemo(
    () => syllabi.find((item) => item.id === selectedObservationId) || null,
    [selectedObservationId, syllabi],
  );

  const loadSyllabi = async () => {
    setLoading(true);

    try {
      const response = await api.listSyllabiAll();
      const items = (response.data?.items || []).map((item) => mapSyllabusItem(item));
      setSyllabi(items);
    } catch (error) {
      setSyllabi([]);
      showToast(getResponseErrorMessage(error, 'No se pudieron cargar los sílabos'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyllabi();
  }, []);

  const patchSyllabusStatus = (syllabusId: string, status: SyllabusStatus) => {
    setSyllabi((current) =>
      current.map((item) =>
        item.id === syllabusId
          ? {
              ...item,
              status,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSyllabusStatusOverride(syllabusId, status);
  };

  const openInEditor = async (item: SyllabusListItem) => {
    try {
      let syllabusPayload = getSyllabusPayload(item);

      if (!syllabusPayload || !syllabusPayload.datos_generales) {
        const response = await api.getSyllabus(item.id);
        syllabusPayload = getSyllabusDataFromResponse(response);
      }

      if (!syllabusPayload) {
        showToast('No se pudo cargar el sílabo seleccionado', 'error');
        return;
      }

      const currentStatus = resolveSyllabusStatus(item);
      const syllabusForSession: SyllabusData = {
        ...syllabusPayload,
        _id: item.id,
        id: item.id,
        status: currentStatus,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };

      setCurrentSyllabus(syllabusForSession);
      navigate('/editor');
    } catch (error) {
      showToast(getResponseErrorMessage(error, 'No se pudo abrir el sílabo'), 'error');
    }
  };

  const handleWorkflowAction = async (
    syllabusId: string,
    nextStatus: SyllabusStatus,
    requestAction: () => Promise<APIResponse>,
    successMessage: string,
  ) => {
    setActionLoadingId(syllabusId);

    try {
      await requestAction();
      patchSyllabusStatus(syllabusId, nextStatus);
      showToast(successMessage, 'success');
    } catch (error) {
      showToast(getResponseErrorMessage(error, 'No se pudo completar la acción'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleVersions = async (syllabusId: string) => {
    const isOpen = expandedId === syllabusId;
    setExpandedId(isOpen ? null : syllabusId);

    if (isOpen || versionsById[syllabusId]) {
      return;
    }

    setVersionsLoading((current) => ({ ...current, [syllabusId]: true }));

    try {
      const response = await api.getSyllabusVersions(syllabusId);
      const payload = response.data as { versions?: Partial<SyllabusVersion>[] } | null;
      const versions = (payload?.versions || []).map((version) => enrichVersion(syllabusId, version));
      setVersionsById((current) => ({ ...current, [syllabusId]: versions }));
    } catch (error) {
      setVersionsById((current) => ({ ...current, [syllabusId]: [] }));
      showToast(getResponseErrorMessage(error, 'No se pudo cargar el historial'), 'error');
    } finally {
      setVersionsLoading((current) => ({ ...current, [syllabusId]: false }));
    }
  };

  const handleSaveObservation = async () => {
    if (!selectedObservationId) {
      return;
    }

    if (!observationText.trim()) {
      showToast('Escribe una observación antes de guardar', 'warning');
      return;
    }

    setActionLoadingId(selectedObservationId);

    try {
      await api.addObservation(selectedObservationId, observerName, observationText.trim());
      showToast('Observación guardada correctamente', 'success');
      setObservationText('');
      setSelectedObservationId(null);
    } catch (error) {
      showToast(getResponseErrorMessage(error, 'No se pudo guardar la observación'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActionButtons = (item: SyllabusListItem) => {
    const status = resolveSyllabusStatus(item);
    const isBusy = actionLoadingId === item.id;

    if (status === 'draft' || status === 'generated') {
      return (
        <>
          <button
            onClick={() => openInEditor(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
          >
            <Pencil size={16} />
            Editar
          </button>
          <button
            onClick={() =>
              handleWorkflowAction(
                item.id,
                'review',
                () => api.submitForReview(item.id),
                'Sílabo enviado a revisión',
              )
            }
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />
            {isBusy ? 'Enviando...' : 'Enviar a revisión'}
          </button>
        </>
      );
    }

    if (status === 'review') {
      return (
        <>
          <button
            onClick={() => openInEditor(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
          >
            <Eye size={16} />
            Ver
          </button>
          <button
            onClick={() =>
              handleWorkflowAction(
                item.id,
                'approved',
                () => api.approveSyllabus(item.id),
                'Sílabo aprobado correctamente',
              )
            }
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {isBusy ? 'Aprobando...' : 'Aprobar'}
          </button>
          <button
            onClick={() => setSelectedObservationId(item.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            <MessageSquarePlus size={16} />
            Agregar observación
          </button>
        </>
      );
    }

    if (status === 'approved') {
      return (
        <>
          <button
            onClick={() => openInEditor(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
          >
            <Eye size={16} />
            Ver
          </button>
          <button
            onClick={() =>
              handleWorkflowAction(
                item.id,
                'published',
                () => api.publishSyllabus(item.id),
                'Sílabo publicado correctamente',
              )
            }
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Rocket size={16} />
            {isBusy ? 'Publicando...' : 'Publicar'}
          </button>
        </>
      );
    }

    return (
      <>
        <button
          onClick={() => openInEditor(item)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
        >
          <Eye size={16} />
          Ver
        </button>
        <button
          onClick={() => downloadExport(item.id, 'docx', showToast)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
        >
          <FileDown size={16} />
          Descargar DOCX
        </button>
        <button
          onClick={() => downloadExport(item.id, 'pdf', showToast)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <FileDown size={16} />
          Descargar PDF
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/syllabi" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Mis Sílabos</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Mis Sílabos</h1>
              <p className="mt-1 text-sm text-slate-500">Consulta el estado, historial y workflow de cada sílabo.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-orange-200 hover:text-orange-600"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <button
                onClick={() => navigate('/creator')}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                <PlusCircle size={16} />
                Nuevo Sílabo
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="h-5 w-48 rounded bg-slate-100"></div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="h-4 rounded bg-slate-100"></div>
                    <div className="h-4 rounded bg-slate-100"></div>
                    <div className="h-4 rounded bg-slate-100"></div>
                    <div className="h-4 rounded bg-slate-100"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : syllabi.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-8 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <BookOpen size={28} />
              </div>
              <h2 className="mt-5 text-2xl font-bold">No tienes sílabos aún</h2>
              <p className="mt-2 text-sm text-slate-500">Crea el primero para empezar el workflow académico.</p>
              <button
                onClick={() => navigate('/creator')}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
              >
                <PlusCircle size={16} />
                Crear sílabo
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {syllabi.map((item) => {
                const status = resolveSyllabusStatus(item);
                const isExpanded = expandedId === item.id;
                const versions = versionsById[item.id] || [];

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <button
                            onClick={() => openInEditor(item)}
                            className="text-left text-2xl font-black tracking-tight text-slate-900 hover:text-orange-600"
                          >
                            {getCourseName(item)}
                          </button>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span>{getCareerName(item)}</span>
                            <span className="text-slate-300">•</span>
                            <span>{getSemesterName(item)}</span>
                            <span className="text-slate-300">•</span>
                            <span>{getTeacherName(item)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge status={status} />
                          <span className="text-sm text-slate-500">
                            Creado: {formatDateLabel(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">{renderActionButtons(item)}</div>

                      <div className="border-t border-slate-100 pt-4">
                        <button
                          onClick={() => handleToggleVersions(item.id)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          Ver historial
                        </button>

                        {isExpanded ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                            {versionsLoading[item.id] ? (
                              <p className="text-sm text-slate-500">Cargando historial...</p>
                            ) : versions.length === 0 ? (
                              <p className="text-sm text-slate-500">No hay versiones registradas.</p>
                            ) : (
                              <div className="space-y-3">
                                {versions.map((version) => (
                                  <div
                                    key={version.id || `${item.id}-${version.version_number}`}
                                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">
                                        Versión {version.version_number}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {version.changed_by || 'sistema'} · {version.change_note || 'Sin nota'}
                                      </p>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500">
                                      {formatDateLabel(version.created_at)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Agregar observación</h2>
                <p className="mt-1 text-sm text-slate-500">{getCourseName(selectedItem)}</p>
              </div>
              <button
                onClick={() => setSelectedObservationId(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Observador</span>
                <input
                  value={observerName}
                  onChange={(event) => setObserverName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  placeholder="Nombre del observador"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Observación</span>
                <textarea
                  value={observationText}
                  onChange={(event) => setObservationText(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  placeholder="Escribe aquí la observación curricular"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setSelectedObservationId(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveObservation}
                disabled={actionLoadingId === selectedObservationId}
                className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoadingId === selectedObservationId ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
