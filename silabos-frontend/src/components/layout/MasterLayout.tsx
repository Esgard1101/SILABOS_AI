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
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const hideRightPanel = WIDE_LAYOUT_PATHS.some((path) => (
    path === '/admin' ? pathname.startsWith('/admin') : pathname === path
  ));

  return (
    <LayoutContext.Provider value={{ hasMasterLayout: true }}>
      <div className="master-layout flex h-screen w-full overflow-hidden bg-[#041A3A]">
        <OffcanvasSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isAuthenticated={isAuthenticated}
        />

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <WaveHeader onHamburgerClick={() => setSidebarOpen(true)} />
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
