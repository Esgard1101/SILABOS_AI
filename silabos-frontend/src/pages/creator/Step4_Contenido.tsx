import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Filter,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { HabilidadPorDesempeno, SkillDB, SuggestedPerformance } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';

type ContentKind = 'knowledge' | 'skills';

interface ContentSkill {
  skill_id: string | null;
  name: string;
}

interface ContentWeek {
  week: number;
  unit_number: number;
  performance_code: string;
  knowledge: string[];
  skills: ContentSkill[];
}

interface ContentUnit {
  unit_number: number;
  ra_unidad: string;
  weeks: ContentWeek[];
}

const ICONS: Record<ContentKind | 'relation', string> = {
  knowledge: '/ICONCONOCIMIENTOS.png',
  skills: '/ICONhabilidades.png',
  relation: '/ICONRELACIONCONPROPOSITO.png',
};

const CONTENT_LIMITS: Record<ContentKind, number> = {
  knowledge: 40,
  skills: 30,
};

function flattenTextItems(items: unknown[]): string[] {
  const out: string[] = [];
  for (const raw of items || []) {
    if (Array.isArray(raw)) {
      out.push(...flattenTextItems(raw));
    } else if (raw && typeof raw === 'object') {
      const item = raw as Record<string, unknown>;
      if (Array.isArray(item.items)) out.push(...flattenTextItems(item.items));
      else if (typeof item.name === 'string') out.push(item.name);
      else if (typeof item.nombre === 'string') out.push(item.nombre);
      else if (typeof item.descripcion === 'string') out.push(item.descripcion);
      else if (typeof item.statement === 'string') out.push(item.statement);
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      out.push(String(raw));
    }
  }
  return out;
}

