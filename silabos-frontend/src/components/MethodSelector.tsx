// MethodSelector.tsx — Selector de método pedagógico con sugerencia IA
// Carga sugerencia automática + dropdown con todos los métodos

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { BASE_URL, getToken } from '../api/client';

export interface MethodItem {
  id: number;
  name: string;
  description?: string;
  secuencia_didactica?: string;
}

interface MethodSuggest {
  method_id: number;
  method_name: string;
  reason: string;
}

interface MethodSelectorProps {
  courseId: string;
  value: number | null;
  onChange: (methodId: number, methodName: string) => void;
}

async function fetchMethods(): Promise<MethodItem[]> {
  const res = await fetch(`${BASE_URL}/api/methods`, {
    headers: { Authorization: `Bearer ${getToken() || ''}` },
  });
  const json = await res.json();
  // /api/methods devuelve { success, data: [...] }
  return (json.data as MethodItem[]) || [];
}

async function fetchSuggest(courseId: string): Promise<MethodSuggest | null> {
  const res = await fetch(
    `${BASE_URL}/api/methods/suggest?course_id=${encodeURIComponent(courseId)}`,
    { headers: { Authorization: `Bearer ${getToken() || ''}` } },
  );
  const json = await res.json();
  return (json.data as MethodSuggest) || null;
}

export default function MethodSelector({ courseId, value, onChange }: MethodSelectorProps) {
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [suggest, setSuggest] = useState<MethodSuggest | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(true);

  useEffect(() => {
    setLoadingMethods(true);
    fetchMethods()
      .then((list) => {
        setMethods(list);
        // Si no hay valor seleccionado aún, esperar a la sugerencia
      })
      .finally(() => setLoadingMethods(false));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setLoadingSuggest(true);
    fetchSuggest(courseId)
      .then((s) => {
        setSuggest(s);
        if (s && value === null) {
          onChange(s.method_id, s.method_name);
        }
      })
      .finally(() => setLoadingSuggest(false));
  }, [courseId]);

  const selectedMethod = methods.find((m) => m.id === value) || null;

  if (loadingMethods) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando métodos pedagógicos…
      </div>
    );
  }

  // Si no hay métodos en el catálogo (tabla vacía), input libre
  if (methods.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-600 mb-2">
          No hay métodos en el catálogo. Escribe el método a aplicar:
        </p>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Ej: Aprendizaje Basado en Problemas"
          onChange={(e) => onChange(0, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sugerencia IA */}
      {loadingSuggest ? (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          La IA está eligiendo el método más adecuado…
        </div>
      ) : suggest ? (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Sugerencia de la IA
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800">{suggest.method_name}</p>
          <p className="text-xs text-gray-600 mt-0.5">{suggest.reason}</p>
        </div>
      ) : null}

      {/* Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Método pedagógico
        </label>
        <div className="relative">
          <select
            className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            value={value ?? ''}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10);
              const m = methods.find((x) => x.id === id);
              if (m) onChange(m.id, m.name);
            }}
          >
            <option value="">Selecciona un método…</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Descripción del método seleccionado */}
      {selectedMethod && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-800">{selectedMethod.name}</p>
          {selectedMethod.description && (
            <p className="text-sm text-gray-600">{selectedMethod.description}</p>
          )}
          {selectedMethod.secuencia_didactica && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Secuencia didáctica
              </p>
              <p className="text-xs text-gray-600 font-mono bg-white border border-gray-100 rounded px-2 py-1.5">
                {selectedMethod.secuencia_didactica}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
