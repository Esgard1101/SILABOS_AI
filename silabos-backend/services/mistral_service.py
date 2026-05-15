# Servicio dedicado Mistral: ULTIMO eslabon de la cascada de resiliencia.
#
# Free Tier de Mistral impone un limite GLOBAL de 1 request/seg por API key
# y cuotas bajas tokens/min en los pools small/large. Por eso Mistral solo se
# invoca cuando los proveedores principales (Gemini/OpenAI/OpenRouter/NVIDIA)
# ya fallaron, nunca como primario en llamadas concurrentes.

import logging
from typing import Any

from services.gemini_service import AIProviderError, AIResult, TaskConfig

logger = logging.getLogger(__name__)

MISTRAL_RETRYABLE_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}


def _normalize_mistral_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for chunk in content:
            text = getattr(chunk, "text", None)
            if text is None and isinstance(chunk, dict):
                text = chunk.get("text")
            if isinstance(text, str):
                parts.append(text)
        return "\n".join(part for part in parts if part)
    return str(content or "")


def _usage_to_dict(usage: Any) -> Any:
    if usage is None:
        return None
    for attr in ("model_dump", "dict"):
        method = getattr(usage, attr, None)
        if callable(method):
            try:
                return method()
            except Exception:  # noqa: BLE001 - usage logging is best-effort
                break
    return {
        key: getattr(usage, key)
        for key in ("prompt_tokens", "completion_tokens", "total_tokens")
        if getattr(usage, key, None) is not None
    } or None


async def call_mistral(
    *,
    task_name: str,
    prompt: str,
    config: TaskConfig,
    api_key: str,
    model: str,
    fallback_used: bool = True,
) -> AIResult:
    """Invoca Mistral via SDK nativo async (mistralai v1.x).

    Lanza ``AIProviderError`` envolviendo cualquier fallo del SDK. Marca
    ``retryable=True`` ante 429/5xx (incluido el limite global 1 req/seg) para
    que la cascada pueda decidir si reintenta o falla rapido.
    """
    if not api_key:
        raise AIProviderError(
            "MISTRAL_API_KEY no configurada",
            provider="mistral",
            model=model,
        )

    try:
        from mistralai import Mistral
    except ImportError as exc:
        raise AIProviderError(
            f"SDK mistralai no instalado: {exc}",
            provider="mistral",
            model=model,
        ) from exc

    messages = [{"role": "user", "content": prompt}]
    request: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": config.temperature,
        "max_tokens": config.max_output_tokens,
    }
    if config.json_mode:
        request["response_format"] = {"type": "json_object"}

    try:
        async with Mistral(api_key=api_key) as client:
            response = await client.chat.complete_async(**request)
    except AIProviderError:
        raise
    except Exception as exc:  # noqa: BLE001 - SDK lanza jerarquias variadas
        status_code = getattr(exc, "status_code", None)
        body = getattr(exc, "body", None) or getattr(exc, "message", None) or str(exc)
        message = str(body)[:500]
        lowered = message.lower()
        retryable = (
            status_code in MISTRAL_RETRYABLE_STATUS_CODES
            if isinstance(status_code, int)
            else any(
                marker in lowered
                for marker in ("429", "rate limit", "too many requests", "timeout", "503", "502", "500")
            )
        )
        raise AIProviderError(
            f"Mistral fallo ({status_code or 'sin status'}): {message}",
            retryable=retryable,
            status_code=status_code if isinstance(status_code, int) else None,
            provider="mistral",
            model=model,
        ) from exc

    choices = getattr(response, "choices", None) or []
    if not choices:
        raise AIProviderError(
            f"Mistral devolvio respuesta vacia para {task_name}",
            retryable=True,
            provider="mistral",
            model=getattr(response, "model", None) or model,
        )

    choice = choices[0]
    finish_reason = str(getattr(choice, "finish_reason", "") or "").lower()
    if finish_reason in {"length", "model_length", "content_filter"}:
        raise AIProviderError(
            f"Mistral respuesta incompleta para {task_name}: finish_reason={finish_reason}",
            retryable=True,
            provider="mistral",
            model=getattr(response, "model", None) or model,
        )

    message_obj = getattr(choice, "message", None)
    content = getattr(message_obj, "content", None) if message_obj is not None else None

    return AIResult(
        text=_normalize_mistral_content(content),
        provider="mistral",
        model=getattr(response, "model", None) or model,
        usage=_usage_to_dict(getattr(response, "usage", None)),
        fallback_used=fallback_used,
    )
