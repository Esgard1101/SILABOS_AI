# Prompts del Agente 2 - Buscador de fuentes academicas


def construir_prompt_queries(tema: str, nivel: str) -> str:
    """Genera 3 queries de busqueda academica optimizadas para un tema."""
    nivel_desc = "universitario de pregrado" if nivel == "pregrado" else "de posgrado y especializacion"

    prompt = f"""# ROL
Experto en busqueda academica y bibliografia universitaria.

# TAREA
Genera 3 queries de busqueda academica para:
**Tema:** {tema}
**Nivel:** {nivel_desc}

## Especificaciones
- Query 1: espanol - libros de texto y recursos universitarios (Dialnet, Redalyc)
- Query 2: ingles - articulos cientificos y journals (Google Scholar, EBSCO)
- Query 3: espanol o ingles - recursos especificos del tema (documentacion, casos de estudio)

Usar operadores (site:, filetype:pdf) cuando sea util.

# OUTPUT en JSON
{{"queries": ["query espanol libros", "english query articles", "query especifica"]}}

Responde UNICAMENTE con JSON valido, sin texto adicional."""
    return prompt


def construir_prompt_filtrado(resultados_raw: list, tema: str) -> str:
    """Filtra resultados de Google y devuelve solo fuentes academicas relevantes."""
    resultados_texto = ""
    for i, item in enumerate(resultados_raw[:20], 1):
        titulo = item.get("title", "Sin titulo")
        url = item.get("link", "")
        snippet = item.get("snippet", "")[:150]
        resultados_texto += f"[{i}] {titulo}\n    URL: {url}\n    {snippet}\n\n"

    prompt = f"""# ROL
Experto en evaluacion de fuentes academicas universitarias.

# TEMA
{tema}

# RESULTADOS A FILTRAR
{resultados_texto}
# CRITERIOS DE INCLUSION
- Libros, articulos, tesis, documentacion oficial, portales universitarios
- Relevantes para el tema (no solo menciones de paso)
- URL accesible (no rotas ni de compra/venta)

# EXCLUIR
- Tiendas (Amazon, MercadoLibre), blogs personales sin respaldo, spam

# OUTPUT en JSON
{{"fuentes": [{{"titulo": "string", "url": "string", "autor": "Apellido, N. o null", "anio": null, "tipo": "articulo|libro|tesis|documentacion|web_academica", "relevancia_score": 0.0}}]}}

Ordenar de mayor a menor relevancia_score.
Si ningun resultado es valido: {{"fuentes": []}}
Responde UNICAMENTE con JSON valido, sin texto adicional."""
    return prompt


def construir_prompt_bibliografia_apa(resultados: list, area_curso: str) -> str:
    """
    Formatea resultados de APIs bibliograficas en APA 7ma edicion.
    Usado por el endpoint POST /api/search/bibliography.
    """
    resultados_str = ""
    for i, r in enumerate(resultados[:15], 1):
        authors = ", ".join(r.get("authors", [])[:3])
        resultados_str += (
            f"[{i}] Candidate index: {i}\n"
            f"    Titulo: {r.get('title', '')}\n"
            f"    Autores: {authors}\n"
            f"    Ano: {r.get('year', '')}\n"
            f"    Fuente: {r.get('source', '')}\n"
            f"    DOI: {r.get('doi', 'N/A')}\n"
            f"    URL: {r.get('url', '')}\n\n"
        )

    prompt = f"""# ROL
Bibliotecologo experto en normas APA 7ma edicion.

# REFERENCIAS A FORMATEAR
{resultados_str}
# CONTEXTO DEL CURSO
**Area:** {area_curso}
**Nivel:** universitario

# TAREA
Selecciona las 8 referencias mas relevantes para el area del curso.
Formatea cada una en APA 7ma edicion completa.
**Incluir SOLO referencias con DOI o URL verificable.**
**Incluir SOLO referencias publicadas dentro de la ventana temporal recibida desde el backend.**
Ordenar de mas a menos relevante.

# REGLAS DE CALIDAD
- No inventes datos.
- Si un campo no esta presente o es dudoso, usa null o [] segun corresponda.
- Nunca devuelvas placeholders como "autor", "author", "autores", "unknown", "n/a", "title" o similares.
- Conserva `title`, `authors`, `year`, `source`, `doi`, `url` y `candidate_index` alineados con la referencia de entrada.
- `type` debe usar solo una de estas etiquetas: articulo, libro, tesis, documentacion, web_academica, video.
- `display_text` debe ser una version breve y legible para tabla, basada en autores/ano/titulo cuando sea posible.

# OUTPUT en JSON
{{"referencias": [{{"candidate_index": 1, "apa_format": "string APA completo", "title": "string o null", "authors": ["Autor 1", "Autor 2"], "year": 2024, "type": "articulo|libro|tesis|documentacion|web_academica|video|null", "display_text": "string breve", "doi": "string o null", "url": "string o null", "source": "openalex|scielo|crossref", "verified": true}}]}}

Responde UNICAMENTE con JSON valido, sin texto adicional."""
    return prompt
