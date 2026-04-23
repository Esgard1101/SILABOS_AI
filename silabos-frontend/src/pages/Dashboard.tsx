import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  LayoutDashboard,
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
      subtitle="Tu espacio de trabajo activo."
      icon={LayoutDashboard}
    >
      <div className="grid h-full grid-cols-12 grid-rows-2 gap-5">

        {/* Bloque 1 — Bienvenida */}
        <div className="app-panel col-span-12 flex flex-col justify-center p-5 lg:col-span-7 xl:p-6">
          <p className="app-kicker">Bienvenido de nuevo</p>
          <h2 className="mt-3 text-4xl font-bold text-slate-950 xl:text-5xl">
            {userName.split(' ').slice(0, 2).join(' ')}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--text-soft)]">
            Retoma sílabos en progreso o crea uno nuevo para el programa activo.
          </p>
        </div>

        {/* Bloque 2 — Contexto activo */}
        <div className="app-panel col-span-12 flex flex-col justify-between p-5 lg:col-span-5 xl:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-600)]">
                Contexto activo
              </p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">Programa y semestre en curso</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
              <Building2 size={18} />
            </div>
          </div>

          <div className="mt-6 space-y-1.5">
            <p className="text-xl font-bold text-slate-950 leading-7">
              {context?.program_name || 'Programa no definido'}
            </p>
            <p className="text-sm text-[var(--text-soft)]">{context?.school_name || 'Sin escuela'}</p>
            <div className="pt-1">
              <span className="app-chip app-chip-muted">{context?.semester || 'Sin semestre'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleChangeContext}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
          >
            <RefreshCcw size={16} />
            Cambiar programa
          </button>
        </div>

        {/* Bloque 3 — CTA principal */}
        <button
          type="button"
          onClick={() => navigate('/creator')}
          className="col-span-12 flex flex-col justify-between rounded-[2rem] bg-[var(--brand-700)] p-5 text-left text-white transition hover:bg-[var(--brand-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] lg:col-span-4 xl:p-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="mt-6 text-2xl font-bold leading-8">Crear nuevo sílabo</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Asistente guiado paso a paso para el programa activo.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
            Comenzar
            <ArrowRight size={16} />
          </span>
        </button>

        {/* Bloque 4 — Sílabos recientes */}
        <div className="app-panel col-span-12 flex min-h-0 flex-col p-5 lg:col-span-8 xl:p-6">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <div>
              <p className="app-kicker">Actividad reciente</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Sílabos recientes</h3>
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
            <div className="mt-5 min-h-0 flex-1 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 rounded-2xl border border-[var(--line-subtle)] bg-white p-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSyllabi.length === 0 ? (
            <div className="mt-5 flex flex-1 items-center justify-center rounded-[1.8rem] border border-dashed border-[var(--line-medium)] bg-[var(--surface-base)] px-6 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-700)]">
                  <FileText size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Sin sílabos aún</h3>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  Crea tu primer sílabo con el botón de la izquierda.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {recentSyllabi.slice(0, 4).map((item) => {
                const status = resolveSyllabusStatus(item);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate('/syllabi')}
                    className="flex w-full items-center gap-4 rounded-2xl border border-[var(--line-subtle)] bg-white p-4 text-left transition hover:border-[var(--brand-200)] hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{getCourseName(item)}</p>
                      <p className="truncate text-xs text-[var(--text-soft)]">{getCareerName(item)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={status} />
                      <span className="text-[11px] text-[var(--text-soft)]">{formatDate(item.updated_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </AppShell>
  );
}
