import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.gemini_service import AIProviderError, GeminiService, TASK_CONFIGS


class FakeOpenRouterResponse:
    def __init__(self, status_code: int, *, text: str = "", json_data=None):
        self.status_code = status_code
        self.text = text
        self._json_data = json_data or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
            raise httpx.HTTPStatusError(
                "OpenRouter error",
                request=request,
                response=self,
            )

    def json(self):
        return self._json_data


class FakeAsyncClient:
    def __init__(self, responses, recorded_payloads):
        self._responses = responses
        self._recorded_payloads = recorded_payloads

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, headers=None, json=None):
        self._recorded_payloads.append(json)
        return self._responses.pop(0)


class FakeAsyncClientFactory:
    def __init__(self, responses, recorded_payloads):
        self._responses = responses
        self._recorded_payloads = recorded_payloads

    def __call__(self, *args, **kwargs):
        return FakeAsyncClient(self._responses, self._recorded_payloads)


class GeminiServiceRoutingTests(unittest.TestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_AUDIT_MODEL": "audit-model",
            "OPENROUTER_LIGHT_MODEL": "light-model",
            "OPENROUTER_UNIT_MODEL": "unit-model",
            "OPENROUTER_UNIT_MODELS": "unit-fallback-1, unit-fallback-2",
            "OPENROUTER_PRODUCT_MODEL": "product-model",
            "OPENROUTER_MODEL": "legacy-model",
        },
        clear=False,
    )
    def test_prefers_new_openrouter_model_variables(self, _mock_client):
        service = GeminiService()

        self.assertEqual(service.openrouter_audit_model, "audit-model")
        self.assertEqual(service.openrouter_light_model, "light-model")
        self.assertEqual(service.openrouter_unit_model, "unit-model")
        self.assertEqual(
            service.openrouter_unit_models,
            ["unit-model", "unit-fallback-1", "unit-fallback-2"],
        )
        self.assertEqual(service.openrouter_product_model, "product-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_audit"), "audit-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_light"), "light-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_unit"), "unit-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_product"), "product-model")

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_AUDIT_MODEL": "",
            "OPENROUTER_LIGHT_MODEL": "",
            "OPENROUTER_MODEL": "legacy-model",
        },
        clear=False,
    )
    def test_legacy_openrouter_model_alias_still_works(self, _mock_client):
        service = GeminiService()

        self.assertEqual(service.openrouter_audit_model, "legacy-model")
        self.assertEqual(service.openrouter_light_model, "legacy-model")

    def test_light_tasks_do_not_require_native_json_mode(self):
        light_tasks = (
            "search_query_build",
            "search_result_filter",
            "bibliography_format",
            "method_suggest",
            "progressive_purpose_suggest",
            "progressive_content_suggest",
            "progressive_grading_suggest",
            "progressive_product_suggest",
            "progressive_unit_context_extract",
        )

        for task_name in light_tasks:
            with self.subTest(task=task_name):
                self.assertFalse(TASK_CONFIGS[task_name].json_mode)

    def test_openrouter_audit_keeps_native_json_mode(self):
        self.assertTrue(TASK_CONFIGS["syllabus_validate"].json_mode)
        self.assertEqual(TASK_CONFIGS["syllabus_validate"].provider, "gemini_audit")
        self.assertEqual(TASK_CONFIGS["progressive_unit_context_extract"].provider, "gemini_unit")
        self.assertEqual(TASK_CONFIGS["progressive_unit_generate"].provider, "gemini_unit")


class GeminiServiceUnitFallbackTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "test-openai-key",
            "OPENAI_UNIT_MODEL": "gpt-unit",
            "OPENROUTER_API_KEY": "test-openrouter-key",
        },
        clear=False,
    )
    async def test_unit_generation_falls_back_from_gemini_to_openai(self, _mock_client):
        service = GeminiService()
        service._call_gemini = AsyncMock(side_effect=Exception("unused"))
        service._call_gemini.side_effect = service._gemini_error(Exception("503 unavailable"))
        service._call_openai_final = AsyncMock(
            return_value=Mock(
                text='{"weeks": [{"week": 1}]}',
                provider="openai",
            )
        )
        service._call_openrouter = AsyncMock()

        result = await service.generate_json("progressive_unit_generate", "prompt unidad")

        self.assertEqual(result["weeks"][0]["week"], 1)
        service._call_openai_final.assert_awaited_once()
        service._call_openrouter.assert_not_awaited()

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "test-openai-key",
            "OPENAI_UNIT_MODEL": "gpt-unit",
            "OPENROUTER_API_KEY": "test-openrouter-key",
        },
        clear=False,
    )
    async def test_unit_generation_falls_back_to_openrouter_if_openai_fails(self, _mock_client):
        service = GeminiService()
        service._call_gemini = AsyncMock(side_effect=service._gemini_error(Exception("503 unavailable")))
        service._call_openai_final = AsyncMock(
            side_effect=AIProviderError(
                "OpenAI 503 unavailable",
                retryable=True,
                provider="openai",
                model="gpt-5.4-mini",
            )
        )
        service._call_openrouter = AsyncMock(
            return_value=Mock(
                text='{"weeks": [{"week": 2}]}',
                provider="openrouter",
            )
        )

        result = await service.generate_json("progressive_unit_generate", "prompt unidad")

        self.assertEqual(result["weeks"][0]["week"], 2)
        service._call_openai_final.assert_awaited_once()
        service._call_openrouter.assert_awaited_once()


class GeminiServiceOperationalFallbackTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-openrouter-key"}, clear=False)
    async def test_product_suggest_falls_back_to_openrouter_without_openai(self, _mock_client):
        service = GeminiService()
        service._call_gemini = AsyncMock(side_effect=service._gemini_error(Exception("503 unavailable")))
        service._call_openai_final = AsyncMock()
        service._call_openrouter = AsyncMock(
            return_value=Mock(
                text='{"options": [{"title": "Producto", "justification": "Justifica", "timeline_json": {}}]}',
                provider="openrouter",
            )
        )

        result = await service.generate_json("progressive_product_suggest", "payload producto")

        self.assertEqual(result["options"][0]["title"], "Producto")
        service._call_openai_final.assert_not_awaited()
        service._call_openrouter.assert_awaited_once()

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "test-openai-key",
            "OPENAI_UNIT_MODEL": "openai-unit",
            "OPENROUTER_API_KEY": "test-openrouter-key",
        },
        clear=False,
    )
    async def test_unit_repair_uses_openai_fallback_after_google(self, _mock_client):
        service = GeminiService()
        service._call_gemini = AsyncMock(side_effect=service._gemini_error(Exception("503 unavailable")))
        service._call_openai_final = AsyncMock(
            return_value=Mock(
                text='{"weeks": [{"week": 1, "activity": "reparada"}]}',
                provider="openai",
            )
        )
        service._call_openrouter = AsyncMock()

        result = await service.generate_json("progressive_unit_repair", "payload unidad")

        self.assertEqual(result["weeks"][0]["activity"], "reparada")
        service._call_openai_final.assert_awaited_once()
        service._call_openrouter.assert_not_awaited()

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-openrouter-key"}, clear=False)
    async def test_unit_context_uses_unit_route_without_openai(self, _mock_client):
        service = GeminiService()
        service._call_gemini = AsyncMock(side_effect=service._gemini_error(Exception("503 unavailable")))
        service._call_openai_final = AsyncMock()
        service._call_openrouter = AsyncMock(
            return_value=Mock(
                text='{"key_concepts": ["tema"], "cases_or_examples": []}',
                provider="openrouter",
            )
        )

        result = await service.generate_json("progressive_unit_context_extract", "payload notebook unidad")

        self.assertEqual(result["key_concepts"], ["tema"])
        service._call_openai_final.assert_not_awaited()
        service._call_openrouter.assert_awaited_once()


class GeminiServiceValidationTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"}, clear=False)
    async def test_validation_repairs_invalid_json_once(self, _mock_client):
        service = GeminiService()
        service.generate_text = AsyncMock(
            side_effect=[
                "score=90, aprobado=true",
                '{"score": 90, "observaciones": [], "sugerencias": [], "aprobado": true}',
            ]
        )

        result = await service.validar_silabo({"datos_generales": {"nombre_curso": "Curso"}}, "")

        self.assertEqual(result["score"], 90)
        self.assertTrue(result["aprobado"])
        self.assertEqual(result["audit_mode"], "product_positive_dashboard")
        self.assertEqual(len(result["target_status_cards"]), 4)
        self.assertEqual(service.generate_text.await_count, 2)

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"}, clear=False)
    async def test_validation_adds_product_positive_dashboard_cards(self, _mock_client):
        service = GeminiService()
        service.generate_text = AsyncMock(
            return_value='{"score": 92, "observaciones": [], "sugerencias": [], "aprobado": true}'
        )
        silabo = {
            "datos_generales": {"nombre_curso": "Curso"},
            "unidades_tematicas": [
                {"numero": 1, "titulo": "Unidad 1", "temas": ["Tema 1"], "logro": "Logro 1"},
                {"numero": 2, "titulo": "Unidad 2", "temas": ["Tema 2"], "logro": "Logro 2"},
            ],
            "cronograma_semanal": [
                {
                    "semana": week,
                    "tema": f"Tema {week}",
                    "actividad": f"Actividad {week}",
                    "producto": f"Evidencia {week}",
                }
                for week in range(1, 17)
            ],
            "sistema_evaluacion": {
                "criterios": [
                    {"nombre": "Producto 1", "porcentaje": 40, "descripcion": "Rubrica"},
                    {"nombre": "Producto 2", "porcentaje": 60, "descripcion": "Rubrica"},
                ]
            },
            "bibliografia": [
                {"referencia": "Autor, A. (2024). Titulo. Editorial."},
                {"referencia": "Autor, B. (2023). Titulo. Revista."},
                {"referencia": "Autor, C. (2022). Titulo. Editorial."},
                {"referencia": "Autor, D. (2021). Titulo. Revista."},
                {"referencia": "Autor, E. (2020). Titulo. Editorial."},
            ],
        }

        result = await service.validar_silabo(silabo, "")

        self.assertEqual(result["score"], 92)
        self.assertEqual(
            [card["id"] for card in result["target_status_cards"]],
            [
                "content_coverage",
                "weekly_sequencing",
                "evidence_method_consistency",
                "apa_source_readiness",
            ],
        )
        self.assertTrue(
            all(card["estado"] == "listo" for card in result["target_status_cards"])
        )

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"}, clear=False)
    async def test_validation_returns_safe_fallback_when_repair_fails(self, _mock_client):
        service = GeminiService()
        service.generate_text = AsyncMock(
            side_effect=[
                "esto no es json",
                "tampoco es json",
            ]
        )

        result = await service.validar_silabo({"datos_generales": {"nombre_curso": "Curso"}}, "")

        self.assertEqual(result["score"], 0)
        self.assertFalse(result["aprobado"])
        self.assertEqual(result["observaciones"][0]["nivel"], "error")


class GeminiServiceOpenRouterCompatibilityTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "NVIDIA_API_KEY": "test-nvidia-key",
            "NVIDIA_BASE_URL": "https://integrate.api.nvidia.com/v1",
            "OPENROUTER_UNIT_MODEL": "nvidia:nvidia/test-model",
            "OPENROUTER_UNIT_MODELS": "",
            "OPENROUTER_FALLBACK_MODELS": "",
        },
        clear=False,
    )
    async def test_nvidia_prefix_uses_native_openai_compatible_payload(self, _mock_client):
        service = GeminiService()
        recorded_payloads = []
        responses = [
            FakeOpenRouterResponse(
                200,
                json_data={
                    "model": "nvidia/test-model",
                    "choices": [{"message": {"content": '{"weeks": []}'}}],
                    "usage": {"total_tokens": 222},
                },
            )
        ]

        with patch(
            "services.gemini_service.httpx.AsyncClient",
            new=FakeAsyncClientFactory(responses, recorded_payloads),
        ):
            raw_text = await service.generate_text(
                "progressive_unit_generate",
                "Genera unidad",
                force_provider="openrouter",
            )

        self.assertIn('"weeks": []', raw_text)
        self.assertEqual(recorded_payloads[0]["model"], "nvidia/test-model")
        self.assertIn("messages", recorded_payloads[0])
        self.assertNotIn("store", recorded_payloads[0])
        self.assertNotIn("input", recorded_payloads[0])
        self.assertNotIn("response_format", recorded_payloads[0])

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "NVIDIA_API_KEY": "test-nvidia-key",
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_UNIT_MODEL": "unit-primary",
            "OPENROUTER_UNIT_MODELS": "nvidia:nvidia/fallback-model",
            "OPENROUTER_FALLBACK_MODELS": "",
        },
        clear=False,
    )
    async def test_openrouter_429_can_fallback_to_native_nvidia(self, _mock_client):
        service = GeminiService()
        recorded_payloads = []
        responses = [
            FakeOpenRouterResponse(429, text='{"error":"rate limit"}'),
            FakeOpenRouterResponse(
                200,
                json_data={
                    "model": "nvidia/fallback-model",
                    "choices": [{"message": {"content": '{"weeks": []}'}}],
                    "usage": {"total_tokens": 333},
                },
            ),
        ]

        with patch(
            "services.gemini_service.httpx.AsyncClient",
            new=FakeAsyncClientFactory(responses, recorded_payloads),
        ):
            raw_text = await service.generate_text(
                "progressive_unit_generate",
                "Genera unidad",
                force_provider="openrouter",
            )

        self.assertIn('"weeks": []', raw_text)
        self.assertEqual([payload["model"] for payload in recorded_payloads], ["unit-primary", "nvidia/fallback-model"])
        self.assertNotIn("store", recorded_payloads[1])

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_UNIT_MODEL": "unit-primary",
            "OPENROUTER_UNIT_MODELS": "unit-fallback-1, unit-fallback-2",
        },
        clear=False,
    )
    async def test_openrouter_unit_route_uses_model_cascade_on_429(self, _mock_client):
        service = GeminiService()
        recorded_payloads = []
        responses = [
            FakeOpenRouterResponse(429, text='{"error":"rate limit"}'),
            FakeOpenRouterResponse(
                200,
                json_data={
                    "model": "unit-fallback-1",
                    "choices": [{"message": {"content": '{"weeks": []}'}}],
                    "usage": {"total_tokens": 321},
                },
            ),
        ]

        with patch(
            "services.gemini_service.httpx.AsyncClient",
            new=FakeAsyncClientFactory(responses, recorded_payloads),
        ):
            raw_text = await service.generate_text(
                "progressive_unit_generate",
                "Genera unidad",
                force_provider="openrouter",
            )

        self.assertIn('"weeks": []', raw_text)
        self.assertEqual([payload["model"] for payload in recorded_payloads], ["unit-primary", "unit-fallback-1"])

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_AUDIT_MODEL": "tencent/hy3-preview:free",
        },
        clear=False,
    )
    async def test_retries_without_native_json_mode_when_provider_rejects_response_format(
        self,
        _mock_client,
    ):
        service = GeminiService()
        recorded_payloads = []
        responses = [
            FakeOpenRouterResponse(
                400,
                text='{"error":{"message":"Provider returned error","metadata":{"raw":"{\\"code\\":20024,\\"message\\":\\"Json mode is not supported for this model.\\"}"}}}',
            ),
            FakeOpenRouterResponse(
                200,
                json_data={
                    "model": "tencent/hy3-preview:free",
                    "choices": [{"message": {"content": '{"score": 91, "observaciones": [], "sugerencias": [], "aprobado": true}'}}],
                    "usage": {"total_tokens": 123},
                },
            ),
        ]

        with patch(
            "services.gemini_service.httpx.AsyncClient",
            new=FakeAsyncClientFactory(responses, recorded_payloads),
        ):
            raw_text = await service.generate_text(
                "syllabus_validate",
                "Valida este silabo",
                force_provider="openrouter",
            )

        self.assertIn('"score": 91', raw_text)
        self.assertEqual(len(recorded_payloads), 2)
        self.assertIn("response_format", recorded_payloads[0])
        self.assertNotIn("response_format", recorded_payloads[1])
        self.assertIn("tencent/hy3-preview:free", service.openrouter_no_native_json_models)

    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_AUDIT_MODEL": "tencent/hy3-preview:free",
        },
        clear=False,
    )
    async def test_skips_response_format_for_models_already_marked_incompatible(
        self,
        _mock_client,
    ):
        service = GeminiService()
        service.openrouter_no_native_json_models.add("tencent/hy3-preview:free")
        recorded_payloads = []
        responses = [
            FakeOpenRouterResponse(
                200,
                json_data={
                    "model": "tencent/hy3-preview:free",
                    "choices": [{"message": {"content": '{"score": 88, "observaciones": [], "sugerencias": [], "aprobado": true}'}}],
                    "usage": {"total_tokens": 111},
                },
            ),
        ]

        with patch(
            "services.gemini_service.httpx.AsyncClient",
            new=FakeAsyncClientFactory(responses, recorded_payloads),
        ):
            await service.generate_text(
                "syllabus_validate",
                "Valida este silabo",
                force_provider="openrouter",
            )

        self.assertEqual(len(recorded_payloads), 1)
        self.assertNotIn("response_format", recorded_payloads[0])


if __name__ == "__main__":
    unittest.main()
