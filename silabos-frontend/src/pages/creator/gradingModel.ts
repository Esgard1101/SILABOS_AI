// Modelo puro del sistema de evaluación (SPEC-08 8a/8b).
// Sin React: solo tipos + funciones deterministas. Única fuente de verdad para
// naming PA blindado, catálogo temporal de items, plantillas y el mapeo
// Global <-> Por Unidad. Consumido por SyllabusContext (default) y Step6_Cierre.

import type {
  EvaluationItemPreset,
  GradingRow,
  GradingUnit,
  ProgressiveProductOption,
  SuggestedPerformance,
} from '../../api/types';

// ── Catálogo temporal de items (8a) ──────────────────────────────────────────
// TODO 8c: reemplazar por API `evaluation_item_presets` (global + scope de programa).
export const ITEM_PRESETS: EvaluationItemPreset[] = [
  { id: 'preset-ep', sigla: 'EP', nombre: 'Examen Parcial', pct_sugerido: 15 },
  { id: 'preset-pc', sigla: 'PC', nombre: 'Práctica Calificada', pct_sugerido: 20 },
  { id: 'preset-ef', sigla: 'EF', nombre: 'Examen Final', pct_sugerido: 20 },
  { id: 'preset-ta', sigla: 'TA', nombre: 'Tareas', pct_sugerido: 15 },
];

// ── PA naming blindado (8a) ──────────────────────────────────────────────────
const PA_PREFIX_RE = /^\s*PA\s*\d+\s*[:.\-)]\s*/i;

export function paIndex(sigla: string): number | null {
  const m = /^PA\s*(\d+)$/i.exec(String(sigla || '').trim());
  return m ? Number(m[1]) : null;
}

export function isPaRow(row: GradingRow): boolean {
  return paIndex(row.sigla) !== null;
}

/** Etiqueta editable: la evidencia SIN el prefijo blindado 'PAn:'. */
export function paLabel(row: GradingRow): string {
  if (paIndex(row.sigla) === null) return row.evidencia;
  return String(row.evidencia || '').replace(PA_PREFIX_RE, '').trim();
}

const defaultPaLabel = (n: number) => `Producto Acreditable ${n}`;

/** Compone 'PAn: <label>' con prefijo fijo; label vacío → default estándar. */
export function composePaEvidencia(sigla: string, label: string): string {
  const n = paIndex(sigla);
  if (n === null) return label;
  const clean = String(label || '').replace(PA_PREFIX_RE, '').trim();
  return `PA${n}: ${clean || defaultPaLabel(n)}`;
}

/** Garantiza prefijo 'PAn:' en toda fila PA (normaliza legacy/timeline largo). */
export function normalizePaRows(rows: GradingRow[]): GradingRow[] {
  return rows.map((row) =>
    paIndex(row.sigla) === null
      ? row
      : { ...row, evidencia: composePaEvidencia(row.sigla, paLabel(row)) },
  );
}

// ── Semanas / timeline ───────────────────────────────────────────────────────
export function weekFromTimeline(value: string): string {
  const m = /\bSemana\s+(\d{1,2})\b/i.exec(String(value || ''));
  return m ? `Semana ${m[1]}` : '';
}

export function weekNumber(cronograma: string): number | null {
  const m = /(\d{1,2})/.exec(String(cronograma || ''));
  return m ? Number(m[1]) : null;
}

export function productTimelineEntries(
  product?: ProgressiveProductOption | null,
): [string, string][] {
  return Object.entries(product?.timeline_json || {})
    .filter(([, v]) => String(v || '').trim())
    .sort(([l], [r]) => (paIndex(l) ?? 999) - (paIndex(r) ?? 999) || l.localeCompare(r));
}

export function productTimelineCount(product?: ProgressiveProductOption | null): number {
  const entries = productTimelineEntries(product);
  const pa = entries.filter(([c]) => paIndex(c) !== null);
  return pa.length || entries.length;
}

