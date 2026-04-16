import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, clearSession, getToken } from '../api/client';
import { AuthUser, GoogleAuthData } from '../api/types';

const USER_STORAGE_KEY = 'silabos_user';

function readStoredUser(): AuthUser | null {
  const rawUser = sessionStorage.getItem(USER_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function persistSession(accessToken: string, user: AuthUser) {
  sessionStorage.setItem('silabos_token', accessToken);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuthState(setUser: (value: AuthUser | null) => void, setIsAuthenticated: (value: boolean) => void) {
  clearSession();
  setUser(null);
  setIsAuthenticated(false);
}

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

export function getStoredUser(): AuthUser | null {
  return readStoredUser();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser());
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
      clearAuthState(setUser, setIsAuthenticated);
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

      if (
        payload.account_status === 'active' &&
        payload.access_token &&
        payload.user
      ) {
        persistSession(payload.access_token, payload.user);
        setUser(payload.user);
        setIsAuthenticated(true);
      } else {
        clearAuthState(setUser, setIsAuthenticated);
        setError(payload.message);
      }

      return payload;
    } catch (err) {
      clearAuthState(setUser, setIsAuthenticated);
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
      const response = await api.registerGoogle({
        id_token: idToken,
        career_id: careerId,
      });
      if (response.data.account_status !== 'active') {
        clearAuthState(setUser, setIsAuthenticated);
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
    clearAuthState(setUser, setIsAuthenticated);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = getToken();
      if (!token) {
        if (!active) {
          return;
        }

        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        if (!active) {
          return;
        }

        if (currentUser.status && currentUser.status !== 'active') {
          clearAuthState(setUser, setIsAuthenticated);
          setError('Tu cuenta no tiene acceso activo');
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (err) {
        if (!active) {
          return;
        }

        clearAuthState(setUser, setIsAuthenticated);

        if (!(err instanceof ApiError && err.status === 401)) {
          setError(resolveErrorMessage(err, 'No se pudo validar la sesión'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithGoogle,
    registerWithGoogle,
    logout,
  };
}
