import { useEffect, useMemo, useState } from 'react';
import { DeepResearchStep } from '../api/types';
import { useBibliography } from '../hooks/useBibliography';
import Toast, { useToast } from './Toast';

interface BibliographyGuideProps {
  courseName?: string;
  careerName?: string;
}

const DEEP_RESEARCH_STEPS: DeepResearchStep[] = [
  {
    step: 1,
    title: 'Ir a Google Deep Research',
    description: 'Abre una nueva pestaña y ve a gemini.google.com',
    url: 'https://gemini.google.com',
    action: "Selecciona la opción 'Deep Research' en el menú",
  },
  {
    step: 2,
    title: 'Escribir el prompt de investigación',
    description: 'Copia y pega este prompt en el campo de búsqueda:',
    prompt_template:
      'Busca 10 referencias bibliográficas académicas sobre {tema_curso} para nivel universitario de pregrado. Incluir: libros de texto, artículos científicos y recursos web académicos. Para cada referencia incluir: título completo, autor(es), año, editorial o revista, DOI o URL de acceso. Formato de salida: APA 7ma edición. Priorizar fuentes en español e inglés publicadas después del año 2010.',
    tip: 'Reemplaza {tema_curso} con el nombre de tu curso',
  },
  {
    step: 3,
    title: 'Iniciar la investigación',
    description: "Haz click en 'Start Research' o 'Iniciar investigación'",
    action: '¡Momento perfecto para un café! Este proceso toma ~15 minutos.',
    coffee_break: true,
  },
  {
    step: 4,
    title: 'Exportar el informe',
    description: 'Cuando Deep Research termine, el informe aparece en pantalla',
    action: "Click en 'Export' → se abre en Google Docs",
    important: 'En Google Docs: Archivo → Descargar → PDF (.pdf)',
  },
  {
    step: 5,
    title: 'Subir el PDF a SIGEISIL',
    description: 'Regresa a esta plataforma',
    action: "En el Panel Principal usa 'Subir Documento' y selecciona el PDF",
    result: 'Las referencias estarán disponibles en el Chat de tu sílabo',
  },
];

type TabKey = 'automatic' | 'deep';

export default function BibliographyGuide({ courseName, careerName }: BibliographyGuideProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('automatic');
  const [keywords, setKeywords] = useState(courseName || '');
  const [area, setArea] = useState(careerName || '');
  const [hasSearched, setHasSearched] = useState(false);
  const { references, isSearching, error, sourcesConsulted, searchBibliography } = useBibliography();
  const { showToast, toasts, removeToast } = useToast();

  useEffect(() => {
    if (!keywords && courseName) {
      setKeywords(courseName);
    }
  }, [courseName, keywords]);

  useEffect(() => {
    if (!area && careerName) {
      setArea(careerName);
    }
  }, [area, careerName]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const resolvedTopic = useMemo(() => {
    return (courseName || keywords || 'tu curso').trim();
  }, [courseName, keywords]);

  const handleSearch = async () => {
    const normalizedKeywords = keywords.trim() || courseName?.trim() || '';

    if (!normalizedKeywords) {
      showToast('Ingresa palabras clave para buscar referencias', 'warning');
      return;
    }

    setHasSearched(true);
    try {
      await searchBibliography({
        keywords: normalizedKeywords,
        area: area.trim() || undefined,
        course_name: courseName?.trim() || normalizedKeywords,
      });
    } catch {
      // El hook ya expone el error y lo notificamos con toast.
    }
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('¡Prompt copiado!', 'success');
    } catch {
      showToast('No se pudo copiar el prompt', 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('automatic')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === 'automatic' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          🔍 Búsqueda Automática
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deep')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === 'deep' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          ☕ Investigación Profunda
        </button>
      </div>

      {activeTab === 'automatic' ? (
        <div className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Palabras clave</label>
              <input
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Tema o nombre del curso"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Área</label>
              <input
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Carrera o área académica"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSearching ? 'Buscando...' : 'Buscar Referencias'}
            </button>
            {isSearching ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></span>
                Consultando fuentes académicas...
              </div>
            ) : null}
          </div>

          {sourcesConsulted.length > 0 ? (
            <p className="mt-4 text-xs text-slate-500">Fuentes consultadas: {sourcesConsulted.join(', ')}</p>
          ) : null}

          <div className="mt-6 space-y-4">
            {references.map((reference, index) => (
              <div key={`${reference.url}-${index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="flex-1 text-sm leading-6 text-slate-700">{reference.apa_format}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-600">
                    {reference.source}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  {reference.doi ? <span className="text-slate-500">DOI: {reference.doi}</span> : null}
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Ver enlace ↗
                  </a>
                </div>
              </div>
            ))}

            {hasSearched && !isSearching && references.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                No se encontraron resultados automáticos. Prueba la pestaña Investigación Profunda ☕
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-900">Investigación con Google Deep Research</h3>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">⏱ ~15 minutos</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Usa esta guía estática para obtener referencias sólidas y luego subir el PDF al panel principal.
              </p>
            </div>

            <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" className="shrink-0">
              <path d="M36 83h48" stroke="#8B4513" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="60" cy="84" rx="28" ry="7" fill="#F5DEB3" />
              <path d="M34 49h42v20c0 11-8 20-21 20S34 80 34 69V49Z" fill="#FFFDD0" stroke="#8B4513" strokeWidth="4" />
              <path d="M76 55h9c7 0 11 4 11 10s-4 10-11 10h-9" fill="none" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
              <path d="M44 41c-4-6-1-10 2-14" fill="none" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
              <path d="M58 39c-4-6-1-10 2-14" fill="none" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
              <path d="M72 41c-4-6-1-10 2-14" fill="none" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="55" cy="49" rx="22" ry="4" fill="#F5DEB3" />
            </svg>
          </div>

          <div className="mt-8 space-y-6">
            {DEEP_RESEARCH_STEPS.map((step, index) => {
              const prompt = step.prompt_template?.replace('{tema_curso}', resolvedTopic);

              return (
                <div key={step.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {step.step}
                    </div>
                    {index < DEEP_RESEARCH_STEPS.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200"></div> : null}
                  </div>

                  <div className={`flex-1 rounded-2xl border border-slate-200 p-5 ${step.coffee_break ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <h4 className="text-base font-bold text-slate-900">{step.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">{step.description}</p>

                    {step.url ? (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Abrir ↗
                      </a>
                    ) : null}

                    {prompt ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">{prompt}</pre>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(prompt)}
                          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          📋 Copiar prompt
                        </button>
                      </div>
                    ) : null}

                    {step.tip ? <p className="mt-3 text-xs italic text-slate-500">{step.tip}</p> : null}
                    {step.action ? <p className="mt-3 text-sm font-medium text-slate-700">{step.action}</p> : null}
                    {step.result ? <p className="mt-3 text-sm text-slate-600">{step.result}</p> : null}

                    {step.coffee_break ? (
                      <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
                        ☕ ¡Momento perfecto para un café!
                      </div>
                    ) : null}

                    {step.important ? (
                      <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                        ⚠️ {step.important}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm italic text-slate-500">
            Las referencias del PDF se indexarán automáticamente al subirlo al Panel Principal
          </p>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
