# pdf_parser.py — Normaliza bibliografía subida por el docente desde NotebookLM
# Input:  archivo (PDF o MD/TXT) + metadata {course_id, program_id, scope}
# Output: texto limpio → pasa a rag_service para indexar

import io
import logging

logger = logging.getLogger(__name__)


def extraer_texto_pdf(file_bytes: bytes) -> str:
    """Extrae texto de un PDF usando pdfplumber (preferido) o PyPDF2 como fallback."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            paginas = []
            for pagina in pdf.pages:
                texto = pagina.extract_text()
                if texto:
                    paginas.append(texto)
        return "\n\n".join(paginas)
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"pdfplumber falló: {e}. Intentando PyPDF2...")

    # Fallback a PyPDF2
    try:
        import PyPDF2
        lector = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        paginas = []
        for num, pagina in enumerate(lector.pages):
            try:
                texto = pagina.extract_text()
                if texto:
                    paginas.append(texto)
            except Exception as e:
                logger.warning(f"No se pudo extraer página {num}: {e}")
        return "\n\n".join(paginas)
    except Exception as e:
        logger.error(f"Error extrayendo PDF con PyPDF2: {e}")
        return ""


def extraer_texto_markdown(file_bytes: bytes) -> str:
    """Decodifica un archivo Markdown/texto plano a string."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1")
        except Exception as e:
            logger.error(f"Error decodificando archivo de texto: {e}")
            return ""


def parsear_archivo(file_bytes: bytes, content_type: str) -> str:
    """
    Detecta el tipo de archivo y extrae su texto.
    Retorna el texto limpio listo para indexar en RAG.

    Tipos soportados:
    - application/pdf
    - text/markdown, text/plain, application/octet-stream (archivos .md)
    """
    ct = (content_type or "").lower()

    if "pdf" in ct:
        logger.info("Parseando como PDF...")
        texto = extraer_texto_pdf(file_bytes)
    elif "markdown" in ct or "plain" in ct or "octet" in ct:
        logger.info("Parseando como Markdown/texto...")
        texto = extraer_texto_markdown(file_bytes)
    else:
        # Intento automático: primero PDF, luego texto
        logger.info(f"Content-type desconocido '{content_type}'. Intentando PDF...")
        texto = extraer_texto_pdf(file_bytes)
        if not texto:
            logger.info("PDF vacío, intentando como texto...")
            texto = extraer_texto_markdown(file_bytes)

    if texto:
        logger.info(f"Texto extraído: {len(texto)} caracteres")
    else:
        logger.warning("No se pudo extraer texto del archivo")

    return texto
