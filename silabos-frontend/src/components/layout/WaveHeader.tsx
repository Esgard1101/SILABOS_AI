  import { Menu } from 'lucide-react';

  interface WaveHeaderProps {
    onHamburgerClick: () => void;
  }

  export default function WaveHeader({ onHamburgerClick }: WaveHeaderProps) {
    return (
      <header className="relative h-[72px] shrink-0 overflow-hidden bg-[#041A3A]">
        {/* Content row */}
        <div className="relative z-10 flex h-full items-center justify-between px-4">
          {/* Left: hamburger + UNPRG logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onHamburgerClick}
              aria-label="Abrir menú"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="logo-mark flex h-10 w-10 items-center justify-center">
                <img src="/unprg-logo.png" alt="UNPRG" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  UNPRG
                </p>
                <p className="text-sm font-bold leading-none text-white">SIGEISIL</p>
              </div>
            </div>
          </div>

          {/* Right: FACHSE logo */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#D4A351]">
                Facultad
              </p>
              <p className="text-[11px] font-bold text-white">FACHSE</p>
            </div>
            <div className="logo-mark flex h-10 w-10 items-center justify-center">
              <img src="/logo_fachse.png" alt="FACHSE" className="h-10 w-auto object-contain" />
            </div>
          </div>
        </div>

        {/* Wave layers at bottom — gold behind, blue in front */}
        <svg
          viewBox="0 0 1440 28"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-7 w-full"
          aria-hidden="true"
        >
          <path d="M0,28 C480,-15 960,45 1440,5 L1440,28 L0,28 Z" fill="#D4A351" />
        </svg>
        <svg
          viewBox="0 0 1440 28"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-7 w-full"
          aria-hidden="true"
          style={{ zIndex: 1 }}
        >
          <path d="M0,28 C480,-8 960,52 1440,10 L1440,28 L0,28 Z" fill="#0A2753" />
        </svg>
      </header>
    );
  }
