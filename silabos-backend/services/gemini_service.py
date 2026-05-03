# Servicio principal de IA con enrutamiento por criticidad.
# Mantiene Gemini para generacion critica y embeddings.
# Mueve tareas no criticas a OpenRouter para controlar costos.

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException
from google import genai
from google.genai import types
from pydantic import ValidationError

from models.schemas import ValidacionData
from prompts.search_prompt import construir_prompt_filtrado, construir_prompt_queries
from prompts.syllabus_prompt import construir_prompt_silabo
from prompts.validator_prompt import construir_prompt_validacion

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
DEFAULT_OPENAI_FINAL_MODEL = "gpt-5.4-mini"
DEFAULT_OPENROUTER_AUDIT_MODEL = "google/gemma-4-26b-a4b-it:free"
OPENROUTER_RETRYABLE_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
OPENAI_RETRYABLE_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
FINAL_SYLLABUS_TASKS = {"syllabus_generate", "syllabus_generate_v2"}

_gemini_client: genai.Client | None = None
_router_service: "GeminiService | None" = None


@dataclass(frozen=True)
class TaskConfig:
    provider: str
    temperature: float
    max_output_tokens: int
    json_mode: bool = False
    reasoning: bool = False


@dataclass
class AIResult:
    text: str
    provider: str
    model: str
    usage: Any = None
    fallback_used: bool = False


class AIProviderError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        retryable: bool = False,
        status_code: int | None = None,
        provider: str | None = None,
        model: str | None = None,
    ):
        super().__init__(message)
        self.retryable = retryable
        self.status_code = status_code
        self.provider = provider
        self.model = model


TASK_CONFIGS: dict[str, TaskConfig] = {
    "syllabus_generate": TaskConfig(
        provider="gemini",
        temperature=0.4,
        max_output_tokens=8192,
        json_mode=True,
    ),
    "syllabus_generate_v2": TaskConfig(
        provider="gemini",
        temperature=0.4,
        max_output_tokens=8192,
        json_mode=True,
    ),
    "syllabus_validate": TaskConfig(
        provider="openrouter_audit",
        temperature=0.1,
        max_output_tokens=2048,
        json_mode=True,
        reasoning=True,
    ),
    "document_chat": TaskConfig(
        provider="openrouter_audit",
        temperature=0.3,
        max_output_tokens=2048,
    ),
    "search_query_build": TaskConfig(
        provider="openrouter_light",
        temperature=0.2,
        max_output_tokens=512,
        json_mode=False,
    ),
    "search_result_filter": TaskConfig(
        provider="openrouter_light",
        temperature=0.1,
        max_output_tokens=2048,
        json_mode=False,
    ),
    "bibliography_format": TaskConfig(
        provider="openrouter_light",
        temperature=0.1,
        max_output_tokens=2048,
        json_mode=False,
    ),
    "method_suggest": TaskConfig(
        provider="openrouter_light",
        temperature=0.1,
        max_output_tokens=512,
        json_mode=False,
    ),
    "progressive_purpose_suggest": TaskConfig(
        provider="openrouter_light",
        temperature=0.2,
        max_output_tokens=2048,
        json_mode=False,
    ),
    "progressive_content_suggest": TaskConfig(
        provider="openrouter_light",
        temperature=0.2,
        max_output_tokens=4096,
        json_mode=False,
    ),
    "content_engine_generate": TaskConfig(
        provider="gemini",
        temperature=0.25,
        max_output_tokens=8192,
        json_mode=True,
    ),
    "progressive_rsu_suggest": TaskConfig(
        provider="openrouter_light",
        temperature=0.25,
        max_output_tokens=1024,
        json_mode=False,
    ),
    "progressive_grading_suggest": TaskConfig(
        provider="openrouter_light",
        temperature=0.2,
        max_output_tokens=2048,
        json_mode=False,
    ),
    "suggest_instruments": TaskConfig(
        provider="gemini",
        temperature=0.2,
        max_output_tokens=2048,
        json_mode=True,
    ),
    "progressive_methodology_text": TaskConfig(
        provider="gemini",
        temperature=0.25,
        max_output_tokens=2048,
        json_mode=True,
    ),
    "progressive_tutoria_text": TaskConfig(
        provider="gemini",
        temperature=0.25,
        max_output_tokens=1536,
        json_mode=True,
    ),
}


def _get_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client()
    return _gemini_client


