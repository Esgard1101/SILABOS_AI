import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { CheckCircle2, ClipboardCheck, Target } from 'lucide-react';
import { api } from '../api/client';
import type { ValidationObservation, ValidationResult, ValidationTargetCard } from '../api/types';

function getCardTone(status: string) {
  if (status === 'listo') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'en_revision') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function getStatusLabel(status: string) {
  if (status === 'listo') return 'Verificado';
  if (status === 'en_revision') return 'Por reforzar';
  return 'No verificable';
}

function InsightCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}

export default function FinalDeliveryInsights({ syllabusId }: { syllabusId: string }) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    const loadValidation = async () => {
      setLoading(true);
      setUnavailable(false);
      try {
        const response = await api.validateSyllabus(syllabusId);
        if (active) {
          setValidation(response.data);
        }
      } catch {
        if (active) {
          setUnavailable(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadValidation();

    return () => {
      active = false;
    };
  }, [syllabusId]);

  const observations = useMemo<ValidationObservation[]>(
    () => validation?.observaciones || [],
    [validation],
  );
  const targetCards = useMemo<ValidationTargetCard[]>(
    () => validation?.target_status_cards || [],
    [validation],
  );
  const verifiedCount = targetCards.filter((item) => item.estado === 'listo').length;

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-slate-50/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Verificacion y trazabilidad
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {validation?.dashboard_title || 'Panel de metas del silabo'}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Revision automatica de cobertura, secuencia semanal, evidencias y fuentes antes de descargar.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Confianza"
          value={loading ? '...' : unavailable ? '--' : `${validation?.score ?? 0}%`}
          helper={unavailable ? 'La verificacion se mostrara cuando el servicio este disponible.' : 'Resultado global de consistencia del silabo generado.'}
          icon={<ClipboardCheck size={20} />}
        />
        <InsightCard
          title="Targets"
          value={loading ? '...' : targetCards.length ? `${verifiedCount}/${targetCards.length}` : '4'}
          helper="Metas de cobertura y trazabilidad revisadas por el sistema."
          icon={<Target size={20} />}
        />
        <InsightCard
          title="Estado"
          value={validation?.aprobado ? 'Listo' : 'Revisar'}
          helper="El documento queda preparado para descarga y revision docente final."
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      {!loading && !unavailable && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {targetCards.length > 0 ? (
            targetCards.map((item) => (
              <article key={item.id} className={`rounded-2xl border px-4 py-3 ${getCardTone(item.estado)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{item.titulo}</p>
                    <p className="mt-1 text-xs leading-5 opacity-85">{item.resumen}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/65 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {getStatusLabel(item.estado)}
                  </span>
                </div>
                {item.evidencia ? <p className="mt-2 text-[11px] leading-5 opacity-75">{item.evidencia}</p> : null}
                {item.siguiente_accion ? <p className="mt-1 text-[11px] font-semibold leading-5">{item.siguiente_accion}</p> : null}
              </article>
            ))
          ) : observations.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
              <CheckCircle2 size={18} />
              <p className="text-sm font-semibold">Verificacion completada sin observaciones relevantes.</p>
            </div>
          ) : (
            observations.slice(0, 4).map((item, index) => (
              <article
                key={`${item.criterio}-${index}`}
                className={`rounded-2xl border px-4 py-3 ${getCardTone(item.nivel === 'error' ? 'en_revision' : 'no_verificable')}`}
              >
                <p className="text-sm font-bold">{item.criterio}</p>
                <p className="mt-1 text-xs leading-5">{item.mensaje}</p>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
