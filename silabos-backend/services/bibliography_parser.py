# services/bibliography_parser.py
# Parsea referencias exportadas desde NotebookLM y centraliza su normalizacion.

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

_PLACEHOLDER_VALUES = {
    "",
    "-",
    "--",
    "?",
    "anonimo",
    "anonymous",
    "author",
    "authors",
    "autor",
    "autor(es)",
    "autores",
    "desconocido",
    "n/a",
    "na",
    "nd",
    "ninguno",
    "none",
    "null",
    "por definir",
    "s/d",
    "sin autor",
    "sin autores",
    "sin dato",
    "sin datos",
    "sin informacion",
    "sin título",
    "sin titulo",
    "tbd",
    "title",
    "titulo",
    "unknown",
    "unk",
}

_DOC_HINTS = (
    "api",
    "developer",
    "developers",
    "documentation",
    "documentacion",
    "docs",
    "especificacion",
    "guide",
    "guia",
    "manual",
    "readme",
    "reference",
    "sdk",
    "specification",
)
_THESIS_HINTS = (
    "dissertation",
    "doctoral",
    "doctorado",
    "master thesis",
    "maestria",
    "phd",
    "tesis",
    "tesina",
    "thesis",
)
_BOOK_HINTS = (
    "editorial",
    "edition",
    "edicion",
    "fundamentos",
    "handbook",
    "introduction",
    "introduccion",
    "isbn",
    "pearson",
    "press",
    "principles",
    "publisher",
    "springer",
    "textbook",
)
_ARTICLE_HINTS = (
    "article",
    "articulo",
    "journal",
    "revista",
)
_VIDEO_HINTS = (
    "[video]",
    "vimeo",
    "video",
    "youtube",
    "youtu.be",
)

_PATTERN_SECTION = re.compile(
    r"(?im)(?:^|\n)\s*(?:#{1,6}\s*)?(?:[IVXLCDM]+\.?\s+)?"
    r"(?:REFERENCIAS(?:\s+BIBLIOGR[AÁaá]FICAS?)?|BIBLIOGRAF[IÍií]A|FUENTES\s+CONSULTADAS|REFERENCES)"
    r"\s*:?\s*"
)
_PATTERN_INLINE_SECTION = re.compile(
    r"(?i)\b(?:REFERENCIAS(?:\s+BIBLIOGR[A-ZÃa-zÃ¡]FICAS?)?|BIBLIOGRAF[IÃiÃ­]A|FUENTES\s+CONSULTADAS|REFERENCES)\b\s*:?\s*"
)
_PATTERN_NEXT_SECTION = re.compile(
    r"\n\s*(?:#{1,6}\s+\S|(?:[IVXLCDM]+\.?\s+)?(?:ANEXOS?|AP[EÉ]NDICES?|CONCLUSIONES?|NOTAS?|ABSTRACT|INTRODUCCI[OÓ]N|RESULTADOS|DISCUSI[OÓ]N)\b)",
    re.IGNORECASE,
)
_PATTERN_NEW_REF = re.compile(
    r"""(?x)
    ^
    (?:
        [A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-]{1,}
        .*?\((?:\d{4}[a-z]?|s\.f\.|n\.d\.)\)
        |
        [A-ZÁÉÍÓÚÜÑ]{2,}\.?\s*\((?:\d{4}[a-z]?|s\.f\.|n\.d\.)\)
    )
    """,
    re.IGNORECASE,
)
_PATTERN_DOI = re.compile(
    r"(?:https?://(?:dx\.)?doi\.org/|doi:\s*)(10\.\d{4,9}/[-._;()/:A-Z0-9]+)",
    re.IGNORECASE,
)
_PATTERN_URL = re.compile(r"(https?://[^\s<>\"]+|www\.[^\s<>\"]+)", re.IGNORECASE)
_PATTERN_YEAR = re.compile(r"\((\d{4})([a-z]?)\)|\((s\.f\.|n\.d\.)\)", re.IGNORECASE)


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _strip_trailing_punctuation(value: str) -> str:
    return (value or "").rstrip(".,;:)]}>")


