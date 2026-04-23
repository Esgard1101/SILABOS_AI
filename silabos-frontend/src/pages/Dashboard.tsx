import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  Clock3,
  FileText,
  LayoutDashboard,
  LibraryBig,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SyllabusListItem } from '../api/types';
import { api } from '../api/client';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import Toast, { useToast } from '../components/Toast';
import { useAppContext } from '../hooks/useAppContext';
import { getStoredUser } from '../hooks/useAuth';
import {
  formatDateLabel,
  getCareerName,
  getCourseName,
  getSemesterName,
  resolveSyllabusStatus,
} from '../utils/syllabusStorage';

function normalizeText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDate(value?: string | null) {
  return value ? formatDateLabel(value) : 'Sin fecha';
}

function MetricCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="app-metric p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{helper}</p>
    </article>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-panel group p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)] transition-colors group-hover:bg-[var(--brand-100)]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-700)]">
        Abrir
        <ArrowRight size={15} />
      </span>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { context, clearContext } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();
  const [syllabi, setSyllabi] = useState<SyllabusListItem[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);

  const currentUser = useMemo(() => getStoredUser(), []);
  const userName = currentUser?.full_name || 'Docente';

  useEffect(() => {
    api
      .listSyllabiAll()
      .then((response) => setSyllabi(response.data?.items || []))
      .catch(() => showToast('No se pudieron cargar los silabos.', 'error'))
      .finally(() => setLoadingSyllabi(false));
  }, [showToast]);

  const scopedSyllabi = useMemo(() => {
    if (!context) {
      return syllabi;
    }

    const program = normalizeText(context.program_name);
    const school = normalizeText(context.school_name);

    const matches = syllabi.filter((item) => {
      const career = normalizeText(getCareerName(item));
      return (
        (program && (career.includes(program) || program.includes(career))) ||
        (school && (career.includes(school) || school.includes(career)))
      );
    });

    return matches.length > 0 ? matches : syllabi;
  }, [context, syllabi]);

  const metrics = useMemo(() => {
    const total = scopedSyllabi.length;
    const draft = scopedSyllabi.filter((item) => {
      const status = resolveSyllabusStatus(item);
      return status === 'draft' || status === 'generated' || status === 'review';
    }).length;
    const published = scopedSyllabi.filter((item) => {
      const status = resolveSyllabusStatus(item);
      return status === 'published' || status === 'approved';
    }).length;

    return { total, draft, published };
  }, [scopedSyllabi]);

  const recentSyllabi = useMemo(
    () =>
      [...scopedSyllabi]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6),
    [scopedSyllabi],
  );

  const handleChangeContext = () => {
    clearContext();
    navigate('/select-context');
  };

  return (
    <AppShell
      currentPath="/dashboard"
      title="Panel principal"
      subtitle="Consulta tu contexto activo, revisa el avance del ciclo y entra a los modulos clave desde una vista simple y estable."
      icon={LayoutDashboard}
    >
      <div className="flex h-full flex-col gap-5">
        <section className="app-panel shrink-0 overflow-hidden">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] xl:p-6">
            <div>
              <p className="app-kicker">Bienvenido de nuevo</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                {userName.split(' ').slice(0, 2).join(' ')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                Este espacio resume tu trabajo actual y te ayuda a retomar rapidamente los silabos
                del programa activo.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--line-subtle)] bg-[var(--surface-base)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Contexto activo</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                    El dashboard y el creador usaran este contexto mientras dure tu sesion.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--brand-700)] shadow-sm">
                  <Building2 size={18} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="app-chip">{context?.program_name || 'Programa no definido'}</span>
                <span className="app-chip app-chip-muted">{context?.semester || 'Sin semestre'}</span>
                <span className="app-chip app-chip-muted">{context?.school_name || 'Sin escuela'}</span>
              </div>

              <button
                type="button"
                onClick={handleChangeContext}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
              >
                <RefreshCcw size={16} />
                Cambiar programa
              </button>
            </div>
          </div>
        </section>

        <section className="grid shrink-0 gap-4 md:grid-cols-3">
          <MetricCard
            title="Silabos del contexto"
            value={loadingSyllabi ? '...' : String(metrics.total)}
            helper="Documentos visibles en este panel segun tu programa activo."
            icon={<FileText size={20} />}
          />
          <MetricCard
            title="En trabajo"
            value={loadingSyllabi ? '...' : String(metrics.draft)}
            helper="Incluye borradores, generados y pendientes de revision."
            icon={<Clock3 size={20} />}
          />
          <MetricCard
            title="Aprobados o publicados"
            value={loadingSyllabi ? '...' : String(metrics.published)}
            helper="Versiones listas para continuar con revision final o entrega."
            icon={<BadgeCheck size={20} />}
          />
        </section>

        <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="app-panel flex min-h-0 flex-col p-5 xl:p-6">
            <div className="shrink-0">
              <p className="app-kicker">Accesos principales</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Espacios que usaras mas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                Dejamos aqui solo las rutas que realmente necesitas para avanzar sin perder tiempo.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:flex-1 xl:grid-cols-1">
              <QuickActionCard
                title="Mis silabos"
                description="Revisa documentos recientes, estados y accesos de edicion."
                icon={<BookOpen size={20} />}
                onClick={() => navigate('/syllabi')}
              />
              <QuickActionCard
                title="Catalogos"
                description="Consulta metodos, habilidades e instrumentos disponibles."
                icon={<LibraryBig size={20} />}
                onClick={() => navigate('/catalog')}
              />
              <QuickActionCard
                title="Cambiar contexto"
                description="Actualiza programa, escuela o semestre antes de trabajar otro silabo."
                icon={<RefreshCcw size={20} />}
                onClick={handleChangeContext}
              />
            </div>
          </div>

          <section className="app-panel flex min-h-0 flex-col p-5 xl:p-6">
            <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="app-kicker">Actividad reciente</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Silabos recientes</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  Retoma trabajo desde los documentos mas cercanos al contexto activo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/syllabi')}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
              >
                Ver todos
                <ArrowRight size={16} />
              </button>
            </div>

            {loadingSyllabi ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-[1.7rem] border border-[var(--line-subtle)] bg-white p-5"
                  >
                    <div className="h-4 w-32 rounded bg-slate-100" />
                    <div className="mt-4 h-6 w-4/5 rounded bg-slate-100" />
                    <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : recentSyllabi.length === 0 ? (
              <div className="mt-5 flex flex-1 items-center justify-center rounded-[1.8rem] border border-dashed border-[var(--line-medium)] bg-[var(--surface-base)] px-6 py-10 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-700)]">
                    <FileText size={26} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    Aun no tienes silabos en este panel
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-soft)]">
                    Puedes empezar desde la opcion "Crear Silabo" del menu lateral cuando el
                    contexto actual ya este confirmado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-4 lg:grid-cols-2">
                  {recentSyllabi.map((item) => {
                    const status = resolveSyllabusStatus(item);

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => navigate('/syllabi')}
                        className="rounded-[1.7rem] border border-[var(--line-subtle)] bg-white p-5 text-left shadow-[0_14px_32px_rgba(9,28,56,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--brand-200)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
                            <FileText size={20} />
                          </div>
                          <StatusBadge status={status} />
                        </div>

                        <h3 className="mt-4 text-lg font-semibold leading-7 text-slate-950">
                          {getCourseName(item)}
                        </h3>
                        <p className="mt-2 text-sm text-[var(--text-soft)]">{getCareerName(item)}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="app-chip app-chip-muted">{getSemesterName(item)}</span>
                          <span className="app-chip app-chip-muted">{formatDate(item.updated_at)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </AppShell>
  );
}
