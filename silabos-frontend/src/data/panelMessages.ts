export interface PanelMessage {
  pantalla: number;
  paso: string;
  titulo: string;
  mensajePrincipal: string;
  mensajeAcompanamiento: string;
  instruccion: string;
}

export const PANEL_MESSAGES: Record<string, PanelMessage> = {
  '/login': {
    pantalla: 1,
    paso: 'Paso 1 de 8',
    titulo: 'Bienvenida e ingreso',
    mensajePrincipal:
      'Plataforma académica impulsada por la Dirección de la Escuela Profesional de Educación para transformar la elaboración de sílabos, fortalecer la coherencia curricular y elevar la calidad formativa con apoyo de inteligencia artificial.',
    mensajeAcompanamiento: 'Innovación curricular para una docencia de calidad.',
    instruccion:
      'Revise la presentación del sistema e ingrese con su cuenta institucional. A partir de su acceso, el sistema lo guiará paso a paso y le irá presentando propuestas que usted deberá revisar, confirmar o ajustar antes de continuar.',
  },
  '/select-context': {
    pantalla: 2,
    paso: 'Paso 2 de 8',
    titulo: 'Contexto institucional y curso',
    mensajePrincipal:
      'En este paso, el sistema le presenta la estructura institucional disponible para que usted seleccione el contexto académico desde el cual se elaborará el sílabo.',
    mensajeAcompanamiento:
      'El sistema organizará su trabajo a partir de la ruta: Universidad → Facultad → Escuela → Programa → Plan → Curso → Sílabo.',
    instruccion:
      'Seleccione el programa, el plan de estudios, el curso y el periodo académico. Revise cuidadosamente la información propuesta por el sistema y confirme que corresponde al sílabo que desea elaborar antes de continuar.',
  },
  '/creator/repositorio': {
    pantalla: 3,
    paso: 'Paso 3 de 8',
    titulo: 'Repositorio curricular oficial',
    mensajePrincipal:
      'En este paso, el sistema le propone como base de trabajo los componentes curriculares oficiales del curso: sumilla, competencia, capacidad o resultado de aprendizaje, plantilla oficial y anexos institucionales.',
    mensajeAcompanamiento:
      'Estos componentes constituyen la base formal del sílabo y serán utilizados por el sistema para generar propuestas en los pasos siguientes.',
    instruccion:
      'Revise los componentes curriculares oficiales importados. Verifique sumilla, competencia, capacidad o resultado, plantilla y anexos. Confirme que la base curricular es correcta antes de avanzar.',
  },
  '/creator/fuentes': {
    pantalla: 4,
    paso: 'Paso 4 de 8',
    titulo: 'Fuentes del curso y soporte documental',
    mensajePrincipal:
      'En este paso construya la base documental del curso mediante carga docente y curaduría asistida por IA.',
    mensajeAcompanamiento:
      'Las fuentes activas del curso respaldarán las propuestas de desempeños, contenido y selección metodológica.',
    instruccion:
      'Cargue sus propias fuentes o solicite sugerencias a la IA. Revise, seleccione y valide las fuentes antes de continuar.',
  },
  '/creator/fuentes/notebook': {
    pantalla: 4,
    paso: 'Sub-paso Fuentes',
    titulo: 'Guía NotebookLM',
    mensajePrincipal:
      'NotebookLM es el cuaderno documental del curso. Organiza, consulta y sintetiza las fuentes con IA avanzada de Google.',
    mensajeAcompanamiento:
      'Sigue el roadmap visual de 8 pasos para crear el cuaderno, subir fuentes y obtener referencias APA verificadas.',
    instruccion:
      'Haz clic en cada tarjeta del roadmap para ver las instrucciones detalladas con imágenes. Cuando termines, vuelve a Fuentes para cargar las referencias en SIGESIL.',
  },
  '/creator/desempenos': {
    pantalla: 5,
    paso: 'Paso 5 de 8',
    titulo: 'Desempeños oficiales o sugeridos',
    mensajePrincipal:
      'El sistema presenta los desempeños oficiales y, cuando no existan, propone desempeños sugeridos desde la sumilla, competencia y capacidad del curso.',
    mensajeAcompanamiento:
      'Los desempeños oficiales son referencia institucional. Los sugeridos requieren revisión académica antes de consolidarse en el sílabo.',
    instruccion:
      'Revise los desempeños, confirme su alineamiento o registre observaciones y ajustes antes de continuar.',
  },
  '/creator/contenido': {
    pantalla: 6,
    paso: 'Paso 6 de 8',
    titulo: 'Propuesta de contenido formativo',
    mensajePrincipal:
      'El sistema propone habilidades y conocimientos derivados del propósito validado y las fuentes activas del curso.',
    mensajeAcompanamiento:
      'La propuesta se construye desde los desempeños confirmados, las fuentes documentales y la biblioteca institucional de habilidades.',
    instruccion:
      'Revise la propuesta derivada, confirme lo pertinente y ajuste lo necesario antes de seleccionar el método.',
  },
  '/creator/metodo': {
    pantalla: 7,
    paso: 'Paso 7 de 8',
    titulo: 'Método y secuencia didáctica',
    mensajePrincipal:
      'El sistema propone el método más pertinente para operativizar el propósito y el contenido del sílabo.',
    mensajeAcompanamiento:
      'La propuesta incluye método troncal, apoyos complementarios y relación entre método, actividades y evidencias.',
    instruccion:
      'Revise el método sugerido, confirme su pertinencia y ajuste la propuesta antes de pasar al bloque de evaluación.',
  },
  '/creator/evaluacion': {
    pantalla: 8,
    paso: 'Paso 8 de 8',
    titulo: 'Evaluación y consistencia final',
    mensajePrincipal:
      'El sistema articula evidencias, instrumentos y sistema de calificación para cerrar la coherencia curricular del sílabo.',
    mensajeAcompanamiento:
      'Se verifica el alineamiento entre desempeños, habilidades, método, actividades, evidencias e instrumentos.',
    instruccion:
      'Revise la tabla de evaluación, valide porcentajes y asegúrese de que la propuesta responde al método y al tipo de aprendizaje.',
  },
  '/creator/cierre': {
    pantalla: 8,
    paso: 'Cierre',
    titulo: 'Validación y publicación',
    mensajePrincipal:
      'El sistema ensambla la versión final del sílabo y prepara su apertura en el editor o su envío a revisión académica.',
    mensajeAcompanamiento:
      'Este es el momento para revisar el resumen de bloques antes de cerrar la fase de creación.',
    instruccion:
      'Verifica cada bloque, corrige lo necesario y confirma la versión final antes de enviarlo a revisión o abrirlo en el editor.',
  },
  '/catalog': {
    pantalla: 4,
    paso: 'Catálogo',
    titulo: 'Catálogo de cursos',
    mensajePrincipal: 'Consulta el repositorio de cursos disponibles en el programa.',
    mensajeAcompanamiento: 'Explora sílabos existentes como referencia.',
    instruccion: 'Selecciona un curso para ver su detalle o usar como plantilla.',
  },
  '/syllabi': {
    pantalla: 5,
    paso: 'Paso 5 de 8',
    titulo: 'Desempeños oficiales o sugeridos',
    mensajePrincipal:
      'En este paso, el sistema le presenta los desempeños oficiales disponibles y, cuando no existan o estén incompletos, le propone desempeños sugeridos construidos a partir de la sumilla, la competencia y la capacidad o resultado de aprendizaje.',
    mensajeAcompanamiento:
      'Los desempeños oficiales se mantienen como referencia institucional. Los desempeños sugeridos por el sistema requieren revisión y validación académica antes de consolidarse en el sílabo.',
    instruccion:
      'Si existen desempeños oficiales, revíselos y confirme su alineamiento. Si el sistema le presenta desempeños sugeridos, analícelos cuidadosamente, valide su pertinencia o registre observaciones y ajustes antes de continuar.',
  },
  '/editor': {
    pantalla: 8,
    paso: 'Paso 8 de 8',
    titulo: 'Evaluación, validación y publicación',
    mensajePrincipal:
      'En este paso, el sistema le propone la articulación final del sílabo mediante evidencias, instrumentos, sistema de calificación y validación automática de coherencia curricular, didáctica y metodológica.',
    mensajeAcompanamiento:
      'Aquí se verifica el alineamiento entre sumilla, competencia y desempeños; desempeños y habilidades; habilidades y evidencias; método y actividades; evidencias e instrumentos; y la consistencia del sistema de calificación.',
    instruccion:
      'Revise la propuesta final de evidencias, instrumentos y sistema de calificación. Verifique los resultados de la validación automática. Si todo está conforme, confirme la versión final del sílabo y envíelo a revisión académica o publíquelo según su rol.',
  },
  '/dashboard': {
    pantalla: 1,
    paso: 'Panel principal',
    titulo: 'Bienvenido a SIGESIL',
    mensajePrincipal:
      'Aquí puede revisar sus sílabos recientes, iniciar un nuevo proceso de elaboración o acceder al repositorio de sílabos del programa.',
    mensajeAcompanamiento: 'Sistema de Gestión Inteligente de Sílabos – UNPRG.',
    instruccion:
      'Seleccione una acción del panel para continuar. Para crear un nuevo sílabo, use el botón "Crear Sílabo".',
  },
};

export function getPanelMessage(pathname: string): PanelMessage {
  return (
    PANEL_MESSAGES[pathname] ?? {
      pantalla: 0,
      paso: '',
      titulo: 'SIGESIL UNPRG',
      mensajePrincipal: 'Sistema de Gestión Inteligente de Sílabos.',
      mensajeAcompanamiento: 'Innovación curricular para una docencia de calidad.',
      instruccion: 'Navegue usando el menú lateral.',
    }
  );
}
