# services/bibliography_parser.py
# Parsea el texto de un PDF/MD exportado desde NotebookLM.
# Extrae la sección REFERENCIAS BIBLIOGRÁFICAS y devuelve una lista limpia.

import re
import logging

logger = logging.getLogger(__name__)

# ── Detecta el encabezado de la sección ──────────────────────────────────────
# Acepta:
#   - Con/sin acento:  BIBLIOGRÁFICAS / BIBLIOGRAFICAS  (PyPDF2 a veces pierde tildes)
#   - Con markdown:    ## REFERENCIAS ...
#   - Con numeral:     XI. REFERENCIAS ...
#   - Sin \n al final: heading pegado a la primera referencia
_PATRON_SECCION = re.compile(
    r'(?:#{1,6}\s*)?(?:[IVXLCDM]+\.?\s+)?'
    r'REFERENCIAS\s+BIBLIOGR[AÁaá]FICAS?\s*',
    re.IGNORECASE | re.UNICODE,
)

# ── Detecta inicio de referencia APA al comienzo de una línea ────────────────
# Después del pre-procesamiento las líneas ya deberían empezar por el autor/año.
_PATRON_NUEVA_REF = re.compile(
    r"""(?x)
    (?:
        ^\d+[\.\-\)]\s+[A-ZÁÉÍÓÚÜÑ]                    # 1. Autor  o  1) Autor

        | ^[A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\-]{1,}           # Apellido (mayúsculas internas/guiones OK)
          (?:.+\(\d{4}[a-z]?\)|.+\(s\.f\.\))            # ... seguido de año entre paréntesis

        | ^[A-ZÁÉÍÓÚÜÑ]{2,}\.?\s*\(\d{4}               # SIGLA. (2025) — institución en siglas
    )
    """,
    re.MULTILINE,
)

# Detecta la siguiente sección en Markdown
_PATRON_SIGUIENTE_SECCION = re.compile(r'\n#{1,6}\s+\S', re.MULTILINE)


def _insertar_saltos_entre_refs(texto: str) -> str:
    """
    Pre-procesa texto extraído de PDF donde las referencias van pegadas sin
    separadores. Estrategia en dos pasos:

    1. Colapsar saltos de línea de word-wrap (PDF) en espacios, preservando
       dobles saltos reales (párrafos Markdown).
    2. Insertar '\\n' antes de cada inicio de referencia APA detectado.
    """
    # ── Paso 1: de-wrap del PDF ───────────────────────────────────────────────
    texto = re.sub(r'(?<!\n)\n(?!\n)', ' ', texto)

    # ── Paso 2a: .Apellido [Compuesto], I.  →  .\\n... ───────────────────────
    # Cubre apellidos simples, compuestos con espacio y con guión (García-Bermejo)
    # [A-Za-z...] en el interior del apellido permite mayúsculas como en "García-Bermejo"
    texto = re.sub(
        r'\.([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\-]+'
        r'(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\-]+)*'
        r',\s+[A-Z][\.\,])',
        r'.\n\1',
        texto,
    )

    # ── Paso 2b: .SIGLA. (año)  →  .\\n... ──────────────────────────────────
    # Instituciones en siglas: UNED, UNESCO, etc.
    texto = re.sub(
        r'\.([A-ZÁÉÍÓÚÜÑ]{2,}\.?\s*\(\d{4})',
        r'.\n\1',
        texto,
    )

    # ── Paso 2c: dígitos_+Apellido, I.  →  dígitos\\n... ────────────────────
    # Después de un DOI/número de página: "13030113Insuasti, J."
    texto = re.sub(
        r'(\d{3,})([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\-]+'
        r'(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ\-]+)*'
        r',\s+[A-Z][\.\,])',
        r'\1\n\2',
        texto,
    )

    # ── Paso 2d: .Nombre Propio Multi-Palabra. (año) ─────────────────────────
    # Instituciones con nombre compuesto: "La Salle Campus Barcelona. (2026)"
    # Requiere al menos 2 palabras con mayúscula y año final.
    texto = re.sub(
        r'\.([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ]+'
        r'(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñ]+)+'
        r'\.?\s*\(\d{4})',
        r'.\n\1',
        texto,
    )

    return texto


def parsear_referencias_bibliograficas(texto: str) -> list[str]:
    """
    Extrae las referencias de la sección REFERENCIAS BIBLIOGRÁFICAS del texto.

    Compatible con:
    - PDFs exportados de Google Docs (PyPDF2): refs concatenadas sin saltos
    - Archivos Markdown de NotebookLM: refs separadas por líneas en blanco
    - TXT plano con sección en mayúsculas
    """
    if not texto:
        return []

    texto = texto.replace('\r\n', '\n').replace('\r', '\n')

    match = _PATRON_SECCION.search(texto)
    if not match:
        logger.warning("No se encontró la sección REFERENCIAS BIBLIOGRÁFICAS en el texto")
        return []

    texto_seccion = texto[match.end():]

    # Cortar al llegar a la siguiente sección Markdown
    match_sig = _PATRON_SIGUIENTE_SECCION.search(texto_seccion)
    if match_sig:
        texto_seccion = texto_seccion[:match_sig.start()]

    # Limpiar marcas Markdown
    texto_seccion = re.sub(r'\*{1,3}([^*\n]+)\*{1,3}', r'\1', texto_seccion)
    texto_seccion = re.sub(r'_{1,3}([^_\n]+)_{1,3}', r'\1', texto_seccion)
    texto_seccion = re.sub(r'`[^`\n]+`', '', texto_seccion)

    # ── Pre-procesar para PDF: insertar saltos entre refs concatenadas ────────
    texto_seccion = _insertar_saltos_entre_refs(texto_seccion)

    lineas = texto_seccion.split('\n')
    referencias: list[str] = []
    bloque_actual: list[str] = []

    def _flush():
        if bloque_actual:
            ref = ' '.join(bloque_actual).strip()
            ref = re.sub(r'\s{2,}', ' ', ref)
            if len(ref) > 20:
                referencias.append(ref)
        bloque_actual.clear()

    for linea in lineas:
        linea_limpia = linea.strip()

        if not linea_limpia:
            _flush()
            continue

        if _PATRON_NUEVA_REF.match(linea_limpia):
            _flush()
            bloque_actual.append(linea_limpia)
        else:
            if bloque_actual:
                bloque_actual.append(linea_limpia)

    _flush()

    logger.info(f"Referencias bibliográficas extraídas: {len(referencias)}")
    return referencias


def detectar_tipo_referencia(ref_text: str) -> str:
    """Heurística para asignar tipo de fuente APA."""
    texto = ref_text.lower()
    if '[video]' in texto or 'youtube' in texto or 'youtu.be' in texto:
        return 'video'
    if re.search(r',\s*\d+\(\d+\)', texto) or 'doi.org' in texto:
        return 'articulo'
    if re.search(r'https?://', texto) and not re.search(
        r'pearson|mcgraw|springer|elsevier|alfaomega|paidós|paidos|fce|alianza|areces|prentice',
        texto,
    ):
        return 'web'
    return 'libro'


def refs_a_bibliografia_json(refs: list[str]) -> list[dict]:
    """Convierte lista de strings APA al formato {tipo, referencia} del sílabo."""
    return [{"tipo": detectar_tipo_referencia(r), "referencia": r} for r in refs]