def _normalize_key(value: Any) -> str:
    text = _collapse_spaces(str(value or "")).strip(" .,:;[](){}").lower()
    return text


def _is_placeholder_text(value: Any) -> bool:
    key = _normalize_key(value)
    if not key:
        return True

    if key in _PLACEHOLDER_VALUES:
        return True

    token_text = re.sub(r"[^a-z0-9]+", " ", key)
    tokens = [token for token in token_text.split() if token]
    placeholder_tokens = {
        "a",
        "anonimo",
        "anonymous",
        "author",
        "authors",
        "autor",
        "autores",
        "dato",
        "datos",
        "desconocido",
        "n",
        "na",
        "none",
        "null",
        "sin",
        "title",
        "titulo",
        "unknown",
        "unk",
    }
    return bool(tokens) and all(token in placeholder_tokens for token in tokens)


def _clean_text_value(value: Any) -> str | None:
    if value is None:
        return None

    text = _collapse_spaces(str(value))
    if not text:
        return None

    if _is_placeholder_text(text):
        return None

    return text


def _pick_first_text(*values: Any) -> str | None:
    for value in values:
        cleaned = _clean_text_value(value)
        if cleaned:
            return cleaned
    return None


def normalize_year(value: Any) -> int | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value if 1000 <= value <= 2100 else None

    text = _clean_text_value(value)
    if not text:
        return None

    normalized = _normalize_key(text)
    if normalized in {"s.f", "s.f.", "n.d", "n.d."}:
        return None

    match = re.search(r"(19|20)\d{2}", text)
    if not match:
        return None

    year = int(match.group(0))
    return year if 1000 <= year <= 2100 else None


