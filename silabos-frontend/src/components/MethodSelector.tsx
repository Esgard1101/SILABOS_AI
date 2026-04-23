import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { BASE_URL, getToken } from '../api/client';

export interface MethodItem {
  id: string;
  name: string;
  description?: string;
  secuencia_didactica?: string;
}

interface MethodSuggest {
  method_id: string | null;
  method_name: string;
  reason: string;
}

interface MethodSelectorProps {
  courseId: string;
  syllabusId?: string | null;
  value: string | null;
  onChange: (methodId: string, methodName: string, methodSequence?: string) => void;
}

async function fetchMethods(): Promise<MethodItem[]> {
  const res = await fetch(`${BASE_URL}/api/methods`, {
    headers: { Authorization: `Bearer ${getToken() || ''}` },
  });
  const json = await res.json();
  return (json.data as MethodItem[]) || [];
}

async function fetchSuggest(courseId: string, syllabusId?: string | null): Promise<MethodSuggest | null> {
  if (syllabusId) {
    const res = await fetch(`${BASE_URL}/api/syllabi/${encodeURIComponent(syllabusId)}/steps/method/suggest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() || ''}` },
    });
    const json = await res.json();
    return (json.data as MethodSuggest) || null;
  }

  const params = new URLSearchParams({ course_id: courseId });
  const res = await fetch(`${BASE_URL}/api/methods/suggest?${params.toString()}`, {
    headers: { Authorization: `Bearer ${getToken() || ''}` },
  });
  const json = await res.json();
  return (json.data as MethodSuggest) || null;
}

function normalizeMethodText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveSuggestedMethod(suggestion: MethodSuggest, methods: MethodItem[]) {
  const byId = methods.find((method) => String(method.id) === String(suggestion.method_id));
  if (byId) return byId;

  const suggestedName = normalizeMethodText(suggestion.method_name || '');
  return methods.find((method) => normalizeMethodText(method.name) === suggestedName) || null;
}

export default function MethodSelector({ courseId, syllabusId, value, onChange }: MethodSelectorProps) {
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [suggest, setSuggest] = useState<MethodSuggest | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(true);
  const userChangedMethodRef = useRef(false);
  const appliedSuggestionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingMethods(true);
    fetchMethods()
      .then((list) => {
        if (!cancelled) setMethods(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;
    userChangedMethodRef.current = false;
    appliedSuggestionRef.current = null;
    setLoadingSuggest(true);
    setSuggest(null);
    fetchSuggest(courseId, syllabusId)
      .then((suggestion) => {
        if (cancelled) return;
        setSuggest(suggestion);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggest(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, syllabusId]);

  useEffect(() => {
    if (!suggest || methods.length === 0 || userChangedMethodRef.current) return;

    const suggestedMethod = resolveSuggestedMethod(suggest, methods);
    if (!suggestedMethod) return;

    const suggestionKey = `${suggestedMethod.id}:${suggest.reason}`;
    if (appliedSuggestionRef.current === suggestionKey) return;

    appliedSuggestionRef.current = suggestionKey;
    onChange(suggestedMethod.id, suggestedMethod.name, suggestedMethod.secuencia_didactica);
  }, [methods, onChange, suggest]);

  const selectedMethod = methods.find((m) => String(m.id) === String(value)) || null;

  if (loadingMethods) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando métodos pedagógicos...
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div>
        <p className="mb-2 text-sm text-gray-600">No hay métodos en el catálogo. Escribe el método a aplicar:</p>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Ej: Aprendizaje Basado en Problemas"
          onChange={(e) => onChange('', e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadingSuggest ? (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          La IA está eligiendo el método más adecuado...
        </div>
      ) : suggest ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              Sugerencia de la IA
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800">{suggest.method_name}</p>
          <p className="mt-0.5 text-xs text-gray-600">{suggest.reason}</p>
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Método pedagógico</label>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={value ?? ''}
            onChange={(e) => {
              userChangedMethodRef.current = true;
              const selected = methods.find((m) => String(m.id) === e.target.value);
              if (selected) onChange(selected.id, selected.name, selected.secuencia_didactica);
            }}
          >
            <option value="">Selecciona un método...</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {selectedMethod && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-800">{selectedMethod.name}</p>
          {selectedMethod.description && (
            <p className="text-sm text-gray-600">{selectedMethod.description}</p>
          )}
          {selectedMethod.secuencia_didactica && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Secuencia didáctica</p>
              <p className="rounded border border-gray-100 bg-white px-2 py-1.5 font-mono text-xs text-gray-600">
                {selectedMethod.secuencia_didactica}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
