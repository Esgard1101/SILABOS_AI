import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBook,
  faBriefcase,
  faBullseye,
  faDiagramProject,
  faGraduationCap,
  faLightbulb,
  faMagnifyingGlassChart,
  faPeopleGroup,
  faPersonHiking,
  faPuzzlePiece,
  faScrewdriverWrench,
  faSquareRootVariable,
} from '@fortawesome/free-solid-svg-icons';

const normalizeMethodKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const ICON_MAP: Record<string, IconDefinition> = {
  ABPRO: faDiagramProject,
  ABP: faDiagramProject,
  ABDE: faBullseye,
  AC: faPeopleGroup,
  APC: faPeopleGroup,
  AEC: faBriefcase,
  EC: faBriefcase,
  ABEC: faBriefcase,
  ABI: faMagnifyingGlassChart,
  AE: faPersonHiking,
  EXP: faPersonHiking,
  ABT: faScrewdriverWrench,
  TAL: faScrewdriverWrench,
  TALLER: faScrewdriverWrench,
  CER: faLightbulb,
  ADI: faBook,
  ABRP: faPuzzlePiece,
  RP: faPuzzlePiece,
  EMR: faSquareRootVariable,
};

const NAME_KEYWORDS: Array<[string[], IconDefinition]> = [
  [['PROYECT'], faDiagramProject],
  [['DESAF'], faBullseye],
  [['COOPERATIV'], faPeopleGroup],
  [['CASO'], faBriefcase],
  [['INVESTIGAC'], faMagnifyingGlassChart],
  [['EXPERIEN'], faPersonHiking],
  [['TALLER'], faScrewdriverWrench],
  [['CONCEPTO', 'REFLEX'], faLightbulb],
  [['ANALISIS', 'DIRIGID'], faBook],
  [['PROBLEM'], faPuzzlePiece],
  [['MATEMAT'], faSquareRootVariable],
];

export function getMethodIcon(code?: string | null, name?: string | null): IconDefinition {
  if (code) {
    const key = normalizeMethodKey(code);
    if (ICON_MAP[key]) return ICON_MAP[key];
  }

  if (name) {
    const normalizedName = normalizeMethodKey(name);
    for (const [keywords, icon] of NAME_KEYWORDS) {
      if (keywords.some((keyword) => normalizedName.includes(keyword))) return icon;
    }
  }

  return faGraduationCap;
}
