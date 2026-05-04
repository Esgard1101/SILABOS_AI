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
    paso: 'Paso 1 de 11',
    titulo: 'Bienvenida e ingreso',
    mensajePrincipal:
      'Plataforma academica impulsada por la Direccion de la Escuela Profesional de Educacion para transformar la elaboracion de silabos, fortalecer la coherencia curricular y elevar la calidad formativa con apoyo de inteligencia artificial.',
    mensajeAcompanamiento: 'Innovacion curricular para una docencia de calidad.',
    instruccion:
      'Revise la presentacion del sistema e ingrese con su cuenta institucional. A partir de su acceso, el sistema lo guiara paso a paso y le presentara propuestas que usted podra revisar, confirmar o ajustar antes de continuar.',
  },
  '/select-context': {
    pantalla: 2,
    paso: 'Paso 2 de 11',
    titulo: 'Contexto institucional y curso',
    mensajePrincipal:
      'En este paso, el sistema presenta la estructura institucional disponible para seleccionar el contexto academico desde el cual se elaborara el silabo.',
    mensajeAcompanamiento:
      'El sistema organizara su trabajo a partir de la ruta Universidad, Facultad, Escuela, Programa, Plan, Curso y Silabo.',
    instruccion:
      'Seleccione el programa, plan de estudios, curso y periodo academico. Confirme que la informacion corresponde al silabo que desea elaborar antes de continuar.',
  },
  '/creator/repositorio': {
    pantalla: 3,
    paso: 'Paso 3 de 11',
    titulo: 'Repositorio curricular oficial',
    mensajePrincipal:
      'El sistema propone como base de trabajo los componentes curriculares oficiales del curso: sumilla, competencia, capacidad, plantilla oficial y anexos institucionales.',
    mensajeAcompanamiento:
      'Estos componentes constituyen la base formal del silabo y se usan como ancla para las propuestas de los pasos siguientes.',
    instruccion:
      'Revise los componentes curriculares oficiales importados. Verifique sumilla, competencia, capacidad, plantilla y anexos antes de avanzar.',
  },
  '/creator/fuentes': {
    pantalla: 4,
    paso: 'Paso 4 de 11',
    titulo: 'Fuentes del curso',
    mensajePrincipal:
      'Construya la base documental del curso mediante carga docente y curaduria asistida por IA.',
    mensajeAcompanamiento:
      'Las fuentes activas respaldaran desempenos, contenido, metodo y contexto disciplinar para el programa progresivo.',
    instruccion:
      'Cargue sus fuentes o solicite sugerencias. Revise, seleccione y valide la base documental antes de continuar.',
  },
  '/creator/fuentes/notebook': {
    pantalla: 4,
    paso: 'Sub-paso Fuentes',
    titulo: 'Guia NotebookLM',
    mensajePrincipal:
      'NotebookLM funciona como cuaderno documental del curso para organizar fuentes y preparar referencias verificables.',
    mensajeAcompanamiento:
      'Use el roadmap visual para cargar fuentes, verificar el cuaderno y traer referencias a SIGEISIL.',
    instruccion:
      'Haga clic en cada tarjeta para ver imagen, mini video o prompt. Cuando termine, vuelva a Fuentes para cargar las referencias.',
  },
  '/creator/desempenos': {
    pantalla: 5,
    paso: 'Paso 5 de 11',
    titulo: 'Desempenos oficiales',
    mensajePrincipal:
      'El sistema presenta los desempenos oficiales y, cuando no existan, propone desempenos sugeridos desde la sumilla, competencia y capacidad del curso.',
    mensajeAcompanamiento:
      'Los desempenos oficiales se respetan como data curricular no manipulable; cada desempeno define una unidad del programa.',
    instruccion:
      'Revise los desempenos, confirme su alineamiento o registre observaciones antes de continuar.',
  },
  '/creator/contenido': {
    pantalla: 6,
    paso: 'Paso 6 de 11',
    titulo: 'Contenido formativo',
    mensajePrincipal:
      'El sistema propone habilidades y conocimientos derivados del proposito validado, los desempenos y las fuentes activas del curso.',
    mensajeAcompanamiento:
      'Esta matriz alimentara al motor progresivo, pero la redaccion didactica se construira por unidad mas adelante.',
    instruccion:
      'Revise habilidades y conocimientos. Ajuste lo necesario antes de seleccionar el metodo pedagogico.',
  },
  '/creator/metodo': {
    pantalla: 7,
    paso: 'Paso 7 de 11',
    titulo: 'Metodo y secuencia didactica',
    mensajePrincipal:
      'El sistema propone el metodo mas pertinente para operativizar el proposito, el contenido y el tipo de producto del curso.',
    mensajeAcompanamiento:
      'La seleccion metodologica orienta fases, tecnicas y tono docente del motor de triple coherencia.',
    instruccion:
      'Revise el metodo sugerido, confirme su pertinencia y ajuste la propuesta antes de definir el producto integrador.',
  },
  '/creator/producto': {
    pantalla: 8,
    paso: 'Paso 8 de 11',
    titulo: 'Producto integrador',
    mensajePrincipal:
      'Antes de redactar las semanas, el sistema fija el horizonte del curso mediante propuestas de producto acreditable y linea de tiempo PA.',
    mensajeAcompanamiento:
      'Este paso evita actividades sueltas: cada unidad debe aportar un avance verificable hacia el mismo producto final.',
    instruccion:
      'Seleccione una categoria, genere opciones y elija el producto que mejor represente el aprendizaje esperado del curso.',
  },
  '/creator/evaluacion': {
    pantalla: 9,
    paso: 'Paso 9 de 11',
    titulo: 'Sistema de evaluacion',
    mensajePrincipal:
      'El sistema define pesos, siglas y semanas de entrega antes de redactar el programa para que la cronologia quede anclada a evidencias reales.',
    mensajeAcompanamiento:
      'Los hitos PA orientan la secuencia de cada unidad y ayudan al validador a revisar coherencia formativa.',
    instruccion:
      'Revise la tabla de evaluacion, valide porcentajes y confirme que cada unidad tenga un avance acreditable claro.',
  },
  '/creator/programa': {
    pantalla: 10,
    paso: 'Paso 10 de 11',
    titulo: 'Programa progresivo',
    mensajePrincipal:
      'Trabaje cada unidad en dos pantallas:\n1. Contexto docente obligatorio: pegue el resumen de NotebookLM o sus apuntes de unidad.\n2. Sugerencia IA: genere, revise, edite, bloquee semanas y apruebe la unidad.',
    mensajeAcompanamiento:
      'Triple coherencia: cada actividad debe cruzar fase del metodo, operacion sobre conocimiento, habilidad, tecnica y evidencia verificable.',
    instruccion:
      'Uso recomendado:\n1. Copie el prompt de NotebookLM.\n2. Pegue el resumen o apuntes de la unidad.\n3. Guarde el contexto y pase a sugerencia IA.\n4. Genere y revise la tabla.\n5. Fije semanas aprobadas y regenere solo si necesita otro enfoque.',
  },
  '/creator/cierre': {
    pantalla: 11,
    paso: 'Paso 11 de 11',
    titulo: 'Ensamblaje final',
    mensajePrincipal:
      'El sistema consolida las unidades aprobadas en el silabo final y prepara la vista completa para entrega o edicion.',
    mensajeAcompanamiento:
      'Solo se ensambla contenido aprobado, conservando semanas bloqueadas, producto integrador y sistema de evaluacion.',
    instruccion:
      'Verifique que las unidades esten aprobadas. Luego ensamble el programa y abra la entrega final.',
  },
  '/catalog': {
    pantalla: 4,
    paso: 'Catalogo',
    titulo: 'Catalogo de cursos',
    mensajePrincipal: 'Consulta el repositorio de cursos disponibles en el programa.',
    mensajeAcompanamiento: 'Explora silabos existentes como referencia.',
    instruccion: 'Selecciona un curso para ver su detalle o usar como plantilla.',
  },
  '/syllabi': {
    pantalla: 5,
    paso: 'Desempenos',
    titulo: 'Desempenos oficiales o sugeridos',
    mensajePrincipal:
      'El sistema presenta desempenos oficiales disponibles y desempenos sugeridos cuando la informacion curricular este incompleta.',
    mensajeAcompanamiento:
      'Los desempenos sugeridos requieren revision academica antes de consolidarse en el silabo.',
    instruccion:
      'Revise, confirme o ajuste los desempenos antes de continuar con el diseno curricular.',
  },
  '/editor': {
    pantalla: 11,
    paso: 'Editor',
    titulo: 'Edicion y publicacion',
    mensajePrincipal:
      'Revise la version final del silabo con sus evidencias, actividades, evaluacion y validacion curricular.',
    mensajeAcompanamiento:
      'Aqui puede ajustar el documento final antes de enviarlo a revision academica o publicarlo segun su rol.',
    instruccion:
      'Verifique el documento completo, corrija lo necesario y confirme la version final.',
  },
  '/dashboard': {
    pantalla: 1,
    paso: 'Panel principal',
    titulo: 'Bienvenido a SIGEISIL',
    mensajePrincipal:
      'Aqui puede revisar sus silabos recientes, iniciar un nuevo proceso de elaboracion o acceder al repositorio de silabos del programa.',
    mensajeAcompanamiento: 'Sistema de Gestion Inteligente de Silabos - UNPRG.',
    instruccion:
      'Seleccione una accion del panel para continuar. Para crear un nuevo silabo, use el boton Crear Silabo.',
  },
};

export function getPanelMessage(pathname: string): PanelMessage {
  return (
    PANEL_MESSAGES[pathname] ?? {
      pantalla: 0,
      paso: '',
      titulo: 'SIGEISIL UNPRG',
      mensajePrincipal: 'Sistema de Gestion Inteligente de Silabos.',
      mensajeAcompanamiento: 'Innovacion curricular para una docencia de calidad.',
      instruccion: 'Navegue usando el menu lateral.',
    }
  );
}
