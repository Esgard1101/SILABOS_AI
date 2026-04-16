import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, GraduationCap, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface Faculty {
  id: string;
  name: string;
  code?: string;
}

interface Career {
  id: string;
  name: string;
  code?: string;
}

type MessageTone = 'success' | 'warning' | 'error';

interface RegisterMessage {
  text: string;
  tone: MessageTone;
}

function getRegisterMessage(accountStatus: string, fallback: string): RegisterMessage {
  switch (accountStatus) {
    case 'active':
      return {
        text: 'Esta cuenta ya tiene acceso habilitado. Puedes ingresar ahora.',
        tone: 'success',
      };
    case 'pending':
      return {
        text: 'Solicitud enviada. Podrás ingresar cuando el acceso sea habilitado.',
        tone: 'warning',
      };
    case 'rejected':
      return {
        text: 'No fue posible habilitar esta cuenta. Contacta a coordinación.',
        tone: 'error',
      };
    default:
      return {
        text: fallback,
        tone: 'warning',
      };
  }
}

export default function Register() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, registerWithGoogle, user } = useAuth();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<RegisterMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(user?.role === 'admin' ? '/review' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user?.role]);

  useEffect(() => {
    setLoadingFaculties(true);
    api
      .getInstitutionalFaculties()
      .then((response) => setFaculties(response.faculties || []))
      .catch(() => setError('No se pudieron cargar las facultades'))
      .finally(() => setLoadingFaculties(false));
  }, []);

  useEffect(() => {
    if (!selectedFacultyId) {
      setCareers([]);
      setSelectedCareerId('');
      return;
    }

    setLoadingCareers(true);
    setSelectedCareerId('');
    api
      .getInstitutionalCareers(selectedFacultyId)
      .then((response) => setCareers(response.data || []))
      .catch(() => setError('No se pudieron cargar las escuelas'))
      .finally(() => setLoadingCareers(false));
  }, [selectedFacultyId]);

  const selectedFaculty = useMemo(
    () => faculties.find((faculty) => faculty.id === selectedFacultyId) || null,
    [faculties, selectedFacultyId],
  );

  const messageStyles = useMemo(() => {
    if (!message) {
      return '';
    }

    if (message.tone === 'error') {
      return 'border-red-200 bg-red-50 text-red-700';
    }

    if (message.tone === 'success') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    return 'border-amber-200 bg-amber-50 text-amber-700';
  }, [message]);

  const handleGoogleRegister = async (credential: string) => {
    if (!selectedCareerId) {
      setError('Selecciona primero tu escuela profesional');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await registerWithGoogle(credential, selectedCareerId);
      const nextMessage = getRegisterMessage(result.account_status, result.message);
      setMessage(nextMessage);

      if (result.account_status === 'active') {
        window.setTimeout(() => navigate('/login', { replace: true }), 900);
      }
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo registrar la solicitud');
    } finally {
      setSubmitting(false);
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
      <div className="absolute inset-0 bg-slate-950/62" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_34%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-white/18 bg-white/92 p-8 shadow-[0_35px_90px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-9">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800">
            <ArrowLeft size={16} />
            Volver
          </Link>

          <div className="mt-6 mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg">
              <GraduationCap size={24} />
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Solicitar acceso</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Selecciona tu facultad y tu escuela. Luego continúa con Google.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Facultad</label>
              <div className="relative">
                {loadingFaculties ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando facultades...
                  </div>
                ) : (
                  <select
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    value={selectedFacultyId}
                    onChange={(event) => {
                      setSelectedFacultyId(event.target.value);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    <option value="">Selecciona una facultad</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                )}
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Escuela profesional</label>
              <div className="relative">
                {loadingCareers ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando escuelas...
                  </div>
                ) : (
                  <select
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-400"
                    value={selectedCareerId}
                    disabled={!selectedFacultyId}
                    onChange={(event) => {
                      setSelectedCareerId(event.target.value);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    <option value="">
                      {selectedFaculty ? 'Selecciona tu escuela' : 'Primero elige una facultad'}
                    </option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </select>
                )}
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800">Continuar con Google</p>
              <GoogleSignInButton
                text="signup_with"
                onCredential={handleGoogleRegister}
                disabled={submitting || !selectedCareerId}
              />
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Usa la cuenta con la que ingresarás al sistema.
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${messageStyles}`}>
                {message.text}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-orange-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">¿Ya tienes acceso?</p>
              <p className="text-xs text-slate-500">Ingresa con tu cuenta habilitada.</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Ir al acceso
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
