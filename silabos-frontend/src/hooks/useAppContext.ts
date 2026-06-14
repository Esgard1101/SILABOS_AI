// useAppContext.ts — Gestión del contexto de sesión por ciclo académico
// Almacena en localStorage con clave dinámica por semestre (`context_{semestre}`).
// Decisión SPEC-02 (aceptada por el owner): se migró de sessionStorage a localStorage
// para coherencia multi-pestaña (CA-05) — la pestaña B abre con el mismo contexto.
// Migración suave: si quedó un valor viejo en sessionStorage, se mueve una sola vez.

export interface ActiveContext {
  faculty_id: string;
  faculty_name: string;
  school_id: string;
  school_name: string;
  program_id: string;
  program_name: string;
  semester: string; // 'YYYY-I' o 'YYYY-II'
  course_id?: string;
  course_name?: string;
  course_code?: string | null;
  credits?: number | null;
  hours_theory?: number | null;
  hours_practice?: number | null;
  prerequisites?: string | null;
  start_date?: string;
  end_date?: string;
}

export function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 'I' : 'II';
  return `${year}-${half}`;
}

const STORAGE_KEY = () => `context_${getCurrentSemester()}`;

// Mueve un context_{semestre} viejo de sessionStorage a localStorage una sola vez.
function migrateLegacyContext(key: string): void {
  try {
    const legacy = sessionStorage.getItem(key);
    if (legacy && !localStorage.getItem(key)) {
      localStorage.setItem(key, legacy);
    }
    if (legacy) sessionStorage.removeItem(key);
  } catch {
    // storage bloqueado — sin migración
  }
}

export function useAppContext() {
  const getContext = (): ActiveContext | null => {
    try {
      const key = STORAGE_KEY();
      migrateLegacyContext(key);
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as ActiveContext) : null;
    } catch {
      return null;
    }
  };

  const setContext = (ctx: ActiveContext): void => {
    localStorage.setItem(STORAGE_KEY(), JSON.stringify(ctx));
  };

  const clearContext = (): void => {
    localStorage.removeItem(STORAGE_KEY());
  };

  const context = getContext();

  return {
    context,
    setContext,
    clearContext,
    isContextSet: context !== null,
  };
}
