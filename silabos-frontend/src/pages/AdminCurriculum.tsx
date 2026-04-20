import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AdminCourseItem, CourseDetail, PerformanceDB } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

export default function AdminCurriculum() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();

  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Curriculum edit
  const [curriculumEdit, setCurriculumEdit] = useState<{
    sumilla: string;
    competencia_egreso: string;
    resultado_aprendizaje: string;
    capacidad: string;
  } | null>(null);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  // Performances
  const [performances, setPerformances] = useState<PerformanceDB[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [newStatement, setNewStatement] = useState('');
  const [addingPerf, setAddingPerf] = useState(false);
  const [editingPerfId, setEditingPerfId] = useState<string | null>(null);
  const [editingPerfText, setEditingPerfText] = useState('');
  const [savingPerfId, setSavingPerfId] = useState<string | null>(null);

  const searchCourses = async (q: string) => {
    if (q.trim().length < 2) { setCourses([]); return; }
    setLoadingCourses(true);
    try {
      const res = await api.listAdminCourses(undefined, q);
      setCourses(res.data?.items || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al buscar cursos', 'error');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCourseSearch(searchInput);
  };

  useEffect(() => {
    if (courseSearch) void searchCourses(courseSearch);
    else setCourses([]);
  }, [courseSearch]);

  const loadCourseDetail = async (courseId: string) => {
    setLoadingDetail(true);
    try {
      const res = await api.getCourseCurriculum(courseId);
      const detail = res.data;
      setCourseDetail(detail);
      setCurriculumEdit({
        sumilla: detail.sumilla || '',
        competencia_egreso: detail.competencia_egreso || '',
        resultado_aprendizaje: detail.resultado_aprendizaje || '',
        capacidad: detail.capacidad || '',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar currículum', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadPerformances = async (courseId: string) => {
    setLoadingPerf(true);
    try {
      const res = await api.listPerformances(courseId, false);
      setPerformances(res.data?.items || []);
    } catch {
      showToast('Error al cargar desempeños', 'error');
    } finally {
      setLoadingPerf(false);
    }
  };

  const toggleCourse = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setCourseDetail(null);
      setCurriculumEdit(null);
      setPerformances([]);
      return;
    }
    setExpandedCourseId(courseId);
    setPerformances([]);
    setNewStatement('');
    setEditingPerfId(null);
    await Promise.all([loadCourseDetail(courseId), loadPerformances(courseId)]);
  };

  const handleSaveCurriculum = async () => {
    if (!expandedCourseId || !curriculumEdit) return;
    setSavingCurriculum(true);
    try {
      await api.updateCourseCurriculum(expandedCourseId, curriculumEdit);
      showToast('Currículum actualizado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar currículum', 'error');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const handleAddPerformance = async () => {
    if (!expandedCourseId || !newStatement.trim()) return;
    setAddingPerf(true);
    try {
      await api.createPerformance(expandedCourseId, newStatement.trim());
      setNewStatement('');
      await loadPerformances(expandedCourseId);
      showToast('Desempeño agregado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al agregar desempeño', 'error');
    } finally {
      setAddingPerf(false);
    }
  };

  const handleSavePerformance = async (perfId: string) => {
    if (!expandedCourseId || !editingPerfText.trim()) return;
    setSavingPerfId(perfId);
    try {
      await api.updatePerformance(expandedCourseId, perfId, editingPerfText.trim());
      setEditingPerfId(null);
      await loadPerformances(expandedCourseId);
      showToast('Desempeño actualizado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar', 'error');
    } finally {
      setSavingPerfId(null);
    }
  };

  const handleArchivePerformance = async (perfId: string) => {
    if (!expandedCourseId) return;
    try {
      await api.archivePerformance(expandedCourseId, perfId);
      await loadPerformances(expandedCourseId);
      showToast('Desempeño archivado', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al archivar', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavSidebar currentPath="/admin/curriculum" />

      <div className="flex-1">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-orange-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Currículum de Cursos</h1>
              <p className="text-xs text-gray-500">
                Edita sumilla, competencias y desempeños por curso
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Busca un curso por nombre o código…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg"
            >
              Buscar
            </button>
          </form>

          {loadingCourses && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando cursos…
            </div>
          )}

          {!loadingCourses && courseSearch && courses.length === 0 && (
            <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-4">
              No se encontraron cursos para "{courseSearch}".
            </p>
          )}

          {/* Course list */}
          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleCourse(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {expandedCourseId === c.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.code && `${c.code} · `}
                      {c.program_name || c.career_name || ''}
                    </p>
                  </div>
                  {c.credits != null && (
                    <span className="text-xs text-gray-400 shrink-0">{c.credits} cr.</span>
                  )}
                </button>

                {expandedCourseId === c.id && (
                  <div className="border-t border-gray-100 px-4 py-5 space-y-6 bg-gray-50">
                    {loadingDetail ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando currículum…
                      </div>
                    ) : curriculumEdit && (
                      <>
                        {/* Curriculum fields */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                            Información curricular
                          </h3>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Sumilla</label>
                            <textarea
                              rows={4}
                              value={curriculumEdit.sumilla}
                              onChange={(e) => setCurriculumEdit({ ...curriculumEdit, sumilla: e.target.value })}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Competencia de egreso
                            </label>
                            <textarea
                              rows={3}
                              value={curriculumEdit.competencia_egreso}
                              onChange={(e) =>
                                setCurriculumEdit({ ...curriculumEdit, competencia_egreso: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Resultado de aprendizaje
                            </label>
                            <textarea
                              rows={3}
                              value={curriculumEdit.resultado_aprendizaje}
                              onChange={(e) =>
                                setCurriculumEdit({ ...curriculumEdit, resultado_aprendizaje: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad</label>
                            <textarea
                              rows={2}
                              value={curriculumEdit.capacidad}
                              onChange={(e) =>
                                setCurriculumEdit({ ...curriculumEdit, capacidad: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={handleSaveCurriculum}
                              disabled={savingCurriculum}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg"
                            >
                              {savingCurriculum ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              {savingCurriculum ? 'Guardando…' : 'Guardar currículum'}
                            </button>
                          </div>
                        </div>

                        {/* Performances */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                            Desempeños ({performances.length})
                          </h3>

                          {loadingPerf ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cargando…
                            </div>
                          ) : performances.length === 0 ? (
                            <p className="text-sm text-gray-400">Sin desempeños configurados.</p>
                          ) : (
                            <div className="space-y-2">
                              {performances.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2.5"
                                >
                                  <span className="text-xs font-mono font-bold text-orange-500 mt-0.5 shrink-0">
                                    {p.code || '—'}
                                  </span>
                                  {editingPerfId === p.id ? (
                                    <div className="flex-1 flex items-start gap-2">
                                      <textarea
                                        rows={2}
                                        value={editingPerfText}
                                        onChange={(e) => setEditingPerfText(e.target.value)}
                                        className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm"
                                        autoFocus
                                      />
                                      <div className="flex flex-col gap-1 shrink-0">
                                        <button
                                          onClick={() => handleSavePerformance(p.id)}
                                          disabled={savingPerfId === p.id}
                                          className="text-xs px-2 py-1 bg-orange-500 text-white rounded font-semibold"
                                        >
                                          {savingPerfId === p.id ? '…' : 'OK'}
                                        </button>
                                        <button
                                          onClick={() => setEditingPerfId(null)}
                                          className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="flex-1 text-sm text-gray-700">{p.statement}</p>
                                  )}
                                  {editingPerfId !== p.id && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() => {
                                          setEditingPerfId(p.id);
                                          setEditingPerfText(p.statement);
                                        }}
                                        className="text-xs text-gray-400 hover:text-orange-600 px-1.5 py-0.5 rounded border border-gray-200"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleArchivePerformance(p.id)}
                                        className="text-xs text-gray-300 hover:text-red-500 px-1.5 py-0.5 rounded border border-gray-200"
                                      >
                                        Archivar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add performance */}
                          <div className="flex items-start gap-2 pt-1">
                            <textarea
                              rows={2}
                              value={newStatement}
                              onChange={(e) => setNewStatement(e.target.value)}
                              placeholder="Escribe un nuevo desempeño…"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                            />
                            <button
                              onClick={handleAddPerformance}
                              disabled={addingPerf || !newStatement.trim()}
                              className="inline-flex items-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white text-sm font-semibold rounded-lg shrink-0"
                            >
                              {addingPerf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
