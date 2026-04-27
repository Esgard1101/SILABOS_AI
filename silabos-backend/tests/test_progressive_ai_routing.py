import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.progressive_ai_service import ProgressiveAIService


class ProgressiveAIRoutingTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.progressive_ai_service.generate_content", new_callable=AsyncMock)
    async def test_purpose_suggestions_use_progressive_openrouter_task(self, mock_generate):
        mock_generate.return_value = '[{"code":"D1","statement":"Analizar datos"}]'
        service = ProgressiveAIService()

        result = await service.sugerir_desempenos({"name": "Economia"})

        self.assertEqual(result[0]["code"], "D1")
        self.assertEqual(mock_generate.await_args.kwargs["task"], "progressive_purpose_suggest")

    @patch("services.progressive_ai_service.generate_content", new_callable=AsyncMock)
    async def test_content_suggestions_use_progressive_openrouter_task(self, mock_generate):
        mock_generate.return_value = (
            '{"conocimientos":["Tema 1"],"actitudes":["Actitud 1"],"habilidades_sugeridas":["Aplicar conceptos"]}'
        )
        service = ProgressiveAIService()

        result = await service.sugerir_contenido({"name": "Economia"}, [{"statement": "Analizar datos"}])

        self.assertEqual(result["conocimientos"], ["Tema 1"])
        self.assertEqual(mock_generate.await_args.kwargs["task"], "progressive_content_suggest")

    @patch("services.progressive_ai_service.generate_content", new_callable=AsyncMock)
    async def test_grading_suggestions_use_progressive_openrouter_task(self, mock_generate):
        mock_generate.return_value = (
            '[{"evidencia":"Tareas","sigla":"TA","porcentaje":100,"cronograma":"Permanente"}]'
        )
        service = ProgressiveAIService()

        result = await service.sugerir_calificacion({"name": "ABP"}, {"name": "Economia"})

        self.assertEqual(result[0]["sigla"], "TA")
        self.assertEqual(mock_generate.await_args.kwargs["task"], "progressive_grading_suggest")


if __name__ == "__main__":
    unittest.main()
