import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import GlassModal from './ui/GlassModal';

export interface CourseOption {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  cycle?: number;
}

interface CourseSelectModalProps {
  courses: CourseOption[];
  selectedId?: string;
  programName?: string;
  loading?: boolean;
  onSelect: (course: CourseOption) => void;
  onClose: () => void;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function courseMeta(course: CourseOption, withCycle: boolean): string {
  return [
    course.code,
    course.credits != null ? `${course.credits} cr` : '',
    withCycle && course.cycle != null ? `Ciclo ${course.cycle}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function CourseSelectModal({
  courses,
  selectedId,
  programName,
  loading,
  onSelect,
  onClose,
}: CourseSelectModalProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeText(query.trim());
  const searching = normalizedQuery.length > 0;

  const filtered = useMemo(() => {
    if (!searching) return courses;
    return courses.filter((course) =>
      normalizeText(`${course.name} ${course.code ?? ''}`).includes(normalizedQuery),
    );
  }, [courses, normalizedQuery, searching]);

  // Agrupación por ciclo: ciclos numéricos ascendentes, "Otros" (sin ciclo, CA-03) al final.
  const groups = useMemo(() => {
    const map = new Map<string, CourseOption[]>();
    for (const course of filtered) {
      const key = course.cycle != null ? `Ciclo ${course.cycle}` : 'Otros';
      const bucket = map.get(key);
      if (bucket) bucket.push(course);
      else map.set(key, [course]);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Otros') return 1;
      if (b[0] === 'Otros') return -1;
      return Number(a[0].replace(/\D/g, '')) - Number(b[0].replace(/\D/g, ''));
    });
  }, [filtered]);

  const renderCard = (course: CourseOption, withCycle: boolean) => {
    const isSelected = course.id === selectedId;
    const meta = courseMeta(course, withCycle);
    return (
      <button
        key={course.id}
        type="button"
        onClick={() => onSelect(course)}
        className={[
          'flex flex-col gap-1 rounded-2xl border p-3 text-left transition',
          isSelected
            ? 'border-[#00B4D8]/60 bg-[#00B4D8]/10'
            : 'border-white/10 bg-white/[0.03] hover:border-[#00B4D8]/45 hover:bg-white/[0.06]',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-semibold leading-4 text-white">{course.name}</p>
          {isSelected ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#6FE9F5]" /> : null}
        </div>
        {meta ? <p className="text-[10px] leading-4 text-white/45">{meta}</p> : null}
      </button>
    );
  };

  return (
    <GlassModal
      onClose={onClose}
      size="xl"
      title="Seleccionar curso"
      subheader={
        <div className="border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-3 focus-within:border-[#00B4D8]/55">
            <Search size={15} className="shrink-0 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filtered.length === 1) {
                  event.preventDefault();
                  onSelect(filtered[0]);
                }
              }}
              placeholder="Buscar curso por nombre o código…"
              className="h-11 w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
            />
          </div>
        </div>
      }
      footer={
        <p className="w-full text-center text-[10px] text-white/45">
          {filtered.length} curso{filtered.length === 1 ? '' : 's'}
          {programName ? ` · ${programName}` : ''}
        </p>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-white/45">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <p className="text-[13px] font-bold text-white">Sin resultados</p>
          <p className="mt-1 text-[11px] text-white/45">
            {searching ? `No hay cursos para "${query.trim()}"` : 'No hay cursos en este programa'}
          </p>
        </div>
      ) : searching ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => renderCard(course, true))}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([label, items]) => (
            <div key={label}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                {label}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((course) => renderCard(course, false))}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassModal>
  );
}