function cleanItems(items: unknown[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of flattenTextItems(items)) {
    const item = String(raw || '').trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function shortText(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function skillNamesByPerformance(items: HabilidadPorDesempeno[], code: string): string[] {
  return items.find((item) => item.desempeno_code === code)?.habilidades || [];
}

function progressiveKnowledgeForWeek(items: string[], absoluteWeek: number): string[] {
  const seeds = items.length ? items : ['fundamentos del curso', 'aplicación disciplinar'];
  const seed = (index: number) => seeds[Math.min(seeds.length - 1, index % seeds.length)];
  const templates = [
    'Fundamentos conceptuales de {a}',
    'Contexto, alcance y categorías de {a}',
    'Principios y enfoques de {a}',
    'Integración diagnóstica de {a} y {b}',
    'Modelos teóricos de {a}',
    'Procedimientos y estrategias de {a}',
    'Análisis comparado de {a} y {b}',
    'Producto parcial sobre {a}',
    'Métodos de aplicación de {a}',
    'Criterios de diseño e intervención en {a}',
    'Resolución de situaciones prácticas vinculadas con {a}',
    'Evaluación parcial de resultados sobre {a}',
    'Proyecto integrador aplicado a {a}',
    'Validación y mejora de propuestas sobre {a}',
    'Sustentación de evidencias y toma de decisiones en {a}',
    'Cierre integrador y reflexión académica sobre {a}',
  ];
  const idx = Math.max(0, absoluteWeek - 1);
  return [
    templates[idx % templates.length]
      .replace('{a}', seed(idx))
      .replace('{b}', seed(idx + 1)),
  ];
}

function unitWeekRanges(unitCount: number, totalWeeks = 16): Array<[number, number]> {
  const count = Math.max(1, unitCount || 1);
  const base = Math.floor(totalWeeks / count);
  const extra = totalWeeks % count;
  const ranges: Array<[number, number]> = [];
  let start = 1;
  for (let index = 0; index < count; index += 1) {
    const end = start + base + (index < extra ? 1 : 0) - 1;
    ranges.push([start, end]);
    start = end + 1;
  }
  return ranges;
}

function buildContentPlan({
  performances,
  conocimientos,
  habilidades,
  habilidadesPorDesempeno,
  skillIdByName,
}: {
  performances: SuggestedPerformance[];
  conocimientos: string[];
  habilidades: string[];
  habilidadesPorDesempeno: HabilidadPorDesempeno[];
  skillIdByName: Map<string, string>;
}): { units: ContentUnit[]; warnings: string[] } {
  const warnings: string[] = [];
  const perfFallback = performances.length
    ? performances
    : [{ code: 'D1', statement: 'Desempeño pendiente de validación', origin: 'ai_suggested' as const }];

  const ranges = unitWeekRanges(perfFallback.length);
  const units: ContentUnit[] = ranges.map(([startWeek, endWeek], unitIndex) => {
    const unitNumber = unitIndex + 1;
    const weeks: ContentWeek[] = Array.from({ length: endWeek - startWeek + 1 }, (_, weekIndex) => {
      const absoluteWeek = startWeek + weekIndex;
      const perf = perfFallback[Math.min(unitIndex, perfFallback.length - 1)] || perfFallback[0];
      const performanceCode = perf.code || `D${unitNumber}`;
      const perfSkills = skillNamesByPerformance(habilidadesPorDesempeno, performanceCode);
      const knowledge = cleanItems(progressiveKnowledgeForWeek(conocimientos, absoluteWeek), 2);
      const skillText = cleanItems([
        ...perfSkills,
        habilidades[(absoluteWeek - 1) % Math.max(habilidades.length, 1)],
        habilidades[(absoluteWeek) % Math.max(habilidades.length, 1)],
      ], 2);

      if (!knowledge.length) warnings.push(`U${unitNumber}-S${weekIndex + 1}: falta conocimiento`);
      if (!skillText.length) warnings.push(`U${unitNumber}-S${weekIndex + 1}: falta habilidad`);

      return {
        week: absoluteWeek,
        unit_number: unitNumber,
        performance_code: performanceCode,
        knowledge,
        skills: skillText.map((name) => ({ skill_id: skillIdByName.get(name.toLowerCase()) || null, name })),
      };
    });

    return {
      unit_number: unitNumber,
      ra_unidad: '',
      weeks,
    };
  });

  return { units, warnings };
}

function ContentCard({
  kind,
  title,
  subtitle,
  items,
  officialItems = [],
  accent,
  onAdd,
  onRemove,
}: {
  kind: ContentKind;
  title: string;
  subtitle: string;
  items: string[];
  officialItems?: string[];
  accent: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const officialSet = useMemo(
    () => new Set(officialItems.map((item) => item.trim().toLowerCase())),
    [officialItems],
  );

  const commit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  };

  return (
    <>
      <section className="flex min-h-[250px] flex-col rounded-xl border border-white/12 bg-[#0A2753]">
        <header className="flex items-center gap-3 border-b border-[#D4A351]/40 px-4 py-3">
          <img src={ICONS[kind]} alt="" className="h-12 w-12 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <h2 className="font-playfair text-[16px] font-bold uppercase leading-none text-white">{title}</h2>
            <p className="mt-1 text-[10px] text-white/60">{subtitle}</p>
          </div>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-bold text-white/55">{items.length}</span>
        </header>

        <ul className="flex-1 space-y-2 px-4 py-3">
          {items.length === 0 ? (
            <li className="text-[11px] italic text-white/35">Pendiente de completar.</li>
          ) : (
            items.slice(0, 5).map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-start gap-2">
                <CheckCircle2 size={13} className={`mt-0.5 shrink-0 ${accent}`} />
                <span className="flex-1 text-[11px] leading-4 text-white/82">{shortText(item, 105)}</span>
              </li>
            ))
          )}
          {items.length > 5 && (
            <li className="pl-5 text-[10px] font-semibold text-[#D4A351]">+ {items.length - 5} más en edición completa</li>
          )}
        </ul>

        <div className="mx-4 mb-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/4 px-3 py-2 text-[10px] font-bold text-white/62 transition hover:border-[#D4A351]/45 hover:text-[#F2C260]"
          >
            <Edit2 size={12} />
            Editar contenidos
          </button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[#D4A351]/35 bg-[#0A2753] shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <img src={ICONS[kind]} alt="" className="h-12 w-12 shrink-0 object-contain" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D4A351]">Edición completa</p>
                  <h3 className="font-playfair text-xl font-bold text-white">{title}</h3>
                  <p className="text-[11px] text-white/55">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/45 hover:text-white"
              >
                <X size={14} />
              </button>
            </header>

            <div className="max-h-[48vh] overflow-y-auto overscroll-contain px-5 py-4">
              <ul className="space-y-2">
                {items.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-white/12 px-3 py-4 text-center text-[12px] italic text-white/35">
                    Aún no hay elementos en esta sección.
                  </li>
                ) : (
                  items.map((item, index) => {
                    const isOfficial = officialSet.has(item.trim().toLowerCase());
                    return (
                      <li key={`${item}-${index}`} className="group flex items-start gap-2 rounded-lg border border-white/8 bg-[#041A3A] px-3 py-2">
                        <CheckCircle2 size={13} className={`mt-0.5 shrink-0 ${accent}`} />
                        <span className="min-w-0 flex-1 text-[12px] leading-5 text-white/82">{item}</span>
                        {isOfficial ? (
                          <span className="shrink-0 rounded-full bg-[#D4A351]/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#F2C260]">
                            Oficial
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRemove(item)}
                            className="shrink-0 rounded-md p-1 text-white/28 transition hover:bg-red-400/10 hover:text-red-300"
                            aria-label={`Eliminar ${item}`}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <footer className="border-t border-white/10 px-5 py-4">
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commit();
                  }}
                  placeholder={`Agregar ${title.toLowerCase()}...`}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-[#D4A351]/45"
                />
                <button
                  type="button"
                  onClick={commit}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#00B4CC]/35 bg-[#00B4CC]/10 px-4 py-2 text-[11px] font-bold text-[#77E3F0] hover:bg-[#00B4CC]/18"
                >
                  <Plus size={13} />
                  Agregar
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function SkillsLibrary({
  skills,
  loading,
  selectedIds,
  onAdd,
}: {
  skills: SkillDB[];
  loading: boolean;
  selectedIds: string[];
  onAdd: (skill: SkillDB) => void;
}) {
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) || null;

  return (
    <section className="rounded-xl border border-white/12 bg-[#0A2753] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#77E3F0]" />
          <div>
            <h3 className="text-[13px] font-bold text-white">Biblioteca institucional de habilidades</h3>
            <p className="text-[10px] text-white/48">El docente selecciona desde el catálogo maestro; no escribe nombres a ciegas.</p>
          </div>
        </div>
        <span className="rounded-full bg-[#00B4CC]/10 px-2.5 py-1 text-[9px] font-bold text-[#77E3F0]">
          {skills.length} habilidades cargadas
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px]">
        <label className="relative flex min-w-0 items-center rounded-xl border border-[#D4A351]/26 bg-[#041A3A]">
          <Filter size={14} className="pointer-events-none absolute left-3 text-[#D4A351]" />
          <select
            value={selectedSkillId}
            onChange={(event) => setSelectedSkillId(event.target.value)}
            className="min-h-11 w-full appearance-none bg-transparent px-9 py-2 text-[11px] font-semibold text-white outline-none"
          >
            <option value="" className="bg-[#0A2753]">Seleccionar habilidad del catálogo...</option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id} className="bg-[#0A2753]">
                {skill.id_habilidad ? `${skill.id_habilidad} - ` : ''}{skill.nombre}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#D4A351]" />
        </label>
        <button
          type="button"
          disabled={!selectedSkill}
          onClick={() => {
            if (!selectedSkill) return;
            onAdd(selectedSkill);
            setSelectedSkillId('');
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#00B4CC]/35 bg-[#00B4CC]/10 px-3 py-2 text-[10px] font-bold text-[#77E3F0] transition hover:bg-[#00B4CC]/18 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={12} />
          Agregar
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex items-center gap-2 text-[11px] text-white/50">
            <Loader2 size={13} className="animate-spin" /> Buscando habilidades...
          </div>
        ) : skills.length === 0 ? (
          <p className="col-span-full text-[11px] text-white/45">Sin coincidencias en el catálogo maestro para los filtros actuales.</p>
        ) : (
          skills.slice(0, 8).map((skill) => {
            const selected = selectedIds.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => onAdd(skill)}
                className={`group rounded-lg border px-3 py-2 text-left transition ${
                  selected
                    ? 'border-[#69D27D]/45 bg-[#69D27D]/10'
                    : 'border-white/10 bg-white/4 hover:border-[#D4A351]/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[10px] font-bold text-white">{shortText(skill.nombre, 58)}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                    selected ? 'bg-[#69D27D]/18 text-[#8BE2A5]' : 'bg-[#D4A351]/12 text-[#F2C260] group-hover:bg-[#D4A351]/20'
                  }`}>
                    {selected ? 'OK' : '+ Añadir'}
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-white/42">
                  {skill.nivel_cognitivo || 'Nivel'} · {skill.verbo_principal || skill.categoria}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function Step4_Contenido() {
  const navigate = useNavigate();
  const {
    draftId,
    courseDetail,
    contentMode,
    setContentMode,
    draftPerformances,
    habilidadesSugeridas,
    setHabilidadesSugeridas,
    habilidadesPorDesempeno,
    setHabilidadesPorDesempeno,
    selectedSkillIds,
    setSelectedSkillIds,
    conocimientos,
    setConocimientos,
    contentNotes,
    setContentNotes,
    responsabilidadSocial,
    setResponsabilidadSocial,
    saveStep,
    showToast,
  } = useSyllabus();

  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skills, setSkills] = useState<SkillDB[]>([]);
  const [skillIdByName, setSkillIdByName] = useState<Map<string, string>>(new Map());
  const officialKnowledge = useMemo(() => cleanItems(courseDetail?.temas_conocimientos || [], CONTENT_LIMITS.knowledge), [courseDetail?.temas_conocimientos]);
  const officialSkills = useMemo(() => cleanItems(courseDetail?.habilidades_desempenos || [], CONTENT_LIMITS.skills), [courseDetail?.habilidades_desempenos]);

  const enrichedKnowledge = useMemo(
    () => cleanItems([...officialKnowledge, ...conocimientos], CONTENT_LIMITS.knowledge),
    [officialKnowledge, conocimientos],
  );
  const enrichedSkills = useMemo(
    () => cleanItems([...officialSkills, ...habilidadesSugeridas], CONTENT_LIMITS.skills),
    [officialSkills, habilidadesSugeridas],
  );
  const contentPlan = useMemo(
    () =>
      buildContentPlan({
        performances: draftPerformances,
        conocimientos: enrichedKnowledge,
        habilidades: enrichedSkills,
        habilidadesPorDesempeno,
        skillIdByName,
      }),
    [draftPerformances, enrichedKnowledge, enrichedSkills, habilidadesPorDesempeno, skillIdByName],
  );

  const hasContent = enrichedKnowledge.length > 0 && enrichedSkills.length > 0;
  const balanceOk = contentPlan.warnings.length === 0;
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setSkillsLoading(true);
      try {
        const desempeño = draftPerformances[0]?.statement || courseDetail?.name || '';
        const res = await api.suggestSkills({
          course_id: courseDetail?.id,
          desempeno: desempeño,
          limit: 350,
        });
        const items = res.data?.skills || [];
        if (!ignore) {
          setSkills(items);
          setSkillIdByName((prev) => {
            const next = new Map(prev);
            items.forEach((skill) => next.set(skill.nombre.toLowerCase(), skill.id));
            return next;
          });
        }
      } catch {
        if (!ignore) setSkills([]);
      } finally {
        if (!ignore) setSkillsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [courseDetail?.id, courseDetail?.name, draftPerformances]);

  const markEditing = () => {
    if (contentMode === 'idle' || contentMode === 'confirmed') setContentMode('editing');
  };

  const handleSuggest = async () => {
    if (!draftId) return;
    setSuggesting(true);
    try {
      const res = await api.suggestContent(draftId);
      const d = res.data;
      if (d) {
        if (d.conocimientos?.length) setConocimientos((prev) => cleanItems([...prev, ...d.conocimientos], CONTENT_LIMITS.knowledge));
        if (d.habilidades_sugeridas?.length) setHabilidadesSugeridas((prev) => cleanItems([...prev, ...d.habilidades_sugeridas], CONTENT_LIMITS.skills));
        if (d.habilidades_por_desempeno?.length) setHabilidadesPorDesempeno(d.habilidades_por_desempeno);
        if (d.responsabilidad_social?.trim()) setResponsabilidadSocial(d.responsabilidad_social.trim());
        setContentMode('proposal');
        showToast('Propuesta de contenido generada', 'success');
      }
    } catch {
      showToast('Error al generar propuesta de contenido', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleImportPlan = () => {
    const importedKnowledge = cleanItems([...officialKnowledge, ...conocimientos], CONTENT_LIMITS.knowledge);
    const importedSkills = cleanItems([...officialSkills, ...habilidadesSugeridas], CONTENT_LIMITS.skills);
    if (importedKnowledge.length) setConocimientos(importedKnowledge);
    if (importedSkills.length) setHabilidadesSugeridas(importedSkills);
    markEditing();
    showToast('Datos enriquecidos del plan importados', 'success');
  };

  const handleAddSkill = (skill: SkillDB) => {
    setHabilidadesSugeridas((prev) => cleanItems([...prev, skill.nombre], CONTENT_LIMITS.skills));
    setSelectedSkillIds((prev) => (prev.includes(skill.id) ? prev : [...prev, skill.id]));
    setSkillIdByName((prev) => new Map(prev).set(skill.nombre.toLowerCase(), skill.id));
    markEditing();
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await saveStep('content', {
        habilidades_sugeridas: enrichedSkills,
        habilidades_por_desempeno: habilidadesPorDesempeno,
        selected_skill_ids: selectedSkillIds,
        knowledge_items: enrichedKnowledge,
        responsabilidad_social: responsabilidadSocial.trim(),
        content_plan: { units: contentPlan.units, warnings: contentPlan.warnings },
        content_mode: 'confirmed',
        teacher_notes: contentNotes,
      });
      setContentMode('confirmed');
      navigate('/creator/metodo');
    } catch {
      showToast('Error al guardar contenido', 'error');
    } finally {
      setSaving(false);
    }
  };

  const modeBadge = {
    idle: null,
    proposal: { label: 'Propuesta IA', cls: 'bg-[#D4A351]/15 text-[#D4A351]' },
    editing: { label: 'Editando', cls: 'bg-white/10 text-white/60' },
    confirmed: { label: 'Confirmado', cls: 'bg-[#00B4CC]/15 text-[#00B4CC]' },
  }[contentMode];

  return (
    <div className="h-full overflow-y-auto bg-[#041A3A] px-4 py-4 text-white sm:px-6">
      <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_470px]">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">CONTENIDO DERIVADO</p>
          <h1 className="font-playfair text-[1.8rem] font-bold leading-none text-white">Propuesta de contenido formativo</h1>
          <p className="mt-2 max-w-3xl text-[11px] leading-4 text-white/62">
            Conocimientos y habilidades derivadas del propósito validado, fuentes y desempeños oficiales.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/creator/desempenos')}
            className="rounded-xl border border-white/12 bg-[#0A2753] px-4 py-3 text-left hover:border-[#00B4CC]/35"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#69D27D]" />
              <div>
                <p className="text-[12px] font-bold text-white">Propósito validado</p>
                <p className="mt-1 text-[10px] leading-4 text-white/58">{draftPerformances.length} desempeños oficiales confirmados.</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={handleImportPlan}
            className="rounded-xl border border-white/12 bg-[#0A2753] px-4 py-3 text-left hover:border-[#D4A351]/40"
          >
            <p className="text-[12px] font-bold text-white">Plan de estudios</p>
            <p className="mt-1 text-[10px] leading-4 text-white/58">
              {courseDetail?.temas_conocimientos?.length || 0} temas y {courseDetail?.habilidades_desempenos?.length || 0} habilidades minadas.
            </p>
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {modeBadge && <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${modeBadge.cls}`}>{modeBadge.label}</span>}
          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${balanceOk ? 'bg-[#69D27D]/12 text-[#8BE2A5]' : 'bg-[#D4A351]/12 text-[#F2C260]'}`}>
            {balanceOk ? 'K/H balanceado' : `${contentPlan.warnings.length} alertas K/H`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting || !draftId}
          className="flex items-center gap-1.5 rounded-xl border border-[#D4A351]/40 bg-[#D4A351]/10 px-4 py-2 text-[11px] font-bold text-[#D4A351] transition hover:bg-[#D4A351]/20 disabled:opacity-50"
        >
          {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {suggesting ? 'Generando...' : 'Proponer con IA'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ContentCard
          kind="knowledge"
          title="Conocimientos"
          subtitle="¿Qué debe saber el estudiante?"
          accent="text-[#77E3F0]"
          items={enrichedKnowledge}
          officialItems={officialKnowledge}
          onAdd={(value) => {
            setConocimientos((prev) => cleanItems([...prev, value], CONTENT_LIMITS.knowledge));
            markEditing();
          }}
          onRemove={(value) => {
            setConocimientos((prev) => prev.filter((item) => item.trim().toLowerCase() !== value.trim().toLowerCase()));
            markEditing();
          }}
        />
        <ContentCard
          kind="skills"
          title="Habilidades"
          subtitle="¿Qué debe saber hacer?"
          accent="text-[#F2C260]"
          items={enrichedSkills}
          officialItems={officialSkills}
          onAdd={(value) => {
            setHabilidadesSugeridas((prev) => cleanItems([...prev, value], CONTENT_LIMITS.skills));
            markEditing();
          }}
          onRemove={(value) => {
            setHabilidadesSugeridas((prev) => prev.filter((item) => item.trim().toLowerCase() !== value.trim().toLowerCase()));
            markEditing();
          }}
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <SkillsLibrary
          skills={skills}
          loading={skillsLoading}
          selectedIds={selectedSkillIds}
          onAdd={handleAddSkill}
        />

        <section className="rounded-xl border border-white/12 bg-[#0A2753] p-4">
          <div className="flex items-center gap-3">
            <img src={ICONS.relation} alt="" className="h-14 w-14 shrink-0 object-contain" />
            <div>
              <h3 className="text-[13px] font-bold text-white">Relación con el propósito</h3>
              <p className="mt-1 text-[10px] leading-4 text-white/58">
                Cada semana guarda conocimientos y habilidades para alimentar la matriz final por desempeño, semana y evidencia.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-[#041A3A] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4A351]">Vista semanal lista</p>
            <p className="mt-1 text-[11px] text-white/65">{contentPlan.units.length} unidades × 16 semanas × K/H</p>
            <p className="mt-1 text-[10px] text-white/40">Se guarda como <span className="font-mono">content_plan.units[].weeks[]</span>.</p>
          </div>
        </section>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Responsabilidad Social Universitaria</label>
        <textarea
          className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
          rows={5}
          placeholder="Actividad RSU concreta, vinculada al propósito del curso y a la aplicación social del aprendizaje..."
          value={responsabilidadSocial}
          onChange={(event) => {
            setResponsabilidadSocial(event.target.value);
            markEditing();
          }}
        />
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Observaciones del docente</label>
        <textarea
          className="w-full resize-none rounded-xl border border-white/10 bg-[#0A2753] px-3 py-2 text-[11px] text-white outline-none focus:border-[#D4A351]/40"
          rows={2}
          placeholder="Notas sobre el contenido formativo..."
          value={contentNotes}
          onChange={(event) => setContentNotes(event.target.value)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/creator/desempenos')} className="flex items-center gap-1.5 text-[11px] text-white/42 transition hover:text-white">
          <ArrowLeft size={12} /> Volver a Desempeños
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !hasContent}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007A8A] to-[#00B4CC] px-6 py-2.5 text-[11px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Guardando...
            </>
          ) : (
            <>
              Confirmar contenido propuesto <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
