// NotebookLMGuide.tsx — Guía visual para que el docente use NotebookLM
// Stepper A → B → C + botón de copiar prompt + input de carga de archivo

import React, { useState } from 'react';
import { Check, ClipboardCopy, ExternalLink } from 'lucide-react';

interface NotebookLMGuideProps {
  courseName: string;
  sumilla: string;
  onFileSelected?: (file: File) => void;
  uploading?: boolean;
}

function buildPrompt(courseName: string, sumilla: string): string {
  return `Analiza TODAS las fuentes cargadas en este cuaderno (libros, artículos, sílabos, videos) y genera un documento estructurado con las siguientes secciones exactas, en este orden y con estos títulos exactos:

## RESUMEN DEL ÁREA
Escribe un resumen académico de 300-400 palabras sobre el campo de conocimiento del curso "${courseName}". Incluye los enfoques teóricos principales, debates actuales y aplicaciones relevantes. Basa el resumen únicamente en las fuentes cargadas.

## CONCEPTOS CLAVE
Lista entre 10 y 15 conceptos fundamentales del área. Para cada uno escribe una definición breve de 1-2 oraciones basada en las fuentes. Formato:
**Concepto**: definición.

## ENFOQUES METODOLÓGICOS
Describe los principales enfoques o métodos que aparecen en las fuentes y que son relevantes para enseñar o investigar en este campo. Basado en: ${sumilla.slice(0, 400)}

## REFERENCIAS BIBLIOGRÁFICAS
Lista TODAS las fuentes que has analizado en formato APA 7 estricto.
Reglas obligatorias:
- Libros: Apellido, N. (año). Título en cursiva. Editorial. DOI o URL si existe.
- Artículos: Apellido, N. (año). Título del artículo. Nombre de la Revista en cursiva, volumen(número), páginas. https://doi.org/xxx
- Videos de YouTube: Apellido, N. [Canal] (año, día mes). Título del video [Video]. YouTube. URL
- Sílabos o documentos institucionales: Institución. (año). Título del documento. Tipo de documento.
- Ordena alfabéticamente por apellido del primer autor.
- NO incluyas fuentes que no hayas podido verificar en los documentos cargados.

Responde únicamente con las cuatro secciones. Sin introducción ni cierre.`;
}

const STEPS = [
  {
    key: 'A',
    title: 'Abre NotebookLM',
    description: 'Ve a notebooklm.google.com y crea un nuevo cuaderno para este curso.',
    action: (
      <a
        href="https://notebooklm.google.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1"
      >
        Abrir NotebookLM <ExternalLink className="w-3 h-3" />
      </a>
    ),
  },
  {
    key: 'B',
    title: 'Carga tus fuentes',
    description:
      'Agrega libros, artículos y PDFs del curso como fuentes del cuaderno.',
    action: null,
  },
  {
    key: 'C',
    title: 'Copia y usa este prompt',
    description: 'Pega el prompt generado en el chat de NotebookLM y descarga el resultado.',
    action: null,
  },
];

export default function NotebookLMGuide({
  courseName,
  sumilla,
  onFileSelected,
  uploading = false,
}: NotebookLMGuideProps) {
  const [copied, setCopied] = useState(false);
  const prompt = buildPrompt(courseName, sumilla);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex gap-3">
            {/* Indicador */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {step.key}
              </div>
              {idx < STEPS.length - 1 && (
                <div className="w-px flex-1 bg-orange-200 my-1" />
              )}
            </div>
            {/* Contenido */}
            <div className="pb-2">
              <p className="text-sm font-semibold text-gray-800">{step.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
              {step.action}
            </div>
          </div>
        ))}
      </div>

      {/* Prompt generado */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Prompt para NotebookLM
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600">Copiado</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-600">Copiar prompt</span>
              </>
            )}
          </button>
        </div>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
          {prompt}
        </pre>
      </div>

      {/* Upload del output */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Sube el output de NotebookLM
        </p>
        <p className="text-xs text-gray-500 mb-3">PDF o Markdown (.md, .txt)</p>
        <label className="inline-block cursor-pointer">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
            {uploading ? 'Subiendo…' : 'Seleccionar archivo'}
          </span>
          <input
            type="file"
            accept=".pdf,.md,.txt"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onFileSelected) onFileSelected(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
