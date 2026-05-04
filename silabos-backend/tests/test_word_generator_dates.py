import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.word_generator import _build_context


class WordGeneratorWeekDateTests(unittest.TestCase):
    def test_semana_fecha_uses_selected_course_start_date(self):
        context = _build_context(
            {
                "datos_generales": {
                    "nombre_curso": "Curso test",
                    "fecha_inicio": "2026-05-04",
                    "semestre": "2026-I",
                },
                "unidades_tematicas": [
                    {
                        "numero": "1",
                        "titulo": "Unidad prueba",
                        "weeks": [1, 2, 3],
                        "logro": "Desempeno de prueba",
                    }
                ],
                "cronograma_semanal": [
                    {"week": 1, "unit_number": 1, "knowledge": "Tema 1", "activity": "Act 1", "evidence": "Ev 1"},
                    {"week": 2, "unit_number": 1, "knowledge": "Tema 2", "activity": "Act 2", "evidence": "Ev 2"},
                    {"week": 3, "unit_number": 1, "knowledge": "Tema 3", "activity": "Act 3", "evidence": "Ev 3"},
                ],
            }
        )

        fechas = [fila["fecha"] for fila in context["unidades"][0]["filas"]]

        self.assertEqual(fechas, ["2026-05-04", "2026-05-11", "2026-05-18"])
        self.assertEqual(context["fecha_fin"], "2026-08-24")

    def test_semana_fecha_preserves_existing_date_range(self):
        context = _build_context(
            {
                "datos_generales": {
                    "nombre_curso": "Curso test",
                    "fecha_inicio": "2026-05-04",
                    "semestre": "2026-I",
                },
                "unidades_tematicas": [
                    {
                        "numero": "1",
                        "titulo": "Unidad prueba",
                        "weeks": [1],
                        "logro": "Desempeno de prueba",
                    }
                ],
                "cronograma_semanal": [
                    {
                        "week": 1,
                        "unit_number": 1,
                        "knowledge": "Tema 1",
                        "activity": "Act 1",
                        "evidence": "Ev 1",
                        "date_range": "2026-05-04 al 2026-05-10",
                    }
                ],
            }
        )

        self.assertEqual(context["unidades"][0]["filas"][0]["fecha"], "2026-05-04 al 2026-05-10")


if __name__ == "__main__":
    unittest.main()
