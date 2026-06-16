import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { EvaluationItemPreset } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

const EMPTY: Partial<EvaluationItemPreset> = {
  sigla: '',
  nombre: '',
  pct_sugerido: 0,
  program_id: null,
};

export default function AdminEvaluationPresets() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();

  const [presets, setPresets] = useState<EvaluationItemPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [editing, setEditing] = useState<Partial<EvaluationItemPreset> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listEvaluationPresets(undefined, includeInactive);
      setPresets(res.data?.items || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [includeInactive]);

  const handleSave = async () => {
    if (!editing || !editing.sigla?.trim() || !editing.nombre?.trim()) {
      showToast('Sigla y nombre son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<EvaluationItemPreset> = {
        sigla: editing.sigla.trim().toUpperCase(),
        nombre: editing.nombre.trim(),
        pct_sugerido: editing.pct_sugerido ?? null,
        program_id: editing.program_id?.trim() ? editing.program_id.trim() : null,
      };
      if (isNew) {
        await api.createEvaluationPreset(payload);
        showToast('Item creado', 'success');
      } else {
        await api.updateEvaluationPreset(editing.id!, payload);
        showToast('Item actualizado', 'success');
      }
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (preset: EvaluationItemPreset) => {
    try {
      await api.deleteEvaluationPreset(preset.id);
      showToast('Item desactivado', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavSidebar currentPath="/admin/evaluation-presets" />

      <div className="flex-1">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-orange-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Items de Evaluación</h1>
              <p className="text-xs text-gray-500">Catálogo de evidencias preestablecidas del selector del wizard</p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-orange-500"
              />
              Incluir inactivos
            </label>
            <button
              onClick={() => { setIsNew(true); setEditing({ ...EMPTY }); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Nuevo item
            </button>
          </div>

          {editing && (
            <div className="bg-white border border-orange-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-800">{isNew ? 'Nuevo item' : 'Editar item'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sigla *</label>
                  <input
                    type="text"
                    value={editing.sigla || ''}
                    onChange={(e) => setEditing({ ...editing, sigla: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
                    placeholder="Ej: EP"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">% sugerido</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editing.pct_sugerido ?? 0}
                    onChange={(e) => setEditing({ ...editing, pct_sugerido: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editing.nombre || ''}
                    onChange={(e) => setEditing({ ...editing, nombre: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Ej: Examen Parcial"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Program ID (vacío = global, visible para todos los programas)
                  </label>
                  <input
                    type="text"
                    value={editing.program_id || ''}
                    onChange={(e) => setEditing({ ...editing, program_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                    placeholder="UUID del programa (opcional)"
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

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando items…
            </div>
          ) : presets.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 bg-white rounded-xl border border-gray-200">
              No hay items configurados.
            </p>
          ) : (
            <div className="space-y-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 ${
                    p.activo === false ? 'border-gray-100 opacity-60' : 'border-gray-200'
                  }`}
                >
                  <span className="font-mono text-sm font-bold text-orange-600 w-14 shrink-0">{p.sigla}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {p.pct_sugerido ?? 0}% sugerido · {p.program_id ? 'Programa específico' : 'Global'}
                    </p>
                  </div>
                  {p.activo === false && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Inactivo</span>
                  )}
                  <button
                    onClick={() => { setIsNew(false); setEditing({ ...p }); }}
                    className="text-xs text-gray-500 hover:text-orange-600 px-2 py-1 rounded border border-gray-200 hover:border-orange-300 shrink-0"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    title="Desactivar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
