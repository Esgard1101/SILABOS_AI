import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../api/client';
import { getCurrentSemester, useAppContext } from '../hooks/useAppContext';

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

interface Program {
  id: string;
  name: string;
  coordinator?: string;
}

interface Course {
  id: string;
  name: string;
  code?: string;
  credits?: number;
  cycle?: number;
  hours_theory?: number | null;
  hours_practice?: number | null;
  prerequisites?: string | null;
}

function formatPrerequisite(value?: string | null) {
  const clean = (value || '').trim();
  if (!clean || /^no\s+registrado$/i.test(clean) || /^ninguno$/i.test(clean) || /^sin\s+prerrequisito/i.test(clean)) {
    return 'No aplica';
  }
  return clean;
}

async function fetchFaculties(): Promise<Faculty[]> {
  const res = await fetch(`${BASE_URL}/api/institutional/faculties`);
  const json = await res.json();
  return (json.faculties as Faculty[]) || [];
}

async function fetchCareers(facultyId: string): Promise<Career[]> {
  const res = await fetch(
    `${BASE_URL}/api/institutional/careers?faculty_id=${encodeURIComponent(facultyId)}`,
  );
  const json = await res.json();
  return (json.data as Career[]) || [];
}

async function fetchPrograms(careerId: string): Promise<Program[]> {
  const res = await fetch(`${BASE_URL}/api/programs?career_id=${encodeURIComponent(careerId)}`);
  const json = await res.json();
  return (json.data as Program[]) || [];
}

async function fetchCourses(programId: string): Promise<Course[]> {
  const res = await fetch(`${BASE_URL}/api/courses?program_id=${encodeURIComponent(programId)}`);
  const json = await res.json();
  return (json.data as Course[]) || [];
}

async function fetchCourse(courseId: string): Promise<Course | null> {
  const res = await fetch(`${BASE_URL}/api/courses/${encodeURIComponent(courseId)}`);
  const json = await res.json();
  return (json.data as Course) || null;
}

const SELECT_CLS =
  'h-9 w-full appearance-none rounded border border-white/20 bg-[#041A3A] px-3 text-[11px] text-white outline-none transition focus:border-[#00B4CC]/60 focus:ring-1 focus:ring-[#00B4CC]/20 disabled:cursor-not-allowed disabled:opacity-40';

const HEADER_GLOW_GRADIENT =
  'linear-gradient(194deg, rgba(98, 147, 196, 0.82) 0%, rgba(1, 32, 63, 0.72) 35%, rgba(1, 32, 63, 0) 62%)';

const LOADING_FIELD = (
  <div className="flex h-9 items-center gap-1.5 rounded border border-white/10 bg-[#041A3A] px-3 text-[11px] text-white/40">
    <Loader2 size={11} className="animate-spin" /> Cargando...
  </div>
);

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nearestMonday(from = new Date()) {
  const date = new Date(from);
  const day = date.getDay();
  const diff = day === 1 ? 0 : (8 - day) % 7;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

function addWeeks(value: string, weeks = 16) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + weeks * 7);
  return toISODate(date);
}

