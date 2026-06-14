import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutContext } from '../../context/LayoutContext';
import WaveHeader from './WaveHeader';
import OffcanvasSidebar from './OffcanvasSidebar';
import PersistentRightPanel from './PersistentRightPanel';

const WIDE_LAYOUT_PATHS = [
  '/dashboard',
  '/syllabi',
  '/catalog',
  '/review',
  '/analytics',
  '/final-delivery',
  '/admin',
];

export default function MasterLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, error } = useAuth();
  const { pathname } = useLocation();
  const hideRightPanel = WIDE_LAYOUT_PATHS.some((path) => (
    path === '/admin' ? pathname.startsWith('/admin') : pathname === path
  ));
  // Banner no bloqueante: solo cuando hay sesión optimista activa y la revalidación falló
  // por red/5xx (NO en errores de login, que ocurren con isAuthenticated=false).
  const showConnectionBanner = isAuthenticated && Boolean(error);

  return (
    <LayoutContext.Provider value={{ hasMasterLayout: true }}>
      <div className="master-layout flex h-screen w-full overflow-hidden bg-[#041A3A]">
        <OffcanvasSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <WaveHeader onHamburgerClick={() => setSidebarOpen(true)} />
          {showConnectionBanner ? (
            <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
              {error}
            </div>
          ) : null}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {!hideRightPanel && (
          <aside className="hidden w-72 max-w-[300px] shrink-0 lg:block">
            <PersistentRightPanel />
          </aside>
        )}
      </div>
    </LayoutContext.Provider>
  );
}
