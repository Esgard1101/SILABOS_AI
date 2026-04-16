import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AdminUserItem } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

type StatusFilter = 'pending' | 'active' | 'rejected';

const STATUS_META: Array<{ key: StatusFilter; label: string; tone: string }> = [
  { key: 'pending', label: 'Pendientes', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'active', label: 'Activos', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'rejected', label: 'Rechazados', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
];

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

export default function AdminUsers() {
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadUsers(statusFilter);
  }, [statusFilter]);

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
              <p className="mt-1 text-sm text-slate-500">Aprueba, rechaza y monitorea el acceso docente al sistema.</p>
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
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4">Docente</th>
                    <th className="px-4">Rol</th>
                    <th className="px-4">Proveedor</th>
                    <th className="px-4">Creado</th>
                    <th className="px-4">Aprobado</th>
                    <th className="px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="rounded-2xl bg-slate-50">
                        <td colSpan={6} className="rounded-2xl px-4 py-5 text-sm text-slate-400">
                          Cargando usuarios...
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr className="rounded-2xl bg-slate-50">
                      <td colSpan={6} className="rounded-2xl px-4 py-5 text-sm text-slate-500">
                        No hay usuarios para este filtro.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const busy = actionUserId === user.id;
                      return (
                        <tr key={user.id} className="rounded-2xl bg-slate-50 text-sm text-slate-700">
                          <td className="rounded-l-2xl px-4 py-4">
                            <p className="font-semibold text-slate-900">{user.full_name}</p>
                            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                          </td>
                          <td className="px-4 py-4">{user.role}</td>
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
                              <span className="text-xs font-semibold text-slate-400">Sin acciones directas</span>
                            )}
                          </td>
                        </tr>
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
