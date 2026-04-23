import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface PushSidePanelProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  desktopWidth?: number;
}

const DESKTOP_QUERY = '(min-width: 1280px)';

function useIsDesktop() {
  const getMatch = () =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY).matches : false;

  const [isDesktop, setIsDesktop] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export default function PushSidePanel({
  open,
  title,
  eyebrow,
  description,
  children,
  onClose,
  desktopWidth = 380,
}: PushSidePanelProps) {
  const isDesktop = useIsDesktop();

  const renderPanelContent = () => (
    <section className="app-panel flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--line-subtle)] px-5 py-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="app-kicker mb-2 text-[0.65rem] tracking-[0.18em]">{eyebrow}</p>
          ) : null}
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-white text-slate-500 transition hover:border-[var(--brand-200)] hover:text-[var(--brand-700)]"
          aria-label="Cerrar panel lateral"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </section>
  );

  if (isDesktop) {
    return (
      <motion.aside
        initial={false}
        animate={{
          width: open ? desktopWidth : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        className="hidden shrink-0 overflow-hidden xl:block"
        aria-hidden={!open}
      >
        <div style={{ width: desktopWidth }} className="h-full">
          {open ? (
            <div className="h-full max-h-[calc(100vh-10.75rem)] min-h-[520px]">
              {renderPanelContent()}
            </div>
          ) : null}
        </div>
      </motion.aside>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-slate-950/34 xl:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="ml-auto h-full w-full max-w-sm p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-full">{renderPanelContent()}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
