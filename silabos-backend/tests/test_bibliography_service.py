import sys
import unittest
from datetime import date
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.bibliography_service import (  # noqa: E402
    _filter_recent_references,
    _recent_publication_window,
)


class BibliographyServiceDateFilterTests(unittest.TestCase):
    def test_recent_window_includes_current_year_and_previous_four(self):
        min_year, max_date = _recent_publication_window(date(2026, 4, 28))

        self.assertEqual(min_year, 2022)
        self.assertEqual(max_date, date(2026, 4, 28))

    def test_filter_recent_references_drops_old_future_and_unknown_years(self):
        references = [
            {"title": "old", "year": "2021"},
            {"title": "lower-bound", "year": "2022"},
            {"title": "current", "year": "2026"},
            {"title": "future", "year": "2027"},
            {"title": "unknown", "year": ""},
        ]

        filtered = _filter_recent_references(references, 2022, 2026)

        self.assertEqual([ref["title"] for ref in filtered], ["lower-bound", "current"])


if __name__ == "__main__":
    unittest.main()
