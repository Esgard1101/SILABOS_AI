import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { MethodSkillLink, SkillDB, TeachingMethodDB } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

const EMPTY_METHOD: Partial<TeachingMethodDB> = {
  name: '',
  code: '',
  description: '',
  phases: [],
  weekly_template: '',
  estrategias_evaluacion: '',
};

export default function AdminTeachingMethods() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();

  const [methods, setMethods] = useState<TeachingMethodDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [editing, setEditing] = useState<Partial<TeachingMethodDB> | null>(null);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Skill links panel
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(null);
  const [methodSkills, setMethodSkills] = useState<MethodSkillLink[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Add-skill picker
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState<SkillDB[]>([]);
  const [searchingSkills, setSearchingSkills] = useState(false);
  const [addingSkillId, setAddingSkillId] = useState<string | null>(null);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const res = await api.listAdminMethods(includeArchived);
      setMethods(res.data?.items || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar métodos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadMethods(); }, [includeArchived]);

  const loadMethodSkills = async (methodId: string) => {
    setLoadingSkills(true);
    try {
      const res = await api.listMethodSkills(methodId);
      setMethodSkills(res.data?.items || []);
    } catch {
      showToast('Error al cargar habilidades del método', 'error');
    } finally {
      setLoadingSkills(false);
    }
  };

  const toggleExpand = (methodId: string) => {
    if (expandedMethodId === methodId) {
      setExpandedMethodId(null);
      setMethodSkills([]);
    } else {
      setExpandedMethodId(methodId);
      setMethodSkills([]);
      setSkillSearch('');
      setSkillResults([]);
      void loadMethodSkills(methodId);
    }
  };

  const searchSkills = async (q: string) => {
    setSkillSearch(q);
    if (q.trim().length < 2) { setSkillResults([]); return; }
    setSearchingSkills(true);
    try {
      const res = await api.listAdminSkills({ search: q, page_size: 20 });
      setSkillResults(res.data?.items || []);
    } catch {
      setSkillResults([]);
    } finally {
      setSearchingSkills(false);
    }
  };

  const handleAddSkill = async (skillId: string) => {
    if (!expandedMethodId) return;
    setAddingSkillId(skillId);
    try {
      await api.addMethodSkill(expandedMethodId, { skill_id: skillId, priority: 50, is_recommended: false });
      showToast('Habilidad vinculada', 'success');
      setSkillSearch('');
      setSkillResults([]);
      await loadMethodSkills(expandedMethodId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al vincular habilidad', 'error');
    } finally {
      setAddingSkillId(null);
    }
  };

  const handleRemoveSkill = async (linkId: string) => {
    if (!expandedMethodId) return;
    try {
      await api.removeMethodSkill(expandedMethodId, linkId);
      showToast('Habilidad desvinculada', 'success');
      await loadMethodSkills(expandedMethodId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al desvincular', 'error');
    }
  };

  const handleToggleRecommended = async (link: MethodSkillLink) => {
    if (!expandedMethodId) return;
    try {
      await api.updateMethodSkill(expandedMethodId, link.id, {
        priority: link.priority ?? 50,
        is_recommended: !link.is_recommended,
      });
      await loadMethodSkills(expandedMethodId);
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleSave = async () => {
    if (!editing || !editing.name?.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.createMethod(editing);
        showToast('Método creado', 'success');
      } else {
        await api.updateMethod(editing.id!, editing);
        showToast('Método actualizado', 'success');
      }
      setEditing(null);
      await loadMethods();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (method: TeachingMethodDB) => {
    try {
      if (method.is_archived) {
        await api.restoreMethod(method.id);
        showToast('Método restaurado', 'success');
      } else {
        await api.archiveMethod(method.id);
        showToast('Método archivado', 'success');
      }
      await loadMethods();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavSidebar currentPath="/admin/methods" />

      <div className="flex-1">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-orange-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Métodos Pedagógicos</h1>
              <p className="text-xs text-gray-500">CRUD del catálogo de métodos y sus habilidades vinculadas</p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-gray-300 text-orange-500"
              />
              Incluir archivados
            </label>
            <button
              onClick={() => { setIsNew(true); setEditing({ ...EMPTY_METHOD }); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nuevo método
            </button>
          </div>

          {/* Form */}
          {editing && (
            <div className="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-800">{isNew ? 'Nuevo método' : 'Editar método'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editing.name || ''}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ej: Aprendizaje Basado en Problemas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                  <input
                    type="text"
                    value={editing.code || ''}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ej: ABP"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    value={editing.description || ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Describe el método pedagógico…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Secuencia didáctica (weekly template)
                  </label>
                  <textarea
                    rows={2}
                    value={editing.weekly_template || ''}
                    onChange={(e) => setEditing({ ...editing, weekly_template: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                    placeholder="Ej: Presentación → Discusión → Producto → Retroalimentación"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estrategias de evaluación</label>
                  <input
                    type="text"
                    value={editing.estrategias_evaluacion || ''}
                    onChange={(e) => setEditing({ ...editing, estrategias_evaluacion: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Methods list */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando métodos…
            </div>
          ) : methods.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 bg-white rounded-xl border border-gray-200">
              No hay métodos configurados.
            </p>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => (
                <div
                  key={m.id}
                  className={`bg-white border rounded-xl overflow-hidden ${
                    m.is_archived ? 'border-gray-100 opacity-60' : 'border-gray-200'
                  }`}
                >
                  <div className="px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(m.id)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                    >
                      {expandedMethodId === m.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                        {m.code && (
                          <p className="text-xs text-gray-400">{m.code}</p>
                        )}
                      </div>
                      {m.is_archived && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                          Archivado
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setIsNew(false); setEditing({ ...m }); }}
                        className="text-xs text-gray-500 hover:text-orange-600 px-2 py-1 rounded border border-gray-200 hover:border-orange-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleArchive(m)}
                        className={`text-xs px-2 py-1 rounded border ${
                          m.is_archived
                            ? 'text-green-600 border-green-200 hover:bg-green-50'
                            : 'text-gray-400 border-gray-200 hover:text-red-600 hover:border-red-200'
                        }`}
                      >
                        {m.is_archived ? 'Restaurar' : 'Archivar'}
                      </button>
                    </div>
                  </div>

                  {/* Skills panel */}
                  {expandedMethodId === m.id && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Habilidades vinculadas
                      </p>

                      {loadingSkills ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Cargando…
                        </div>
                      ) : methodSkills.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin habilidades vinculadas.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {methodSkills.map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2"
                            >
                              <button
                                onClick={() => handleToggleRecommended(link)}
                                title={link.is_recommended ? 'Marcar como no recomendada' : 'Marcar como recomendada'}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    link.is_recommended ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                  }`}
                                />
                              </button>
                              <span className="flex-1 text-sm text-gray-700 truncate">
                                {link.skill_nombre || link.skill_id}
                              </span>
                              {link.skill_categoria && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                                  {link.skill_categoria}
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveSkill(link.id)}
                                className="text-gray-300 hover:text-red-500 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add skill */}
                      <div className="pt-1 space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={skillSearch}
                            onChange={(e) => searchSkills(e.target.value)}
                            placeholder="Buscar habilidad para vincular…"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-8"
                          />
                          {searchingSkills && (
                            <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                          )}
                        </div>
                        {skillResults.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            {skillResults.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleAddSkill(s.id)}
                                disabled={
                                  methodSkills.some((l) => l.skill_id === s.id) || addingSkillId === s.id
                                }
                                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 disabled:text-gray-300 disabled:cursor-not-allowed border-b border-gray-50 last:border-0 flex items-center justify-between gap-2"
                              >
                                <span className="truncate">{s.nombre}</span>
                                <span className="text-xs text-gray-400 shrink-0">{s.categoria}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
