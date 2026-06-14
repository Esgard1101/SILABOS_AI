import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  FileText,
  LayoutDashboard,
  PlayCircle,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProgressiveDraftSummary, SyllabusListItem } from '../api/types';
import { api } from '../api/client';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import Toast, { useToast } from '../components/Toast';
import { DRAFT_STORAGE_KEY, RESUME_FLAG } from '../context/SyllabusContext';
import { ActiveContext, useAppContext } from '../hooks/useAppContext';
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

// "actualizado hace X" para la hero card (SPEC-06). Cae a fecha absoluta tras 30 días.
function formatRelativeTime(value?: string | null) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDateLabel(value);
}

const TOTAL_WIZARD_STEPS = 12;

const MANAGEMENT_ROLES = new Set(['admin', 'director', 'coordinador']);

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

// Hero "Continuar tu último sílabo" (SPEC-06). Fuente única del % y paso: el
// endpoint `latest` (CA-02). 3 estados: cargando / con borrador / vacío.
function ResumeHeroCard({
  loading,
  draft,
  allowEmptyState,
  onResume,
  onCreate,
}: {
  loading: boolean;
  draft: ProgressiveDraftSummary | null;
  allowEmptyState: boolean;
  onResume: (summary: ProgressiveDraftSummary) => void;
  onCreate: () => void;
}) {
  // Gestión sin borradores propios: no mostramos la hero (su panel es de métricas).
  if (!loading && !draft && !allowEmptyState) return null;

  if (loading) {
    return (
      <section className="col-span-12 animate-pulse rounded-[2rem] bg-[#0A2753] p-6 xl:p-7">
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="mt-4 h-8 w-2/3 rounded bg-white/10" />
        <div className="mt-3 h-3 w-1/3 rounded bg-white/10" />
        <div className="mt-5 h-2 w-full rounded-full bg-white/10" />
      </section>
    );
  }

  if (!draft) {
    // CA-01: docente sin borradores → CTA de creación, nunca card rota.
    return (
      <section className="col-span-12 flex flex-col gap-4 rounded-[2rem] border border-[#00B4CC]/25 bg-gradient-to-br from-[#072C57] to-[#041A3A] p-6 text-white sm:flex-row sm:items-center sm:justify-between xl:p-7">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6BE7C4]">
            Empieza cuando quieras
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-8">Aún no tienes un sílabo en progreso</h2>
          <p className="mt-1.5 max-w-lg text-sm leading-6 text-white/70">
            Crea uno con el asistente guiado. Tu avance se guarda solo y podrás retomarlo aquí.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#00A896] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#0A8797]"
        >
          <BookOpen size={18} />
          Crear nuevo sílabo
        </button>
      </section>
    );
  }

  const stepLabel = draft.step_label || 'En progreso';
  const stepNumber = draft.last_step ?? 1;
  const progress = Math.max(0, Math.min(100, Math.round(draft.progress_pct || 0)));
  const updated = formatRelativeTime(draft.updated_at);

  return (
    <section className="col-span-12 overflow-hidden rounded-[2rem] border border-[#00B4CC]/30 bg-gradient-to-br from-[#0A3A6B] via-[#072C57] to-[#041A3A] p-6 text-white shadow-[0_24px_60px_rgba(0,180,204,0.12)] xl:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6BE7C4]">
            Continuar tu último sílabo
          </p>
          <h2 className="app-fluid-title mt-2 truncate font-bold" title={draft.course_name}>
            {draft.course_name || 'Sílabo en progreso'}
          </h2>
          {draft.program_name ? (
            <p className="mt-1 truncate text-sm text-white/65">{draft.program_name}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-[#D4A351]/18 px-3 py-1 text-xs font-bold text-[#F2C260]">
              Paso {stepNumber} de {TOTAL_WIZARD_STEPS} — {stepLabel}
            </span>
            {updated ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                <Clock size={13} />
                actualizado {updated}
              </span>
            ) : null}
          </div>

          <div className="mt-4 max-w-xl">
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00B4CC] to-[#6BE7C4] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onResume(draft)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#00A896] px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#0A8797] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BE7C4]/50 lg:px-7"
        >
          <PlayCircle size={20} />
          Continuar
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { context, setContext, clearContext } = useAppContext();
  const { showToast, toasts, removeToast } = useToast();
  const [syllabi, setSyllabi] = useState<SyllabusListItem[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);
  const [resumeDraft, setResumeDraft] = useState<ProgressiveDraftSummary | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  const currentUser = useMemo(() => getStoredUser(), []);
  const userName = currentUser?.full_name || 'Docente';

  useEffect(() => {
    api
      .listSyllabiAll()
      .then((response) => setSyllabi(response.data?.items || []))
      .catch(() => showToast('No se pudieron cargar los silabos.', 'error'))
      .finally(() => setLoadingSyllabi(false));
  }, [showToast]);

  // Último draft en progreso (SPEC-05/06) — alimenta la ResumeHeroCard.
  // CA-05: si `latest` falla, la hero colapsa a estado vacío + toast discreto.
  useEffect(() => {
    setResumeLoading(true);
    api
      .getLatestProgressiveDraft()
      .then((response) => setResumeDraft(response.data ?? null))
      .catch(() => {
        setResumeDraft(null);
        showToast('No se pudo cargar tu sílabo en progreso.', 'warning');
      })
      .finally(() => setResumeLoading(false));
  }, [showToast]);

  // Retomar draft: reconstruye el contexto institucional desde el curso del draft,
  // fija DRAFT_KEY + sentinel de resume y navega al paso exacto. Reemplaza cualquier
  // contexto activo divergente sin merge silencioso (CA-04).
  const handleResume = async (summary: ProgressiveDraftSummary) => {
    try {
      const courseRes = await api.getCourse(summary.course_id);
      const course = courseRes.data;
      const ctx: ActiveContext = {
        faculty_id: course?.faculty_id ?? '',
        faculty_name: course?.faculty_name ?? '',
        school_id: course?.career_id ?? '',
        school_name: course?.career_name ?? '',
        program_id: summary.program_id ?? course?.program_id ?? '',
        program_name: summary.program_name || course?.program_name || '',
        semester: summary.semester,
        course_id: summary.course_id,
        course_name: summary.course_name || course?.name || '',
        course_code: course?.code ?? null,
        credits: course?.credits ?? null,
        hours_theory: course?.hours_theory ?? null,
        hours_practice: course?.hours_practice ?? null,
        prerequisites: course?.prerequisites ?? null,
        start_date: summary.fecha_inicio || undefined,
        end_date: summary.fecha_fin || undefined,
      };
      setContext(ctx);
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, summary.id);
        sessionStorage.setItem(RESUME_FLAG, summary.id);
      } catch {
        /* storage bloqueado */
      }
      navigate(summary.last_route);
    } catch {
      showToast('No se pudo retomar el sílabo', 'error');
    }
  };

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

  const handleCreateSyllabus = () => {
    if (currentUser?.role && MANAGEMENT_ROLES.has(currentUser.role)) {
      navigate('/creator');
      return;
    }

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
      <div className="dashboard-dark flex flex-col gap-5">

        {/* Hero "Continuar tu último sílabo" (SPEC-06) */}
        <ResumeHeroCard
          loading={resumeLoading}
          draft={resumeDraft}
          allowEmptyState={!(currentUser?.role && MANAGEMENT_ROLES.has(currentUser.role))}
          onResume={handleResume}
          onCreate={handleCreateSyllabus}
        />

        <div className="grid grid-cols-12 gap-5">

        {/* Bloque 1 — Bienvenida */}
        <div className="app-panel col-span-12 flex min-w-0 flex-col justify-center p-5 lg:col-span-7 xl:p-6">
          <p className="app-kicker">Bienvenido de nuevo</p>
          <h2 className="app-fluid-display mt-3 break-words font-bold text-slate-950" title={userName}>
            {userName.split(' ').slice(0, 2).join(' ')}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--text-soft)]">
            Retoma sílabos en progreso o crea uno nuevo para el programa activo.
          </p>
        </div>

        {/* Bloque 2 — Contexto activo */}
        <div className="app-panel col-span-12 flex min-w-0 flex-col justify-between gap-4 p-5 lg:col-span-5 xl:p-6">
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

          <div className="space-y-1.5">
            <p className="text-xl font-bold leading-7 text-slate-950 break-words">
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
          onClick={handleCreateSyllabus}
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
        <div className="app-panel col-span-12 flex min-w-0 flex-col p-5 lg:col-span-8 xl:p-6">
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
            <div className="mt-5 space-y-3">
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
            <div className="mt-5 flex min-h-[12rem] items-center justify-center rounded-[1.8rem] border border-dashed border-[var(--line-medium)] bg-[var(--surface-base)] px-6 text-center">
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
            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
              {recentSyllabi.slice(0, 4).map((item) => {
                const status = resolveSyllabusStatus(item);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      resumeDraft && item.id === resumeDraft.id
                        ? handleResume(resumeDraft)
                        : navigate('/syllabi')
                    }
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
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </AppShell>
  );
}
