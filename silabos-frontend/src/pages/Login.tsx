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
  return role === 'admin' ? '/review' : '/dashboard';
}

function resolveGoogleNotice(accountStatus: string, fallbackMessage: string): LoginNotice {
  switch (accountStatus) {
    case 'not_registered':
      return {
        text: 'Esta cuenta aún no tiene acceso habilitado.',
        tone: 'warning',
        showRegisterCta: true,
      };
    case 'pending':
      return {
        text: 'Tu solicitud está en revisión. Intenta nuevamente cuando sea aprobada.',
        tone: 'warning',
      };
    case 'rejected':
      return {
        text: 'No fue posible habilitar el acceso con esta cuenta. Contacta a coordinación.',
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
      // El hook gestiona el error visible.
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
      return 'border-red-200 bg-red-50 text-red-700';
    }

    if (notice.tone === 'warning') {
      return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border-slate-200 bg-slate-50 text-slate-600';
  }, [notice]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "url('/FONDO-LOGINV1.png')",
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-slate-950/62" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_34%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-white/18 bg-white/92 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-9">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-orange-500">Silabos.AI</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Bienvenido</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Ingresa con tu cuenta Google para continuar.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-slate-800">Continuar con Google</p>
            <GoogleSignInButton text="signin_with" onCredential={handleGoogleLogin} disabled={isLoading} />
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Usa la misma cuenta con la que trabajarás en NotebookLM.
            </p>
          </div>

          {notice ? (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${noticeStyles}`}>
              <span>{notice.text}</span>
              {notice.showRegisterCta ? (
                <>
                  {' '}
                  <Link to="/register" className="font-semibold text-orange-700 hover:text-orange-800">
                    Solicitar acceso
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">o</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-slate-50/90 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
                <LockKeyhole size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Acceso con credenciales</p>
                <p className="text-xs text-slate-500">Disponible para cuentas ya habilitadas.</p>
              </div>
            </div>

            <form className="space-y-4 text-left" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600">
                  No pudimos iniciar sesión con esas credenciales.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-orange-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">¿Aún no tienes acceso?</p>
              <p className="text-xs text-slate-500">Solicita habilitación con tu cuenta Google.</p>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Solicitar acceso
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
