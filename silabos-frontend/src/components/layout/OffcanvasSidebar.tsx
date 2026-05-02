import { useMemo } from 'react';
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ClipboardCheck,
  GraduationCap,
  Home,
  Library,
  LogOut,
  LucideIcon,
  PenSquare,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, useAuth } from '../../hooks/useAuth';

interface OffcanvasSidebarProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const MANAGEMENT_ROLES = new Set(['admin', 'director', 'coordinador']);

const DOCENTE_NAV_ITEMS: NavItem[] = [
  { path: '/creator', label: 'Crear Silabo', icon: PenSquare },
  { path: '/syllabi', label: 'Mis Silabos', icon: BookOpen },
  { path: '/catalog', label: 'Catalogos', icon: Library },
];

const MANAGEMENT_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel Principal', icon: Home },
  { path: '/syllabi', label: 'Silabos', icon: BookOpen },
  { path: '/catalog', label: 'Catalogos', icon: Library },
  { path: '/review', label: 'Revision Academica', icon: ClipboardCheck },
];

const ADMIN_EXTRA_NAV_ITEMS: NavItem[] = [
  { path: '/analytics', label: 'Analitica', icon: BarChart3 },
  { path: '/admin/users', label: 'Gestion de Usuarios', icon: Users },
  { path: '/admin/sumillas', label: 'Gestion de Sumillas', icon: PenSquare },
  { path: '/admin/methods', label: 'Metodologias', icon: BrainCircuit },
  { path: '/admin/skills', label: 'Habilidades', icon: GraduationCap },
  { path: '/admin/curriculum', label: 'Curriculum', icon: ClipboardCheck },
];

function getRoleLabel(role?: string) {
  if (role === 'admin') return 'Administrador';
  if (role === 'director') return 'Director';
  if (role === 'coordinador') return 'Coordinador';
  return 'Docente';
}

export default function OffcanvasSidebar({ open, onClose, isAuthenticated }: OffcanvasSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const currentUser = user || getStoredUser();
  const role = currentUser?.role;

  const fullName = currentUser?.full_name || 'Usuario';
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk: string) => chunk[0]?.toUpperCase() || '')
      .join('') || 'US';

  const navItems = useMemo(() => {
    if (role === 'admin') return [...MANAGEMENT_NAV_ITEMS, ...ADMIN_EXTRA_NAV_ITEMS];
    if (role && MANAGEMENT_ROLES.has(role)) return MANAGEMENT_NAV_ITEMS;
    return DOCENTE_NAV_ITEMS;
  }, [role]);

  function handleNavClick(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col overflow-hidden bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="logo-mark flex h-10 w-10 items-center justify-center">
                  <img src="/unprg-logo.png" alt="UNPRG" className="h-10 w-auto object-contain" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#D4A351]">
                    UNPRG
                  </p>
                  <p className="text-sm font-bold text-[#041A3A]">SIGEISIL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <nav
              className={`flex-1 space-y-1 overflow-y-auto px-3 py-4 ${!isAuthenticated ? 'pointer-events-none opacity-50' : ''}`}
            >
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">
                Menu
              </p>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/admin' && location.pathname.startsWith('/admin'));

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-[#041A3A] text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#041A3A]'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-white/15 text-[#D4A351]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">
              {isAuthenticated && currentUser ? (
                <>
                  <div className="mb-2 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#041A3A] text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        {role && MANAGEMENT_ROLES.has(role) && <ShieldCheck size={11} />}
                        <span>{getRoleLabel(role)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { logout(); onClose(); }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <LogOut size={15} />
                    </span>
                    <span className="text-sm font-semibold">Cerrar sesion</span>
                  </button>
                </>
              ) : (
                <p className="px-2 text-xs text-slate-400">Inicia sesion para acceder al menu</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
