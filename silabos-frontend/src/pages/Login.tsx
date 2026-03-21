import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // El hook ya actualiza el mensaje de error.
    }
  };

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
      <div className="absolute inset-0 bg-slate-950/45"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-orange-950/35 to-slate-950/65"></div>

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Silabos.AI</h1>
            <p className="mt-2 text-sm text-white/80">Sistema Inteligente de Sílabos — UNPRG</p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/92 p-8 shadow-2xl backdrop-blur-sm">
            <form className="space-y-5 text-left" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Correo institucional</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                  placeholder="usuario@unprg.edu.pe"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                    Ingresando...
                  </>
                ) : (
                  'Ingresar al Sistema'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
