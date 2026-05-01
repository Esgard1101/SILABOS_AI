import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileText,
  Folder,
  GraduationCap,
  Loader2,
  Target,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { CourseDetail } from '../../api/types';
import { useSyllabus } from '../../context/SyllabusContext';
import { useAppContext } from '../../hooks/useAppContext';

const PREVIEW_ASSETS = {
  sumilla: '/SumillaICONcargado.png',
  competencia: '/ICONcompetenciacargado.png',
  capacidad: '/capacidadresultadocargadoICON.png',
  plantilla: '/ICONplantillaoficialcargado.png',
} as const;

const ANNEX_ITEMS = [
  { name: 'Reglamento de Estudios.pdf', ext: 'PDF', tone: 'border-[#EF4444]/30 bg-[#EF4444]/12 text-[#FF8A8A]' },
  { name: 'Modelo de Silabo UNPRG.docx', ext: 'DOCX', tone: 'border-[#3B82F6]/30 bg-[#3B82F6]/12 text-[#9EC5FF]' },
  { name: 'Lineamientos Curriculares.pdf', ext: 'PDF', tone: 'border-[#EF4444]/30 bg-[#EF4444]/12 text-[#FF8A8A]' },
  { name: 'Rubrica de Evaluacion.xlsx', ext: 'XLSX', tone: 'border-[#22C55E]/30 bg-[#22C55E]/12 text-[#8BE0A6]' },
];

function splitPreviewItems(text: string, limit: number) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?:\.\s+|;\s+|\n+)/)
    .map((item) => item.trim().replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildExcerpt(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}...`;
}

function DetailModal({
  title,
  text,
  onClose,
}: {
  title: string;
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#D4A351] bg-[#0A2753] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/50 transition hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-white/90">{text}</p>
      </div>
    </div>
  );
}

function ImportedFooter({ ready }: { ready: boolean }) {
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div
        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
          ready ? 'text-[#74DB98]' : 'text-[#D4A351]/80'
        }`}
      >
        {ready ? (
          <CheckCircle size={13} className="shrink-0" />
        ) : (
          <AlertTriangle size={13} className="shrink-0" />
        )}
        {ready ? 'Importado' : 'Pendiente'}
      </div>
    </div>
  );
}

