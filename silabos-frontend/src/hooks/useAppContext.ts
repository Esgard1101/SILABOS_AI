// useAppContext.ts — Gestión del contexto de sesión por ciclo académico
// Almacena en sessionStorage con clave dinámica por semestre
// Al cerrar la pestaña se borra automáticamente (comportamiento correcto)

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
}

export function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 'I' : 'II';
  return `${year}-${half}`;
}

const STORAGE_KEY = () => `context_${getCurrentSemester()}`;

export function useAppContext() {
  const getContext = (): ActiveContext | null => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY());
      return raw ? (JSON.parse(raw) as ActiveContext) : null;
    } catch {
      return null;
    }
  };

  const setContext = (ctx: ActiveContext): void => {
    sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(ctx));
  };

  const clearContext = (): void => {
    sessionStorage.removeItem(STORAGE_KEY());
  };

  const context = getContext();

  return {
    context,
    setContext,
    clearContext,
    isContextSet: context !== null,
  };
}
