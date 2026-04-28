# Servicio de búsqueda bibliográfica en cascada
# Capas: OpenAlex → SciELO → Crossref
# OpenAlex y Crossref son gratuitos sin API key.
# SciELO ArticleMeta es público.

import difflib
import logging
from datetime import date

import httpx

logger = logging.getLogger(__name__)

# Polite pool — email de contacto para headers User-Agent
_CONTACT_EMAIL = "silabos-ai@unprg.edu.pe"
_RECENT_YEARS_WINDOW = 5


def _recent_publication_window(today: date | None = None) -> tuple[int, date]:
    """Return the inclusive publication window for recent academic sources."""
    today = today or date.today()
    return today.year - _RECENT_YEARS_WINDOW + 1, today


def _coerce_year(value) -> int | None:
    try:
        year = int(str(value or "").strip()[:4])
    except (TypeError, ValueError):
        return None
    return year if 1000 <= year <= 9999 else None


def _is_recent_reference(reference: dict, min_year: int, max_year: int) -> bool:
    year = _coerce_year(reference.get("year"))
    return year is not None and min_year <= year <= max_year


def _filter_recent_references(references: list[dict], min_year: int, max_year: int) -> list[dict]:
    recent = [ref for ref in references if _is_recent_reference(ref, min_year, max_year)]
    dropped = len(references) - len(recent)
    if dropped:
        logger.info(
            "Filtro bibliografico reciente: %s referencias descartadas fuera de %s-%s",
            dropped,
            min_year,
            max_year,
        )
    return recent


# ──────────────────────────────────────────────
# Capa 1 — OpenAlex
# ──────────────────────────────────────────────

