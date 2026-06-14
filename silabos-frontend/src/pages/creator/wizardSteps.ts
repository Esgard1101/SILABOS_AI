import { useLocation } from 'react-router-dom';

// Fuente única de verdad de la numeración del wizard (SPEC-03).
// Cubre los 12 pasos canónicos, incluidos login (1) y selección de contexto (2)
// que viven fuera de CreatorLayout. Insertar/reordenar un paso = editar SOLO este archivo.

export const TOTAL_STEPS = 12;

export const ROUTE_STEP: Record<string, number> = {
  '/login': 1,
  '/select-context': 2,
  '/creator/repositorio': 3,
  '/creator/fuentes': 4,
  '/creator/fuentes/notebook': 4,
  '/creator/fuentes/notebook/manual': 4,
  '/creator/fuentes/notebook/ia': 4,
  '/creator/desempenos': 5,
  '/creator/contenido': 6,
  '/creator/metodo': 7,
  '/creator/producto': 8,
  '/creator/mapa-conocimientos': 9,
  '/creator/evaluacion': 10,
  '/creator/programa': 11,
  '/creator/cierre': 12,
};

export const STEP_LABELS: Record<number, string> = {
  1: 'Acceso',
  2: 'Contexto',
  3: 'Repositorio',
  4: 'Fuentes',
  5: 'Desempenos',
  6: 'Contenido',
  7: 'Metodo',
  8: 'Producto',
  9: 'Mapa',
  10: 'Evaluacion',
  11: 'Programa',
  12: 'Cierre',
};

// Paso por defecto cuando la ruta no está mapeada (primer paso del wizard creator).
const DEFAULT_STEP = ROUTE_STEP['/creator/repositorio'];

export interface WizardStepInfo {
  current: number;
  total: number;
  label: string;
}

export function getWizardStep(pathname: string): WizardStepInfo {
  const current = ROUTE_STEP[pathname] ?? DEFAULT_STEP;
  return { current, total: TOTAL_STEPS, label: STEP_LABELS[current] ?? '' };
}

export function useWizardStep(): WizardStepInfo {
  const { pathname } = useLocation();
  return getWizardStep(pathname);
}