// ── Plantilla global (única fuente) ──────────────────────────────────────────
const WEEK_PRESETS: Record<number, number[]> = {
  1: [16],
  2: [8, 16],
  3: [4, 8, 16],
  4: [4, 8, 12, 16],
};

export function buildAccreditableRows(productCount = 2): GradingRow[] {
  const count = Math.max(1, Math.min(Math.trunc(productCount || 2), 8));
  const taskPct = 15;
  const examPct = 15;
  const remaining = 100 - taskPct - examPct;
  const base = Math.floor(remaining / count);
  const weeks = WEEK_PRESETS[count];
  const rows: GradingRow[] = [
    { evidencia: 'Tareas', sigla: 'TA', porcentaje: taskPct, cronograma: 'Permanente' },
  ];
  for (let i = 0; i < count; i++) {
    const pct = i < count - 1 ? base : remaining - base * (count - 1);
    const week = weeks?.[i] ?? Math.max(1, Math.round((16 * (i + 1)) / count));
    rows.push({
      evidencia: composePaEvidencia(`PA${i + 1}`, ''),
      sigla: `PA${i + 1}`,
      porcentaje: pct,
      cronograma: `Semana ${week}`,
    });
    if (i === Math.max(0, count - 2)) {
      rows.push({ evidencia: 'Examen Parcial', sigla: 'EP', porcentaje: examPct, cronograma: 'Semana 12' });
    }
  }
  return rows;
}

/**
 * Aplica el producto seleccionado a las filas PA: SOLO toma la semana del
 * timeline; el nombre queda blindado ('PAn: <label del docente>'), nunca el
 * detalle largo del hito (decisión SPEC-08).
 */
export function applyProductTimeline(
  rows: GradingRow[],
  product: ProgressiveProductOption,
  productCount: number,
): GradingRow[] {
  const entries = productTimelineEntries(product);
  if (!entries.length) return normalizePaRows(rows);
  const paRows = rows.filter(isPaRow);
  const source = paRows.length === productCount ? rows : buildAccreditableRows(productCount);
  const byCode = new Map<number, string>();
  entries.forEach(([code, value], i) => byCode.set(paIndex(code) ?? i + 1, value));
  return source.map((row) => {
    const n = paIndex(row.sigla);
    if (!n) return row;
    const timelineValue = byCode.get(n) || entries[n - 1]?.[1] || '';
    return {
      ...row,
      evidencia: composePaEvidencia(row.sigla, paLabel(row)),
      cronograma: weekFromTimeline(timelineValue) || row.cronograma,
    };
  });
}

export function flatTotal(rows: GradingRow[]): number {
  return rows.reduce((s, r) => s + (Number(r.porcentaje) || 0), 0);
}

// ── Mapeo Global <-> Por Unidad (8b) ─────────────────────────────────────────
// Modelo: cada unidad tiene weight_pct = cuota GLOBAL en la nota final; sus rows
// internos son sub-pesos que suman 100 DENTRO de la unidad. Filas sin semana
// (TA/Permanente) son transversales con % global directo. Top-level:
//   Σ weight_pct(unidades) + Σ %(transversales) = 100.

export function unitWeekRanges(unitCount: number, totalWeeks = 16): { from: number; to: number }[] {
  const n = Math.max(1, unitCount);
  return Array.from({ length: n }, (_, i) => ({
    from: Math.floor((totalWeeks * i) / n) + 1,
    to: Math.floor((totalWeeks * (i + 1)) / n),
  }));
}

/** Reparto entero que cuadra exacto a `total` (resto al último). */
export function equalShares(n: number, total = 100): number[] {
  const c = Math.max(1, n);
  const base = Math.floor(total / c);
  const arr = Array.from({ length: c }, () => base);
  arr[c - 1] = total - base * (c - 1);
  return arr;
}

function isTransversalRow(row: GradingRow): boolean {
  if (/permanente/i.test(row.cronograma || '')) return true;
  return weekNumber(row.cronograma) === null;
}

