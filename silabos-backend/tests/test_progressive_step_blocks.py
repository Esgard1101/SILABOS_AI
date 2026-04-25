import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.supabase_service import SupabaseService


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


if __name__ == "__main__":
    unittest.main()