function CurrCard({
  icon: Icon,
  iconTone,
  title,
  text,
  previewSrc,
  previewAlt,
  className = '',
  bulletize = false,
  maxChars = 260,
  bulletLimit = 4,
  clickable = false,
}: {
  icon: React.ElementType;
  iconTone: string;
  title: string;
  text: string | null | undefined;
  previewSrc?: string;
  previewAlt?: string;
  className?: string;
  bulletize?: boolean;
  maxChars?: number;
  bulletLimit?: number;
  clickable?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const cleanedText = text?.trim() ?? '';
  const isEmpty = cleanedText.length === 0;
  const allItems = cleanedText ? splitPreviewItems(cleanedText, 20) : [];
  const bulletItems = bulletize ? allItems.slice(0, bulletLimit) : [];
  const showBullets = bulletize && allItems.length > 1;
  const excerpt = cleanedText ? buildExcerpt(cleanedText, maxChars) : '';
  const canOpen = clickable && !isEmpty;
  const showMore =
    !canOpen &&
    !isEmpty &&
    (cleanedText.length > maxChars || (showBullets && allItems.length > bulletItems.length));

  const handleCardOpen = () => {
    if (canOpen) setModalOpen(true);
  };

  return (
    <>
      <div
        className={`flex h-full flex-col rounded-[18px] border border-[#D4A351]/35 bg-[#0A2753]/95 p-3 shadow-[0_14px_34px_rgba(1,32,63,0.15)] transition ${
          canOpen
            ? 'cursor-pointer hover:border-[#D4A351]/55 hover:bg-[#0D2C5D]/95'
            : ''
        } ${className}`}
        onClick={handleCardOpen}
        onKeyDown={(event) => {
          if (!canOpen) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setModalOpen(true);
          }
        }}
        role={canOpen ? 'button' : undefined}
        tabIndex={canOpen ? 0 : undefined}
      >
        <div className={`flex flex-1 flex-col gap-2.5 ${previewSrc ? 'lg:flex-row lg:items-start lg:justify-between' : ''}`}>
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 ${iconTone}`}
              >
                <Icon size={15} />
              </div>
              <h3 className="text-[15px] font-semibold leading-tight text-white">{title}</h3>
            </div>

            {isEmpty ? (
              <p className="text-[12px] italic leading-5 text-white/35">Sin información registrada.</p>
            ) : showBullets ? (
              <ul className="space-y-1 text-[12px] leading-5 text-white/82">
                {bulletItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#D4A351]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] leading-5 text-white/82">{excerpt}</p>
            )}

            {canOpen && (
              <p className="mt-1.5 text-[10px] font-medium text-[#F2C260]/90">
                Haz clic para ver completo
              </p>
            )}

            {showMore && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setModalOpen(true);
                }}
                className="mt-1.5 text-[10px] font-medium text-[#F2C260] transition hover:text-[#FFD98B]"
              >
                Ver completo
              </button>
            )}
          </div>

          {previewSrc && (
            <div className="mx-auto w-full max-w-[92px] shrink-0 rounded-[14px] border border-white/10 bg-[#08234A] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:max-w-[100px]">
              <img
                src={previewSrc}
                alt={previewAlt ?? title}
                className="h-auto w-full object-contain drop-shadow-[0_10px_24px_rgba(255,255,255,0.08)]"
              />
            </div>
          )}
        </div>

        <ImportedFooter ready={!isEmpty} />
      </div>

      {modalOpen && cleanedText && (
        <DetailModal title={title} text={cleanedText} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function AnnexesCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[18px] border border-[#D4A351]/35 bg-[#0A2753]/95 p-3 shadow-[0_14px_34px_rgba(1,32,63,0.15)] ${className}`}
    >
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(240px,295px)] xl:items-start">
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white/75">
              <Folder size={15} />
            </div>
            <h3 className="text-[15px] font-semibold leading-tight text-white">Anexos institucionales</h3>
          </div>

          <p className="max-w-xl text-[12px] leading-5 text-white/82">
            Documentos de apoyo y normativas institucionales que complementan la elaboración del
            sílabo.
          </p>
        </div>

        <div className="space-y-1.5">
          {ANNEX_ITEMS.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#08234A]/90 px-2.5 py-1.5"
            >
              <div
                className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${item.tone}`}
              >
                {item.ext}
              </div>
              <span className="min-w-0 flex-1 truncate text-[12px] text-white/84">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <ImportedFooter ready />
    </div>
  );
}

export default function Step1_Repositorio() {
  const navigate = useNavigate();
  const { context } = useAppContext();
  const { setCourseDetail, createOrLoadDraft, showToast, courseDetail: ctxDetail } = useSyllabus();

  const [detail, setDetail] = useState<CourseDetail | null>(ctxDetail);
  const [loading, setLoading] = useState(!ctxDetail);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (ctxDetail) {
      setDetail(ctxDetail);
      return;
    }

    if (!context?.course_id) return;

    setLoading(true);
    api
      .getCourse(context.course_id)
      .then((response) => {
        const courseData = response.data ?? null;
        setDetail(courseData);
        setCourseDetail(courseData);
      })
      .catch(() => showToast('No se pudo cargar el curso', 'error'))
      .finally(() => setLoading(false));
  }, [context?.course_id, ctxDetail, setCourseDetail, showToast]);

  const handleConfirm = async () => {
    if (!detail) return;

    setConfirming(true);
    setCourseDetail(detail);

    try {
      await createOrLoadDraft(detail);
      navigate('/creator/fuentes');
    } catch {
      showToast('Error al inicializar el draft', 'error');
    } finally {
      setConfirming(false);
    }
  };

  if (!context?.course_id) {
    navigate('/select-context', { replace: true });
    return null;
  }

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto bg-[#041A3A] px-3 py-3 text-white sm:px-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-[#D4A351]/45 bg-[#D4A351]/10 text-[#D4A351] shadow-[0_10px_24px_rgba(212,163,81,0.12)]">
          <BookOpen size={22} />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4A351]">
            PASO 3 DE 8 - REPOSITORIO CURRICULAR
          </p>
          <h1 className="font-playfair text-[1.6rem] font-bold text-white">
            Repositorio curricular oficial
          </h1>
          <p className="mt-0.5 text-[12px] text-white/68">
            Componentes oficiales del curso importados desde el sistema institucional.
          </p>
        </div>
      </div>

      {context.course_name && (
        <div className="mb-4 rounded-[18px] border border-[#4FD6AD]/28 bg-[linear-gradient(135deg,rgba(0,180,204,0.16)_0%,rgba(8,102,92,0.18)_40%,rgba(4,57,69,0.28)_100%)] px-4 py-3 shadow-[0_14px_34px_rgba(0,180,204,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#6BE7C4]/30 bg-[#6BE7C4]/12 text-[#6BE7C4]">
              <CheckCircle size={22} />
            </div>

            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#8EF3D3]">
                Componentes curriculares oficiales importados correctamente
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-white/75">
                Estos componentes serán la base para la elaboración inteligente del sílabo.
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium text-white">{context.course_name}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 size={15} className="animate-spin" />
          Cargando datos curriculares...
        </div>
      )}

      {detail && !loading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <CurrCard
            className="xl:col-span-2"
            icon={BookOpen}
            iconTone="bg-[#00B4CC]/16 text-[#24D3E6]"
            title="Sumilla"
            text={detail.sumilla}
            previewSrc={PREVIEW_ASSETS.sumilla}
            previewAlt="Vista previa de sumilla"
            maxChars={110}
            clickable
          />

          <CurrCard
            className="xl:col-span-2"
            icon={Target}
            iconTone="bg-[#D4A351]/14 text-[#E4B24F]"
            title="Competencia"
            text={detail.competencia_egreso}
            previewSrc={PREVIEW_ASSETS.competencia}
            previewAlt="Vista previa de competencia"
            maxChars={105}
            clickable
          />

          <CurrCard
            className="xl:col-span-2"
            icon={GraduationCap}
            iconTone="bg-[#D4A351]/14 text-[#E4B24F]"
            title="Capacidad / resultado"
            text={detail.capacidad ?? detail.resultado_aprendizaje}
            previewSrc={PREVIEW_ASSETS.capacidad}
            previewAlt="Vista previa de capacidad o resultado"
            bulletize
            bulletLimit={2}
            maxChars={100}
            clickable
          />

          <CurrCard
            className="xl:col-span-2"
            icon={FileText}
            iconTone="bg-white/10 text-white/72"
            title="Plantilla oficial"
            text="Plantilla institucional para la elaboración del sílabo según lineamientos de la UNPRG."
            previewSrc={PREVIEW_ASSETS.plantilla}
            previewAlt="Vista previa de plantilla oficial"
            maxChars={85}
          />

          <AnnexesCard className="md:col-span-2 xl:col-span-4" />
        </div>
      )}

      {detail && !loading && (
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
          <div className="flex flex-1 items-start gap-2.5 rounded-[18px] border border-[#D4A351]/25 bg-[#D4A351]/6 px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D4A351]/25 bg-[#D4A351]/10 text-[#D4A351]">
              <AlertTriangle size={15} />
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#F2C260]">
                Estos componentes son oficiales y no pueden ser modificados en esta etapa.
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-[#E8CC8A]/86">
                Seran utilizados por el sistema para generar propuestas inteligentes en los
                siguientes pasos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!detail || loading || confirming}
            className="flex min-h-[68px] min-w-[270px] items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#0A8797] to-[#18C0D4] px-5 py-3 text-left text-[14px] font-bold text-white shadow-[0_14px_34px_rgba(0,180,204,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <span>CONFIRMAR BASE CURRICULAR Y CONTINUAR</span>
                <ArrowRight size={16} className="shrink-0" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