async def _search_openalex(keywords: str, area: str, min_year: int, max_date: date) -> list[dict]:
    """Busca en OpenAlex (gratis, sin API key)."""
    try:
        query = f"{keywords} {area}".strip()
        params = {
            "search": query,
            "filter": f"from_publication_date:{min_year}-01-01,to_publication_date:{max_date.isoformat()}",
            "sort": "cited_by_count:desc",
            "per-page": 5,
            "select": "id,title,authorships,publication_year,doi,primary_location",
        }
        headers = {"User-Agent": f"SilabosAI/2.0 (mailto:{_CONTACT_EMAIL})"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.openalex.org/works",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for work in data.get("results", []):
            authors = []
            for authorship in work.get("authorships", [])[:3]:
                name = authorship.get("author", {}).get("display_name", "")
                if name:
                    authors.append(name)

            doi = work.get("doi", "") or ""
            if doi.startswith("https://doi.org/"):
                doi = doi.replace("https://doi.org/", "")

            primary_loc = work.get("primary_location") or {}
            url = primary_loc.get("landing_page_url") or (f"https://doi.org/{doi}" if doi else "")

            if not url:
                continue

            results.append({
                "title": work.get("title", ""),
                "authors": authors,
                "year": str(work.get("publication_year", "")),
                "source": "openalex",
                "doi": doi or None,
                "url": url,
                "abstract": None,
                "verified": True,
            })

        logger.info(f"OpenAlex: {len(results)} resultados para '{keywords}'")
        return results

    except Exception as e:
        logger.warning(f"OpenAlex falló: {e}")
        return []


# ──────────────────────────────────────────────
# Capa 2 — SciELO ArticleMeta
# ──────────────────────────────────────────────

async def _search_scielo(keywords: str) -> list[dict]:
    """Busca en SciELO ArticleMeta (API pública)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://articlemeta.scielo.org/api/v1/article/",
                params={"format": "json", "q": keywords},
            )
            response.raise_for_status()
            data = response.json()

        results = []
        articles = data if isinstance(data, list) else data.get("objects", [])
        for article in articles[:5]:
            titles = article.get("titles", {})
            if isinstance(titles, dict):
                title = next(iter(titles.values()), "")
            else:
                title = str(titles)

            authors_raw = article.get("authors", [])
            authors = []
            for a in authors_raw[:3]:
                if isinstance(a, dict):
                    name = f"{a.get('surname', '')} {a.get('given_names', '')}".strip()
                    if name:
                        authors.append(name)
                elif isinstance(a, str):
                    authors.append(a)

            pub_date = article.get("publication_date", "")
            year = str(pub_date)[:4] if pub_date else ""

            doi = article.get("doi") or None
            urls = article.get("urls", [])
            url = urls[0] if urls else (f"https://doi.org/{doi}" if doi else "")

            if not url or not title:
                continue

            results.append({
                "title": title,
                "authors": authors,
                "year": year,
                "source": "scielo",
                "doi": doi,
                "url": url,
                "abstract": None,
                "verified": True,
            })

        logger.info(f"SciELO: {len(results)} resultados para '{keywords}'")
        return results

    except Exception as e:
        logger.warning(f"SciELO falló: {e}")
        return []


# ──────────────────────────────────────────────
# Capa 3 — Crossref
# ──────────────────────────────────────────────

async def _search_crossref(keywords: str, min_year: int, max_date: date) -> list[dict]:
    """Busca en Crossref (gratis, sin API key)."""
    try:
        headers = {"User-Agent": f"SilabosAI/2.0 (mailto:{_CONTACT_EMAIL})"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.crossref.org/works",
                params={
                    "query.bibliographic": keywords,
                    "rows": 5,
                    "sort": "relevance",
                    "filter": f"from-pub-date:{min_year}-01-01,until-pub-date:{max_date.isoformat()}",
                    "select": "title,author,published,DOI,URL,abstract",
                },
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("message", {}).get("items", []):
            titles = item.get("title", [])
            title = titles[0] if titles else ""

            authors = []
            for a in item.get("author", [])[:3]:
                name = f"{a.get('family', '')} {a.get('given', '')}".strip()
                if name:
                    authors.append(name)

            published = item.get("published", {})
            date_parts = published.get("date-parts", [[""]])[0]
            year = str(date_parts[0]) if date_parts else ""

            doi = item.get("DOI") or None
            url = item.get("URL", "") or (f"https://doi.org/{doi}" if doi else "")

            if not url or not title:
                continue

            results.append({
                "title": title,
                "authors": authors,
                "year": year,
                "source": "crossref",
                "doi": doi,
                "url": url,
                "abstract": item.get("abstract") or None,
                "verified": True,
            })

        logger.info(f"Crossref: {len(results)} resultados para '{keywords}'")
        return results

    except Exception as e:
        logger.warning(f"Crossref falló: {e}")
        return []


async def resolve_doi(doi: str) -> dict | None:
    """Resuelve un DOI específico usando Crossref."""
    try:
        headers = {"User-Agent": f"SilabosAI/2.0 (mailto:{_CONTACT_EMAIL})"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.crossref.org/works/{doi}",
                headers=headers,
            )
            response.raise_for_status()
            item = response.json().get("message", {})

        titles = item.get("title", [])
        title = titles[0] if titles else ""

        authors = []
        for a in item.get("author", [])[:3]:
            name = f"{a.get('family', '')} {a.get('given', '')}".strip()
            if name:
                authors.append(name)

        published = item.get("published", {})
        date_parts = published.get("date-parts", [[""]])[0]
        year = str(date_parts[0]) if date_parts else ""
        url = item.get("URL", "") or f"https://doi.org/{doi}"

        return {
            "title": title,
            "authors": authors,
            "year": year,
            "source": "crossref",
            "doi": doi,
            "url": url,
            "abstract": item.get("abstract") or None,
            "verified": True,
        }
    except Exception as e:
        logger.warning(f"No se pudo resolver DOI {doi}: {e}")
        return None


# ──────────────────────────────────────────────
# Deduplicación
# ──────────────────────────────────────────────

def _deduplicate(references: list[dict]) -> list[dict]:
    """Elimina duplicados por DOI o por título similar (ratio > 0.85)."""
    seen_dois: set[str] = set()
    seen_titles: list[str] = []
    unique = []

    for ref in references:
        doi = ref.get("doi")
        if doi:
            if doi in seen_dois:
                continue
            seen_dois.add(doi)

        title = ref.get("title", "").lower().strip()
        is_duplicate = False
        for seen in seen_titles:
            if difflib.SequenceMatcher(None, title, seen).ratio() > 0.85:
                is_duplicate = True
                break

        if not is_duplicate:
            seen_titles.append(title)
            unique.append(ref)

    # Priorizar referencias con DOI verificable
    unique.sort(key=lambda x: (0 if x.get("doi") else 1))
    return unique[:15]


# ──────────────────────────────────────────────
# Función pública principal
# ──────────────────────────────────────────────

async def search_bibliography(
    keywords: str,
    area: str = "",
    doi_list: list[str] | None = None,
) -> list[dict]:
    """
    Búsqueda bibliográfica en cascada: OpenAlex → SciELO → Crossref.
    Cada capa falla silenciosamente si no está disponible.
    Devuelve lista deduplicada de hasta 15 referencias.
    """
    all_results: list[dict] = []
    doi_list = doi_list or []
    min_year, max_date = _recent_publication_window()
    max_year = max_date.year

    logger.info(
        "Filtro temporal bibliografico activo: fuentes publicadas entre %s-01-01 y %s",
        min_year,
        max_date.isoformat(),
    )

    # Capa 1
    all_results.extend(await _search_openalex(keywords, area, min_year, max_date))

    # Capa 2
    all_results.extend(await _search_scielo(keywords))

    # Capa 3
    all_results.extend(await _search_crossref(keywords, min_year, max_date))

    # Resolver DOIs manuales (máximo 3)
    for doi in doi_list[:3]:
        resolved = await resolve_doi(doi)
        if resolved:
            all_results.append(resolved)

    all_results = _filter_recent_references(all_results, min_year, max_year)

    if not all_results:
        logger.warning(f"Ninguna fuente bibliográfica devolvió resultados para '{keywords}'")
        return []

    unique = _deduplicate(all_results)
    logger.info(f"Bibliografía final: {len(unique)} referencias únicas de {len(all_results)} totales")
    return unique
