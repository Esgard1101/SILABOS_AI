import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookCheck, Globe, Home, Mail, MessageCircle, Phone, Settings, User } from 'lucide-react';

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
        <div className="flex items-center gap-3.5">
          <img src="/unprg-logo.png" alt="UNPRG" className="h-14 w-auto object-contain" />
          <span className="text-[2.55rem] font-black leading-none tracking-tight text-[#0A3A6A]">
            UNPRG
          </span>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#inicio" className="relative text-base font-black text-[#0A3A6A]">
            Inicio
            <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[#0A3A6A]" />
          </a>
          <a href="#silabos" className="text-base font-bold text-[#1A1A1A] transition hover:text-[#0052CC]">
            Silabos
          </a>
          <a href="#calidad" className="text-base font-bold text-[#1A1A1A] transition hover:text-[#0052CC]">
            Calidad
          </a>
          <a href="#innovacion" className="text-base font-bold text-[#1A1A1A] transition hover:text-[#0052CC]">
            Innovacion
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="rounded-full border border-[#0A3A6A]/45 px-6 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#0A3A6A] transition hover:bg-[#0A3A6A] hover:text-white"
          >
            INGRESAR
          </Link>
          <div className="hidden items-center gap-2.5 sm:flex">
            <img src="/logo_fachse.png" alt="FACHSE" className="h-14 w-auto object-contain" />
            <div className="leading-tight text-[#0A3A6A]">
              <p className="text-xs font-bold">Facultad de Ciencias</p>
              <p className="text-xs font-bold">Historico Sociales y Educacion</p>
              <p className="text-sm font-black">(FACHSE)</p>
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
            aria-label="Configuracion"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#0A3A6A] transition hover:bg-[#E6F0FA]"
          >
            <Settings size={18} />
          </a>
        </div>
      </aside>

      <main className="absolute inset-0 z-10 flex items-center justify-center px-6 pb-14 pt-[72px] lg:px-16">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[520px] pl-10 lg:pl-16">
            <div className="absolute left-0 top-2 grid h-16 w-7 grid-cols-3 gap-1 opacity-50">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-[#0A3A6A]/40" />
              ))}
            </div>

            <h1 className="max-w-2xl text-[2.45rem] font-black leading-[1.08] tracking-[-0.015em] text-[#0A3A6A] lg:text-[2.9rem]">
              Sistema de Gestion
              <br />
              <span>Inteligente</span>{' '}
              <span className="text-[#0A3A6A]/95">de Silabos - UNPRG</span>
            </h1>

            <p className="mt-4 max-w-[26rem] text-[1.05rem] font-medium leading-8 text-[#1A1A1A]/82 lg:max-w-[27rem] xl:max-w-[29rem]">
              Plataforma academica impulsada por la Direccion de la Escuela Profesional de Educacion
              para transformar la elaboracion de silabos, fortalecer la coherencia curricular y elevar
              la calidad formativa con apoyo de inteligencia artificial.
            </p>

            <div className="fixed left-1/2 top-[66%] z-30 inline-block -translate-x-1/2 -translate-y-1/2">
              <div
                className="rounded-md bg-[#0052CC] px-6 py-3 text-lg font-black leading-snug text-white shadow-[0_14px_22px_rgba(0,82,204,0.22)]"
                style={{ transform: 'skewX(-8deg)' }}
              >
                <span style={{ display: 'inline-block', transform: 'skewX(8deg)' }}>
                  Innovacion curricular para
                  <br />
                  una docencia de calidad.
                </span>
              </div>
            </div>

            <img
              src="/landing_page/fallbackicon.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-6 w-[360px] max-w-[44vw] object-contain drop-shadow-[0_14px_18px_rgba(0,70,120,0.18)]"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <img
              src="/landing_page/hero-brain-book.png"
              alt="Ilustracion SIGEISIL"
              className="relative z-10 max-h-[44vh] w-[82%] object-contain drop-shadow-[0_22px_28px_rgba(0,70,120,0.22)]"
            />
          </div>
        </div>

        <div className="absolute bottom-[76px] right-[6.5vw] z-30 hidden min-w-[430px] items-center gap-4 rounded-l-[30px] border border-[#0A3A6A]/12 bg-white/95 px-6 py-4 shadow-[0_18px_34px_rgba(9,28,56,0.16)] backdrop-blur md:flex">
          <div className="h-14 w-1.5 rounded-full bg-[#0052CC]" />
          <div className="leading-tight">
            <p className="text-xl font-black tracking-[-0.01em] text-[#111827]">Dr. Carlos Carvas</p>
            <p className="mt-1 text-sm font-semibold text-[#0A3A6A]/78">
              Director de la Escuela Profesional de Educacion
            </p>
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between bg-white/95 px-6 text-xs text-[#1A1A1A] shadow-[0_-1px_0_rgba(0,0,0,0.05)] lg:px-12">
        <div className="flex items-center gap-6">
          <FooterLink icon={<Phone size={14} />} label="Contacto" href="#contacto" />
          <FooterLink icon={<BookCheck size={14} />} label="Silabos" href="#silabos" />
          <FooterLink icon={<Globe size={14} />} label="UNPRG" href="https://www.unprg.edu.pe" />
          <FooterLink icon={<Mail size={14} />} label="Innovacion" href="#innovacion" />
        </div>
        <div className="hidden items-center gap-2 text-[#0A3A6A] md:flex">
          <Globe size={14} />
          <span>Informacion universidad nacional pedro info@gmail.com</span>
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
    <a href={href} className="flex items-center gap-1.5 font-semibold text-[#1A1A1A] transition hover:text-[#0052CC]">
      {icon}
      {label}
    </a>
  );
}
