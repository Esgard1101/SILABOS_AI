import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type GlassModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<GlassModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

const ACCENT_BORDER: Record<'cyan' | 'amber', string> = {
  cyan: 'border-[#00B4D8]/25',
  amber: 'border-[#E9B44C]/35',
};

interface GlassModalProps {
  /** Llamado por boton X, tecla ESC y click en el overlay (salvo closeDisabled). */
  onClose: () => void;
  /** Ancho maximo: sm=md, md=2xl, lg=3xl, xl=5xl. Por defecto lg. */
  size?: GlassModalSize;
  /** Kicker dorado sobre el titulo. */
  eyebrow?: ReactNode;
  /** Titulo del modal (string o nodo para estilos custom como font-playfair). */
  title?: ReactNode;
  /** Override de clases del <h2> del titulo. */
  titleClassName?: string;
  /** Subtitulo bajo el titulo. */
  description?: ReactNode;
  /** Zona fija (shrink-0) entre header y cuerpo scrolleable. Ideal para barra de busqueda/tabs. */
  subheader?: ReactNode;
  /** Color del borde glass del panel. amber para flujos de advertencia/reprompt. */
  accent?: 'cyan' | 'amber';
  /** Acciones fijas al pie (no scrollean). */
  footer?: ReactNode;
  /** Cuerpo scrolleable del modal. */
  children: ReactNode;
  /** Bloquea cierre (X/ESC/overlay) mientras hay una operacion en curso. */
  closeDisabled?: boolean;
  /** Si false, el click en el overlay NO cierra (X y ESC siguen activos). Para flujos con progreso que no debe perderse por un click accidental. */
  overlayClose?: boolean;
  /** Oculta el boton X del header. */
  hideClose?: boolean;
  /** Clases extra para el contenedor scrolleable del cuerpo. */
  bodyClassName?: string;
}

/**
 * Modal base liquid glass con scroll interno garantizado.
 *
 * Estructura de 3 zonas: header (shrink-0) + body (min-h-0 flex-1 overflow-y-auto)
 * + footer (shrink-0). El panel nunca supera 88vh, asi que el contenido largo
 * scrollea por dentro y las acciones del footer siempre quedan visibles.
 *
 * Cierre por ESC y click en el overlay. role="dialog" + aria-modal.
 */
export default function GlassModal({
  onClose,
  size = 'lg',
  eyebrow,
  title,
  titleClassName,
  description,
  subheader,
  accent = 'cyan',
  footer,
  children,
  closeDisabled = false,
  overlayClose = true,
  hideClose = false,
  bodyClassName,
}: GlassModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, closeDisabled]);

  const hasHeader = Boolean(eyebrow || title || description) || !hideClose;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={() => {
          if (!closeDisabled && overlayClose) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          className={[
            'flex max-h-[88vh] w-full flex-col overflow-hidden rounded-3xl border bg-[#0B192C]/75 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl',
            SIZE_MAP[size],
            ACCENT_BORDER[accent],
          ].join(' ')}
        >
          {hasHeader ? (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{eyebrow}</p>
                ) : null}
                {title ? (
                  <h2 className={titleClassName ?? 'mt-1 text-base font-bold text-white'}>{title}</h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-[11px] leading-4 text-white/55">{description}</p>
                ) : null}
              </div>
              {hideClose ? null : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={closeDisabled}
                  aria-label="Cerrar"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/48 transition hover:text-white disabled:opacity-40"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ) : null}

          {subheader ? <div className="shrink-0">{subheader}</div> : null}

          <div className={['min-h-0 flex-1 overflow-y-auto p-5', bodyClassName].filter(Boolean).join(' ')}>
            {children}
          </div>

          {footer ? (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/10 p-4">{footer}</div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
