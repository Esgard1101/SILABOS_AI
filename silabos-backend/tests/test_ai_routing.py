import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.gemini_service import GeminiService


class GeminiServiceRoutingTests(unittest.TestCase):
    @patch("services.gemini_service._get_client", return_value=Mock())
    @patch.dict(
        os.environ,
        {
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_AUDIT_MODEL": "audit-model",
            "OPENROUTER_LIGHT_MODEL": "light-model",
            "OPENROUTER_MODEL": "legacy-model",
        },
        clear=False,
    )
    def test_prefers_new_openrouter_model_variables(self, _mock_client):
        service = GeminiService()

        self.assertEqual(service.openrouter_audit_model, "audit-model")
        self.assertEqual(service.openrouter_light_model, "light-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_audit"), "audit-model")
        self.assertEqual(service._resolve_openrouter_model("openrouter_light"), "light-model")

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
        self.assertEqual(service.generate_text.await_count, 2)

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


if __name__ == "__main__":
    unittest.main()
