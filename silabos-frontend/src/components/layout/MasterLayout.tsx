import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutContext } from '../../context/LayoutContext';
import WaveHeader from './WaveHeader';
import OffcanvasSidebar from './OffcanvasSidebar';
import PersistentRightPanel from './PersistentRightPanel';

export default function MasterLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <LayoutContext.Provider value={{ hasMasterLayout: true }}>
      <div className="master-layout flex h-screen w-full overflow-hidden bg-[#041A3A]">
        <OffcanvasSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isAuthenticated={isAuthenticated}
        />

        {/* Left column: header + scrollable main */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <WaveHeader onHamburgerClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Right persistent panel */}
        <aside className="hidden w-72 max-w-[300px] shrink-0 lg:block">
          <PersistentRightPanel />
        </aside>
      </div>
    </LayoutContext.Provider>
  );
}
