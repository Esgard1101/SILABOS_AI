import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, User, MessageCircle, Settings, Phone, BookCheck, Globe, Mail } from 'lucide-react';

export default function Landing() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F8FAFC] text-[#1A1A1A]">
      <img
        src="/sigesillanding1.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <header className="absolute inset-x-0 top-0 z-20 flex h-[72px] items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <img src="/unprg-logo.png" alt="UNPRG" className="h-12 w-auto object-contain" />
          <span className="text-3xl font-extrabold tracking-tight text-[#0A3A6A]">UNPRG</span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#inicio" className="relative text-sm font-semibold text-[#0A3A6A]">
            Inicio
            <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[#0A3A6A]" />
          </a>
          <a href="#silabos" className="text-sm font-medium text-[#1A1A1A] hover:text-[#0052CC]">Sílabos</a>
          <a href="#calidad" className="text-sm font-medium text-[#1A1A1A] hover:text-[#0052CC]">Calidad</a>
          <a href="#innovacion" className="text-sm font-medium text-[#1A1A1A] hover:text-[#0052CC]">Innovación</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="rounded-full border border-[#0A3A6A]/40 px-5 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#0A3A6A] transition hover:bg-[#0A3A6A] hover:text-white"
          >
            INGRESAR
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <img src="/logo_fachse.png" alt="FACHSE" className="h-12 w-auto object-contain" />
            <div className="leading-tight text-[#0A3A6A]">
              <p className="text-[10px] font-semibold">Facultad de Ciencias</p>
              <p className="text-[10px] font-semibold">Histórico Sociales y Educación</p>
              <p className="text-xs font-bold">(FACHSE)</p>
            </div>
          </div>
        </div>
      </header>

      <aside className="absolute left-4 top-1/2 z-20 -translate-y-1/2">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 px-2 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
          <SideBtn label="Inicio" active>
            <Home size={18} />
          </SideBtn>
          <Link
            to="/login"
            aria-label="Ingresar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#0A3A6A] transition hover:bg-[#E6F0FA]"
          >
            <User size={18} />
          </Link>
          <a
            href="#contacto"
            aria-label="Contacto"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#0A3A6A] transition hover:bg-[#E6F0FA]"
          >
            <MessageCircle size={18} />
          </a>
          <a
            href="#config"
            aria-label="Configuración"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#0A3A6A] transition hover:bg-[#E6F0FA]"
          >
            <Settings size={18} />
          </a>
        </div>
      </aside>

      <main className="absolute inset-0 z-10 flex items-center justify-center px-6 pb-14 pt-[72px] lg:px-16">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative pl-10 lg:pl-16">
            <div className="absolute left-0 top-2 grid h-16 w-7 grid-cols-3 gap-1 opacity-50">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-[#0A3A6A]/40" />
              ))}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight text-[#0A3A6A] lg:text-3xl">
              Sistema de Gestión<br />
              <span className="text-[#0A3A6A]">Inteligente</span>{' '}
              <span className="font-bold text-[#0A3A6A]/90">de Sílabos - UNPRG</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#1A1A1A]/80">
              Plataforma académica impulsada por la Dirección de la Escuela Profesional de Educación
              para transformar la elaboración de sílabos, fortalecer la coherencia curricular y
              elevar la calidad formativa con apoyo de inteligencia artificial.
            </p>

            <div className="relative mt-5 inline-block">
              <div
                className="rounded-md bg-[#0052CC] px-4 py-2 text-sm font-bold text-white shadow-lg"
                style={{ transform: 'skewX(-8deg)' }}
              >
                <span style={{ display: 'inline-block', transform: 'skewX(8deg)' }}>
                  Innovación curricular para
                  <br />
                  una docencia de calidad.
                </span>
              </div>
            </div>

            <div className="mt-5 max-w-sm rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E6F0FA] text-base font-bold text-[#0A3A6A]">
                  CC
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]">Dr. Carlos Carvas</p>
                  <p className="text-[10px] text-[#1A1A1A]/70">
                    Director de la Escuela Profesional de Educación
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <img
              src="/landing_floating.png"
              alt="Ilustración SIGESIL"
              className="relative z-10 max-h-[55vh] w-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between bg-white/95 px-6 text-xs text-[#1A1A1A] shadow-[0_-1px_0_rgba(0,0,0,0.05)] lg:px-12">
        <div className="flex items-center gap-6">
          <FooterLink icon={<Phone size={14} />} label="Contacto" href="#contacto" />
          <FooterLink icon={<BookCheck size={14} />} label="Sílabos" href="#silabos" />
          <FooterLink icon={<Globe size={14} />} label="UNPRG" href="https://www.unprg.edu.pe" />
          <FooterLink icon={<Mail size={14} />} label="Innovación" href="#innovacion" />
        </div>
        <div className="hidden items-center gap-2 text-[#0A3A6A] md:flex">
          <Globe size={14} />
          <span>Información universidad nacional pedro info@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}

function SideBtn({ children, active, label }: { children: ReactNode; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
        active ? 'bg-[#0052CC] text-white shadow' : 'text-[#0A3A6A] hover:bg-[#E6F0FA]'
      }`}
    >
      {children}
    </button>
  );
}

function FooterLink({ icon, label, href }: { icon: ReactNode; label: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-1.5 font-medium text-[#1A1A1A] hover:text-[#0052CC]">
      {icon}
      {label}
    </a>
  );
}
