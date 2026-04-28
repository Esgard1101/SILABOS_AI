import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.supabase_service import SupabaseService
from routers.progressive import _build_units_and_schedule


class ProgressiveStepBlockCoercionTests(unittest.TestCase):
    def test_bibliography_legacy_list_is_preserved_as_references(self):
        block = SupabaseService._coerce_progressive_step_block(
            "bibliography",
            [
                "Referencia APA",
                {"apa_format": "Referencia desde dict"},
                {"display_text": "Referencia para tabla"},
                {"title": "Titulo fallback"},
                "",
            ],
        )

        self.assertEqual(block["doc_ids"], [])
        self.assertEqual(
            block["references"],
            [
                "Referencia APA",
                "Referencia desde dict",
                "Referencia para tabla",
                "Titulo fallback",
            ],
        )
        self.assertEqual(block["sources_consulted"], [])

    def test_non_dict_step_block_becomes_empty_dict(self):
        block = SupabaseService._coerce_progressive_step_block(
            "purpose",
            ["legacy", "invalid"],
        )

        self.assertEqual(block, {})

    def test_units_follow_official_performance_count_without_attitudes(self):
        performances = [
            "D1 oficial",
            "D2 oficial",
            "D3 oficial",
        ]
        desempenos = [
            {"codigo": "D1", "descripcion": "D1 oficial"},
            {"codigo": "D2", "descripcion": "D2 oficial"},
            {"codigo": "D3", "descripcion": "D3 oficial"},
        ]

        units, schedule = _build_units_and_schedule(
            performances=performances,
            knowledge_items=["Tema A", "Tema B", "Tema C", "Tema D"],
            skill_names=["Analizar casos", "Aplicar procedimientos", "Evaluar evidencias"],
            method_name="Aprendizaje basado en proyectos",
            phases=["Inicio", "Desarrollo", "Cierre"],
            techniques=[],
            grading_rows=[],
            desempenos_final=desempenos,
        )

        self.assertEqual(len(units), 3)
        self.assertEqual([u["semanas"] for u in units], ["1-6", "7-11", "12-16"])
        self.assertEqual(len(schedule), 16)
        self.assertFalse(any("actitudes" in row for row in schedule))
        self.assertEqual(units[0]["logro"], "D1 oficial")
        self.assertIsInstance(units[0]["required_skills"], list)


if __name__ == "__main__":
    unittest.main()
