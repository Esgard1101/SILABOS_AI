import React from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';
import { SyllabusProvider, useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

const TOTAL_STEPS = 12;

const ROUTE_STEP: Record<string, number> = {
  '/creator/repositorio': 3,
  '/creator/fuentes': 4,
  '/creator/fuentes/notebook': 4,
  '/creator/fuentes/notebook/manual': 4,
  '/creator/fuentes/notebook/ia': 4,
  '/creator/desempenos': 5,
  '/creator/contenido': 6,
  '/creator/metodo': 7,
  '/creator/producto': 8,
  '/creator/mapa-conocimientos': 9,
  '/creator/evaluacion': 10,
  '/creator/programa': 11,
  '/creator/cierre': 12,
};

const STEP_LABELS: Record<number, string> = {
  3: 'Repositorio',
  4: 'Fuentes',
  5: 'Desempenos',
  6: 'Contenido',
  7: 'Metodo',
  8: 'Producto',
  9: 'Mapa',
  10: 'Evaluacion',
  11: 'Programa',
  12: 'Cierre',
};

function CreatorShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { context } = useAppContext();
  const { saving, toasts, removeToast, courseDetail } = useSyllabus();

  const currentStep = ROUTE_STEP[pathname] ?? 3;
  const courseName = courseDetail?.name ?? context?.course_name ?? 'Selecciona curso';
  const subtitle = context ? `${courseName} - ${context.semester}` : '';

  return (
    <div className="flex h-full flex-col overflow-hidden text-white">
      <div className="shrink-0 border-b border-white/10 bg-[#041A3A] px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white"
              title="Volver al panel"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00B4CC]/20">
              <BookOpen size={14} className="text-[#00B4CC]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold leading-none text-white">Nuevo silabo</p>
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

      <div className="shrink-0 border-b border-white/10 bg-[#041A3A] px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center overflow-hidden">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((n) => (
              <React.Fragment key={n}>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                    n < currentStep
                      ? 'bg-[#00B4CC] text-white'
                      : n === currentStep
                        ? 'border-2 border-[#D4A351] bg-transparent text-white'
                        : 'border border-white/20 text-white/30'
                  }`}
                >
                  {n}
                </div>
                {n < TOTAL_STEPS && <div className="h-px w-3 shrink-0 bg-white/15" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#00B4CC] transition-all"
                style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40">
              Paso {currentStep} de {TOTAL_STEPS}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default function CreatorLayout() {
  return (
    <SyllabusProvider>
      <CreatorShell />
    </SyllabusProvider>
  );
}
