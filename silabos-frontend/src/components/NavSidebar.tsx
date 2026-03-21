import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Folder,
  Library,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, useAuth } from '../hooks/useAuth';

interface NavSidebarProps {
  currentPath: string;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Base de Conocimiento', icon: Folder },
  { path: '/syllabi', label: 'Mis Silabos', icon: BookOpen },
  { path: '/analytics', label: 'Analitica', icon: BarChart3 },
  { path: '/catalog', label: 'Catalogos', icon: Library },
  { path: '/review', label: 'Revision Academica', icon: ClipboardCheck },
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

  return (
    <aside className="group hidden md:flex md:h-screen md:w-16 md:flex-col md:overflow-hidden md:border-r md:border-orange-100 md:bg-white md:shadow-sm md:transition-all md:duration-300 md:hover:w-56">
      <div className="flex h-16 items-center justify-center border-b border-orange-100 px-4 group-hover:justify-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm">
          <Folder size={18} />
        </div>
        <div className="ml-3 min-w-0 overflow-hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="whitespace-nowrap text-sm font-bold text-slate-900">Silabos.AI</p>
          <p className="whitespace-nowrap text-[11px] text-slate-500">Navegacion</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                isActive
                  ? 'bg-orange-50 text-orange-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-orange-600'
              }`}
              title={item.label}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? 'bg-orange-100' : 'bg-slate-100'
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-orange-100 p-2">
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-orange-50 px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p className="truncate text-sm font-semibold text-slate-800">{fullName}</p>
            <p className="truncate text-xs text-slate-500">{currentUser?.role || 'Usuario'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
          title="Cerrar sesion"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <LogOut size={18} />
          </span>
          <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Cerrar sesion
          </span>
        </button>
      </div>
    </aside>
  );
}
