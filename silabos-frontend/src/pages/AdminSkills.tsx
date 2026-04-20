import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { SkillDB } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

const EMPTY_SKILL: Partial<SkillDB> = {
  nombre: '',
  descripcion: '',
  categoria: '',
  subcategoria: '',
  nivel_cognitivo: '',
  verbo_principal: '',
  evidencias_sugeridas: '',
  instrumentos_sugeridos: '',
};

const NIVELES = ['Recordar', 'Comprender', 'Aplicar', 'Analizar', 'Evaluar', 'Crear'];

export default function AdminSkills() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();

  const [skills, setSkills] = useState<SkillDB[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [editing, setEditing] = useState<Partial<SkillDB> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchInput, setSearchInput] = useState('');

  const loadSkills = async (p = page, s = search, cat = categoriaFilter) => {
    setLoading(true);
    try {
      const res = await api.listAdminSkills({
        search: s || undefined,
        categoria: cat || undefined,
        page: p,
        page_size: PAGE_SIZE,
        include_archived: includeArchived || undefined,
      });
      setSkills(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar habilidades', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSkills(1, search, categoriaFilter); }, [search, categoriaFilter, includeArchived]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSave = async () => {
    if (!editing?.nombre?.trim() || !editing?.categoria?.trim()) {
      showToast('Nombre y categoría son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.createSkill(editing);
        showToast('Habilidad creada', 'success');
      } else {
        await api.updateSkill(editing.id!, editing);
        showToast('Habilidad actualizada', 'success');
      }
      setEditing(null);
      await loadSkills(1, search, categoriaFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (skill: SkillDB) => {
    try {
      const isActive = !skill.estado || skill.estado === 'activo';
      if (isActive) {
        await api.archiveSkill(skill.id);
        showToast('Habilidad archivada', 'success');
      } else {
        await api.restoreSkill(skill.id);
        showToast('Habilidad restaurada', 'success');
      }
      await loadSkills(1, search, categoriaFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavSidebar currentPath="/admin/skills" />

      <div className="flex-1">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-orange-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Catálogo de Habilidades</h1>
              <p className="text-xs text-gray-500">
                {total} habilidad{total !== 1 ? 'es' : ''} en total
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre o verbo…"
                className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
              >
                Buscar
              </button>
            </form>
            <input
              type="text"
              value={categoriaFilter}
              onChange={(e) => { setCategoriaFilter(e.target.value); setPage(1); }}
              placeholder="Filtrar por categoría…"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-40"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
                className="rounded border-gray-300 text-orange-500"
              />
              Archivadas
            </label>
            <button
              onClick={() => { setIsNew(true); setEditing({ ...EMPTY_SKILL }); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-800">
                {isNew ? 'Nueva habilidad' : 'Editar habilidad'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editing.nombre || ''}
                    onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
                  <input
                    type="text"
                    value={editing.categoria || ''}
                    onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subcategoría</label>
                  <input
                    type="text"
                    value={editing.subcategoria || ''}
                    onChange={(e) => setEditing({ ...editing, subcategoria: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nivel cognitivo</label>
                  <select
                    value={editing.nivel_cognitivo || ''}
                    onChange={(e) => setEditing({ ...editing, nivel_cognitivo: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar…</option>
                    {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Verbo principal</label>
                  <input
                    type="text"
                    value={editing.verbo_principal || ''}
                    onChange={(e) => setEditing({ ...editing, verbo_principal: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ej: Analizar, Diseñar, Evaluar…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ID habilidad</label>
                  <input
                    type="text"
                    value={editing.id_habilidad || ''}
                    onChange={(e) => setEditing({ ...editing, id_habilidad: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                    placeholder="Ej: HAB-001"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <textarea
                    rows={2}
                    value={editing.descripcion || ''}
                    onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Evidencias sugeridas</label>
                  <input
                    type="text"
                    value={editing.evidencias_sugeridas || ''}
                    onChange={(e) => setEditing({ ...editing, evidencias_sugeridas: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Instrumentos sugeridos</label>
                  <input
                    type="text"
                    value={editing.instrumentos_sugeridos || ''}
                    onChange={(e) => setEditing({ ...editing, instrumentos_sugeridos: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
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

          {/* Table */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando habilidades…
            </div>
          ) : skills.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 bg-white rounded-xl border border-gray-200">
              No se encontraron habilidades con los filtros actuales.
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Nivel</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Verbo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-t border-gray-100 ${s.estado && s.estado !== 'activo' ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{s.nombre}</p>
                        {s.id_habilidad && (
                          <p className="text-xs text-gray-400 font-mono">{s.id_habilidad}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        <div>
                          <p>{s.categoria}</p>
                          {s.subcategoria && (
                            <p className="text-xs text-gray-400">{s.subcategoria}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {s.nivel_cognitivo || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {s.verbo_principal || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setIsNew(false); setEditing({ ...s }); }}
                            className="text-xs text-gray-500 hover:text-orange-600 px-2 py-1 rounded border border-gray-200 hover:border-orange-300"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleArchive(s)}
                            className={`text-xs px-2 py-1 rounded border ${
                              s.estado && s.estado !== 'activo'
                                ? 'text-green-600 border-green-200 hover:bg-green-50'
                                : 'text-gray-400 border-gray-200 hover:text-red-600 hover:border-red-200'
                            }`}
                          >
                            {s.estado && s.estado !== 'activo' ? 'Restaurar' : 'Archivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setPage((p) => p - 1); void loadSkills(page - 1, search, categoriaFilter); }}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => { setPage((p) => p + 1); void loadSkills(page + 1, search, categoriaFilter); }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
