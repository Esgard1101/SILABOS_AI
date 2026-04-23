import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ClipboardCheck,
  GraduationCap,
  Home,
  Library,
  LucideIcon,
  LogOut,
  PenSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, useAuth } from '../hooks/useAuth';

interface NavSidebarProps {
  currentPath?: string;
}

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const DOCENTE_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel Principal', icon: Home },
  { path: '/creator', label: 'Crear Silabo', icon: PenSquare },
  { path: '/syllabi', label: 'Mis Silabos', icon: BookOpen },
  { path: '/catalog', label: 'Catalogos', icon: Library },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel Principal', icon: Home },
  { path: '/creator', label: 'Crear Silabo', icon: PenSquare },
  { path: '/syllabi', label: 'Mis Silabos', icon: BookOpen },
  { path: '/catalog', label: 'Catalogos', icon: Library },
  { path: '/review', label: 'Revision Academica', icon: ClipboardCheck },
  { path: '/analytics', label: 'Analitica', icon: BarChart3 },
  { path: '/admin/users', label: 'Gestion de Usuarios', icon: Users },
  { path: '/admin/sumillas', label: 'Gestion de Sumillas', icon: PenSquare },
  { path: '/admin/methods', label: 'Metodologias', icon: BrainCircuit },
  { path: '/admin/skills', label: 'Habilidades', icon: GraduationCap },
  { path: '/admin/curriculum', label: 'Curriculum', icon: ClipboardCheck },
];

export default function NavSidebar({ currentPath }: NavSidebarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const currentUser = user || getStoredUser();
  const fullName = currentUser?.full_name || 'Usuario';
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || '')
      .join('') || 'US';

  const navItems = useMemo(
    () => (currentUser?.role === 'admin' ? ADMIN_NAV_ITEMS : DOCENTE_NAV_ITEMS),
    [currentUser?.role],
  );

  return (
    <aside className="app-sidebar-gradient hidden md:flex md:h-screen md:w-[288px] md:shrink-0 md:flex-col md:overflow-hidden md:border-r md:border-white/10 md:text-white md:shadow-[0_20px_60px_rgba(9,28,56,0.28)] md:sticky md:top-0">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <img
              src="/unprg-logo.png"
              alt="Logo UNPRG"
              className="h-11 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-100/75">
              UNPRG
            </p>
            <p className="text-lg font-semibold tracking-tight text-white">SIGEISIL</p>
            <p className="text-sm text-slate-200/82">Sistema de Gestion Inteligente de Silabos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-100/56">
          Menu
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3 text-left transition-all ${
                isActive
                  ? 'bg-white text-[var(--brand-800)] shadow-[0_12px_28px_rgba(9,28,56,0.18)]'
                  : 'text-slate-100/88 hover:bg-white/10 hover:text-white'
              }`}
              title={item.label}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? 'bg-[var(--brand-50)] text-[var(--brand-700)]' : 'bg-white/10 text-sky-100'
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/8 px-3 py-3 backdrop-blur-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--brand-800)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{fullName}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-200/78">
              {currentUser?.role === 'admin' ? <ShieldCheck size={12} /> : null}
              <span className="truncate">
                {currentUser?.role === 'admin' ? 'Administrador' : 'Docente'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-[1.2rem] border border-white/10 px-3 py-3 text-slate-100/84 transition-all hover:bg-white/10 hover:text-white"
          title="Cerrar sesion"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <LogOut size={18} />
          </span>
          <span className="whitespace-nowrap text-sm font-semibold">
            Cerrar sesion
          </span>
        </button>
      </div>
    </aside>
  );
}
