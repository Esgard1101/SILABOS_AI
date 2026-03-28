// ContextSelector.tsx — Pantalla post-login de selección de contexto académico
// Aparece una vez por ciclo (semestre). 3 selects en cascada + semestre + Ingresar.

import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../api/client';
import { getCurrentSemester, useAppContext } from '../hooks/useAppContext';

interface Faculty {
  id: string;
  name: string;
  code?: string;
  careers?: Career[];
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

async function fetchFaculties(): Promise<Faculty[]> {
  const res = await fetch(`${BASE_URL}/api/institutional/faculties`);
  const json = await res.json();
  return (json.faculties as Faculty[]) || [];
}

async function fetchCareers(faculty_id: string): Promise<Career[]> {
  const res = await fetch(
    `${BASE_URL}/api/institutional/careers?faculty_id=${encodeURIComponent(faculty_id)}`,
  );
  const json = await res.json();
  return (json.data as Career[]) || [];
}

async function fetchPrograms(career_id: string): Promise<Program[]> {
  const res = await fetch(
    `${BASE_URL}/api/programs?career_id=${encodeURIComponent(career_id)}`,
  );
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

  // Si ya tiene contexto, redirigir al dashboard
  useEffect(() => {
    if (isContextSet) {
      navigate('/dashboard', { replace: true });
    }
  }, [isContextSet, navigate]);

  // Cargar facultades al montar
  useEffect(() => {
    setLoadingFaculties(true);
    fetchFaculties()
      .then(setFaculties)
      .catch(() => setError('No se pudieron cargar las facultades'))
      .finally(() => setLoadingFaculties(false));
  }, []);

  // Cargar carreras al elegir facultad
  useEffect(() => {
    if (!selectedFaculty) return;
    setLoadingCareers(true);
    setCareers([]);
    setSelectedCareer(null);
    setPrograms([]);
    setSelectedProgram(null);
    fetchCareers(selectedFaculty.id)
      .then(setCareers)
      .catch(() => setError('No se pudieron cargar las escuelas'))
      .finally(() => setLoadingCareers(false));
  }, [selectedFaculty]);

  // Cargar programas al elegir carrera
  useEffect(() => {
    if (!selectedCareer) return;
    setLoadingPrograms(true);
    setPrograms([]);
    setSelectedProgram(null);
    fetchPrograms(selectedCareer.id)
      .then(setPrograms)
      .catch(() => setError('No se pudieron cargar los programas'))
      .finally(() => setLoadingPrograms(false));
  }, [selectedCareer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty || !selectedCareer || !selectedProgram) return;
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-orange-500 rounded-xl p-2.5">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Silabos.AI</h1>
            <p className="text-sm text-gray-500">Selecciona tu programa académico</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Facultad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Facultad
            </label>
            <div className="relative">
              {loadingFaculties ? (
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando facultades…
                </div>
              ) : (
                <select
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  value={selectedFaculty?.id || ''}
                  onChange={(e) => {
                    const f = faculties.find((x) => x.id === e.target.value) || null;
                    setSelectedFaculty(f);
                  }}
                >
                  <option value="">Selecciona una facultad…</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Escuela / Carrera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Escuela Profesional
            </label>
            <div className="relative">
              {loadingCareers ? (
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando escuelas…
                </div>
              ) : (
                <select
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  value={selectedCareer?.id || ''}
                  disabled={!selectedFaculty}
                  onChange={(e) => {
                    const c = careers.find((x) => x.id === e.target.value) || null;
                    setSelectedCareer(c);
                  }}
                >
                  <option value="">
                    {selectedFaculty ? 'Selecciona una escuela…' : 'Primero elige una facultad'}
                  </option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Programa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Programa / Especialidad
            </label>
            <div className="relative">
              {loadingPrograms ? (
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando programas…
                </div>
              ) : (
                <select
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  value={selectedProgram?.id || ''}
                  disabled={!selectedCareer}
                  onChange={(e) => {
                    const p = programs.find((x) => x.id === e.target.value) || null;
                    setSelectedProgram(p);
                  }}
                >
                  <option value="">
                    {selectedCareer ? 'Selecciona un programa…' : 'Primero elige una escuela'}
                  </option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Semestre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Semestre Académico
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="ej: 2025-I"
            />
            <p className="text-xs text-gray-400 mt-1">
              enero–junio = YYYY-I · julio–diciembre = YYYY-II
            </p>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando…
              </>
            ) : (
              'Ingresar al Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