def normalize_doi(value: Any) -> str | None:
    text = _clean_text_value(value)
    if not text:
        return None

    text = _strip_trailing_punctuation(text)
    match = _PATTERN_DOI.search(text)
    if match:
        return _strip_trailing_punctuation(match.group(1)).lower()

    candidate = re.sub(
        r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    candidate = _strip_trailing_punctuation(candidate)
    if re.match(r"^10\.\d{4,9}/\S+$", candidate, flags=re.IGNORECASE):
        return candidate.lower()
    return None


def normalize_url(value: Any) -> str | None:
    text = _clean_text_value(value)
    if not text:
        return None

    text = _strip_trailing_punctuation(text)
    match = _PATTERN_URL.search(text)
    if match:
        text = match.group(1)

    if text.lower().startswith("www."):
        text = f"https://{text}"

    if text.lower().startswith("doi.org/"):
        text = f"https://{text}"

    if not re.match(r"^https?://", text, flags=re.IGNORECASE):
        return None

    return _strip_trailing_punctuation(text)


def _normalize_author_name(value: Any) -> str | None:
    text = _clean_text_value(value)
    if not text:
        return None

    text = re.sub(r"^(?:&|y|and)\s+", "", text, flags=re.IGNORECASE)
    text = text.strip(" ,;")
    if not text or _normalize_key(text) in _PLACEHOLDER_VALUES:
        return None

    if len(text) < 2 or re.fullmatch(r"[\W\d_]+", text):
        return None

    return text


def _extract_authors_from_string(value: str) -> list[str]:
    text = _collapse_spaces(value)
    if not text:
        return []

    text = re.sub(r"\bet al\.\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+(?:&|y|and)\s+", "; ", text, flags=re.IGNORECASE)

    author_chunks = re.findall(
        r"[A-ZÁÉÍÓÚÜÑ][^;]+?,\s*(?:[A-ZÁÉÍÓÚÜÑ]\.\s*){1,4}",
        text,
    )
    if author_chunks:
        return [_normalize_author_name(chunk) for chunk in author_chunks if _normalize_author_name(chunk)]

    if ";" in text:
        return [_normalize_author_name(part) for part in text.split(";") if _normalize_author_name(part)]

    cleaned = _normalize_author_name(text)
    return [cleaned] if cleaned else []


def normalize_authors(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        return _extract_authors_from_string(value)

    if isinstance(value, (list, tuple, set)):
        authors: list[str] = []
        for item in value:
            cleaned = _normalize_author_name(item)
            if cleaned and cleaned not in authors:
                authors.append(cleaned)
        return authors

    cleaned = _normalize_author_name(value)
    return [cleaned] if cleaned else []


def normalize_type_label(value: Any) -> str | None:
    text = _normalize_key(value)
    if not text:
        return None

    aliases = {
        "article": "articulo",
        "articulo": "articulo",
        "journal article": "articulo",
        "libro": "libro",
        "book": "libro",
        "tesis": "tesis",
        "thesis": "tesis",
        "dissertation": "tesis",
        "documentacion": "documentacion",
        "documentation": "documentacion",
        "manual": "documentacion",
        "guide": "documentacion",
        "web": "web_academica",
        "web academica": "web_academica",
        "web_academica": "web_academica",
        "website": "web_academica",
        "video": "video",
    }
    return aliases.get(text)


def infer_reference_type(
    *,
    ref_text: str = "",
    title: str | None = None,
    url: str | None = None,
    doi: str | None = None,
    source: str | None = None,
    type_hint: Any = None,
) -> str | None:
    hinted = normalize_type_label(type_hint)

    normalized_url = normalize_url(url)
    normalized_doi = normalize_doi(doi)
    source_text = _normalize_key(source)
    text = " ".join(
        filter(
            None,
            [
                _clean_text_value(title) or "",
                _clean_text_value(ref_text) or "",
                normalized_url or "",
                f"https://doi.org/{normalized_doi}" if normalized_doi else "",
            ],
        )
    ).lower()

    if any(token in text for token in _VIDEO_HINTS):
        return "video"

    if any(token in text for token in _THESIS_HINTS):
        return "tesis"

    if any(token in text for token in _DOC_HINTS) or (
        normalized_url
        and re.search(r"(?:docs\.|/docs?/|developers?\.|developer\.)", normalized_url, flags=re.IGNORECASE)
    ):
        return "documentacion"

    if (
        normalized_doi
        or source_text in {"openalex", "scielo"}
        or any(token in text for token in _ARTICLE_HINTS)
        or re.search(r",\s*\d+\s*\(\d+\)", text)
    ):
        return "articulo"

    if any(token in text for token in _BOOK_HINTS):
        return "libro"

    if normalized_url:
        return "web_academica"

    if hinted:
        return hinted

    return "libro" if text else None


def build_reference_display(
    *,
    title: str | None,
    authors: list[str] | None = None,
    year: int | None = None,
    fallback: str | None = None,
) -> str:
    title_text = _clean_text_value(title)
    author_list = normalize_authors(authors)
    year_text = str(year) if year else "s.f."

    if author_list and title_text:
        author_display = author_list[0]
        if len(author_list) > 1:
            author_display = f"{author_display} et al."
        return f"{author_display} ({year_text}). {title_text}"

    if title_text:
        return title_text

    return _clean_text_value(fallback) or ""


def build_fallback_apa(
    *,
    title: str | None,
    authors: list[str] | None = None,
    year: int | None = None,
    doi: str | None = None,
    url: str | None = None,
) -> str:
    author_list = normalize_authors(authors)
    title_text = _clean_text_value(title)
    year_text = str(year) if year else "s.f."

    if len(author_list) == 1:
        author_text = author_list[0]
    elif len(author_list) == 2:
        author_text = f"{author_list[0]}, & {author_list[1]}"
    elif len(author_list) > 2:
        author_text = f"{author_list[0]}, et al."
    else:
        author_text = ""

    parts: list[str] = []
    if author_text:
        parts.append(author_text)
    parts.append(f"({year_text}).")
    if title_text:
        parts.append(f"{title_text}.")

    normalized_doi = normalize_doi(doi)
    normalized_url = normalize_url(url)
    if normalized_doi:
        parts.append(f"https://doi.org/{normalized_doi}")
    elif normalized_url:
        parts.append(normalized_url)

    return _collapse_spaces(" ".join(parts))


def normalize_reference_metadata(
    reference: dict[str, Any] | None,
    *,
    fallback: dict[str, Any] | None = None,
) -> dict[str, Any]:
    reference = reference or {}
    fallback = fallback or {}

    title = _pick_first_text(reference.get("title"), fallback.get("title"))
    ref_text = _pick_first_text(reference.get("ref_text"), fallback.get("ref_text"), reference.get("apa_format"))
    authors = normalize_authors(reference.get("authors"))
    if not authors:
        authors = normalize_authors(fallback.get("authors"))

    year = normalize_year(reference.get("year"))
    if year is None:
        year = normalize_year(fallback.get("year"))

    doi = normalize_doi(reference.get("doi"))
    if not doi:
        doi = normalize_doi(fallback.get("doi"))

    url = normalize_url(reference.get("url"))
    if not url:
        url = normalize_url(fallback.get("url"))

    source = _pick_first_text(reference.get("source"), fallback.get("source"))
    verified = bool(doi or url)

    apa_format = _pick_first_text(reference.get("apa_format"), fallback.get("apa_format"))
    if not apa_format:
        apa_format = build_fallback_apa(
            title=title,
            authors=authors,
            year=year,
            doi=doi,
            url=url,
        )

    ref_type = infer_reference_type(
        ref_text=apa_format or ref_text or title or "",
        title=title,
        url=url,
        doi=doi,
        source=source,
        type_hint=reference.get("type") or fallback.get("type"),
    )
    display_text = _pick_first_text(reference.get("display_text"), fallback.get("display_text"))
    if not display_text:
        display_text = build_reference_display(
            title=title,
            authors=authors,
            year=year,
            fallback=apa_format or ref_text,
        )

    normalized = {
        "apa_format": apa_format,
        "title": title,
        "authors": authors,
        "year": year,
        "type": ref_type,
        "display_text": display_text,
        "doi": doi,
        "url": url,
        "source": source,
        "verified": verified,
    }

    for extra_key in ("ref_text", "doc_id", "course_id", "ref_order", "created_at"):
        value = reference.get(extra_key, fallback.get(extra_key))
        if value is not None:
            normalized[extra_key] = value

    return normalized


def _insert_line_breaks_between_refs(text: str) -> str:
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    text = re.sub(
        r"(https?://\S+)\s+([A-Z][^,]{1,80},\s*[A-Z])",
        r"\1\n\2",
        text,
    )
    text = re.sub(
        r"\.([A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-]+(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-]+)*,\s+[A-Z][\.,])",
        r".\n\1",
        text,
    )
    text = re.sub(
        r"\.([A-ZÁÉÍÓÚÜÑ]{2,}\.?\s*\((?:\d{4}|s\.f\.|n\.d\.)\))",
        r".\n\1",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(\d{3,})([A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-]+(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\-]+)*,\s+[A-Z][\.,])",
        r"\1\n\2",
        text,
    )
    text = re.sub(
        r"\.([A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+\.?\s*\((?:\d{4}|s\.f\.|n\.d\.)\))",
        r".\n\1",
        text,
        flags=re.IGNORECASE,
    )
    return text


def _extract_reference_section(text: str) -> str:
    matches = list(_PATTERN_SECTION.finditer(text))
    match = matches[-1] if matches else None
    if not match:
        inline_matches = list(_PATTERN_INLINE_SECTION.finditer(text))
        match = inline_matches[-1] if inline_matches else None

    if not match:
        compact = text[:5000]
        year_hits = len(_PATTERN_YEAR.findall(compact))
        link_hits = len(_PATTERN_URL.findall(compact)) + len(_PATTERN_DOI.findall(compact))
        if year_hits >= 2 and link_hits >= 1:
            logger.info("No se encontro encabezado; se usara el texto completo como bibliografia.")
            return text

        logger.warning("No se encontro una seccion de referencias reconocible.")
        return ""

    section = text[match.end():]
    next_section = _PATTERN_NEXT_SECTION.search(section)
    if next_section:
        section = section[: next_section.start()]
    return section


def _clean_reference_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"^>\s*", "", line)
    line = re.sub(r"^[-*•]+\s+", "", line)
    line = re.sub(r"^\d+[\.\-\)]\s+", "", line)
    return _collapse_spaces(line)


