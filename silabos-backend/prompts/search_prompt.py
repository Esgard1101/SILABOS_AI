# Prompts del Agente 2 — Buscador de Fuentes Académicas
# Estructura Markdown para reducir tokens vs. formato anterior


def construir_prompt_queries(tema: str, nivel: str) -> str:
    """Genera 3 queries de búsqueda académica optimizadas para un tema."""
    nivel_desc = "universitario de pregrado" if nivel == "pregrado" else "de posgrado y especialización"

    prompt = f"""# ROL
Experto en búsqueda académica y bibliografía universitaria.

# TAREA
Genera 3 queries de búsqueda académica para:
**Tema:** {tema}
**Nivel:** {nivel_desc}

## Especificaciones
- Query 1: español — libros de texto y recursos universitarios (Dialnet, Redalyc)
- Query 2: inglés — artículos científicos y journals (Google Scholar, EBSCO)
- Query 3: español o inglés — recursos específicos del tema (documentación, casos de estudio)

Usar operadores (site:, filetype:pdf) cuando sea útil.

# OUTPUT en JSON
{{"queries": ["query español libros", "english query articles", "query específica"]}}

Responde ÚNICAMENTE con JSON válido, sin texto adicional."""
    return prompt


def construir_prompt_filtrado(resultados_raw: list, tema: str) -> str:
    """Filtra resultados de Google y devuelve solo fuentes académicas relevantes."""
    resultados_texto = ""
    for i, item in enumerate(resultados_raw[:20], 1):
        titulo = item.get("title", "Sin título")
        url = item.get("link", "")
        snippet = item.get("snippet", "")[:150]
        resultados_texto += f"[{i}] {titulo}\n    URL: {url}\n    {snippet}\n\n"

    prompt = f"""# ROL
Experto en evaluación de fuentes académicas universitarias.

# TEMA
{tema}

# RESULTADOS A FILTRAR
{resultados_texto}
# CRITERIOS DE INCLUSIÓN
- Libros, artículos, tesis, documentación oficial, portales universitarios
- Relevantes para el tema (no solo menciones de paso)
- URL accesible (no rotas ni de compra/venta)

# EXCLUIR
- Tiendas (Amazon, MercadoLibre), blogs personales sin respaldo, spam

# OUTPUT en JSON
{{"fuentes": [{{"titulo": "string", "url": "string", "autor": "Apellido, N. o null", "anio": null, "tipo": "articulo|libro|tesis|documentacion|web_academica", "relevancia_score": 0.0}}]}}

Ordenar de mayor a menor relevancia_score.
Si ningún resultado es válido: {{"fuentes": []}}
Responde ÚNICAMENTE con JSON válido, sin texto adicional."""
    return prompt


def construir_prompt_bibliografia_apa(resultados: list, area_curso: str) -> str:
    """
    Formatea resultados de APIs bibliográficas en APA 7ma edición.
    Usado por el endpoint POST /api/search/bibliography.
    """
    resultados_str = ""
    for i, r in enumerate(resultados[:15], 1):
        authors = ", ".join(r.get("authors", [])[:3])
        resultados_str += (
            f"[{i}] Título: {r.get('title', '')}\n"
            f"    Autores: {authors}\n"
            f"    Año: {r.get('year', '')}\n"
            f"    Fuente: {r.get('source', '')}\n"
            f"    DOI: {r.get('doi', 'N/A')}\n"
            f"    URL: {r.get('url', '')}\n\n"
        )

    prompt = f"""# ROL
Bibliotecólogo experto en normas APA 7ma edición.

# REFERENCIAS A FORMATEAR
{resultados_str}
# CONTEXTO DEL CURSO
**Área:** {area_curso}
**Nivel:** universitario

# TAREA
Selecciona las 8 referencias más relevantes para el área del curso.
Formatea cada una en APA 7ma edición completa.
**Incluir SOLO referencias con DOI o URL verificable.**
Ordenar de más a menos relevante.

# OUTPUT en JSON
{{"referencias": [{{"apa_format": "string APA completo", "doi": "string o null", "url": "string", "source": "openalex|scielo|crossref", "verified": true}}]}}

Responde ÚNICAMENTE con JSON válido, sin texto adicional."""
    return prompt
