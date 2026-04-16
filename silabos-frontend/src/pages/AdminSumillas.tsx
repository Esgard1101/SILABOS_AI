import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, History, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AdminCourseItem, CourseSumillaHistoryItem } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

interface Faculty {
  id: string;
  name: string;
}

interface Career {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSumillas() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourseItem | null>(null);
  const [draftSumilla, setDraftSumilla] = useState('');
  const [history, setHistory] = useState<CourseSumillaHistoryItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getInstitutionalFaculties()
      .then((response) => setFaculties((response.faculties || []).map((faculty) => ({ id: faculty.id, name: faculty.name }))))
      .catch(() => showToast('No se pudieron cargar las facultades', 'error'));
  }, [showToast]);

  useEffect(() => {
    if (!selectedFacultyId) {
      setCareers([]);
      setSelectedCareerId('');
      setPrograms([]);
      setSelectedProgramId('');
      return;
    }

    api
      .getInstitutionalCareers(selectedFacultyId)
      .then((response) => setCareers((response.data || []).map((career) => ({ id: career.id, name: career.name }))))
      .catch(() => showToast('No se pudieron cargar las escuelas', 'error'));
  }, [selectedFacultyId, showToast]);

  useEffect(() => {
    if (!selectedCareerId) {
      setPrograms([]);
      setSelectedProgramId('');
      return;
    }

    api
      .getPrograms(selectedCareerId)
      .then((response) => setPrograms((response.data || []).map((program) => ({ id: program.id, name: program.name }))))
      .catch(() => showToast('No se pudieron cargar los programas', 'error'));
  }, [selectedCareerId, showToast]);

  useEffect(() => {
    if (!selectedProgramId) {
      setCourses([]);
      setSelectedCourse(null);
      return;
    }

    setLoadingCourses(true);
    api
      .listAdminCourses(selectedProgramId, search)
      .then((response) => {
        const items = response.data.items || [];
        setCourses(items);
        if (!selectedCourse || !items.some((course) => course.id === selectedCourse.id)) {
          const first = items[0] || null;
          setSelectedCourse(first);
          setDraftSumilla(first?.sumilla || '');
        }
      })
      .catch((error) => showToast(error instanceof Error ? error.message : 'No se pudieron cargar los cursos', 'error'))
      .finally(() => setLoadingCourses(false));
  }, [selectedProgramId, search, showToast]);

  useEffect(() => {
    if (!selectedCourse) {
      setHistory([]);
      setDraftSumilla('');
      return;
    }

    setDraftSumilla(selectedCourse.sumilla || '');
    setLoadingHistory(true);
    api
      .getCourseSumillaHistory(selectedCourse.id)
      .then((response) => setHistory(response.data.items || []))
      .catch(() => showToast('No se pudo cargar el historial de sumillas', 'warning'))
      .finally(() => setLoadingHistory(false));
  }, [selectedCourse, showToast]);

  const selectedProgramName = useMemo(
    () => programs.find((program) => program.id === selectedProgramId)?.name || 'Sin programa',
    [programs, selectedProgramId],
  );

  const handleSave = async () => {
    if (!selectedCourse) {
      return;
    }

    if (!draftSumilla.trim()) {
      showToast('La sumilla no puede quedar vacía', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Vas a actualizar la sumilla crítica del curso "${selectedCourse.name}". ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      await api.updateCourseSumilla(selectedCourse.id, draftSumilla.trim());
      showToast('Sumilla actualizada correctamente', 'success');
      const refreshed = await api.listAdminCourses(selectedProgramId, search);
      const updatedCourses = refreshed.data.items || [];
      setCourses(updatedCourses);
      const updatedCourse = updatedCourses.find((course) => course.id === selectedCourse.id) || selectedCourse;
      setSelectedCourse(updatedCourse);
      const historyResponse = await api.getCourseSumillaHistory(selectedCourse.id);
      setHistory(historyResponse.data.items || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo actualizar la sumilla', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/admin/sumillas" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Gestión de Sumillas</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Gestión de Sumillas</h1>
              <p className="mt-1 text-sm text-slate-500">Edición controlada de la sumilla del curso con auditoría automática.</p>
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
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-4">
              <select
                value={selectedFacultyId}
                onChange={(event) => setSelectedFacultyId(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Facultad</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCareerId}
                disabled={!selectedFacultyId}
                onChange={(event) => setSelectedCareerId(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
              >
                <option value="">Escuela</option>
                {careers.map((career) => (
                  <option key={career.id} value={career.id}>
                    {career.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedProgramId}
                disabled={!selectedCareerId}
                onChange={(event) => setSelectedProgramId(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
              >
                <option value="">Programa</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar curso o código"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Cursos del programa</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedProgramName}</p>

              <div className="mt-5 space-y-3">
                {loadingCourses ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando cursos...
                  </div>
                ) : courses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Selecciona un programa para listar sus cursos.
                  </div>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selectedCourse?.id === course.id
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{course.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {course.code || 'Sin código'} · {course.cycle ? `Ciclo ${course.cycle}` : 'Sin ciclo'}
                          </p>
                        </div>
                        {course.is_common ? (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                            Común
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <FileText size={22} />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-900">
                      {selectedCourse?.name || 'Selecciona un curso'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Solo se edita la sumilla. El resto de campos críticos queda en solo lectura.
                    </p>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!selectedCourse || saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar sumilla'}
                  </button>
                </div>

                <textarea
                  value={draftSumilla}
                  onChange={(event) => setDraftSumilla(event.target.value)}
                  rows={14}
                  disabled={!selectedCourse}
                  className="mt-6 w-full rounded-3xl border border-slate-200 px-5 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Selecciona un curso para editar su sumilla..."
                />
              </section>

              <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Historial de cambios</h2>
                    <p className="text-sm text-slate-500">Cada actualización queda registrada automáticamente.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando historial...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Aún no hay cambios registrados para este curso.
                    </div>
                  ) : (
                    history.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.changed_by_name || 'Administrador'}
                          </p>
                          <span className="text-xs text-slate-500">{formatDate(item.changed_at)}</span>
                        </div>
                        <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                          {item.new_sumilla}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
