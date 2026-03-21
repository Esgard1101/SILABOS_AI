import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, BookOpen, Files, GraduationCap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AnalyticsByStatus, AnalyticsDashboard } from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

const EMPTY_ANALYTICS: AnalyticsDashboard = {
  overview: {
    total_syllabi: 0,
    total_documents: 0,
    total_users: 0,
    completion_rate: 0,
  },
  by_status: [],
  programs: [],
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBars({ items }: { items: AnalyticsByStatus[] }) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  if (!items.length) {
    return <p className="text-sm text-slate-500">Aún no hay datos por estado.</p>;
  }

  return (
    <svg viewBox={`0 0 640 ${items.length * 60}`} className="w-full">
      {items.map((item, index) => {
        const y = index * 60;
        const width = (item.count / maxValue) * 320;

        return (
          <g key={item.key} transform={`translate(0 ${y})`}>
            <text x="0" y="24" className="fill-slate-700 text-[13px] font-semibold">
              {item.status}
            </text>
            <rect x="180" y="8" width="360" height="20" rx="10" fill="#e2e8f0" />
            <rect x="180" y="8" width={width} height="20" rx="10" fill={item.color} />
            <text x="560" y="24" className="fill-slate-500 text-[13px] font-bold">
              {item.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const { showToast, toasts, removeToast } = useToast();

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const response = await api.getAnalytics();
        setDashboard(response || EMPTY_ANALYTICS);
      } catch {
        setDashboard(EMPTY_ANALYTICS);
        showToast('No se pudo cargar la analítica. Se muestran valores en cero.', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [showToast]);

  const programRows = useMemo(() => {
    return dashboard.programs.map((program) => {
      const total = program.syllabi || 0;
      const ratio = total > 0 ? Math.round((program.completados / total) * 100) : 0;

      return {
        ...program,
        ratio,
      };
    });
  }, [dashboard.programs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/analytics" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Analítica</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Analítica del Sistema</h1>
              <p className="mt-1 text-sm text-slate-500">Indicadores clave del ciclo de producción de sílabos.</p>
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
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-3xl border border-orange-100 bg-white"></div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Sílabos"
                  value={dashboard.overview.total_syllabi}
                  subtitle="Sílabos generados en el sistema"
                  icon={<BookOpen size={22} />}
                />
                <MetricCard
                  title="Total Documentos"
                  value={dashboard.overview.total_documents}
                  subtitle="Documentos cargados en la base"
                  icon={<Files size={22} />}
                />
                <MetricCard
                  title="Total Docentes"
                  value={dashboard.overview.total_users}
                  subtitle="Usuarios con acceso al sistema"
                  icon={<Users size={22} />}
                />
                <MetricCard
                  title="Tasa Completado"
                  value={`${dashboard.overview.completion_rate}%`}
                  subtitle="Sílabos publicados sobre el total"
                  icon={<GraduationCap size={22} />}
                />
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <BarChart3 size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Sílabos por estado</h2>
                      <p className="text-sm text-slate-500">Distribución actual del workflow académico.</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <StatusBars items={dashboard.by_status} />
                  </div>
                </section>

                <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Progreso general</h2>
                  <p className="mt-1 text-sm text-slate-500">Avance publicado frente al total generado.</p>
                  <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-end justify-between">
                      <span className="text-sm font-semibold text-slate-500">Completado</span>
                      <span className="text-3xl font-black text-orange-600">
                        {dashboard.overview.completion_rate}%
                      </span>
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                        style={{ width: `${dashboard.overview.completion_rate}%` }}
                      ></div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-8 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Sílabos por programa</h2>
                <p className="mt-1 text-sm text-slate-500">Panorama por escuela o programa académico.</p>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="px-4">Programa</th>
                        <th className="px-4">Sílabos generados</th>
                        <th className="px-4">Completados</th>
                        <th className="px-4">% Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programRows.map((row) => (
                        <tr key={row.programa} className="rounded-2xl bg-slate-50 text-sm text-slate-700">
                          <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">{row.programa}</td>
                          <td className="px-4 py-4">{row.syllabi}</td>
                          <td className="px-4 py-4">{row.completados}</td>
                          <td className="rounded-r-2xl px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-orange-500"
                                  style={{ width: `${row.ratio}%` }}
                                ></div>
                              </div>
                              <span className="w-12 text-right text-xs font-bold text-slate-600">{row.ratio}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
