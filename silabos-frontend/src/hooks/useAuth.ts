import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, clearSession, getToken } from '../api/client';
import { AuthUser } from '../api/types';

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
      sessionStorage.setItem('silabos_token', response.access_token);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      setUser(response.user);
      setIsAuthenticated(true);
      return response.user;
    } catch (err) {
      clearSession();
      setUser(null);
      setIsAuthenticated(false);

      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciales inválidas');
      } else if (err instanceof Error && /conexion con el servidor/i.test(err.message)) {
        setError('Error de conexión con el servidor');
      } else {
        setError('Error de conexión con el servidor');
      }

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

        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (err) {
        if (!active) {
          return;
        }

        clearSession();
        setUser(null);
        setIsAuthenticated(false);

        if (!(err instanceof ApiError && err.status === 401)) {
          setError(err instanceof Error ? err.message : 'No se pudo validar la sesión');
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
    logout,
  };
}