def _get_router_service() -> "GeminiService":
    global _router_service
    if _router_service is None:
        _router_service = GeminiService()
    return _router_service


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_text_from_message(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(part for part in parts if part)
    return str(content or "")


def _extract_openai_output_text(data: dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str):
        return output_text

    parts: list[str] = []
    for output_item in data.get("output") or []:
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content") or []:
            if not isinstance(content_item, dict):
                continue
            text = content_item.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "\n".join(part for part in parts if part)


_STIFFENED_JSON_SUFFIX = (
    "\n\n[CRÍTICO: Tu respuesta anterior causó un JSONDecodeError. "
    "DEBES responder EXCLUSIVAMENTE con el array/objeto JSON válido. "
    "Cero markdown, cero comentarios, cero texto antes o después. "
    "Comienza directamente con '{' o '[' y termina con '}' o ']'.]"
)


def _extraer_json(texto: str) -> str:
    """Bulletproof JSON extractor.

    Strips code fences, picks the FIRST opening bracket ({ or [),
    and walks balanced depth (string-aware) to find its matching close,
    so trailing junk after valid JSON is dropped.
    """
    if not texto:
        return ""
    texto = re.sub(r"```(?:json)?\s*", "", texto)
    texto = re.sub(r"```", "", texto)
    texto = texto.strip()

    candidates: list[tuple[int, str, str]] = []
    idx_obj = texto.find("{")
    if idx_obj != -1:
        candidates.append((idx_obj, "{", "}"))
    idx_arr = texto.find("[")
    if idx_arr != -1:
        candidates.append((idx_arr, "[", "]"))
    if not candidates:
        return texto

    start, open_ch, close_ch = min(candidates, key=lambda item: item[0])

    depth = 0
    in_string = False
    escape = False
    end = -1
    for i in range(start, len(texto)):
        ch = texto[i]
        if escape:
            escape = False
            continue
        if in_string:
            if ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return texto[start:]
    return texto[start : end + 1]


def _safe_json_loads(raw_text: str) -> Any:
    """Parse JSON from messy LLM output. Tries balanced extractor first,
    falls back to raw_decode (ignores trailing junk)."""
    cleaned = _extraer_json(raw_text or "")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        starts = [idx for idx in (cleaned.find("{"), cleaned.find("[")) if idx != -1]
        if not starts:
            raise
        start_idx = min(starts)
        obj, _end = decoder.raw_decode(cleaned[start_idx:])
        return obj


def _usage_to_loggable(usage: Any) -> Any:
    if usage is None:
        return None
    if hasattr(usage, "model_dump"):
        return usage.model_dump()
    if hasattr(usage, "__dict__"):
        return {
            key: value
            for key, value in usage.__dict__.items()
            if not key.startswith("_")
        }
    return usage


def _task_config(task_name: str) -> TaskConfig:
    try:
        return TASK_CONFIGS[task_name]
    except KeyError as exc:
        raise ValueError(f"Tarea IA no soportada: {task_name}") from exc


def _error_is_retryable(message: str) -> bool:
    message = message.lower()
    return any(
        marker in message
        for marker in (
            "408",
            "429",
            "500",
            "502",
            "503",
            "504",
            "quota",
            "rate",
            "resource exhausted",
            "temporarily",
            "timeout",
            "connection",
            "unavailable",
            "overloaded",
        )
    )


def _openrouter_json_mode_not_supported(message: str) -> bool:
    lowered = (message or "").lower()
    return (
        "json mode is not supported" in lowered
        or "json mode unsupported" in lowered
        or ('"response_format"' in lowered and "not supported" in lowered)
        or ("response_format" in lowered and "not supported" in lowered)
    )


def _default_validation_error(message: str) -> dict:
    return {
        "score": 0,
        "observaciones": [
            {
                "criterio": "Error",
                "nivel": "error",
                "mensaje": message,
            }
        ],
        "sugerencias": [],
        "aprobado": False,
    }


def _normalize_validation_payload(payload: dict) -> dict:
    score = payload.get("score", 0)
    if not isinstance(score, int):
        try:
            score = int(score)
        except (TypeError, ValueError):
            score = 0

    observaciones = payload.get("observaciones", [])
    if not isinstance(observaciones, list):
        observaciones = []

    sugerencias = payload.get("sugerencias", [])
    if not isinstance(sugerencias, list):
        sugerencias = []

    aprobado = payload.get("aprobado")
    if not isinstance(aprobado, bool):
        aprobado = score >= 70

    return {
        "score": score,
        "observaciones": observaciones,
        "sugerencias": sugerencias,
        "aprobado": aprobado,
    }


def _build_validation_repair_prompt(raw_response: str) -> str:
    return f"""Convierte la siguiente salida a JSON valido estricto.
Debes devolver SOLO un objeto JSON con esta forma:
{{
  "score": 0,
  "observaciones": [
    {{"criterio": "string", "nivel": "error|advertencia|sugerencia", "mensaje": "string"}}
  ],
  "sugerencias": ["string"],
  "aprobado": false
}}

Si falta información, usa valores por defecto razonables.
No agregues markdown, comentarios ni texto extra.

SALIDA A REPARAR:
{raw_response}
"""


async def generate_content(
    prompt: str,
    task: str = "document_chat",
    force_provider: str | None = None,
) -> str:
    try:
        service = _get_router_service()
        return await service.generate_text(task, prompt, force_provider=force_provider)
    except AIProviderError as exc:
        logger.error("Error IA en tarea %s: %s", task, exc)
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AI_PROVIDER_SATURATED",
                "message": "Servicio IA no disponible",
                "provider": exc.provider,
                "retryable": exc.retryable,
            },
        )


def generate_embedding(text: str) -> list[float]:
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


