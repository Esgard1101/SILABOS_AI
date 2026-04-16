import { SyllabusStatus } from '../api/types';

const STATUS_CONFIG: Record<
  SyllabusStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: 'Borrador',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  generated: {
    label: 'Generado',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  exported: {
    label: 'Exportado',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  review: {
    label: 'En revision',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500 animate-pulse',
  },
  returned: {
    label: 'Observado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  approved: {
    label: 'Aprobado',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  published: {
    label: 'Publicado',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
};

interface StatusBadgeProps {
  status: SyllabusStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} ${className}`.trim()}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
}
