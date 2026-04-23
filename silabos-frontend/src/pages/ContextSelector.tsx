import React, { useEffect, useState } from 'react';
import {
  BookCopy,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../api/client';
import AppShell from '../components/AppShell';
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

interface SelectFieldProps {
  step: string;
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  helperText?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

function SelectField({
  step,
  label,
  placeholder,
  value,
  disabled = false,
  loading = false,
  icon,
  children,
  helperText,
  onChange,
}: SelectFieldProps) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--line-subtle)] bg-white p-4 shadow-[0_12px_28px_rgba(9,28,56,0.05)]">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
          {icon}
        </span>
        <div>
          <p className="app-kicker text-[0.64rem] tracking-[0.18em]">Paso {step}</p>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
        </div>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-base)] px-4 py-3 text-sm text-[var(--text-soft)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando opciones...
          </div>
        ) : (
          <>
            <select
              className="w-full appearance-none rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[rgba(78,165,246,0.16)] disabled:bg-[var(--surface-base)] disabled:text-[var(--text-muted)]"
              value={value}
              disabled={disabled}
              onChange={onChange}
            >
              <option value="">{placeholder}</option>
              {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-[var(--text-muted)]" />
          </>
        )}
      </div>

      {helperText ? (
        <p className="mt-3 text-xs leading-5 text-[var(--text-soft)]">{helperText}</p>
      ) : null}
    </div>
  );
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

export default function ContextSelector() {
  const navigate = useNavigate();
  const { setContext, isContextSet } = useAppContext();

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [semester, setSemester] = useState(getCurrentSemester());

  const [loadingFaculties, setLoadingFaculties] = useState(true);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isContextSet) {
      navigate('/dashboard', { replace: true });
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
    if (!selectedFaculty) {
      return;
    }

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
    if (!selectedCareer) {
      return;
    }

    setLoadingPrograms(true);
    setPrograms([]);
    setSelectedProgram(null);

    fetchPrograms(selectedCareer.id)
      .then(setPrograms)
      .catch(() => setError('No se pudieron cargar los programas.'))
      .finally(() => setLoadingPrograms(false));
  }, [selectedCareer]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFaculty || !selectedCareer || !selectedProgram) {
      return;
    }

    setSubmitting(true);
    setContext({
      faculty_id: selectedFaculty.id,
      faculty_name: selectedFaculty.name,
      school_id: selectedCareer.id,
      school_name: selectedCareer.name,
      program_id: selectedProgram.id,
      program_name: selectedProgram.name,
      semester,
    });
    navigate('/dashboard', { replace: true });
  };

  const canSubmit =
    selectedFaculty !== null &&
    selectedCareer !== null &&
    selectedProgram !== null &&
    semester.trim().length > 0 &&
    !submitting;

  return (
    <AppShell
      title="Selecciona tu contexto academico"
      subtitle="Este contexto se guarda por ciclo academico y ordena el sistema para mostrarte el programa correcto antes de crear o revisar silabos."
      icon={Building2}
    >
      <div className="flex h-full flex-col">
        <section className="app-panel flex h-full min-h-0 flex-col overflow-hidden p-5 sm:p-6">
          <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-kicker">Paso previo al dashboard</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">Configura tu espacio de trabajo</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                Primero define el contexto correcto y luego el sistema trabajara con el lenguaje de tu programa.
              </p>
            </div>

            <div className="app-panel-soft flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="text-[var(--brand-600)]" size={18} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-600)]">
                  Guardado por sesion
                </p>
                <p className="text-sm text-slate-700">Contexto activo por ciclo academico</p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-5 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5">
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    step="1"
                    label="Facultad"
                    placeholder="Selecciona una facultad"
                    value={selectedFaculty?.id || ''}
                    loading={loadingFaculties}
                    icon={<Building2 size={18} />}
                    helperText="Usamos esta referencia para cargar solo las escuelas disponibles."
                    onChange={(event) => {
                      const faculty = faculties.find((item) => item.id === event.target.value) || null;
                      setSelectedFaculty(faculty);
                    }}
                  >
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    step="2"
                    label="Escuela profesional"
                    placeholder={selectedFaculty ? 'Selecciona una escuela' : 'Primero elige una facultad'}
                    value={selectedCareer?.id || ''}
                    disabled={!selectedFaculty}
                    loading={loadingCareers}
                    icon={<GraduationCap size={18} />}
                    helperText="Cuando cambies la facultad, esta lista se actualizara automaticamente."
                    onChange={(event) => {
                      const career = careers.find((item) => item.id === event.target.value) || null;
                      setSelectedCareer(career);
                    }}
                  >
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    step="3"
                    label="Programa o especialidad"
                    placeholder={selectedCareer ? 'Selecciona un programa' : 'Primero elige una escuela'}
                    value={selectedProgram?.id || ''}
                    disabled={!selectedCareer}
                    loading={loadingPrograms}
                    icon={<BookCopy size={18} />}
                    helperText="Este programa definira el contexto activo del panel y del creador."
                    onChange={(event) => {
                      const program = programs.find((item) => item.id === event.target.value) || null;
                      setSelectedProgram(program);
                    }}
                  >
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </SelectField>

                  <div className="rounded-[1.75rem] border border-[var(--line-subtle)] bg-white p-4 shadow-[0_12px_28px_rgba(9,28,56,0.05)]">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-700)]">
                        <CalendarDays size={18} />
                      </span>
                      <div>
                        <p className="app-kicker text-[0.64rem] tracking-[0.18em]">Paso 4</p>
                        <p className="text-sm font-semibold text-slate-900">Semestre academico</p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={semester}
                      onChange={(event) => setSemester(event.target.value)}
                      className="w-full rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[rgba(78,165,246,0.16)]"
                      placeholder="Ejemplo: 2026-I"
                    />
                    <p className="mt-3 text-xs leading-5 text-[var(--text-soft)]">
                      Enero a junio corresponde a YYYY-I. Julio a diciembre corresponde a YYYY-II.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-[1.75rem] border border-[var(--line-subtle)] bg-[var(--surface-base)] p-5">
                    <p className="text-sm font-semibold text-slate-900">Resumen activo</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
                      Verifica que estos datos coincidan con el silabo que vas a trabajar antes de ingresar al panel principal.
                    </p>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="font-medium text-slate-700">Facultad</span>
                        <span className="max-w-[60%] truncate text-right text-[var(--text-soft)]">
                          {selectedFaculty?.name || 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="font-medium text-slate-700">Escuela</span>
                        <span className="max-w-[60%] truncate text-right text-[var(--text-soft)]">
                          {selectedCareer?.name || 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="font-medium text-slate-700">Programa</span>
                        <span className="max-w-[60%] truncate text-right text-[var(--text-soft)]">
                          {selectedProgram?.name || 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-[var(--brand-50)] px-4 py-3 text-[var(--brand-700)]">
                        <span className="font-semibold">Semestre</span>
                        <span className="font-semibold">{semester || 'Pendiente'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[var(--line-subtle)] bg-white p-5">
                    <p className="text-sm font-semibold text-slate-900">Al ingresar al panel:</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                      Veras un dashboard filtrado por el programa activo y luego podras cambiarlo desde el propio panel si trabajas otro contexto.
                    </p>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-800)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ingresando...
                        </>
                      ) : (
                        'Ingresar al panel principal'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
