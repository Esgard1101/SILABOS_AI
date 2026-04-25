import { useMemo } from 'react';
import { X, Home, PenSquare, BookOpen, Library, ClipboardCheck, BarChart3, Users, BrainCircuit, GraduationCap, LogOut, ShieldCheck } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const DOCENTE_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel Principal', icon: Home },
  { path: '/creator', label: 'Crear Sílabo', icon: PenSquare },
  { path: '/syllabi', label: 'Mis Sílabos', icon: BookOpen },
  { path: '/catalog', label: 'Catálogos', icon: Library },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Panel Principal', icon: Home },
  { path: '/creator', label: 'Crear Sílabo', icon: PenSquare },
  { path: '/syllabi', label: 'Mis Sílabos', icon: BookOpen },
  { path: '/catalog', label: 'Catálogos', icon: Library },
  { path: '/review', label: 'Revisión Académica', icon: ClipboardCheck },
  { path: '/analytics', label: 'Analítica', icon: BarChart3 },
  { path: '/admin/users', label: 'Gestión de Usuarios', icon: Users },
  { path: '/admin/sumillas', label: 'Gestión de Sumillas', icon: PenSquare },
  { path: '/admin/methods', label: 'Metodologías', icon: BrainCircuit },
  { path: '/admin/skills', label: 'Habilidades', icon: GraduationCap },
  { path: '/admin/curriculum', label: 'Currículum', icon: ClipboardCheck },
];

export default function OffcanvasSidebar({ open, onClose, isAuthenticated }: OffcanvasSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const currentUser = user || getStoredUser();

  const fullName = currentUser?.full_name || 'Usuario';
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk: string) => chunk[0]?.toUpperCase() || '')
      .join('') || 'US';

  const navItems = useMemo(
    () => (currentUser?.role === 'admin' ? ADMIN_NAV_ITEMS : DOCENTE_NAV_ITEMS),
    [currentUser?.role],
  );

  function handleNavClick(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
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

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col overflow-hidden bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#041A3A]/8 ring-1 ring-[#041A3A]/10">
                  <img src="/unprg-logo.png" alt="UNPRG" className="h-7 w-auto object-contain" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#154a96]">
                    UNPRG
                  </p>
                  <p className="text-sm font-bold text-slate-900">SIGESIL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav items */}
            <nav
              className={`flex-1 space-y-1 overflow-y-auto px-3 py-4 ${!isAuthenticated ? 'pointer-events-none opacity-50' : ''}`}
            >
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">
                Menú
              </p>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-[#041A3A] text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer: user profile + logout */}
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
                        {currentUser.role === 'admin' && <ShieldCheck size={11} />}
                        <span>{currentUser.role === 'admin' ? 'Administrador' : 'Docente'}</span>
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
                    <span className="text-sm font-semibold">Cerrar sesión</span>
                  </button>
                </>
              ) : (
                <p className="px-2 text-xs text-slate-400">Inicia sesión para acceder al menú</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
