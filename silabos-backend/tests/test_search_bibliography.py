import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from routers.search import _build_fallback_references, _normalize_bibliography_references


class SearchBibliographyNormalizationTests(unittest.TestCase):
    def test_enriches_model_output_with_clean_raw_metadata(self):
        raw_references = [
            {
                "title": "Advanced Data Mining",
                "authors": ["Perez, J.", "Lopez, A."],
                "year": "2024",
                "source": "crossref",
                "doi": "10.1234/ABC.2024.1",
                "url": "https://doi.org/10.1234/ABC.2024.1",
                "verified": True,
            }
        ]
        formatted_references = [
            {
                "candidate_index": 1,
                "apa_format": "Perez, J., & Lopez, A. (2024). Advanced Data Mining.",
                "title": "title",
                "authors": ["author", "Lopez, A."],
                "year": "n/a",
                "type": "web_academica",
                "display_text": "author (n/a). title",
                "doi": "10.1234/ABC.2024.1",
                "url": "https://doi.org/10.1234/ABC.2024.1",
                "source": "crossref",
                "verified": True,
            }
        ]

        references = _normalize_bibliography_references(formatted_references, raw_references)

        self.assertEqual(len(references), 1)
        self.assertEqual(references[0]["title"], "Advanced Data Mining")
        self.assertEqual(references[0]["authors"], ["Perez, J.", "Lopez, A."])
        self.assertEqual(references[0]["year"], 2024)
        self.assertEqual(references[0]["type"], "articulo")
        self.assertNotEqual(references[0]["display_text"].lower(), "author (n/a). title")

    def test_build_fallback_references_keeps_enriched_shape(self):
        raw_references = [
            {
                "title": "Academic Writing Handbook",
                "authors": ["Garcia, M."],
                "year": "2021",
                "source": "crossref",
                "doi": None,
                "url": "https://example.edu/handbook",
                "verified": True,
            }
        ]

        references = _build_fallback_references(raw_references)

        self.assertEqual(len(references), 1)
        self.assertEqual(references[0]["title"], "Academic Writing Handbook")
        self.assertEqual(references[0]["authors"], ["Garcia, M."])
        self.assertEqual(references[0]["year"], 2021)
        self.assertEqual(references[0]["type"], "libro")
        self.assertIn("Academic Writing Handbook", references[0]["apa_format"])


if __name__ == "__main__":
    unittest.main()
