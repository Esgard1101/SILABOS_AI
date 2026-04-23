import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
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
  return '/dashboard';
}

function resolveGoogleNotice(accountStatus: string, fallbackMessage: string): LoginNotice {
  switch (accountStatus) {
    case 'not_registered':
      return {
        text: 'Esta cuenta todavia no tiene acceso habilitado.',
        tone: 'warning',
        showRegisterCta: true,
      };
    case 'pending':
      return {
        text: 'Tu solicitud sigue en revision. Intenta nuevamente cuando sea aprobada.',
        tone: 'warning',
      };
    case 'rejected':
      return {
        text: 'No fue posible habilitar el acceso con esta cuenta. Contacta a coordinacion.',
        tone: 'error',
      };
    default:
      return {
        text: fallbackMessage,
        tone: 'neutral',
      };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      // El hook ya pinta el error principal.
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
      // El hook ya deja el error visible.
    }
  };

  const noticeStyles = useMemo(() => {
    if (!notice) {
      return '';
    }

    if (notice.tone === 'error') {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (notice.tone === 'warning') {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border-[var(--line-subtle)] bg-white text-[var(--text-soft)]';
  }, [notice]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--brand-950)]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/FONDO-LOGINV1.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(9,28,56,0.94)_0%,rgba(9,28,56,0.76)_38%,rgba(9,28,56,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(134,197,255,0.24),transparent_24%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-12 xl:px-16">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-white/16 bg-white/10 backdrop-blur-md">
              <img src="/unprg-logo.png" alt="Logo UNPRG" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-100/82">
                Sistema institucional
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">SIGEISIL UNPRG</h1>
              <p className="mt-1 text-sm text-slate-200/82">
                Sistema de Gestión Inteligente de Sílabos
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            {/* Texto dorado superior */}
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-[#d6b25e]">
              Bienvenido a
            </p>

            {/* Título principal (añadiremos la clase font-serif o tu fuente personalizada aquí) */}
            <h2 className="font-playfair max-w-2xl text-6xl leading-[1.1] text-white xl:text-7xl">
              SIGEISIL<br />UNPRG
            </h2>

            {/* Línea divisoria dorada de la imagen */}
            <div className="mt-8 h-[2px] w-32 bg-[#d6b25e]" />

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200/82">
              Plataforma académica impulsada por la Dirección de la Escuela Profesional de Educación
              para transformar la elaboracion de sílabos, fortalecer la
              coherencia curricular y elevar la calidad formativa con apoyo de
              inteligencia artificial.
            </p>
          </div>

          <div className="relative max-w-xl overflow-hidden rounded-[1.9rem] border border-[rgba(214,178,94,0.34)] bg-[linear-gradient(135deg,rgba(8,21,43,0.88),rgba(12,34,68,0.78))] px-5 py-4 text-sm leading-7 text-slate-200/82 shadow-[0_18px_40px_rgba(4,12,26,0.24)] backdrop-blur-md">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d6b25e] to-transparent" />
            <div className="absolute bottom-0 left-6 h-px w-28 bg-gradient-to-r from-[#d6b25e] to-transparent opacity-70" />
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[rgba(214,178,94,0.45)] bg-[radial-gradient(circle,rgba(214,178,94,0.24),rgba(214,178,94,0.06))] shadow-[0_0_24px_rgba(214,178,94,0.18)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(214,178,94,0.62)] bg-[rgba(214,178,94,0.12)]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#d6b25e]" />
                </div>
              </div>

              <div>
                <p className="text-[15px] font-semibold leading-6 text-white">
                  Sistema de Gestión Inteligente de sílabos - UNPRG.
                </p>
                <p className="mt-1 text-sm leading-6 text-[#8fd6ff]">
                  Innovación curricular para una docencia de calidad.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/16 bg-white/84 p-5 shadow-[0_30px_80px_rgba(9,28,56,0.28)] backdrop-blur-2xl sm:p-6 lg:max-w-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-50)]">
                  <img src="/unprg-logo.png" alt="Logo UNPRG" className="h-9 w-auto object-contain" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <img src="/logo_fachse.png" alt="Logo FACHSE" className="h-9 w-auto object-contain" />
                </div>
              </div>

              <div className="rounded-full border border-[var(--line-subtle)] bg-white/88 px-3 py-1.5 text-xs font-semibold text-[var(--brand-700)]">
                SIGEISIL
              </div>
            </div>

            <div className="mt-6 lg:hidden">
              <p className="app-kicker">Bienvenido a</p>
              <h3 className="font-playfair mt-3 text-3xl leading-tight text-slate-950">
                Bienvenido a SIGEISIL UNPRG
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--text-soft)]">
                Plataforma academica impulsada por la Direccion de la Escuela Profesional de
                Educacion para transformar la elaboracion de sílabos y fortalecer la
                coherencia curricular con apoyo de inteligencia artificial.
              </p>
            </div>

            <div className="mt-6 app-panel border border-[var(--line-subtle)] bg-white px-5 py-5 shadow-none">
              <p className="text-sm font-semibold text-slate-900">Continuar con Google</p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-soft)]">
                Ingresa con tu cuenta institucional habilitada.
              </p>
              <div className="mt-4">
                <GoogleSignInButton
                  text="signin_with"
                  onCredential={handleGoogleLogin}
                  disabled={isLoading}
                />
              </div>
            </div>

            {notice ? (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${noticeStyles}`}>
                <span>{notice.text}</span>
                {notice.showRegisterCta ? (
                  <>
                    {' '}
                    <Link to="/register" className="font-semibold text-[var(--brand-700)] hover:text-[var(--brand-800)]">
                      Solicitar acceso
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--line-subtle)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
                o
              </span>
              <div className="h-px flex-1 bg-[var(--line-subtle)]" />
            </div>

            <div className="rounded-[1.8rem] border border-[var(--line-subtle)] bg-[var(--surface-base)] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--brand-900)] p-2.5 text-white">
                  <LockKeyhole size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Acceso con credenciales</p>
                  <p className="text-xs text-[var(--text-soft)]">
                    Disponible para cuentas habilitadas por el sistema institucional.
                  </p>
                </div>
              </div>

              <form className="space-y-4 text-left" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[rgba(78,165,246,0.18)]"
                    placeholder="usuario@dominio.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[rgba(78,165,246,0.18)]"
                    placeholder="Ingresa tu Contraseña"
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-rose-600">
                    No pudimos iniciar sesion con esas credenciales.
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-700)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-800)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-[1.8rem] border border-[var(--line-subtle)] bg-[var(--brand-50)] px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">¿Aún no tienes acceso?</p>
                <p className="text-xs text-[var(--text-soft)]">
                  Sistema de Gestion Inteligente de Sílabos - UNPRG.
                </p>
              </div>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
              >
                Solicitar acceso
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
