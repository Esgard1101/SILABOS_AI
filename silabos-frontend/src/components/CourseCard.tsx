// CourseCard.tsx — Tarjeta de solo lectura con datos del curso seleccionado
// Muestra: nombre, código, créditos, ciclo, sumilla, competencia_egreso, resultado_aprendizaje

import { BookOpen, Hash, Star } from 'lucide-react';

export interface CourseData {
  id: string;
  name: string;
  code?: string | null;
  credits?: number | null;
  cycle?: number | null;
  is_common?: boolean;
  scope?: string | null;
  sumilla?: string | null;
  competencia_egreso?: string | null;
  resultado_aprendizaje?: string | null;
  capacidad?: string | null;
}

interface CourseCardProps {
  course: CourseData;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="border border-orange-200 bg-orange-50 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-orange-500 rounded-lg p-2 shrink-0 mt-0.5">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 leading-tight">{course.name}</h3>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {course.code && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Hash className="w-3 h-3" />
                {course.code}
              </span>
            )}
            {course.credits != null && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3" />
                {course.credits} crédito{course.credits !== 1 ? 's' : ''}
              </span>
            )}
            {course.cycle != null && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                Ciclo {course.cycle}
              </span>
            )}
            {course.is_common && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Curso común
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sumilla */}
      {course.sumilla && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Sumilla
          </p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
            {course.sumilla}
          </p>
        </div>
      )}

      {/* Competencia de egreso */}
      {course.competencia_egreso && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Competencia de egreso
          </p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {course.competencia_egreso}
          </p>
        </div>
      )}

      {/* Resultado de aprendizaje */}
      {course.resultado_aprendizaje && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Resultado de aprendizaje
          </p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {course.resultado_aprendizaje}
          </p>
        </div>
      )}

      {course.capacidad && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Capacidad del curso
          </p>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {course.capacidad}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 italic">
        Estos datos son de solo lectura — provienen del plan de estudios oficial.
      </p>
    </div>
  );
}
