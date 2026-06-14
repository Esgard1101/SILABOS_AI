import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  ApiError,
  clearSession,
  getStoredUser,
  getToken,
  persistSession,
  persistUser,
  TOKEN_STORAGE_KEY,
} from '../api/client';
import { AuthUser, GoogleAuthData } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<GoogleAuthData>;
  registerWithGoogle: (idToken: string, careerId: string) => Promise<GoogleAuthData>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const RETRY_DELAY_MS = 3000;
const NETWORK_ERROR_MESSAGE = 'Reintentando conexión…';

function resolveErrorMessage(err: unknown, fallback = 'Error de conexión con el servidor') {
  if (err instanceof ApiError) {
    return err.message || fallback;
  }
  if (err instanceof Error && /conexion con el servidor/i.test(err.message)) {
    return 'Error de conexión con el servidor';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

/** clearSession solo debe invocarse aquí ante 401/403 reales o logout explícito. */
function isAuthRejection(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  // Optimista: si hay token en storage asumimos sesión válida hasta que /me diga lo contrario.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(getToken()));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login({ email, password });
      persistSession(response.access_token, response.user);
      setUser(response.user);
      setIsAuthenticated(true);
      return response.user;
    } catch (err) {
      clearSession();
      setUser(null);
      setIsAuthenticated(false);
      setError(resolveErrorMessage(err, 'No se pudo iniciar sesión'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<GoogleAuthData> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.googleLogin({ id_token: idToken });
      const payload = response.data;

      if (payload.account_status === 'active' && payload.access_token && payload.user) {
        persistSession(payload.access_token, payload.user);
        setUser(payload.user);
        setIsAuthenticated(true);
      } else {
        clearSession();
        setUser(null);
        setIsAuthenticated(false);
        setError(payload.message);
      }
      return payload;
    } catch (err) {
      clearSession();
      setUser(null);
      setIsAuthenticated(false);
      setError(resolveErrorMessage(err, 'No se pudo validar el acceso con Google'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerWithGoogle = useCallback(async (idToken: string, careerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.registerGoogle({ id_token: idToken, career_id: careerId });
      if (response.data.account_status !== 'active') {
        clearSession();
        setUser(null);
        setIsAuthenticated(false);
      }
      return response.data;
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudo registrar la solicitud'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  }, []);

  // validateSession corre UNA sola vez al montar el provider (singleton). Política:
  // 401/403 -> limpieza total; red/5xx -> conservar sesión optimista + banner + 1 retry.
  useEffect(() => {
    let active = true;

    const validateSession = async (attempt = 0): Promise<void> => {
      const token = getToken();
      if (!token) {
        if (!active) return;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        if (!active) return;

        if (currentUser.status && currentUser.status !== 'active') {
          clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setError('Tu cuenta no tiene acceso activo');
          setIsLoading(false);
          return;
        }

        persistUser(currentUser);
        setUser(currentUser);
        setIsAuthenticated(true);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if (!active) return;

        if (isAuthRejection(err)) {
          clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Error de red / 5xx: NO cerrar sesión. Mantener sesión optimista,
        // mostrar banner no bloqueante y reintentar una vez en background.
        setError(NETWORK_ERROR_MESSAGE);
        setIsLoading(false);
        if (attempt < 1) {
          window.setTimeout(() => {
            if (active) validateSession(attempt + 1);
          }, RETRY_DELAY_MS);
        }
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

  // Sincronización multi-pestaña: logout/login en otra pestaña se refleja aquí.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_STORAGE_KEY) return;
      if (!event.newValue) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
        setUser(getStoredUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, error, login, loginWithGoogle, registerWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}

export { getStoredUser };
