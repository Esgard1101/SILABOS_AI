import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Clock,
  FileText,
  Home,
  LibraryBig,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SyllabusListItem } from '../api/types';
import { api } from '../api/client';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useAppContext } from '../hooks/useAppContext';
import { getCourseName, getSemesterName } from '../utils/syllabusStorage';

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  review: 'En revisión',
  approved: 'Aprobado',
  published: 'Publicado',
  archived: 'Archivado',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

function MetricCard({
  label,
  value,
  icon,
  colorClass,
  iconClass,
  valueClass,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  iconClass: string;
  valueClass: string;
}) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm bg-white ${colorClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`p-2 rounded-lg ${iconClass}`}>{icon}</div>
      </div>
      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function QuickAccessCard({
  title,
  subtitle,
  icon,
  onClick,
  color,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colorMap = {
    orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400',
    green: 'border-green-200 bg-green-50 text-green-700 hover:border-green-400',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${colorMap[color]}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { context, clearContext } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();
  const [syllabi, setSyllabi] = useState<SyllabusListItem[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);

  const currentUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('silabos_user');
      return raw ? (JSON.parse(raw) as { full_name?: string; role?: string }) : null;
    } catch {
      return null;
    }
  }, []);

  const userName = currentUser?.full_name || 'Usuario';
  const isAdmin = currentUser?.role === 'admin';
  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || '')
      .join('') || 'US';

  useEffect(() => {
    api
      .listSyllabiAll()
      .then((res) => setSyllabi(res.data?.items || []))
      .catch(() => showToast('No se pudo cargar los sílabos', 'error'))
      .finally(() => setLoadingSyllabi(false));
  }, [showToast]);

  const metrics = useMemo(() => {
    const total = syllabi.length;
    const inProgress = syllabi.filter((s) => s.status === 'draft' || s.status === 'review').length;
    const published = syllabi.filter(
      (s) => s.status === 'published' || s.status === 'approved',
    ).length;
    return { total, inProgress, published };
  }, [syllabi]);

  const recentSyllabi = useMemo(
    () =>
      [...syllabi]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    [syllabi],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans md:flex">
      <NavSidebar currentPath="/dashboard" />

      <div className="flex-1">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Home className="text-white" size={20} />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Panel Principal</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/creator')}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-700 transition-all"
                >
                  <PlusCircle size={20} />
                  <span className="hidden sm:inline">Nuevo Sílabo</span>
                </button>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-700">{userName}</span>
                  <button
                    onClick={logout}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700"
                  >
                    Cerrar sesión
                  </button>
                </div>
                <div className="bg-orange-100 rounded-full p-1 border border-orange-200">
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-xs">
                    {initials}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Banner de contexto activo */}
          {context && (
            <div className="mb-6 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">
                  Programa activo
                </p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {context.program_name}{' '}
                  <span className="text-gray-500 font-normal">— {context.semester}</span>
                </p>
                <p className="text-xs text-gray-500">{context.school_name}</p>
              </div>
              <button
                onClick={() => {
                  clearContext();
                  navigate('/select-context');
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-100 transition-colors whitespace-nowrap"
              >
                Cambiar programa
              </button>
            </div>
          )}

          {/* Métricas */}
          <section className="mb-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Total Sílabos"
                value={loadingSyllabi ? '—' : String(metrics.total)}
                icon={<FileText size={20} />}
                colorClass="border-slate-200"
                iconClass="bg-slate-100 text-slate-600"
                valueClass="text-slate-800"
              />
              <MetricCard
                label="En Progreso"
                value={loadingSyllabi ? '—' : String(metrics.inProgress)}
                icon={<Clock size={20} />}
                colorClass="border-amber-100"
                iconClass="bg-amber-50 text-amber-600"
                valueClass="text-amber-700"
              />
              <MetricCard
                label="Publicados"
                value={loadingSyllabi ? '—' : String(metrics.published)}
                icon={<Sparkles size={20} />}
                colorClass="border-green-100"
                iconClass="bg-green-50 text-green-600"
                valueClass="text-green-700"
              />
            </div>
          </section>

          {/* Accesos rápidos */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Accesos rápidos</h2>
                <p className="text-sm text-slate-500">Navegación principal del sistema.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickAccessCard
                icon={<BookOpen size={22} />}
                title="Mis Sílabos"
                subtitle="Ver y gestionar"
                onClick={() => navigate('/syllabi')}
                color="orange"
              />
              <QuickAccessCard
                icon={<LibraryBig size={22} />}
                title="Catálogos"
                subtitle="Habilidades y métodos"
                onClick={() => navigate('/catalog')}
                color="green"
              />
              {isAdmin ? (
                <QuickAccessCard
                  icon={<BarChart3 size={22} />}
                  title="Analítica"
                  subtitle="Ver estadísticas"
                  onClick={() => navigate('/analytics')}
                  color="blue"
                />
              ) : null}
              {isAdmin ? (
                <QuickAccessCard
                  icon={<ClipboardCheck size={22} />}
                  title="Revisión"
                  subtitle="Panel académico"
                  onClick={() => navigate('/review')}
                  color="purple"
                />
              ) : null}
            </div>
          </section>

          {/* Sílabos recientes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Sílabos recientes</h2>
              <button
                onClick={() => navigate('/syllabi')}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Ver todos
              </button>
            </div>

            {loadingSyllabi ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-orange-100 p-5 animate-pulse"
                  >
                    <div className="h-4 w-3/4 bg-slate-100 rounded mb-3" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded mb-6" />
                    <div className="h-5 w-20 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : recentSyllabi.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-orange-200 p-10 text-center">
                <FileText size={40} className="mx-auto text-orange-200 mb-3" />
                <p className="text-slate-500 font-medium">Aún no tienes sílabos creados</p>
                <button
                  onClick={() => navigate('/creator')}
                  className="mt-4 inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all"
                >
                  <PlusCircle size={16} />
                  Crear primer sílabo
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {recentSyllabi.map((s) => {
                  const courseName = getCourseName(s) || 'Sílabo sin nombre';
                  const status = s.status || 'draft';
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate('/syllabi')}
                      className="bg-white rounded-xl border border-orange-100 p-5 text-left hover:shadow-lg hover:border-orange-300 transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="bg-orange-50 p-2 rounded-lg shrink-0">
                          <FileText size={20} className="text-orange-600" />
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}
                        >
                          {STATUS_LABEL[status] ?? status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-2 mb-1">
                        {courseName}
                      </h4>
                      <p className="text-xs text-slate-500">{getSemesterName(s)}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Actualizado: {formatDate(s.updated_at)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}