function rescaleTo100(rows: GradingRow[]): GradingRow[] {
  if (!rows.length) return rows;
  const sum = flatTotal(rows);
  if (sum === 0) {
    const w = equalShares(rows.length, 100);
    return rows.map((r, i) => ({ ...r, porcentaje: w[i] }));
  }
  const scaled = rows.map((r) => ({
    ...r,
    porcentaje: Math.round(((Number(r.porcentaje) || 0) / sum) * 100),
  }));
  scaled[scaled.length - 1].porcentaje += 100 - flatTotal(scaled);
  return scaled;
}

export interface PerUnitModel {
  units: GradingUnit[];
  transversal: GradingRow[];
}

/** Global -> Por Unidad, best-effort y sin pérdida de la distribución global. */
export function flatToUnits(
  rows: GradingRow[],
  performances: SuggestedPerformance[],
): PerUnitModel {
  const n = Math.max(1, performances.length || 1);
  const ranges = unitWeekRanges(n);
  const transversal: GradingRow[] = [];
  const buckets: GradingRow[][] = Array.from({ length: n }, () => []);

  for (const row of rows) {
    if (isTransversalRow(row)) {
      transversal.push(row);
      continue;
    }
    const wk = weekNumber(row.cronograma) ?? 0;
    let idx = ranges.findIndex((r) => wk >= r.from && wk <= r.to);
    if (idx < 0) idx = Math.min(n - 1, Math.max(0, Math.round((wk / 16) * n) - 1));
    buckets[idx].push(row);
  }

  const transSum = flatTotal(transversal);
  const pool = Math.max(0, 100 - transSum);
  const rawWeights = buckets.map((b) => flatTotal(b));
  const totalRaw = rawWeights.reduce((s, w) => s + w, 0);
  let weights: number[];
  if (totalRaw > 0) {
    weights = rawWeights.map((w) => Math.round((w / totalRaw) * pool));
    weights[weights.length - 1] += pool - weights.reduce((s, w) => s + w, 0);
  } else {
    weights = equalShares(n, pool);
  }

  const units: GradingUnit[] = buckets.map((bucket, i) => {
    const range = ranges[i];
    const unitRows = bucket.length
      ? rescaleTo100(bucket)
      : [{
          evidencia: composePaEvidencia(`PA${i + 1}`, ''),
          sigla: `PA${i + 1}`,
          porcentaje: 100,
          cronograma: `Semana ${range.to}`,
        }];
    return {
      unit_index: i + 1,
      unit_label: performances[i]?.label?.trim() || `Unidad ${i + 1}`,
      performance_id: performances[i]?.code,
      weight_pct: weights[i],
      rows: normalizePaRows(unitRows),
    };
  });

  return { units, transversal: normalizePaRows(transversal) };
}

/** Por Unidad -> Global: expande cada row por la cuota de su unidad. */
export function unitsToFlat(units: GradingUnit[], transversal: GradingRow[]): GradingRow[] {
  const flat: GradingRow[] = [...transversal];
  for (const u of units) {
    const internalSum = flatTotal(u.rows) || 1;
    for (const r of u.rows) {
      flat.push({
        ...r,
        porcentaje: Math.round(((Number(u.weight_pct) || 0) * (Number(r.porcentaje) || 0)) / internalSum),
      });
    }
  }
  const sum = flatTotal(flat);
  if (flat.length && sum !== 100) flat[flat.length - 1].porcentaje += 100 - sum;
  return normalizePaRows(flat);
}

export function unitInternalTotal(u: GradingUnit): number {
  return flatTotal(u.rows);
}

export interface PerUnitTotals {
  transSum: number;
  unitsWeight: number;
  top: number;
  topValid: boolean;
  unitsValid: boolean;
}

export function perUnitTotals(units: GradingUnit[], transversal: GradingRow[]): PerUnitTotals {
  const transSum = flatTotal(transversal);
  const unitsWeight = units.reduce((s, u) => s + (Number(u.weight_pct) || 0), 0);
  const top = transSum + unitsWeight;
  return {
    transSum,
    unitsWeight,
    top,
    topValid: top === 100,
    unitsValid: units.every((u) => unitInternalTotal(u) === 100),
  };
}
