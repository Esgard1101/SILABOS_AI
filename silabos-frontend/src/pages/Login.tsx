import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Brain, Eye, EyeOff, FileText, Lock, ShieldCheck, User, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../hooks/useAuth';

type NoticeTone = 'neutral' | 'warning' | 'error';

interface LoginNotice {
  text: string;
  tone: NoticeTone;
  showRegisterCta?: boolean;
}

function getPostLoginPath(role?: string) {
  return role === 'admin' || role === 'director' || role === 'coordinador'
    ? '/dashboard'
    : '/select-context';
}

function resolveGoogleNotice(accountStatus: string, fallbackMessage: string): LoginNotice {
  switch (accountStatus) {
    case 'not_registered':
      return {
        text: 'Esta cuenta todavía no tiene acceso habilitado.',
        tone: 'warning',
        showRegisterCta: true,
      };
    case 'pending':
      return {
        text: 'Tu solicitud sigue en revisión. Intenta nuevamente cuando sea aprobada.',
        tone: 'warning',
      };
    case 'rejected':
      return {
        text: 'No fue posible habilitar el acceso con esta cuenta. Contacta a coordinación.',
        tone: 'error',
      };
    default:
      return { text: fallbackMessage, tone: 'neutral' };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<LoginNotice | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(getPostLoginPath(user?.role), { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user?.role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    try {
      const loggedUser = await login(email, password);
      navigate(getPostLoginPath(loggedUser.role), { replace: true });
    } catch {
      // hook surfaces the error
    }
  };

  const handleGoogleLogin = async (credential: string) => {
    setNotice(null);
    try {
      const result = await loginWithGoogle(credential);
      if (result.account_status === 'active') {
        navigate(getPostLoginPath(result.user?.role), { replace: true });
        return;
      }
      setNotice(resolveGoogleNotice(result.account_status, result.message));
    } catch {
      // hook surfaces the error
    }
  };

  const noticeStyles = useMemo(() => {
    if (!notice) return '';
    if (notice.tone === 'error') return 'border-rose-400/40 bg-rose-500/15 text-rose-200';
    if (notice.tone === 'warning') return 'border-amber-400/40 bg-amber-500/15 text-amber-200';
    return 'border-white/20 bg-white/10 text-white/80';
  }, [notice]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background: university building image + overlays */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/FONDO-LOGINV1.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(4,26,58,0.95)_0%,rgba(4,26,58,0.78)_40%,rgba(4,26,58,0.85)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,180,204,0.12),transparent_30%)]" />

      {/* Content grid */}
      <div className="relative flex h-full items-stretch lg:grid lg:grid-cols-[1.1fr_0.9fr]">

        {/* ── Left column: branding ── */}
        <section className="relative hidden lg:flex lg:flex-col lg:justify-center lg:px-10 lg:pb-28 lg:pt-10 xl:px-14">
          {/* Hero text */}
          <div className="max-w-lg">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#D4A351]">
              Bienvenido a
            </p>
            <h2 className="font-playfair text-5xl leading-[1.08] text-white xl:text-6xl">
              SIGEISIL<br />UNPRG
            </h2>
            <div className="mt-6 h-[2px] w-24 bg-[#D4A351]" />
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
              Plataforma académica impulsada por la Dirección de la Escuela Profesional
              de Educación para transformar la elaboración de sílabos, fortalecer la
              coherencia curricular y elevar la calidad formativa con apoyo de
              inteligencia artificial.
            </p>
          </div>


        </section>

        {/* ── Right column: glass login card ── */}
        <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10 -translate-y-8 lg:-translate-y-16">          <div className="relative z-20 mb-20 lg:mb-0 w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">

          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <img
              src="/iconologin.svg"
              alt="SIGEISIL"
              className="h-16 w-16 object-contain drop-shadow-lg"
            />
          </div>

          {/* Titles */}
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white">Acceso al sistema</h2>
            <p className="mt-1 text-xs font-semibold text-[#D4A351]">
              Ingrese con su cuenta institucional
            </p>
          </div>

          {/* Email/password form */}
          <form className="space-y-3" onSubmit={handleSubmit}>
            {/* Usuario */}
            <div className="relative">
              <User
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="Usuario institucional"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-9 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#00B4CC]/60 focus:bg-white/15 focus:ring-2 focus:ring-[#00B4CC]/20"
              />
            </div>

            {/* Contraseña */}
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-9 pr-10 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#00B4CC]/60 focus:bg-white/15 focus:ring-2 focus:ring-[#00B4CC]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v: boolean) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error / notice banners */}
            {error && (
              <p className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
                No pudimos iniciar sesión con esas credenciales.
              </p>
            )}
            {notice && (
              <div className={`rounded-2xl border px-3 py-2 text-xs ${noticeStyles}`}>
                <span>{notice.text}</span>
                {notice.showRegisterCta && (
                  <>
                    {' '}
                    <Link to="/register" className="font-bold underline">
                      Solicitar acceso
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* INGRESAR button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Ingresando...' : '⟶  INGRESAR'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              o
            </span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* Google Sign-In */}
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/8">
            <GoogleSignInButton
              text="signin_with"
              onCredential={handleGoogleLogin}
              disabled={isLoading}
            />
          </div>

          {/* Help link */}
          <p className="mt-5 text-center text-xs text-white/40">
            <Link
              to="/register"
              className="font-semibold text-white/60 transition hover:text-white"
            >
              ¿Necesitas ayuda?
            </Link>
          </p>
        </div>
        </section>
      </div>

      {/* Feature footer bar — absolute at bottom of left column */}
      <div className="absolute bottom-0 left-0 w-full flex flex-wrap md:flex-nowrap justify-between items-center px-8 py-5 bg-[#041A3A]/90 border-t border-white/10 z-10 backdrop-blur-sm">        {[
        { icon: Brain, label: 'Inteligencia Artificial al servicio de la educación' },
        { icon: FileText, label: 'Sílabos coherentes y alineados al currículo' },
        { icon: ShieldCheck, label: 'Calidad académica y mejora continua' },
        { icon: Users, label: 'Innovación para una docencia de excelencia' },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon size={24} className="shrink-0 text-[#00B4CC]" />
          <span className="max-w-[110px] text-[10px] leading-[1.4] text-white/70">{label}</span>
        </div>
      ))}
      </div>

    </div>
  );
}
