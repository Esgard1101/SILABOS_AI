import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Send,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APIResponse, SyllabusData, SyllabusListItem, SyllabusObservation } from '../api/types';
import { api } from '../api/client';
import NavSidebar from '../components/NavSidebar';
import StatusBadge from '../components/StatusBadge';
import Toast, { useToast } from '../components/Toast';
import { getStoredUser } from '../hooks/useAuth';
import {
  enrichObservation,
  formatDateLabel,
  getCareerName,
  getCourseName,
  getSemesterName,
  getTeacherName,
  resolveSyllabusStatus,
  setCurrentSyllabus,
  setSyllabusStatusOverride,
} from '../utils/syllabusStorage';

type ReviewTab = 'review' | 'draft' | 'approved' | 'published';

const TAB_META: Array<{ key: ReviewTab; label: string }> = [
  { key: 'review', label: 'Pendientes de revisión' },
  { key: 'draft', label: 'Observados' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'published', label: 'Publicados' },
];

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

function extractSyllabusPayload(response: APIResponse | null): SyllabusData | null {
  if (!response?.data || typeof response.data !== 'object') {
    return null;
  }

  const data = response.data as Record<string, unknown>;
  const payload = data.payload_json;

  if (payload && typeof payload === 'object') {
    return payload as SyllabusData;
  }

  return data as unknown as SyllabusData;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-8 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
        <ClipboardCheck size={28} />
      </div>
      <h2 className="mt-5 text-2xl font-bold">{label}</h2>
      <p className="mt-2 text-sm text-slate-500">Cuando aparezcan sílabos en este estado, los verás aquí.</p>
    </div>
  );
}