export default function ContextSelector() {
  const navigate = useNavigate();
  const { setContext, isContextSet } = useAppContext();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [semester, setSemester] = useState(getCurrentSemester());
  const [startDate, setStartDate] = useState(nearestMonday());
  const endDate = addWeeks(startDate);

  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isContextSet) {
      navigate('/creator', { replace: true });
    }
  }, [isContextSet, navigate]);

  useEffect(() => {
    setLoadingFaculties(true);
    fetchFaculties()
      .then(setFaculties)
      .catch(() => setError('No se pudieron cargar las facultades.'))
      .finally(() => setLoadingFaculties(false));
  }, []);

  useEffect(() => {
    if (!selectedFaculty) return;
    setLoadingCareers(true);
    setCareers([]);
    setSelectedCareer(null);
    setPrograms([]);
    setSelectedProgram(null);
    fetchCareers(selectedFaculty.id)
      .then(setCareers)
      .catch(() => setError('No se pudieron cargar las escuelas profesionales.'))
      .finally(() => setLoadingCareers(false));
  }, [selectedFaculty]);

  useEffect(() => {
    if (!selectedCareer) return;
    setLoadingPrograms(true);
    setPrograms([]);
    setSelectedProgram(null);
    setCourses([]);
    setSelectedCourse(null);
    fetchPrograms(selectedCareer.id)
      .then(setPrograms)
      .catch(() => setError('No se pudieron cargar los programas.'))
      .finally(() => setLoadingPrograms(false));
  }, [selectedCareer]);

  useEffect(() => {
    if (!selectedProgram) return;
    setLoadingCourses(true);
    setCourses([]);
    setSelectedCourse(null);
    fetchCourses(selectedProgram.id)
      .then(setCourses)
      .catch(() => setError('No se pudieron cargar los cursos.'))
      .finally(() => setLoadingCourses(false));
  }, [selectedProgram]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFaculty || !selectedCareer || !selectedProgram || !selectedCourse) return;
    setSubmitting(true);
    setContext({
      faculty_id: selectedFaculty.id,
      faculty_name: selectedFaculty.name,
      school_id: selectedCareer.id,
      school_name: selectedCareer.name,
      program_id: selectedProgram.id,
      program_name: selectedProgram.name,
      semester,
      course_id: selectedCourse.id,
      course_name: selectedCourse.name,
      course_code: selectedCourse.code ?? null,
      credits: selectedCourse.credits ?? null,
      hours_theory: selectedCourse.hours_theory ?? null,
      hours_practice: selectedCourse.hours_practice ?? null,
      prerequisites: selectedCourse.prerequisites ?? null,
      start_date: startDate,
      end_date: endDate,
    });
    navigate('/creator', { replace: true });
  };

  const handleClear = () => {
    setSelectedFaculty(null);
    setSelectedCareer(null);
    setSelectedProgram(null);
    setCourses([]);
    setSelectedCourse(null);
    setSemester(getCurrentSemester());
    setStartDate(nearestMonday());
    setError(null);
  };

  const canSubmit =
    selectedFaculty !== null &&
    selectedCareer !== null &&
    selectedProgram !== null &&
    selectedCourse !== null &&
    semester.trim().length > 0 &&
    startDate.trim().length > 0 &&
    !submitting;

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mb-8">
          <div
            className="pointer-events-none absolute right-0 top-[-3.25rem] hidden h-[260px] w-[560px] rounded-full opacity-80 blur-[55px] md:block"
            style={{ background: HEADER_GLOW_GRADIENT }}
          />
          <div className="pointer-events-none absolute right-[8.5rem] top-[4.85rem] hidden h-[110px] w-[340px] rounded-full bg-[#6293C4]/18 blur-[42px] md:block" />

          <div className="relative flex w-full flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
              BIENVENIDO A SIGEISIL UNPRG
            </p>
            <h1 className="font-playfair text-3xl font-bold text-white">
              Contexto institucional y curso
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              Seleccione el contexto académico desde el cual elaborará su sílabo.
              El sistema organizará la información según la estructura institucional.
            </p>
          </div>

          <div className="flex w-full items-start justify-end gap-4 lg:w-auto lg:items-center lg:gap-8">
            <div className="flex w-full max-w-[340px] flex-col items-end lg:mr-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <React.Fragment key={n}>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition ${
                        n === 2
                          ? 'border-2 border-[#D4A351] bg-transparent text-white'
                          : n < 2
                            ? 'bg-[#00B4CC] text-white'
                            : 'border border-white/25 text-white/40'
                      }`}
                    >
                      {n}
                    </div>
                    {n < 8 && <div className="h-px w-4 bg-white/20" />}
                  </React.Fragment>
                ))}
              </div>

              <span className="mt-4 self-center text-sm font-medium text-white/80">
                Paso 2 de 8
              </span>

              <div className="mt-4 flex w-full items-center justify-between gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-1/4 rounded-full bg-[#00B4CC]" />
                </div>
                <span className="shrink-0 text-[10px] text-white/60">25% completado</span>
              </div>
            </div>

            <div className="hidden shrink-0 items-end justify-end md:flex md:w-[175px] lg:w-[195px]">
              <img
                src="/iconoParaContextselector.svg"
                alt="Universidad"
                className="h-auto w-full max-w-[210px] object-contain drop-shadow-xl"
              />
            </div>
          </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-white/10 bg-[#0A2753] p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              <Landmark size={15} className="shrink-0 text-[#00B4CC]" />
              <span className="text-sm font-semibold text-white">
                Seleccione su contexto académico
              </span>
            </div>

            {error && (
              <p className="mb-4 rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  1. Universidad
                </label>
                <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/50">
                  Univ. Nacional Pedro Ruiz Gallo
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  2. Facultad
                </label>
                {loadingFaculties ? (
                  LOADING_FIELD
                ) : (
                  <select
                    className={SELECT_CLS}
                    value={selectedFaculty?.id || ''}
                    onChange={(e) => {
                      const faculty = faculties.find((item) => item.id === e.target.value) || null;
                      setSelectedFaculty(faculty);
                    }}
                  >
                    <option value="">Seleccione...</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  3. Escuela Profesional
                </label>
                {loadingCareers ? (
                  LOADING_FIELD
                ) : (
                  <select
                    className={SELECT_CLS}
                    value={selectedCareer?.id || ''}
                    disabled={!selectedFaculty}
                    onChange={(e) => {
                      const career = careers.find((item) => item.id === e.target.value) || null;
                      setSelectedCareer(career);
                    }}
                  >
                    <option value="">
                      {selectedFaculty ? 'Seleccione...' : 'Primero elige facultad'}
                    </option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  4. Programa
                </label>
                {loadingPrograms ? (
                  LOADING_FIELD
                ) : (
                  <select
                    className={SELECT_CLS}
                    value={selectedProgram?.id || ''}
                    disabled={!selectedCareer}
                    onChange={(e) => {
                      const program = programs.find((item) => item.id === e.target.value) || null;
                      setSelectedProgram(program);
                    }}
                  >
                    <option value="">
                      {selectedCareer ? 'Seleccione...' : 'Primero elige escuela'}
                    </option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  5. Plan de estudios
                </label>
                <select className={SELECT_CLS} disabled>
                  <option>-- pendiente de programa --</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  6. Curso
                </label>
                {loadingCourses ? (
                  LOADING_FIELD
                ) : (
                  <select
                    className={SELECT_CLS}
                    value={selectedCourse?.id || ''}
                    disabled={!selectedProgram}
                    onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
                      const course = courses.find((c: Course) => c.id === e.target.value) || null;
                      setSelectedCourse(course);
                      if (course?.id) {
                        try {
                          const detail = await fetchCourse(course.id);
                          if (detail) setSelectedCourse({ ...course, ...detail });
                        } catch {
                          // The selector can continue with the list payload if detail is unavailable.
                        }
                      }
                    }}
                  >
                    <option value="">
                      {selectedProgram ? 'Seleccione...' : 'Primero elige programa'}
                    </option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                        {course.cycle != null ? ` (Ciclo ${course.cycle})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  7. Periodo académico
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="Ej: 2026-I"
                  className="h-9 w-full rounded border border-white/20 bg-[#041A3A] px-3 text-[11px] text-white outline-none placeholder-white/30 transition focus:border-[#00B4CC]/60 focus:ring-1 focus:ring-[#00B4CC]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  Prerrequisito
                </label>
                <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/65">
                  {formatPrerequisite(selectedCourse?.prerequisites)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">Créditos</label>
                  <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/65">{selectedCourse?.credits ?? '—'}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">H. Teoría</label>
                  <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/65">{selectedCourse?.hours_theory ?? '—'}</div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">H. Práctica</label>
                  <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/65">{selectedCourse?.hours_practice ?? '—'}</div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-full rounded border border-white/20 bg-[#041A3A] px-3 text-[11px] text-white outline-none transition focus:border-[#00B4CC]/60 focus:ring-1 focus:ring-[#00B4CC]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  Fecha de término
                </label>
                <div className="flex h-9 items-center rounded border border-white/10 bg-[#041A3A]/60 px-3 text-[11px] text-white/65">
                  {endDate || '—'}
                </div>
              </div>

              {canSubmit && (
                <div className="flex items-center gap-3 rounded-lg border border-[#00B4CC] bg-[#007A8A]/10 p-3 md:col-span-2">
                  <CheckCircle2 size={22} className="shrink-0 text-[#00B4CC]" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white">Contexto seleccionado</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/60">
                      UNPRG &gt; {selectedFaculty?.name} &gt; {selectedCareer?.name} &gt;{' '}
                      {selectedProgram?.name} &gt; {selectedCourse?.name} &gt; {semester}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-[11px] font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <RefreshCw size={12} />
                LIMPIAR SELECCIÓN
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex items-center gap-2 rounded bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-6 py-2 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    CONTINUAR
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