class GeminiService:
    """Servicio central de IA con enrutamiento por tarea."""

    def __init__(self):
        self.client = _get_client()
        self.gemini_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_base_url = os.getenv(
            "OPENAI_BASE_URL",
            "https://api.openai.com/v1",
        ).rstrip("/")
        self.openai_final_model = os.getenv(
            "OPENAI_FINAL_MODEL",
            DEFAULT_OPENAI_FINAL_MODEL,
        ).strip() or DEFAULT_OPENAI_FINAL_MODEL
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.openrouter_base_url = os.getenv(
            "OPENROUTER_BASE_URL",
            "https://openrouter.ai/api/v1",
        ).rstrip("/")
        legacy_openrouter_model = os.getenv("OPENROUTER_MODEL", "").strip()
        self.openrouter_audit_model = (
            os.getenv("OPENROUTER_AUDIT_MODEL", "").strip()
            or legacy_openrouter_model
            or DEFAULT_OPENROUTER_AUDIT_MODEL
        )
        self.openrouter_light_model = (
            os.getenv("OPENROUTER_LIGHT_MODEL", "").strip()
            or self.openrouter_audit_model
        )
        self.openrouter_fallback_model = os.getenv(
            "OPENROUTER_FALLBACK_MODEL",
            "",
        ).strip()
        self.openrouter_audit_reasoning = _as_bool(
            os.getenv("OPENROUTER_AUDIT_REASONING"),
            default=False,
        )
        self.openrouter_no_native_json_models: set[str] = set()
        logger.info(
            "GeminiService inicializado | gemini=%s | openai_final=%s | openrouter_audit=%s | openrouter_light=%s",
            self.gemini_model,
            self.openai_final_model,
            self.openrouter_audit_model,
            self.openrouter_light_model,
        )

    def _resolve_openrouter_model(self, route_type: str) -> str:
        if route_type == "openrouter_audit":
            return self.openrouter_audit_model
        if route_type == "openrouter_light":
            return self.openrouter_light_model or self.openrouter_audit_model
        raise ValueError(f"Tipo de ruta OpenRouter no soportado: {route_type}")

    def _log_result(self, task_name: str, result: AIResult) -> None:
        logger.info(
            "IA completada | tarea=%s | proveedor=%s | modelo=%s | fallback=%s | uso=%s",
            task_name,
            result.provider,
            result.model,
            result.fallback_used,
            _usage_to_loggable(result.usage),
        )

    def _gemini_error(self, exc: Exception) -> AIProviderError:
        message = str(exc)
        return AIProviderError(
            f"Gemini falló: {message}",
            retryable=_error_is_retryable(message),
            provider="gemini",
            model=self.gemini_model,
        )

    async def _call_gemini(
        self,
        task_name: str,
        prompt: str,
        config: TaskConfig,
    ) -> AIResult:
        try:
            response = self.client.models.generate_content(
                model=self.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=config.temperature,
                    max_output_tokens=config.max_output_tokens,
                ),
            )
            result = AIResult(
                text=response.text or "",
                provider="gemini",
                model=self.gemini_model,
                usage=getattr(response, "usage_metadata", None),
            )
            self._log_result(task_name, result)
            return result
        except Exception as exc:
            raise self._gemini_error(exc) from exc

    async def _call_openai_final(
        self,
        task_name: str,
        prompt: str,
        config: TaskConfig,
        *,
        fallback_used: bool,
    ) -> AIResult:
        if not self.openai_api_key:
            raise AIProviderError(
                "OPENAI_API_KEY no configurada",
                provider="openai",
                model=self.openai_final_model,
            )

        payload: dict[str, Any] = {
            "model": self.openai_final_model,
            "input": prompt,
            "max_output_tokens": config.max_output_tokens,
            "store": False,
        }
        if config.temperature is not None:
            payload["temperature"] = config.temperature

        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    f"{self.openai_base_url}/responses",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AIProviderError(
                "OpenAI timeout",
                retryable=True,
                provider="openai",
                model=self.openai_final_model,
            ) from exc
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            raise AIProviderError(
                f"OpenAI HTTP {exc.response.status_code}: {body}",
                retryable=exc.response.status_code in OPENAI_RETRYABLE_STATUS_CODES,
                status_code=exc.response.status_code,
                provider="openai",
                model=self.openai_final_model,
            ) from exc
        except httpx.RequestError as exc:
            raise AIProviderError(
                f"OpenAI request error: {exc}",
                retryable=True,
                provider="openai",
                model=self.openai_final_model,
            ) from exc

        data = response.json()
        status = str(data.get("status") or "").lower()
        incomplete_details = data.get("incomplete_details")
        if status == "incomplete" or incomplete_details:
            raise AIProviderError(
                f"OpenAI respuesta incompleta para {task_name}: {incomplete_details or status}",
                retryable=True,
                provider="openai",
                model=self.openai_final_model,
            )

        result = AIResult(
            text=_extract_openai_output_text(data),
            provider="openai",
            model=data.get("model") or self.openai_final_model,
            usage=data.get("usage"),
            fallback_used=fallback_used,
        )
        self._log_result(task_name, result)
        return result

    async def _post_openrouter(
        self,
        *,
        task_name: str,
        prompt: str,
        model: str,
        config: TaskConfig,
        reasoning_enabled: bool,
        fallback_used: bool,
    ) -> AIResult:
        if not self.openrouter_api_key:
            raise AIProviderError(
                "OPENROUTER_API_KEY no configurada",
                provider="openrouter",
                model=model,
            )

        use_native_json_mode = (
            config.json_mode
            and model not in self.openrouter_no_native_json_models
        )
        payload: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": config.temperature,
            "max_tokens": config.max_output_tokens,
        }
        if use_native_json_mode:
            payload["response_format"] = {"type": "json_object"}
        if reasoning_enabled:
            payload["reasoning"] = {"enabled": True}

        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "X-Title": "Silabos.AI Backend",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.openrouter_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AIProviderError(
                "OpenRouter timeout",
                retryable=True,
                provider="openrouter",
                model=model,
            ) from exc
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            if (
                use_native_json_mode
                and exc.response.status_code == 400
                and _openrouter_json_mode_not_supported(body)
            ):
                self.openrouter_no_native_json_models.add(model)
                logger.warning(
                    "OpenRouter modelo %s no soporta JSON mode nativo; reintentando %s sin response_format",
                    model,
                    task_name,
                )
                return await self._post_openrouter(
                    task_name=task_name,
                    prompt=prompt,
                    model=model,
                    config=config,
                    reasoning_enabled=reasoning_enabled,
                    fallback_used=fallback_used,
                )
            raise AIProviderError(
                f"OpenRouter HTTP {exc.response.status_code}: {body}",
                retryable=exc.response.status_code in OPENROUTER_RETRYABLE_STATUS_CODES,
                status_code=exc.response.status_code,
                provider="openrouter",
                model=model,
            ) from exc
        except httpx.RequestError as exc:
            raise AIProviderError(
                f"OpenRouter request error: {exc}",
                retryable=True,
                provider="openrouter",
                model=model,
            ) from exc

        data = response.json()
        choice = (data.get("choices") or [{}])[0]
        finish_reason = str(choice.get("finish_reason") or "").lower()
        if finish_reason in {"length", "max_tokens", "content_filter"}:
            raise AIProviderError(
                f"OpenRouter respuesta incompleta para {task_name}: finish_reason={finish_reason}",
                retryable=True,
                provider="openrouter",
                model=data.get("model") or model,
            )

        message = choice.get("message") or {}
        result = AIResult(
            text=_normalize_text_from_message(message.get("content")),
            provider="openrouter",
            model=data.get("model") or model,
            usage=data.get("usage"),
            fallback_used=fallback_used,
        )
        self._log_result(task_name, result)
        return result

    async def _call_openrouter(
        self,
        task_name: str,
        prompt: str,
        config: TaskConfig,
        *,
        fallback_used: bool = False,
    ) -> AIResult:
        provider = config.provider if config.provider.startswith("openrouter") else "openrouter_audit"
        primary_model = self._resolve_openrouter_model(provider)
        reasoning_enabled = config.reasoning and self.openrouter_audit_reasoning

        try:
            return await self._post_openrouter(
                task_name=task_name,
                prompt=prompt,
                model=primary_model,
                config=config,
                reasoning_enabled=reasoning_enabled,
                fallback_used=fallback_used,
            )
        except AIProviderError as exc:
            fallback_model = self.openrouter_fallback_model
            can_retry = (
                exc.retryable
                and fallback_model
                and fallback_model != primary_model
            )
            if not can_retry:
                raise

            logger.warning(
                "OpenRouter primario falló para %s; usando fallback %s | error=%s",
                task_name,
                fallback_model,
                exc,
            )
            return await self._post_openrouter(
                task_name=task_name,
                prompt=prompt,
                model=fallback_model,
                config=config,
                reasoning_enabled=False,
                fallback_used=True,
            )

    async def _run_task(
        self,
        task_name: str,
        prompt: str,
        force_provider: str | None = None,
    ) -> AIResult:
        config = _task_config(task_name)
        forced = (force_provider or "").strip().lower()
        if forced and forced not in {"gemini", "openai", "openrouter"}:
            raise ValueError(f"Proveedor forzado no soportado: {force_provider}")

        if forced == "openai":
            if task_name not in FINAL_SYLLABUS_TASKS:
                raise ValueError(f"OpenAI solo está habilitado para tareas finales: {task_name}")
            return await self._call_openai_final(
                task_name,
                prompt,
                config,
                fallback_used=True,
            )

        if forced == "openrouter":
            return await self._call_openrouter(task_name, prompt, config, fallback_used=True)

        if config.provider == "gemini":
            try:
                return await self._call_gemini(task_name, prompt, config)
            except AIProviderError as exc:
                if not exc.retryable:
                    raise
                if task_name in FINAL_SYLLABUS_TASKS:
                    try:
                        logger.warning(
                            "Gemini no disponible para %s; reintentando con OpenAI | error=%s",
                            task_name,
                            exc,
                        )
                        return await self._call_openai_final(
                            task_name,
                            prompt,
                            config,
                            fallback_used=True,
                        )
                    except AIProviderError as openai_exc:
                        logger.warning(
                            "OpenAI fallback falló para %s; reintentando con OpenRouter | error=%s",
                            task_name,
                            openai_exc,
                        )
                logger.warning(
                    "Gemini no disponible para %s; reintentando con OpenRouter | error=%s",
                    task_name,
                    exc,
                )
                return await self._call_openrouter(task_name, prompt, config, fallback_used=True)

        if config.provider.startswith("openrouter"):
            return await self._call_openrouter(task_name, prompt, config)
        raise ValueError(f"Proveedor no soportado para tarea {task_name}: {config.provider}")

    async def generate_text(
        self,
        task_name: str,
        prompt: str,
        force_provider: str | None = None,
    ) -> str:
        result = await self._run_task(task_name, prompt, force_provider=force_provider)
        return result.text

    async def generate_json(
        self,
        task_name: str,
        prompt: str,
        force_provider: str | None = None,
        max_retries: int = 3,
    ) -> dict | list:
        """Run an IA task and parse JSON output with bulletproof recovery.

        On JSONDecodeError, retries up to ``max_retries`` total attempts with:
          - stiffened prompt suffix (CRITICAL JSON-only directive)
          - alternating provider (gemini <-> openrouter) starting attempt 2

        Raises ``json.JSONDecodeError`` if all attempts fail.
        """
        config = _task_config(task_name)
        default_provider = "gemini" if config.provider == "gemini" else "openrouter"
        last_error: json.JSONDecodeError | None = None
        last_raw: str = ""

        for attempt in range(max_retries):
            if attempt == 0:
                provider_for_attempt = force_provider
                attempt_prompt = prompt
            elif task_name in FINAL_SYLLABUS_TASKS and not force_provider:
                provider_for_attempt = "openai" if attempt == 1 else "openrouter"
                attempt_prompt = prompt + _STIFFENED_JSON_SUFFIX
            else:
                base_provider = (force_provider or default_provider).lower()
                if attempt % 2 == 1:
                    provider_for_attempt = "openrouter" if base_provider == "gemini" else "gemini"
                else:
                    provider_for_attempt = base_provider
                attempt_prompt = prompt + _STIFFENED_JSON_SUFFIX

            try:
                result = await self._run_task(
                    task_name,
                    attempt_prompt,
                    force_provider=provider_for_attempt,
                )
            except AIProviderError:
                if attempt == max_retries - 1:
                    raise
                logger.warning(
                    "generate_json provider error en attempt %s/%s tarea=%s; reintentando",
                    attempt + 1,
                    max_retries,
                    task_name,
                )
                continue

            last_raw = result.text
            try:
                return _safe_json_loads(result.text)
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning(
                    "JSONDecodeError attempt %s/%s tarea=%s proveedor=%s | error=%s | raw_head=%r",
                    attempt + 1,
                    max_retries,
                    task_name,
                    result.provider,
                    exc,
                    (result.text or "")[:300],
                )
                continue

        logger.error(
            "generate_json agotó reintentos | tarea=%s | último_raw=%r",
            task_name,
            (last_raw or "")[:500],
        )
        if last_error is not None:
            raise last_error
        raise json.JSONDecodeError("IA no devolvió JSON parseable", last_raw or "", 0)

    async def generar_silabo(self, datos_curso: dict, contexto_curricular: str = "") -> dict:
        try:
            prompt = construir_prompt_silabo(datos_curso, contexto_curricular)
            logger.info("Generando sílabo: %s", datos_curso.get("nombre_curso"))
            return await self.generate_json("syllabus_generate", prompt)
        except json.JSONDecodeError as exc:
            logger.error("Error al parsear JSON del sílabo: %s", exc)
            return {"error": "No se pudo parsear la respuesta del modelo como JSON"}
        except AIProviderError as exc:
            logger.error("Error al generar silabo: %s", exc)
            status_code = 429 if exc.retryable else 503
            return {"error": str(exc), "_status_code": status_code}
        except Exception as exc:
            logger.error("Error al generar silabo: %s", exc)
            return {"error": str(exc), "_status_code": 500}

    async def generar_silabo_desde_prompt(self, prompt: str) -> dict:
        try:
            return await self.generate_json("syllabus_generate_v2", prompt)
        except json.JSONDecodeError as exc:
            logger.error("Error al parsear JSON del silabo v2: %s", exc)
            return {"error": "No se pudo parsear la respuesta del modelo como JSON", "_status_code": 500}
        except AIProviderError as exc:
            logger.error("Error al generar silabo v2: %s", exc)
            status_code = 429 if exc.retryable else 503
            return {"error": str(exc), "_status_code": status_code}
        except Exception as exc:
            logger.error("Error al generar silabo v2: %s", exc)
            return {"error": str(exc), "_status_code": 500}

    async def _repair_validation_json(self, raw_response: str) -> dict | None:
        repair_prompt = _build_validation_repair_prompt(raw_response)
        try:
            repaired_text = await self.generate_text("syllabus_validate", repair_prompt)
            payload = _safe_json_loads(repaired_text)
            normalized = _normalize_validation_payload(payload)
            validated = ValidacionData.model_validate(normalized)
            return validated.model_dump()
        except (AIProviderError, ValidationError, json.JSONDecodeError) as exc:
            logger.warning("No se pudo reparar JSON de validacion: %s", exc)
            return None

    async def validar_silabo(self, silabo: dict, perfil_egreso: str = "") -> dict:
        prompt = construir_prompt_validacion(silabo, perfil_egreso)
        logger.info("Validando silabo")

        try:
            raw_text = await self.generate_text("syllabus_validate", prompt)
            payload = _safe_json_loads(raw_text)
            normalized = _normalize_validation_payload(payload)
            validated = ValidacionData.model_validate(normalized)
            logger.info("Validacion completada. Score: %s", validated.score)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("Salida invalida del auditor, intentando reparacion: %s", exc)
            repaired = await self._repair_validation_json(locals().get("raw_text", ""))
            if repaired:
                logger.info("Validacion reparada exitosamente. Score: %s", repaired["score"])
                return repaired
            return _default_validation_error("No se pudo procesar la validacion")
        except AIProviderError as exc:
            logger.error("Error al validar silabo: %s", exc)
            return _default_validation_error(str(exc))
        except Exception as exc:
            logger.error("Error al validar silabo: %s", exc)
            return _default_validation_error(str(exc))

    async def construir_queries_busqueda(self, tema: str, nivel: str = "pregrado") -> list[str]:
        try:
            prompt = construir_prompt_queries(tema, nivel)
            logger.info("Construyendo queries para: %s", tema)
            payload = await self.generate_json("search_query_build", prompt)
            queries = payload.get("queries", []) if isinstance(payload, dict) else []
            if not isinstance(queries, list):
                raise ValueError("El modelo no devolvió una lista de queries")
            logger.info("Se generaron %s queries", len(queries))
            return [str(query) for query in queries if str(query).strip()]
        except Exception as exc:
            logger.error("Error al construir queries: %s", exc)
            return [tema, f"{tema} academic research", f"{tema} universidad"]

    async def filtrar_resultados_busqueda(self, resultados_raw: list, tema: str) -> list:
        try:
            if not resultados_raw:
                return []

            prompt = construir_prompt_filtrado(resultados_raw, tema)
            logger.info("Filtrando %s resultados", len(resultados_raw))
            payload = await self.generate_json("search_result_filter", prompt)
            fuentes = payload.get("fuentes", []) if isinstance(payload, dict) else []
            if not isinstance(fuentes, list):
                raise ValueError("El modelo no devolvió una lista de fuentes")
            logger.info("Se seleccionaron %s fuentes", len(fuentes))
            return fuentes
        except Exception as exc:
            logger.error("Error al filtrar resultados: %s", exc)
            return [
                {
                    "titulo": item.get("title", "Sin titulo"),
                    "url": item.get("link", ""),
                    "autor": None,
                    "anio": None,
                    "tipo": "web_academica",
                    "relevancia_score": 0.5,
                }
                for item in resultados_raw[:8]
            ]

    async def sugerir_metodo(
        self,
        curso: dict,
        metodos_base: list[dict],
        skill_context: str,
        force_provider: str | None = None,
    ) -> dict:
        lista_metodos_texto = "\n".join(
            [f"ID {m['id']}: {m['name']} - {m['description']}" for m in metodos_base]
        )
        prompt = f"""Eres un experto en diseno curricular universitario peruano.

Dado el siguiente curso y su sumilla, elige el metodo pedagogico mas adecuado de la lista.
Responde UNICAMENTE con un JSON valido con este formato exacto:
{{
  "method_id": "<ID exacto de la lista>",
  "reason": "<sintesis breve en espanol, una oracion completa>",
  "reason_items": [
    "<razon completa 1, relacionada con la sumilla>",
    "<razon completa 2, relacionada con actividades o desempenos>",
    "<razon completa 3, relacionada con evidencias o evaluacion>"
  ],
  "complementario_id": "<ID exacto opcional de un metodo complementario distinto o null>"
}}

Reglas:
- method_id debe copiarse exactamente desde uno de los IDs disponibles.
- No inventes IDs, no uses numeros de orden y no devuelvas el nombre como ID.
- reason_items debe tener entre 3 y 5 frases completas, sin puntos suspensivos y sin cortar ideas.
- Si no hay un metodo complementario pertinente, usa null en complementario_id.
- Si el curso exige construir productos pedagogicos o tecnicos guiados
  (instrumentos, sesiones, secuencias, planificaciones, materiales, matrices,
  mapeos o propuestas formativas), prioriza Taller.
- Usa ABDe solo cuando exista un reto abierto de impacto real con definicion
  de desafio, investigacion, solucion, implementacion o difusion.
- Usa ABPro cuando el eje sea un proyecto aplicado amplio con planificacion,
  desarrollo de producto/prototipo y presentacion final.
- No confundas produccion pedagogica guiada con desafio: si la evidencia es
  construir piezas curriculares o didacticas con modelado y revision, es Taller.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:400]}
CATEGORIAS DE HABILIDADES PRIORIZADAS: {skill_context}

METODOS DISPONIBLES:
{lista_metodos_texto}

Responde solo JSON, sin markdown, sin texto adicional."""

        payload = await self.generate_json("method_suggest", prompt, force_provider=force_provider)
        if not isinstance(payload, dict):
            raise ValueError("El modelo no devolvió un objeto JSON para method_suggest")
        return payload

    async def chat_documento(
        self,
        pregunta: str,
        contexto_docs: str,
        historial: list,
    ) -> str:
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
            return await self.generate_text("document_chat", prompt)
        except AIProviderError as exc:
            logger.error("Error en chat con documentos: %s", exc)
            return f"Error al procesar la consulta: {exc}"
        except Exception as exc:
            logger.error("Error en chat con documentos: %s", exc)
            return f"Error al procesar la consulta: {exc}"

    async def sugerir_desempenos(self, curso: dict, bibliografia: list[str] | None = None) -> list[dict]:
        """Genera desempeños sugeridos basados en la sumilla, competencia y capacidad del curso."""
        biblio_ctx = ""
        if bibliografia:
            biblio_ctx = "\nREFERENCIAS BIBLIOGRÁFICAS DISPONIBLES:\n" + "\n".join(f"- {r}" for r in bibliografia[:5])

        prompt = f"""Eres un experto en diseño curricular universitario peruano.
Genera entre 3 y 5 desempeños de aprendizaje para el curso indicado, derivados de la sumilla, competencia y capacidad.

REGLAS:
- Cada desempeño inicia con un VERBO en infinitivo (Bloom revisado)
- Son observables y medibles
- Se derivan del propósito del curso (competencia + capacidad)
- No inventes contenido ajeno a la sumilla
- Responde ÚNICAMENTE con JSON válido, sin markdown

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:500]}
COMPETENCIA DE EGRESO: {str(curso.get("competencia_egreso", ""))[:300]}
RESULTADO DE APRENDIZAJE: {str(curso.get("resultado_aprendizaje", ""))[:300]}
CAPACIDAD: {str(curso.get("capacidad", ""))[:200]}
{biblio_ctx}

Responde con este formato exacto:
[
  {{"code": "D1", "statement": "Verbo + objeto + condición..."}},
  {{"code": "D2", "statement": "Verbo + objeto + condición..."}}
]"""

        resultado = await self.generate_json("suggest_performances", prompt)
        if isinstance(resultado, list):
            return resultado
        return []

    async def sugerir_contenido(
        self,
        curso: dict,
        desempenos: list[dict],
        bibliografia: list[str] | None = None,
    ) -> dict:
        """Sugiere conocimientos, habilidades (por desempeño) y actitudes derivados del propósito."""
        desempenos_lista = desempenos[:6]
        desempenos_texto = "\n".join(
            f"- [{d.get('code', f'D{i+1}')}] {d.get('statement', '')}"
            for i, d in enumerate(desempenos_lista)
        )
        biblio_ctx = ""
        if bibliografia:
            biblio_ctx = "\nREFERENCIAS:\n" + "\n".join(f"- {r}" for r in bibliografia[:4])

        prompt = f"""Eres un experto en diseño curricular universitario peruano.
Dado el propósito del curso (desempeños), deriva los tres componentes del CONTENIDO FORMATIVO.

REGLA CENTRAL: cada desempeño debe vincularse con habilidades específicas que el estudiante desarrollará para lograrlo.

CURSO: {curso.get("name", "")}
SUMILLA: {str(curso.get("sumilla", ""))[:400]}
DESEMPEÑOS (con códigos):
{desempenos_texto}
{biblio_ctx}

Genera exactamente este JSON (sin markdown ni texto adicional):
{{
  "habilidades_por_desempeno": [
    {{"desempeno_code": "D1", "habilidades": ["Habilidad específica 1a", "Habilidad específica 1b"]}},
    {{"desempeno_code": "D2", "habilidades": ["Habilidad específica 2a"]}}
  ],
  "conocimientos": ["Conocimiento 1", "Conocimiento 2", "Conocimiento 3", "Conocimiento 4"]
}}

REGLAS OBLIGATORIAS:
- habilidades_por_desempeno: genera EXACTAMENTE un objeto por cada desempeño recibido
- Por cada desempeño: entre 1 y 3 habilidades ESPECÍFICAS derivadas de ese desempeño
- Cada habilidad inicia con un VERBO cognitivo de Bloom (analizar, diseñar, aplicar, evaluar, crear, comparar, resolver, etc.)
- Las habilidades son observables y medibles, no genéricas
- conocimientos: 4-6 temas conceptuales específicos del área del curso
- No incluyas actitudes ni resultados de aprendizaje; la plantilla vigente no los usa en el programa de contenidos.
- Responde SOLO el JSON, sin explicaciones"""

        resultado = await self.generate_json("suggest_content", prompt)
        if isinstance(resultado, dict):
            # Build flat habilidades_sugeridas from structured list for backwards compat
            hpd = resultado.get("habilidades_por_desempeno", [])
            flat = [h for item in hpd for h in item.get("habilidades", [])]
            resultado["habilidades_sugeridas"] = flat
            return resultado
        return {"conocimientos": [], "habilidades_sugeridas": [], "habilidades_por_desempeno": []}

    async def sugerir_calificacion(
        self,
        metodo: dict,
        curso: dict,
        desempenos: list[dict] | None = None,
    ) -> list[dict]:
        """Sugiere tabla de calificación compatible con el método pedagógico seleccionado."""
        desempenos_texto = ""
        if desempenos:
            desempenos_texto = "\nDESEMPEÑOS:\n" + "\n".join(
                f"- {d.get('statement', '')}" for d in desempenos[:3]
            )

        prompt = f"""Eres un experto en evaluación educativa universitaria peruana.
Propón una tabla de calificación (sistema de evaluación) compatible con el método pedagógico indicado.

MÉTODO PEDAGÓGICO: {metodo.get("name", "")}
CURSO: {curso.get("name", "")}
{desempenos_texto}

REGLAS:
- La suma de porcentajes debe ser exactamente 100
- Incluir entre 3 y 5 evidencias de evaluación
- Cada evidencia debe ser coherente con el método pedagógico
- Las siglas deben ser cortas (2-4 caracteres)
- Responde SOLO JSON válido, sin markdown

Formato exacto:
[
  {{"evidencia": "Nombre de la evidencia", "sigla": "SG", "porcentaje": 40, "cronograma": "Permanente"}},
  {{"evidencia": "Producto 1", "sigla": "P1", "porcentaje": 20, "cronograma": "Semana 8"}},
  {{"evidencia": "Producto 2", "sigla": "P2", "porcentaje": 40, "cronograma": "Semana 15"}}
]"""

        resultado = await self.generate_json("suggest_grading", prompt)
        if isinstance(resultado, list):
            return resultado
        return []

    async def sugerir_instrumentos_por_desempeno(
        self,
        desempenos: list[dict],
        habilidades_por_desempeno: list[dict],
        grading_rows: list[dict],
        method_name: str,
        course_name: str,
        sumilla: str = "",
        force_provider: str | None = None,
    ) -> list[dict]:
        """Genera instrumentos de evaluación específicos al curso por cada desempeño.
        Retorna [{desempeno_code, instrumentos: [str]}].
        """
        hab_map = {item["desempeno_code"]: item.get("habilidades", []) for item in habilidades_por_desempeno}
        evidencias_disponibles = [r.get("evidencia", "") for r in grading_rows if r.get("evidencia")]

        desempenos_detalle = "\n".join(
            f'- [{d.get("codigo", f"D{i+1}")}] {d.get("descripcion", "")}'
            f'\n  Habilidades: {", ".join(hab_map.get(d.get("codigo", f"D{i+1}"), []) or ["no especificadas"])}'
            for i, d in enumerate(desempenos[:6])
        )

        prompt = f"""Eres un experto en evaluación educativa universitaria peruana.
Diseña instrumentos de evaluación ESPECÍFICOS para el contexto del curso.
Los instrumentos deben ser concretos y nombrar qué evalúan, NO genéricos.

CURSO: {course_name}
SUMILLA: {sumilla[:300] if sumilla else "No disponible"}
MÉTODO: {method_name}
EVIDENCIAS DE EVALUACIÓN: {", ".join(evidencias_disponibles) or "Tareas, Productos, Examen"}

DESEMPEÑOS Y HABILIDADES:
{desempenos_detalle}

INSTRUMENTOS PERMITIDOS (solo usar estos tipos, pero nombrarlos específicamente al curso):
- Rúbrica analítica [ej: "Rúbrica analítica de diseño de wireframe"]
- Lista de cotejo [ej: "Lista de cotejo de estructura HTML5"]
- Escala de valoración [ej: "Escala de valoración de argumentación científica"]
- Guía de observación [ej: "Guía de observación de práctica de laboratorio"]
- Prueba objetiva [ej: "Prueba objetiva de fundamentos de microeconomía"]
- Prueba de ensayo [ej: "Prueba de ensayo argumentativo"]
- Rúbrica de desempeño [ej: "Rúbrica de desempeño de exposición oral"]
- Ficha de autoevaluación [ej: "Ficha de autoevaluación del proceso de investigación"]
- Ficha de coevaluación [ej: "Ficha de coevaluación de trabajo cooperativo"]

REGLAS:
- Asigna 2-3 instrumentos por desempeño
- Nombres concretos que mencionen el contenido del curso
- El primer instrumento siempre debe ser la Rúbrica analítica (primario)
- Los siguientes deben complementar según el tipo de desempeño
- Responde SOLO JSON válido sin markdown

Formato exacto:
[
  {{"desempeno_code": "D1", "instrumentos": ["Rúbrica analítica de...", "Lista de cotejo de..."]}},
  {{"desempeno_code": "D2", "instrumentos": ["Rúbrica analítica de...", "Guía de observación de..."]}}
]"""

        resultado = await self.generate_json("suggest_instruments", prompt, force_provider=force_provider)
        if isinstance(resultado, list) and resultado and isinstance(resultado[0], dict):
            return resultado
        return []

    async def verificar_conexion(self) -> bool:
        try:
            await self._call_gemini("health_gemini", "ping", TaskConfig("gemini", 0.0, 16))
            return True
        except AIProviderError as exc:
            logger.error("Error al verificar conexion con Gemini: %s", exc)
            return False

    async def verificar_conexion_openrouter(self) -> str:
        if not self.openrouter_api_key:
            return "no_configurado"

        try:
            await self._post_openrouter(
                task_name="health_openrouter",
                prompt="ping",
                model=self.openrouter_light_model,
                config=TaskConfig("openrouter_light", 0.0, 16),
                reasoning_enabled=False,
                fallback_used=False,
            )
            return "ok"
        except AIProviderError as exc:
            logger.error("Error al verificar conexion con OpenRouter: %s", exc)
            return "error"

    async def verificar_conexion_openai(self) -> str:
        if not self.openai_api_key:
            return "no_configurado"

        try:
            await self._call_openai_final(
                "health_openai",
                "Responde solo: ok",
                TaskConfig("openai", 0.0, 16),
                fallback_used=False,
            )
            return "ok"
        except AIProviderError as exc:
            logger.error("Error al verificar conexion con OpenAI: %s", exc)
            return "error"