export default function Review() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReviewTab>('review');
  const [syllabi, setSyllabi] = useState<SyllabusListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SyllabusListItem | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<SyllabusData | null>(null);
  const [observations, setObservations] = useState<SyllabusObservation[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [observerName, setObserverName] = useState(getStoredUser()?.full_name || 'Dirección de Escuela');
  const { showToast, toasts, removeToast } = useToast();

  const loadSyllabi = async () => {
    setLoading(true);

    try {
      const response = await api.listSyllabiAll();
      setSyllabi((response.data?.items || []).map((item) => mapSyllabusItem(item)));
    } catch (error) {
      setSyllabi([]);
      showToast(error instanceof Error ? error.message : 'No se pudo cargar la revisión académica', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyllabi();
  }, []);

  const filteredItems = useMemo(() => {
    return syllabi.filter((item) => resolveSyllabusStatus(item) === activeTab);
  }, [activeTab, syllabi]);

  const openDrawer = async (item: SyllabusListItem) => {
    setDrawerOpen(true);
    setSelectedItem(item);
    setSelectedPayload(item.payload_json || null);
    setObservations([]);
    setObservationText('');
    setDrawerLoading(true);

    try {
      const [syllabusResponse, observationsResponse] = await Promise.all([
        api.getSyllabus(item.id),
        api.getObservations(item.id),
      ]);

      const payload = extractSyllabusPayload(syllabusResponse);
      const observationPayload = observationsResponse.data as { observations?: Partial<SyllabusObservation>[] } | null;

      setSelectedPayload(payload);
      setObservations((observationPayload?.observations || []).map((obs) => enrichObservation(item.id, obs)));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo abrir el panel de revisión', 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
    setSelectedPayload(null);
    setObservations([]);
    setObservationText('');
  };

  const addObservationIfNeeded = async () => {
    if (!selectedItem || !observationText.trim()) {
      return null;
    }

    const response = await api.addObservation(selectedItem.id, observerName, observationText.trim());
    const savedObservation = enrichObservation(
      selectedItem.id,
      (response.data as Partial<SyllabusObservation>) || {},
    );
    setObservations((current) => [savedObservation, ...current]);
    return savedObservation;
  };

  const handleApprove = async () => {
    if (!selectedItem) {
      return;
    }

    setActionLoading(true);

    try {
      await api.approveSyllabus(selectedItem.id);
      setSyllabusStatusOverride(selectedItem.id, 'approved');
      setSyllabi((current) =>
        current.map((item) =>
          item.id === selectedItem.id
            ? { ...item, status: 'approved', updated_at: new Date().toISOString() }
            : item,
        ),
      );
      showToast('Sílabo aprobado correctamente', 'success');
      closeDrawer();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo aprobar el sílabo', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedItem) {
      return;
    }

    setActionLoading(true);

    try {
      if (observationText.trim()) {
        await addObservationIfNeeded();
      }

      showToast('Observación registrada. El sílabo sigue en revisión.', 'success');
      setObservationText('');
      closeDrawer();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar la observación', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditor = async () => {
    if (!selectedItem) {
      return;
    }

    const syllabusForSession: SyllabusData = {
      ...(selectedPayload || {}),
      _id: selectedItem.id,
      id: selectedItem.id,
      status: resolveSyllabusStatus(selectedItem),
      created_at: selectedItem.created_at,
      updated_at: selectedItem.updated_at,
    };

    setCurrentSyllabus(syllabusForSession);
    navigate('/editor');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/review" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Revisión Académica</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Revisión Académica</h1>
              <p className="mt-1 text-sm text-slate-500">Dirección de Escuela · Control del workflow curricular.</p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-orange-200 hover:text-orange-600"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {TAB_META.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.key ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:text-orange-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="mt-8">
            {loading ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-3xl border border-orange-100 bg-white"></div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                label={
                  activeTab === 'review'
                    ? 'No hay sílabos en revisión'
                    : activeTab === 'draft'
                      ? 'No hay sílabos observados'
                      : activeTab === 'approved'
                        ? 'No hay sílabos aprobados'
                        : 'No hay sílabos publicados'
                }
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {filteredItems.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{getCourseName(item)}</h2>
                        <p className="mt-2 text-sm text-slate-500">{getTeacherName(item)}</p>
                        <p className="mt-1 text-sm text-slate-500">{getSemesterName(item)}</p>
                      </div>
                      <StatusBadge status={resolveSyllabusStatus(item)} />
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha de envío</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{formatDateLabel(item.updated_at || item.created_at)}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => openDrawer(item)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                          activeTab === 'review'
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'border border-slate-200 text-slate-700 hover:border-orange-200 hover:text-orange-600'
                        }`}
                      >
                        <Eye size={16} />
                        {activeTab === 'review' ? 'Revisar' : 'Ver detalle'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <div
        className={`fixed inset-0 z-50 transition ${drawerOpen ? 'pointer-events-auto bg-slate-900/40' : 'pointer-events-none bg-transparent'}`}
      >
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl transform bg-white shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-orange-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Revisión del sílabo</h2>
                <p className="mt-1 text-sm text-slate-500">Panel lateral de evaluación académica.</p>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {drawerLoading ? (
                <p className="text-sm text-slate-500">Cargando información del sílabo...</p>
              ) : selectedItem ? (
                <>
                  <section className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-orange-700">Datos del sílabo</h3>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p><span className="font-semibold">Nombre:</span> {getCourseName(selectedPayload || selectedItem)}</p>
                      <p><span className="font-semibold">Carrera:</span> {getCareerName(selectedPayload || selectedItem)}</p>
                      <p><span className="font-semibold">Semestre:</span> {getSemesterName(selectedPayload || selectedItem)}</p>
                      <p><span className="font-semibold">Docente:</span> {getTeacherName(selectedPayload || selectedItem)}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900">Observaciones previas</h3>
                    <div className="mt-4 space-y-3">
                      {observations.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          Sin observaciones previas
                        </div>
                      ) : (
                        observations.map((observation) => (
                          <article key={observation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-slate-800">{observation.observer_name}</p>
                              <span className="text-xs text-slate-500">{formatDateLabel(observation.created_at)}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{observation.observation}</p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900">Nueva observación</h3>
                    <div className="mt-4 space-y-4">
                      <input
                        value={observerName}
                        onChange={(event) => setObserverName(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        placeholder="Nombre del observador"
                      />
                      <textarea
                        value={observationText}
                        onChange={(event) => setObservationText(event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                        placeholder="Escribe una observación académica"
                      />
                      <button
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            const saved = await addObservationIfNeeded();
                            if (!saved) {
                              showToast('Escribe una observación para guardarla', 'warning');
                              return;
                            }
                            showToast('Observación agregada correctamente', 'success');
                            setObservationText('');
                          } catch (error) {
                            showToast(error instanceof Error ? error.message : 'No se pudo guardar la observación', 'error');
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={16} />
                        Agregar observación
                      </button>
                    </div>
                  </section>
                </>
              ) : null}
            </div>

            {selectedItem ? (
              <div className="border-t border-orange-100 px-6 py-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Acciones</h3>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    ✅ Aprobar sílabo
                  </button>
                  <button
                    onClick={handleReturn}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle size={16} />
                    ↩ Devolver para corrección
                  </button>
                  <button
                    onClick={openEditor}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600"
                  >
                    <Eye size={16} />
                    Abrir en editor
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
