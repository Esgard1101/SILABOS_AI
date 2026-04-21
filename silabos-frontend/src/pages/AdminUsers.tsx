import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AdminUserItem, EffectivePermissions, PermissionOverride, UserScopeAssignment } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

type StatusFilter = 'pending' | 'active' | 'rejected';

const STATUS_META: Array<{ key: StatusFilter; label: string; tone: string }> = [
  { key: 'pending', label: 'Pendientes', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'active', label: 'Activos', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'rejected', label: 'Rechazados', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const ROLES = ['docente', 'coordinador', 'director', 'admin'] as const;

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

interface UserDetailPanelProps {
  userId: string;
  onClose: () => void;
}

function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const { showToast } = useToast();

  const [scopes, setScopes] = useState<UserScopeAssignment[]>([]);
  const [perms, setPerms] = useState<EffectivePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const [newScopeType, setNewScopeType] = useState<'career' | 'program'>('career');
  const [newScopeId, setNewScopeId] = useState('');
  const [addingScope, setAddingScope] = useState(false);

  const [newPermKey, setNewPermKey] = useState('');
  const [newPermEffect, setNewPermEffect] = useState<'allow' | 'deny'>('allow');
  const [addingPerm, setAddingPerm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scopeRes, permRes] = await Promise.all([
        api.getUserScopes(userId),
        api.getUserPermissions(userId),
      ]);
      setScopes(scopeRes.data?.items || []);
      setPerms(permRes.data || null);
    } catch {
      showToast('Error al cargar detalles del usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [userId]);

  const handleAddScope = async () => {
    if (!newScopeId.trim()) return;
    setAddingScope(true);
    try {
      await api.addUserScope(userId, { scope_type: newScopeType, scope_id: newScopeId.trim() });
      setNewScopeId('');
      showToast('Scope asignado', 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al asignar scope', 'error');
    } finally {
      setAddingScope(false);
    }
  };

  const handleRemoveScope = async (scopeId: string) => {
    try {
      await api.removeUserScope(userId, scopeId);
      showToast('Scope eliminado', 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar scope', 'error');
    }
  };

  const handleAddPerm = async () => {
    if (!newPermKey.trim()) return;
    setAddingPerm(true);
    try {
      await api.addPermissionOverride(userId, { permission_key: newPermKey.trim(), effect: newPermEffect });
      setNewPermKey('');
      showToast('Override agregado', 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al agregar override', 'error');
    } finally {
      setAddingPerm(false);
    }
  };

  const handleRemovePerm = async (overrideId: string) => {
    try {
      await api.removePermissionOverride(userId, overrideId);
      showToast('Override eliminado', 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar override', 'error');
    }
  };

  if (loading) {
    return (
      <td colSpan={7} className="px-6 py-4 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando…
        </div>
      </td>
    );
  }

  const overrideList = perms?.override_list ?? [];

  return (
    <td colSpan={7} className="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scopes */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Scopes asignados</p>
          {scopes.length === 0 ? (
            <p className="text-xs text-gray-400">Sin scopes asignados.</p>
          ) : (
            <div className="space-y-1.5">
              {scopes.map((s) => (
                <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                    {s.scope_type}
                  </span>
                  <span className="flex-1 truncate text-gray-700">{s.scope_name || s.scope_id}</span>
                  <button onClick={() => handleRemoveScope(s.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <select
              value={newScopeType}
              onChange={(e) => setNewScopeType(e.target.value as 'career' | 'program')}
              className="rounded border border-gray-200 px-2 py-1 text-xs"
            >
              <option value="career">career</option>
              <option value="program">program</option>
            </select>
            <input
              type="text"
              value={newScopeId}
              onChange={(e) => setNewScopeId(e.target.value)}
              placeholder="UUID del scope…"
              className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs font-mono"
            />
            <button
              onClick={handleAddScope}
              disabled={addingScope || !newScopeId.trim()}
              className="px-2 py-1 bg-orange-500 text-white rounded text-xs disabled:opacity-50"
            >
              {addingScope ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Permission overrides */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Overrides de permisos</p>
          {overrideList.length === 0 ? (
            <p className="text-xs text-gray-400">Sin overrides configurados.</p>
          ) : (
            <div className="space-y-1.5">
              {overrideList.map((ov: PermissionOverride) => (
                <div key={ov.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${ov.effect === 'deny' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {ov.effect}
                  </span>
                  <span className="flex-1 truncate text-gray-700 font-mono text-xs">{ov.permission_key}</span>
                  <button onClick={() => handleRemovePerm(ov.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <select
              value={newPermEffect}
              onChange={(e) => setNewPermEffect(e.target.value as 'allow' | 'deny')}
              className="rounded border border-gray-200 px-2 py-1 text-xs"
            >
              <option value="allow">allow</option>
              <option value="deny">deny</option>
            </select>
            <input
              type="text"
              value={newPermKey}
              onChange={(e) => setNewPermKey(e.target.value)}
              placeholder="clave de permiso…"
              className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs font-mono"
            />
            <button
              onClick={handleAddPerm}
              disabled={addingPerm || !newPermKey.trim()}
              className="px-2 py-1 bg-orange-500 text-white rounded text-xs disabled:opacity-50"
            >
              {addingPerm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </td>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const loadUsers = async (status = statusFilter) => {
    setLoading(true);
    try {
      const response = await api.listAdminUsers(status);
      setUsers(response.data.items || []);
    } catch (error) {
      setUsers([]);
      showToast(error instanceof Error ? error.message : 'No se pudo cargar la gestión de usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(statusFilter); }, [statusFilter]);

  const counters = useMemo(() => {
    const result = { pending: 0, active: 0, rejected: 0 };
    for (const user of users) {
      if (user.status === 'pending') result.pending += 1;
      if (user.status === 'active') result.active += 1;
      if (user.status === 'rejected') result.rejected += 1;
    }
    return result;
  }, [users]);

  const handleStatusUpdate = async (userId: string, action: 'approve' | 'reject') => {
    setActionUserId(userId);
    try {
      if (action === 'approve') {
        await api.approveUser(userId);
        showToast('Usuario aprobado correctamente', 'success');
      } else {
        await api.rejectUser(userId);
        showToast('Solicitud rechazada', 'warning');
      }
      await loadUsers(statusFilter);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo actualizar el estado del usuario', 'error');
    } finally {
      setActionUserId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setChangingRoleId(userId);
    try {
      await api.updateUserRole(userId, role);
      showToast(`Rol cambiado a ${role}`, 'success');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cambiar rol', 'error');
    } finally {
      setChangingRoleId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/admin/users" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Gestión de Usuarios</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Gestión de Usuarios</h1>
              <p className="mt-1 text-sm text-slate-500">
                Aprueba, rechaza y administra roles, scopes y permisos.
              </p>
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
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <Clock3 size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Pendientes</p>
                  <p className="text-3xl font-black text-slate-900">{counters.pending}</p>
                </div>
              </div>
            </article>
            <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <UserCheck size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Activos</p>
                  <p className="text-3xl font-black text-slate-900">{counters.active}</p>
                </div>
              </div>
            </article>
            <article className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Rechazados</p>
                  <p className="text-3xl font-black text-slate-900">{counters.rejected}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-8 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {STATUS_META.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    statusFilter === item.key ? item.tone : 'border-slate-200 text-slate-600 hover:text-orange-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2 w-6" />
                    <th className="px-4 py-2">Docente</th>
                    <th className="px-4 py-2">Rol</th>
                    <th className="px-4 py-2">Proveedor</th>
                    <th className="px-4 py-2">Creado</th>
                    <th className="px-4 py-2">Aprobado</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="rounded-2xl bg-slate-50">
                      <td colSpan={7} className="rounded-2xl px-4 py-5 text-sm text-slate-400">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr className="rounded-2xl bg-slate-50">
                      <td colSpan={7} className="rounded-2xl px-4 py-5 text-sm text-slate-500">
                        No hay usuarios para este filtro.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const busy = actionUserId === user.id;
                      const isExpanded = expandedUserId === user.id;
                      return (
                        <>
                          <tr key={user.id} className="bg-slate-50 text-sm text-slate-700">
                            <td className="rounded-l-2xl px-2 py-4">
                              <button
                                onClick={() =>
                                  setExpandedUserId(isExpanded ? null : user.id)
                                }
                                className="text-gray-400 hover:text-orange-500"
                                title="Ver detalles"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">{user.full_name}</p>
                              <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                            </td>
                            <td className="px-4 py-4">
                              {statusFilter === 'active' ? (
                                <div className="relative">
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    disabled={changingRoleId === user.id}
                                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm disabled:opacity-60 bg-white"
                                  >
                                    {ROLES.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                  {changingRoleId === user.id && (
                                    <Loader2 className="absolute right-1 top-1.5 w-3.5 h-3.5 animate-spin text-orange-500" />
                                  )}
                                </div>
                              ) : (
                                <span>{user.role}</span>
                              )}
                            </td>
                            <td className="px-4 py-4">{user.auth_provider || 'local'}</td>
                            <td className="px-4 py-4">{formatDate(user.created_at)}</td>
                            <td className="px-4 py-4">{formatDate(user.approved_at)}</td>
                            <td className="rounded-r-2xl px-4 py-4">
                              {statusFilter === 'pending' ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleStatusUpdate(user.id, 'approve')}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    <CheckCircle2 size={14} />
                                    Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(user.id, 'reject')}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    <XCircle size={14} />
                                    Rechazar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400">
                                  {statusFilter === 'active' ? 'Expandir para detalles →' : '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${user.id}-detail`} className="bg-slate-50">
                              <UserDetailPanel
                                userId={user.id}
                                onClose={() => setExpandedUserId(null)}
                              />
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
