# Servicio de búsqueda académica — Google Custom Search API
# Orquesta los 3 pasos: Gemini construye queries → Google busca → Gemini filtra

import logging
import os

import httpx

logger = logging.getLogger(__name__)

# URL base de Google Custom Search API
GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"


class SearchService:
    """Servicio de búsqueda en internet con Google Custom Search API."""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

        if not self.api_key:
            logger.warning("GOOGLE_SEARCH_API_KEY no configurada — búsqueda desactivada")
        if not self.engine_id:
            logger.warning("GOOGLE_SEARCH_ENGINE_ID no configurada — búsqueda desactivada")

        logger.info("SearchService inicializado")

    async def buscar(self, query: str, lang: str = "lang_es", num: int = 10) -> list:
        """
        Llama a Google Custom Search API y devuelve resultados crudos.
        Maneja el error 429 (límite diario) devolviendo lista vacía con log.

        Args:
            query: Término de búsqueda
            lang: Código de idioma (lang_es, lang_en)
            num: Número de resultados (máx 10 por query en plan gratuito)

        Returns:
            Lista de items con title, link, snippet
        """
        if not self.api_key or not self.engine_id:
            logger.warning("Credenciales de Google Search no configuradas, devolviendo lista vacía")
            return []

        params = {
            "key": self.api_key,
            "cx": self.engine_id,
            "q": query,
            "num": min(num, 10),  # Máximo 10 por llamada en plan gratuito
            "lr": lang,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as cliente:
                logger.info(f"Buscando en Google: '{query}' (lang={lang})")
                respuesta = await cliente.get(GOOGLE_SEARCH_URL, params=params)

                # Límite diario alcanzado (429 o 403)
                if respuesta.status_code in (429, 403):
                    logger.warning(
                        f"Límite de Google Search alcanzado (status {respuesta.status_code}). "
                        "Devolviendo resultados parciales."
                    )
                    return []

                respuesta.raise_for_status()
                datos = respuesta.json()
                items = datos.get("items", [])
                logger.info(f"Google devolvió {len(items)} resultados para: '{query}'")
                return items

        except httpx.TimeoutException:
            logger.error(f"Timeout al buscar en Google: '{query}'")
            return []
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al buscar en Google: {e.response.status_code} — {e}")
            return []
        except Exception as e:
            logger.error(f"Error inesperado en búsqueda de Google: {e}")
            return []

    async def buscar_fuentes_academicas(
        self,
        tema: str,
        nivel: str = "pregrado",
        anio_minimo: int = 2018,
        cantidad: int = 8,
        gemini_service=None,
    ) -> list:
        """
        Orquesta los 3 pasos del Agente 2:
        1. Gemini Flash-Lite construye queries académicas optimizadas
        2. Google Custom Search ejecuta las búsquedas
        3. Gemini Flash-Lite filtra y rankea los resultados

        Si Google devuelve error 429, devuelve los resultados parciales obtenidos
        antes del error — nunca falla completamente.

        Args:
            tema: Tema académico a buscar
            nivel: "pregrado" o "postgrado"
            anio_minimo: Año mínimo de publicación (filtro post-procesado)
            cantidad: Número de fuentes deseadas en el resultado final
            gemini_service: Instancia de GeminiService para construir/filtrar

        Returns:
            Lista de fuentes académicas filtradas y rankeadas
        """
        todos_los_resultados = []

        # ── PASO 1: Gemini construye las queries ──────────────────────────
        if gemini_service:
            queries = await gemini_service.construir_queries_busqueda(tema, nivel)
        else:
            # Fallback si no hay servicio Gemini disponible
            queries = [tema, f"{tema} academic", f"{tema} university"]

        logger.info(f"Usando {len(queries)} queries para buscar '{tema}'")

        # ── PASO 2: Google ejecuta las búsquedas ──────────────────────────
        limite_alcanzado = False

        for i, query in enumerate(queries):
            if limite_alcanzado:
                break

            # Alternar idioma: primera query en español, segunda en inglés
            lang = "lang_en" if i == 1 else "lang_es"
            resultados = await self.buscar(query, lang=lang, num=10)

            if resultados:
                todos_los_resultados.extend(resultados)
            else:
                # Si una query falla (posible 429), marcamos el límite
                # pero continuamos con los resultados ya obtenidos
                if i > 0:
                    logger.warning("Posible límite de búsqueda alcanzado, usando resultados parciales")
                    limite_alcanzado = True

        # Eliminar duplicados por URL
        urls_vistas = set()
        resultados_unicos = []
        for item in todos_los_resultados:
            url = item.get("link", "")
            if url and url not in urls_vistas:
                urls_vistas.add(url)
                resultados_unicos.append(item)

        logger.info(f"Total de resultados únicos de Google: {len(resultados_unicos)}")

        # Si no hay resultados, devolver lista vacía
        if not resultados_unicos:
            return []

        # ── PASO 3: Gemini filtra y rankea ────────────────────────────────
        if gemini_service:
            fuentes_filtradas = await gemini_service.filtrar_resultados_busqueda(
                resultados_unicos, tema
            )
        else:
            # Fallback: conversión directa sin filtrado inteligente
            fuentes_filtradas = [
                {
                    "titulo": item.get("title", "Sin título"),
                    "url": item.get("link", ""),
                    "autor": None,
                    "anio": None,
                    "tipo": "web_academica",
                    "relevancia_score": 0.5,
                }
                for item in resultados_unicos
            ]

        # Filtrar por año mínimo (si el año está disponible)
        fuentes_filtradas = [
            f for f in fuentes_filtradas
            if f.get("anio") is None or f.get("anio", 0) >= anio_minimo
        ]

        # Limitar a la cantidad solicitada
        return fuentes_filtradas[:cantidad]
