import React from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import { SyllabusProvider, useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

// ─── Route → step number ─────────────────────────────────────────────────────

const ROUTE_STEP: Record<string, number> = {
  '/creator/repositorio': 3,
  '/creator/fuentes': 4,
  '/creator/fuentes/notebook': 4,
  '/creator/desempenos': 5,
  '/creator/contenido': 6,
  '/creator/metodo': 7,
  '/creator/evaluacion': 8,
  '/creator/cierre': 8,
};

const STEP_LABELS: Record<number, string> = {
  3: 'Repositorio',
  4: 'Fuentes',
  5: 'Desempeños',
  6: 'Contenido',
  7: 'Método',
  8: 'Evaluación',
};

// ─── Inner shell (reads from context) ────────────────────────────────────────

function CreatorShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { context } = useAppContext();
  const { saving, toasts, removeToast, courseDetail } = useSyllabus();

  const currentStep = ROUTE_STEP[pathname] ?? 3;

  const courseName = courseDetail?.name ?? context?.course_name ?? 'Selecciona curso';
  const subtitle = context ? `${courseName} — ${context.semester}` : '';

  return (
    <div className="flex h-full flex-col overflow-hidden text-white">
      {/* ── Dark header ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/10 bg-[#041A3A] px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00B4CC]/20">
              <BookOpen size={14} className="text-[#00B4CC]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold leading-none text-white">Nuevo Sílabo</p>
              <p className="mt-0.5 truncate text-[10px] leading-none text-white/50">{subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saving && (
              <div className="flex items-center gap-1 text-[10px] text-white/40">
                <Loader2 size={10} className="animate-spin" />
                <span>Guardando...</span>
              </div>
            )}
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4A351]">
              {STEP_LABELS[currentStep] ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/10 bg-[#041A3A] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <React.Fragment key={n}>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                    n < currentStep
                      ? 'bg-[#00B4CC] text-white'
                      : n === currentStep
                        ? 'border-2 border-[#D4A351] bg-transparent text-white'
                        : 'border border-white/20 text-white/30'
                  }`}
                >
                  {n}
                </div>
                {n < 8 && <div className="h-px w-3 bg-white/15" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#00B4CC] transition-all"
                style={{ width: `${((currentStep - 1) / 7) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40">
              Paso {currentStep} de 8
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// ─── Export (wraps with provider) ────────────────────────────────────────────

export default function CreatorLayout() {
  return (
    <SyllabusProvider>
      <CreatorShell />
    </SyllabusProvider>
  );
}
