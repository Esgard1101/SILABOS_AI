import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LibraryBig, Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  EvaluationInstrument,
  InstitutionalSkill,
  TeachingMethod,
} from '../api/types';
import NavSidebar from '../components/NavSidebar';
import Toast, { useToast } from '../components/Toast';

type CatalogTab = 'methods' | 'skills' | 'instruments';
type SkillCategory = string;

const CATEGORY_STYLES: Record<string, string> = {
  cognitiva: 'bg-blue-50 text-blue-700',
  investigativa: 'bg-green-50 text-green-700',
  pedagogica: 'bg-orange-50 text-orange-700',
  comunicativa: 'bg-purple-50 text-purple-700',
  tecnologica: 'bg-cyan-50 text-cyan-700',
  socioemocional: 'bg-pink-50 text-pink-700',
  gestion: 'bg-amber-50 text-amber-700',
};

function normalizeCategoryKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getCategoryStyle(category: string) {
  const normalized = normalizeCategoryKey(category);

  if (normalized.includes('cognit')) return CATEGORY_STYLES.cognitiva;
  if (normalized.includes('investig')) return CATEGORY_STYLES.investigativa;
  if (normalized.includes('pedagog')) return CATEGORY_STYLES.pedagogica;
  if (normalized.includes('comunic')) return CATEGORY_STYLES.comunicativa;
  if (normalized.includes('tecnolog')) return CATEGORY_STYLES.tecnologica;
  if (normalized.includes('socioemocional')) return CATEGORY_STYLES.socioemocional;
  if (normalized.includes('gestion')) return CATEGORY_STYLES.gestion;

  return 'bg-slate-100 text-slate-600';
}

export default function Catalog() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CatalogTab>('methods');
  const [methods, setMethods] = useState<TeachingMethod[]>([]);
  const [skills, setSkills] = useState<InstitutionalSkill[]>([]);
  const [skillCategories, setSkillCategories] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<EvaluationInstrument[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('');
  const [expandedMethodId, setExpandedMethodId] = useState<number | null>(null);
  const { showToast, toasts, removeToast } = useToast();

  useEffect(() => {
    const loadMethods = async () => {
      setLoadingMethods(true);

      try {
        const response = await api.getMethods();
        setMethods(response.methods || []);
      } catch {
        setMethods([]);
        showToast('No se pudieron cargar los métodos institucionales', 'error');
      } finally {
        setLoadingMethods(false);
      }
    };

    const loadInstruments = async () => {
      setLoadingInstruments(true);

      try {
        const response = await api.getInstruments();
        setInstruments(response.instruments || []);
      } catch {
        setInstruments([]);
        showToast('No se pudieron cargar los instrumentos', 'error');
      } finally {
        setLoadingInstruments(false);
      }
    };

    loadMethods();
    loadInstruments();
  }, [showToast]);

  useEffect(() => {
    const loadSkills = async () => {
      setLoadingSkills(true);

      try {
        const response = await api.getSkills(skillCategory || undefined);
        setSkills(response.skills || []);
        setSkillCategories(response.categorias || []);
      } catch {
        setSkills([]);
        setSkillCategories([]);
        showToast('No se pudieron cargar las habilidades institucionales', 'error');
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, [showToast, skillCategory]);

  const legacySkillFilters = useMemo(
    () => [
      { value: '', label: 'Todas' },
      { value: 'cognitiva', label: 'Cognitiva' },
      { value: 'investigativa', label: 'Investigativa' },
      { value: 'pedagogica', label: 'Pedagógica' },
      { value: 'comunicativa', label: 'Comunicativa' },
      { value: 'tecnologica', label: 'Tecnológica' },
      { value: 'socioemocional', label: 'Socioemocional' },
    ],
    [],
  );
  void legacySkillFilters;

  const skillFilters = useMemo(
    () => [
      { value: '', label: 'Todas' },
      ...skillCategories.map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [skillCategories],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <NavSidebar currentPath="/catalog" />

      <div className="flex-1">
        <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => navigate('/dashboard')} className="hover:text-orange-600">
                  Inicio
                </button>
                <span>/</span>
                <span className="font-semibold text-slate-700">Catálogos</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Catálogos Institucionales</h1>
              <p className="mt-1 text-sm text-slate-500">Biblioteca institucional de métodos, habilidades e instrumentos.</p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-orange-200 hover:text-orange-600"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('methods')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeTab === 'methods' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:text-orange-600'
              }`}
            >
              Métodos
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeTab === 'skills' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:text-orange-600'
              }`}
            >
              Habilidades
            </button>
            <button
              onClick={() => setActiveTab('instruments')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeTab === 'instruments'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-600 hover:text-orange-600'
              }`}
            >
              Instrumentos
            </button>
          </div>

          {activeTab === 'methods' ? (
            <section className="mt-8">
              {loadingMethods ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-56 animate-pulse rounded-3xl border border-orange-100 bg-white"></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {methods.map((method) => (
                    <article key={method.id} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                            <LibraryBig size={22} />
                          </div>
                          <h2 className="text-xl font-bold text-slate-900">{method.nombre}</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{method.descripcion}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {method.tipo_actividades.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => setExpandedMethodId(expandedMethodId === method.id ? null : method.id)}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
                      >
                        {expandedMethodId === method.id ? 'Ocultar secuencia didáctica' : 'Ver secuencia didáctica'}
                      </button>

                      {expandedMethodId === method.id ? (
                        <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-slate-700">
                          {method.secuencia_didactica}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-2">
                        {method.tipo_evidencias.map((tag) => (
                          <span key={tag} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activeTab === 'skills' ? (
            <section className="mt-8">
              <div className="flex flex-wrap gap-2">
                {skillFilters.map((filter) => (
                  <button
                    key={filter.value || 'all'}
                    onClick={() => setSkillCategory(filter.value as SkillCategory)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      skillCategory === filter.value
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-slate-600 hover:text-orange-600'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                Mostrando {skills.length} habilidades institucionales activas.
              </p>

              {loadingSkills ? (
                <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-56 animate-pulse rounded-3xl border border-orange-100 bg-white"></div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {skills.map((skill) => (
                    <article key={skill.id} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            getCategoryStyle(skill.categoria)
                          }`}
                        >
                          {skill.categoria}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {skill.verbo}
                        </span>
                      </div>
                      <h2 className="mt-4 text-xl font-bold text-slate-900">{skill.nombre}</h2>
                      {skill.subcategoria ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {skill.subcategoria}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-orange-600">{skill.nivel}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{skill.descripcion}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activeTab === 'instruments' ? (
            <section className="mt-8">
              {loadingInstruments ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-3xl border border-orange-100 bg-white"></div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {instruments.map((instrument) => (
                    <article key={instrument.id} className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                          <Puzzle size={22} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900">{instrument.nombre}</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {instrument.tipo}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{instrument.descripcion}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
