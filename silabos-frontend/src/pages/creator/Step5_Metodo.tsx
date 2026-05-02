import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { MethodItem } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import { getMethodIcon } from '../../utils/methodIcons';

const normalizeDisplayText = (value?: string | null) =>
  (value ?? '').replace(/\s+/g, ' ').replace(/\s*\.\.\.\s*/g, '. ').trim();

const normalizeMatchValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const clampText = (value?: string | null, max = 140) => {
  const clean = normalizeDisplayText(value);
  if (!clean) return '';
  return clean.length > max ? `${clean.slice(0, max - 3).trim()}...` : clean;
};

const splitReasonText = (value?: string | null) =>
  (normalizeDisplayText(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((item) => normalizeDisplayText(item))
    .filter((item) => item.length > 12);

function findMethod(
  methods: MethodItem[],
  criteria: { id?: string | null; code?: string | null; name?: string | null },
) {
  const byId = criteria.id ? methods.find((method) => String(method.id) === String(criteria.id)) : null;
  if (byId) return byId;

  const normalizedCode = normalizeMatchValue(criteria.code);
  if (normalizedCode) {
    const byCode = methods.find((method) => normalizeMatchValue(method.code) === normalizedCode);
    if (byCode) return byCode;
  }

  const normalizedName = normalizeMatchValue(criteria.name);
  if (normalizedName) {
    return methods.find((method) => normalizeMatchValue(method.name) === normalizedName) ?? null;
  }

  return null;
}

function buildWhyItems(method: MethodItem, suggestReason: string, suggestReasonItems: string[] = []) {
  const phases = method.phases ?? [];
  const products = method.productos_tipicos ?? [];
  const techniques = method.tecnicas_didacticas ?? [];

  const candidates = [
    ...suggestReasonItems.map((item) => normalizeDisplayText(item)),
    ...splitReasonText(suggestReason).slice(0, 2),
    method.proposito ? `Se alinea al proposito del silabo porque ${normalizeDisplayText(method.proposito)}.` : '',
    phases.length > 0 ? `Ordena el trabajo en ${phases.length} fases claras.` : '',
    techniques.length > 0 ? `Activa al estudiante mediante ${techniques.slice(0, 3).map(normalizeDisplayText).join(', ')}.` : '',
    products.length > 0 ? `Conduce a evidencias como ${products.slice(0, 3).map(normalizeDisplayText).join(', ')}.` : '',
    method.rol_estudiante ? `Refuerza un rol activo: ${normalizeDisplayText(method.rol_estudiante)}.` : '',
  ].filter(Boolean);

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = normalizeMatchValue(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function MethodGlyph({
  method,
  size = 'sm',
}: {
  method: Pick<MethodItem, 'code' | 'name'>;
  size?: 'sm' | 'lg';
}) {
  const large = size === 'lg';

  return (
    <div className={`${large ? 'h-[94px] w-[76px]' : 'h-9 w-8.5'} relative shrink-0`}>
      <div
        className="absolute inset-0 border border-[#D4A351]/70 bg-gradient-to-b from-[#133567] to-[#041A3A] shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
        style={{ clipPath: 'polygon(50% 0%, 93% 18%, 93% 82%, 50% 100%, 7% 82%, 7% 18%)' }}
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 px-1.5 text-[#F2C260]">
        <FontAwesomeIcon icon={getMethodIcon(method.code, method.name)} className={large ? 'text-[19px]' : 'text-[10px]'} />
        {large && method.code && (
          <span className="text-[9.5px] font-black tracking-[0.05em] text-[#F2C260]">{method.code}</span>
        )}
      </div>
    </div>
  );
}

function MethodCard({
  method,
  selected,
  onClick,
}: {
  method: MethodItem;
  selected: boolean;
  onClick: () => void;
}) {
  const descriptor = clampText(
    method.proposito || method.description || 'Método institucional listo para secuenciar actividades y evidencias.',
    92,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group h-full rounded-[16px] border px-2.5 py-2 text-left transition ${
        selected
          ? 'border-[#D4A351] bg-[#D4A351]/10 shadow-[0_0_0_1px_rgba(212,163,81,0.18)]'
          : 'border-white/10 bg-[#0A2753]/85 hover:border-[#D4A351]/35 hover:bg-[#0A2753]'
      }`}
    >
      <div className="flex items-start gap-2">
        <MethodGlyph method={method} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {method.code && (
              <span className="rounded-full bg-[#D4A351]/12 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-[#F2C260]">
                {method.code}
              </span>
            )}
            {selected && (
              <span className="rounded-full bg-[#00B4CC]/14 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[#7BE7F3]">
                Activo
              </span>
            )}
          </div>
          <h3 className="mt-1 text-[10px] font-bold leading-4 text-white">{method.name}</h3>
          <p className="mt-0.5 text-[8px] leading-4 text-white/58">{descriptor}</p>
        </div>
        {selected && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#D4A351]">
            <Check size={9} className="text-[#041A3A]" />
          </span>
        )}
      </div>
    </button>
  );
}

function RelationshipNode({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: 'gold' | 'cyan' | 'slate';
}) {
  const accents = {
    gold: 'border-[#D4A351]/35 bg-[#0B244D] text-[#F2C260]',
    cyan: 'border-[#00B4CC]/30 bg-[#082544] text-[#7BE7F3]',
    slate: 'border-white/12 bg-[#0A2753] text-white/80',
  } as const;

  return (
    <div className={`min-w-[100px] rounded-[13px] border px-2.5 py-2 ${accents[accent]}`}>
      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-white/42">{title}</p>
      <p className="mt-1 text-[9.5px] font-bold leading-4 text-white">{body}</p>
    </div>
  );
}

function MethodRelationPanel({ method }: { method: MethodItem }) {
  const phaseSummary =
    method.phases && method.phases.length > 0
      ? `${method.phases.length} fases con secuencia guiada`
      : 'Secuencia didáctica del método';
  const evidenceSummary =
    method.productos_tipicos && method.productos_tipicos.length > 0
      ? method.productos_tipicos.slice(0, 2).map(normalizeDisplayText).join(' / ')
      : 'Productos de aprendizaje';

  return (
    <div className="rounded-[18px] border border-white/10 bg-[#0A2753]/72 p-2.5">
      <p className="text-[9.5px] font-bold text-white">Relación método - componentes</p>
      <div className="mt-2.5 flex flex-col gap-2 xl:flex-row xl:items-center">
        <RelationshipNode title="Método" body={method.code || method.name} accent="gold" />
        <div className="hidden xl:flex flex-1 items-center gap-1">
          <span className="h-px flex-1 bg-[#00B4CC]/25" />
          <span className="h-1.5 w-1.5 rounded-full border border-[#7BE7F3] bg-[#041A3A]" />
          <span className="h-px flex-1 bg-[#00B4CC]/25" />
        </div>
        <RelationshipNode title="Actividades" body={phaseSummary} accent="cyan" />
        <div className="hidden xl:flex flex-1 items-center gap-1">
          <span className="h-px flex-1 bg-[#00B4CC]/25" />
          <span className="h-1.5 w-1.5 rounded-full border border-[#7BE7F3] bg-[#041A3A]" />
          <span className="h-px flex-1 bg-[#00B4CC]/25" />
        </div>
        <RelationshipNode title="Evidencias" body={evidenceSummary} accent="slate" />
      </div>
    </div>
  );
}

function MethodHero({
  method,
  suggestReason,
  suggestReasonItems,
}: {
  method: MethodItem;
  suggestReason: string;
  suggestReasonItems: string[];
}) {
  const whyItems = buildWhyItems(method, suggestReason, suggestReasonItems);
  const sequencePreview = clampText(method.secuencia_didactica, 160);

  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.12fr)_minmax(220px,0.88fr)]">
      <div className="rounded-[20px] border border-[#D4A351]/30 bg-[#0A2753]/80 p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <MethodGlyph method={method} size="lg" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-[#00B4CC]/14 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-[#7BE7F3]">
              Método seleccionado
            </span>
            <h2 className="mt-1 font-playfair text-[1.28rem] font-bold leading-none text-white">{method.name}</h2>
            {method.code && (
              <p className="mt-1 text-[7.5px] font-semibold uppercase tracking-[0.14em] text-[#D4A351]">
                Código {method.code}
              </p>
            )}
            <p className="mt-2 text-[9px] leading-4.5 text-white/78">
              {method.proposito || method.description || 'Método institucional listo para alinear actividades, productos y evidencias del sílabo.'}
            </p>
            {sequencePreview && (
              <p className="mt-2 text-[8px] leading-4 text-white/55">
                <span className="font-semibold text-[#D4A351]">Secuencia base:</span> {sequencePreview}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2.5">
        <div className="rounded-[18px] border border-white/10 bg-[#0A2753]/72 p-2.5">
          <p className="text-[9.5px] font-bold text-white">¿Por qué este método?</p>
          <div className="mt-2 space-y-1.5">
            {whyItems.map((item) => (
              <div key={item} className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-[#8BE2A5]" />
                <p className="text-[8px] leading-4 text-white/72">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <MethodRelationPanel method={method} />
      </div>
    </div>
  );
}

function MethodMetaPanel({ method }: { method: MethodItem }) {
  const phases = method.phases ?? [];
  const products = method.productos_tipicos ?? [];
  const techniques = method.tecnicas_didacticas ?? [];

  return (
    <section className="rounded-[18px] border border-white/10 bg-[#0A2753]/82 p-2.5">
      <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-white/46">Detalle del método</p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[13px] border border-white/10 bg-white/5 px-2.5 py-2">
          <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#00B4CC]">Roles</p>
          {method.rol_docente && (
            <p className="mt-1.5 text-[8px] leading-4 text-white/70">
              <span className="font-semibold text-white">Docente:</span> {method.rol_docente}
            </p>
          )}
          {method.rol_estudiante && (
            <p className="mt-1.5 text-[8px] leading-4 text-white/70">
              <span className="font-semibold text-white">Estudiante:</span> {method.rol_estudiante}
            </p>
          )}
        </div>

        <div className="rounded-[13px] border border-white/10 bg-white/5 px-2.5 py-2">
          <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#D4A351]">
            Fases {phases.length > 0 ? `(${phases.length})` : ''}
          </p>
          {phases.length > 0 ? (
            <ol className="mt-1.5 space-y-0.5">
              {phases.map((phase, index) => (
                <li key={phase} className="flex gap-1.5 text-[8px] leading-4 text-white/72">
                  <span className="text-[#D4A351]/80">{index + 1}.</span>
                  <span className="flex-1">{phase}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1.5 text-[8px] text-white/45">Sin fases registradas.</p>
          )}
        </div>
      </div>

      {(products.length > 0 || techniques.length > 0) && (
        <div className="mt-2 space-y-2">
          {products.length > 0 && (
            <div>
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-white/42">Productos típicos</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {products.slice(0, 8).map((product) => (
                  <span
                    key={product}
                    className="rounded-full border border-[#D4A351]/28 bg-[#D4A351]/6 px-1.5 py-0.5 text-[7px] text-[#F2C260]"
                  >
                    {product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {techniques.length > 0 && (
            <div>
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-white/42">Técnicas didácticas</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {techniques.slice(0, 6).map((technique) => (
                  <span
                    key={technique}
                    className="rounded-full border border-white/14 bg-white/5 px-1.5 py-0.5 text-[7px] text-white/68"
                  >
                    {technique}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function Step5_Metodo() {
  const navigate = useNavigate();
  const {
    draftId,
    selectedMethodId,
    setSelectedMethodId,
    selectedMethodName,
    setSelectedMethodName,
    setSelectedMethodSequence,
    methodNotes,
    setMethodNotes,
    saveStep,
    showToast,
  } = useSyllabus();

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestReason, setSuggestReason] = useState('');
  const [suggestReasonItems, setSuggestReasonItems] = useState<string[]>([]);

  useEffect(() => {
    api
      .getPedagogicMethods()
      .then((res) => setMethods(res.data ?? []))
      .catch(() => showToast('Error cargando métodos didácticos', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleSelect = (method: MethodItem) => {
    setSelectedMethodId(String(method.id));
    setSelectedMethodName(method.name);
    setSelectedMethodSequence(method.secuencia_didactica || '');
  };

  const handleSuggest = async () => {
    if (!draftId) return;

    setSuggesting(true);
    try {
      const response = await api.suggestMethodProgressive(draftId);
      const suggestion = response.data;
      const found = findMethod(methods, {
        id: suggestion?.method_id,
        code: suggestion?.method_code,
        name: suggestion?.method_name,
      });

      const resolvedId = suggestion?.method_id ? String(suggestion.method_id) : found ? String(found.id) : null;

      if (resolvedId) {
        setSelectedMethodId(resolvedId);
      }
      if (found) {
        setSelectedMethodName(found.name);
        setSelectedMethodSequence(found.secuencia_didactica || '');
      } else if (suggestion?.method_name) {
        setSelectedMethodName(suggestion.method_name);
        setSelectedMethodSequence('');
      }

      setSuggestReason(suggestion?.reason || '');
      setSuggestReasonItems(Array.isArray(suggestion?.reason_items) ? suggestion.reason_items.filter(Boolean) : []);
      showToast('Método sugerido por IA', 'success');
    } catch {
      showToast('Error al sugerir método', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedMethodId) return;

    setSaving(true);
    try {
      await saveStep('method', {
        selected_method_id: selectedMethodId,
        selected_method_name: selectedMethodName,
        teacher_notes: methodNotes,
        suggestion_reason: suggestReason,
        suggestion_reason_items: suggestReasonItems,
      });
      navigate('/creator/cierre');
    } catch {
      showToast('Error al guardar método', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedObj = findMethod(methods, { id: selectedMethodId, name: selectedMethodName });

  return (
    <div className="h-full overflow-y-auto bg-[#041A3A] px-3 py-3 text-white sm:px-5">
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.18em] text-[#D4A351]">Paso 7 de 8 - método didáctico</p>
          <h1 className="font-playfair text-[1.45rem] font-bold leading-none text-white">Método y secuencia didáctica</h1>
          <p className="mt-1.5 max-w-3xl text-[8.5px] leading-4 text-white/62">
            Selecciona el metodo que mejor conecta el proposito del silabo con sus actividades, evidencias y evaluacion.
          </p>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[#0A2753]/80 p-2.5">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#00B4CC]/14 text-[#7BE7F3]">
              <BookOpen size={14} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-white">Repositorio metodológico oficial</p>
              <p className="mt-1 text-[8px] leading-4 text-white/56">
                El catálogo ya trae propósito, roles, fases, productos típicos y técnicas para apoyar la selección visual del método.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="flex-1 rounded-[16px] border border-[#D4A351]/18 bg-[#0A2753]/70 px-3 py-2">
          <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#D4A351]">
            {suggestReason ? 'Lectura del sistema' : 'Selección metodológica'}
          </p>
          <p className="mt-1 text-[8px] leading-4 text-white/72">
            {suggestReason ? (
              <>
                IA recomienda <span className="font-semibold text-[#F2C260]">{selectedObj?.name || selectedMethodName || 'un metodo principal'}</span>
                {suggestReasonItems.length > 0 ? `: ${suggestReasonItems[0]}` : '. Revisa la justificacion completa en la ficha del metodo.'}
              </>
            ) : (
              <>
                Puedes elegir manualmente desde el repositorio o dejar que la IA proponga el metodo principal para el curso.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting || !draftId || loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D4A351]/40 bg-[#D4A351]/10 px-4 py-1.5 text-[8px] font-bold text-[#F2C260] transition hover:bg-[#D4A351]/18 disabled:opacity-50"
        >
          {suggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          {suggesting ? 'Analizando...' : 'Sugerir con IA'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[18px] border border-white/10 bg-[#0A2753]/70 px-3 py-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-[8px] text-white/55">
            <Loader2 size={10} className="animate-spin" />
            Cargando métodos didácticos...
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-[22px] border border-[#D4A351]/20 bg-gradient-to-br from-[#0A2753] via-[#08224A] to-[#041A3A] p-3">
            <div className="mb-2">
              <p className="text-[9px] font-bold text-white">1. Metodo propuesto por el sistema</p>
              <p className="mt-1 text-[8px] leading-4 text-white/56">
                El método seleccionado concentra la narrativa principal y su relación con actividades y evidencias.
              </p>
            </div>

            {selectedObj ? (
              <MethodHero method={selectedObj} suggestReason={suggestReason} suggestReasonItems={suggestReasonItems} />
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/14 bg-[#0A2753]/55 px-4 py-5 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#D4A351]/10 text-[#F2C260]">
                  <Sparkles size={13} />
                </div>
                <p className="mt-2 text-[9px] font-semibold text-white">
                  Selecciona uno de los 11 métodos con ícono o usa la sugerencia automática.
                </p>
                <p className="mt-1 text-[8px] leading-4 text-white/56">
                  En cuanto elijas un metodo, aqui aparecera su ficha, la razon de eleccion y su relacion con actividades y evidencias.
                </p>
              </div>
            )}
          </section>

          <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1.1fr)_280px]">
            <section className="rounded-[18px] border border-white/10 bg-[#0A2753]/82 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold text-white">2. Repositorio metodológico disponible</p>
                  <p className="mt-1 text-[8px] leading-4 text-white/56">
                    Elige el metodo principal desde el repositorio institucional o confirma la recomendacion generada por IA.
                  </p>
                </div>
                <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-white/62">
                  {methods.length} métodos
                </span>
              </div>

              <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                {methods.map((method) => (
                  <React.Fragment key={method.id}>
                    <MethodCard
                      method={method}
                      selected={selectedMethodId === String(method.id)}
                      onClick={() => handleSelect(method)}
                    />
                  </React.Fragment>
                ))}
              </div>
            </section>

            <div className="space-y-2.5">
              {selectedObj ? (
                <MethodMetaPanel method={selectedObj} />
              ) : (
                <section className="rounded-[18px] border border-white/10 bg-[#0A2753]/82 p-2.5">
                  <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-white/46">Detalle del método</p>
                  <p className="mt-2 text-[8px] leading-4 text-white/58">
                    El panel de detalle mostrará roles, fases, productos y técnicas del método seleccionado.
                  </p>
                </section>
              )}

            </div>
          </div>
        </>
      )}

      <div className="mt-3">
        <label className="mb-1 block text-[7.5px] font-bold uppercase tracking-[0.12em] text-white/42">
          Observaciones del docente
        </label>
        <textarea
          className="w-full resize-none rounded-[18px] border border-white/10 bg-[#0A2753] px-3 py-2 text-[8px] text-white outline-none transition focus:border-[#D4A351]/38"
          rows={2}
          placeholder="Justificación del método seleccionado..."
          value={methodNotes}
          onChange={(event) => setMethodNotes(event.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/creator/contenido')}
          className="inline-flex items-center gap-1 text-[8px] text-white/42 transition hover:text-white"
        >
          <ArrowLeft size={9} />
          Volver a Contenido
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !selectedMethodId}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-5 py-2 text-[8px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              Confirmar método
              <ArrowRight size={10} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
