import { AnimatePresence, motion } from 'motion/react';

interface OverlayLoaderProps {
  /** Cuando es true, cubre toda la pantalla con el preloader; al pasar a false hace fade-out. */
  show: boolean;
  /** Kicker dorado en mayusculas (ej. "Ingresando"). */
  title?: string;
  /** Linea de detalle bajo el titulo. */
  message?: string;
  /** Texto accesible para lectores de pantalla. Por defecto usa title/message. */
  ariaLabel?: string;
}

const LOGO_SRC = '/unprg-logo.png';

/**
 * Preloader global liquid glass: oculta todo el contenido mientras se carga algo,
 * con el logo UNPRG centrado dentro de un anillo spinner.
 *
 * Patron de uso: renderizar SIEMPRE (no `{show && <OverlayLoader/>}`) y controlar
 * con la prop `show`, asi el AnimatePresence interno puede animar el fade-out.
 *
 *   <OverlayLoader show={loading} title="Ingresando" message="Validando credenciales..." />
 *
 * z-[90]: por encima de GlassModal (z-50) y de los BlockingLoaders de unidad (z-[80]).
 */
export default function OverlayLoader({ show, title, message, ariaLabel }: OverlayLoaderProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="overlay-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={ariaLabel || title || 'Cargando'}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#061224]/80 px-6 text-center backdrop-blur-xl"
        >
          <div className="relative flex h-[112px] w-[112px] items-center justify-center">
            {/* Anillo spinner */}
            <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#00B4D8]/15 border-t-[#00B4D8]" />
            {/* Logo en circulo glass */}
            <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full border border-white/12 bg-white/[0.06] p-2.5 shadow-2xl shadow-cyan-950/40 ring-1 ring-inset ring-white/10 backdrop-blur-2xl">
              <img src={LOGO_SRC} alt="UNPRG" className="h-full w-full object-contain" />
            </span>
          </div>

          {title ? (
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">{title}</p>
          ) : null}
          {message ? (
            <p className="mt-2 max-w-xs text-[12px] leading-5 text-white/68">{message}</p>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
