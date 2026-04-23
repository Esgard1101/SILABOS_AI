import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCircleQuestion, faUser } from '@fortawesome/free-solid-svg-icons';
import { Building2, LucideIcon } from 'lucide-react';
import NavSidebar from './NavSidebar';
import { useAppContext } from '../hooks/useAppContext';

interface AppShellProps {
  currentPath?: string;
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  children: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
}

function QuickAccessButton({
  icon,
  label,
}: {
  icon: typeof faBell;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-white text-[var(--brand-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]"
    >
      <FontAwesomeIcon icon={icon} className="text-sm" />
    </button>
  );
}

export default function AppShell({
  currentPath,
  title,
  subtitle,
  icon: Icon = Building2,
  children,
  aside,
  actions,
}: AppShellProps) {
  const { context } = useAppContext();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-900 md:flex md:h-screen md:overflow-hidden">
      <NavSidebar currentPath={currentPath} />

      <div className="min-w-0 flex-1 md:h-screen md:overflow-hidden">
        <div className="flex min-h-screen flex-col md:h-screen">
          <header className="app-topbar-blur sticky top-0 z-50 shrink-0 border-b border-[var(--line-subtle)]">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-white shadow-sm">
                  <img src="/unprg-logo.png" alt="Logo UNPRG" className="h-9 w-auto object-contain" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-600)]">
                    UNPRG
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-950">SIGEISIL</p>
                  <p className="hidden text-xs text-[var(--text-soft)] sm:block">
                    Sistema de Gestion Inteligente de Silabos
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <QuickAccessButton icon={faCircleQuestion} label="Ayuda" />
                <QuickAccessButton icon={faBell} label="Notificaciones" />
                <QuickAccessButton icon={faUser} label="Perfil" />

                <div className="app-panel-soft hidden items-center gap-3 px-3 py-2 md:flex">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-600)]">
                      Facultad
                    </p>
                    <p className="text-sm font-semibold text-slate-900">FACHSE</p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <img src="/logo_fachse.png" alt="Logo FACHSE" className="h-9 w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <main className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden px-4 py-6 sm:px-6 xl:px-8">
              <section className="mb-5 shrink-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-white/75 px-3 py-1.5">
                      <Icon size={15} className="text-[var(--brand-600)]" />
                      <span className="app-kicker text-[0.65rem] tracking-[0.18em]">Espacio docente</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold text-slate-950 sm:text-[2rem]">{title}</h1>
                      {context ? (
                        <>
                          <span className="app-chip">{context.program_name}</span>
                          <span className="app-chip app-chip-muted">{context.semester}</span>
                        </>
                      ) : null}
                    </div>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">{subtitle}</p>
                  </div>

                  {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
                </div>
              </section>

              <div className="min-h-0 flex-1 overflow-hidden">
                {aside ? (
                  <div className="grid h-full gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 h-full overflow-y-auto pr-1">{children}</div>
                    <aside className="hidden h-full overflow-y-auto xl:block">{aside}</aside>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto pr-1">{children}</div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
