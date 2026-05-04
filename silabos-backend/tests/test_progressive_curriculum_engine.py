import asyncio
import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.progressive_curriculum_engine import ProgressiveCurriculumEngine  # noqa: E402


class ProgressiveCurriculumEngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = ProgressiveCurriculumEngine()

    def test_traceability_context_is_lightweight(self):
        traceability = self.engine.build_traceability_context(
            [
                {
                    "unit_number": 1,
                    "output_json": [
                        {
                            "week": 1,
                            "knowledge": "Lista de cotejo",
                            "activity": "Problematizacion pedagogica: ...",
                            "evidence": "Ficha de analisis",
                        },
                        {
                            "week": 8,
                            "knowledge": "Planificacion semanal",
                            "activity": "Revision y ajuste: ...",
                            "evidence": "PA1: avance del portafolio",
                        },
                    ],
                }
            ]
        )

        self.assertEqual(traceability["completed_weeks"], "1-8")
        self.assertEqual(
            traceability["covered_knowledge"],
            ["Lista de cotejo", "Planificacion semanal"],
        )
        self.assertEqual(traceability["last_delivered_evidence"], "PA1: avance del portafolio")
        self.assertNotIn("activity", traceability)

    def test_unit_generation_uses_non_cyclic_method_phases(self):
        class FakeAI:
            async def generate_json(self, *args, **kwargs):
                return {
                    "weeks": [
                        {
                            "week": week,
                            "unit_number": 2,
                            "knowledge": f"Planificacion aplicada {week}",
                            "activity": (
                                "En equipos, los estudiantes ajustan una secuencia didactica "
                                "a partir del desempeno oficial mediante revision de pares "
                                "y matriz de consistencia."
                            ),
                            "evidence": f"Avance verificable {week}",
                            "phase": "Produccion guiada" if week < 16 else "Socializacion y cierre",
                        }
                        for week in range(9, 17)
                    ]
                }

        result = asyncio.run(
            self.engine.generate_unit(
                unit_number=2,
                total_units=2,
                curso={
                    "name": "Planificacion curricular en educacion temprana",
                    "temas_conocimientos": [
                        "Lista de cotejo",
                        "Planificacion semanal",
                        "Planificacion diaria",
                        "Materiales didacticos",
                    ],
                    "habilidades_desempenos": ["Disenar sesiones de aprendizaje"],
                },
                method={"code": "ABT", "name": "Aprendizaje Basado en Taller"},
                performance="Organiza secuencias didacticas pertinentes.",
                content_block={},
                grading_rows=[{"code": "PA2", "week": 16, "name": "Producto final sustentado"}],
                product_option={},
                extracted_context={},
                traceability_context={
                    "completed_weeks": "1-8",
                    "covered_knowledge": ["Lista de cotejo"],
                    "last_delivered_evidence": "PA1: avance",
                },
                ai_service=FakeAI(),
            )
        )

        weeks = result["weeks"]
        self.assertEqual([row["week"] for row in weeks], list(range(9, 17)))
        self.assertNotIn("Lista de cotejo", [row["knowledge"] for row in weeks])
        self.assertFalse(weeks[-1]["activity"].startswith("Problematizacion pedagogica:"))
        self.assertNotIn("Tecnicas:", weeks[-1]["activity"])
        self.assertIn("mediante", weeks[-1]["activity"])
        self.assertNotIn("Momento:", weeks[-1]["activity"])
        self.assertNotIn("Proposito:", weeks[-1]["activity"])

    def test_locked_week_is_preserved_exactly(self):
        class FakeAI:
            async def generate_json(self, *args, **kwargs):
                return {
                    "weeks": [
                        {
                            "week": week,
                            "unit_number": 2,
                            "knowledge": f"Tema nuevo {week}",
                            "activity": (
                                "Los estudiantes desarrollan el tema nuevo mediante taller guiado "
                                "y revision de pares para dejar una evidencia verificable."
                            ),
                            "evidence": f"Evidencia {week}",
                            "phase": "Produccion guiada",
                        }
                        for week in range(9, 17)
                    ]
                }

        locked_row = {
            "week": 9,
            "unit_number": 2,
            "knowledge": "Planificacion semanal",
            "activity": "Produccion guiada: actividad docente ya aprobada.\nTecnicas: microtaller de diseno.",
            "evidence": "Borrador aprobado",
            "locked": True,
            "validation": {"total_score": 10, "diagnosis": "Aprobada"},
        }
        result = asyncio.run(
            self.engine.generate_unit(
                unit_number=2,
                total_units=2,
                curso={"name": "Planificacion curricular", "temas_conocimientos": ["Tema nuevo"]},
                method={"code": "ABT"},
                performance="Desempeno oficial",
                content_block={},
                grading_rows=[],
                product_option={},
                extracted_context={},
                traceability_context={},
                locked_weeks=[9],
                locked_rows=[locked_row],
                ai_service=FakeAI(),
            )
        )

        self.assertEqual(result["weeks"][0], locked_row)

    def test_ai_output_with_robotic_labels_is_rewritten(self):
        class FakeAI:
            async def generate_json(self, *args, **kwargs):
                task = args[0] if args else ""
                if task == "progressive_unit_repair":
                    return {
                        "weeks": [
                            {
                                "week": 1,
                                "knowledge": "Contexto educativo",
                                "activity": (
                                    "Durante la problematizacion pedagogica, los estudiantes analizan "
                                    "un caso de aula sobre contexto educativo mediante dialogo guiado "
                                    "y ficha de observacion. La evidencia queda organizada en una ficha."
                                ),
                                "evidence": "Ficha",
                                "phase": "Problematizacion pedagogica",
                            }
                        ]
                    }
                return {
                    "weeks": [
                        {
                            "week": 1,
                            "knowledge": "Contexto educativo",
                            "activity": "Momento: Inicio. Proposito: avanzar de manera ordenada.",
                            "evidence": "Ficha",
                            "phase": "Problematizacion pedagogica",
                        }
                    ]
                }

        result = asyncio.run(
            self.engine.generate_unit(
                unit_number=1,
                total_units=16,
                curso={"name": "Curso"},
                method={"code": "ABT"},
                performance="Desempeno oficial",
                content_block={},
                grading_rows=[],
                product_option={},
                extracted_context={},
                traceability_context={},
                ai_service=FakeAI(),
            )
        )

        activity = result["weeks"][0]["activity"]
        self.assertNotIn("Momento:", activity)
        self.assertNotIn("Proposito:", activity)
        self.assertNotIn("Tecnicas:", activity)
        self.assertIn("mediante", activity)

    def test_validator_scores_triple_coherence(self):
        validation = self.engine.validate_week(
            row={
                "knowledge": "Planificacion diaria",
                "activity": (
                    "Durante la produccion guiada, los estudiantes elaboran un avance "
                    "sobre planificacion diaria para movilizar el diseno de sesiones "
                    "mediante un microtaller de diseno."
                ),
                "evidence": "Borrador de planificacion diaria",
            },
            phase="Produccion guiada",
            skill="disenar sesiones",
        )

        self.assertGreaterEqual(validation["total_score"], 8)
        self.assertEqual(validation["methodological_score"], 2)
        self.assertEqual(validation["technique_score"], 2)


if __name__ == "__main__":
    unittest.main()
