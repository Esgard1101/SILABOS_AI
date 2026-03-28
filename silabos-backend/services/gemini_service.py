# Servicio principal de IA — Gemini API con fallback silencioso a OpenRouter
# SDK correcto: genai.Client()  —  NO usar genai.configure() (sintaxis vieja)

import json
import logging
import os
import re

import httpx
from google import genai
from google.genai import types

from prompts.syllabus_prompt import construir_prompt_silabo
from prompts.validator_prompt import construir_prompt_validacion
from prompts.search_prompt import construir_prompt_queries, construir_prompt_filtrado

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Cliente Gemini singleton
# ──────────────────────────────────────────────

_gemini_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client()
    return _gemini_client


# ──────────────────────────────────────────────
# OpenRouter (fallback compatible con OpenAI API)
# ──────────────────────────────────────────────

async def _call_openrouter(prompt: str) -> str:
    """Llama a OpenRouter con formato OpenAI-compatible."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY no configurada")

    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:3000",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


# ──────────────────────────────────────────────
# Funciones standalone — usadas por bibliography_service y rag_service
# ──────────────────────────────────────────────

async def generate_content(prompt: str) -> str:
    """
    Generación de texto con fallback automático a OpenRouter.
    Silencioso — el frontend no sabe qué proveedor respondió.
    """
    from fastapi import HTTPException

    provider = os.getenv("AI_PROVIDER", "gemini")

    if provider == "openrouter":
        try:
            return await _call_openrouter(prompt)
        except Exception as e:
            logger.error(f"OpenRouter falló: {e}")
            raise HTTPException(status_code=503, detail="Servicio IA no disponible")

    # provider == "gemini" (default)
    try:
        client = _get_client()
        model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
        response = client.models.generate_content(
            model=model,
            contents=prompt,
        )
        return response.text

    except Exception as e:
        error_str = str(e).lower()
        is_rate_or_network = any(
            kw in error_str for kw in ("429", "quota", "rate", "connection", "timeout")
        )
        if is_rate_or_network:
            logger.warning(f"Gemini no disponible ({e}), usando OpenRouter como fallback")
            try:
                return await _call_openrouter(prompt)
            except Exception as e2:
                logger.error(f"OpenRouter fallback también falló: {e2}")
                raise HTTPException(status_code=503, detail="Servicio IA no disponible")
        raise HTTPException(status_code=503, detail=f"Error en servicio IA: {e}")


def generate_embedding(text: str) -> list[float]:
    """Genera embedding para indexación de documentos (RETRIEVAL_DOCUMENT)."""
    client = _get_client()
    model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    dimensions = int(os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "768"))

    result = client.models.embed_content(
        model=model,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=dimensions,
        ),
    )
    return result.embeddings[0].values


def generate_query_embedding(query: str) -> list[float]:
    """
    Genera embedding para búsqueda semántica (RETRIEVAL_QUERY).
    Distinto a generate_embedding — importante para calidad RAG.
    """
    client = _get_client()
    model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    dimensions = int(os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "768"))

    result = client.models.embed_content(
        model=model,
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=dimensions,
        ),
    )
    return result.embeddings[0].values


# ──────────────────────────────────────────────
# Helper interno
# ──────────────────────────────────────────────

def _extraer_json(texto: str) -> str:
    """Limpia la respuesta de Gemini y extrae solo el JSON."""
    texto = re.sub(r"```(?:json)?\s*", "", texto)
    texto = re.sub(r"```", "", texto)
    texto = texto.strip()
    for inicio_char, fin_char in [('{', '}'), ('[', ']')]:
        inicio = texto.find(inicio_char)
        fin = texto.rfind(fin_char)
        if inicio != -1 and fin != -1 and fin > inicio:
            return texto[inicio:fin + 1]
    return texto


# ──────────────────────────────────────────────
# Clase GeminiService — agentes existentes de Fase 1
# ──────────────────────────────────────────────

class GeminiService:
    """Servicio de integración con la API de Google Gemini."""

    def __init__(self):
        self.client = _get_client()
        self.model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
        logger.info(f"GeminiService inicializado | modelo: {self.model}")

    async def generar_silabo(self, datos_curso: dict, contexto_curricular: str = "") -> dict:
        """Agente 1: Genera un sílabo universitario completo."""
        try:
            prompt = construir_prompt_silabo(datos_curso, contexto_curricular)
            logger.info(f"Generando sílabo: {datos_curso.get('nombre_curso')}")

            respuesta = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.4,
                    max_output_tokens=8192,
                ),
            )

            json_limpio = _extraer_json(respuesta.text)
            silabo = json.loads(json_limpio)
            logger.info("Sílabo generado exitosamente")
            return silabo

        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear JSON del sílabo: {e}")
            return {"error": "No se pudo parsear la respuesta de Gemini como JSON"}
        except Exception as e:
            logger.error(f"Error al generar sílabo: {e}")
            return {"error": str(e)}

    async def validar_silabo(self, silabo: dict, perfil_egreso: str = "") -> dict:
        """Agente 3: Valida la coherencia curricular del sílabo."""
        try:
            prompt = construir_prompt_validacion(silabo, perfil_egreso)
            logger.info("Validando sílabo")

            respuesta = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=2048,
                ),
            )

            json_limpio = _extraer_json(respuesta.text)
            resultado = json.loads(json_limpio)
            resultado.setdefault("score", 0)
            resultado.setdefault("observaciones", [])
            resultado.setdefault("sugerencias", [])
            resultado.setdefault("aprobado", resultado.get("score", 0) >= 70)

            logger.info(f"Validación completada. Score: {resultado['score']}")
            return resultado

        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear JSON de validación: {e}")
            return {
                "score": 0,
                "observaciones": [{"criterio": "Error", "nivel": "error", "mensaje": "No se pudo procesar la validación"}],
                "sugerencias": [],
                "aprobado": False,
            }
        except Exception as e:
            logger.error(f"Error al validar sílabo: {e}")
            return {
                "score": 0,
                "observaciones": [{"criterio": "Error", "nivel": "error", "mensaje": str(e)}],
                "sugerencias": [],
                "aprobado": False,
            }

    async def construir_queries_busqueda(self, tema: str, nivel: str = "pregrado") -> list[str]:
        """Agente 2 — Paso 1: Genera queries de búsqueda académica optimizadas."""
        try:
            prompt = construir_prompt_queries(tema, nivel)
            logger.info(f"Construyendo queries para: {tema}")

            respuesta = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=512,
                ),
            )

            json_limpio = _extraer_json(respuesta.text)
            datos = json.loads(json_limpio)
            queries = datos.get("queries", [])
            logger.info(f"Se generaron {len(queries)} queries")
            return queries

        except Exception as e:
            logger.error(f"Error al construir queries: {e}")
            return [tema, f"{tema} academic research", f"{tema} universidad"]

    async def filtrar_resultados_busqueda(self, resultados_raw: list, tema: str) -> list:
        """Agente 2 — Paso 3: Filtra y rankea los resultados crudos de Google."""
        try:
            if not resultados_raw:
                return []

            prompt = construir_prompt_filtrado(resultados_raw, tema)
            logger.info(f"Filtrando {len(resultados_raw)} resultados")

            respuesta = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                ),
            )

            json_limpio = _extraer_json(respuesta.text)
            datos = json.loads(json_limpio)
            fuentes = datos.get("fuentes", [])
            logger.info(f"Se seleccionaron {len(fuentes)} fuentes")
            return fuentes

        except Exception as e:
            logger.error(f"Error al filtrar resultados: {e}")
            return [
                {
                    "titulo": item.get("title", "Sin título"),
                    "url": item.get("link", ""),
                    "autor": None,
                    "anio": None,
                    "tipo": "web_academica",
                    "relevancia_score": 0.5,
                }
                for item in resultados_raw[:8]
            ]

    async def chat_documento(
        self,
        pregunta: str,
        contexto_docs: str,
        historial: list,
    ) -> str:
        """
        Agente 4: Responde preguntas sobre documentos usando el contexto inyectado.
        NO usa la Files API de Gemini — texto plano en el prompt siempre.
        """
        try:
            historial_texto = ""
            for msg in historial[-10:]:
                rol = "Usuario" if msg.get("rol") == "user" else "Asistente"
                historial_texto += f"\n{rol}: {msg.get('contenido', '')}"

            prompt = f"""# ROL
Asistente académico especializado en documentos universitarios.
Responde ÚNICAMENTE con información de los documentos proporcionados.

# DOCUMENTOS DE REFERENCIA
{contexto_docs[:6000]}

# HISTORIAL
{historial_texto if historial_texto else "Sin historial previo."}

# PREGUNTA
{pregunta}

# INSTRUCCIONES
- Cita el documento cuando uses información específica (ej: "Según el documento X...")
- Si la información no está en los documentos: "Esta información no se encuentra en los documentos proporcionados"
- Usa markdown para listas cuando mejore la claridad
"""
            logger.info("Procesando consulta de chat con documentos")

            respuesta = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=2048,
                ),
            )
            return respuesta.text

        except Exception as e:
            logger.error(f"Error en chat con documentos: {e}")
            return f"Error al procesar la consulta: {str(e)}"

    async def verificar_conexion(self) -> bool:
        """Verificación mínima de conectividad con la API de Gemini."""
        try:
            respuesta = self.client.models.generate_content(
                model=self.model,
                contents="ping",
            )
            return respuesta.text is not None
        except Exception as e:
            logger.error(f"Error al verificar conexión con Gemini: {e}")
            return False
