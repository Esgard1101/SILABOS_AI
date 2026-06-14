import { Home, MessageSquare, Monitor, User, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPanelMessage } from '../../data/panelMessages';

export default function PersistentRightPanel() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const msg = getPanelMessage(pathname);
  // Solo dentro del asistente: aquí hay un draft en progreso que ya se autoguarda.
  const enCreador = pathname.startsWith('/creator');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F8F9FA]">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00B4CC]">
            <Monitor size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D4A351]">
              {msg.paso || 'SIGEISIL'}
            </p>
            <h3 className="mt-0.5 text-[11px] font-bold leading-tight text-slate-900">
              {msg.titulo}
            </h3>
            {msg.pantalla > 0 ? (
              <span className="mt-1 inline-block rounded-full bg-[#041A3A] px-2 py-0.5 text-[9px] font-bold text-white">
                Pantalla {msg.pantalla}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A2753]">
            <MessageSquare size={16} className="text-[#00B4CC]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#041A3A]">Mensaje principal</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-slate-600">
              {msg.mensajePrincipal}
            </p>
          </div>
        </div>

        {msg.mensajeAcompanamiento ? (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4A351]/15">
              <Users size={16} className="text-[#D4A351]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#041A3A]">Acompanamiento</p>
              <p className="mt-1 whitespace-pre-line text-[10px] italic leading-relaxed text-slate-600">
                {msg.mensajeAcompanamiento}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A2753]">
            <User size={16} className="text-[#00B4CC]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#041A3A]">Que debe hacer?</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-slate-600">
              {msg.instruccion}
            </p>
          </div>
        </div>
      </div>

      {/* Zona de acciones fija (pie). Stack vertical → escalable para mas botones. */}
      {enCreador ? (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00B4CC] px-4 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#0A8797] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4CC]/40"
            >
              <Home size={17} className="shrink-0" />
              Guardar y salir al inicio
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500">
            Tu avance queda guardado. Puedes continuar mas tarde con
            <span className="font-semibold text-[#0A8797]"> Continuar ultimo silabo</span>.
          </p>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/unprg-logo.png" alt="UNPRG" className="h-5 w-auto object-contain opacity-50" />
          <p className="text-[10px] font-semibold text-slate-400">SIGEISIL UNPRG</p>
        </div>
      </div>
    </div>
  );
}