def _is_reference_start(line: str) -> bool:
    if not line:
        return False

    if _PATTERN_NEW_REF.match(line):
        return True

    if _PATTERN_YEAR.search(line) and ("," in line or "http" in line.lower() or "doi" in line.lower()):
        return True

    return False


def _dedupe_references(references: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for reference in references:
        cleaned = _collapse_spaces(reference)
        if not _is_valid_reference_entry(cleaned):
            logger.warning("Referencia descartada por formato invalido: %r", cleaned[:180])
            continue
        key = re.sub(r"[\W_]+", "", cleaned.lower())
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(cleaned)
    return deduped


def _is_valid_reference_entry(reference: str) -> bool:
    if not reference or len(reference) < 20 or len(reference) > 700:
        return False

    lowered = reference.lower()
    if lowered.startswith("referencias bibliogr") or lowered.startswith("bibliogr"):
        return False

    if "•" in reference or "â€¢" in reference:
        return False

    if not _PATTERN_YEAR.search(reference):
        return False

    if _PATTERN_NEW_REF.match(reference):
        return True

    has_locator = bool(_PATTERN_URL.search(reference) or _PATTERN_DOI.search(reference))
    starts_like_author = bool(re.match(r"^[^,]{2,80},\s*\S", reference))
    return has_locator and starts_like_author


def _extract_title_from_reference(ref_text: str, year_match: re.Match[str] | None) -> str | None:
    remainder = ref_text[year_match.end() :] if year_match else ref_text
    remainder = remainder.strip(" .;-")
    if not remainder:
        return None

    remainder = re.sub(r"\s*(?:Recuperado de|Retrieved from)\s+.+$", "", remainder, flags=re.IGNORECASE)
    remainder = re.sub(r"\s*(?:https?://\S+|www\.\S+)\s*$", "", remainder, flags=re.IGNORECASE)
    remainder = re.sub(r"\s*doi:\s*10\.\S+\s*$", "", remainder, flags=re.IGNORECASE)
    remainder = _collapse_spaces(remainder)
    if not remainder:
        return None

    segments = [segment.strip(" .;") for segment in re.split(r"\.\s+", remainder) if segment.strip(" .;")]
    if not segments:
        return None

    candidate = segments[0]
    if len(segments) > 1 and (candidate.endswith(":") or len(candidate) < 18):
        second = segments[1]
        if not re.search(r"(?:journal|revista|editorial|press|doi|https?://)", second, flags=re.IGNORECASE):
            candidate = f"{candidate} {second}"

    return _clean_text_value(candidate)


def referencia_a_metadata(
    ref_text: str,
    *,
    doc_id: str | None = None,
    course_id: str | None = None,
    ref_order: int | None = None,
    created_at: Any = None,
) -> dict[str, Any]:
    reference_text = _collapse_spaces(ref_text or "")
    year_match = _PATTERN_YEAR.search(reference_text)
    author_part = reference_text[: year_match.start()].strip(" .;,-") if year_match else ""
    authors = normalize_authors(author_part)
    title = _extract_title_from_reference(reference_text, year_match)

    doi_match = _PATTERN_DOI.search(reference_text)
    doi = normalize_doi(doi_match.group(0) if doi_match else None)

    url_match = _PATTERN_URL.search(reference_text)
    url = normalize_url(url_match.group(0) if url_match else None)

    metadata = normalize_reference_metadata(
        {
            "apa_format": reference_text,
            "ref_text": reference_text,
            "title": title,
            "authors": authors,
            "year": normalize_year(year_match.group(0) if year_match else None),
            "doi": doi,
            "url": url,
            "doc_id": doc_id,
            "course_id": course_id,
            "ref_order": ref_order,
            "created_at": created_at,
        }
    )
    metadata["ref_text"] = reference_text
    return metadata


def refs_a_rows(
    refs: list[str],
    *,
    doc_id: str | None = None,
    course_id: str | None = None,
    created_at: Any = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, ref_text in enumerate(refs or []):
        if not _clean_text_value(ref_text):
            continue
        rows.append(
            referencia_a_metadata(
                ref_text,
                doc_id=doc_id,
                course_id=course_id,
                ref_order=index,
                created_at=created_at,
            )
        )
    return rows


def parsear_referencias_bibliograficas(texto: str) -> list[str]:
    """
    Extrae referencias desde PDFs/Markdown/TXT exportados por NotebookLM.
    """
    if not texto:
        return []

    normalized_text = texto.replace("\r\n", "\n").replace("\r", "\n")
    section = _extract_reference_section(normalized_text)
    if not section:
        return []

    section = re.sub(
        r"(?is)^.*?\b(?:REFERENCIAS\s+BIBLIOGR\S*|BIBLIOGR\S*|REFERENCES)\b\s*:?\s*",
        "",
        section,
    )
    section = re.sub(r"\*{1,3}([^*\n]+)\*{1,3}", r"\1", section)
    section = re.sub(r"_{1,3}([^_\n]+)_{1,3}", r"\1", section)
    section = re.sub(r"`[^`\n]+`", "", section)
    section = re.sub(
        r"(https?://\S+)\s+([A-Z][^,]{1,80},\s*[A-Z])",
        r"\1\n\2",
        section,
    )
    section = _insert_line_breaks_between_refs(section)

    references: list[str] = []
    current_block: list[str] = []

    def flush() -> None:
        if not current_block:
            return

        reference = _collapse_spaces(" ".join(current_block))
        if len(reference) > 20 and _PATTERN_YEAR.search(reference):
            references.append(reference)
        current_block.clear()

    for raw_line in section.split("\n"):
        line = _clean_reference_line(raw_line)
        if not line:
            flush()
            continue

        if _is_reference_start(line):
            flush()
            current_block.append(line)
            continue

        if current_block:
            current_block.append(line)
        elif _PATTERN_YEAR.search(line):
            current_block.append(line)

    flush()

    deduped = _dedupe_references(references)
    logger.info("Referencias bibliograficas extraidas: %s", len(deduped))
    return deduped


def detectar_tipo_referencia(ref_text: str) -> str:
    """Compatibilidad: retorna el tipo bibliografico inferido para una referencia APA."""
    return infer_reference_type(ref_text=ref_text) or "libro"


def refs_a_bibliografia_json(refs: list[str]) -> list[dict]:
    """
    Convierte una lista de referencias APA al formato legacy del silabo.
    Mantiene compatibilidad con consumidores que esperan un campo `referencia`.
    """
    type_aliases = {"web_academica": "web"}
    rows = refs_a_rows(refs)
    return [
        {
            "tipo": type_aliases.get(row.get("type") or "", row.get("type") or "otro"),
            "referencia": row.get("apa_format") or row.get("ref_text") or "",
        }
        for row in rows
    ]

